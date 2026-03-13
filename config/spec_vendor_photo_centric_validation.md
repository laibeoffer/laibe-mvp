# LaiBE 移除人員打卡，強化 EXIF / Metadata 防偽驗證 Spec (Photo-Centric_Validation)

**版本**: v1.1 (升級自前期 GPS 提案)
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 2, Rule 4)
**目標模組**: 乙方影像上傳與檔案指紋校驗 (Photo-centric Integrity & De-duplication)

---

## 1. EXIF 解析與雙重核驗 (EXIF Dual Verification)

**設計理念 (基於實務的防偽 Rule 1)**：
- 業務需求變更：移除強加於「操作者當下」的位置驗證（避免工頭回辦公室上傳被鎖的窘境）。
- 真正的防偽核心在於「證據本身」的物理軌跡。系統的信仰從「你在哪裡上傳」轉向「這張照片在哪裡、何時被拍下」。

**API 與驗證邏輯 (API: `POST /vendor/upload-evidence`)**：
- **驗證邏輯 1：地理位置核驗 (Geofencing Verification)**
  1. 後端強勢介入，提取上傳照片的 EXIF `GPSLatitude`, `GPSLongitude`。
  2. 使用 Haversine Formula 與資料庫中 `Project_ID` 的施工地址進行座標距離計算。
  3. **閾值 (Threshold)**: 設定合理的容許半徑，例如 **300 公尺**（以涵蓋高樓層 GPS 飄移，或是佔地面積廣闊的大型社區、透天厝等建案）。超出半徑則視為無效證據。
- **驗證邏輯 2：拍攝時間核驗 (Temporal Verification)**
  1. 提取照片檔案 EXIF 內的 `DateTimeOriginal` 或 `DateTimeDigitized`。
  2. 該時間必須嚴格落在「日誌宣稱的日期」的 00:00:00 至 23:59:59 之間。
  3. **防作假判定**: 系統嚴格阻擋 `DateTime` 遠早於當前日期的舊照片來濫竽充數，且依然受限於前一份規格的「兩日回溯鎖定 (48-Hour Lock)」鐵律。如果照片是三天前拍的，即使位置對，依然拒收。

---

## 2. EXIF 缺失例外處理 (Missing EXIF Handling)

**設計目的 (建立行為制約 Rule 2)**：
- 實務上，工班間交流常使用 LINE，若未勾選「原圖」發送，EXIF 資訊會遭到圖床抹除。
- 系統不能因此「通融」或「猜測」照片的真實性。必須堅守防波堤，將糾錯與溝通責任推回給廠商本身。

**系統動作 (Rule & Action)**：
- **Rule**: 當後端相片處理庫 (如 Sharp/ExifTool) 解析不到有效的三維資料 (Lat, Lng, DateTime) 時。
- **Action**:
  - **攔截上傳**: 系統無條件拋棄該照片的寫入。
  - **回傳錯誤碼**: 回傳 HTTP 400，帶有特定的應用層錯誤碼 `ERR_MISSING_EXIF`。
  - **精確警示 (Actionable Warning)**: 附帶說明字串：`「⚠️ 照片缺乏定位或時間資訊。若是透過通訊軟體接收，請提醒師傅傳送『原圖』。」`
  - **前端約束**: 前端必須捕捉此錯誤，在畫面上這張圖的位置蓋上醒目的**紅色警告遮罩**，並拒絕將該照片計入「每日必拍清單」的完成度中。

---

## 3. 檔案雜湊防重防偽 (File Hash De-duplication)

**設計理念 (不可變的證據 Rule 4, Rule 5)**：
- 廠商可能非常聰明，他們保留了一張包含完美 EXIF 的照片原檔，然後「同一個工地的同一張照片」，重複上傳去請領不同天的進度，或是應付每天的必拍清單。
- 系統必須從「二進位 (Binary) 層面」阻殺這種複製貼上的行為。

**實作機制 (File Fingerprinting)**：
- **Rule**: 在照片二進位檔準備存入雲端空間 (S3/GCS)，以及準備寫入關聯資料庫之前，後端必須進行快取指紋計算。
- **Hash 運算**: 讀取檔案流 (Stream)，計算該圖片檔的 **SHA-256 Hash 值**。
- **Action**:
  - 將計算出的 Hash 去資料庫的 `Photo_Hashes` 或對應表查詢。
  - **若撞號 (Collision)**: 說明這張照片無論檔名怎麼改，二進位資料本質上已經在系統裡存在過了。
  - **阻擋與警告**: 系統立即退回上傳，回傳特定的錯誤碼 `ERR_DUPLICATE_PHOTO`，並在前端提示：`「🚨 系統安全攔截：請勿重複上傳與過去完全相同的照片。」`

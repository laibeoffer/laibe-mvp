# Reference Image Policy

本文件定義 Image Generation API Integration Spike 中 reference image 的使用邊界。

## 本階段政策

本階段不支援使用者上傳 reference image 送第三方 image model。

`styleVisualApiRequest.referenceImage.allowed` 必須固定為 `false`。

## 禁用原因

使用者上傳的住宅平面圖、室內照片或現場照片可能包含：

- 私人住宅格局。
- 地址、社區、樓層或門牌線索。
- 家庭成員生活痕跡。
- 財產資訊。
- 裝修預算與屋況線索。
- 未授權的設計圖、建築圖或他人作品。

在沒有 privacy review 前，不得將這些資料送給第三方模型。

## 未來若支援 Reference Image，必須先具備

- 明確告知：使用者必須知道圖片會被送到哪一類模型或服務。
- 使用者同意：必須有明確 opt-in，不得預設同意。
- 暫存策略：說明圖片是否暫存、暫存多久、存在哪裡。
- 刪除策略：說明使用者如何刪除、系統何時自動刪除。
- 不進正式案件資料：reference image 不得被寫入正式案件資料或預算資料。
- 不作為真實案例展示：reference image 不得被用作平台案例、成果照或宣傳圖。
- 權限與授權：必須確認使用者有權上傳該圖。
- User-triggered Review：支援 reference image 前若使用者主動要求正式驗收，可由 LAIBE_REVIEWER 審查。

## 禁止事項

- 不得默默上傳私人住宅圖到第三方模型。
- 不得將 reference image 作為正式設計依據。
- 不得將 reference image 作為施工圖、法規圖或報價依據。
- 不得把 reference image 或衍生圖放入 production assets。
- 不得把 reference image 與 Plancraft geometry 或 budget official data 混在一起。


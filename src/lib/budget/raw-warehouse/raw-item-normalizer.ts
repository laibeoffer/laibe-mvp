import type { NormalizedRawCatalogItem, RawCatalogItem } from "./types.ts";

const nameCodeMap: Array<[string, string]> = [
  ["中島吧檯矮櫃", "WOOD_ISLAND_BASE_CABINET"],
  ["衣櫃桶身", "WOOD_WARDROBE_BODY"],
  ["鞋櫃桶身", "WOOD_SHOE_CABINET_BODY"],
  ["浴室彈性水泥防水 H:240", "BATHROOM_WATERPROOF_H240"],
  ["浴室壁磚貼工", "BATHROOM_WALL_TILE_LABOR"],
  ["浴室地磚貼工", "BATHROOM_FLOOR_TILE_LABOR"],
  ["插座出口延伸", "ELECTRIC_SOCKET_EXTENSION"],
  ["燈具出線及安裝", "ELECTRIC_LIGHTING_INSTALL"],
  ["保護工程", "OTHER_PROTECTION_WORK"],
  ["清潔工程", "OTHER_CLEANING_WORK"],
  ["中島吧檯矮櫃", "WOOD_ISLAND_BASE_CABINET"],
  ["中島吧檯人造石檯面", "WOOD_ISLAND_ARTIFICIAL_STONE_COUNTERTOP"],
  ["浴室壁磚貼工", "BATHROOM_WALL_TILE_LABOR"],
  ["浴室地磚貼工", "BATHROOM_FLOOR_TILE_LABOR"],
  ["插座出口延伸", "ELECTRIC_SOCKET_EXTENSION"],
  ["燈具出線及安裝", "ELECTRIC_LIGHTING_INSTALL"],
  ["E1 系統櫃板材", "PANEL_E1_STANDARD"],
  ["韓國人造石", "STONE_ARTIFICIAL_KR"],
  ["彈性水泥", "WATERPROOF_CEMENT"],
  ["30x60 壁磚", "TILE_30X60_WALL"],
  ["30x60 地磚", "TILE_30X60_FLOOR"],
  ["LED 崁燈", "LIGHTING_LED_DOWNLIGHT_REFERENCE"],
  ["TOTO 馬桶", "BRAND_TOTO_TOILET_CW_001"],
  ["木工師傅", "LABOR_WOOD_CARPENTER_DAY"],
  ["泥作貼磚工", "LABOR_TILE_LAYING_M2"],
  ["浴室防水高度以 H:240 估算", "NOTE_BATHROOM_WATERPROOF_H240"],
];

const unitMap: Record<string, string> = {
  cm: "CM",
  CM: "CM",
  m2: "m2",
  M2: "m2",
  "㎡": "m2",
  尺: "尺",
  式: "式",
  口: "口",
  盞: "盞",
  工: "工",
  箱: "箱",
  片: "片",
  桶: "桶",
  組: "組",
};

export function normalizeRawName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, " ");
}

export function normalizeRawUnit(rawUnit: string | null): string | null {
  if (!rawUnit) {
    return null;
  }

  const trimmed = rawUnit.trim();
  return unitMap[trimmed] ?? trimmed;
}

export function suggestRawItemCode(item: RawCatalogItem): string | null {
  const normalizedName = normalizeRawName(item.raw_name);
  const matched = nameCodeMap.find(([keyword]) => normalizedName.includes(keyword));

  if (matched) {
    return matched[1];
  }

  const fallbackSource = [
    item.raw_category,
    normalizedName,
    item.raw_brand ?? "",
    item.raw_model ?? "",
  ]
    .filter(Boolean)
    .join("_");

  if (!fallbackSource.trim()) {
    return null;
  }

  return fallbackSource
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || null;
}

export function normalizeRawCatalogItem(
  item: RawCatalogItem,
): NormalizedRawCatalogItem {
  return {
    source_item_id: item.id,
    normalized_name: normalizeRawName(item.raw_name),
    normalized_unit: normalizeRawUnit(item.raw_unit),
    suggested_code: suggestRawItemCode(item),
    normalized_brand: item.raw_brand?.trim() || null,
    normalized_model: item.raw_model?.trim() || null,
    normalized_spec: item.raw_spec?.trim() || null,
    normalized_note: item.raw_note.trim(),
  };
}

import type { RawCatalogItem, RawCatalogSource } from "./types.ts";

export function collectRawCatalogItems(
  sources: RawCatalogSource[],
): RawCatalogItem[] {
  return sources.flatMap((source) =>
    source.raw_items.map((item) => ({
      ...item,
      source_id: source.id,
      raw_currency: item.raw_currency ?? source.currency,
      region: item.region || source.region,
    })),
  );
}

export function getRawSourceById(
  sources: RawCatalogSource[],
): Map<string, RawCatalogSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

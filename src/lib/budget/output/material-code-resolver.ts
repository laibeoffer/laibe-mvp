import { getDefaultPrimaryMaterialBinding } from "../specs/item-material-binding.ts";
import type { ItemMaterialBinding, MethodSpecCatalog } from "../specs/types.ts";

export const resolveMaterialBindingForItem = (
  itemCode: string,
  methodSpecCatalog: MethodSpecCatalog,
): ItemMaterialBinding | null =>
  getDefaultPrimaryMaterialBinding(itemCode, methodSpecCatalog) ?? null;

export const resolveMaterialCodeForItem = (
  itemCode: string,
  methodSpecCatalog: MethodSpecCatalog,
): string | null =>
  resolveMaterialBindingForItem(itemCode, methodSpecCatalog)?.material_code ??
  null;

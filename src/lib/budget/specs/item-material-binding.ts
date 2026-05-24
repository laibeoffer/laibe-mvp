import type {
  ItemMaterialBinding,
  MethodSpecCatalog,
} from "./types.ts";

export const getItemMaterialBindings = (
  itemCode: string,
  catalog: MethodSpecCatalog,
): ItemMaterialBinding[] =>
  catalog.item_material_bindings.filter(
    (binding) => binding.item_code === itemCode,
  );

export const getDefaultPrimaryMaterialBinding = (
  itemCode: string,
  catalog: MethodSpecCatalog,
): ItemMaterialBinding | undefined =>
  getItemMaterialBindings(itemCode, catalog).find(
    (binding) => binding.role === "primary" && binding.is_default,
  );

type TemplateCodeSource = {
  id: string;
  item_code?: string;
};

type RecipeCodeSource = {
  recipe_id: string;
  recipe_code?: string;
};

type RecipeOutputCodeSource = {
  quote_item_template_id: string;
  item_code?: string;
};

const readPrimaryOrFallback = (
  primary: string | undefined,
  fallback: string,
): string => (primary && primary.trim().length > 0 ? primary : fallback);

export const getTemplateItemCode = (template: TemplateCodeSource): string =>
  readPrimaryOrFallback(template.item_code, template.id);

export const getRecipeCode = (recipe: RecipeCodeSource): string =>
  readPrimaryOrFallback(recipe.recipe_code, recipe.recipe_id);

export const getRecipeOutputItemCode = (
  output: RecipeOutputCodeSource,
): string => readPrimaryOrFallback(output.item_code, output.quote_item_template_id);

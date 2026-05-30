const tokenRegistry = new WeakSet();

const tokenBrand = Symbol("laibe.formal_renderer_entry_token");

export interface FormalRendererToken {
  readonly [tokenBrand]: true;
}

export const createFormalRendererToken = (): FormalRendererToken => {
  const token = Object.freeze({
    [tokenBrand]: true,
  });
  tokenRegistry.add(token);
  return token as FormalRendererToken;
};

export const isFormalRendererToken = (
  value: unknown,
): value is FormalRendererToken =>
  typeof value === "object" && value !== null && tokenRegistry.has(value);

export const assertFormalRendererToken = (value: unknown): void => {
  if (!isFormalRendererToken(value)) {
    throw new Error(
      "Formal renderer skeleton must be called through formal-renderer-entry.",
    );
  }
};

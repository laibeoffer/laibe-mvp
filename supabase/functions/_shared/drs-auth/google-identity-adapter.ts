import {
  createIdentityOAuthAdapter,
  type IdentityOAuthAdapter,
  type IdentityOAuthAdapterDependencies,
} from "./contracts.ts";

export function createGoogleIdentityAdapter(
  dependencies: IdentityOAuthAdapterDependencies,
): IdentityOAuthAdapter {
  return createIdentityOAuthAdapter("google", dependencies);
}

import {
  createIdentityOAuthAdapter,
  type IdentityOAuthAdapter,
  type IdentityOAuthAdapterDependencies,
} from "./contracts.ts";

export function createLineIdentityAdapter(
  dependencies: IdentityOAuthAdapterDependencies,
): IdentityOAuthAdapter {
  return createIdentityOAuthAdapter("line", dependencies);
}

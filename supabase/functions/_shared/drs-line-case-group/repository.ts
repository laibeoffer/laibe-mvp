const MAX_RPC_RESPONSE_BYTES = 64 * 1024;
const RPC_NAME = /^[a-z][a-z0-9_]{2,127}$/u;

export class LineCaseGroupRepositoryError extends Error {
  constructor() {
    super("line_case_group_repository_unavailable");
    this.name = "LineCaseGroupRepositoryError";
  }
}

export type LineCaseGroupRepository = Readonly<{
  invoke(
    name: string,
    input: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>>;
}>;

export function createLineCaseGroupRepository(
  options: Readonly<{
    supabaseUrl: string;
    serviceRoleKey: string;
    fetch?: typeof globalThis.fetch;
  }>,
): LineCaseGroupRepository {
  let url: URL;
  try {
    url = new URL(options.supabaseUrl);
  } catch {
    throw new LineCaseGroupRepositoryError();
  }
  const local = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    url.origin !== options.supabaseUrl ||
    typeof options.serviceRoleKey !== "string" ||
    options.serviceRoleKey.length < 32
  ) throw new LineCaseGroupRepositoryError();
  const fetcher = options.fetch ?? globalThis.fetch;
  return Object.freeze({
    async invoke(name, input) {
      if (
        !RPC_NAME.test(name) || input === null || typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype
      ) {
        throw new LineCaseGroupRepositoryError();
      }
      let response: Response;
      try {
        response = await fetcher(`${url.origin}/rest/v1/rpc/${name}`, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(8_000),
          headers: {
            apikey: options.serviceRoleKey,
            authorization: `Bearer ${options.serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ p_input: input }),
        });
      } catch {
        throw new LineCaseGroupRepositoryError();
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (
        !response.ok || bytes.byteLength === 0 ||
        bytes.byteLength > MAX_RPC_RESPONSE_BYTES
      ) {
        throw new LineCaseGroupRepositoryError();
      }
      try {
        const parsed = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
        if (
          parsed === null || typeof parsed !== "object" ||
          Array.isArray(parsed) ||
          Object.getPrototypeOf(parsed) !== Object.prototype
        ) {
          throw new Error();
        }
        return parsed as Record<string, unknown>;
      } catch {
        throw new LineCaseGroupRepositoryError();
      }
    },
  });
}

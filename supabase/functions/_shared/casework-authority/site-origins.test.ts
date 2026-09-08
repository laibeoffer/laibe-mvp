import { createSupabaseCaseworkAuthorityDependencies } from "./resolver.ts";
import { createOwnerWorkspaceGrantHandler } from "../../owner-workspace-grant/index.ts";

const CORE = "https://zdwuyomhswjcbbpbhpcq.supabase.co";
const INTERNAL =
  "https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site";
const EXTERNAL =
  "https://laibe-drs-owner-vendor-20260908.blueleft120.chatgpt.site";
const OLD = "https://existing.example";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function dependencies(
  project = CORE,
  origins = "",
  override?: readonly string[],
) {
  const values: Record<string, string> = {
    SUPABASE_URL: project,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
    LAIBE_ALLOWED_ORIGINS: origins,
  };
  return createSupabaseCaseworkAuthorityDependencies({
    env: { get: (key) => values[key] },
    allowedOrigins: override,
    fetch: () =>
      Promise.reject(new Error("CORS must not call Auth or the database")),
  });
}
function preflight(origin: string) {
  return new Request(CORE + "/functions/v1/owner-workspace-grant", {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization,apikey,content-type",
    },
  });
}

Deno.test("S4 Core adds both approved Sites while preserving and deduplicating existing origins", () => {
  const origins =
    dependencies(CORE, `${OLD},${INTERNAL},${OLD},https://second.example`)
      .allowedOrigins;
  assert(
    JSON.stringify(origins) ===
      JSON.stringify([OLD, INTERNAL, "https://second.example", EXTERNAL]),
    "Core must preserve configured order and append each approved Site once",
  );
  assert(Object.isFrozen(origins), "Resolved list should stay immutable");
});
Deno.test("S4 real handler accepts Core Sites preflight but rejects evil and unauthenticated requests", async () => {
  const handler = createOwnerWorkspaceGrantHandler(dependencies());
  for (const origin of [INTERNAL, EXTERNAL]) {
    const response = await handler(preflight(origin));
    assert(
      response.status === 204,
      `Expected approved Core preflight 204; got ${response.status}`,
    );
    assert(
      response.headers.get("access-control-allow-origin") === origin,
      "CORS must echo only the exact approved Origin",
    );
    const unauthenticated = await handler(
      new Request(CORE + "/functions/v1/owner-workspace-grant", {
        headers: { origin },
      }),
    );
    assert(unauthenticated.status === 401, "CORS must not bypass Auth");
  }
  for (
    const origin of [
      "https://evil.example",
      EXTERNAL + ".evil.example",
      "null",
      "*",
    ]
  ) {
    const response = await handler(preflight(origin));
    assert(
      response.status === 403 &&
        !response.headers.has("access-control-allow-origin"),
      "Unknown Origin must remain closed",
    );
  }
});
Deno.test("S4 exact project binding excludes other projects and URL variants", () => {
  for (
    const project of [
      "https://xwkinhksxdtzijhynnfr.supabase.co",
      CORE + "/",
      CORE + "?x=1",
      " " + CORE,
      CORE.toUpperCase(),
      "",
    ]
  ) {
    const origins = dependencies(project, OLD).allowedOrigins;
    assert(
      JSON.stringify(origins) === JSON.stringify([OLD]),
      "Only the exact Core URL may add approved Sites",
    );
  }
});
Deno.test("S4 explicit allowedOrigins override, including empty, keeps its existing semantics", () => {
  for (const override of [[], [OLD, OLD], ["https://explicit.example"]]) {
    assert(
      JSON.stringify(dependencies(CORE, EXTERNAL, override).allowedOrigins) ===
        JSON.stringify(override),
      "Explicit override must not append or deduplicate",
    );
  }
});
Deno.test("S4 existing origin parsing still excludes wildcard and malformed server entries", () => {
  const origins = dependencies(
    "https://other.supabase.co",
    `*,https://bad.example/path,null, ${OLD},http://localhost:4321`,
  ).allowedOrigins;
  assert(
    JSON.stringify(origins) === JSON.stringify([OLD, "http://localhost:4321"]),
    "Existing parser semantics must remain",
  );
});

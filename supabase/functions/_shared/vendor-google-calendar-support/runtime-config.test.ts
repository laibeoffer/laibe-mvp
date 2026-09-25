import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { createVendorCalendarRuntimeDependencies } from "./runtime.ts";

const PROJECT_URL = "https://zdwuyomhswjcbbpbhpcq.supabase.co";
const VALID_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function dependencies(values: Record<string, string>) {
  return createVendorCalendarRuntimeDependencies({
    env: {
      get(name: string) {
        return values[name];
      },
    },
    fetch: () => Promise.reject(new Error("network access is not expected")),
  });
}

Deno.test("Vendor runtime accepts the existing generic Google Calendar secret names", async () => {
  const runtime = dependencies({
    SUPABASE_URL: PROJECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    GOOGLE_CALENDAR_CLIENT_ID: "generic-client-id",
    GOOGLE_CALENDAR_CLIENT_SECRET: "generic-client-secret",
    GOOGLE_CALENDAR_CREDENTIAL_KEY: VALID_KEY,
  });

  await runtime.domain;
  assertEquals(runtime.configured, true);
});

Deno.test("Vendor-specific values take precedence and an invalid selected key fails closed", async () => {
  const runtime = dependencies({
    SUPABASE_URL: PROJECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    GOOGLE_CALENDAR_OAUTH_CLIENT_ID: "vendor-client-id",
    GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET: "vendor-client-secret",
    VENDOR_GOOGLE_CALENDAR_ENCRYPTION_KEY: "invalid",
    GOOGLE_CALENDAR_CLIENT_ID: "generic-client-id",
    GOOGLE_CALENDAR_CLIENT_SECRET: "generic-client-secret",
    GOOGLE_CALENDAR_CREDENTIAL_KEY: VALID_KEY,
  });

  await runtime.domain;
  assertEquals(runtime.configured, false);
});

Deno.test("Vendor runtime remains unavailable when Provider configuration is incomplete", async () => {
  const runtime = dependencies({
    SUPABASE_URL: PROJECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    GOOGLE_CALENDAR_CLIENT_ID: "generic-client-id",
    GOOGLE_CALENDAR_CREDENTIAL_KEY: VALID_KEY,
  });

  await runtime.domain;
  assertEquals(runtime.configured, false);
});

const CORE_PROJECT_URL = "https://zdwuyomhswjcbbpbhpcq.supabase.co";
const CORE_SITE_ORIGINS = Object.freeze([
  "https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site",
  "https://laibe-drs-owner-vendor-20260908.blueleft120.chatgpt.site",
]);

export function appendApprovedSiteOrigins(
  supabaseUrl: string | undefined,
  configuredOrigins: readonly string[],
): readonly string[] {
  if (supabaseUrl !== CORE_PROJECT_URL) return configuredOrigins;
  return Object.freeze([
    ...new Set([...configuredOrigins, ...CORE_SITE_ORIGINS]),
  ]);
}

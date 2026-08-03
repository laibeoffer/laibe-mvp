import { getActiveRouteHref } from "./pcm-flow-route-manifest.js";

export const PUBLIC_IDENTITIES = Object.freeze([
  Object.freeze({
    id: "owner",
    label: "甲方／業主",
    description:
      "已取得乙方報價與施工圖，希望先取得簽約前書面基本檢討，再決定是否採用 PCM 服務。",
  }),
]);

const publicRoutes = {
  home: getActiveRouteHref("home"),
  startCase: getActiveRouteHref("ownerStart"),
  basicReport: getActiveRouteHref("basicReport"),
  process: "../public_home/code.html#case-flow",
};

// Canonical owner-first names are non-enumerable until the original homepage
// contract moves to the new vocabulary. Direct access is stable now, while
// Object.keys/Object.values remain backward compatible for existing consumers.
Object.defineProperties(publicRoutes, {
  ownerStart: { value: getActiveRouteHref("ownerStart"), enumerable: false },
  documentCorrections: { value: getActiveRouteHref("documentCorrections"), enumerable: false },
  serviceDecision: { value: getActiveRouteHref("serviceDecision"), enumerable: false },
  selfServiceArchive: { value: getActiveRouteHref("selfServiceArchive"), enumerable: false },
  serviceContract: { value: getActiveRouteHref("serviceContract"), enumerable: false },
  contractPrerequisites: { value: getActiveRouteHref("contractPrerequisites"), enumerable: false },
  contractSigning: { value: getActiveRouteHref("contractSigning"), enumerable: false },
  ownerWorkspace: { value: getActiveRouteHref("ownerWorkspace"), enumerable: false },
  accessUnavailable: { value: getActiveRouteHref("accessUnavailable"), enumerable: false },
});

export const PUBLIC_ROUTES = Object.freeze(publicRoutes);

const PUBLIC_INTENT_ROUTES = Object.freeze({
  OPEN_HOME: "home",
  START_OWNER: "ownerStart",
  REVIEW_DOCUMENT_CORRECTIONS: "documentCorrections",
  VIEW_BASIC_REPORT: "basicReport",
  DECIDE_SERVICE: "serviceDecision",
  KEEP_SELF_SERVICE_ARCHIVE: "selfServiceArchive",
  READ_CONTRACT: "serviceContract",
  FIX_CONTRACT_PREREQUISITES: "contractPrerequisites",
});

const CLOSED_INTENTS = new Set([
  "SIGN_CONTRACT",
  "OPEN_OWNER_WORKSPACE",
  "OPEN_VENDOR_WORKSPACE",
  "OPEN_PCM_CASE",
  "OPEN_INTERNAL_GOVERNANCE",
]);

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function recoveryResult(reason = "CONTEXT_UNAVAILABLE") {
  return Object.freeze({
    routeKey: "accessUnavailable",
    href: PUBLIC_ROUTES.accessUnavailable,
    gate: "G1_UI_SOURCE",
    reason,
    canMutate: false,
  });
}

export function resolvePcmFlowContinuation(context) {
  if (!isPlainRecord(context) || typeof context.intent !== "string") {
    return recoveryResult();
  }

  if (CLOSED_INTENTS.has(context.intent)) {
    return recoveryResult("AUTHORITY_REQUIRED");
  }

  const routeKey = PUBLIC_INTENT_ROUTES[context.intent];
  const href = routeKey ? PUBLIC_ROUTES[routeKey] : undefined;
  if (!routeKey || !href) {
    return recoveryResult();
  }

  return Object.freeze({
    routeKey,
    href,
    gate: "G1_UI_SOURCE",
    reason: "PUBLIC_ROUTE",
    canMutate: false,
  });
}

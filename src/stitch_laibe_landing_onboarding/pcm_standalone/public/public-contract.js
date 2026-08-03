import {
  getActiveRouteHref,
  getCompatibilityRouteHref,
} from "./pcm-flow-route-manifest.js";

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
  startCase: getCompatibilityRouteHref("ownerStart"),
  basicReport: getCompatibilityRouteHref("basicReport"),
  process: "../public_home/code.html#case-flow",
};

// Keep original enumerable aliases stable for the current homepage. Canonical
// routes are direct properties; planned routes stay null until their page exists.
Object.defineProperties(publicRoutes, {
  quoteCheck: { value: getActiveRouteHref("quoteCheck"), enumerable: false },
  drawingCheck: { value: getActiveRouteHref("drawingCheck"), enumerable: false },
  accountAccess: { value: getActiveRouteHref("accountAccess"), enumerable: false },
  caseSetup: { value: getActiveRouteHref("caseSetup"), enumerable: false },
  serviceContract: { value: getActiveRouteHref("serviceContract"), enumerable: false },
  contractPrerequisites: { value: getActiveRouteHref("contractPrerequisites"), enumerable: false },
  contractSigning: { value: getActiveRouteHref("contractSigning"), enumerable: false },
  ownerWorkspace: { value: getActiveRouteHref("ownerWorkspace"), enumerable: false },
  accessUnavailable: { value: getActiveRouteHref("accessUnavailable"), enumerable: false },
  ownerStart: { value: getCompatibilityRouteHref("ownerStart"), enumerable: false },
  documentCorrections: { value: getCompatibilityRouteHref("documentCorrections"), enumerable: false },
  selfServiceArchive: { value: getCompatibilityRouteHref("selfServiceArchive"), enumerable: false },
});

export const PUBLIC_ROUTES = Object.freeze(publicRoutes);

const PUBLIC_INTENT_ROUTES = Object.freeze({
  OPEN_HOME: "home",
  START_QUOTE_CHECK: "quoteCheck",
  START_DRAWING_CHECK: "drawingCheck",
  OPEN_ACCOUNT_ACCESS: "accountAccess",
  OPEN_CASE_SETUP: "caseSetup",
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

function readIntent(input) {
  if (input === null || typeof input !== "object") {
    return null;
  }

  try {
    if (Array.isArray(input)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, "intent");
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return null;
    }
    return descriptor.value;
  } catch {
    return null;
  }
}

function recoveryResult(reason = "CONTEXT_UNAVAILABLE") {
  return Object.freeze({
    routeKey: "accessUnavailable",
    href: PUBLIC_ROUTES.accessUnavailable,
    gate: "G1_UI_SOURCE",
    reason,
    payloadPolicy: "ZERO_CASE_DATA",
    canMutate: false,
  });
}

export function resolvePcmFlowContinuation(context) {
  const intent = readIntent(context);
  if (!intent) {
    return recoveryResult();
  }

  if (CLOSED_INTENTS.has(intent)) {
    return recoveryResult("AUTHORITY_REQUIRED");
  }

  const routeKey = PUBLIC_INTENT_ROUTES[intent];
  if (!routeKey) {
    return recoveryResult();
  }

  const href = PUBLIC_ROUTES[routeKey];
  if (!href) {
    return recoveryResult("ROUTE_PREPARING");
  }

  return Object.freeze({
    routeKey,
    href,
    gate: "G1_UI_SOURCE",
    reason: "PUBLIC_ROUTE",
    payloadPolicy: "NO_CASE_DATA",
    canMutate: false,
  });
}

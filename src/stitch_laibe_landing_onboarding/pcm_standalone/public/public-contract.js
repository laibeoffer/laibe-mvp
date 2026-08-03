import {
  getActiveRouteHref,
  getCompatibilityRouteHref,
} from "./pcm-flow-route-manifest.js";

const safeArrayIsArray = Array.isArray;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeOwnKeys = Reflect.ownKeys;
const safeStructuredClone =
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone
    : null;
const ordinaryObjectPrototype = Object.prototype;

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
  vendorWorkspace: { value: getActiveRouteHref("vendorWorkspace"), enumerable: false },
  accessUnavailable: { value: getActiveRouteHref("accessUnavailable"), enumerable: false },
  ownerStart: { value: getCompatibilityRouteHref("ownerStart"), enumerable: false },
  documentCorrections: { value: getCompatibilityRouteHref("documentCorrections"), enumerable: false },
  selfServiceArchive: { value: getCompatibilityRouteHref("selfServiceArchive"), enumerable: false },
});

export const PUBLIC_ROUTES = Object.freeze(publicRoutes);

function readOwnDataString(input, property) {
  const descriptor = safeGetOwnPropertyDescriptor(input, property);
  if (!descriptor) {
    return null;
  }
  const valueDescriptor = safeGetOwnPropertyDescriptor(descriptor, "value");
  return valueDescriptor && typeof valueDescriptor.value === "string"
    ? valueDescriptor.value
    : undefined;
}

function readStrictContext(input) {
  if (input === null || typeof input !== "object") {
    return null;
  }

  try {
    if (safeArrayIsArray(input)) {
      return null;
    }
    const prototype = safeGetPrototypeOf(input);
    if (prototype !== ordinaryObjectPrototype && prototype !== null) {
      return null;
    }
    const ownKeys = safeOwnKeys(input);
    const hasStrictKeys =
      (ownKeys.length === 1 && ownKeys[0] === "intent") ||
      (ownKeys.length === 2 &&
        ((ownKeys[0] === "intent" && ownKeys[1] === "role") ||
          (ownKeys[0] === "role" && ownKeys[1] === "intent")));
    if (!hasStrictKeys || !safeStructuredClone) {
      return null;
    }
    const intent = readOwnDataString(input, "intent");
    if (!intent) {
      return null;
    }
    const role = readOwnDataString(input, "role");
    if (role === undefined) {
      return null;
    }
    safeStructuredClone(input);
    return [intent, role];
  } catch {
    return null;
  }
}

function recoveryResult(reason = "CONTEXT_UNAVAILABLE") {
  return safeFreeze({
    routeKey: "accessUnavailable",
    href: PUBLIC_ROUTES.accessUnavailable,
    gate: "G1_UI_SOURCE",
    reason,
    payloadPolicy: "ZERO_CASE_DATA",
    canMutate: false,
  });
}

function publicRouteKeyForIntent(intent) {
  switch (intent) {
    case "OPEN_HOME":
      return "home";
    case "START_QUOTE_CHECK":
      return "quoteCheck";
    case "START_DRAWING_CHECK":
      return "drawingCheck";
    case "OPEN_ACCOUNT_ACCESS":
      return "accountAccess";
    case "OPEN_CASE_SETUP":
      return "caseSetup";
    case "READ_CONTRACT":
      return "serviceContract";
    case "FIX_CONTRACT_PREREQUISITES":
      return "contractPrerequisites";
    default:
      return null;
  }
}

function publicRouteHref(routeKey) {
  switch (routeKey) {
    case "home":
      return PUBLIC_ROUTES.home;
    case "quoteCheck":
      return PUBLIC_ROUTES.quoteCheck;
    case "drawingCheck":
      return PUBLIC_ROUTES.drawingCheck;
    case "accountAccess":
      return PUBLIC_ROUTES.accountAccess;
    case "caseSetup":
      return PUBLIC_ROUTES.caseSetup;
    case "serviceContract":
      return PUBLIC_ROUTES.serviceContract;
    case "contractPrerequisites":
      return PUBLIC_ROUTES.contractPrerequisites;
    default:
      return null;
  }
}

function isAuthorityRequiredIntent(intent) {
  switch (intent) {
    case "SIGN_CONTRACT":
    case "OPEN_OWNER_WORKSPACE":
    case "OPEN_VENDOR_WORKSPACE":
    case "OPEN_PCM_CASE":
    case "OPEN_INTERNAL_GOVERNANCE":
      return true;
    default:
      return false;
  }
}

function readOnlyResult(role) {
  let routeKey;
  let href;
  if (role === "owner") {
    routeKey = "ownerWorkspace";
    href = PUBLIC_ROUTES.ownerWorkspace;
  } else if (role === "vendor") {
    routeKey = "vendorWorkspace";
    href = PUBLIC_ROUTES.vendorWorkspace;
  } else {
    return recoveryResult();
  }

  return safeFreeze({
    routeKey,
    href,
    gate: "G1_UI_SOURCE",
    authorityGate: "G2_AUTH_RUNTIME",
    reason: "READ_ONLY_ROUTE_REFERENCE",
    payloadPolicy: "PRESERVE_EXISTING_CASE_READ_ONLY",
    canMutate: false,
  });
}

export function resolvePcmFlowContinuation(context) {
  try {
    const strictContext = readStrictContext(context);
    if (!strictContext) {
      return recoveryResult();
    }
    const [intent, role] = strictContext;

    if (intent === "PCM_EXITED_READ_ONLY" || intent === "CASE_CLOSED_READ_ONLY") {
      return readOnlyResult(role);
    }

    if (isAuthorityRequiredIntent(intent)) {
      return recoveryResult("AUTHORITY_REQUIRED");
    }

    const routeKey = publicRouteKeyForIntent(intent);
    if (!routeKey) {
      return recoveryResult();
    }

    const href = publicRouteHref(routeKey);
    if (!href) {
      return recoveryResult("ROUTE_PREPARING");
    }

    return safeFreeze({
      routeKey,
      href,
      gate: "G1_UI_SOURCE",
      reason: "PUBLIC_ROUTE",
      payloadPolicy: "NO_CASE_DATA",
      canMutate: false,
    });
  } catch {
    return recoveryResult();
  }
}

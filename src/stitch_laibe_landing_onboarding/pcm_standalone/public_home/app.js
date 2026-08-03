import { PUBLIC_ROUTES } from "../public/public-contract.js";
import { assessA5CoreReadiness } from "../integrations/a5-core-contract.js";
import {
  assessA14LineReadiness,
  resolveA14LinePresentation,
} from "../integrations/a14-line-contract.js";

const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

function readOwnDataValue(input, property) {
  try {
    if (
      input === null ||
      (typeof input !== "object" && typeof input !== "function")
    ) {
      return undefined;
    }
    const descriptor = getOwnPropertyDescriptor(input, property);
    if (!descriptor) return undefined;
    return getOwnPropertyDescriptor(descriptor, "value")?.value;
  } catch {
    return undefined;
  }
}

const trustedHomeHref = readOwnDataValue(PUBLIC_ROUTES, "home");
const trustedStartCaseHref = readOwnDataValue(PUBLIC_ROUTES, "startCase");
const trustedReportHref = readOwnDataValue(PUBLIC_ROUTES, "basicReport");
const trustedProcessHref = readOwnDataValue(PUBLIC_ROUTES, "process");
const trustedQuoteCheckHref = readOwnDataValue(PUBLIC_ROUTES, "quoteCheck");
const trustedDrawingCheckHref = readOwnDataValue(PUBLIC_ROUTES, "drawingCheck");
const trustedAccountAccessHref = readOwnDataValue(PUBLIC_ROUTES, "accountAccess");
const trustedServiceContractHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "serviceContract",
);

function trustedRouteHref(routeName) {
  switch (routeName) {
    case "home":
      return trustedHomeHref;
    case "startCase":
      return trustedStartCaseHref;
    case "basicReport":
      return trustedReportHref;
    case "process":
      return trustedProcessHref;
    case "quoteCheck":
      return trustedQuoteCheckHref;
    case "drawingCheck":
      return trustedDrawingCheckHref;
    case "accountAccess":
      return trustedAccountAccessHref;
    case "serviceContract":
      return trustedServiceContractHref;
    default:
      return undefined;
  }
}

function getTrustedRouteHref(routes, routeName) {
  const trustedHref = trustedRouteHref(routeName);
  const candidateHref = readOwnDataValue(routes, routeName);
  return typeof trustedHref === "string" && candidateHref === trustedHref
    ? trustedHref
    : null;
}

function closeRouteControl(element) {
  element.removeAttribute("href");
  element.setAttribute("aria-disabled", "true");
  element.setAttribute("tabindex", "-1");
  element.dataset.routeState = "planned";
}

export function bindPublicRoutes(root, routes = PUBLIC_ROUTES) {
  try {
    const controls = root.querySelectorAll("[data-route]");
    const controlCount = controls.length;
    if (!Number.isInteger(controlCount) || controlCount < 0) return;

    for (let index = 0; index < controlCount; index += 1) {
      const element = controls[index];
      const routeName = element?.dataset?.route;
      const href = getTrustedRouteHref(routes, routeName);
      if (href) {
        element.setAttribute("href", href);
        element.removeAttribute("aria-disabled");
        element.removeAttribute("tabindex");
        element.dataset.routeState = "active";
        continue;
      }

      closeRouteControl(element);
    }
  } catch {
    return;
  }
}

export function resolvePublicIntegrationStatus(config = {}) {
  const a5Readiness = assessA5CoreReadiness(config.a5);
  const a14Readiness = assessA14LineReadiness(config.a14);
  const a14Presentation = resolveA14LinePresentation({
    readiness: a14Readiness,
    verifiedBinding: config.a14VerifiedBinding === true,
  });

  return Object.freeze({
    caseData: Object.freeze({
      available: a5Readiness.readReady,
      message: a5Readiness.message,
    }),
    notifications: Object.freeze({
      available: a14Presentation.available,
      bindingLabel: a14Presentation.bindingLabel,
      message: a14Presentation.message,
    }),
  });
}

export function applyPublicIntegrationStatus(
  root,
  config = globalThis.PCM_PUBLIC_INTEGRATION_CONFIG ?? {},
) {
  const status = resolvePublicIntegrationStatus(config);
  const caseData = root.querySelector("[data-case-data-readiness]");
  const notifications = root.querySelector(
    "[data-notification-readiness]",
  );

  if (caseData) {
    caseData.textContent = status.caseData.message;
  }
  if (notifications) {
    notifications.textContent = status.notifications.message;
  }

  return status;
}

export function initPublicHome(
  root = document,
  integrationConfig = globalThis.PCM_PUBLIC_INTEGRATION_CONFIG ?? {},
) {
  bindPublicRoutes(root);
  applyPublicIntegrationStatus(root, integrationConfig);
  root.documentElement?.classList.add("is-ready");
}

if (typeof document !== "undefined") {
  initPublicHome(document);
}

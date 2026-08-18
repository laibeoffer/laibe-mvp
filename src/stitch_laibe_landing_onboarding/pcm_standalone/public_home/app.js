import { PUBLIC_ROUTES } from "../public/public-contract.js";
import { assessA5CoreReadiness } from "../integrations/a5-core-contract.js";
import {
  assessA14LineReadiness,
  resolveA14LinePresentation,
} from "../integrations/a14-line-contract.js";

const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const reflectApply = Reflect.apply;

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

const elementConstructor = readOwnDataValue(globalThis, "Element");
const elementPrototype = readOwnDataValue(elementConstructor, "prototype");
const elementSetAttribute = readOwnDataValue(elementPrototype, "setAttribute");
const elementRemoveAttribute = readOwnDataValue(elementPrototype, "removeAttribute");
const elementGetAttribute = readOwnDataValue(elementPrototype, "getAttribute");

function callElementMethod(method, element, args) {
  try {
    if (typeof method !== "function" || typeof reflectApply !== "function") {
      return false;
    }
    reflectApply(method, element, args);
    return true;
  } catch {
    return false;
  }
}

function readElementAttribute(element, name) {
  try {
    if (
      typeof elementGetAttribute !== "function" ||
      typeof reflectApply !== "function"
    ) {
      return null;
    }
    const value = reflectApply(elementGetAttribute, element, [name]);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

const trustedHomeHref = readOwnDataValue(PUBLIC_ROUTES, "home");
const trustedStartCaseHref = readOwnDataValue(PUBLIC_ROUTES, "startCase");
const trustedReportHref = readOwnDataValue(PUBLIC_ROUTES, "basicReport");
const trustedProcessHref = readOwnDataValue(PUBLIC_ROUTES, "process");
const trustedQuoteCheckHref = readOwnDataValue(PUBLIC_ROUTES, "quoteCheck");
const trustedDrawingCheckHref = readOwnDataValue(PUBLIC_ROUTES, "drawingCheck");
const trustedAccountAccessHref = readOwnDataValue(PUBLIC_ROUTES, "accountAccess");
const trustedOwnerContractManagementHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "homeServiceConfirmationToOwnerContractManagement",
);
const trustedHeaderOwnerContractManagementHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "homeHeaderServiceContractToOwnerContractManagement",
);
const trustedDecisionQuoteCheckHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "homeDecisionQuoteCheckToQuoteCheck",
);
const trustedDecisionDrawingCheckHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "homeDecisionDrawingCheckToQuoteCheck",
);
const trustedDecisionCustomContractHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "homeDecisionCustomContractToQuoteCheck",
);
const trustedServiceContractHref = readOwnDataValue(
  PUBLIC_ROUTES,
  "serviceContract",
);
const ownerContractAccessHref = trustedAccountAccessHref === "../account_access/code.html"
  ? "../account_access/code.html?intent=owner-contract-management"
  : null;

function isOwnerContractManagementRoute(routeName) {
  return routeName === "homeServiceConfirmationToOwnerContractManagement" ||
    routeName === "homeHeaderServiceContractToOwnerContractManagement";
}

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
    case "homeServiceConfirmationToOwnerContractManagement":
      return trustedOwnerContractManagementHref;
    case "homeHeaderServiceContractToOwnerContractManagement":
      return trustedHeaderOwnerContractManagementHref;
    case "homeDecisionQuoteCheckToQuoteCheck":
      return trustedDecisionQuoteCheckHref;
    case "homeDecisionDrawingCheckToQuoteCheck":
      return trustedDecisionDrawingCheckHref;
    case "homeDecisionCustomContractToQuoteCheck":
      return trustedDecisionCustomContractHref;
    case "serviceContract":
      return trustedServiceContractHref;
    default:
      return undefined;
  }
}

function getTrustedRouteHref(routes, routeName) {
  const trustedHref = trustedRouteHref(routeName);
  const candidateHref = readOwnDataValue(routes, routeName);
  if (typeof trustedHref !== "string" || candidateHref !== trustedHref) return null;
  return isOwnerContractManagementRoute(routeName)
    ? ownerContractAccessHref
    : trustedHref;
}

function closeRouteControl(element) {
  const hrefRemoved = callElementMethod(elementRemoveAttribute, element, ["href"]);
  const disabledSet = callElementMethod(elementSetAttribute, element, [
    "aria-disabled",
    "true",
  ]);
  const tabindexSet = callElementMethod(elementSetAttribute, element, [
    "tabindex",
    "-1",
  ]);
  const stateSet = callElementMethod(elementSetAttribute, element, [
    "data-route-state",
    "planned",
  ]);
  return (
    hrefRemoved &&
    disabledSet &&
    tabindexSet &&
    stateSet &&
    readElementAttribute(element, "href") === null &&
    readElementAttribute(element, "aria-disabled") === "true" &&
    readElementAttribute(element, "tabindex") === "-1" &&
    readElementAttribute(element, "data-route-state") === "planned"
  );
}

function activateRouteControl(element, href) {
  if (!closeRouteControl(element)) return false;

  const hrefSet = callElementMethod(elementSetAttribute, element, ["href", href]);
  const disabledRemoved = callElementMethod(elementRemoveAttribute, element, [
    "aria-disabled",
  ]);
  const tabindexRemoved = callElementMethod(elementRemoveAttribute, element, [
    "tabindex",
  ]);
  const stateSet = callElementMethod(elementSetAttribute, element, [
    "data-route-state",
    "active",
  ]);
  const activated =
    hrefSet &&
    disabledRemoved &&
    tabindexRemoved &&
    stateSet &&
    readElementAttribute(element, "href") === href &&
    readElementAttribute(element, "aria-disabled") === null &&
    readElementAttribute(element, "tabindex") === null &&
    readElementAttribute(element, "data-route-state") === "active";

  if (!activated) closeRouteControl(element);
  return activated;
}

export function bindPublicRoutes(root, routes = PUBLIC_ROUTES) {
  try {
    const controls = root.querySelectorAll("[data-route]");
    const controlCount = controls.length;
    if (!Number.isInteger(controlCount) || controlCount < 0) return;

    for (let index = 0; index < controlCount; index += 1) {
      const element = controls[index];
      const routeName = readElementAttribute(element, "data-route");
      const href = getTrustedRouteHref(routes, routeName);
      if (!href || !activateRouteControl(element, href)) closeRouteControl(element);
    }
  } catch {
    return;
  }
}

export function bindSameHashTopRecovery(root = document, view = globalThis) {
  try {
    const topTarget = root.getElementById("top");
    const topControl = root.querySelector('a[href="#top"]');
    if (!topTarget || typeof topControl?.addEventListener !== "function") return;

    topControl.addEventListener("click", () => {
      try {
        if (view.location?.hash !== "#top" || typeof view.scrollTo !== "function") {
          return;
        }
        view.scrollTo(0, 0);
      } catch {
        return;
      }
    });
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

export function bindQualificationDetailReveal(root) {
  try {
    const cards = root.querySelectorAll("[data-qualification-item]");
    for (const card of cards) {
      if (
        typeof card?.addEventListener !== "function" ||
        typeof card?.classList?.add !== "function" ||
        typeof card?.setAttribute !== "function"
      ) {
        continue;
      }

      const reveal = () => {
        card.classList.add("is-detail-revealed");
        card.setAttribute("data-detail-revealed", "true");
      };

      card.addEventListener("pointerenter", reveal, { once: true });
      card.addEventListener("focusin", reveal, { once: true });
    }
  } catch {
    return;
  }
}

export function bindDecisionDetailReveal(root) {
  try {
    const nodes = root.querySelectorAll("[data-decision-node]");
    const records = [];

    for (const node of nodes) {
      const trigger = node?.querySelector?.("h3");
      const panel = node?.querySelector?.("[data-decision-detail]");
      if (
        !trigger ||
        !panel ||
        typeof panel.id !== "string" ||
        panel.id.length === 0 ||
        typeof trigger.addEventListener !== "function" ||
        typeof trigger.setAttribute !== "function" ||
        typeof panel.setAttribute !== "function" ||
        typeof node?.classList?.add !== "function" ||
        typeof node?.classList?.remove !== "function"
      ) {
        continue;
      }

      node.classList.remove("is-detail-active");
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-controls", panel.id);
      trigger.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      records.push({ node, trigger, panel });
    }

    const activateRecord = (current) => {
      for (const record of records) {
        const isActive = record === current;
        if (isActive) {
          record.node.classList.add("is-detail-active");
        } else {
          record.node.classList.remove("is-detail-active");
        }
        record.trigger.setAttribute("aria-expanded", isActive ? "true" : "false");
        record.panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      }
    };

    for (const record of records) {
      const { trigger } = record;
      const activate = () => activateRecord(record);
      trigger.addEventListener("pointerenter", activate);
      trigger.addEventListener("focusin", activate);
      trigger.addEventListener("click", activate);
      trigger.addEventListener("keydown", (event) => {
        if (event?.key !== "Enter" && event?.key !== " ") return;
        event.preventDefault?.();
        activate();
      });
    }
  } catch {
    return;
  }
}

export function initPublicHome(
  root = document,
  integrationConfig = globalThis.PCM_PUBLIC_INTEGRATION_CONFIG ?? {},
) {
  bindPublicRoutes(root);
  bindSameHashTopRecovery(root);
  applyPublicIntegrationStatus(root, integrationConfig);
  bindQualificationDetailReveal(root);
  bindDecisionDetailReveal(root);
  root.documentElement?.classList.add("is-ready");
}

if (typeof document !== "undefined") {
  initPublicHome(document);
}

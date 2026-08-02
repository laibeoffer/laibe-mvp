import { PUBLIC_ROUTES } from "../public/public-contract.js";
import { assessA5CoreReadiness } from "../integrations/a5-core-contract.js";
import {
  assessA14LineReadiness,
  resolveA14LinePresentation,
} from "../integrations/a14-line-contract.js";

export function bindPublicRoutes(root, routes = PUBLIC_ROUTES) {
  root.querySelectorAll("[data-route]").forEach((element) => {
    const routeName = element.dataset.route;
    if (routes[routeName]) {
      element.setAttribute("href", routes[routeName]);
    }
  });
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

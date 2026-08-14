const DRAFT_FIELDS = Object.freeze(["space", "documents", "budget", "partner", "problem"]);

function selectedValue(form, name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

export function createBrowsingDraft(form) {
  const draft = new URLSearchParams({ draft: "1" });
  DRAFT_FIELDS.forEach((field) => {
    const value = field === "problem"
      ? form.elements.namedItem(field)?.value.trim()
      : selectedValue(form, field);
    draft.set(field, value);
  });
  return draft;
}

export function initializeCaseSummary(root = document) {
  const page = root.querySelector?.("[data-case-summary-page]");
  const form = page?.querySelector("[data-case-summary-form]");
  const validation = page?.querySelector("[data-summary-validation]");
  if (!form) return null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      validation.textContent = "請先完成五題，再帶著本次瀏覽草稿前往註冊入口。";
      form.reportValidity();
      return;
    }
    const query = createBrowsingDraft(form);
    window.location.assign(`../owner_start/code.html?${query.toString()}`);
  });
  return form;
}

if (typeof document !== "undefined") {
  initializeCaseSummary(document);
}

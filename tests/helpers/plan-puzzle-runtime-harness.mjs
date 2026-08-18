import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(String(name)));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(String(name)));
  }

  contains(name) {
    return this.values.has(String(name));
  }

  toggle(name, force) {
    const normalized = String(name);
    const enabled = force === undefined ? !this.values.has(normalized) : Boolean(force);
    if (enabled) this.values.add(normalized);
    else this.values.delete(normalized);
    return enabled;
  }
}

function dataAttributeKey(name) {
  return String(name)
    .replace(/^data-/, "")
    .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function selectorMatches(element, selector) {
  const normalized = String(selector || "").trim();
  if (!normalized) return false;
  if (normalized.startsWith(".")) {
    return element.classList.contains(normalized.slice(1));
  }
  const attribute = normalized.match(/^\[([^=\]]+)(?:=(?:'([^']*)'|\"([^\"]*)\"|([^\]]*)))?\]$/);
  if (!attribute) return false;
  const [, attributeName, singleQuotedValue, doubleQuotedValue, bareValue] = attribute;
  const expectedValue = singleQuotedValue ?? doubleQuotedValue ?? bareValue;
  const actualValue = element.getAttribute(attributeName) ??
    (attributeName.startsWith("data-") ? element.dataset[dataAttributeKey(attributeName)] : undefined);
  return expectedValue === undefined ? actualValue !== null && actualValue !== undefined : actualValue === expectedValue;
}

function findMatchingDescendant(element, selector, firstOnly) {
  const matches = [];
  const visit = (current) => {
    current.children.forEach((child) => {
      if (selectorMatches(child, selector)) {
        matches.push(child);
        if (firstOnly) return;
      }
      if (!firstOnly || matches.length === 0) visit(child);
    });
  };
  visit(element);
  return firstOnly ? (matches[0] || null) : matches;
}

class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.dataset = {};
    this.style = {
      setProperty(name, value) {
        this[String(name)] = String(value);
      },
      removeProperty(name) {
        delete this[String(name)];
      },
      getPropertyValue(name) {
        return this[String(name)] || "";
      }
    };
    this.classList = new FakeClassList();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.options = [];
    this.selectedIndex = -1;
    this.files = [];
    this.textContent = "";
    this.innerHTML = "";
    this.clientWidth = 1200;
    this.clientHeight = 800;
    this.scrollWidth = 1200;
    this.scrollHeight = 800;
    this.viewBox = { baseVal: { x: 0, y: 0, width: 1200, height: 800 } };
  }

  addEventListener(type, listener) {
    const key = String(type);
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(listener);
  }
  removeEventListener(type, listener) {
    const key = String(type);
    if (!this.listeners.has(key)) return;
    this.listeners.set(key, this.listeners.get(key).filter((entry) => entry !== listener));
  }
  dispatchEvent(event = {}) {
    if (!event.target) event.target = this;
    (this.listeners.get(String(event.type)) || []).forEach((listener) => listener(event));
    return true;
  }
  focus() {}
  blur() {}
  click() {
    this.dispatchEvent({
      type: "click",
      preventDefault() {},
      stopPropagation() {}
    });
  }
  select() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  scrollIntoView() {}
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  prepend(...children) {
    children.reverse().forEach((child) => {
      if (!child) return;
      child.parentNode = this;
      this.children.unshift(child);
    });
  }

  replaceChildren(...children) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    const normalized = String(name);
    const stringValue = String(value);
    this.attributes.set(normalized, stringValue);
    if (normalized === "id") this.id = stringValue;
    if (normalized === "class") {
      this.classList = new FakeClassList();
      stringValue.split(/\s+/).filter(Boolean).forEach((item) => this.classList.add(item));
    }
  }

  setAttributeNS(_namespace, name, value) {
    this.setAttribute(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  hasAttribute(name) {
    return this.attributes.has(String(name));
  }

  querySelector(selector) {
    return findMatchingDescendant(this, selector, true);
  }

  querySelectorAll(selector) {
    return findMatchingDescendant(this, selector, false);
  }

  closest() {
    return null;
  }

  contains(element) {
    if (element === this) return true;
    return this.children.some((child) => child.contains && child.contains(element));
  }

  matches() {
    return false;
  }

  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1200,
      bottom: 800,
      width: 1200,
      height: 800
    };
  }

  getBBox() {
    return { x: 0, y: 0, width: 1200, height: 800 };
  }

  createSVGPoint() {
    return {
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      }
    };
  }

  getScreenCTM() {
    return {
      inverse() {
        return {};
      }
    };
  }

  getContext() {
    return {
      clearRect() {},
      drawImage() {},
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      stroke() {},
      fill() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      setTransform() {},
      fillText() {},
      measureText(text) {
        return { width: String(text || "").length * 8 };
      }
    };
  }

  toDataURL() {
    return "data:image/png;base64,";
  }
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
    snapshot() { return Object.fromEntries(values); }
  };
}

function createDocument() {
  const elements = new Map();
  const documentListeners = new Map();
  const body = new FakeElement("body", "body");
  const head = new FakeElement("head", "head");
  const documentElement = new FakeElement("html", "html");
  documentElement.append(head, body);

  const document = {
    body,
    head,
    documentElement,
    readyState: "complete",
    currentScript: { src: "http://127.0.0.1/preview_floor_plan/plan-puzzle.js" },
    activeElement: body,
    addEventListener(type, listener) {
      const key = String(type);
      if (!documentListeners.has(key)) documentListeners.set(key, []);
      documentListeners.get(key).push(listener);
    },
    removeEventListener(type, listener) {
      const key = String(type);
      if (!documentListeners.has(key)) return;
      documentListeners.set(key, documentListeners.get(key).filter((entry) => entry !== listener));
    },
    dispatchEvent(event) {
      (documentListeners.get(String(event && event.type)) || []).forEach((listener) => listener(event));
      return true;
    },
    listenerCount(type) {
      return (documentListeners.get(String(type)) || []).length;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    createElementNS(_namespace, tagName) {
      return new FakeElement(tagName);
    },
    createTextNode(text) {
      const node = new FakeElement("#text");
      node.textContent = String(text);
      return node;
    },
    getElementById(id) {
      const normalized = String(id);
      if (!elements.has(normalized)) {
        const tagName = normalized === "planCanvas" ? "svg" : "div";
        const element = new FakeElement(tagName, normalized);
        if (normalized === "planImportInput") element.tagName = "INPUT";
        elements.set(normalized, element);
        body.appendChild(element);
      }
      return elements.get(normalized);
    },
    querySelector(selector) {
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
    createRange() {
      return {
        selectNodeContents() {}
      };
    },
    execCommand() {
      return true;
    }
  };

  return { document, elements };
}

export function createPlanPuzzleRuntime(planPuzzlePath, options = {}) {
  const { document, elements } = createDocument();
  const localStorage = createStorage(options.localStorage);
  const sessionStorage = createStorage(options.sessionStorage);
  let timerSequence = 0;
  const timerCallbacks = new Map();
  const windowListeners = new Map();
  const window = {
    document,
    localStorage,
    sessionStorage,
    location: {
      href: "http://127.0.0.1/preview_floor_plan/code.html",
      origin: "http://127.0.0.1",
      pathname: "/preview_floor_plan/code.html",
      search: "",
      hash: ""
    },
    history: {
      replaceState() {},
      pushState() {}
    },
    navigator: {
      language: "zh-TW",
      clipboard: {
        async writeText() {},
        async readText() { return ""; }
      }
    },
    addEventListener(type, listener) {
      const key = String(type);
      if (!windowListeners.has(key)) windowListeners.set(key, []);
      windowListeners.get(key).push(listener);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      (windowListeners.get(String(event && event.type)) || []).forEach((listener) => listener(event));
      return true;
    },
    setTimeout(callback) {
      timerSequence += 1;
      if (typeof callback === "function") timerCallbacks.set(timerSequence, callback);
      return timerSequence;
    },
    clearTimeout(timerId) {
      timerCallbacks.delete(Number(timerId));
    },
    setInterval() {
      timerSequence += 1;
      return timerSequence;
    },
    clearInterval() {},
    requestAnimationFrame(callback) {
      timerSequence += 1;
      if (typeof callback === "function") callback(0);
      return timerSequence;
    },
    cancelAnimationFrame() {},
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    getComputedStyle(element) {
      return {
        display: element && element.hidden ? "none" : "block",
        visibility: element && element.hidden ? "hidden" : "visible"
      };
    },
    open() {
      return null;
    },
    confirm() {
      return true;
    },
    alert() {},
    scrollTo() {},
    innerWidth: 1200,
    innerHeight: 800,
    devicePixelRatio: 1
  };
  window.window = window;
  window.self = window;
  window.top = window;
  window.parent = window;
  if (options.recognitionApi) {
    window.LaibePdfPlanExactSource = options.recognitionApi;
  }

  class FakeFileReader {
    readAsDataURL() {
      this.result = "data:application/octet-stream;base64,";
      if (typeof this.onload === "function") this.onload({ target: this });
    }
    readAsText() {
      this.result = "";
      if (typeof this.onload === "function") this.onload({ target: this });
    }
  }

  class FakeImage {
    constructor() {
      this.width = 1200;
      this.height = 800;
      this.naturalWidth = 1200;
      this.naturalHeight = 800;
    }
    set src(_value) {
      if (typeof this.onload === "function") this.onload();
    }
  }

  const context = vm.createContext({
    window,
    self: window,
    document,
    localStorage,
    sessionStorage,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    Error,
    TypeError,
    Number,
    String,
    Boolean,
    RegExp,
    Intl,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Blob,
    File: globalThis.File,
    FileReader: FakeFileReader,
    Image: FakeImage,
    Event: class Event {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
      preventDefault() {}
      stopPropagation() {}
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
      preventDefault() {}
      stopPropagation() {}
    },
    DOMParser: class DOMParser {
      parseFromString() {
        return createDocument().document;
      }
    },
    XMLSerializer: class XMLSerializer {
      serializeToString() {
        return "<svg></svg>";
      }
    },
    structuredClone,
    crypto: globalThis.crypto,
    performance: globalThis.performance,
    fetch: options.fetch || (async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "" })),
    getComputedStyle: window.getComputedStyle,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    atob: globalThis.atob,
    btoa: globalThis.btoa
  });

  const wallGeometryV3Path = options.wallGeometryV3Path ||
    path.join(path.dirname(planPuzzlePath), "native-wall-geometry-v3.js");
  const wallGeometryV3Source = readFileSync(wallGeometryV3Path, "utf8");
  vm.runInContext(wallGeometryV3Source, context, {
    filename: wallGeometryV3Path,
    timeout: 30_000
  });

  const rawSource = readFileSync(planPuzzlePath, "utf8");
  const source = typeof options.transformPlanPuzzleSource === "function"
    ? options.transformPlanPuzzleSource(rawSource)
    : rawSource;
  vm.runInContext(source, context, {
    filename: planPuzzlePath,
    timeout: 30_000
  });

  return {
    window,
    document,
    elements,
    localStorage,
    sessionStorage,
    context,
    runPendingTimers() {
      const pending = [...timerCallbacks.entries()].sort(([left], [right]) => left - right);
      pending.forEach(([timerId]) => timerCallbacks.delete(timerId));
      pending.forEach(([, callback]) => callback());
      return pending.length;
    },
    project() {
      return window.laibePlancraftPlusProject;
    }
  };
}

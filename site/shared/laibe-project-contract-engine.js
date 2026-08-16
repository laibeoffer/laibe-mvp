(function exposeProjectContractEngine(root, factory) {
  "use strict";

  var isCommonJs = typeof module === "object" && module.exports;
  var contractSource = root.LaibeProjectContractSource;
  var nodeCrypto = null;

  if (isCommonJs) {
    contractSource = require("./laibe-project-contract-source.js");
    nodeCrypto = require("node:crypto");
  }

  var engine = factory(contractSource, nodeCrypto, root);
  root.LaibeProjectContractEngine = engine;

  if (isCommonJs) module.exports = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectContractEngine(source, nodeCrypto, root) {
  "use strict";

  if (!source || source.sourceId !== "LAIBE-PROJECT-CONTRACT-SOURCE-v0.2") {
    throw new Error("CANONICAL_PROJECT_CONTRACT_SOURCE_REQUIRED");
  }

  var FORMAL_CONTRACT_TYPES = source.contractTypes.slice();
  var REVIEW_STATUSES = source.governance.drsReviewStatuses.slice();
  var OWNER_DECISIONS = source.governance.ownerDecisionOptions.slice();
  var CHANGE_TYPES = [
    "DESIGN_CHANGE",
    "WORK_CHANGE",
    "SCOPE_CHANGE",
    "CHANGE_REQUEST",
    "CHANGE_ORDER",
    "SCHEDULE_CHANGE",
  ];
  var DESIGN_BUILD_RELEASE_CONDITIONS = [
    "DESIGN_BASELINE_CONFIRMED",
    "DRAWING_VERSION_CONFIRMED",
    "FINAL_QUOTATION_AVAILABLE",
    "CONSTRUCTION_SCHEDULE_AVAILABLE",
    "PAYMENT_PLAN_AVAILABLE",
    "DRS_REVIEW_COMPLETE",
    "OWNER_DECISION",
  ];
  var issuedFinalPaymentStates = new WeakSet();
  var consumedFinalPaymentStates = new WeakSet();
  var inFlightFinalPaymentStates = new WeakSet();
  var issuedCaseEventHistories = new WeakSet();
  var consumedCaseEventHistories = new WeakSet();
  var inFlightCaseEventHistories = new WeakSet();
  var caseEventHistoryCaseIds = new WeakMap();

  function EngineValidationError(code, details) {
    this.name = "ContractEngineValidationError";
    this.code = code;
    this.details = details || {};
    this.message = code + (details && details.field ? ":" + details.field : "");
    if (Error.captureStackTrace) Error.captureStackTrace(this, EngineValidationError);
  }
  EngineValidationError.prototype = Object.create(Error.prototype);
  EngineValidationError.prototype.constructor = EngineValidationError;

  function fail(code, details) {
    throw new EngineValidationError(code, details);
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    var prototype = Object.getPrototypeOf(value);
    if (prototype === null) return true;
    if (Object.getPrototypeOf(prototype) !== null || Object.keys(prototype).length ||
        Object.getOwnPropertySymbols(prototype).length) return false;
    var allowedPrototypeNames = [
      "constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "__lookupGetter__",
      "__lookupSetter__", "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "__proto__",
      "toLocaleString",
    ];
    if (Object.getOwnPropertyNames(prototype).some(function customPrototypeName(name) {
      return allowedPrototypeNames.indexOf(name) === -1;
    })) return false;
    var constructorDescriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
    if (!constructorDescriptor || constructorDescriptor.get || constructorDescriptor.set ||
        typeof constructorDescriptor.value !== "function" || constructorDescriptor.value.name !== "Object" ||
        constructorDescriptor.value.prototype !== prototype) return false;
    if (Function.prototype.toString.call(constructorDescriptor.value).indexOf("[native code]") === -1) return false;
    return Object.getOwnPropertyNames(prototype).every(function nativePrototypeProperty(name) {
      if (name === "constructor") return true;
      var descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (typeof descriptor.value === "function") {
        return Function.prototype.toString.call(descriptor.value).indexOf("[native code]") !== -1;
      }
      if (descriptor.get || descriptor.set) {
        return (!descriptor.get || Function.prototype.toString.call(descriptor.get).indexOf("[native code]") !== -1) &&
          (!descriptor.set || Function.prototype.toString.call(descriptor.set).indexOf("[native code]") !== -1);
      }
      return false;
    });
  }

  function isNativeOrdinaryArrayPrototype(prototype) {
    if (!prototype) return false;
    var descriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
    return !!descriptor && !descriptor.get && !descriptor.set &&
      typeof descriptor.value === "function" && descriptor.value.name === "Array" &&
      descriptor.value.prototype === prototype &&
      Function.prototype.toString.call(descriptor.value).indexOf("[native code]") !== -1;
  }

  function platformStructuredClone(value) {
    if (!root || typeof root.structuredClone !== "function") {
      fail("CANONICAL_STRUCTURED_CLONE_UNAVAILABLE", {});
    }
    try {
      return root.structuredClone(value);
    } catch (error) {
      fail("NON_CANONICAL_PROXY_OR_UNCLONEABLE", { cause: error && (error.name || error.message) });
    }
  }

  function strictCanonicalClone(value, allowNormalizedRealm) {
    var ancestors = new Set();

    function cloneValue(current, path) {
      if (current === null || typeof current === "string" || typeof current === "boolean") return current;
      if (typeof current === "number") {
        if (!Number.isFinite(current)) fail("NON_CANONICAL_NUMBER", { path: path });
        return current;
      }
      if (typeof current === "undefined" || typeof current === "function" || typeof current === "symbol" || typeof current === "bigint") {
        fail("NON_CANONICAL_VALUE", { path: path, valueType: typeof current });
      }
      if (!Array.isArray(current) && !isPlainObject(current)) {
        fail("NON_CANONICAL_OBJECT", { path: path, objectType: Object.prototype.toString.call(current) });
      }
      if (ancestors.has(current)) fail("NON_CANONICAL_CYCLE", { path: path });
      ancestors.add(current);
      var result;
      if (Array.isArray(current)) {
        var arrayPrototype = Object.getPrototypeOf(current);
        if (!allowNormalizedRealm && arrayPrototype !== Array.prototype) {
          if (isNativeOrdinaryArrayPrototype(arrayPrototype)) {
            fail("CANONICAL_NORMALIZATION_REQUIRED", { path: path });
          }
          fail("NON_CANONICAL_ARRAY", { path: path });
        }
        var arrayPrototypeParent = arrayPrototype && Object.getPrototypeOf(arrayPrototype);
        if (!arrayPrototypeParent || Object.getPrototypeOf(arrayPrototypeParent) !== null) {
          fail("NON_CANONICAL_ARRAY", { path: path });
        }
        if (Object.getOwnPropertySymbols(current).length) fail("NON_CANONICAL_ARRAY", { path: path });
        var arrayNames = Object.getOwnPropertyNames(current);
        if (arrayNames.length !== current.length + 1 || arrayNames.indexOf("length") === -1) {
          fail("NON_CANONICAL_ARRAY", { path: path });
        }
        result = [];
        for (var arrayIndex = 0; arrayIndex < current.length; arrayIndex += 1) {
          var arrayKey = String(arrayIndex);
          if (!Object.prototype.hasOwnProperty.call(current, arrayKey)) fail("NON_CANONICAL_ARRAY", { path: path, index: arrayIndex });
          var arrayDescriptor = Object.getOwnPropertyDescriptor(current, arrayKey);
          if (!arrayDescriptor.enumerable || arrayDescriptor.get || arrayDescriptor.set) {
            fail("NON_CANONICAL_ARRAY", { path: path + "[" + arrayIndex + "]" });
          }
          result.push(cloneValue(arrayDescriptor.value, path + "[" + arrayIndex + "]"));
        }
      } else {
        var objectPrototype = Object.getPrototypeOf(current);
        if (!allowNormalizedRealm && objectPrototype !== null && objectPrototype !== Object.prototype) {
          if (isPlainObject(current)) fail("CANONICAL_NORMALIZATION_REQUIRED", { path: path });
          fail("NON_CANONICAL_OBJECT", { path: path, objectType: Object.prototype.toString.call(current) });
        }
        if (Object.getOwnPropertySymbols(current).length) fail("NON_CANONICAL_SYMBOL_KEY", { path: path });
        result = {};
        Object.getOwnPropertyNames(current).forEach(function cloneProperty(key) {
          var descriptor = Object.getOwnPropertyDescriptor(current, key);
          if (!descriptor.enumerable || descriptor.get || descriptor.set) {
            fail("NON_CANONICAL_PROPERTY", { path: path + "." + key });
          }
          result[key] = cloneValue(descriptor.value, path + "." + key);
        });
      }
      ancestors.delete(current);
      return result;
    }

    return cloneValue(value, "$");
  }

  function clone(value) {
    platformStructuredClone(value);
    return strictCanonicalClone(value, false);
  }

  function normalizeCanonicalData(value) {
    var normalizedPlatformCopy = platformStructuredClone(value);
    return deepFreeze(strictCanonicalClone(normalizedPlatformCopy, true));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function frozenClone(value) {
    return deepFreeze(clone(value));
  }

  function isPresent(value) {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  function identifierIsValid(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
  }

  function requireIdentifier(kind, field, value) {
    if (!identifierIsValid(value)) fail("INVALID_IDENTIFIER", { kind: kind, field: field, value: value });
  }

  function isoDateTimeMillis(value, field) {
    if (typeof value !== "string") fail("INVALID_ISO_DATETIME", { field: field, value: value });
    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!match) fail("INVALID_ISO_DATETIME", { field: field, value: value });
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var second = Number(match[6]);
    var offsetHour = match[8] === "Z" ? 0 : Number(match[10]);
    var offsetMinute = match[8] === "Z" ? 0 : Number(match[11]);
    var daysInMonth = month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
    if (year < 1 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 ||
        offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
      fail("INVALID_ISO_DATETIME", { field: field, value: value });
    }
    var milliseconds = Date.parse(value);
    if (!Number.isFinite(milliseconds)) fail("INVALID_ISO_DATETIME", { field: field, value: value });
    return milliseconds;
  }

  function validateDocumentRef(ref, code, details) {
    if (!isPlainObject(ref) || !identifierIsValid(ref.documentId) || !identifierIsValid(ref.version)) {
      fail(code || "INVALID_DOCUMENT_REFERENCE", details || {});
    }
    return true;
  }

  function validateBasisEntries(kind, field, entries) {
    if (!Array.isArray(entries) || entries.length === 0) fail("MISSING_REQUIRED_FIELD", { kind: kind, field: field });
    entries.forEach(function validateBasisEntry(ref, index) {
      if (!isPlainObject(ref) || !identifierIsValid(ref.documentId) || !identifierIsValid(ref.version)) {
        fail("INVALID_BASIS_REFERENCE", { kind: kind, field: field, index: index });
      }
    });
  }

  function validateReferenceList(kind, field, entries, requiredFields, code, allowEmpty) {
    if (!Array.isArray(entries) || (!allowEmpty && entries.length === 0)) {
      fail(code, { kind: kind, field: field });
    }
    entries.forEach(function validateReference(ref, index) {
      if (!isPlainObject(ref) || requiredFields.some(function invalidReferenceField(requiredField) {
        return !identifierIsValid(ref[requiredField]);
      })) {
        fail(code, { kind: kind, field: field, index: index });
      }
    });
  }

  function validateEvidenceRequirements(kind, entries) {
    if (!Array.isArray(entries) || entries.length === 0) fail("INVALID_EVIDENCE_REQUIREMENT", { kind: kind });
    entries.forEach(function validateEvidence(requirement, index) {
      if (!isPlainObject(requirement) || !identifierIsValid(requirement.evidenceType) ||
          !evidenceBasisIsValid(requirement.basisRef)) {
        fail("INVALID_EVIDENCE_REQUIREMENT", { kind: kind, index: index });
      }
    });
  }

  function evidenceBasisIsValid(basisRef) {
    return identifierIsValid(basisRef) || (isPlainObject(basisRef) &&
      identifierIsValid(basisRef.documentId) && identifierIsValid(basisRef.version));
  }

  function validatePaymentImpactEntries(kind, entries) {
    if (!Array.isArray(entries)) fail("INVALID_CHANGE_IMPACT", { kind: kind, field: "paymentImpacts" });
    entries.forEach(function validatePaymentImpact(impact, index) {
      if (!isPlainObject(impact) || !identifierIsValid(impact.paymentStageId) ||
          typeof impact.delta !== "string" || !/^-?\d+(?:\.\d{1,2})?$/.test(impact.delta)) {
        fail("INVALID_CHANGE_IMPACT", { kind: kind, field: "paymentImpacts", index: index });
      }
    });
  }

  function validateChangeShape(kind, value) {
    if (kind === "ChangeRequest") {
      validateReferenceList(kind, "quotationRefs", value.quotationRefs, ["quotationId", "version"], "INVALID_CHANGE_REFERENCE", false);
      validateReferenceList(kind, "drawingRefs", value.drawingRefs, ["drawingId", "version"], "INVALID_CHANGE_REFERENCE", false);
    }
    if (typeof value.amountImpact !== "string" || !/^-?\d+(?:\.\d{1,2})?$/.test(value.amountImpact) ||
        !isPlainObject(value.scheduleImpact) || !isPlainObject(value.versionImpact) ||
        !identifierIsValid(value.versionImpact.from) || !identifierIsValid(value.versionImpact.proposed)) {
      fail("INVALID_CHANGE_IMPACT", { kind: kind });
    }
    validatePaymentImpactEntries(kind, value.paymentImpacts);
  }

  function validatePartyProof(proof, expectedRole, required) {
    if (proof === undefined || proof === null) {
      if (required) fail("VERIFIABLE_PARTY_PROOF_REQUIRED", { expectedRole: expectedRole });
      return false;
    }
    if (!isPlainObject(proof)) fail("INVALID_PARTY_PROOF", { expectedRole: expectedRole });
    requireIdentifier("PartyProof", "partyId", proof.partyId);
    requireIdentifier("PartyProof", "proofId", proof.proofId);
    if (proof.role !== expectedRole) fail("INVALID_PROOF_ROLE", { expectedRole: expectedRole, actualRole: proof.role });
    if (proof.verified !== true) fail("UNVERIFIED_PARTY_PROOF", { expectedRole: expectedRole });
    isoDateTimeMillis(proof.createdAt, "createdAt");
    return true;
  }

  function requireBilateralProofs(ownerProof, contractorProof) {
    if (isPlainObject(ownerProof) && isPlainObject(contractorProof) &&
        (ownerProof.partyId === contractorProof.partyId || ownerProof.proofId === contractorProof.proofId)) {
      fail("BILATERAL_PROOFS_MUST_BE_DISTINCT", {});
    }
    validatePartyProof(ownerProof, "OWNER", true);
    validatePartyProof(contractorProof, "CONTRACTOR", true);
    if (ownerProof.partyId === contractorProof.partyId || ownerProof.proofId === contractorProof.proofId) {
      fail("BILATERAL_PROOFS_MUST_BE_DISTINCT", {});
    }
    return true;
  }

  function requireFields(kind, value, fields) {
    fields.forEach(function requireField(field) {
      if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] === undefined || value[field] === null || value[field] === "") {
        fail("MISSING_REQUIRED_FIELD", { kind: kind, field: field });
      }
    });
  }

  function requireEnum(kind, field, value, allowed) {
    if (allowed.indexOf(value[field]) === -1) {
      fail("INVALID_ENUM_VALUE", { kind: kind, field: field, value: value[field], allowed: allowed.slice() });
    }
  }

  function normalizeContractType(input) {
    if (FORMAL_CONTRACT_TYPES.indexOf(input) !== -1) return input;
    if (typeof input === "string" && Object.prototype.hasOwnProperty.call(source.legacyContractTypeMap, input)) {
      return source.legacyContractTypeMap[input];
    }
    fail("UNSUPPORTED_CONTRACT_TYPE", { value: input });
  }

  var DOMAIN_RULES = {
    Case: { required: ["caseId", "ownerId", "projectName", "status", "createdAt"] },
    Party: { required: ["partyId", "role", "legalName"], enums: { role: ["OWNER", "CONTRACTOR"] } },
    ProjectContract: {
      required: ["contractId", "caseId", "contractType", "templateVersion", "status", "ownerId", "contractorId"],
      enums: { status: ["DRAFT", "NOT_SIGNED", "SIGNED"] },
    },
    ContractVersion: {
      required: ["versionId", "contractId", "status", "createdAt", "createdBy", "changeSummary", "structuredContent"],
      enums: { status: ["DRAFT", "SIGNED"] },
    },
    Attachment: {
      required: ["attachmentId", "caseId", "contractId", "attachmentType", "documentId", "version"],
    },
    Schedule: { required: ["scheduleId", "caseId", "version", "nodes"] },
    Milestone: {
      required: [
        "milestoneId", "caseId", "scheduleNodeId", "name", "startAt", "dueAt", "workItems",
        "quotationRefs", "drawingRefs", "workValue", "paymentRate", "paymentAmount", "requiredEvidence",
        "holdPoint", "drsReviewState", "ownerDecisionState", "paymentState",
      ],
    },
    PaymentStage: {
      required: ["paymentStageId", "caseId", "subjectId", "stageType", "rate", "amount", "currency", "state"],
      enums: { stageType: ["SIGNING", "PROGRESS", "FINAL", "DESIGN"] },
    },
    DRSReview: {
      required: ["reviewId", "reviewVersion", "caseId", "subjectId", "status", "basis", "findings", "createdAt", "createdBy"],
      enums: { status: REVIEW_STATUSES },
    },
    OwnerDecision: {
      required: [
        "decisionId", "caseId", "reviewId", "reviewVersion", "subjectId", "ownerId", "decision",
        "reason", "evidence", "createdAt",
      ],
      enums: { decision: OWNER_DECISIONS },
    },
    PartyAgreement: { required: ["agreementId", "caseId", "subjectId", "ownerId", "contractorId"] },
    ChangeRequest: {
      required: [
        "changeId", "caseId", "changeType", "requestedBy", "reason", "baselineVersion", "quotationRefs",
        "drawingRefs", "amountImpact", "scheduleImpact", "versionImpact", "paymentImpacts", "status",
      ],
      enums: { changeType: CHANGE_TYPES },
    },
    ChangeOrder: {
      required: [
        "changeOrderId", "caseId", "changeType", "changeRequestId", "baselineVersion", "reason", "amountImpact",
        "scheduleImpact", "versionImpact", "paymentImpacts", "baselineIdentity", "status", "partyConfirmationStatus",
      ],
      enums: {
        changeType: ["CHANGE_ORDER"],
        status: ["DRAFT"],
        partyConfirmationStatus: ["PENDING_BILATERAL_CONFIRMATION"],
      },
    },
    WarrantyPledge: {
      required: [
        "pledgeId", "caseId", "projectContractId", "contractVersion", "warrantyTermsRef", "status", "signingProof",
      ],
      enums: { status: ["DRAFT", "SIGNED"] },
    },
    CaseEvent: {
      required: ["eventId", "actorId", "occurredAt", "caseId", "action", "subjectId", "basis", "status", "nextActor"],
    },
  };

  var DOMAIN_ID_FIELDS = {
    Case: ["caseId", "ownerId"],
    Party: ["partyId"],
    ProjectContract: ["contractId", "caseId", "ownerId", "contractorId"],
    ContractVersion: ["versionId", "contractId", "createdBy"],
    Attachment: ["attachmentId", "caseId", "contractId", "documentId", "version"],
    Schedule: ["scheduleId", "caseId", "version"],
    Milestone: ["milestoneId", "caseId", "scheduleNodeId"],
    PaymentStage: ["paymentStageId", "caseId", "subjectId"],
    DRSReview: ["reviewId", "reviewVersion", "caseId", "subjectId", "createdBy"],
    OwnerDecision: ["decisionId", "caseId", "reviewId", "reviewVersion", "subjectId", "ownerId"],
    PartyAgreement: ["agreementId", "caseId", "subjectId", "ownerId", "contractorId"],
    ChangeRequest: ["changeId", "caseId", "requestedBy", "baselineVersion"],
    ChangeOrder: ["changeOrderId", "caseId", "changeRequestId", "baselineVersion"],
    WarrantyPledge: ["pledgeId", "caseId", "projectContractId", "contractVersion"],
    CaseEvent: ["eventId", "actorId", "caseId", "subjectId", "nextActor"],
  };

  var DOMAIN_DATE_FIELDS = {
    Case: ["createdAt"],
    ContractVersion: ["createdAt"],
    DRSReview: ["createdAt"],
    OwnerDecision: ["createdAt"],
    CaseEvent: ["occurredAt"],
  };

  function createDomain(kind, input) {
    var rules = DOMAIN_RULES[kind];
    if (!rules) fail("UNSUPPORTED_DOMAIN_KIND", { kind: kind });
    if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_DOMAIN_INPUT", { kind: kind });
    var value = clone(input);
    if (kind === "ProjectContract") value.contractType = normalizeContractType(value.contractType);
    requireFields(kind, value, rules.required);
    if (rules.enums) {
      Object.keys(rules.enums).forEach(function validateEnum(field) {
        requireEnum(kind, field, value, rules.enums[field]);
      });
    }
    (DOMAIN_ID_FIELDS[kind] || []).forEach(function validateDomainId(field) {
      requireIdentifier(kind, field, value[field]);
    });
    (DOMAIN_DATE_FIELDS[kind] || []).forEach(function validateDomainDate(field) {
      isoDateTimeMillis(value[field], field);
    });
    if (kind === "CaseEvent") validateBasisEntries(kind, "basis", value.basis);
    if (kind === "Schedule" && (!Array.isArray(value.nodes) || value.nodes.length === 0)) {
      fail("MISSING_REQUIRED_FIELD", { kind: kind, field: "nodes" });
    }
    if (kind === "Schedule") {
      var scheduleIssues = [];
      collectScheduleNodes(value.nodes, []).forEach(function validateScheduleDomainNode(node) {
        scheduleIssues = scheduleIssues.concat(nodeIssues(node));
      });
      if (scheduleIssues.length) fail("INVALID_SCHEDULE_NODE", { issues: scheduleIssues });
    }
    if (kind === "DRSReview") validateBasisEntries(kind, "basis", value.basis);
    if (kind === "Milestone") {
      ["workItems", "quotationRefs", "drawingRefs", "requiredEvidence"].forEach(function requireMilestoneArray(field) {
        if (!Array.isArray(value[field]) || value[field].length === 0) {
          fail("MISSING_REQUIRED_FIELD", { kind: kind, field: field });
        }
      });
      isoDateTimeMillis(value.startAt, "startAt");
      isoDateTimeMillis(value.dueAt, "dueAt");
      if (isoDateTimeMillis(value.startAt, "startAt") > isoDateTimeMillis(value.dueAt, "dueAt")) {
        fail("INVALID_SCHEDULE_DATE_RANGE", { kind: kind });
      }
      validateReferenceList(kind, "quotationRefs", value.quotationRefs, ["quotationId", "version", "itemId"], "INVALID_QUOTATION_REF", false);
      value.quotationRefs.forEach(function validateMilestoneAllocation(ref, index) {
        try {
          if (parseMoney(ref.allocation, "quotationRefs.allocation") <= 0n) fail("INVALID_QUOTATION_REF", { kind: kind, index: index });
        } catch (error) {
          fail("INVALID_QUOTATION_REF", { kind: kind, index: index, cause: error.code || error.message });
        }
      });
      validateReferenceList(kind, "drawingRefs", value.drawingRefs, ["drawingId", "version"], "INVALID_DRAWING_REF", false);
      validateEvidenceRequirements(kind, value.requiredEvidence);
      if (parseMoney(value.workValue, "workValue") <= 0n || parseMoney(value.paymentAmount, "paymentAmount") < 0n ||
          typeof value.paymentRate !== "number" || !Number.isFinite(value.paymentRate) || value.paymentRate <= 0 || value.paymentRate > 100) {
        fail("INVALID_MILESTONE_PAYMENT", { kind: kind });
      }
    }
    if (kind === "PaymentStage") {
      if (typeof value.rate !== "number" || !Number.isFinite(value.rate) || value.rate <= 0 || value.rate > 100) {
        fail("INVALID_PAYMENT_STAGE_RATE", { kind: kind });
      }
      parseMoney(value.amount, "amount");
    }
    if (kind === "ChangeRequest" || kind === "ChangeOrder") {
      validateChangeShape(kind, value);
    }
    if (kind === "ProjectContract" && value.status === "SIGNED") {
      fail("VERIFIED_SIGNED_PROJECT_CONTRACT_NOT_AVAILABLE", {});
    }
    if (kind === "ContractVersion" && value.status === "SIGNED") {
      fail("VERIFIED_SIGNED_CONTRACT_VERSION_NOT_AVAILABLE", {});
    }
    if (kind === "ChangeOrder") {
      var baselineIdentity = value.baselineIdentity;
      if (!isPlainObject(baselineIdentity) || !identifierIsValid(baselineIdentity.contractId) ||
          !identifierIsValid(baselineIdentity.versionId) || !/^[a-fA-F0-9]{64}$/.test(baselineIdentity.sha256 || "")) {
        fail("INVALID_BASELINE_IDENTITY", {});
      }
      if (baselineIdentity.versionId !== value.baselineVersion) fail("BASELINE_VERSION_IDENTITY_MISMATCH", {});
    }
    if (kind === "WarrantyPledge" && value.status === "SIGNED") {
      validateDocumentRef(value.warrantyTermsRef, "INVALID_WARRANTY_TERMS_REF", {});
      validatePartyProof(value.signingProof, "CONTRACTOR", true);
    }
    if (kind === "WarrantyPledge" && value.status !== "SIGNED") {
      validateDocumentRef(value.warrantyTermsRef, "INVALID_WARRANTY_TERMS_REF", {});
    }
    if (kind === "OwnerDecision") {
      var review = value.review;
      if (!isPlainObject(review)) fail("OWNER_DECISION_REVIEW_REQUIRED", {});
      var normalizedReview = createDomain("DRSReview", review);
      if (normalizedReview.reviewId !== value.reviewId || normalizedReview.reviewVersion !== value.reviewVersion ||
          normalizedReview.caseId !== value.caseId || normalizedReview.subjectId !== value.subjectId) {
        fail("OWNER_DECISION_REVIEW_REFERENCE_MISMATCH", {});
      }
      if (isoDateTimeMillis(value.createdAt, "createdAt") < isoDateTimeMillis(normalizedReview.createdAt, "review.createdAt")) {
        fail("OWNER_DECISION_PRECEDES_REVIEW", {});
      }
      validateBasisEntries(kind, "evidence", value.evidence);
      value.review = clone(normalizedReview);
    }
    if (kind === "OwnerDecision" && value.decision === "OWNER_OVERRIDE") {
      if (!value.originalReview) fail("OWNER_OVERRIDE_ORIGINAL_REVIEW_REQUIRED", {});
      if (value.originalReview.reviewId !== value.reviewId || value.originalReview.reviewVersion !== value.reviewVersion) {
        fail("OWNER_OVERRIDE_REVIEW_REFERENCE_MISMATCH", {});
      }
      value.originalReviewPreserved = true;
    }
    if (kind === "PartyAgreement") {
      if (value.ownerId === value.contractorId) fail("PARTY_AGREEMENT_PARTIES_MUST_BE_DISTINCT", {});
      if (isPlainObject(value.ownerProof) && isPlainObject(value.contractorProof) &&
          (value.ownerProof.partyId === value.contractorProof.partyId || value.ownerProof.proofId === value.contractorProof.proofId)) {
        fail("BILATERAL_PROOFS_MUST_BE_DISTINCT", {});
      }
      var ownerVerified = validatePartyProof(value.ownerProof, "OWNER", false);
      var contractorVerified = validatePartyProof(value.contractorProof, "CONTRACTOR", false);
      if ((ownerVerified && value.ownerProof.partyId !== value.ownerId) ||
          (contractorVerified && value.contractorProof.partyId !== value.contractorId)) {
        fail("PARTY_AGREEMENT_PROOF_PARTY_MISMATCH", {});
      }
      if (ownerVerified && contractorVerified &&
          (value.ownerProof.partyId === value.contractorProof.partyId || value.ownerProof.proofId === value.contractorProof.proofId)) {
        fail("BILATERAL_PROOFS_MUST_BE_DISTINCT", {});
      }
      value.status = ownerVerified && contractorVerified
        ? source.governance.partyAgreement.status
        : (ownerVerified ? source.governance.partyAgreement.ownerOnlyReportStatus : "UNVERIFIED_PARTY_AGREEMENT");
      value.established = ownerVerified && contractorVerified;
      value.ownerProof = ownerVerified ? value.ownerProof : null;
      value.contractorProof = contractorVerified ? value.contractorProof : null;
    }
    value.kind = kind;
    return deepFreeze(value);
  }

  function domainFactory(kind) {
    return function createNamedDomain(input) {
      return createDomain(kind, input);
    };
  }

  function validateDomain(kind, input) {
    try {
      return { valid: true, value: createDomain(kind, input), issues: [] };
    } catch (error) {
      if (!(error instanceof EngineValidationError)) throw error;
      return { valid: false, value: null, issues: [{ code: error.code, details: clone(error.details) }] };
    }
  }

  function placeholderValuesFrom(options, contractType) {
    var values = {};
    var canonicalValues = {};
    var conflicts = [];
    function recordConflict(field) {
      if (conflicts.indexOf(field) === -1) conflicts.push(field);
    }
    function mergeCanonicalSource(candidate) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return;
      Object.keys(candidate).forEach(function mergeKey(key) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) return;
        if (Object.prototype.hasOwnProperty.call(values, key) && values[key] !== candidate[key]) {
          recordConflict(key);
          return;
        }
        values[key] = candidate[key];
      });
    }
    function bindCanonical(field, value) {
      if (value === undefined || value === null) return;
      if (Object.prototype.hasOwnProperty.call(values, field) && values[field] !== value) recordConflict(field);
      if (Object.prototype.hasOwnProperty.call(canonicalValues, field) && canonicalValues[field] !== value) recordConflict(field);
      canonicalValues[field] = value;
      values[field] = value;
    }
    [options.caseData, options.parties, options.quotation, options.drawings, options.designSchedule,
      options.constructionSchedule, options.drsProcedure, options.warrantyTerms].forEach(function merge(candidate) {
      mergeCanonicalSource(candidate);
    });
    var caseData = isPlainObject(options.caseData) ? options.caseData : {};
    bindCanonical("CASE_ID", caseData.caseId);
    bindCanonical("PROJECT_CONTRACT_ID", caseData.projectContractId || caseData.contractId);
    bindCanonical("PROJECT_NAME", caseData.projectName);
    bindCanonical("PROJECT_ADDRESS", caseData.projectAddress || caseData.address);
    bindCanonical("PROJECT_CONTRACT_TYPE", contractType);
    if (isPlainObject(options.versionMetadata)) bindCanonical("PROJECT_CONTRACT_VERSION", options.versionMetadata.versionId);

    var parties = isPlainObject(options.parties) ? options.parties : {};
    var owner = isPlainObject(parties.owner) ? parties.owner : {};
    var contractor = isPlainObject(parties.contractor) ? parties.contractor : {};
    bindCanonical("OWNER_ID", parties.ownerId || owner.partyId || owner.ownerId || owner.id);
    bindCanonical("OWNER_LEGAL_NAME", parties.ownerLegalName || owner.legalName);
    bindCanonical("CONTRACTOR_ID", parties.contractorId || contractor.partyId || contractor.contractorId || contractor.id);
    bindCanonical("CONTRACTOR_LEGAL_NAME", parties.contractorLegalName || contractor.legalName);

    Object.keys(options.values || {}).forEach(function mergeCallerValue(key) {
      var value = options.values[key];
      if (Object.prototype.hasOwnProperty.call(canonicalValues, key)) {
        if (canonicalValues[key] !== value) recordConflict(key);
        values[key] = canonicalValues[key];
      } else if (Object.prototype.hasOwnProperty.call(values, key) && values[key] !== value) {
        recordConflict(key);
      } else {
        values[key] = value;
      }
    });
    return { values: values, conflicts: conflicts };
  }

  function renderBody(body, values) {
    return body.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, function replacePlaceholder(token, name) {
      if (!Object.prototype.hasOwnProperty.call(values, name)) return token;
      var value = values[name];
      return value === undefined || value === null ? token : String(value);
    });
  }

  function renderedArticles(articles, values) {
    return articles.map(function renderArticle(article) {
      return deepFreeze({
        articleId: article.articleId,
        title: article.title,
        body: renderBody(article.body, values),
        placeholders: article.placeholders.slice(),
        required: article.required,
        sourceType: article.sourceType,
        attachments: article.attachments.slice(),
      });
    });
  }

  function collectUnresolved(articles) {
    var tokens = [];
    articles.forEach(function inspect(article) {
      (article.body.match(/\{\{[A-Z][A-Z0-9_]*\}\}/g) || []).forEach(function add(token) {
        if (tokens.indexOf(token) === -1) tokens.push(token);
      });
    });
    return tokens.sort();
  }

  function designScheduleIssues(schedule) {
    var issues = [];
    if (!isPlainObject(schedule) || !identifierIsValid(schedule.scheduleId) || !identifierIsValid(schedule.version) ||
        !Array.isArray(schedule.nodes) || schedule.nodes.length === 0) {
      return [{ code: "INVALID_DESIGN_SCHEDULE" }];
    }
    var nodeIds = new Set();
    function validateDesignNodes(nodes, path, parent) {
      if (!Array.isArray(nodes)) {
        issues.push({ code: "INVALID_DESIGN_SCHEDULE_NODE_COLLECTION", path: path });
        return;
      }
      nodes.forEach(function validateDesignNode(node, index) {
        var nodePath = path + "[" + index + "]";
        var nodeId = isPlainObject(node) ? (node.nodeId || node.stageId) : null;
        if (!isPlainObject(node) || !identifierIsValid(nodeId) || typeof node.name !== "string" || !node.name.trim() ||
          !Array.isArray(node.deliverableRefs) || node.deliverableRefs.length === 0) {
          issues.push({ code: "INVALID_DESIGN_SCHEDULE_NODE", path: nodePath });
        } else {
          if (nodeIds.has(nodeId)) issues.push({ code: "DUPLICATE_DESIGN_SCHEDULE_NODE_ID", nodeId: nodeId });
          nodeIds.add(nodeId);
          var startMillis = null;
          var dueMillis = null;
          try {
            dueMillis = isoDateTimeMillis(node.dueAt, "dueAt");
            if (node.startAt !== undefined) startMillis = isoDateTimeMillis(node.startAt, "startAt");
            if (startMillis !== null && startMillis > dueMillis) fail("INVALID_DESIGN_SCHEDULE_DATE_ORDER", {});
            if (parent && parent.startMillis !== null && startMillis !== null && startMillis < parent.startMillis) {
              fail("INVALID_DESIGN_SCHEDULE_CHILD_RANGE", {});
            }
            if (parent && parent.dueMillis !== null && dueMillis > parent.dueMillis) {
              fail("INVALID_DESIGN_SCHEDULE_CHILD_RANGE", {});
            }
          } catch (error) {
            issues.push({ code: "INVALID_DESIGN_SCHEDULE_DATE", nodeId: nodeId });
          }
          node.deliverableRefs.forEach(function validateDeliverableRef(ref, refIndex) {
            if (!isPlainObject(ref) || !identifierIsValid(ref.documentId) || !identifierIsValid(ref.version)) {
              issues.push({ code: "INVALID_DESIGN_DELIVERABLE_REF", nodeId: nodeId, index: refIndex });
            }
          });
          ["children", "stages"].forEach(function validateNestedCollection(collectionName) {
            if (!Object.prototype.hasOwnProperty.call(node, collectionName)) return;
            if (!Array.isArray(node[collectionName])) {
              issues.push({ code: "INVALID_DESIGN_SCHEDULE_NODE_COLLECTION", path: nodePath + "." + collectionName });
              return;
            }
            validateDesignNodes(node[collectionName], nodePath + "." + collectionName, {
              startMillis: startMillis,
              dueMillis: dueMillis,
            });
          });
        }
      });
    }
    validateDesignNodes(schedule.nodes, "nodes", null);
    return issues;
  }

  function canonicalValuesEqual(left, right) {
    return canonicalSerialize(left) === canonicalSerialize(right);
  }

  function assembleContract(options) {
    options = options || {};
    var contractType = normalizeContractType(options.contractType);
    var template = source.templates[contractType];
    var templateVersion = options.templateVersion || template.templateVersion;
    if (templateVersion !== template.templateVersion) fail("UNSUPPORTED_TEMPLATE_VERSION", { value: templateVersion });
    if (options.values && (typeof options.values !== "object" || Array.isArray(options.values))) {
      fail("INVALID_PLACEHOLDER_VALUES", {});
    }
    Object.keys(options.values || {}).forEach(function validateValueKey(key) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) fail("INVALID_PLACEHOLDER_VALUE_KEY", { field: key });
    });

    var placeholderResolution = placeholderValuesFrom(options, contractType);
    var values = placeholderResolution.values;
    var boundCaseId = values.CASE_ID || null;
    var boundProjectContractId = values.PROJECT_CONTRACT_ID || null;
    var boundContractVersion = values.PROJECT_CONTRACT_VERSION || null;
    var designFeeTruth = values.TOTAL_DESIGN_FEE === undefined ? null : values.TOTAL_DESIGN_FEE;
    var quotationTruth = options.quotation === undefined ? null : clone(options.quotation);
    var constructionScheduleTruth = options.constructionSchedule === undefined ? null : clone(options.constructionSchedule);
    var designScheduleTruth = options.designSchedule === undefined ? null : clone(options.designSchedule);
    var milestoneTruth = options.milestones === undefined ? null : clone(options.milestones);
    var worksPaymentTruth = options.paymentStages === undefined ? null : clone(options.paymentStages);
    var designPaymentTruth = options.designPaymentStages === undefined ? null : clone(options.designPaymentStages);
    var legacyChangesProvided = Object.prototype.hasOwnProperty.call(options, "changes") && options.changes !== undefined;
    var designChangesProvided = Object.prototype.hasOwnProperty.call(options, "designChanges") && options.designChanges !== undefined;
    var worksChangesProvided = Object.prototype.hasOwnProperty.call(options, "worksChanges") && options.worksChanges !== undefined;
    var ambiguousChangesInput = (contractType === "DESIGN" && legacyChangesProvided && designChangesProvided) ||
      (contractType === "WORKS" && legacyChangesProvided && worksChangesProvided);
    var legacyDesignBuildChanges = contractType === "DESIGN_BUILD" && legacyChangesProvided ? clone(options.changes) : null;
    var designChangeTruth = contractType === "DESIGN"
      ? (ambiguousChangesInput ? null : (designChangesProvided ? clone(options.designChanges) :
        (legacyChangesProvided ? clone(options.changes) : null)))
      : (contractType === "DESIGN_BUILD" && designChangesProvided ? clone(options.designChanges) : null);
    var worksChangeTruth = contractType === "WORKS"
      ? (ambiguousChangesInput ? null : (worksChangesProvided ? clone(options.worksChanges) :
        (legacyChangesProvided ? clone(options.changes) : null)))
      : (contractType === "DESIGN_BUILD" && worksChangesProvided ? clone(options.worksChanges) : null);
    var warrantyTruth = options.warrantyTerms === undefined ? null : clone(options.warrantyTerms);
    var truthBindings = deepFreeze({
      quotation: quotationTruth,
      constructionSchedule: constructionScheduleTruth,
      designSchedule: designScheduleTruth,
      milestones: milestoneTruth,
      paymentStages: worksPaymentTruth,
      designPaymentStages: designPaymentTruth,
      changes: null,
      designChanges: designChangeTruth,
      worksChanges: worksChangeTruth,
      warrantyTerms: warrantyTruth,
      design: contractType === "DESIGN" || contractType === "DESIGN_BUILD" ? {
        caseId: boundCaseId,
        projectContractId: boundProjectContractId,
        contractVersion: boundContractVersion,
        totalDesignFee: designFeeTruth,
        schedule: designScheduleTruth,
        paymentStages: designPaymentTruth,
        changes: designChangeTruth,
      } : null,
      works: contractType === "WORKS" || contractType === "DESIGN_BUILD" ? {
        caseId: boundCaseId,
        projectContractId: boundProjectContractId,
        contractVersion: boundContractVersion,
        quotation: quotationTruth,
        schedule: constructionScheduleTruth,
        milestones: milestoneTruth,
        paymentStages: worksPaymentTruth,
        changes: worksChangeTruth,
        warrantyTerms: warrantyTruth,
      } : null,
    });
    var unresolvedBindings = [];
    function markBindingUnresolved(binding) {
      if (unresolvedBindings.indexOf(binding) === -1) unresolvedBindings.push(binding);
    }
    placeholderResolution.conflicts.forEach(function markPlaceholderConflict(field) {
      markBindingUnresolved("placeholderConflict:" + field);
    });
    function exactPlaceholderBinding(field, expected, missingBinding, mismatchBinding) {
      if (!Object.prototype.hasOwnProperty.call(options.values || {}, field)) {
        markBindingUnresolved(missingBinding);
        values[field] = expected;
      } else if (options.values[field] !== expected) {
        markBindingUnresolved(mismatchBinding);
        markBindingUnresolved("placeholderConflict:" + field);
        values[field] = expected;
      } else {
        values[field] = expected;
      }
    }
    exactPlaceholderBinding(
      "PROJECT_CONTRACT_TYPE", contractType,
      "placeholderContractTypeBinding", "placeholderContractTypeMismatch",
    );
    if (!identifierIsValid(boundCaseId)) markBindingUnresolved("caseBinding");
    if (!identifierIsValid(boundProjectContractId)) markBindingUnresolved("projectContractIdBinding");
    if (!identifierIsValid(boundContractVersion)) markBindingUnresolved("contractVersionBinding");
    if (!isPlainObject(options.caseData) || !identifierIsValid(options.caseData.caseId)) {
      markBindingUnresolved("caseTruthBinding");
    } else {
      exactPlaceholderBinding("CASE_ID", options.caseData.caseId, "caseBinding", "placeholderCaseIdMismatch");
      if (options.values && options.values.CASE_ID !== undefined && options.values.CASE_ID !== options.caseData.caseId) {
        markBindingUnresolved("caseBindingMismatch");
      }
    }
    if (!isPlainObject(options.versionMetadata) || !identifierIsValid(options.versionMetadata.versionId)) {
      markBindingUnresolved("contractVersionTruthBinding");
    } else {
      exactPlaceholderBinding(
        "PROJECT_CONTRACT_VERSION", options.versionMetadata.versionId,
        "contractVersionBinding", "placeholderContractVersionMismatch",
      );
      if (options.values && options.values.PROJECT_CONTRACT_VERSION !== undefined &&
          options.values.PROJECT_CONTRACT_VERSION !== options.versionMetadata.versionId) {
        markBindingUnresolved("contractVersionBindingMismatch");
      }
    }
    var hasWorksTruth = options.quotation !== undefined || options.constructionSchedule !== undefined ||
      options.milestones !== undefined || options.paymentStages !== undefined || options.warrantyTerms !== undefined ||
      (Array.isArray(options.changes) && options.changes.some(function isWorksChange(change) {
        return isPlainObject(change) && (change.changeType === "WORK_CHANGE" || change.changeType === "CHANGE_ORDER");
      }));
    var hasDesignTruth = options.designSchedule !== undefined || options.designPaymentStages !== undefined ||
      values.TOTAL_DESIGN_FEE !== undefined;
    if (contractType === "DESIGN" && hasWorksTruth) markBindingUnresolved("unexpectedWorksTruth");
    if (contractType === "WORKS" && hasDesignTruth) markBindingUnresolved("unexpectedDesignTruth");
    var designAssemblyChangeTypes = ["DESIGN_CHANGE", "SCOPE_CHANGE", "CHANGE_REQUEST", "SCHEDULE_CHANGE"];
    var worksAssemblyChangeTypes = ["WORK_CHANGE", "SCOPE_CHANGE", "CHANGE_REQUEST", "SCHEDULE_CHANGE", "CHANGE_ORDER"];
    function validateAssemblyChanges(changes, allowedTypes, bindingPrefix, sharedIds) {
      if (!Array.isArray(changes)) {
        markBindingUnresolved(bindingPrefix);
        return;
      }
      var assemblyChangeIds = new Set();
      changes.forEach(function validateAssemblyChange(change) {
        var changeKind = isPlainObject(change) && change.changeType === "CHANGE_ORDER" ? "ChangeOrder" : "ChangeRequest";
        try {
          var normalizedChange = createDomain(changeKind, change);
          var changeId = changeKind === "ChangeOrder" ? normalizedChange.changeOrderId : normalizedChange.changeId;
          if (assemblyChangeIds.has(changeId)) markBindingUnresolved(bindingPrefix + "DuplicateId");
          if (sharedIds && sharedIds.has(changeId)) markBindingUnresolved("designBuildChangesDuplicateId");
          assemblyChangeIds.add(changeId);
          if (sharedIds) sharedIds.add(changeId);
          if (allowedTypes.indexOf(normalizedChange.changeType) === -1) {
            markBindingUnresolved(bindingPrefix + "ContractTypeMismatch");
          }
          if (normalizedChange.caseId !== boundCaseId) markBindingUnresolved(bindingPrefix + "CaseMismatch");
          if (changeKind === "ChangeOrder" && (!identifierIsValid(boundProjectContractId) ||
              normalizedChange.baselineIdentity.contractId !== boundProjectContractId)) {
            markBindingUnresolved(bindingPrefix + "ContractMismatch");
          }
          if (!identifierIsValid(boundContractVersion)) {
            markBindingUnresolved(bindingPrefix + "BaselineBinding");
          } else if (normalizedChange.baselineVersion !== boundContractVersion ||
              (normalizedChange.versionImpact && normalizedChange.versionImpact.from !== normalizedChange.baselineVersion)) {
            markBindingUnresolved(bindingPrefix + "BaselineMismatch");
          }
        } catch (error) {
          markBindingUnresolved(bindingPrefix);
        }
      });
    }
    if (contractType === "DESIGN") {
      if (ambiguousChangesInput) markBindingUnresolved("ambiguousChangesInput");
      if (options.worksChanges !== undefined) markBindingUnresolved("unexpectedWorksChanges");
      validateAssemblyChanges(truthBindings.designChanges, designAssemblyChangeTypes, "changes", null);
    } else if (contractType === "WORKS") {
      if (ambiguousChangesInput) markBindingUnresolved("ambiguousChangesInput");
      if (options.designChanges !== undefined) markBindingUnresolved("unexpectedDesignChanges");
      validateAssemblyChanges(truthBindings.worksChanges, worksAssemblyChangeTypes, "changes", null);
    } else {
      if (legacyDesignBuildChanges !== null &&
          (!Array.isArray(legacyDesignBuildChanges) || legacyDesignBuildChanges.length)) {
        markBindingUnresolved("ambiguousDesignBuildChanges");
      }
      var designBuildChangeIds = new Set();
      validateAssemblyChanges(truthBindings.designChanges, designAssemblyChangeTypes, "designChanges", designBuildChangeIds);
      validateAssemblyChanges(truthBindings.worksChanges, worksAssemblyChangeTypes, "worksChanges", designBuildChangeIds);
    }
    if (contractType === "DESIGN" || contractType === "DESIGN_BUILD") {
      if (designScheduleIssues(truthBindings.designSchedule).length) {
        markBindingUnresolved("designSchedule");
      } else if (Object.prototype.hasOwnProperty.call(truthBindings.designSchedule, "DESIGN_DELIVERABLE_SCHEDULE")) {
        exactPlaceholderBinding(
          "DESIGN_DELIVERABLE_SCHEDULE", truthBindings.designSchedule.DESIGN_DELIVERABLE_SCHEDULE,
          "designSchedulePlaceholderBinding", "designSchedulePlaceholderMismatch",
        );
      } else {
        markBindingUnresolved("designSchedulePlaceholderTruthBinding");
      }
      var canonicalDesignPayments = null;
      if (designFeeTruth === null) {
        markBindingUnresolved("totalDesignFee");
      } else {
        try {
          canonicalDesignPayments = calculateDesignPayments(designFeeTruth).stages;
        } catch (error) {
          markBindingUnresolved("totalDesignFee");
        }
      }
      if (!Array.isArray(truthBindings.designPaymentStages) || truthBindings.designPaymentStages.length === 0) {
        markBindingUnresolved("designPaymentStages");
      } else if (canonicalDesignPayments && !canonicalValuesEqual(truthBindings.designPaymentStages, canonicalDesignPayments)) {
        markBindingUnresolved("designPaymentStagesCanonicalMismatch");
      }
    }
    if (contractType === "WORKS" || contractType === "DESIGN_BUILD") {
      var quotationValid = true;
      if (!isPlainObject(truthBindings.quotation) || !identifierIsValid(truthBindings.quotation.quotationId) ||
          !identifierIsValid(truthBindings.quotation.version) || !Array.isArray(truthBindings.quotation.items)) {
        markBindingUnresolved("quotation");
        quotationValid = false;
      } else {
        var assemblyQuotation = validateQuotationBoundary(truthBindings.quotation, null);
        if (assemblyQuotation.issues.length) {
          markBindingUnresolved("quotation");
          quotationValid = false;
        }
      }
      if (!Object.prototype.hasOwnProperty.call(options.values || {}, "PROJECT_TOTAL_AMOUNT")) {
        markBindingUnresolved("projectTotalAmountBinding");
        if (quotationValid) values.PROJECT_TOTAL_AMOUNT = truthBindings.quotation.total;
      } else if (quotationValid) {
        try {
          parseMoney(options.values.PROJECT_TOTAL_AMOUNT, "PROJECT_TOTAL_AMOUNT");
          parseMoney(truthBindings.quotation.total, "quotation.total");
          if (options.values.PROJECT_TOTAL_AMOUNT !== truthBindings.quotation.total) {
            markBindingUnresolved("projectTotalAmountQuotationMismatch");
            markBindingUnresolved("placeholderConflict:PROJECT_TOTAL_AMOUNT");
            values.PROJECT_TOTAL_AMOUNT = truthBindings.quotation.total;
          } else {
            values.PROJECT_TOTAL_AMOUNT = truthBindings.quotation.total;
          }
        } catch (error) {
          markBindingUnresolved("projectTotalAmountBinding");
          values.PROJECT_TOTAL_AMOUNT = truthBindings.quotation.total;
        }
      }
      var constructionScheduleValid = true;
      if (!isPlainObject(truthBindings.constructionSchedule) || !identifierIsValid(truthBindings.constructionSchedule.scheduleId) ||
          !identifierIsValid(truthBindings.constructionSchedule.version) || !Array.isArray(truthBindings.constructionSchedule.nodes)) {
        markBindingUnresolved("constructionSchedule");
        constructionScheduleValid = false;
      } else {
        exactPlaceholderBinding(
          "CONSTRUCTION_SCHEDULE_ID", truthBindings.constructionSchedule.scheduleId,
          "constructionScheduleIdPlaceholderBinding", "constructionScheduleIdPlaceholderMismatch",
        );
        exactPlaceholderBinding(
          "CONSTRUCTION_SCHEDULE_VERSION", truthBindings.constructionSchedule.version,
          "constructionScheduleVersionPlaceholderBinding", "constructionScheduleVersionPlaceholderMismatch",
        );
        var assemblyScheduleIssues = [];
        collectScheduleNodes(truthBindings.constructionSchedule.nodes, []).forEach(function validateAssemblyScheduleNode(node) {
          assemblyScheduleIssues = assemblyScheduleIssues.concat(nodeIssues(node));
        });
        if (assemblyScheduleIssues.length) {
          markBindingUnresolved("constructionSchedule");
          constructionScheduleValid = false;
        } else {
          var canonicalScheduleNodes = collectScheduleNodes(truthBindings.constructionSchedule.nodes, []);
          var earliestScheduleNode = canonicalScheduleNodes.reduce(function earlierScheduleStart(earliest, node) {
            return isoDateTimeMillis(node.startAt, "startAt") < isoDateTimeMillis(earliest.startAt, "startAt") ? node : earliest;
          });
          var latestScheduleNode = canonicalScheduleNodes.reduce(function laterScheduleEnd(latest, node) {
            return isoDateTimeMillis(node.dueAt, "dueAt") > isoDateTimeMillis(latest.dueAt, "dueAt") ? node : latest;
          });
          var declaredAssemblyPlaceholders = template.placeholders.concat(source.commonProcedureAppendix.placeholders);
          [
            ["PROJECT_START_AT", earliestScheduleNode.startAt, "projectStartAtPlaceholderBinding", "projectStartAtPlaceholderMismatch"],
            ["PROJECT_END_AT", latestScheduleNode.dueAt, "projectEndAtPlaceholderBinding", "projectEndAtPlaceholderMismatch"],
            ["CONSTRUCTION_START_AT", earliestScheduleNode.startAt, "constructionStartAtPlaceholderBinding", "constructionStartAtPlaceholderMismatch"],
            ["CONSTRUCTION_END_AT", latestScheduleNode.dueAt, "constructionEndAtPlaceholderBinding", "constructionEndAtPlaceholderMismatch"],
          ].forEach(function bindDeclaredScheduleBound(binding) {
            if (declaredAssemblyPlaceholders.indexOf("{{" + binding[0] + "}}") !== -1) {
              exactPlaceholderBinding(binding[0], binding[1], binding[2], binding[3]);
            }
          });
        }
      }
      if (!Array.isArray(truthBindings.milestones) || truthBindings.milestones.length === 0) {
        markBindingUnresolved("milestones");
      } else {
        truthBindings.milestones.forEach(function validateAssemblyMilestone(milestone) {
          try { createDomain("Milestone", milestone); } catch (error) { markBindingUnresolved("milestones"); }
        });
      }
      if (!Array.isArray(truthBindings.paymentStages) || truthBindings.paymentStages.length === 0) {
        markBindingUnresolved("paymentStages");
      } else {
        truthBindings.paymentStages.forEach(function validateAssemblyPaymentStage(stage) {
          try { createDomain("PaymentStage", stage); } catch (error) { markBindingUnresolved("paymentStages"); }
        });
      }
      if (!isPlainObject(truthBindings.warrantyTerms) || !identifierIsValid(truthBindings.warrantyTerms.documentId) ||
          !identifierIsValid(truthBindings.warrantyTerms.version)) {
        markBindingUnresolved("warrantyTerms");
      }
      if (!identifierIsValid(boundCaseId)) {
        markBindingUnresolved("worksCaseBinding");
      } else if (quotationValid && constructionScheduleValid) {
        var canonicalWorksPlan = generateWorksMilestones({
          caseId: boundCaseId,
          projectTotalAmount: truthBindings.quotation.total,
          quotation: truthBindings.quotation,
          schedule: truthBindings.constructionSchedule,
        });
        if (!canonicalWorksPlan.ok) {
          markBindingUnresolved("worksCanonicalPlan");
        } else {
          if (!Array.isArray(truthBindings.milestones) ||
              !canonicalValuesEqual(truthBindings.milestones, canonicalWorksPlan.milestones)) {
            markBindingUnresolved("milestonesCanonicalMismatch");
          }
          if (!Array.isArray(truthBindings.paymentStages) ||
              !canonicalValuesEqual(truthBindings.paymentStages, canonicalWorksPlan.paymentStages)) {
            markBindingUnresolved("paymentStagesCanonicalMismatch");
          }
        }
      }
    }
    var resolvedPlaceholderValues = deepFreeze(clone(values));
    var renderBasis = deepFreeze({
      sourceId: source.sourceId,
      contractType: contractType,
      templateVersion: templateVersion,
      articleIds: template.articles.map(function sourceArticleId(article) { return article.articleId; }),
      commonAppendixRef: template.commonAppendixRef,
      truthBindings: truthBindings,
      resolvedPlaceholderValues: resolvedPlaceholderValues,
    });
    var truthIdentity = canonicalSerialize(renderBasis);
    var articles = renderedArticles(template.articles, resolvedPlaceholderValues);
    var commonArticles = renderedArticles(source.commonProcedureAppendix.articles, resolvedPlaceholderValues);
    var unresolved = collectUnresolved(articles.concat(commonArticles));
    template.placeholders.concat(source.commonProcedureAppendix.placeholders).forEach(function addDeclaredPlaceholder(token) {
      var name = token.slice(2, -2);
        if (!Object.prototype.hasOwnProperty.call(resolvedPlaceholderValues, name) && unresolved.indexOf(token) === -1) unresolved.push(token);
    });
    unresolved.sort();
    var renderedContract = [template.title]
      .concat(articles.map(function articleText(article) { return article.title + "\n" + article.body; }))
      .concat([source.commonProcedureAppendix.title])
      .concat(commonArticles.map(function appendixText(article) { return article.title + "\n" + article.body; }))
      .join("\n\n");

    return deepFreeze({
      engineVersion: "v0.2",
      contractType: contractType,
      templateVersion: templateVersion,
      title: template.title,
      status: unresolvedBindings.length ? "PROCEDURAL_INCOMPLETE" : "DRAFT",
      signatureStatus: "NOT_SIGNED",
      articles: articles,
      commonAppendix: {
        ref: template.commonAppendixRef,
        definition: source.commonProcedureAppendix,
        renderedArticles: commonArticles,
      },
      attachmentRefs: template.attachments.slice(),
      unresolvedPlaceholders: unresolved,
      unresolvedBindings: unresolvedBindings,
      structuredContract: {
        sourceId: source.sourceId,
        contractType: contractType,
        templateVersion: templateVersion,
        articleIds: articles.map(function articleId(article) { return article.articleId; }),
        commonAppendixRef: template.commonAppendixRef,
        truthBindings: truthBindings,
        resolvedPlaceholderValues: resolvedPlaceholderValues,
        truthIdentity: truthIdentity,
      },
      renderedContract: renderedContract,
      metadata: {
        sourceId: source.sourceId,
        legalStatus: source.legalStatus,
        attachments: clone(options.attachmentMetadata || []),
        version: clone(options.versionMetadata || null),
        caseId: options.caseData && options.caseData.caseId ? options.caseData.caseId : (resolvedPlaceholderValues.CASE_ID || null),
      },
    });
  }

  function parseMoney(value, field) {
    var text = typeof value === "number" ? String(value) : value;
    if (typeof text !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(text)) {
      fail("INVALID_MONEY_VALUE", { field: field || "amount", value: value });
    }
    var parts = text.split(".");
    return BigInt(parts[0]) * 100n + BigInt((parts[1] || "").padEnd(2, "0"));
  }

  function formatMoney(cents) {
    var whole = cents / 100n;
    var fraction = String(cents % 100n).padStart(2, "0");
    return String(whole) + "." + fraction;
  }

  function distributeUnits(totalUnits, weights) {
    var totalWeight = weights.reduce(function sum(sumValue, weight) { return sumValue + weight; }, 0n);
    if (totalWeight <= 0n) fail("TOTAL_WORK_VALUE_MUST_BE_POSITIVE", {});
    var rows = weights.map(function weightedRow(weight, index) {
      var product = BigInt(totalUnits) * weight;
      return { index: index, units: Number(product / totalWeight), remainder: product % totalWeight };
    });
    var used = rows.reduce(function sumUnits(sumValue, row) { return sumValue + row.units; }, 0);
    rows.slice().sort(function compareRemainder(left, right) {
      if (left.remainder === right.remainder) return left.index - right.index;
      return left.remainder > right.remainder ? -1 : 1;
    }).slice(0, totalUnits - used).forEach(function addUnit(row) {
      rows[row.index].units += 1;
    });
    return rows.map(function getUnits(row) { return row.units; });
  }

  function allocateMoneyByBasisPoints(totalCents, basisPoints) {
    var rows = basisPoints.map(function allocationRow(points, index) {
      var product = totalCents * BigInt(points);
      return { index: index, cents: product / 10000n, remainder: product % 10000n };
    });
    var used = rows.reduce(function sumCents(sumValue, row) { return sumValue + row.cents; }, 0n);
    var missing = Number(totalCents - used);
    rows.slice().sort(function compareRemainder(left, right) {
      if (left.remainder === right.remainder) return left.index - right.index;
      return left.remainder > right.remainder ? -1 : 1;
    }).slice(0, missing).forEach(function addCent(row) {
      rows[row.index].cents += 1n;
    });
    return rows.map(function rowCents(row) { return row.cents; });
  }

  function calculateDesignPayments(totalDesignFee) {
    var profile = source.templates.DESIGN.paymentProfiles.designFee;
    var totalCents = parseMoney(totalDesignFee, "TOTAL_DESIGN_FEE");
    if (totalCents <= 0n) fail("TOTAL_DESIGN_FEE_MUST_BE_POSITIVE", {});
    var basisPoints = profile.stages.map(function stagePoints(stage) { return stage.rate * 100; });
    var amounts = allocateMoneyByBasisPoints(totalCents, basisPoints);
    return deepFreeze({
      amountField: profile.amountField,
      totalAmount: formatMoney(totalCents),
      totalRate: profile.totalRate,
      stages: profile.stages.map(function buildStage(stage, index) {
        return {
          stageId: stage.stageId,
          trigger: stage.trigger,
          rate: stage.rate,
          amount: formatMoney(amounts[index]),
          state: "PENDING_OWNER_DECISION",
        };
      }),
    });
  }

  function nodeIssues(node) {
    var issues = [];
    if (!isPlainObject(node)) return [{ code: "INVALID_SCHEDULE_NODE_SHAPE", nodeId: null }];
    var checks = [
      ["nodeId", "MISSING_SCHEDULE_NODE_ID"],
      ["name", "MISSING_SCHEDULE_NODE_NAME"],
      ["scheduleSemantic", "MISSING_SCHEDULE_SEMANTICS"],
      ["startAt", "MISSING_SCHEDULE_START"],
      ["dueAt", "MISSING_SCHEDULE_DUE"],
      ["workItems", "MISSING_WORK_ITEMS"],
      ["quotationRefs", "MISSING_QUOTATION_REFS"],
      ["drawingRefs", "MISSING_DRAWING_REFS"],
      ["workValue", "MISSING_QUOTATION_WORK_VALUE"],
      ["requiredEvidence", "MISSING_REQUIRED_EVIDENCE"],
    ];
    checks.forEach(function inspect(check) {
      if (!isPresent(node[check[0]])) issues.push({ code: check[1], nodeId: node.nodeId || null, field: check[0] });
    });
    if (!identifierIsValid(node.nodeId)) {
      issues.push({ code: "INVALID_SCHEDULE_NODE_ID", nodeId: node.nodeId || null });
    }
    if (typeof node.name !== "string" || !node.name.trim()) {
      issues.push({ code: "INVALID_SCHEDULE_NODE_NAME", nodeId: node.nodeId || null });
    }
    if (!identifierIsValid(node.scheduleSemantic)) {
      issues.push({ code: "INVALID_SCHEDULE_SEMANTICS", nodeId: node.nodeId || null });
    }
    if (Array.isArray(node.workItems)) {
      node.workItems.forEach(function validateWorkItem(workItem, index) {
        var validWorkItem = identifierIsValid(workItem) ||
          (isPlainObject(workItem) && identifierIsValid(workItem.workItemId));
        if (!validWorkItem) issues.push({ code: "INVALID_WORK_ITEM_REF", nodeId: node.nodeId || null, index: index });
      });
    } else if (isPresent(node.workItems)) {
      issues.push({ code: "INVALID_WORK_ITEM_REF", nodeId: node.nodeId || null });
    }
    if (typeof node.holdPoint !== "boolean") {
      issues.push({ code: "MISSING_HOLD_POINT_DECLARATION", nodeId: node.nodeId || null, field: "holdPoint" });
    }
    if (Array.isArray(node.quotationRefs)) {
      node.quotationRefs.forEach(function validateQuotationRef(ref, index) {
        if (!isPlainObject(ref) || !identifierIsValid(ref.quotationId) || !identifierIsValid(ref.version) ||
            !identifierIsValid(ref.itemId) || !isPresent(ref.allocation)) {
          issues.push({ code: "INVALID_QUOTATION_REF", nodeId: node.nodeId || null, index: index });
          return;
        }
        try {
          if (parseMoney(ref.allocation, "quotationRefs.allocation") <= 0n) {
            issues.push({ code: "QUOTATION_ALLOCATION_MUST_BE_POSITIVE", nodeId: node.nodeId || null, index: index });
          }
        } catch (error) {
          issues.push({ code: "INVALID_QUOTATION_REF", nodeId: node.nodeId || null, index: index });
        }
      });
    } else if (isPresent(node.quotationRefs)) {
      issues.push({ code: "INVALID_QUOTATION_REF", nodeId: node.nodeId || null });
    }
    if (Array.isArray(node.drawingRefs)) {
      node.drawingRefs.forEach(function validateDrawingRef(ref, index) {
        if (!isPlainObject(ref) || !identifierIsValid(ref.drawingId) || !identifierIsValid(ref.version) ||
            (ref.sheetId !== undefined && !identifierIsValid(ref.sheetId))) {
          issues.push({ code: "INVALID_DRAWING_REF", nodeId: node.nodeId || null, index: index });
        }
      });
    } else if (isPresent(node.drawingRefs)) {
      issues.push({ code: "INVALID_DRAWING_REF", nodeId: node.nodeId || null });
    }
    if (Array.isArray(node.requiredEvidence)) {
      node.requiredEvidence.forEach(function validateEvidence(requirement, index) {
        if (!isPlainObject(requirement) || !identifierIsValid(requirement.evidenceType)) {
          issues.push({ code: "INVALID_EVIDENCE_REQUIREMENT", nodeId: node.nodeId || null, index: index });
        }
        if (!isPlainObject(requirement) || !evidenceBasisIsValid(requirement.basisRef)) {
          issues.push({ code: "EVIDENCE_BASIS_REQUIRED", nodeId: node.nodeId || null, index: index });
        }
      });
    } else if (isPresent(node.requiredEvidence)) {
      issues.push({ code: "INVALID_EVIDENCE_REQUIREMENT", nodeId: node.nodeId || null });
    }
    if (isPresent(node.workValue)) {
      try {
        if (parseMoney(node.workValue, "workValue") <= 0n) {
          issues.push({ code: "NODE_WORK_VALUE_MUST_BE_POSITIVE", nodeId: node.nodeId || null });
        }
      } catch (error) {
        issues.push({ code: "INVALID_NODE_WORK_VALUE", nodeId: node.nodeId || null });
      }
    }
    if (node.startAt && node.dueAt) {
      var startTime;
      var dueTime;
      try {
        startTime = isoDateTimeMillis(node.startAt, "startAt");
        dueTime = isoDateTimeMillis(node.dueAt, "dueAt");
      } catch (error) {
        startTime = NaN;
        dueTime = NaN;
      }
      if (!Number.isFinite(startTime) || !Number.isFinite(dueTime) || startTime > dueTime) {
        issues.push({ code: "INVALID_SCHEDULE_DATE_RANGE", nodeId: node.nodeId || null });
      }
    }
    return issues;
  }

  function proceduralFailure(issues) {
    return deepFreeze({ ok: false, status: "PROCEDURAL_INCOMPLETE", issues: issues });
  }

  function collectScheduleNodes(nodes, collected) {
    (nodes || []).forEach(function collectNode(node) {
      collected.push(node);
      if (isPlainObject(node) && Array.isArray(node.children)) collectScheduleNodes(node.children, collected);
    });
    return collected;
  }

  function validateQuotationBoundary(quotation, projectTotalCents) {
    var issues = [];
    var itemMap = new Map();
    var quotationTotalCents = null;
    if (!isPlainObject(quotation)) {
      return { issues: [{ code: "MISSING_CANONICAL_QUOTATION", field: "quotation" }], itemMap: itemMap, totalCents: null };
    }
    if (!identifierIsValid(quotation.quotationId) || !identifierIsValid(quotation.version)) {
      issues.push({ code: "INVALID_CANONICAL_QUOTATION_IDENTITY" });
    }
    try {
      quotationTotalCents = parseMoney(quotation.total, "quotation.total");
      if (quotationTotalCents <= 0n) issues.push({ code: "QUOTATION_TOTAL_MUST_BE_POSITIVE" });
    } catch (error) {
      issues.push({ code: error.code, field: "quotation.total" });
    }
    if (quotationTotalCents !== null && projectTotalCents !== null && quotationTotalCents !== projectTotalCents) {
      issues.push({ code: "PROJECT_TOTAL_QUOTATION_TOTAL_MISMATCH" });
    }
    if (!Array.isArray(quotation.items) || quotation.items.length === 0) {
      issues.push({ code: "MISSING_CANONICAL_QUOTATION_ITEMS" });
      return { issues: issues, itemMap: itemMap, totalCents: quotationTotalCents };
    }
    var itemTotal = 0n;
    quotation.items.forEach(function validateQuotationItem(item, index) {
      if (!isPlainObject(item) || !identifierIsValid(item.itemId)) {
        issues.push({ code: "INVALID_QUOTATION_ITEM", index: index });
        return;
      }
      if (itemMap.has(item.itemId)) {
        issues.push({ code: "DUPLICATE_QUOTATION_ITEM_ID", itemId: item.itemId });
        return;
      }
      try {
        var amount = parseMoney(item.amount, "quotation.items.amount");
        if (amount <= 0n) {
          issues.push({ code: "QUOTATION_ITEM_AMOUNT_MUST_BE_POSITIVE", itemId: item.itemId });
          return;
        }
        itemMap.set(item.itemId, { item: clone(item), amount: amount });
        itemTotal += amount;
      } catch (error) {
        issues.push({ code: error.code, itemId: item.itemId });
      }
    });
    if (quotationTotalCents !== null && itemTotal !== quotationTotalCents) {
      issues.push({ code: "QUOTATION_ITEMS_TOTAL_MISMATCH" });
    }
    return { issues: issues, itemMap: itemMap, totalCents: quotationTotalCents };
  }

  function validateExpandedQuotationAllocations(nodes, quotation, itemMap, quotationTotalCents) {
    var issues = [];
    var allocatedItems = new Set();
    var allocatedTotal = 0n;
    nodes.forEach(function validateNodeAllocation(node) {
      var nodeValue;
      try {
        nodeValue = parseMoney(node.workValue, "workValue");
        if (nodeValue <= 0n) {
          issues.push({ code: "NODE_WORK_VALUE_MUST_BE_POSITIVE", nodeId: node.nodeId });
          return;
        }
      } catch (error) {
        issues.push({ code: error.code, nodeId: node.nodeId });
        return;
      }
      var nodeAllocation = 0n;
      node.quotationRefs.forEach(function validateAllocation(ref) {
        if (ref.quotationId !== quotation.quotationId || ref.version !== quotation.version) {
          issues.push({ code: "QUOTATION_REF_IDENTITY_MISMATCH", nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        var canonicalItem = itemMap.get(ref.itemId);
        if (!itemMap.has(ref.itemId)) {
          issues.push({ code: "UNKNOWN_QUOTATION_ITEM_REF", nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        if (allocatedItems.has(ref.itemId)) {
          issues.push({ code: "DUPLICATE_QUOTATION_ITEM_ALLOCATION", nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        var allocation;
        try {
          allocation = parseMoney(ref.allocation, "quotationRefs.allocation");
        } catch (error) {
          issues.push({ code: error.code, nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        if (allocation <= 0n) {
          issues.push({ code: "QUOTATION_ALLOCATION_MUST_BE_POSITIVE", nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        if (allocation !== canonicalItem.amount) {
          issues.push({ code: "QUOTATION_ITEM_ALLOCATION_MISMATCH", nodeId: node.nodeId, itemId: ref.itemId });
          return;
        }
        allocatedItems.add(ref.itemId);
        nodeAllocation += allocation;
        allocatedTotal += allocation;
      });
      if (nodeAllocation !== nodeValue) {
        issues.push({ code: "NODE_WORK_VALUE_ALLOCATION_MISMATCH", nodeId: node.nodeId });
      }
    });
    Array.from(itemMap.keys()).forEach(function requireAllocatedItem(itemId) {
      if (!allocatedItems.has(itemId)) issues.push({ code: "UNALLOCATED_QUOTATION_ITEM", itemId: itemId });
    });
    if (quotationTotalCents !== null && allocatedTotal !== quotationTotalCents) {
      issues.push({ code: "QUOTATION_ALLOCATION_TOTAL_MISMATCH" });
    }
    return issues;
  }

  function validateSemanticChildren(node, quotation, quotationBoundary) {
    if (!Array.isArray(node.children) || node.children.length === 0) return [];
    var issues = [];
    var childSemantics = new Set();
    var parentStart = isoDateTimeMillis(node.startAt, "startAt");
    var parentDue = isoDateTimeMillis(node.dueAt, "dueAt");
    node.children.forEach(function validateChild(child) {
      issues = issues.concat(nodeIssues(child));
      if (childSemantics.has(child.scheduleSemantic)) {
        issues.push({ code: "DUPLICATE_CHILD_SCHEDULE_SEMANTIC", nodeId: node.nodeId, scheduleSemantic: child.scheduleSemantic });
      }
      childSemantics.add(child.scheduleSemantic);
      try {
        var childStart = isoDateTimeMillis(child.startAt, "startAt");
        var childDue = isoDateTimeMillis(child.dueAt, "dueAt");
        if (childStart < parentStart || childDue > parentDue) {
          issues.push({ code: "CHILD_DATE_OUTSIDE_PARENT_RANGE", nodeId: child.nodeId, parentNodeId: node.nodeId });
        }
      } catch (error) {
        issues.push({ code: "CHILD_DATE_OUTSIDE_PARENT_RANGE", nodeId: child.nodeId, parentNodeId: node.nodeId });
      }
    });
    var parentQuotationPartition = new Map();
    var childQuotationPartition = new Map();
    try {
      node.quotationRefs.forEach(function collectParentRef(ref) {
        var parentKey = ref.quotationId + "|" + ref.version + "|" + ref.itemId;
        var canonicalParentItem = quotationBoundary.itemMap.get(ref.itemId);
        var parentAllocation = parseMoney(ref.allocation, "quotationRefs.allocation");
        if (parentQuotationPartition.has(parentKey) || ref.quotationId !== quotation.quotationId ||
            ref.version !== quotation.version || !canonicalParentItem || parentAllocation !== canonicalParentItem.amount) {
          issues.push({ code: "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH", nodeId: node.nodeId });
        }
        parentQuotationPartition.set(parentKey, parentAllocation);
      });
      node.children.forEach(function collectChildRefs(child) {
        child.quotationRefs.forEach(function collectChildRef(ref) {
          var childKey = ref.quotationId + "|" + ref.version + "|" + ref.itemId;
          if (childQuotationPartition.has(childKey)) {
            issues.push({ code: "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH", nodeId: node.nodeId });
          }
          childQuotationPartition.set(childKey, parseMoney(ref.allocation, "quotationRefs.allocation"));
        });
      });
      var parentKeys = Array.from(parentQuotationPartition.keys()).sort();
      var childKeys = Array.from(childQuotationPartition.keys()).sort();
      if (!canonicalValuesEqual(parentKeys, childKeys) || parentKeys.some(function partitionAmountMismatch(key) {
        return parentQuotationPartition.get(key) !== childQuotationPartition.get(key);
      })) {
        issues.push({ code: "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH", nodeId: node.nodeId });
      }
    } catch (error) {
      issues.push({ code: "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH", nodeId: node.nodeId });
    }
    try {
      var childTotal = node.children.reduce(function childSum(sumValue, child) {
        return sumValue + parseMoney(child.workValue, "workValue");
      }, 0n);
      if (childTotal !== parseMoney(node.workValue, "workValue")) {
        issues.push({
          code: "CHILD_WORK_VALUE_MUST_EQUAL_PARENT_WORK_VALUE",
          nodeId: node.nodeId,
          nextAction: "ALIGN_CHILD_QUOTATION_WORK_VALUES_WITH_PARENT",
        });
      }
    } catch (error) {
      issues.push({ code: error.code || "INVALID_NODE_WORK_VALUE", nodeId: node.nodeId });
    }
    return issues;
  }

  function generateWorksMilestones(input) {
    input = input || {};
    var schedule = input.schedule;
    var initialIssues = [];
    if (!identifierIsValid(input.caseId)) initialIssues.push({ code: "MISSING_CASE_ID", field: "caseId" });
    if (!schedule || !identifierIsValid(schedule.scheduleId) || !identifierIsValid(schedule.version) || !Array.isArray(schedule.nodes) || schedule.nodes.length === 0) {
      initialIssues.push({ code: "MISSING_CONSTRUCTION_SCHEDULE", field: "schedule" });
    }
    var totalCents;
    try {
      totalCents = parseMoney(input.projectTotalAmount, "PROJECT_TOTAL_AMOUNT");
      if (totalCents <= 0n) initialIssues.push({ code: "PROJECT_TOTAL_AMOUNT_MUST_BE_POSITIVE", field: "projectTotalAmount" });
    } catch (error) {
      if (!(error instanceof EngineValidationError)) throw error;
      initialIssues.push({ code: error.code, field: error.details.field });
    }
    var quotationBoundary = validateQuotationBoundary(input.quotation, totalCents === undefined ? null : totalCents);
    initialIssues = initialIssues.concat(quotationBoundary.issues);
    if (initialIssues.length) return proceduralFailure(initialIssues);

    var topNodes = schedule.nodes.map(clone);
    var allNodes = collectScheduleNodes(topNodes, []);
    var allNodeIssues = [];
    var nodeIds = new Set();
    allNodes.forEach(function validateTopNode(node) {
      allNodeIssues = allNodeIssues.concat(nodeIssues(node));
      if (!identifierIsValid(node.nodeId)) {
        allNodeIssues.push({ code: "INVALID_SCHEDULE_NODE_ID", nodeId: node.nodeId || null });
      } else if (nodeIds.has(node.nodeId)) {
        allNodeIssues.push({ code: "DUPLICATE_SCHEDULE_NODE_ID", nodeId: node.nodeId });
      } else {
        nodeIds.add(node.nodeId);
      }
    });
    topNodes.forEach(function requireParentQuotationBasis(node) {
      if (Array.isArray(node.children) && node.children.length > 0 &&
          (!Array.isArray(node.quotationRefs) || node.quotationRefs.length === 0)) {
        allNodeIssues.push({ code: "PARENT_QUOTATION_BASIS_REQUIRED", nodeId: node.nodeId || null });
      }
    });
    if (allNodeIssues.length) return proceduralFailure(allNodeIssues);

    var semanticChildrenIssues = [];
    allNodes.forEach(function validateEverySemanticChildSet(node) {
      semanticChildrenIssues = semanticChildrenIssues.concat(
        validateSemanticChildren(node, input.quotation, quotationBoundary),
      );
    });
    if (semanticChildrenIssues.length) return proceduralFailure(semanticChildrenIssues);

    var topWeights;
    try {
      topWeights = topNodes.map(function topWeight(node) {
        var weight = parseMoney(node.workValue, "workValue");
        if (weight <= 0n) fail("NODE_WORK_VALUE_MUST_BE_POSITIVE", { nodeId: node.nodeId });
        return weight;
      });
    } catch (error) {
      if (!(error instanceof EngineValidationError)) throw error;
      return proceduralFailure([{ code: error.code, field: error.details.field }]);
    }
    var topRates = distributeUnits(8000, topWeights);
    var expanded = [];
    var splitIssues = [];

    topNodes.forEach(function expandNode(node, index) {
      if (topRates[index] <= 1000) {
        expanded.push(node);
        return;
      }
      if (!Array.isArray(node.children) || node.children.length === 0) {
        splitIssues.push({
          code: "PROGRESS_NODE_EXCEEDS_MAX_RATE_REQUIRES_SEMANTIC_CHILD_NODES",
          nodeId: node.nodeId,
          calculatedRate: topRates[index] / 100,
          nextAction: "PROVIDE_SCHEDULE_CHILD_NODES_WITH_QUOTATION_BASIS",
        });
        return;
      }
      node.children.forEach(function addChild(child) { expanded.push(child); });
    });
    if (splitIssues.length) return proceduralFailure(splitIssues);

    var weights = expanded.map(function expandedWeight(node) { return parseMoney(node.workValue, "workValue"); });
    var quotationIssues = validateExpandedQuotationAllocations(
      expanded,
      input.quotation,
      quotationBoundary.itemMap,
      quotationBoundary.totalCents,
    );
    if (quotationIssues.length) return proceduralFailure(quotationIssues);
    var progressBasisPoints = distributeUnits(8000, weights);
    progressBasisPoints.forEach(function inspectRate(points, index) {
      if (points > 1000) {
        splitIssues.push({
          code: "PROGRESS_NODE_EXCEEDS_MAX_RATE_REQUIRES_SEMANTIC_CHILD_NODES",
          nodeId: expanded[index].nodeId,
          calculatedRate: points / 100,
          nextAction: "PROVIDE_FINER_SCHEDULE_CHILD_NODES_WITH_QUOTATION_BASIS",
        });
      }
    });
    if (splitIssues.length) return proceduralFailure(splitIssues);

    var allBasisPoints = [500].concat(progressBasisPoints, [1500]);
    var stageAmounts = allocateMoneyByBasisPoints(totalCents, allBasisPoints);
    var milestones = expanded.map(function createMilestone(node, index) {
      return deepFreeze({
        kind: "Milestone",
        milestoneId: "MS-" + node.nodeId,
        caseId: input.caseId,
        scheduleId: schedule.scheduleId,
        scheduleVersion: schedule.version,
        scheduleNodeId: node.nodeId,
        scheduleSemantic: node.scheduleSemantic,
        name: node.name,
        startAt: node.startAt,
        dueAt: node.dueAt,
        workItems: clone(node.workItems),
        quotationRefs: clone(node.quotationRefs),
        drawingRefs: clone(node.drawingRefs),
        workValue: formatMoney(weights[index]),
        paymentRate: progressBasisPoints[index] / 100,
        rateBasisPoints: progressBasisPoints[index],
        paymentAmount: formatMoney(stageAmounts[index + 1]),
        requiredEvidence: clone(node.requiredEvidence),
        holdPoint: node.holdPoint,
        drsReviewState: "PENDING",
        ownerDecisionState: "PENDING",
        paymentState: "PENDING",
      });
    });
    var paymentStages = [{
      kind: "PaymentStage", paymentStageId: "WORKS-SIGNING", caseId: input.caseId, subjectId: input.caseId,
      stageType: "SIGNING", rate: 5, rateBasisPoints: 500, amount: formatMoney(stageAmounts[0]), currency: "TWD", state: "PENDING_OWNER_DECISION",
    }].concat(milestones.map(function progressStage(milestone, index) {
      return {
        kind: "PaymentStage", paymentStageId: "WORKS-PROGRESS-" + milestone.scheduleNodeId, caseId: input.caseId,
        subjectId: milestone.milestoneId, stageType: "PROGRESS", rate: milestone.paymentRate,
        rateBasisPoints: milestone.rateBasisPoints, amount: formatMoney(stageAmounts[index + 1]), currency: "TWD", state: "PENDING_OWNER_DECISION",
      };
    }), [{
      kind: "PaymentStage", paymentStageId: "WORKS-FINAL", caseId: input.caseId, subjectId: input.caseId,
      stageType: "FINAL", rate: 15, rateBasisPoints: 1500, amount: formatMoney(stageAmounts[stageAmounts.length - 1]),
      currency: "TWD", state: "PREREQUISITES_PENDING",
    }]);

    var generatedIds = new Set();
    milestones.forEach(function ensureMilestoneId(milestone) {
      if (generatedIds.has(milestone.milestoneId)) splitIssues.push({ code: "DUPLICATE_MILESTONE_ID", milestoneId: milestone.milestoneId });
      generatedIds.add(milestone.milestoneId);
    });
    paymentStages.forEach(function ensurePaymentStageId(stage) {
      if (generatedIds.has(stage.paymentStageId)) splitIssues.push({ code: "DUPLICATE_PAYMENT_STAGE_ID", paymentStageId: stage.paymentStageId });
      generatedIds.add(stage.paymentStageId);
    });
    if (splitIssues.length) return proceduralFailure(splitIssues);

    return deepFreeze({
      ok: true,
      status: "GENERATED",
      caseId: input.caseId,
      scheduleRef: { scheduleId: schedule.scheduleId, version: schedule.version },
      quotationRef: { quotationId: input.quotation.quotationId, version: input.quotation.version },
      projectTotalAmount: formatMoney(totalCents),
      milestones: milestones,
      paymentStages: paymentStages,
      totals: { signingRate: 5, progressRate: 80, finalRate: 15, totalRate: 100, warrantyDeposit: "NONE" },
      issues: [],
    });
  }

  function createFinalAcceptanceRecord(input) {
    input = input || {};
    requireFields("FinalAcceptanceRecord", input, [
      "acceptanceId", "caseId", "subjectId", "projectContractId", "contractVersion", "documentRef",
      "completedAt", "ownerDecision", "ownerDecisionEvidence", "ownerProof",
    ]);
    ["acceptanceId", "caseId", "subjectId", "projectContractId", "contractVersion"].forEach(function validateAcceptanceId(field) {
      requireIdentifier("FinalAcceptanceRecord", field, input[field]);
    });
    if (input.ownerDecision !== "ACCEPT") fail("FINAL_ACCEPTANCE_OWNER_DECISION_REQUIRED", {});
    validateDocumentRef(input.documentRef, "INVALID_FINAL_ACCEPTANCE_DOCUMENT_REF", {});
    validateDocumentRef(input.ownerDecisionEvidence, "INVALID_FINAL_ACCEPTANCE_DECISION_EVIDENCE", {});
    isoDateTimeMillis(input.completedAt, "completedAt");
    validatePartyProof(input.ownerProof, "OWNER", true);
    if (isoDateTimeMillis(input.completedAt, "completedAt") > isoDateTimeMillis(input.ownerProof.createdAt, "ownerProof.createdAt")) {
      fail("FINAL_ACCEPTANCE_CHRONOLOGY_INVALID", {});
    }
    var normalized = clone(input);
    normalized.kind = "FinalAcceptanceRecord";
    normalized.status = "COMPLETED";
    return deepFreeze(normalized);
  }

  function requireFinalBindingMatch(actual, expected, code) {
    if (actual.caseId !== expected.caseId || actual.subjectId !== expected.subjectId ||
        actual.projectContractId !== expected.projectContractId || actual.contractVersion !== expected.contractVersion) {
      fail(code, {});
    }
  }

  function requireEventNotBefore(eventTime, timestamps) {
    if (timestamps.some(function eventPrecedes(timestamp) { return eventTime < timestamp; })) {
      fail("FINAL_EVENT_PRECEDES_BOUND_RECORD", {});
    }
  }

  function issueFinalPaymentState(value) {
    var issued = deepFreeze(value);
    issuedFinalPaymentStates.add(issued);
    return issued;
  }

  function createFinalPaymentState(input) {
    input = input || {};
    requireFields("FinalPaymentState", input, [
      "caseId", "subjectId", "projectContractId", "contractVersion", "ownerId", "contractorId",
    ]);
    ["caseId", "subjectId", "projectContractId", "contractVersion", "ownerId", "contractorId"].forEach(function validateFinalStateId(field) {
      requireIdentifier("FinalPaymentState", field, input[field]);
    });
    if (input.ownerId === input.contractorId) fail("FINAL_PAYMENT_PARTIES_MUST_BE_DISTINCT", {});
    return issueFinalPaymentState({
      caseId: input.caseId,
      subjectId: input.subjectId,
      projectContractId: input.projectContractId,
      contractVersion: input.contractVersion,
      ownerId: input.ownerId,
      contractorId: input.contractorId,
      status: "FINAL_PREREQUISITES_PENDING",
      finalAcceptanceCompleted: false,
      finalAcceptance: null,
      warrantyPledgeSigned: false,
      warrantyPledge: null,
      review: null,
      ownerDecision: null,
      paymentAction: null,
      lastEventAt: null,
      events: [],
    });
  }

  function assertFinalPaymentStateIntegrity(current) {
    try {
      var allowedTypes = [
        "FINAL_ACCEPTANCE_COMPLETED",
        "WARRANTY_PLEDGE_SIGNED",
        "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED",
        "OWNER_DECISION_RECORDED",
        "FINAL_PAYMENT_ACTION_RECORDED",
      ];
      var eventIds = new Set();
      var typeEvents = new Map();
      var lastTime = null;
      var lastPhase = 0;
      var eventPhases = {
        FINAL_ACCEPTANCE_COMPLETED: 0,
        WARRANTY_PLEDGE_SIGNED: 0,
        DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED: 1,
        OWNER_DECISION_RECORDED: 2,
        FINAL_PAYMENT_ACTION_RECORDED: 3,
      };
      current.events.forEach(function validateHistoricalEvent(historicalEvent) {
        if (!isPlainObject(historicalEvent) || allowedTypes.indexOf(historicalEvent.type) === -1 ||
            !identifierIsValid(historicalEvent.eventId) || eventIds.has(historicalEvent.eventId) || typeEvents.has(historicalEvent.type)) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        var historicalTime = isoDateTimeMillis(historicalEvent.occurredAt, "occurredAt");
        var eventPhase = eventPhases[historicalEvent.type];
        if ((lastTime !== null && historicalTime < lastTime) || eventPhase < lastPhase) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        eventIds.add(historicalEvent.eventId);
        typeEvents.set(historicalEvent.type, historicalEvent);
        lastTime = historicalTime;
        lastPhase = eventPhase;
      });

      var acceptanceEvent = typeEvents.get("FINAL_ACCEPTANCE_COMPLETED") || null;
      var warrantyEvent = typeEvents.get("WARRANTY_PLEDGE_SIGNED") || null;
      var reviewEvent = typeEvents.get("DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED") || null;
      var decisionEvent = typeEvents.get("OWNER_DECISION_RECORDED") || null;
      var paymentEvent = typeEvents.get("FINAL_PAYMENT_ACTION_RECORDED") || null;
      var acceptance = null;
      var warrantyPledge = null;
      var review = null;
      var ownerDecision = null;

      if (acceptanceEvent) {
        acceptance = createFinalAcceptanceRecord(acceptanceEvent.acceptanceRecord);
        requireFinalBindingMatch(acceptance, current, "INVALID_FINAL_PAYMENT_STATE_INTEGRITY");
        if (acceptance.ownerProof.partyId !== current.ownerId) fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        requireEventNotBefore(isoDateTimeMillis(acceptanceEvent.occurredAt, "occurredAt"), [
          isoDateTimeMillis(acceptance.completedAt, "completedAt"),
          isoDateTimeMillis(acceptance.ownerProof.createdAt, "ownerProof.createdAt"),
        ]);
      }
      if (warrantyEvent) {
        warrantyPledge = createWarrantyPledge(warrantyEvent.warrantyPledge);
        if (warrantyPledge.caseId !== current.caseId || warrantyPledge.projectContractId !== current.projectContractId ||
            warrantyPledge.contractVersion !== current.contractVersion || warrantyPledge.signingProof.partyId !== current.contractorId) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        requireEventNotBefore(isoDateTimeMillis(warrantyEvent.occurredAt, "occurredAt"), [
          isoDateTimeMillis(warrantyPledge.signingProof.createdAt, "signingProof.createdAt"),
        ]);
      }
      if (reviewEvent) {
        if (!acceptanceEvent || !warrantyEvent) fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        review = createDomain("DRSReview", reviewEvent.review);
        if (review.caseId !== current.caseId || review.subjectId !== current.subjectId ||
            review.status !== "READY_FOR_OWNER_DECISION") {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        var prerequisiteEffectiveTime = Math.max(
          isoDateTimeMillis(acceptance.completedAt, "completedAt"),
          isoDateTimeMillis(acceptance.ownerProof.createdAt, "ownerProof.createdAt"),
          isoDateTimeMillis(warrantyPledge.signingProof.createdAt, "signingProof.createdAt"),
        );
        if (isoDateTimeMillis(review.createdAt, "review.createdAt") < prerequisiteEffectiveTime) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        requireEventNotBefore(isoDateTimeMillis(reviewEvent.occurredAt, "occurredAt"), [
          isoDateTimeMillis(review.createdAt, "review.createdAt"),
        ]);
      }
      if (decisionEvent) {
        if (!reviewEvent) fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        ownerDecision = createDomain("OwnerDecision", decisionEvent.ownerDecision);
        if (ownerDecision.caseId !== current.caseId || ownerDecision.subjectId !== current.subjectId ||
            ownerDecision.ownerId !== current.ownerId || ownerDecision.reviewId !== review.reviewId ||
            ownerDecision.reviewVersion !== review.reviewVersion ||
            !canonicalValuesEqual(ownerDecision.review, review)) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
        requireEventNotBefore(isoDateTimeMillis(decisionEvent.occurredAt, "occurredAt"), [
          isoDateTimeMillis(ownerDecision.createdAt, "ownerDecision.createdAt"),
        ]);
      }
      if (paymentEvent) {
        if (!decisionEvent || ownerDecision.decision !== "APPROVE" || paymentEvent.actorId !== current.ownerId) {
          fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
        }
      }

      if (current.finalAcceptanceCompleted !== Boolean(acceptanceEvent) ||
          current.warrantyPledgeSigned !== Boolean(warrantyEvent) ||
          !canonicalValuesEqual(current.finalAcceptance, acceptance) ||
          !canonicalValuesEqual(current.warrantyPledge, warrantyPledge) ||
          !canonicalValuesEqual(current.review, review) ||
          !canonicalValuesEqual(current.ownerDecision, ownerDecision) ||
          !canonicalValuesEqual(current.paymentAction, paymentEvent)) {
        fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
      }
      var expectedStatus = paymentEvent
        ? "FINAL_PAYMENT_ACTION"
        : (decisionEvent
          ? (ownerDecision.decision === "APPROVE" ? "FINAL_PAYMENT_APPROVED" : "FINAL_PAYMENT_OWNER_DECISION_RECORDED")
          : (reviewEvent ? "FINAL_PAYMENT_READY_FOR_OWNER_DECISION" : "FINAL_PREREQUISITES_PENDING"));
      var expectedLastEventAt = current.events.length ? current.events[current.events.length - 1].occurredAt : null;
      if (current.status !== expectedStatus || current.lastEventAt !== expectedLastEventAt) {
        fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", {});
      }
    } catch (error) {
      if (error && error.code === "INVALID_FINAL_PAYMENT_STATE_INTEGRITY") throw error;
      fail("INVALID_FINAL_PAYMENT_STATE_INTEGRITY", { cause: error && (error.code || error.message) });
    }
  }

  function applyFinalPaymentEvent(current, event) {
    if (!issuedFinalPaymentStates.has(current)) fail("FINAL_PAYMENT_STATE_NOT_RUNTIME_ISSUED", {});
    if (consumedFinalPaymentStates.has(current)) fail("FINAL_PAYMENT_STATE_ALREADY_CONSUMED", {});
    if (inFlightFinalPaymentStates.has(current)) fail("FINAL_PAYMENT_STATE_TRANSITION_IN_FLIGHT", {});
    inFlightFinalPaymentStates.add(current);
    try {
      return applyFinalPaymentEventOnce(current, event);
    } finally {
      inFlightFinalPaymentStates.delete(current);
    }
  }

  function applyFinalPaymentEventOnce(current, event) {
    if (!current || !Array.isArray(current.events)) fail("INVALID_FINAL_PAYMENT_STATE", {});
    requireFields("FinalPaymentState", current, [
      "caseId", "subjectId", "projectContractId", "contractVersion", "ownerId", "contractorId",
    ]);
    ["caseId", "subjectId", "projectContractId", "contractVersion", "ownerId", "contractorId"].forEach(function validateCurrentFinalStateId(field) {
      requireIdentifier("FinalPaymentState", field, current[field]);
    });
    assertFinalPaymentStateIntegrity(current);
    if (!event || typeof event !== "object") fail("INVALID_FINAL_PAYMENT_EVENT", {});
    var allowed = [
      "FINAL_ACCEPTANCE_COMPLETED",
      "WARRANTY_PLEDGE_SIGNED",
      "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED",
      "OWNER_DECISION_RECORDED",
      "FINAL_PAYMENT_ACTION_RECORDED",
    ];
    if (allowed.indexOf(event.type) === -1) fail("UNSUPPORTED_FINAL_PAYMENT_EVENT", { value: event.type });
    requireFields("FinalPaymentEvent", event, ["eventId", "occurredAt"]);
    requireIdentifier("FinalPaymentEvent", "eventId", event.eventId);
    var eventTime = isoDateTimeMillis(event.occurredAt, "occurredAt");
    if (current.events.some(function duplicateEvent(existing) { return existing.eventId === event.eventId; })) {
      fail("DUPLICATE_FINAL_PAYMENT_EVENT_ID", { eventId: event.eventId });
    }
    if (current.lastEventAt !== null && eventTime < isoDateTimeMillis(current.lastEventAt, "lastEventAt")) {
      fail("FINAL_PAYMENT_EVENT_TIME_REVERSED", { eventId: event.eventId });
    }
    var next = clone(current);
    var historyEvent = clone(event);

    if (event.type === "FINAL_ACCEPTANCE_COMPLETED") {
      if (next.finalAcceptanceCompleted || next.review) fail("ILLEGAL_FINAL_PAYMENT_EVENT_ORDER", { type: event.type });
      if (!event.acceptanceRecord) fail("FINAL_ACCEPTANCE_RECORD_REQUIRED", {});
      var acceptanceRecord = createFinalAcceptanceRecord(event.acceptanceRecord);
      requireFinalBindingMatch(acceptanceRecord, current, "FINAL_ACCEPTANCE_BINDING_MISMATCH");
      if (acceptanceRecord.ownerProof.partyId !== current.ownerId) fail("FINAL_ACCEPTANCE_BINDING_MISMATCH", {});
      requireEventNotBefore(eventTime, [
        isoDateTimeMillis(acceptanceRecord.completedAt, "completedAt"),
        isoDateTimeMillis(acceptanceRecord.ownerProof.createdAt, "ownerProof.createdAt"),
      ]);
      next.finalAcceptance = clone(acceptanceRecord);
      next.finalAcceptanceCompleted = true;
      historyEvent.acceptanceRecord = clone(acceptanceRecord);
    } else if (event.type === "WARRANTY_PLEDGE_SIGNED") {
      if (next.warrantyPledgeSigned || next.review) fail("ILLEGAL_FINAL_PAYMENT_EVENT_ORDER", { type: event.type });
      if (!event.warrantyPledge) fail("VERIFIABLE_WARRANTY_PLEDGE_REQUIRED", {});
      var warrantyPledge;
      try {
        warrantyPledge = createWarrantyPledge(event.warrantyPledge);
      } catch (error) {
        fail("VERIFIABLE_WARRANTY_PLEDGE_REQUIRED", { cause: error.code || error.message });
      }
      if (warrantyPledge.status !== "SIGNED") fail("VERIFIABLE_WARRANTY_PLEDGE_REQUIRED", {});
      if (warrantyPledge.caseId !== current.caseId || warrantyPledge.projectContractId !== current.projectContractId ||
          warrantyPledge.contractVersion !== current.contractVersion || warrantyPledge.signingProof.partyId !== current.contractorId) {
        fail("WARRANTY_PLEDGE_BINDING_MISMATCH", {});
      }
      requireEventNotBefore(eventTime, [isoDateTimeMillis(warrantyPledge.signingProof.createdAt, "signingProof.createdAt")]);
      next.warrantyPledge = clone(warrantyPledge);
      next.warrantyPledgeSigned = true;
      historyEvent.warrantyPledge = clone(warrantyPledge);
    } else if (event.type === "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED") {
      if (!next.finalAcceptanceCompleted || !next.warrantyPledgeSigned) fail("FINAL_PREREQUISITES_INCOMPLETE", {});
      if (next.review) fail("ILLEGAL_FINAL_PAYMENT_EVENT_ORDER", { type: event.type });
      if (!event.review) fail("VERIFIABLE_DRS_REVIEW_REQUIRED", {});
      var review;
      try {
        review = createDomain("DRSReview", event.review);
      } catch (error) {
        fail("VERIFIABLE_DRS_REVIEW_REQUIRED", { cause: error.code || error.message });
      }
      if (review.caseId !== current.caseId || review.subjectId !== current.subjectId) {
        fail("FINAL_REVIEW_BINDING_MISMATCH", {});
      }
      if (review.status !== "READY_FOR_OWNER_DECISION") fail("DRS_REVIEW_NOT_READY_FOR_OWNER_DECISION", {});
      var finalPrerequisiteEffectiveTime = Math.max(
        isoDateTimeMillis(next.finalAcceptance.completedAt, "completedAt"),
        isoDateTimeMillis(next.finalAcceptance.ownerProof.createdAt, "ownerProof.createdAt"),
        isoDateTimeMillis(next.warrantyPledge.signingProof.createdAt, "signingProof.createdAt"),
      );
      if (isoDateTimeMillis(review.createdAt, "review.createdAt") < finalPrerequisiteEffectiveTime) {
        fail("FINAL_REVIEW_PRECEDES_PREREQUISITE_RECORDS", {});
      }
      requireEventNotBefore(eventTime, [isoDateTimeMillis(review.createdAt, "review.createdAt")]);
      next.review = clone(review);
      historyEvent.review = clone(review);
      next.status = "FINAL_PAYMENT_READY_FOR_OWNER_DECISION";
    } else if (event.type === "OWNER_DECISION_RECORDED") {
      if (!next.review || next.status !== "FINAL_PAYMENT_READY_FOR_OWNER_DECISION") fail("FINAL_PAYMENT_NOT_READY_FOR_OWNER_DECISION", {});
      if (next.ownerDecision) fail("ILLEGAL_FINAL_PAYMENT_EVENT_ORDER", { type: event.type });
      if (!event.ownerDecision) fail("VERIFIABLE_OWNER_DECISION_REQUIRED", {});
      var ownerDecision;
      try {
        ownerDecision = createDomain("OwnerDecision", event.ownerDecision);
      } catch (error) {
        fail("VERIFIABLE_OWNER_DECISION_REQUIRED", { cause: error.code || error.message });
      }
      if (ownerDecision.caseId !== current.caseId || ownerDecision.subjectId !== current.subjectId ||
          ownerDecision.ownerId !== current.ownerId || ownerDecision.reviewId !== next.review.reviewId ||
          ownerDecision.reviewVersion !== next.review.reviewVersion ||
          canonicalSerialize(ownerDecision.review) !== canonicalSerialize(next.review)) {
        fail("FINAL_OWNER_DECISION_BINDING_MISMATCH", {});
      }
      requireEventNotBefore(eventTime, [isoDateTimeMillis(ownerDecision.createdAt, "ownerDecision.createdAt")]);
      next.ownerDecision = clone(ownerDecision);
      historyEvent.ownerDecision = clone(ownerDecision);
      next.status = ownerDecision.decision === "APPROVE" ? "FINAL_PAYMENT_APPROVED" : "FINAL_PAYMENT_OWNER_DECISION_RECORDED";
    } else {
      if (next.status !== "FINAL_PAYMENT_APPROVED" || !next.ownerDecision || next.ownerDecision.decision !== "APPROVE") {
        fail("EXPLICIT_OWNER_APPROVAL_REQUIRED", {});
      }
      requireFields("FinalPaymentEvent", event, ["eventId", "actorId", "occurredAt"]);
      requireIdentifier("FinalPaymentEvent", "actorId", event.actorId);
      if (event.actorId !== current.ownerId) fail("FINAL_PAYMENT_ACTION_OWNER_REQUIRED", {});
      requireEventNotBefore(eventTime, [isoDateTimeMillis(next.ownerDecision.createdAt, "ownerDecision.createdAt")]);
      next.paymentAction = clone(event);
      next.status = "FINAL_PAYMENT_ACTION";
    }
    next.events.push(historyEvent);
    next.lastEventAt = event.occurredAt;
    var successor = issueFinalPaymentState(next);
    consumedFinalPaymentStates.add(current);
    return successor;
  }

  function restoreFinalPaymentState() {
    return deepFreeze({
      ok: false,
      status: "NOT_YET_IMPLEMENTED",
      issue: "DURABLE_FINAL_PAYMENT_STATE_RESTORE_ADAPTER_NOT_IMPLEMENTED",
    });
  }

  function createDesignBuildPaymentProfiles(input) {
    input = input || {};
    var designFee = formatMoney(parseMoney(input.designFee, "TOTAL_DESIGN_FEE"));
    var worksAmount = formatMoney(parseMoney(input.worksAmount, "PROJECT_TOTAL_AMOUNT"));
    if (parseMoney(worksAmount, "PROJECT_TOTAL_AMOUNT") <= 0n) fail("PROJECT_TOTAL_AMOUNT_MUST_BE_POSITIVE", {});
    return deepFreeze({
      design: { designFee: designFee, profile: calculateDesignPayments(designFee) },
      works: {
        worksAmount: worksAmount,
        policyRef: source.templates.DESIGN_BUILD.paymentProfiles.worksAmount,
      },
    });
  }

  function evaluateDesignBuildReleaseGate(input) {
    input = input || {};
    var missing = DESIGN_BUILD_RELEASE_CONDITIONS.filter(function missingCondition(condition) {
      if (condition === "OWNER_DECISION") return input[condition] !== "CONSTRUCTION_RELEASE";
      return input[condition] !== true;
    });
    return deepFreeze({
      released: missing.length === 0,
      status: missing.length === 0 ? "CONSTRUCTION_RELEASE" : "CONSTRUCTION_RELEASE_BLOCKED",
      missingConditions: missing,
      sourceGateRef: source.templates.DESIGN_BUILD.designToConstructionGate,
    });
  }

  function createEarlyConstructionOverride(input) {
    input = input || {};
    requireFields("EarlyConstructionOverride", input, [
      "overrideId", "caseId", "ownerId", "contractorId", "missingConditions", "scope", "risks", "originalReview",
      "ownerProof", "contractorProof", "createdAt",
    ]);
    ["overrideId", "caseId", "ownerId", "contractorId"].forEach(function validateEarlyOverrideId(field) {
      requireIdentifier("EarlyConstructionOverride", field, input[field]);
    });
    if (!Array.isArray(input.missingConditions) || !input.missingConditions.length ||
        !input.missingConditions.every(identifierIsValid) ||
        !Array.isArray(input.scope) || !input.scope.length ||
        !input.scope.every(function validScope(value) { return typeof value === "string" && Boolean(value.trim()); }) ||
        !Array.isArray(input.risks) || !input.risks.length ||
        !input.risks.every(function validRisk(value) { return typeof value === "string" && Boolean(value.trim()); })) {
      fail("INVALID_EARLY_OVERRIDE_CONTENT", {});
    }
    requireBilateralProofs(input.ownerProof, input.contractorProof);
    if (input.ownerProof.partyId !== input.ownerId || input.contractorProof.partyId !== input.contractorId) {
      fail("EARLY_OVERRIDE_PROOF_PARTY_MISMATCH", {});
    }
    var normalizedReview;
    try {
      normalizedReview = createDomain("DRSReview", input.originalReview);
    } catch (error) {
      fail("INVALID_EARLY_OVERRIDE_REVIEW", { cause: error.code || error.message });
    }
    if (normalizedReview.caseId !== input.caseId) fail("INVALID_EARLY_OVERRIDE_REVIEW", {});
    var createdTime = isoDateTimeMillis(input.createdAt, "createdAt");
    if (createdTime < Math.max(
      isoDateTimeMillis(normalizedReview.createdAt, "originalReview.createdAt"),
      isoDateTimeMillis(input.ownerProof.createdAt, "ownerProof.createdAt"),
      isoDateTimeMillis(input.contractorProof.createdAt, "contractorProof.createdAt"),
    )) {
      fail("EARLY_OVERRIDE_CHRONOLOGY_INVALID", {});
    }
    return deepFreeze({
      kind: "OwnerEarlyConstructionOverride",
      status: "OWNER_EARLY_CONSTRUCTION_OVERRIDE",
      overrideId: input.overrideId,
      caseId: input.caseId,
      ownerId: input.ownerId,
      contractorId: input.contractorId,
      missingConditions: clone(input.missingConditions),
      scope: clone(input.scope),
      risks: clone(input.risks),
      originalReview: clone(normalizedReview),
      reviewStatePreserved: true,
      ownerProof: clone(input.ownerProof),
      contractorProof: clone(input.contractorProof),
      createdAt: input.createdAt,
      constructionReleaseState: "SEPARATE_OWNER_OVERRIDE_RECORDED",
    });
  }

  function createOwnerOverride(input) {
    input = input || {};
    requireFields("OwnerOverride", input, [
      "decisionId", "caseId", "reviewId", "reviewVersion", "subjectId", "ownerId", "decision",
      "reason", "evidence", "createdAt", "originalReview",
    ]);
    if (input.decision !== "OWNER_OVERRIDE") fail("OWNER_OVERRIDE_DECISION_REQUIRED", {});
    var decisionInput = clone(input);
    decisionInput.review = clone(input.originalReview);
    var decision = createDomain("OwnerDecision", decisionInput);
    var copy = clone(decision);
    copy.kind = "OwnerOverride";
    copy.originalReview = clone(input.originalReview);
    copy.originalReviewPreserved = true;
    return deepFreeze(copy);
  }

  function createPartyAgreement(input) {
    input = input || {};
    return createDomain("PartyAgreement", input);
  }

  function createDraftChangeOrder(input) {
    input = input || {};
    requireFields("DraftChangeOrder", input, [
      "changeOrderId", "caseId", "changeRequestId", "reason", "baselineIdentity", "amountImpact",
      "scheduleImpact", "versionImpact", "paymentImpacts",
    ]);
    return createDomain("ChangeOrder", {
      changeOrderId: input.changeOrderId,
      caseId: input.caseId,
      changeType: "CHANGE_ORDER",
      changeRequestId: input.changeRequestId,
      baselineVersion: input.baselineIdentity.versionId,
      reason: input.reason,
      amountImpact: input.amountImpact,
      scheduleImpact: input.scheduleImpact,
      versionImpact: input.versionImpact,
      paymentImpacts: input.paymentImpacts,
      baselineIdentity: input.baselineIdentity,
      status: "DRAFT",
      partyConfirmationStatus: "PENDING_BILATERAL_CONFIRMATION",
    });
  }

  function createChangeOrder(input) {
    input = input || {};
    requireBilateralProofs(input.ownerProof, input.contractorProof);
    fail("FORMAL_CHANGE_ORDER_NOT_YET_IMPLEMENTED", {
      requiredBoundary: "VERIFIED_BILATERAL_SIGNED_CONTRACT_SNAPSHOT_ADAPTER",
    });
  }

  function createWarrantyPledge(input) {
    var pledge = createDomain("WarrantyPledge", input);
    var copy = clone(pledge);
    copy.warrantyDeposit = "NONE";
    return deepFreeze(copy);
  }

  function createFallbackRecord(input) {
    input = input || {};
    requireFields("FallbackRecord", input, [
      "fallbackRecordId", "caseId", "projectContractId", "channel", "action", "actorId", "createdAt",
    ]);
    requireIdentifier("FallbackRecord", "fallbackRecordId", input.fallbackRecordId);
    requireIdentifier("FallbackRecord", "caseId", input.caseId);
    requireIdentifier("FallbackRecord", "projectContractId", input.projectContractId);
    requireIdentifier("FallbackRecord", "actorId", input.actorId);
    isoDateTimeMillis(input.createdAt, "createdAt");
    return deepFreeze({
      kind: "FallbackRecord",
      fallbackRecordId: input.fallbackRecordId,
      caseId: input.caseId,
      projectContractId: input.projectContractId,
      channel: input.channel,
      action: input.action,
      actorId: input.actorId,
      createdAt: input.createdAt,
      partyContractState: "PRESERVED",
      paymentState: "UNCHANGED",
      backfillStatus: "BACKFILLED_CASE_EVENT_PENDING",
    });
  }

  function canonicalSerialize(value) {
    var normalized = clone(value);
    function encode(current) {
      if (current === null) return "null";
      if (typeof current === "string" || typeof current === "boolean") return JSON.stringify(current);
      if (typeof current === "number") {
        if (!Number.isFinite(current)) fail("NON_CANONICAL_NUMBER", {});
        return JSON.stringify(current);
      }
      if (Array.isArray(current)) return "[" + current.map(encode).join(",") + "]";
      if (isPlainObject(current)) {
        return "{" + Object.keys(current).sort().map(function encodeProperty(key) {
          return JSON.stringify(key) + ":" + encode(current[key]);
        }).join(",") + "}";
      }
      fail("NON_CANONICAL_VALUE", {});
    }
    return encode(normalized);
  }

  function bytesToHex(bytes) {
    return Array.prototype.map.call(bytes, function byteToHex(byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  async function sha256(value) {
    var text = typeof value === "string" ? value : canonicalSerialize(value);
    if (nodeCrypto && typeof nodeCrypto.createHash === "function") {
      return nodeCrypto.createHash("sha256").update(text, "utf8").digest("hex");
    }
    if (root.crypto && root.crypto.subtle && typeof root.TextEncoder === "function") {
      var digest = await root.crypto.subtle.digest("SHA-256", new root.TextEncoder().encode(text));
      return bytesToHex(new Uint8Array(digest));
    }
    fail("SHA256_RUNTIME_UNAVAILABLE", {});
  }

  async function createDraftVersion(input) {
    input = input || {};
    requireFields("ContractVersion", input, [
      "contractId", "versionId", "createdAt", "createdBy", "changeSummary", "structuredContent",
    ]);
    requireIdentifier("ContractVersion", "contractId", input.contractId);
    requireIdentifier("ContractVersion", "versionId", input.versionId);
    requireIdentifier("ContractVersion", "createdBy", input.createdBy);
    if (input.parentVersionId !== undefined && input.parentVersionId !== null) {
      requireIdentifier("ContractVersion", "parentVersionId", input.parentVersionId);
    }
    isoDateTimeMillis(input.createdAt, "createdAt");
    var structuredContent = frozenClone(input.structuredContent);
    var identityPayload = {
      contractId: input.contractId,
      versionId: input.versionId,
      parentVersionId: input.parentVersionId || null,
      createdAt: input.createdAt,
      createdBy: input.createdBy,
      changeSummary: input.changeSummary,
      structuredContent: structuredContent,
      status: "DRAFT",
      signatureStatus: "NOT_SIGNED",
    };
    var identity = await sha256(canonicalSerialize(identityPayload));
    identityPayload.sha256 = identity;
    identityPayload.kind = "ContractVersion";
    return deepFreeze(identityPayload);
  }

  async function createSignedSnapshot(input) {
    var draft = input && input.draftVersion;
    return deepFreeze({
      ok: false,
      status: "NOT_YET_IMPLEMENTED",
      signatureStatus: "NOT_SIGNED",
      draftVersionId: draft && draft.versionId ? draft.versionId : null,
      issue: "VERIFIED_BILATERAL_SIGNING_ADAPTER_NOT_IMPLEMENTED",
    });
  }

  function issueCaseEventHistory(caseId, events) {
    var history = deepFreeze(events.slice());
    issuedCaseEventHistories.add(history);
    caseEventHistoryCaseIds.set(history, caseId);
    return history;
  }

  function createCaseEventHistory(caseId) {
    requireIdentifier("CaseEventHistory", "caseId", caseId);
    return issueCaseEventHistory(caseId, []);
  }

  function normalizeCaseEventHistory(events, expectedCaseId) {
    var eventIds = new Set();
    var lastOccurredAt = null;
    var normalizedEvents = events.map(function normalizeExistingCaseEvent(existing) {
      var normalized = createDomain("CaseEvent", existing);
      if (normalized.caseId !== expectedCaseId) {
        fail("CASE_EVENT_CASE_MISMATCH", { expectedCaseId: expectedCaseId, actualCaseId: normalized.caseId });
      }
      if (eventIds.has(normalized.eventId)) fail("DUPLICATE_CASE_EVENT_ID", { value: normalized.eventId });
      var occurredAt = isoDateTimeMillis(normalized.occurredAt, "occurredAt");
      if (lastOccurredAt !== null && occurredAt < lastOccurredAt) {
        fail("CASE_EVENT_CHRONOLOGY_REVERSED", { eventId: normalized.eventId });
      }
      eventIds.add(normalized.eventId);
      lastOccurredAt = occurredAt;
      return normalized;
    });
    return { events: normalizedEvents, eventIds: eventIds, lastOccurredAt: lastOccurredAt };
  }

  function appendCaseEventOnce(events, event) {
    if (!Array.isArray(events)) fail("CASE_EVENT_HISTORY_MUST_BE_ARRAY", {});
    var expectedCaseId = caseEventHistoryCaseIds.get(events);
    var normalizedHistory = normalizeCaseEventHistory(events, expectedCaseId);
    var normalized = createDomain("CaseEvent", event);
    if (normalized.caseId !== expectedCaseId) {
      fail("CASE_EVENT_CASE_MISMATCH", { expectedCaseId: expectedCaseId, actualCaseId: normalized.caseId });
    }
    if (normalizedHistory.eventIds.has(normalized.eventId)) {
      fail("DUPLICATE_CASE_EVENT_ID", { value: normalized.eventId });
    }
    var occurredAt = isoDateTimeMillis(normalized.occurredAt, "occurredAt");
    if (normalizedHistory.lastOccurredAt !== null && occurredAt < normalizedHistory.lastOccurredAt) {
      fail("CASE_EVENT_CHRONOLOGY_REVERSED", { eventId: normalized.eventId });
    }
    return issueCaseEventHistory(expectedCaseId, normalizedHistory.events.concat([normalized]));
  }

  function appendCaseEvent(events, event) {
    if (!events || !issuedCaseEventHistories.has(events)) fail("CASE_EVENT_HISTORY_NOT_RUNTIME_ISSUED", {});
    if (consumedCaseEventHistories.has(events)) fail("CASE_EVENT_HISTORY_ALREADY_CONSUMED", {});
    if (inFlightCaseEventHistories.has(events)) fail("CASE_EVENT_HISTORY_TRANSITION_IN_FLIGHT", {});
    inFlightCaseEventHistories.add(events);
    try {
      var successor = appendCaseEventOnce(events, event);
      consumedCaseEventHistories.add(events);
      return successor;
    } finally {
      inFlightCaseEventHistories.delete(events);
    }
  }

  function restoreCaseEventHistory() {
    return deepFreeze({
      ok: false,
      status: "NOT_YET_IMPLEMENTED",
      issue: "DURABLE_CASE_EVENT_HISTORY_RESTORE_ADAPTER_NOT_IMPLEMENTED",
    });
  }

  return deepFreeze({
    engineVersion: "v0.2",
    browserGlobal: "LaibeProjectContractEngine",
    source: source,
    FORMAL_CONTRACT_TYPES: FORMAL_CONTRACT_TYPES,
    DESIGN_BUILD_RELEASE_CONDITIONS: DESIGN_BUILD_RELEASE_CONDITIONS,
    normalizeContractType: normalizeContractType,
    createDomain: createDomain,
    validateDomain: validateDomain,
    createCase: domainFactory("Case"),
    createParty: domainFactory("Party"),
    createProjectContract: domainFactory("ProjectContract"),
    createContractVersion: domainFactory("ContractVersion"),
    createAttachment: domainFactory("Attachment"),
    createContractAttachment: domainFactory("Attachment"),
    createSchedule: domainFactory("Schedule"),
    createMilestone: domainFactory("Milestone"),
    createPaymentStage: domainFactory("PaymentStage"),
    createDRSReview: domainFactory("DRSReview"),
    createOwnerDecision: domainFactory("OwnerDecision"),
    createChangeRequest: domainFactory("ChangeRequest"),
    createCaseEvent: domainFactory("CaseEvent"),
    createCaseEventHistory: createCaseEventHistory,
    assembleContract: assembleContract,
    assembleProjectContract: assembleContract,
    calculateDesignPayments: calculateDesignPayments,
    generateWorksMilestones: generateWorksMilestones,
    createFinalPaymentState: createFinalPaymentState,
    createFinalAcceptanceRecord: createFinalAcceptanceRecord,
    applyFinalPaymentEvent: applyFinalPaymentEvent,
    restoreFinalPaymentState: restoreFinalPaymentState,
    createDesignBuildPaymentProfiles: createDesignBuildPaymentProfiles,
    evaluateDesignBuildReleaseGate: evaluateDesignBuildReleaseGate,
    createEarlyConstructionOverride: createEarlyConstructionOverride,
    createOwnerOverride: createOwnerOverride,
    createPartyAgreement: createPartyAgreement,
    createDraftChangeOrder: createDraftChangeOrder,
    createChangeOrder: createChangeOrder,
    createWarrantyPledge: createWarrantyPledge,
    createFallbackRecord: createFallbackRecord,
    normalizeCanonicalData: normalizeCanonicalData,
    canonicalSerialize: canonicalSerialize,
    sha256: sha256,
    createDraftVersion: createDraftVersion,
    createSignedSnapshot: createSignedSnapshot,
    appendCaseEvent: appendCaseEvent,
    restoreCaseEventHistory: restoreCaseEventHistory,
    EngineValidationError: EngineValidationError,
  });
});

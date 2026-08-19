// Accepted source SHA-256: a4c54671c9193a3f3abd798a9df3cbec6930da5e36b0ceda48d8b0b906919c4a
// BEGIN GENERATED INTAKE BUNDLE
// src/lib/budget/quote-healthcheck/pdf/intake.ts
var DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
var DEFAULT_MAX_PAGES = 100;
var decimal = /^[+-]?\d+(?:\.\d+)?$/;
var sha256 = /^[a-f\d]{64}$/;
var reject = (code, message) => ({
  accepted: false,
  rejection: {
    code,
    message
  }
});
var hasIdentity = (value) => typeof value === "string" && value.trim().length > 0;
var immutableBaselineId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
var validBaselineItem = (value) => typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value);
var freezeBaseline = (value) => {
  if (value === void 0) return {
    invalid: false
  };
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        invalid: true
      };
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return {
        invalid: true
      };
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") || Object.keys(descriptors).sort().join("|") !== "baselineId|items" || !("value" in descriptors.baselineId) || !("value" in descriptors.items)) return {
      invalid: true
    };
    const baselineId = descriptors.baselineId.value;
    const items = descriptors.items.value;
    if (typeof baselineId !== "string" || !immutableBaselineId.test(baselineId) || !Array.isArray(items) || items.length === 0 || items.length > 500 || !items.every(validBaselineItem)) return {
      invalid: true
    };
    const frozenItems = items.map((item) => item);
    const normalized = frozenItems.map(normalizeItem);
    if (new Set(normalized).size !== normalized.length) {
      return {
        invalid: true
      };
    }
    return {
      baseline: {
        baselineId,
        items: frozenItems
      },
      invalid: false
    };
  } catch {
    return {
      invalid: true
    };
  }
};
var normalizeItem = (item) => item.trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-TW");
var toQuoteRows = (text, document) => text.flatMap(({ text: sourceText, offset, page }) => {
  const cells = sourceText.split("|").map((cell) => cell.trim());
  if (cells.length !== 5 || !cells.every(hasIdentity)) return [];
  const [itemName, unit, quantity, unitPrice, declaredAmount] = cells;
  if (![
    quantity,
    unitPrice,
    declaredAmount
  ].every((value) => decimal.test(value))) return [];
  return [
    {
      itemName,
      unit,
      quantity,
      unitPrice,
      declaredAmount,
      provenance: {
        sourceDocumentVersionId: document.documentVersionId,
        sourceDocumentSha256: document.sha256,
        page,
        textOffset: offset,
        extractionMethod: "UNCOMPRESSED_LITERAL_TEXT"
      }
    }
  ];
});
var compareAgainstBaseline = (rows, baseline, evidenceSufficient) => {
  if (!baseline || !evidenceSufficient) {
    return {
      status: "NOT_EVALUATED",
      findings: []
    };
  }
  const expected = new Map(baseline.items.map((item) => [
    normalizeItem(item),
    item
  ]));
  const actual = new Map(rows.map((row) => [
    normalizeItem(row.itemName),
    row
  ]));
  const findings = [];
  for (const [key, itemName] of expected) {
    if (!actual.has(key)) {
      findings.push({
        code: "BASELINE_ITEM_MISSING",
        baselineId: baseline.baselineId,
        itemName,
        rowProvenance: null
      });
    }
  }
  for (const [key, row] of actual) {
    if (!expected.has(key)) {
      findings.push({
        code: "QUOTED_ITEM_NOT_IN_BASELINE",
        baselineId: baseline.baselineId,
        itemName: row.itemName,
        rowProvenance: row.provenance
      });
    }
  }
  return {
    status: "EVALUATED",
    findings
  };
};
var scanPdfNames = (source) => {
  const names = [];
  let malformed = false;
  const whitespace = /[\u0000\u0009\u000a\u000c\u000d\u0020]/;
  const delimiter = /[()<>\[\]{}/%]/;
  for (let index = 0; index < source.length; ) {
    const character = source[index];
    if (character === "%") {
      while (index < source.length && source[index] !== "\r" && source[index] !== "\n") index++;
      continue;
    }
    if (character === "(") {
      let depth = 1;
      index++;
      while (index < source.length && depth > 0) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === "(") depth++;
        if (source[index] === ")") depth--;
        index++;
      }
      if (depth !== 0) malformed = true;
      continue;
    }
    if (character === "<" && source[index + 1] === "<") {
      index += 2;
      continue;
    }
    if (character === ">" && source[index + 1] === ">") {
      index += 2;
      continue;
    }
    if (character === "<" && source[index + 1] !== "<") {
      const end = source.indexOf(">", index + 1);
      if (end === -1) {
        malformed = true;
        break;
      }
      index = end + 1;
      continue;
    }
    if (character !== "/") {
      index++;
      continue;
    }
    index++;
    const start = index;
    while (index < source.length && !whitespace.test(source[index]) && !delimiter.test(source[index])) index++;
    const raw = source.slice(start, index);
    let canonical = "";
    for (let nameIndex = 0; nameIndex < raw.length; nameIndex++) {
      if (raw[nameIndex] !== "#") {
        canonical += raw[nameIndex];
        continue;
      }
      const escaped = raw.slice(nameIndex + 1, nameIndex + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(escaped)) {
        malformed = true;
        break;
      }
      canonical += String.fromCharCode(Number.parseInt(escaped, 16));
      nameIndex += 2;
    }
    if (raw.length === 0) malformed = true;
    names.push(canonical);
  }
  return {
    names,
    malformed
  };
};
var parseIndirectObjects = (source) => {
  const objects = [];
  const seen = /* @__PURE__ */ new Set();
  const matcher = /(\d+)\s+(\d+)\s+obj\b/g;
  let searchFrom = 0;
  while (true) {
    matcher.lastIndex = searchFrom;
    const match = matcher.exec(source);
    if (!match) break;
    const bodyByteOffset = matcher.lastIndex;
    const end = source.indexOf("endobj", bodyByteOffset);
    if (end === -1) return null;
    const reference = `${match[1]} ${match[2]}`;
    if (seen.has(reference)) return null;
    seen.add(reference);
    objects.push({
      reference,
      body: source.slice(bodyByteOffset, end),
      bodyByteOffset
    });
    searchFrom = end + "endobj".length;
  }
  return objects.length > 0 ? objects : null;
};
var closingDictionaryIndex = (body, start) => {
  let depth = 0;
  for (let index = start; index < body.length; ) {
    if (body[index] === "%") {
      while (index < body.length && body[index] !== "\r" && body[index] !== "\n") index++;
      continue;
    }
    if (body[index] === "(") {
      let literalDepth = 1;
      index++;
      while (index < body.length && literalDepth > 0) {
        if (body[index] === "\\") {
          index += 2;
          continue;
        }
        if (body[index] === "(") literalDepth++;
        if (body[index] === ")") literalDepth--;
        index++;
      }
      if (literalDepth !== 0) return null;
      continue;
    }
    if (body[index] === "<" && body[index + 1] === "<") {
      depth++;
      index += 2;
      continue;
    }
    if (body[index] === ">" && body[index + 1] === ">") {
      depth--;
      index += 2;
      if (depth === 0) return index;
      if (depth < 0) return null;
      continue;
    }
    if (body[index] === "<") {
      const end = body.indexOf(">", index + 1);
      if (end === -1) return null;
      index = end + 1;
      continue;
    }
    index++;
  }
  return null;
};
var pdfWhitespace = /[\u0000\u0009\u000a\u000c\u000d\u0020]/;
var pdfDelimiter = /[()<>\[\]{}/%]/;
var skipPdfWhitespaceAndComments = (source, start) => {
  let index = start;
  while (index < source.length) {
    if (pdfWhitespace.test(source[index])) {
      index++;
      continue;
    }
    if (source[index] === "%") {
      while (index < source.length && source[index] !== "\r" && source[index] !== "\n") index++;
      continue;
    }
    break;
  }
  return index;
};
var readPdfName = (source, start) => {
  if (source[start] !== "/") return null;
  let index = start + 1;
  const rawStart = index;
  while (index < source.length && !pdfWhitespace.test(source[index]) && !pdfDelimiter.test(source[index])) index++;
  const raw = source.slice(rawStart, index);
  if (raw.length === 0) return null;
  let value = "";
  for (let nameIndex = 0; nameIndex < raw.length; nameIndex++) {
    if (raw[nameIndex] !== "#") {
      value += raw[nameIndex];
      continue;
    }
    const escaped = raw.slice(nameIndex + 1, nameIndex + 3);
    if (!/^[0-9A-Fa-f]{2}$/.test(escaped)) return null;
    value += String.fromCharCode(Number.parseInt(escaped, 16));
    nameIndex += 2;
  }
  return {
    value,
    end: index
  };
};
var consumePdfLiteral = (source, start) => {
  let depth = 1;
  let index = start + 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === "(") depth++;
    if (source[index] === ")") depth--;
    index++;
  }
  return depth === 0 ? index : null;
};
var consumePdfArray = (source, start) => {
  let index = start + 1;
  while (true) {
    index = skipPdfWhitespaceAndComments(source, index);
    if (index >= source.length) return null;
    if (source[index] === "]") return index + 1;
    const value = readPdfValue(source, index);
    if (!value) return null;
    index = value.end;
  }
};
var readPdfValue = (source, start) => {
  const index = skipPdfWhitespaceAndComments(source, start);
  if (index >= source.length) return null;
  if (source[index] === "/") {
    const name = readPdfName(source, index);
    return name ? {
      kind: "name",
      ...name
    } : null;
  }
  if (source[index] === "(") {
    const end2 = consumePdfLiteral(source, index);
    return end2 === null ? null : {
      kind: "other",
      end: end2
    };
  }
  if (source.startsWith("<<", index)) {
    const end2 = closingDictionaryIndex(source, index);
    return end2 === null ? null : {
      kind: "other",
      end: end2
    };
  }
  if (source[index] === "<") {
    const end2 = source.indexOf(">", index + 1);
    return end2 === -1 ? null : {
      kind: "other",
      end: end2 + 1
    };
  }
  if (source[index] === "[") {
    const end2 = consumePdfArray(source, index);
    return end2 === null ? null : {
      kind: "other",
      end: end2
    };
  }
  if (pdfDelimiter.test(source[index])) return null;
  let end = index;
  while (end < source.length && !pdfWhitespace.test(source[end]) && !pdfDelimiter.test(source[end])) end++;
  const word = source.slice(index, end);
  if (word.length === 0) return null;
  if (/^\d+$/.test(word)) {
    const secondStart = skipPdfWhitespaceAndComments(source, end);
    let secondEnd = secondStart;
    while (secondEnd < source.length && !pdfWhitespace.test(source[secondEnd]) && !pdfDelimiter.test(source[secondEnd])) secondEnd++;
    const second = source.slice(secondStart, secondEnd);
    const thirdStart = skipPdfWhitespaceAndComments(source, secondEnd);
    let thirdEnd = thirdStart;
    while (thirdEnd < source.length && !pdfWhitespace.test(source[thirdEnd]) && !pdfDelimiter.test(source[thirdEnd])) thirdEnd++;
    if (/^\d+$/.test(second) && source.slice(thirdStart, thirdEnd) === "R") {
      return {
        kind: "reference",
        reference: `${word} ${second}`,
        end: thirdEnd
      };
    }
    const value = Number(word);
    if (Number.isSafeInteger(value)) return {
      kind: "integer",
      value,
      end
    };
  }
  return {
    kind: "other",
    end
  };
};
var pdfHexDigit = /[0-9A-Fa-f]/;
var pdfContentNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
var readPdfContentToken = (source, start) => {
  const index = skipPdfWhitespaceAndComments(source, start);
  if (index >= source.length) return {
    token: null,
    next: index
  };
  if (source[index] === "(") {
    const end2 = consumePdfLiteral(source, index);
    return end2 === null ? null : {
      token: {
        kind: "literal",
        start: index,
        end: end2
      },
      next: end2
    };
  }
  if (source[index] === "/") {
    const name = readPdfName(source, index);
    return name === null ? null : {
      token: {
        kind: "operand",
        start: index,
        end: name.end
      },
      next: name.end
    };
  }
  if (source[index] === "[" || source[index] === "<") {
    const value = readPdfValue(source, index);
    if (value === null) return null;
    if (source[index] === "<" && source[index + 1] !== "<") {
      for (let cursor = index + 1; cursor < value.end - 1; cursor++) {
        if (!pdfWhitespace.test(source[cursor]) && !pdfHexDigit.test(source[cursor])) return null;
      }
    }
    return {
      token: {
        kind: "operand",
        start: index,
        end: value.end
      },
      next: value.end
    };
  }
  if (pdfDelimiter.test(source[index])) return null;
  let end = index;
  while (end < source.length && !pdfWhitespace.test(source[end]) && !pdfDelimiter.test(source[end])) end++;
  if (end === index) return null;
  return {
    token: {
      kind: "regular",
      start: index,
      end,
      value: source.slice(index, end)
    },
    next: end
  };
};
var decodePdfLiteral = (source, start, end) => {
  if (source[start] !== "(" || source[end - 1] !== ")") return null;
  let decoded = "";
  for (let index = start + 1; index < end - 1; ) {
    const character = source[index];
    if (character !== "\\") {
      decoded += character;
      index++;
      continue;
    }
    index++;
    if (index >= end - 1) return null;
    const escaped = source[index];
    if (escaped === "\n") {
      index++;
      continue;
    }
    if (escaped === "\r") {
      index++;
      if (source[index] === "\n") index++;
      continue;
    }
    if (escaped >= "0" && escaped <= "7") {
      let octal = escaped;
      index++;
      while (octal.length < 3 && index < end - 1 && source[index] >= "0" && source[index] <= "7") {
        octal += source[index];
        index++;
      }
      decoded += String.fromCharCode(Number.parseInt(octal, 8) & 255);
      continue;
    }
    decoded += {
      n: "\n",
      r: "\r",
      t: "	",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\"
    }[escaped] ?? escaped;
    index++;
  }
  return decoded;
};
var isPdfContentOperandWord = (value) => pdfContentNumber.test(value) || value === "true" || value === "false" || value === "null";
var extractedText = (source, page, streamByteOffset) => {
  const values = [];
  const operands = [];
  let activeTextObject = false;
  let index = 0;
  while (true) {
    const read = readPdfContentToken(source, index);
    if (read === null) return {
      ok: false
    };
    index = read.next;
    const token = read.token;
    if (token === null) break;
    if (token.kind !== "regular") {
      if (activeTextObject) operands.push(token);
      continue;
    }
    if (token.value === "BI") return {
      ok: false
    };
    if (token.value === "BT") {
      if (activeTextObject) return {
        ok: false
      };
      activeTextObject = true;
      operands.length = 0;
      continue;
    }
    if (token.value === "ET") {
      if (!activeTextObject) return {
        ok: false
      };
      activeTextObject = false;
      operands.length = 0;
      continue;
    }
    if (token.value === "Tj") {
      if (activeTextObject && operands.length === 1 && operands[0].kind === "literal") {
        const literal = operands[0];
        const decoded = decodePdfLiteral(source, literal.start, literal.end);
        if (decoded === null) return {
          ok: false
        };
        values.push({
          text: decoded,
          offset: streamByteOffset + new TextEncoder().encode(source.slice(0, literal.start)).byteLength,
          page
        });
      }
      operands.length = 0;
      continue;
    }
    if (!activeTextObject) continue;
    if (isPdfContentOperandWord(token.value)) {
      operands.push(token);
    } else {
      operands.length = 0;
    }
  }
  return activeTextObject ? {
    ok: false
  } : {
    ok: true,
    values
  };
};
var topLevelDictionaryEntries = (dictionary) => {
  if (!dictionary.startsWith("<<")) return null;
  const entries = /* @__PURE__ */ new Map();
  let index = 2;
  while (true) {
    index = skipPdfWhitespaceAndComments(dictionary, index);
    if (dictionary.startsWith(">>", index)) {
      return dictionary.slice(index + 2).trim().length === 0 ? entries : null;
    }
    const key = readPdfName(dictionary, index);
    if (!key) {
      const ignored = readPdfValue(dictionary, index);
      if (!ignored) return null;
      index = ignored.end;
      continue;
    }
    if (entries.has(key.value)) return null;
    const value = readPdfValue(dictionary, key.end);
    if (!value) return null;
    entries.set(key.value, value);
    index = value.end;
  }
};
var isPdfTokenBoundary = (character) => character === void 0 || pdfWhitespace.test(character) || pdfDelimiter.test(character);
var lexicalStreamTerminator = (body, payloadStart) => {
  for (let index = payloadStart; index < body.length; ) {
    if (body[index] === "%") {
      while (index < body.length && body[index] !== "\r" && body[index] !== "\n") index++;
      continue;
    }
    if (body[index] === "(") {
      const end = consumePdfLiteral(body, index);
      if (end === null) return null;
      index = end;
      continue;
    }
    if (body[index] === "<" && body[index + 1] !== "<") {
      const end = body.indexOf(">", index + 1);
      if (end === -1) return null;
      index = end + 1;
      continue;
    }
    if (body.startsWith("endstream", index) && isPdfTokenBoundary(body[index - 1]) && isPdfTokenBoundary(body[index + "endstream".length]) && body.slice(index + "endstream".length).trim().length === 0) return index;
    index++;
  }
  return null;
};
var streamExtent = (body, dictionaryEntries, payloadStart) => {
  const length = dictionaryEntries.get("Length");
  if (length?.kind === "integer") {
    const payloadEnd2 = payloadStart + length.value;
    if (payloadEnd2 <= body.length && body.startsWith("endstream", payloadEnd2) && isPdfTokenBoundary(body[payloadEnd2 + "endstream".length]) && body.slice(payloadEnd2 + "endstream".length).trim().length === 0) return {
      payloadStart,
      payloadEnd: payloadEnd2
    };
  }
  const payloadEnd = lexicalStreamTerminator(body, payloadStart);
  return payloadEnd === null ? null : {
    payloadStart,
    payloadEnd
  };
};
var structuredPdfObjects = (source) => {
  const objects = parseIndirectObjects(source);
  if (!objects) return null;
  const structured = [];
  for (const object of objects) {
    const dictionaryStart = object.body.search(/\S/);
    if (dictionaryStart === -1 || !object.body.startsWith("<<", dictionaryStart)) return null;
    const dictionaryEnd = closingDictionaryIndex(object.body, dictionaryStart);
    if (dictionaryEnd === null) return null;
    const dictionary = object.body.slice(dictionaryStart, dictionaryEnd);
    const dictionaryEntries = topLevelDictionaryEntries(dictionary);
    if (!dictionaryEntries) return null;
    const tail = object.body.slice(dictionaryEnd);
    const leadingWhitespace = tail.match(/^\s*/)?.[0].length ?? 0;
    const streamToken = tail.slice(leadingWhitespace).match(/^stream(?:\r\n|\n|\r)/)?.[0];
    if (!streamToken) {
      if (tail.trim().length > 0) return null;
      structured.push({
        ...object,
        dictionary,
        dictionaryEntries
      });
      continue;
    }
    const streamStart = dictionaryEnd + leadingWhitespace;
    const payloadStart = streamStart + streamToken.length;
    const stream = streamExtent(object.body, dictionaryEntries, payloadStart);
    if (!stream) return null;
    structured.push({
      ...object,
      dictionary,
      dictionaryEntries,
      stream
    });
  }
  return structured;
};
var maskActualStreamBodies = (source, objects) => {
  const characters = source.split("");
  for (const object of objects) {
    if (!object.stream) continue;
    const start = object.bodyByteOffset + object.stream.payloadStart;
    const end = object.bodyByteOffset + object.stream.payloadEnd;
    for (let index = start; index < end; index++) characters[index] = " ";
  }
  return characters.join("");
};
var parseSupportedPageStreams = (objects, bytes, maxPages) => {
  const byReference = new Map(objects.map((object) => [
    object.reference,
    object
  ]));
  const pages = objects.filter((object) => {
    const type = object.dictionaryEntries.get("Type");
    return type?.kind === "name" && type.value === "Page";
  });
  if (pages.length === 0) {
    return {
      ok: false,
      rejection: {
        code: "CORRUPT_PDF",
        message: "PDF has no readable page objects."
      }
    };
  }
  if (pages.length > maxPages) {
    return {
      ok: false,
      rejection: {
        code: "PAGE_LIMIT_EXCEEDED",
        message: `PDF has ${pages.length} pages, above the ${maxPages}-page intake limit.`
      }
    };
  }
  const text = [];
  const referencedStreams = /* @__PURE__ */ new Set();
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const contents = page.dictionaryEntries.get("Contents");
    if (!contents) {
      if (scanPdfNames(page.dictionary).names.includes("Contents")) {
        return {
          ok: false,
          rejection: {
            code: "CORRUPT_PDF",
            message: "Only a top-level direct page content-stream reference is supported."
          }
        };
      }
      continue;
    }
    if (contents.kind !== "reference") {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "Only one direct page content-stream reference is supported."
        }
      };
    }
    const reference = contents.reference;
    if (referencedStreams.has(reference)) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "A content stream referenced by multiple pages has ambiguous provenance."
        }
      };
    }
    referencedStreams.add(reference);
    const content = byReference.get(reference);
    if (!content) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "A referenced page content stream is missing."
        }
      };
    }
    if (!content.stream) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "Page content must contain exactly one supported stream."
        }
      };
    }
    let payloadEnd = content.stream.payloadEnd;
    if (content.body[payloadEnd - 1] === "\n") payloadEnd--;
    if (content.body[payloadEnd - 1] === "\r") payloadEnd--;
    const absoluteStart = content.bodyByteOffset + content.stream.payloadStart;
    const absoluteEnd = content.bodyByteOffset + payloadEnd;
    let decoded;
    try {
      decoded = new TextDecoder("utf-8", {
        fatal: true
      }).decode(bytes.slice(absoluteStart, absoluteEnd));
    } catch {
      return {
        ok: true,
        pageCount: pages.length,
        text: [],
        invalidTextEncoding: true
      };
    }
    const extracted = extractedText(decoded, pageIndex + 1, absoluteStart);
    if (!extracted.ok) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "PDF content-stream lexical structure is incomplete."
        }
      };
    }
    text.push(...extracted.values);
  }
  return {
    ok: true,
    pageCount: pages.length,
    text,
    invalidTextEncoding: false
  };
};
var inspectQuotePdfBytes = async (input) => {
  let frozenBytes;
  let document;
  let maxBytes;
  let maxPages;
  let frozenBaseline;
  try {
    frozenBytes = new Uint8Array(input.bytes);
    document = {
      documentVersionId: input.document.documentVersionId,
      caseId: input.document.caseId,
      sha256: input.document.sha256
    };
    maxBytes = input.options?.maxBytes ?? DEFAULT_MAX_BYTES;
    maxPages = input.options?.maxPages ?? DEFAULT_MAX_PAGES;
    frozenBaseline = freezeBaseline(input.baseline);
  } catch {
    return reject("DOCUMENT_REFERENCE_INVALID", "PDF intake input could not be safely snapshotted.");
  }
  if (!Number.isInteger(maxBytes) || maxBytes <= 0 || !Number.isInteger(maxPages) || maxPages <= 0) {
    return reject("DOCUMENT_REFERENCE_INVALID", "PDF intake limits must be positive integers.");
  }
  if (!hasIdentity(document.documentVersionId) || !hasIdentity(document.caseId) || !sha256.test(document.sha256)) {
    return reject("DOCUMENT_REFERENCE_INVALID", "A case-bound immutable document version and lowercase SHA-256 are required.");
  }
  if (frozenBytes.byteLength > maxBytes) {
    return reject("FILE_TOO_LARGE", `PDF bytes exceed the ${maxBytes}-byte intake limit.`);
  }
  const digestBuffer = new ArrayBuffer(frozenBytes.byteLength);
  new Uint8Array(digestBuffer).set(frozenBytes);
  const actualHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", digestBuffer))).map((value) => value.toString(16).padStart(2, "0")).join("");
  if (actualHash !== document.sha256) {
    return reject("DOCUMENT_HASH_MISMATCH", "PDF bytes do not match the bound immutable document version SHA-256.");
  }
  let source;
  try {
    source = new TextDecoder("latin1", {
      fatal: true
    }).decode(frozenBytes);
  } catch {
    return reject("CORRUPT_PDF", "PDF bytes cannot be decoded for safe structural inspection.");
  }
  if (!source.startsWith("%PDF-") || !source.includes("%%EOF")) {
    return reject("CORRUPT_PDF", "PDF header or EOF marker is missing.");
  }
  const objects = structuredPdfObjects(source);
  if (!objects) {
    return reject("CORRUPT_PDF", "PDF indirect-object structure is incomplete.");
  }
  const hasStructuralActiveTrigger = objects.some(({ dictionaryEntries }) => [
    "OpenAction",
    "AA",
    "A"
  ].some((trigger) => dictionaryEntries.has(trigger)));
  const scannedNames = scanPdfNames(maskActualStreamBodies(source, objects));
  if (scannedNames.malformed) {
    return reject("CORRUPT_PDF", "PDF contains a malformed name or literal token.");
  }
  if (hasStructuralActiveTrigger || scannedNames.names.some((name) => [
    "JavaScript",
    "JS",
    "Launch",
    "RichMedia",
    "EmbeddedFile"
  ].includes(name))) {
    return reject("UNSUPPORTED_ACTIVE_CONTENT", "PDF active content is not accepted for quote extraction.");
  }
  if (scannedNames.names.includes("Encrypt")) {
    return reject("ENCRYPTED_PDF", "Encrypted PDFs require a separate authorized decryption flow.");
  }
  if (scannedNames.names.includes("Filter")) {
    return reject("UNSUPPORTED_COMPRESSED_CONTENT", "Compressed PDF content is outside this literal-text intake contract.");
  }
  const parsedPages = parseSupportedPageStreams(objects, frozenBytes, maxPages);
  if (!parsedPages.ok) {
    return {
      accepted: false,
      rejection: parsedPages.rejection
    };
  }
  const imageOnly = parsedPages.text.length === 0 && !parsedPages.invalidTextEncoding && scannedNames.names.includes("Image");
  const readability = parsedPages.text.length > 0 ? "TEXT_LAYER" : imageOnly ? "IMAGE_ONLY" : "NO_EXTRACTABLE_TEXT";
  const rows = toQuoteRows(parsedPages.text, document);
  const limitations = [];
  if (imageOnly) {
    limitations.push({
      code: "OCR_NOT_PERFORMED",
      message: "This scanned PDF has no readable text layer; no OCR facts were created."
    });
  }
  if (parsedPages.invalidTextEncoding) {
    limitations.push({
      code: "INVALID_TEXT_ENCODING",
      message: "A page content stream is not valid UTF-8, so no text facts were created."
    });
  }
  if (rows.length === 0) {
    limitations.push({
      code: "NO_STRUCTURED_QUOTE_ROWS",
      message: "No complete five-column quote rows were found in the supported literal-text format."
    });
  }
  if (frozenBaseline.invalid) {
    limitations.push({
      code: "BASELINE_INVALID",
      message: "The comparison baseline is not a closed immutable identifier with valid item values."
    });
  }
  return {
    accepted: true,
    inspection: {
      byteLength: frozenBytes.byteLength,
      pageCount: parsedPages.pageCount,
      readability
    },
    facts: {
      rows
    },
    limitations,
    comparison: compareAgainstBaseline(rows, frozenBaseline.baseline, readability === "TEXT_LAYER" && rows.length > 0)
  };
};
export {
  inspectQuotePdfBytes
};
// END GENERATED INTAKE BUNDLE

var trustedBlobArrayBuffer = globalThis.Blob?.prototype?.arrayBuffer;
var trustedGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var trustedBlobSizeGetter = globalThis.Blob
  ? Object.getOwnPropertyDescriptor(globalThis.Blob.prototype, "size")?.get
  : void 0;
var trustedBlobTypeGetter = globalThis.Blob
  ? Object.getOwnPropertyDescriptor(globalThis.Blob.prototype, "type")?.get
  : void 0;
var trustedFileNameGetter = globalThis.File
  ? Object.getOwnPropertyDescriptor(globalThis.File.prototype, "name")?.get
  : void 0;

var publicFailure = (status, title, message, nextAction) => ({
  status,
  title,
  message,
  nextAction,
  summary: null,
  report: null,
  limitations: []
});

var publicRejection = (code) => {
  switch (code) {
    case "ENCRYPTED_PDF":
      return publicFailure(
        code,
        "這份 PDF 已加密",
        "為了保護文件內容，目前不會在這裡嘗試解密。",
        "請另存一份未加密、且確定可分享的 PDF 後再選擇。"
      );
    case "UNSUPPORTED_ACTIVE_CONTENT":
      return publicFailure(
        code,
        "這份 PDF 含有互動內容",
        "目前只接受不含執行動作、附件或互動程式的靜態報價 PDF。",
        "請另存為一般靜態 PDF 後再選擇。"
      );
    case "UNSUPPORTED_COMPRESSED_CONTENT":
      return publicFailure(
        code,
        "這份 PDF 使用尚未支援的壓縮格式",
        "目前只能讀取未加密、未壓縮的文字層報價 PDF。",
        "請由原始報價檔另存為未壓縮 PDF 後再選擇。"
      );
    case "FILE_TOO_LARGE":
      return publicFailure(
        code,
        "檔案超過目前可檢查的大小",
        "為避免瀏覽器負擔過重，這份 PDF 未進行解析。",
        "請縮小檔案，或拆成較小的報價文件後再選擇。"
      );
    case "PAGE_LIMIT_EXCEEDED":
      return publicFailure(
        code,
        "頁數超過目前可檢查的範圍",
        "這份 PDF 未產生摘要。",
        "請拆成較短的報價文件後再選擇。"
      );
    case "CORRUPT_PDF":
    default:
      return publicFailure(
        code === "CORRUPT_PDF" ? code : "UNREADABLE_PDF",
        "無法安全讀取這份 PDF",
        "檔案格式不完整或不符合目前的安全解析範圍，因此沒有產生摘要。",
        "請確認檔案可正常開啟，再另存一份 PDF 後重新選擇。"
      );
  }
};

var safeFileSnapshot = async (file) => {
  if (
    typeof trustedBlobSizeGetter !== "function" ||
    typeof trustedBlobArrayBuffer !== "function" ||
    typeof trustedBlobTypeGetter !== "function" ||
    typeof trustedFileNameGetter !== "function"
  ) {
    return { kind: "invalid" };
  }
  try {
    const name = Reflect.apply(trustedFileNameGetter, file, []);
    const type = Reflect.apply(trustedBlobTypeGetter, file, []);
    const size = Reflect.apply(trustedBlobSizeGetter, file, []);
    if (
      typeof name !== "string" || !name.toLowerCase().endsWith(".pdf") ||
      (type !== "" && type !== "application/pdf") ||
      !Number.isInteger(size) || size < 0
    ) {
      return { kind: "invalid" };
    }
    if (size > DEFAULT_MAX_BYTES) return { kind: "too-large" };
    const buffer = await Reflect.apply(trustedBlobArrayBuffer, file, []);
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > DEFAULT_MAX_BYTES) return { kind: "too-large" };
    return { kind: "bytes", bytes };
  } catch {
    return { kind: "invalid" };
  }
};

var notifyBeforePageTextParse = (dependencies) => {
  let callback;
  try {
    if (
      dependencies === null ||
      dependencies === void 0 ||
      (typeof dependencies !== "object" && typeof dependencies !== "function")
    ) {
      return;
    }
    const descriptor = trustedGetOwnPropertyDescriptor(
      dependencies,
      "onBeforePageTextParse"
    );
    callback = descriptor && typeof descriptor.value === "function"
      ? descriptor.value
      : void 0;
  } catch {
    return;
  }
  if (callback) callback();
};

var inspectParserOnlyQuotePdfBytes = (inputBytes, dependencies = void 0) => {
  const bytes = new Uint8Array(inputBytes);
  if (bytes.byteLength > DEFAULT_MAX_BYTES) {
    return reject("FILE_TOO_LARGE", "PDF exceeds the parser-only byte limit.");
  }
  let source;
  try {
    source = new TextDecoder("latin1", { fatal: true }).decode(bytes);
  } catch {
    return reject("CORRUPT_PDF", "PDF bytes cannot be decoded for structural inspection.");
  }
  if (!source.startsWith("%PDF-") || !source.includes("%%EOF")) {
    return reject("CORRUPT_PDF", "PDF header or EOF marker is missing.");
  }
  const objects = structuredPdfObjects(source);
  if (!objects) {
    return reject("CORRUPT_PDF", "PDF indirect-object structure is incomplete.");
  }
  const hasStructuralActiveTrigger = objects.some(({ dictionaryEntries }) =>
    ["OpenAction", "AA", "A"].some((trigger) => dictionaryEntries.has(trigger))
  );
  const scannedNames = scanPdfNames(maskActualStreamBodies(source, objects));
  if (scannedNames.malformed) {
    return reject("CORRUPT_PDF", "PDF contains a malformed name or literal token.");
  }
  if (
    hasStructuralActiveTrigger ||
    scannedNames.names.some((name) =>
      ["JavaScript", "JS", "Launch", "RichMedia", "EmbeddedFile"].includes(name)
    )
  ) {
    return reject("UNSUPPORTED_ACTIVE_CONTENT", "PDF active content is not accepted.");
  }
  if (scannedNames.names.includes("Encrypt")) {
    return reject("ENCRYPTED_PDF", "Encrypted PDFs are outside parser-only intake.");
  }
  if (scannedNames.names.includes("Filter")) {
    return reject("UNSUPPORTED_COMPRESSED_CONTENT", "Compressed PDFs are outside parser-only intake.");
  }
  notifyBeforePageTextParse(dependencies);
  const parsedPages = parseSupportedPageStreams(objects, bytes, DEFAULT_MAX_PAGES);
  if (!parsedPages.ok) return { accepted: false, rejection: parsedPages.rejection };
  const imageOnly = parsedPages.text.length === 0 &&
    !parsedPages.invalidTextEncoding &&
    scannedNames.names.includes("Image");
  const readability = parsedPages.text.length > 0
    ? "TEXT_LAYER"
    : imageOnly
    ? "IMAGE_ONLY"
    : "NO_EXTRACTABLE_TEXT";
  const rows = toQuoteRows(parsedPages.text, {
    documentVersionId: "",
    sha256: ""
  });
  const limitations = [];
  if (imageOnly) limitations.push({ code: "OCR_NOT_PERFORMED" });
  if (parsedPages.invalidTextEncoding) limitations.push({ code: "INVALID_TEXT_ENCODING" });
  if (rows.length === 0) limitations.push({ code: "NO_STRUCTURED_QUOTE_ROWS" });
  const textLines = parsedPages.text.flatMap(({ text }) =>
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
  return {
    accepted: true,
    inspection: {
      byteLength: bytes.byteLength,
      pageCount: parsedPages.pageCount,
      readability
    },
    textLines,
    rowCount: rows.length,
    limitations
  };
};

var clauseTerms = {
  payment: {
    label: "付款",
    patterns: [/付款|支付|款項|訂金|尾款|進度款|保證金|收款/iu],
  },
  schedule: {
    label: "工期",
    patterns: [/工期|竣工|開工|完工|交工|完工日期|完工日|施工時程|工日/iu],
  },
  change: {
    label: "變更",
    patterns: [/變更|追加|減項|刪減|設計變更|契約變更|追加項目|改圖/iu],
  },
  acceptance: {
    label: "驗收",
    patterns: [/驗收|驗收標準|驗收日|缺失|待驗收/iu],
  },
  liability: {
    label: "責任",
    patterns: [/責任|違約|賠償|逾期|瑕疵|保固|責任範圍/iu],
  },
  termination: {
    label: "終止",
    patterns: [/終止|解約|取消|撤銷|中止|解除|停止合作/iu],
  },
  priority: {
    label: "文件優先順序",
    patterns: [/優先順序|文件優先|附件|圖說|合約附件|以.*為準|書面契約/iu],
  },
};

var extractClauseDraft = (lines) => {
  const compact = lines.join("\n")
    .replace(/\u0000/g, " ")
    .toLowerCase();
  return Object.entries(clauseTerms).map(([key, definition]) => {
    const matched = definition.patterns.some((pattern) => pattern.test(compact));
    return {
      key,
      label: definition.label,
      status: matched
        ? "初步整理：已找到可回頭核對的相關字句（未形成法律結論）"
        : "初步整理：未在本次文字摘要中找到明確字句，請回原件再確認",
    };
  });
};

var translateLimitations = (limitations) => limitations.flatMap(({ code }) => {
  switch (code) {
    case "INVALID_TEXT_ENCODING":
      return ["部分文字編碼無法辨識，摘要可能不完整。"];
    case "NO_STRUCTURED_QUOTE_ROWS":
      return ["沒有找到可安全辨識的完整報價列。"];
    default:
      return [];
  }
});

var inspectQuotePdfFile = async (file, dependencies = void 0) => {
  const snapshot = await safeFileSnapshot(file);
  if (snapshot.kind === "too-large") return publicRejection("FILE_TOO_LARGE");
  if (snapshot.kind !== "bytes") {
    return publicFailure(
      "INVALID_FILE",
      "請選擇有效的 PDF 檔案",
      "目前沒有收到可安全讀取的 PDF 檔案。",
      "請重新選擇一份 PDF。"
    );
  }

  try {
    const intake = inspectParserOnlyQuotePdfBytes(snapshot.bytes, dependencies);
    if (!intake.accepted) return publicRejection(intake.rejection.code);
    if (intake.inspection.readability === "IMAGE_ONLY") {
      return publicFailure(
        "SCANNED_PDF",
        "這份 PDF 看起來是掃描檔",
        "目前不會執行 OCR，也不會從影像猜測報價內容。",
        "請改選含有可選取文字層的 PDF。"
      );
    }
    if (intake.inspection.readability !== "TEXT_LAYER" || intake.rowCount === 0) {
      return publicFailure(
        "UNSUPPORTED_LAYOUT",
        "尚未找到可整理的報價列",
        "檔案有文字層，但沒有符合目前五欄報價格式的完整資料。",
        "請確認內容包含項目、單位、數量、單價與金額，再重新選擇。"
      );
    }
    return {
      status: "PARSER_READY",
      title: "本機解析摘要已完成",
      message: "摘要只反映這次選擇的 PDF，不會上傳或保存。",
      nextAction: "請回到原始報價文件逐項確認；本頁不會建立正式報告或案件紀錄。",
      summary: {
        pageCount: intake.inspection.pageCount,
        itemCount: intake.rowCount,
        lineCount: intake.textLines ? intake.textLines.length : 0,
        readability: "可讀文字層",
        comparison: "本次未提供比較基準"
      },
      report: null,
      limitations: translateLimitations(intake.limitations)
    };
  } catch {
    return publicFailure(
      "UNREADABLE_PDF",
      "無法安全讀取這份 PDF",
      "讀取過程未完成，因此沒有產生摘要。",
      "請重新選擇檔案；若仍無法讀取，請另存一份 PDF 再試。"
    );
  }
};

var inspectContractPdfFile = async (file, dependencies = void 0) => {
  const snapshot = await safeFileSnapshot(file);
  if (snapshot.kind === "too-large") return publicRejection("FILE_TOO_LARGE");
  if (snapshot.kind !== "bytes") {
    return publicFailure(
      "INVALID_FILE",
      "請選擇有效的 PDF 檔案",
      "目前沒有收到可安全讀取的 PDF 檔案。",
      "請重新選擇一份 PDF。"
    );
  }
  try {
    const intake = inspectParserOnlyQuotePdfBytes(snapshot.bytes, dependencies);
    if (!intake.accepted) return publicRejection(intake.rejection.code);
    if (intake.inspection.readability === "IMAGE_ONLY") {
      return publicFailure(
        "SCANNED_PDF",
        "這份契約 PDF 看起來是掃描檔",
        "目前不會執行 OCR，也不會做正式條款解讀。",
        "請改選含有可選取文字層的契約 PDF。"
      );
    }
    if (intake.inspection.readability !== "TEXT_LAYER") {
      return publicFailure(
        "UNSUPPORTED_LAYOUT",
        "這份契約目前無法做文字整理",
        "無法從可安全範圍內辨識完整條款文字。",
        "請確認契約 PDF 可正常閱讀後再選擇。"
      );
    }
    const clauseDraft = extractClauseDraft(intake.textLines ?? []);
    return {
      status: "PARSER_READY",
      title: "契約條款初步整理完成（HOLD）",
      message:
        "本機僅提供條款初步整理，僅作參考；不會產生正式案件留痕。",
      nextAction: "請回到原始契約逐條確認；正式留痕需在案件正式流程建立。",
      summary: {
        pageCount: intake.inspection.pageCount,
        lineCount: intake.textLines ? intake.textLines.length : 0,
        readability: "可讀文字層",
        clauseDraft,
      },
      report: null,
      limitations: [],
    };
  } catch {
    return publicFailure(
      "UNREADABLE_PDF",
      "無法安全讀取這份 PDF",
      "讀取過程未完成，因此沒有產生條款初步整理。",
      "請重新選擇檔案；若仍無法讀取，請另存一份 PDF 後再試。"
    );
  }
};

var QUOTE_BROWSER_RUNTIME_MODE = "LOCAL_PARSER_SUMMARY_ONLY";

export {
  inspectQuotePdfFile,
  inspectContractPdfFile,
  QUOTE_BROWSER_RUNTIME_MODE
};

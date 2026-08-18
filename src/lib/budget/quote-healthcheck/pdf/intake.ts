/**
 * A deliberately narrow, byte-bound PDF intake for quote documents.
 *
 * It accepts only unencrypted PDFs with an uncompressed literal-text layer.
 * It does not render pages, execute PDF actions, decrypt files, or perform OCR.
 * Consequently every parsed fact keeps document-version provenance and every
 * unsupported condition is returned as a limitation or a rejection.
 */

export interface QuotePdfDocumentVersionReference {
  documentVersionId: string;
  caseId: string;
  sha256: string;
}

export interface QuotePdfIntakeOptions {
  maxBytes?: number;
  maxPages?: number;
}

export interface QuotePdfBaseline {
  baselineId: string;
  items: string[];
}

export interface QuotePdfIntakeInput {
  bytes: Uint8Array;
  document: QuotePdfDocumentVersionReference;
  options?: QuotePdfIntakeOptions;
  baseline?: QuotePdfBaseline;
}

export type QuotePdfRejectionCode =
  | "FILE_TOO_LARGE"
  | "DOCUMENT_REFERENCE_INVALID"
  | "DOCUMENT_HASH_MISMATCH"
  | "CORRUPT_PDF"
  | "ENCRYPTED_PDF"
  | "UNSUPPORTED_ACTIVE_CONTENT"
  | "UNSUPPORTED_COMPRESSED_CONTENT"
  | "PAGE_LIMIT_EXCEEDED";

export interface QuotePdfRejection {
  code: QuotePdfRejectionCode;
  message: string;
}

export interface QuotePdfLimitation {
  code:
    | "OCR_NOT_PERFORMED"
    | "NO_STRUCTURED_QUOTE_ROWS"
    | "MULTI_PAGE_TEXT_LOCATION_UNCERTAIN"
    | "INVALID_TEXT_ENCODING"
    | "BASELINE_INVALID";
  message: string;
}

export interface QuotePdfProvenance {
  sourceDocumentVersionId: string;
  sourceDocumentSha256: string;
  page: number | null;
  textOffset: number;
  extractionMethod: "UNCOMPRESSED_LITERAL_TEXT";
}

export interface QuotePdfQuoteRow {
  itemName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  declaredAmount: string;
  provenance: QuotePdfProvenance;
}

export interface QuotePdfComparisonFinding {
  code: "BASELINE_ITEM_MISSING" | "QUOTED_ITEM_NOT_IN_BASELINE";
  baselineId: string;
  itemName: string;
  rowProvenance: QuotePdfProvenance | null;
}

export interface QuotePdfComparison {
  status: "EVALUATED" | "NOT_EVALUATED";
  findings: QuotePdfComparisonFinding[];
}

export type QuotePdfIntakeResult =
  | { accepted: false; rejection: QuotePdfRejection }
  | {
    accepted: true;
    inspection: {
      byteLength: number;
      pageCount: number;
      readability: "TEXT_LAYER" | "IMAGE_ONLY" | "NO_EXTRACTABLE_TEXT";
    };
    facts: { rows: QuotePdfQuoteRow[] };
    limitations: QuotePdfLimitation[];
    comparison: QuotePdfComparison;
  };

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_PAGES = 100;
const decimal = /^[+-]?\d+(?:\.\d+)?$/;
const sha256 = /^[a-f\d]{64}$/;

const reject = (
  code: QuotePdfRejectionCode,
  message: string,
): QuotePdfIntakeResult => ({
  accepted: false,
  rejection: { code, message },
});

const hasIdentity = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

interface FrozenBaselineResult {
  baseline?: QuotePdfBaseline;
  invalid: boolean;
}

const immutableBaselineId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const validBaselineItem = (value: unknown): value is string =>
  typeof value === "string" && value === value.trim() && value.length > 0 &&
  value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value);

const freezeBaseline = (value: unknown): FrozenBaselineResult => {
  if (value === undefined) return { invalid: false };
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { invalid: true };
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return { invalid: true };
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") ||
      Object.keys(descriptors).sort().join("|") !== "baselineId|items" ||
      !("value" in descriptors.baselineId) || !("value" in descriptors.items)
    ) return { invalid: true };
    const baselineId = descriptors.baselineId.value;
    const items = descriptors.items.value;
    if (
      typeof baselineId !== "string" || !immutableBaselineId.test(baselineId) ||
      !Array.isArray(items) || items.length === 0 || items.length > 500 ||
      !items.every(validBaselineItem)
    ) return { invalid: true };
    const frozenItems = items.map((item) => item);
    const normalized = frozenItems.map(normalizeItem);
    if (new Set(normalized).size !== normalized.length) {
      return { invalid: true };
    }
    return { baseline: { baselineId, items: frozenItems }, invalid: false };
  } catch {
    return { invalid: true };
  }
};

interface ExtractedLiteralText {
  text: string;
  offset: number;
  page: number;
}

type ExtractedTextResult =
  | { ok: true; values: ExtractedLiteralText[] }
  | { ok: false };

const normalizeItem = (item: string): string =>
  item.trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-TW");

const toQuoteRows = (
  text: ExtractedLiteralText[],
  document: QuotePdfDocumentVersionReference,
): QuotePdfQuoteRow[] =>
  text.flatMap(({ text: sourceText, offset, page }) => {
    const cells = sourceText.split("|").map((cell) => cell.trim());
    if (cells.length !== 5 || !cells.every(hasIdentity)) return [];
    const [itemName, unit, quantity, unitPrice, declaredAmount] = cells;
    if (
      ![quantity, unitPrice, declaredAmount].every((value) =>
        decimal.test(value)
      )
    ) return [];
    return [{
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
        extractionMethod: "UNCOMPRESSED_LITERAL_TEXT",
      },
    }];
  });

const compareAgainstBaseline = (
  rows: QuotePdfQuoteRow[],
  baseline: QuotePdfBaseline | undefined,
  evidenceSufficient: boolean,
): QuotePdfComparison => {
  if (!baseline || !evidenceSufficient) {
    return { status: "NOT_EVALUATED", findings: [] };
  }
  const expected = new Map(
    baseline.items.map((item) => [normalizeItem(item), item]),
  );
  const actual = new Map(rows.map((row) => [normalizeItem(row.itemName), row]));
  const findings: QuotePdfComparisonFinding[] = [];
  for (const [key, itemName] of expected) {
    if (!actual.has(key)) {
      findings.push({
        code: "BASELINE_ITEM_MISSING",
        baselineId: baseline.baselineId,
        itemName,
        rowProvenance: null,
      });
    }
  }
  for (const [key, row] of actual) {
    if (!expected.has(key)) {
      findings.push({
        code: "QUOTED_ITEM_NOT_IN_BASELINE",
        baselineId: baseline.baselineId,
        itemName: row.itemName,
        rowProvenance: row.provenance,
      });
    }
  }
  return { status: "EVALUATED", findings };
};

interface ScannedPdfNames {
  names: string[];
  malformed: boolean;
}

const scanPdfNames = (source: string): ScannedPdfNames => {
  const names: string[] = [];
  let malformed = false;
  const whitespace = /[\u0000\u0009\u000a\u000c\u000d\u0020]/;
  const delimiter = /[()<>\[\]{}/%]/;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character === "%") {
      while (
        index < source.length && source[index] !== "\r" &&
        source[index] !== "\n"
      ) index++;
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
    while (
      index < source.length && !whitespace.test(source[index]) &&
      !delimiter.test(source[index])
    ) index++;
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
  return { names, malformed };
};

interface PdfIndirectObject {
  reference: string;
  body: string;
  bodyByteOffset: number;
}

interface PdfObjectStructure extends PdfIndirectObject {
  dictionary: string;
  dictionaryEntries: Map<string, PdfDictionaryValue>;
  stream?: {
    payloadStart: number;
    payloadEnd: number;
  };
}

const parseIndirectObjects = (source: string): PdfIndirectObject[] | null => {
  const objects: PdfIndirectObject[] = [];
  const seen = new Set<string>();
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
      bodyByteOffset,
    });
    searchFrom = end + "endobj".length;
  }
  return objects.length > 0 ? objects : null;
};

const closingDictionaryIndex = (body: string, start: number): number | null => {
  let depth = 0;
  for (let index = start; index < body.length;) {
    if (body[index] === "%") {
      while (
        index < body.length && body[index] !== "\r" && body[index] !== "\n"
      ) index++;
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

type PdfDictionaryValue =
  | { kind: "name"; value: string; end: number }
  | { kind: "reference"; reference: string; end: number }
  | { kind: "integer"; value: number; end: number }
  | { kind: "other"; end: number };

const pdfWhitespace = /[\u0000\u0009\u000a\u000c\u000d\u0020]/;
const pdfDelimiter = /[()<>\[\]{}/%]/;

const skipPdfWhitespaceAndComments = (
  source: string,
  start: number,
): number => {
  let index = start;
  while (index < source.length) {
    if (pdfWhitespace.test(source[index])) {
      index++;
      continue;
    }
    if (source[index] === "%") {
      while (
        index < source.length && source[index] !== "\r" &&
        source[index] !== "\n"
      ) index++;
      continue;
    }
    break;
  }
  return index;
};

const readPdfName = (
  source: string,
  start: number,
): { value: string; end: number } | null => {
  if (source[start] !== "/") return null;
  let index = start + 1;
  const rawStart = index;
  while (
    index < source.length && !pdfWhitespace.test(source[index]) &&
    !pdfDelimiter.test(source[index])
  ) index++;
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
  return { value, end: index };
};

const consumePdfLiteral = (source: string, start: number): number | null => {
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

const consumePdfArray = (source: string, start: number): number | null => {
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

const readPdfValue = (
  source: string,
  start: number,
): PdfDictionaryValue | null => {
  const index = skipPdfWhitespaceAndComments(source, start);
  if (index >= source.length) return null;
  if (source[index] === "/") {
    const name = readPdfName(source, index);
    return name ? { kind: "name", ...name } : null;
  }
  if (source[index] === "(") {
    const end = consumePdfLiteral(source, index);
    return end === null ? null : { kind: "other", end };
  }
  if (source.startsWith("<<", index)) {
    const end = closingDictionaryIndex(source, index);
    return end === null ? null : { kind: "other", end };
  }
  if (source[index] === "<") {
    const end = source.indexOf(">", index + 1);
    return end === -1 ? null : { kind: "other", end: end + 1 };
  }
  if (source[index] === "[") {
    const end = consumePdfArray(source, index);
    return end === null ? null : { kind: "other", end };
  }
  if (pdfDelimiter.test(source[index])) return null;
  let end = index;
  while (
    end < source.length && !pdfWhitespace.test(source[end]) &&
    !pdfDelimiter.test(source[end])
  ) end++;
  const word = source.slice(index, end);
  if (word.length === 0) return null;
  if (/^\d+$/.test(word)) {
    const secondStart = skipPdfWhitespaceAndComments(source, end);
    let secondEnd = secondStart;
    while (
      secondEnd < source.length && !pdfWhitespace.test(source[secondEnd]) &&
      !pdfDelimiter.test(source[secondEnd])
    ) secondEnd++;
    const second = source.slice(secondStart, secondEnd);
    const thirdStart = skipPdfWhitespaceAndComments(source, secondEnd);
    let thirdEnd = thirdStart;
    while (
      thirdEnd < source.length && !pdfWhitespace.test(source[thirdEnd]) &&
      !pdfDelimiter.test(source[thirdEnd])
    ) thirdEnd++;
    if (/^\d+$/.test(second) && source.slice(thirdStart, thirdEnd) === "R") {
      return {
        kind: "reference",
        reference: `${word} ${second}`,
        end: thirdEnd,
      };
    }
    const value = Number(word);
    if (Number.isSafeInteger(value)) return { kind: "integer", value, end };
  }
  return { kind: "other", end };
};

type PdfContentToken =
  | { kind: "literal"; start: number; end: number }
  | { kind: "operand"; start: number; end: number }
  | { kind: "regular"; start: number; end: number; value: string };

interface PdfContentTokenRead {
  token: PdfContentToken | null;
  next: number;
}

const pdfHexDigit = /[0-9A-Fa-f]/;
const pdfContentNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

const readPdfContentToken = (
  source: string,
  start: number,
): PdfContentTokenRead | null => {
  const index = skipPdfWhitespaceAndComments(source, start);
  if (index >= source.length) return { token: null, next: index };
  if (source[index] === "(") {
    const end = consumePdfLiteral(source, index);
    return end === null
      ? null
      : { token: { kind: "literal", start: index, end }, next: end };
  }
  if (source[index] === "/") {
    const name = readPdfName(source, index);
    return name === null ? null : {
      token: { kind: "operand", start: index, end: name.end },
      next: name.end,
    };
  }
  if (source[index] === "[" || source[index] === "<") {
    const value = readPdfValue(source, index);
    if (value === null) return null;
    if (source[index] === "<" && source[index + 1] !== "<") {
      for (let cursor = index + 1; cursor < value.end - 1; cursor++) {
        if (
          !pdfWhitespace.test(source[cursor]) &&
          !pdfHexDigit.test(source[cursor])
        ) return null;
      }
    }
    return {
      token: { kind: "operand", start: index, end: value.end },
      next: value.end,
    };
  }
  if (pdfDelimiter.test(source[index])) return null;
  let end = index;
  while (
    end < source.length && !pdfWhitespace.test(source[end]) &&
    !pdfDelimiter.test(source[end])
  ) end++;
  if (end === index) return null;
  return {
    token: {
      kind: "regular",
      start: index,
      end,
      value: source.slice(index, end),
    },
    next: end,
  };
};

const decodePdfLiteral = (
  source: string,
  start: number,
  end: number,
): string | null => {
  if (source[start] !== "(" || source[end - 1] !== ")") return null;
  let decoded = "";
  for (let index = start + 1; index < end - 1;) {
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
      while (
        octal.length < 3 && index < end - 1 &&
        source[index] >= "0" && source[index] <= "7"
      ) {
        octal += source[index];
        index++;
      }
      decoded += String.fromCharCode(Number.parseInt(octal, 8) & 0xff);
      continue;
    }
    decoded += ({
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\",
    } as Record<string, string>)[escaped] ?? escaped;
    index++;
  }
  return decoded;
};

const isPdfContentOperandWord = (value: string): boolean =>
  pdfContentNumber.test(value) ||
  value === "true" || value === "false" || value === "null";

const extractedText = (
  source: string,
  page: number,
  streamByteOffset: number,
): ExtractedTextResult => {
  const values: ExtractedLiteralText[] = [];
  const operands: PdfContentToken[] = [];
  let activeTextObject = false;
  let index = 0;
  while (true) {
    const read = readPdfContentToken(source, index);
    if (read === null) return { ok: false };
    index = read.next;
    const token = read.token;
    if (token === null) break;
    if (token.kind !== "regular") {
      if (activeTextObject) operands.push(token);
      continue;
    }
    if (token.value === "BT") {
      if (activeTextObject) return { ok: false };
      activeTextObject = true;
      operands.length = 0;
      continue;
    }
    if (token.value === "ET") {
      if (!activeTextObject) return { ok: false };
      activeTextObject = false;
      operands.length = 0;
      continue;
    }
    if (token.value === "Tj") {
      if (
        activeTextObject && operands.length === 1 &&
        operands[0].kind === "literal"
      ) {
        const literal = operands[0];
        const decoded = decodePdfLiteral(source, literal.start, literal.end);
        if (decoded === null) return { ok: false };
        values.push({
          text: decoded,
          offset: streamByteOffset + new TextEncoder().encode(
            source.slice(0, literal.start),
          ).byteLength,
          page,
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
  return activeTextObject ? { ok: false } : { ok: true, values };
};

const topLevelDictionaryEntries = (
  dictionary: string,
): Map<string, PdfDictionaryValue> | null => {
  if (!dictionary.startsWith("<<")) return null;
  const entries = new Map<string, PdfDictionaryValue>();
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

const isPdfTokenBoundary = (character: string | undefined): boolean =>
  character === undefined || pdfWhitespace.test(character) ||
  pdfDelimiter.test(character);

const lexicalStreamTerminator = (
  body: string,
  payloadStart: number,
): number | null => {
  for (let index = payloadStart; index < body.length;) {
    if (body[index] === "%") {
      while (
        index < body.length && body[index] !== "\r" && body[index] !== "\n"
      ) index++;
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
    if (
      body.startsWith("endstream", index) &&
      isPdfTokenBoundary(body[index - 1]) &&
      isPdfTokenBoundary(body[index + "endstream".length]) &&
      body.slice(index + "endstream".length).trim().length === 0
    ) return index;
    index++;
  }
  return null;
};

const streamExtent = (
  body: string,
  dictionaryEntries: Map<string, PdfDictionaryValue>,
  payloadStart: number,
): { payloadStart: number; payloadEnd: number } | null => {
  const length = dictionaryEntries.get("Length");
  if (length?.kind === "integer") {
    const payloadEnd = payloadStart + length.value;
    if (
      payloadEnd <= body.length &&
      body.startsWith("endstream", payloadEnd) &&
      isPdfTokenBoundary(body[payloadEnd + "endstream".length]) &&
      body.slice(payloadEnd + "endstream".length).trim().length === 0
    ) return { payloadStart, payloadEnd };
  }
  const payloadEnd = lexicalStreamTerminator(body, payloadStart);
  return payloadEnd === null ? null : { payloadStart, payloadEnd };
};

const structuredPdfObjects = (source: string): PdfObjectStructure[] | null => {
  const objects = parseIndirectObjects(source);
  if (!objects) return null;
  const structured: PdfObjectStructure[] = [];
  for (const object of objects) {
    const dictionaryStart = object.body.search(/\S/);
    if (
      dictionaryStart === -1 || !object.body.startsWith("<<", dictionaryStart)
    ) return null;
    const dictionaryEnd = closingDictionaryIndex(object.body, dictionaryStart);
    if (dictionaryEnd === null) return null;
    const dictionary = object.body.slice(dictionaryStart, dictionaryEnd);
    const dictionaryEntries = topLevelDictionaryEntries(dictionary);
    if (!dictionaryEntries) return null;
    const tail = object.body.slice(dictionaryEnd);
    const leadingWhitespace = tail.match(/^\s*/)?.[0].length ?? 0;
    const streamToken = tail.slice(leadingWhitespace).match(
      /^stream(?:\r\n|\n|\r)/,
    )?.[0];
    if (!streamToken) {
      if (tail.trim().length > 0) return null;
      structured.push({ ...object, dictionary, dictionaryEntries });
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
      stream,
    });
  }
  return structured;
};

const maskActualStreamBodies = (
  source: string,
  objects: PdfObjectStructure[],
): string => {
  const characters = source.split("");
  for (const object of objects) {
    if (!object.stream) continue;
    const start = object.bodyByteOffset + object.stream.payloadStart;
    const end = object.bodyByteOffset + object.stream.payloadEnd;
    for (let index = start; index < end; index++) characters[index] = " ";
  }
  return characters.join("");
};

type PageStreamResult =
  | { ok: false; rejection: QuotePdfRejection }
  | {
    ok: true;
    pageCount: number;
    text: ExtractedLiteralText[];
    invalidTextEncoding: boolean;
  };

const parseSupportedPageStreams = (
  objects: PdfObjectStructure[],
  bytes: Uint8Array,
  maxPages: number,
): PageStreamResult => {
  const byReference = new Map(
    objects.map((object) => [object.reference, object]),
  );
  const pages = objects.filter((object) => {
    const type = object.dictionaryEntries.get("Type");
    return type?.kind === "name" && type.value === "Page";
  });
  if (pages.length === 0) {
    return {
      ok: false,
      rejection: {
        code: "CORRUPT_PDF",
        message: "PDF has no readable page objects.",
      },
    };
  }
  if (pages.length > maxPages) {
    return {
      ok: false,
      rejection: {
        code: "PAGE_LIMIT_EXCEEDED",
        message:
          `PDF has ${pages.length} pages, above the ${maxPages}-page intake limit.`,
      },
    };
  }
  const text: ExtractedLiteralText[] = [];
  const referencedStreams = new Set<string>();
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const contents = page.dictionaryEntries.get("Contents");
    if (!contents) {
      if (scanPdfNames(page.dictionary).names.includes("Contents")) {
        return {
          ok: false,
          rejection: {
            code: "CORRUPT_PDF",
            message:
              "Only a top-level direct page content-stream reference is supported.",
          },
        };
      }
      continue;
    }
    if (contents.kind !== "reference") {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message:
            "Only one direct page content-stream reference is supported.",
        },
      };
    }
    const reference = contents.reference;
    if (referencedStreams.has(reference)) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message:
            "A content stream referenced by multiple pages has ambiguous provenance.",
        },
      };
    }
    referencedStreams.add(reference);
    const content = byReference.get(reference);
    if (!content) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "A referenced page content stream is missing.",
        },
      };
    }
    if (!content.stream) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "Page content must contain exactly one supported stream.",
        },
      };
    }
    let payloadEnd = content.stream.payloadEnd;
    if (content.body[payloadEnd - 1] === "\n") payloadEnd--;
    if (content.body[payloadEnd - 1] === "\r") payloadEnd--;
    const absoluteStart = content.bodyByteOffset + content.stream.payloadStart;
    const absoluteEnd = content.bodyByteOffset + payloadEnd;
    let decoded: string;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.slice(absoluteStart, absoluteEnd),
      );
    } catch {
      return {
        ok: true,
        pageCount: pages.length,
        text: [],
        invalidTextEncoding: true,
      };
    }
    const extracted = extractedText(decoded, pageIndex + 1, absoluteStart);
    if (!extracted.ok) {
      return {
        ok: false,
        rejection: {
          code: "CORRUPT_PDF",
          message: "PDF content-stream lexical structure is incomplete.",
        },
      };
    }
    text.push(...extracted.values);
  }
  return {
    ok: true,
    pageCount: pages.length,
    text,
    invalidTextEncoding: false,
  };
};

export const inspectQuotePdfBytes = async (
  input: QuotePdfIntakeInput,
): Promise<QuotePdfIntakeResult> => {
  let frozenBytes: Uint8Array;
  let document: QuotePdfDocumentVersionReference;
  let maxBytes: number;
  let maxPages: number;
  let frozenBaseline: FrozenBaselineResult;
  try {
    frozenBytes = new Uint8Array(input.bytes);
    document = {
      documentVersionId: input.document.documentVersionId,
      caseId: input.document.caseId,
      sha256: input.document.sha256,
    };
    maxBytes = input.options?.maxBytes ?? DEFAULT_MAX_BYTES;
    maxPages = input.options?.maxPages ?? DEFAULT_MAX_PAGES;
    frozenBaseline = freezeBaseline(input.baseline);
  } catch {
    return reject(
      "DOCUMENT_REFERENCE_INVALID",
      "PDF intake input could not be safely snapshotted.",
    );
  }
  if (
    !Number.isInteger(maxBytes) || maxBytes <= 0 ||
    !Number.isInteger(maxPages) || maxPages <= 0
  ) {
    return reject(
      "DOCUMENT_REFERENCE_INVALID",
      "PDF intake limits must be positive integers.",
    );
  }
  if (
    !hasIdentity(document.documentVersionId) || !hasIdentity(document.caseId) ||
    !sha256.test(document.sha256)
  ) {
    return reject(
      "DOCUMENT_REFERENCE_INVALID",
      "A case-bound immutable document version and lowercase SHA-256 are required.",
    );
  }
  if (frozenBytes.byteLength > maxBytes) {
    return reject(
      "FILE_TOO_LARGE",
      `PDF bytes exceed the ${maxBytes}-byte intake limit.`,
    );
  }
  const digestBuffer = new ArrayBuffer(frozenBytes.byteLength);
  new Uint8Array(digestBuffer).set(frozenBytes);
  const actualHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", digestBuffer)),
  )
    .map((value) => value.toString(16).padStart(2, "0")).join("");
  if (actualHash !== document.sha256) {
    return reject(
      "DOCUMENT_HASH_MISMATCH",
      "PDF bytes do not match the bound immutable document version SHA-256.",
    );
  }
  let source: string;
  try {
    source = new TextDecoder("latin1", { fatal: true }).decode(frozenBytes);
  } catch {
    return reject(
      "CORRUPT_PDF",
      "PDF bytes cannot be decoded for safe structural inspection.",
    );
  }
  if (!source.startsWith("%PDF-") || !source.includes("%%EOF")) {
    return reject("CORRUPT_PDF", "PDF header or EOF marker is missing.");
  }
  const objects = structuredPdfObjects(source);
  if (!objects) {
    return reject(
      "CORRUPT_PDF",
      "PDF indirect-object structure is incomplete.",
    );
  }
  const hasStructuralActiveTrigger = objects.some(({ dictionaryEntries }) =>
    ["OpenAction", "AA", "A"].some((trigger) => dictionaryEntries.has(trigger))
  );
  const scannedNames = scanPdfNames(maskActualStreamBodies(source, objects));
  if (scannedNames.malformed) {
    return reject(
      "CORRUPT_PDF",
      "PDF contains a malformed name or literal token.",
    );
  }
  if (
    hasStructuralActiveTrigger ||
    scannedNames.names.some((name) =>
      ["JavaScript", "JS", "Launch", "RichMedia", "EmbeddedFile"].includes(name)
    )
  ) {
    return reject(
      "UNSUPPORTED_ACTIVE_CONTENT",
      "PDF active content is not accepted for quote extraction.",
    );
  }
  if (scannedNames.names.includes("Encrypt")) {
    return reject(
      "ENCRYPTED_PDF",
      "Encrypted PDFs require a separate authorized decryption flow.",
    );
  }
  if (scannedNames.names.includes("Filter")) {
    return reject(
      "UNSUPPORTED_COMPRESSED_CONTENT",
      "Compressed PDF content is outside this literal-text intake contract.",
    );
  }
  const parsedPages = parseSupportedPageStreams(objects, frozenBytes, maxPages);
  if (!parsedPages.ok) {
    return { accepted: false, rejection: parsedPages.rejection };
  }
  const imageOnly = parsedPages.text.length === 0 &&
    !parsedPages.invalidTextEncoding &&
    scannedNames.names.includes("Image");
  const readability = parsedPages.text.length > 0
    ? "TEXT_LAYER"
    : imageOnly
    ? "IMAGE_ONLY"
    : "NO_EXTRACTABLE_TEXT";
  const rows = toQuoteRows(parsedPages.text, document);
  const limitations: QuotePdfLimitation[] = [];
  if (imageOnly) {
    limitations.push({
      code: "OCR_NOT_PERFORMED",
      message:
        "This scanned PDF has no readable text layer; no OCR facts were created.",
    });
  }
  if (parsedPages.invalidTextEncoding) {
    limitations.push({
      code: "INVALID_TEXT_ENCODING",
      message:
        "A page content stream is not valid UTF-8, so no text facts were created.",
    });
  }
  if (rows.length === 0) {
    limitations.push({
      code: "NO_STRUCTURED_QUOTE_ROWS",
      message:
        "No complete five-column quote rows were found in the supported literal-text format.",
    });
  }
  if (frozenBaseline.invalid) {
    limitations.push({
      code: "BASELINE_INVALID",
      message:
        "The comparison baseline is not a closed immutable identifier with valid item values.",
    });
  }
  return {
    accepted: true,
    inspection: {
      byteLength: frozenBytes.byteLength,
      pageCount: parsedPages.pageCount,
      readability,
    },
    facts: { rows },
    limitations,
    comparison: compareAgainstBaseline(
      rows,
      frozenBaseline.baseline,
      readability === "TEXT_LAYER" && rows.length > 0,
    ),
  };
};

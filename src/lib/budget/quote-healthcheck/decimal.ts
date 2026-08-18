import type { QuoteNumber, UnknownNumberReason } from "./types.ts";

interface DecimalParts {
  coefficient: bigint;
  scale: number;
}

const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

const pow10 = (exponent: number): bigint => 10n ** BigInt(exponent);

const normalizeParts = (parts: DecimalParts): DecimalParts => {
  let { coefficient, scale } = parts;
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
};

const parseParts = (value: string): DecimalParts | null => {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const fraction = match[3] ?? "";
  const sign = match[1] === "-" ? -1n : 1n;
  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  return normalizeParts({
    coefficient: sign * BigInt(digits),
    scale: fraction.length,
  });
};

const formatParts = (parts: DecimalParts, fixedScale?: number): string => {
  const targetScale = fixedScale ?? parts.scale;
  const negative = parts.coefficient < 0n;
  const absolute = negative ? -parts.coefficient : parts.coefficient;
  const digits = absolute.toString().padStart(targetScale + 1, "0");
  const whole = targetScale === 0 ? digits : digits.slice(0, -targetScale);
  const fraction = targetScale === 0 ? "" : digits.slice(-targetScale);
  return `${negative ? "-" : ""}${whole}${
    targetScale === 0 ? "" : `.${fraction}`
  }`;
};

const roundParts = (parts: DecimalParts, targetScale: number): DecimalParts => {
  if (!Number.isInteger(targetScale) || targetScale < 0) {
    throw new Error("INVALID_DECIMAL_SCALE");
  }
  if (parts.scale <= targetScale) {
    return {
      coefficient: parts.coefficient * pow10(targetScale - parts.scale),
      scale: targetScale,
    };
  }
  const divisor = pow10(parts.scale - targetScale);
  const negative = parts.coefficient < 0n;
  const absolute = negative ? -parts.coefficient : parts.coefficient;
  let quotient = absolute / divisor;
  const remainder = absolute % divisor;
  if (remainder * 2n >= divisor) quotient += 1n;
  return {
    coefficient: negative ? -quotient : quotient,
    scale: targetScale,
  };
};

const unknown = (reason: UnknownNumberReason): QuoteNumber => ({
  status: "UNKNOWN",
  value: null,
  reason,
});

export const parseQuoteNumber = (value: unknown): QuoteNumber => {
  if (value === null || value === undefined) return unknown("EMPTY");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return unknown("NON_FINITE");
    const parsed = parseParts(String(value));
    return parsed
      ? { status: "KNOWN", value: formatParts(parsed) }
      : unknown("INVALID");
  }
  if (typeof value !== "string") return unknown("INVALID");
  const trimmed = value.trim();
  if (!trimmed) return unknown("EMPTY");
  if (/^[+-]?(?:NaN|Infinity)$/i.test(trimmed)) return unknown("NON_FINITE");
  const parsed = parseParts(trimmed);
  return parsed
    ? { status: "KNOWN", value: formatParts(parsed) }
    : unknown("INVALID");
};

const requireParts = (value: string): DecimalParts => {
  const parsed = parseParts(value);
  if (!parsed) throw new Error("INVALID_DECIMAL");
  return parsed;
};

export const roundQuoteDecimal = (value: string, scale: number): string =>
  formatParts(roundParts(requireParts(value), scale), scale);

export const multiplyQuoteDecimals = (
  values: string[],
  scale: number,
): string => {
  if (values.length === 0) throw new Error("DECIMAL_VALUES_REQUIRED");
  const product = values.map(requireParts).reduce<DecimalParts>(
    (result, item) => ({
      coefficient: result.coefficient * item.coefficient,
      scale: result.scale + item.scale,
    }),
    { coefficient: 1n, scale: 0 },
  );
  return formatParts(roundParts(product, scale), scale);
};

export const addQuoteDecimals = (values: string[], scale: number): string => {
  if (values.length === 0) throw new Error("DECIMAL_VALUES_REQUIRED");
  const parts = values.map(requireParts);
  const commonScale = Math.max(...parts.map((item) => item.scale));
  const coefficient = parts.reduce(
    (sum, item) => sum + item.coefficient * pow10(commonScale - item.scale),
    0n,
  );
  return formatParts(
    roundParts({ coefficient, scale: commonScale }, scale),
    scale,
  );
};

export const quoteDecimalsEqual = (
  left: string,
  right: string,
  scale: number,
): boolean =>
  roundQuoteDecimal(left, scale) === roundQuoteDecimal(right, scale);

export const PDF_DIMENSION_SCALE_SCHEMA = "laibe.pdfDimensionScaleDecision.v1";

const UNIT_TO_MM = Object.freeze({ mm: 1, cm: 10, m: 1000 });
const UNIT_ORDER = Object.freeze(["mm", "cm", "m"]);
const MAX_AXIS_ERROR_PCT = 1;
const MIN_BUILDING_MM_PER_PT = 5;
const MAX_BUILDING_MM_PER_PT = 100;
const MIN_REGION_WORLD_MM = 1500;
const MAX_REGION_WORLD_MM = 200000;
const ENDPOINT_TOLERANCE_PT = 1.5;
const MAX_PERPENDICULAR_DOT = 0.25;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(Number(value) * scale) / scale;
}

function sourceIdOf(value, fallback) {
  return String(
    value?.sourceId ??
    value?.source_id ??
    value?.id ??
    fallback ??
    ""
  );
}

function pointOf(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const x = finiteNumber(value[0]);
    const y = finiteNumber(value[1]);
    return x == null || y == null ? null : { x, y };
  }
  if (!value || typeof value !== "object") return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  return x == null || y == null ? null : { x, y };
}

function lineOf(value) {
  if (!value || typeof value !== "object") return null;
  const from = pointOf(value.from ?? value.start ?? value.p1) ?? (
    finiteNumber(value.x1) != null && finiteNumber(value.y1) != null
      ? { x: Number(value.x1), y: Number(value.y1) }
      : null
  );
  const to = pointOf(value.to ?? value.end ?? value.p2) ?? (
    finiteNumber(value.x2) != null && finiteNumber(value.y2) != null
      ? { x: Number(value.x2), y: Number(value.y2) }
      : null
  );
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!(length > 0)) return null;
  return {
    sourceId: sourceIdOf(value),
    from,
    to,
    dx,
    dy,
    length,
    orientation: Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical"
  };
}

function bboxOf(value) {
  const raw = value?.bboxPt ?? value?.bbox ?? value?.sourceBBox ?? value?.boundsPt;
  if (Array.isArray(raw) && raw.length >= 4) {
    const values = raw.slice(0, 4).map(finiteNumber);
    if (values.every((entry) => entry != null)) {
      return { x0: values[0], y0: values[1], x1: values[2], y1: values[3] };
    }
  }
  if (raw && typeof raw === "object") {
    const values = [raw.x0, raw.y0, raw.x1, raw.y1].map(finiteNumber);
    if (values.every((entry) => entry != null)) {
      return { x0: values[0], y0: values[1], x1: values[2], y1: values[3] };
    }
  }
  const center = pointOf(value?.centerPt ?? value?.center);
  return center
    ? { x0: center.x, y0: center.y, x1: center.x, y1: center.y }
    : null;
}

function normalizedBounds(value) {
  const bounds = bboxOf({ bboxPt: value });
  if (!bounds) return null;
  return {
    x0: Math.min(bounds.x0, bounds.x1),
    y0: Math.min(bounds.y0, bounds.y1),
    x1: Math.max(bounds.x0, bounds.x1),
    y1: Math.max(bounds.y0, bounds.y1)
  };
}

function centerOfBounds(bounds) {
  return {
    x: (bounds.x0 + bounds.x1) / 2,
    y: (bounds.y0 + bounds.y1) / 2
  };
}

function pointInside(point, bounds, tolerance = 1e-6) {
  return Boolean(
    point &&
    bounds &&
    point.x >= bounds.x0 - tolerance &&
    point.x <= bounds.x1 + tolerance &&
    point.y >= bounds.y0 - tolerance &&
    point.y <= bounds.y1 + tolerance
  );
}

function lineInside(line, bounds) {
  return pointInside(line?.from, bounds) && pointInside(line?.to, bounds);
}

function bboxInside(box, bounds) {
  return Boolean(
    box &&
    pointInside({ x: box.x0, y: box.y0 }, bounds) &&
    pointInside({ x: box.x1, y: box.y1 }, bounds)
  );
}

function distancePointToSegment(point, line) {
  const denominator = line.dx * line.dx + line.dy * line.dy;
  const projection = denominator
    ? ((point.x - line.from.x) * line.dx + (point.y - line.from.y) * line.dy) / denominator
    : 0;
  const bounded = Math.max(0, Math.min(1, projection));
  return Math.hypot(
    point.x - (line.from.x + line.dx * bounded),
    point.y - (line.from.y + line.dy * bounded)
  );
}

function perpendicularEnough(dimensionLine, witnessLine) {
  const dot = (
    dimensionLine.dx / dimensionLine.length * witnessLine.dx / witnessLine.length +
    dimensionLine.dy / dimensionLine.length * witnessLine.dy / witnessLine.length
  );
  return Math.abs(dot) <= MAX_PERPENDICULAR_DOT;
}

function parseDisplayedDimension(value) {
  const displayedValue = String(
    value?.text ??
    value?.displayedValue ??
    value?.value ??
    ""
  ).trim();
  const match = displayedValue
    .replace(/,/g, "")
    .match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m|毫米|公分|公尺)?/i);
  if (!match) return null;
  const number = Number(match[1]);
  if (!(number > 0)) return null;
  const token = String(match[2] || "").toLowerCase();
  const unit = token === "mm" || token === "毫米"
    ? "mm"
    : token === "cm" || token === "公分"
      ? "cm"
      : token === "m" || token === "公尺"
        ? "m"
        : null;
  return { displayedValue, number, unit };
}

function normalizedUnit(value) {
  const token = String(value || "").trim().toLowerCase();
  if (token === "mm" || token === "毫米") return "mm";
  if (token === "cm" || token === "公分") return "cm";
  if (token === "m" || token === "公尺") return "m";
  return null;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`
  ).join(",")}}`;
}

function utf8Bytes(value) {
  const bytes = [];
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | codePoint >>> 6, 0x80 | codePoint & 0x3f);
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | codePoint >>> 12,
        0x80 | codePoint >>> 6 & 0x3f,
        0x80 | codePoint & 0x3f
      );
    } else {
      bytes.push(
        0xf0 | codePoint >>> 18,
        0x80 | codePoint >>> 12 & 0x3f,
        0x80 | codePoint >>> 6 & 0x3f,
        0x80 | codePoint & 0x3f
      );
    }
  }
  return bytes;
}

function sha256(value) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push(high >>> shift & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push(low >>> shift & 0xff);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array(64);
    for (let index = 0; index < 16; index += 1) {
      const byteIndex = offset + index * 4;
      words[index] = (
        bytes[byteIndex] << 24 |
        bytes[byteIndex + 1] << 16 |
        bytes[byteIndex + 2] << 8 |
        bytes[byteIndex + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15];
      const previous2 = words[index - 2];
      const sigma0 = (
        (previous15 >>> 7 | previous15 << 25) ^
        (previous15 >>> 18 | previous15 << 14) ^
        previous15 >>> 3
      ) >>> 0;
      const sigma1 = (
        (previous2 >>> 17 | previous2 << 15) ^
        (previous2 >>> 19 | previous2 << 13) ^
        previous2 >>> 10
      ) >>> 0;
      words[index] = (
        words[index - 16] + sigma0 + words[index - 7] + sigma1
      ) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = (
        (e >>> 6 | e << 26) ^
        (e >>> 11 | e << 21) ^
        (e >>> 25 | e << 7)
      ) >>> 0;
      const choice = (e & f ^ ~e & g) >>> 0;
      const temporary1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = (
        (a >>> 2 | a << 30) ^
        (a >>> 13 | a << 19) ^
        (a >>> 22 | a << 10)
      ) >>> 0;
      const majority = (a & b ^ a & c ^ b & c) >>> 0;
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((entry, index) => {
      hash[index] = (hash[index] + entry) >>> 0;
    });
  }
  return hash.map((entry) => entry.toString(16).padStart(8, "0")).join("");
}

function pairEvidence(input, regionBounds) {
  const selectedRegionId = String(input?.selectedRegionId || "");
  const prevalidated = Array.isArray(input?.pairedDimensionEvidence)
    ? input.pairedDimensionEvidence
    : [];
  if (prevalidated.length) {
    return prevalidated.map((row, index) => {
      const endpoints = row?.endpointsPt ?? row?.endpointsPdfPt ?? {
        from: row?.from,
        to: row?.to
      };
      const line = lineOf({
        sourceId: row?.dimensionLineSourceId ?? row?.axisId,
        from: endpoints?.from,
        to: endpoints?.to
      });
      const parsed = parseDisplayedDimension({
        text: row?.displayedValue ?? row?.rawLabel ?? row?.numericValue
      });
      const witnessLineSourceIds = Array.from(new Set(
        (row?.witnessLineSourceIds ?? row?.witnessLineIds ?? [])
          .map(String)
          .filter(Boolean)
      )).sort();
      const valid = Boolean(
        line &&
        parsed &&
        row?.chainCompatible === true &&
        witnessLineSourceIds.length >= 2 &&
        Number(row?.pairScore) >= 0.8 &&
        Number(row?.runnerUpMargin) >= 0.12
      );
      if (!valid) return null;
      const sourceRegionId = String(row?.sourceRegionId || "");
      return {
        orientation: String(row?.orientation || line.orientation),
        dimensionTextSourceId: String(
          row?.dimensionTextSourceId ??
          row?.labelId ??
          `paired-dimension-text-${index}`
        ),
        dimensionLineSourceId: String(
          row?.dimensionLineSourceId ??
          row?.axisId ??
          line.sourceId ??
          `paired-dimension-line-${index}`
        ),
        witnessLineSourceIds,
        displayedValue: parsed.displayedValue,
        parsedValue: finiteNumber(row?.numericValue) ?? parsed.number,
        explicitUnit: normalizedUnit(row?.explicitUnit) ?? parsed.unit,
        measuredLengthPt: line.length,
        evidenceInside: Boolean(
          sourceRegionId === selectedRegionId &&
          lineInside(line, regionBounds)
        )
      };
    }).filter(Boolean).sort((left, right) => {
      const orientationDifference =
        (left.orientation === "horizontal" ? 0 : 1) -
        (right.orientation === "horizontal" ? 0 : 1);
      return (
        orientationDifference ||
        left.dimensionLineSourceId.localeCompare(right.dimensionLineSourceId)
      );
    });
  }

  const rawTexts = Array.isArray(input?.dimensionTexts) ? input.dimensionTexts : [];
  const lines = (Array.isArray(input?.dimensionLines) ? input.dimensionLines : [])
    .map((raw, index) => ({ raw, line: lineOf(raw), fallback: `dimension-line-${index}` }))
    .filter((entry) => entry.line)
    .map((entry) => ({
      ...entry,
      line: {
        ...entry.line,
        sourceId: entry.line.sourceId || entry.fallback
      }
    }))
    .sort((left, right) => left.line.sourceId.localeCompare(right.line.sourceId));
  const witnesses = (Array.isArray(input?.witnessLines) ? input.witnessLines : [])
    .map((raw, index) => ({ raw, line: lineOf(raw), fallback: `witness-line-${index}` }))
    .filter((entry) => entry.line)
    .map((entry) => ({
      ...entry,
      line: {
        ...entry.line,
        sourceId: entry.line.sourceId || entry.fallback
      }
    }));
  const texts = rawTexts.map((raw, index) => ({
    raw,
    sourceId: sourceIdOf(raw, `dimension-text-${index}`),
    parsed: parseDisplayedDimension(raw),
    bbox: bboxOf(raw),
    dimensionLineSourceId: String(
      raw?.dimensionLineSourceId ??
      raw?.dimension_line_source_id ??
      ""
    )
  })).filter((entry) => entry.parsed && entry.bbox);
  const usedTextIds = new Set();
  const pairs = [];

  for (const { line } of lines) {
    const endpointWitnesses = [line.from, line.to].map((endpoint) => witnesses
      .filter((candidate) =>
        perpendicularEnough(line, candidate.line) &&
        distancePointToSegment(endpoint, candidate.line) <= ENDPOINT_TOLERANCE_PT
      )
      .sort((left, right) => {
        const distanceDifference =
          distancePointToSegment(endpoint, left.line) -
          distancePointToSegment(endpoint, right.line);
        return distanceDifference || left.line.sourceId.localeCompare(right.line.sourceId);
      })[0] || null);
    if (
      !endpointWitnesses[0] ||
      !endpointWitnesses[1] ||
      endpointWitnesses[0].line.sourceId === endpointWitnesses[1].line.sourceId
    ) {
      continue;
    }

    const maximumTextDistance = Math.max(24, Math.min(72, line.length * 0.2));
    const matchingTexts = texts.filter((candidate) => {
      if (usedTextIds.has(candidate.sourceId)) return false;
      if (
        candidate.dimensionLineSourceId &&
        candidate.dimensionLineSourceId !== line.sourceId
      ) {
        return false;
      }
      return distancePointToSegment(centerOfBounds(candidate.bbox), line) <= maximumTextDistance;
    }).sort((left, right) => {
      const leftExplicit = left.dimensionLineSourceId === line.sourceId ? 0 : 1;
      const rightExplicit = right.dimensionLineSourceId === line.sourceId ? 0 : 1;
      if (leftExplicit !== rightExplicit) return leftExplicit - rightExplicit;
      const distanceDifference =
        distancePointToSegment(centerOfBounds(left.bbox), line) -
        distancePointToSegment(centerOfBounds(right.bbox), line);
      return distanceDifference || left.sourceId.localeCompare(right.sourceId);
    });
    const text = matchingTexts[0];
    if (!text) continue;
    usedTextIds.add(text.sourceId);

    const evidenceInside = Boolean(
      lineInside(line, regionBounds) &&
      bboxInside(text.bbox, regionBounds) &&
      endpointWitnesses.every((entry) => lineInside(entry.line, regionBounds))
    );
    pairs.push({
      orientation: line.orientation,
      dimensionTextSourceId: text.sourceId,
      dimensionLineSourceId: line.sourceId,
      witnessLineSourceIds: endpointWitnesses.map((entry) => entry.line.sourceId),
      displayedValue: text.parsed.displayedValue,
      parsedValue: text.parsed.number,
      explicitUnit: text.parsed.unit,
      measuredLengthPt: line.length,
      evidenceInside
    });
  }

  return pairs.sort((left, right) => {
    const orientationDifference =
      (left.orientation === "horizontal" ? 0 : 1) -
      (right.orientation === "horizontal" ? 0 : 1);
    return (
      orientationDifference ||
      left.dimensionLineSourceId.localeCompare(right.dimensionLineSourceId)
    );
  });
}

function clusterRatios(evidence) {
  const sorted = [...evidence].sort((left, right) =>
    left.worldMmPerPt - right.worldMmPerPt ||
    left.dimensionLineSourceId.localeCompare(right.dimensionLineSourceId)
  );
  const clusters = [];
  for (const entry of sorted) {
    const cluster = clusters.find((candidate) => {
      const average = candidate.reduce(
        (sum, value) => sum + value.worldMmPerPt,
        0
      ) / candidate.length;
      return Math.abs(entry.worldMmPerPt - average) /
        Math.max(average, 1e-9) * 100 <= MAX_AXIS_ERROR_PCT;
    });
    if (cluster) cluster.push(entry);
    else clusters.push([entry]);
  }
  return clusters.sort((left, right) => {
    const leftAxes = new Set(left.map((entry) => entry.orientation)).size;
    const rightAxes = new Set(right.map((entry) => entry.orientation)).size;
    return (
      rightAxes - leftAxes ||
      right.length - left.length ||
      left[0].worldMmPerPt - right[0].worldMmPerPt
    );
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function evaluateUnit(pairs, unit, regionBounds) {
  const multiplier = UNIT_TO_MM[unit];
  const evidence = pairs.map((pair) => ({
    ...pair,
    interpretedLengthMm: pair.parsedValue * multiplier,
    worldMmPerPt: pair.parsedValue * multiplier / pair.measuredLengthPt
  }));
  const clusters = clusterRatios(evidence);
  const dominant = clusters[0] || [];
  const horizontal = dominant.filter((entry) => entry.orientation === "horizontal");
  const vertical = dominant.filter((entry) => entry.orientation === "vertical");
  const worldMmPerPtX = horizontal.length
    ? mean(horizontal.map((entry) => entry.worldMmPerPt))
    : 0;
  const worldMmPerPtY = vertical.length
    ? mean(vertical.map((entry) => entry.worldMmPerPt))
    : 0;
  const consistencyErrorPct = worldMmPerPtX && worldMmPerPtY
    ? Math.abs(worldMmPerPtX - worldMmPerPtY) /
      Math.min(worldMmPerPtX, worldMmPerPtY) * 100
    : 100;
  const acceptedWorldMmPerPt = worldMmPerPtX && worldMmPerPtY
    ? (worldMmPerPtX + worldMmPerPtY) / 2
    : worldMmPerPtX || worldMmPerPtY || 0;
  const regionWidthMm = (regionBounds.x1 - regionBounds.x0) * acceptedWorldMmPerPt;
  const regionHeightMm = (regionBounds.y1 - regionBounds.y0) * acceptedWorldMmPerPt;
  const plausibleScale = (
    acceptedWorldMmPerPt >= MIN_BUILDING_MM_PER_PT &&
    acceptedWorldMmPerPt <= MAX_BUILDING_MM_PER_PT &&
    regionWidthMm >= MIN_REGION_WORLD_MM &&
    regionWidthMm <= MAX_REGION_WORLD_MM &&
    regionHeightMm >= MIN_REGION_WORLD_MM &&
    regionHeightMm <= MAX_REGION_WORLD_MM
  );
  const independentAxisCount = new Set(dominant.map((entry) => entry.orientation)).size;
  const pass = Boolean(
    clusters.length === 1 &&
    independentAxisCount === 2 &&
    consistencyErrorPct <= MAX_AXIS_ERROR_PCT &&
    plausibleScale
  );

  return {
    unit,
    pass,
    clusterCount: clusters.length,
    independentAxisCount,
    consistencyErrorPct,
    worldMmPerPtX,
    worldMmPerPtY,
    acceptedWorldMmPerPt,
    axes: dominant.map((entry) => ({
      orientation: entry.orientation,
      dimensionTextSourceId: entry.dimensionTextSourceId,
      dimensionLineSourceId: entry.dimensionLineSourceId,
      witnessLineSourceIds: [...entry.witnessLineSourceIds],
      displayedValue: entry.displayedValue,
      interpretedLengthMm: round(entry.interpretedLengthMm),
      measuredLengthPt: round(entry.measuredLengthPt),
      worldMmPerPt: round(entry.worldMmPerPt)
    }))
  };
}

function rejectedDecision(selectedRegionId, audit, evaluation = null) {
  return {
    schema: PDF_DIMENSION_SCALE_SCHEMA,
    status: "rejected",
    confidence: 0,
    selectedRegionId,
    inferredUnit: evaluation?.unit ?? null,
    worldMmPerPtX: round(evaluation?.worldMmPerPtX || 0),
    worldMmPerPtY: round(evaluation?.worldMmPerPtY || 0),
    acceptedWorldMmPerPt: round(evaluation?.acceptedWorldMmPerPt || 0),
    axes: evaluation?.axes || [],
    audit
  };
}

export function decidePdfDimensionScale(input) {
  const selectedRegionId = String(input?.selectedRegionId || "");
  const regionBounds = normalizedBounds(input?.regionBoundsPt);
  if (!selectedRegionId || !regionBounds) {
    return rejectedDecision(selectedRegionId, {
      independentAxisCount: 0,
      unitSolutionCount: 0,
      consistencyErrorPct: 0,
      competingScaleClusterCount: 0,
      allEvidenceInsideSelectedRegion: false,
      pass: false
    });
  }

  const pairs = pairEvidence(input, regionBounds);
  const independentAxisCount = new Set(pairs.map((entry) => entry.orientation)).size;
  const allEvidenceInsideSelectedRegion = Boolean(
    pairs.length && pairs.every((entry) => entry.evidenceInside)
  );
  const explicitUnits = new Set(
    pairs.map((entry) => entry.explicitUnit).filter(Boolean)
  );
  const hypotheses = explicitUnits.size > 1
    ? []
    : explicitUnits.size === 1
      ? [...explicitUnits]
      : [...UNIT_ORDER];
  const evaluations = hypotheses.map((unit) => evaluateUnit(pairs, unit, regionBounds));
  const validEvaluations = evaluations.filter((evaluation) => evaluation.pass);
  const best = validEvaluations[0] || [...evaluations].sort((left, right) => (
    right.independentAxisCount - left.independentAxisCount ||
    left.clusterCount - right.clusterCount ||
    left.consistencyErrorPct - right.consistencyErrorPct ||
    UNIT_ORDER.indexOf(left.unit) - UNIT_ORDER.indexOf(right.unit)
  ))[0] || null;
  const audit = {
    independentAxisCount,
    unitSolutionCount: validEvaluations.length,
    consistencyErrorPct: round(best?.consistencyErrorPct || 0),
    competingScaleClusterCount: Math.max(0, Number(best?.clusterCount || 1) - 1),
    allEvidenceInsideSelectedRegion,
    pass: Boolean(
      validEvaluations.length === 1 &&
      allEvidenceInsideSelectedRegion &&
      independentAxisCount === 2
    )
  };
  if (!audit.pass) return rejectedDecision(selectedRegionId, audit, best);

  const confidence = round(
    Math.max(0.98, 0.99 - Math.min(0.01, best.consistencyErrorPct / 100))
  );
  return {
    schema: PDF_DIMENSION_SCALE_SCHEMA,
    status: "passed",
    confidence,
    selectedRegionId,
    inferredUnit: best.unit,
    worldMmPerPtX: round(best.worldMmPerPtX),
    worldMmPerPtY: round(best.worldMmPerPtY),
    acceptedWorldMmPerPt: round(best.acceptedWorldMmPerPt),
    axes: best.axes,
    audit
  };
}

export function stableScaleDecisionHash(decision) {
  return sha256(stableStringify(decision));
}

const publicApi = Object.freeze({
  PDF_DIMENSION_SCALE_SCHEMA,
  decidePdfDimensionScale,
  stableScaleDecisionHash
});

if (typeof window !== "undefined") {
  window.LaibePdfDimensionScaleDecision = publicApi;
}

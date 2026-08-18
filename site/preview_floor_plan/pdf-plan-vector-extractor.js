(function (global) {
  "use strict";

  const FALLBACK_OPS = {
    setLineWidth: 2,
    save: 10,
    restore: 11,
    transform: 12,
    moveTo: 13,
    lineTo: 14,
    curveTo: 15,
    curveTo2: 16,
    curveTo3: 17,
    closePath: 18,
    rectangle: 19,
    stroke: 20,
    closeStroke: 21,
    fill: 22,
    eoFill: 23,
    fillStroke: 24,
    eoFillStroke: 25,
    closeFillStroke: 26,
    closeEOFillStroke: 27,
    constructPath: 91
  };
  const DRAW_OPS = {
    moveTo: 13,
    lineTo: 14,
    curveTo: 15,
    curveTo2: 16,
    curveTo3: 17,
    closePath: 18,
    rectangle: 19
  };
  const IDENTITY = [1, 0, 0, 1, 0, 0];

  function getOps(pdfjsLib) {
    return { ...FALLBACK_OPS, ...(pdfjsLib && pdfjsLib.OPS ? pdfjsLib.OPS : {}) };
  }

  function getDrawOps(pdfjsLib) {
    return { ...DRAW_OPS, ...(pdfjsLib && pdfjsLib.OPS ? pdfjsLib.OPS : {}) };
  }

  function cloneMatrix(matrix) {
    return Array.isArray(matrix) ? matrix.slice(0, 6) : IDENTITY.slice();
  }

  function multiplyMatrix(first, second) {
    const a1 = first[0], b1 = first[1], c1 = first[2], d1 = first[3], e1 = first[4], f1 = first[5];
    const a2 = second[0], b2 = second[1], c2 = second[2], d2 = second[3], e2 = second[4], f2 = second[5];
    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1
    ];
  }

  function matrixScale(matrix) {
    if (!Array.isArray(matrix)) {
      return 1;
    }
    const sx = Math.hypot(Number(matrix[0]) || 0, Number(matrix[1]) || 0);
    const sy = Math.hypot(Number(matrix[2]) || 0, Number(matrix[3]) || 0);
    if (sx > 0 && sy > 0) {
      return (sx + sy) / 2;
    }
    return sx || sy || 1;
  }

  function deviceLineWidth(lineWidth, matrix, viewportMatrix) {
    const width = Math.abs(Number(lineWidth) || 0);
    if (!width) {
      return 0;
    }
    return width * matrixScale(multiplyMatrix(viewportMatrix, matrix));
  }

  function applyMatrix(matrix, x, y) {
    return {
      x: matrix[0] * x + matrix[2] * y + matrix[4],
      y: matrix[1] * x + matrix[3] * y + matrix[5]
    };
  }

  function round(value, digits) {
    const factor = 10 ** (digits || 2);
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function roundPoint(point) {
    return { x: round(point.x, 2), y: round(point.y, 2) };
  }

  function distance(from, to) {
    return Math.hypot(to.x - from.x, to.y - from.y);
  }

  function asArrayLike(value) {
    if (!value) {
      return [];
    }
    if (ArrayBuffer.isView(value)) {
      return value;
    }
    if (Array.isArray(value) && value.length === 1 && ArrayBuffer.isView(value[0])) {
      return value[0];
    }
    if (Array.isArray(value) && value.length === 1 && Array.isArray(value[0])) {
      return value[0];
    }
    return Array.isArray(value) || typeof value.length === "number" ? value : [];
  }

  function transformBBox(rawBBox, matrix, viewportMatrix) {
    const values = asArrayLike(rawBBox);
    if (values.length < 4) {
      return null;
    }
    const corners = [
      [values[0], values[1]],
      [values[0], values[3]],
      [values[2], values[1]],
      [values[2], values[3]]
    ];
    const pagePoints = corners.map(([x, y]) => applyMatrix(matrix, x, y));
    const canvasPoints = pagePoints.map((point) => applyMatrix(viewportMatrix, point.x, point.y));
    return {
      page: boxFromPoints(pagePoints),
      canvas: boxFromPoints(canvasPoints)
    };
  }

  function boxFromPoints(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const x1 = Math.max(...xs);
    const y1 = Math.max(...ys);
    return {
      x0: round(x0, 2),
      y0: round(y0, 2),
      x1: round(x1, 2),
      y1: round(y1, 2),
      width: round(x1 - x0, 2),
      height: round(y1 - y0, 2)
    };
  }

  function unionBoxes(first, second) {
    if (!first) {
      return second || null;
    }
    if (!second) {
      return first;
    }
    return {
      x0: round(Math.min(first.x0, second.x0), 2),
      y0: round(Math.min(first.y0, second.y0), 2),
      x1: round(Math.max(first.x1, second.x1), 2),
      y1: round(Math.max(first.y1, second.y1), 2),
      width: round(Math.max(first.x1, second.x1) - Math.min(first.x0, second.x0), 2),
      height: round(Math.max(first.y1, second.y1) - Math.min(first.y0, second.y0), 2)
    };
  }

  function paintKind(paintOp, ops) {
    if (paintOp === ops.stroke || paintOp === ops.closeStroke) {
      return "stroke";
    }
    if (
      paintOp === ops.fillStroke ||
      paintOp === ops.eoFillStroke ||
      paintOp === ops.closeFillStroke ||
      paintOp === ops.closeEOFillStroke
    ) {
      return "fill-stroke";
    }
    if (paintOp === ops.fill || paintOp === ops.eoFill) {
      return "fill";
    }
    return "unknown";
  }

  function isStrokePaint(kind) {
    return kind === "stroke" || kind === "fill-stroke";
  }

  function isFilledPaint(kind) {
    return kind === "fill" || kind === "fill-stroke";
  }

  function readPath(pathOps, pathArgs, matrix, viewportMatrix, drawOps) {
    const ops = asArrayLike(pathOps);
    const args = asArrayLike(pathArgs);
    const segments = [];
    let opIndex = 0;
    let argIndex = 0;
    let current = null;
    let start = null;
    let hasCurve = false;
    let closed = false;

    function convertPoint(x, y) {
      const page = applyMatrix(matrix, Number(x) || 0, Number(y) || 0);
      const canvas = applyMatrix(viewportMatrix, page.x, page.y);
      return { page, canvas };
    }

    function addLine(to) {
      if (!current) {
        current = to;
        start = start || to;
        return;
      }
      const pageLength = distance(current.page, to.page);
      const canvasLength = distance(current.canvas, to.canvas);
      segments.push({
        pageFrom: roundPoint(current.page),
        pageTo: roundPoint(to.page),
        canvasFrom: roundPoint(current.canvas),
        canvasTo: roundPoint(to.canvas),
        lengthPdf: round(pageLength, 2),
        lengthPx: round(canvasLength, 2)
      });
      current = to;
    }

    function addRectangle(x, y, width, height) {
      const left = Number(x) || 0;
      const top = Number(y) || 0;
      const right = left + (Number(width) || 0);
      const bottom = top + (Number(height) || 0);
      const p0 = convertPoint(left, top);
      current = p0;
      start = p0;
      addLine(convertPoint(right, top));
      addLine(convertPoint(right, bottom));
      addLine(convertPoint(left, bottom));
      addLine(p0);
      closed = true;
    }

    function readCoord() {
      return args[argIndex++];
    }

    if (args.length) {
      const pathCodes = drawOps || DRAW_OPS;
      while (opIndex < ops.length) {
        const op = Math.round(Number(ops[opIndex++]));
        if (op === pathCodes.moveTo) {
          const point = convertPoint(readCoord(), readCoord());
          current = point;
          start = point;
        } else if (op === pathCodes.lineTo) {
          addLine(convertPoint(readCoord(), readCoord()));
        } else if (op === pathCodes.curveTo) {
          hasCurve = true;
          argIndex += 4;
          current = convertPoint(readCoord(), readCoord());
        } else if (op === pathCodes.curveTo2) {
          hasCurve = true;
          argIndex += 2;
          current = convertPoint(readCoord(), readCoord());
        } else if (op === pathCodes.curveTo3) {
          hasCurve = true;
          argIndex += 2;
          current = convertPoint(readCoord(), readCoord());
        } else if (op === pathCodes.closePath) {
          if (current && start && distance(current.page, start.page) > 0.01) {
            addLine(start);
          }
          closed = true;
        } else if (op === pathCodes.rectangle) {
          addRectangle(readCoord(), readCoord(), readCoord(), readCoord());
        } else {
          break;
        }
      }
      return { segments, hasCurve, closed };
    }

    const data = ops;
    while (opIndex < data.length) {
      const op = Math.round(Number(data[opIndex++]));
      if (op === DRAW_OPS.moveTo || op === 0) {
        const point = convertPoint(data[opIndex++], data[opIndex++]);
        current = point;
        start = point;
      } else if (op === DRAW_OPS.lineTo || op === 1) {
        addLine(convertPoint(data[opIndex++], data[opIndex++]));
      } else if (op === DRAW_OPS.curveTo || op === 2) {
        hasCurve = true;
        opIndex += 4;
        current = convertPoint(data[opIndex++], data[opIndex++]);
      } else if (op === DRAW_OPS.curveTo2 || op === 3) {
        hasCurve = true;
        opIndex += 2;
        current = convertPoint(data[opIndex++], data[opIndex++]);
      } else if (op === DRAW_OPS.curveTo3) {
        hasCurve = true;
        opIndex += 2;
        current = convertPoint(data[opIndex++], data[opIndex++]);
      } else if (op === DRAW_OPS.closePath || op === 4) {
        if (current && start && distance(current.page, start.page) > 0.01) {
          addLine(start);
        }
        closed = true;
      } else if (op === DRAW_OPS.rectangle) {
        addRectangle(data[opIndex++], data[opIndex++], data[opIndex++], data[opIndex++]);
      } else {
        break;
      }
    }

    return { segments, hasCurve, closed };
  }

  function normalizeLine(segment, sourcePath, index) {
    const dx = segment.pageTo.x - segment.pageFrom.x;
    const dy = segment.pageTo.y - segment.pageFrom.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const orientation = absDy <= 0.8 ? "horizontal" : (absDx <= 0.8 ? "vertical" : "diagonal");
    return {
      id: "pdf-line-" + String(index + 1).padStart(4, "0"),
      orientation,
      from: segment.canvasFrom,
      to: segment.canvasTo,
      pageFrom: segment.pageFrom,
      pageTo: segment.pageTo,
      lengthPdf: segment.lengthPdf,
      lengthPx: segment.lengthPx,
      lineWidthPdf: round(sourcePath.lineWidthPdf || 0, 3),
      lineWidthDevice: round(sourcePath.lineWidthDevice || 0, 3),
      paint: sourcePath.paint,
      duplicateCount: 1
    };
  }

  function quantize(value, tolerance) {
    return Math.round(Number(value || 0) / tolerance) * tolerance;
  }

  function canonicalLineKey(line) {
    const tolerance = 0.65;
    const points = [line.pageFrom, line.pageTo].sort((a, b) => (a.x - b.x) || (a.y - b.y));
    return [
      line.orientation,
      quantize(points[0].x, tolerance),
      quantize(points[0].y, tolerance),
      quantize(points[1].x, tolerance),
      quantize(points[1].y, tolerance)
    ].join(":");
  }

  function dedupeLines(lines) {
    const byKey = new Map();
    lines.forEach((line) => {
      const key = canonicalLineKey(line);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...line });
        return;
      }
      existing.duplicateCount += 1;
      existing.lineWidthPdf = Math.max(existing.lineWidthPdf, line.lineWidthPdf);
      existing.lineWidthDevice = Math.max(existing.lineWidthDevice || 0, line.lineWidthDevice || 0);
      existing.lengthPdf = Math.max(existing.lengthPdf, line.lengthPdf);
      existing.lengthPx = Math.max(existing.lengthPx, line.lengthPx);
    });
    return Array.from(byKey.values());
  }

  function createRectCandidate(path, index) {
    if (path.hasCurve || !path.pageBox || path.segments.length < 4) {
      return null;
    }
    const box = path.pageBox;
    const width = Math.abs(box.width);
    const height = Math.abs(box.height);
    if (width <= 0 || height <= 0) {
      return null;
    }
    const hvSegments = path.segments.filter((segment) => {
      const dx = Math.abs(segment.pageTo.x - segment.pageFrom.x);
      const dy = Math.abs(segment.pageTo.y - segment.pageFrom.y);
      return dx <= 0.8 || dy <= 0.8;
    });
    if (hvSegments.length / path.segments.length < 0.8) {
      return null;
    }
    return {
      id: "pdf-rect-" + String(index + 1).padStart(4, "0"),
      x: round((box.x0 + box.x1) / 2, 2),
      y: round((box.y0 + box.y1) / 2, 2),
      pageBox: box,
      canvasBox: path.canvasBox,
      widthPdf: round(width, 2),
      heightPdf: round(height, 2),
      lineWidthPdf: round(path.lineWidthPdf || 0, 3),
      paint: path.paint,
      duplicateCount: 1
    };
  }

  function canonicalRectKey(rect) {
    const tolerance = 0.9;
    return [
      quantize(rect.x, tolerance),
      quantize(rect.y, tolerance),
      quantize(rect.widthPdf, tolerance),
      quantize(rect.heightPdf, tolerance)
    ].join(":");
  }

  function dedupeRects(rects) {
    const byKey = new Map();
    rects.forEach((rect) => {
      const key = canonicalRectKey(rect);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...rect });
        return;
      }
      existing.duplicateCount += 1;
      existing.lineWidthPdf = Math.max(existing.lineWidthPdf, rect.lineWidthPdf);
    });
    return Array.from(byKey.values());
  }

  function boxArea(box) {
    if (!box) {
      return 0;
    }
    return Math.max(0, Number(box.width) || 0) * Math.max(0, Number(box.height) || 0);
  }

  function expandBox(box, padding) {
    if (!box) {
      return null;
    }
    const value = Math.max(0, Number(padding) || 0);
    return {
      x0: round(box.x0 - value, 2),
      y0: round(box.y0 - value, 2),
      x1: round(box.x1 + value, 2),
      y1: round(box.y1 + value, 2),
      width: round(box.width + value * 2, 2),
      height: round(box.height + value * 2, 2)
    };
  }

  function boxesIntersect(first, second) {
    if (!first || !second) {
      return false;
    }
    return !(first.x1 < second.x0 || first.x0 > second.x1 || first.y1 < second.y0 || first.y0 > second.y1);
  }

  function overlapArea(first, second) {
    if (!boxesIntersect(first, second)) {
      return 0;
    }
    return Math.max(0, Math.min(first.x1, second.x1) - Math.max(first.x0, second.x0)) *
      Math.max(0, Math.min(first.y1, second.y1) - Math.max(first.y0, second.y0));
  }

  function distancePointToBox(point, box) {
    if (!point || !box) {
      return Number.POSITIVE_INFINITY;
    }
    const dx = point.x < box.x0 ? box.x0 - point.x : point.x > box.x1 ? point.x - box.x1 : 0;
    const dy = point.y < box.y0 ? box.y0 - point.y : point.y > box.y1 ? point.y - box.y1 : 0;
    return Math.hypot(dx, dy);
  }

  function pointInBox(point, box) {
    return !!point && !!box && point.x >= box.x0 && point.x <= box.x1 && point.y >= box.y0 && point.y <= box.y1;
  }

  function lineCanvasBox(line) {
    return boxFromPoints([line.from, line.to]);
  }

  function centerOfBox(box) {
    if (!box) {
      return null;
    }
    return {
      x: round((box.x0 + box.x1) / 2, 2),
      y: round((box.y0 + box.y1) / 2, 2)
    };
  }

  function quantizedCenterKey(point, tolerance) {
    return [
      quantize(point && point.x, tolerance),
      quantize(point && point.y, tolerance)
    ].join(":");
  }

  function confidenceFrom(value, highAt, mediumAt) {
    if (value >= highAt) {
      return "high";
    }
    if (value >= mediumAt) {
      return "medium";
    }
    return "low";
  }

  function estimateWallThicknessPx(linesOrWalls) {
    const widths = (linesOrWalls || [])
      .map((item) => Number(item && (item.lineWidthDevice || item.lineWidthPdf)) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    if (!widths.length) {
      return 10;
    }
    return Math.max(4, round(medianOfSorted(widths), 2));
  }

  function asWallCandidate(line, index, pageSize) {
    const pageMin = Math.min(pageSize.width, pageSize.height);
    const minWallLength = Math.max(18, pageMin * 0.025);
    if (!isStrokePaint(line.paint) || line.lengthPdf < minWallLength || line.orientation === "diagonal") {
      return null;
    }
    if (line.lineWidthPdf < 0.48) {
      return null;
    }
    const isOuter = line.lineWidthPdf >= 1;
    return {
      id: "pdf-wall-" + String(index + 1).padStart(4, "0"),
      type: isOuter ? "outer_or_structural_wall" : "inner_or_partition_wall",
      label: isOuter ? "外牆 / 結構牆候選" : "內牆 / 隔間候選",
      confidence: confidenceFrom(line.lineWidthPdf + Math.min(line.lengthPdf / 160, 1), 1.8, 1.15),
      orientation: line.orientation,
      from: line.from,
      to: line.to,
      pageFrom: line.pageFrom,
      pageTo: line.pageTo,
      lengthPdf: line.lengthPdf,
      lineWidthPdf: line.lineWidthPdf,
      lineWidthDevice: line.lineWidthDevice,
      duplicateCount: line.duplicateCount,
      reviewRequired: true
    };
  }

  function isPageFrameScaleFill(rect, pageSize, viewportSize) {
    const pageArea = Math.max(1, (pageSize.width || 0) * (pageSize.height || 0));
    const viewportArea = Math.max(1, (viewportSize.width || 0) * (viewportSize.height || 0));
    const pageBox = rect.pageBox || {};
    const canvasBox = rect.canvasBox || {};
    return (
      boxArea(pageBox) >= pageArea * 0.08 ||
      boxArea(canvasBox) >= viewportArea * 0.08 ||
      Math.max(pageBox.width || 0, pageBox.height || 0) >= Math.min(pageSize.width || 0, pageSize.height || 0) * 0.35 ||
      Math.max(canvasBox.width || 0, canvasBox.height || 0) >= Math.min(viewportSize.width || 0, viewportSize.height || 0) * 0.35
    );
  }

  function createTransformHelpers(viewportMatrix) {
    const matrix = cloneMatrix(viewportMatrix || IDENTITY);
    const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
    if (!determinant) {
      return {
        canvasToPage(point) {
          return roundPoint(point || { x: 0, y: 0 });
        }
      };
    }
    const inverse = [
      matrix[3] / determinant,
      -matrix[1] / determinant,
      -matrix[2] / determinant,
      matrix[0] / determinant,
      (matrix[2] * matrix[5] - matrix[3] * matrix[4]) / determinant,
      (matrix[1] * matrix[4] - matrix[0] * matrix[5]) / determinant
    ];
    return {
      canvasToPage(point) {
        if (!point) {
          return { x: 0, y: 0 };
        }
        return roundPoint(applyMatrix(inverse, point.x, point.y));
      }
    };
  }

  function createFilledWallCandidate(rect, index, wallThicknessPx, pageSize, viewportSize, transformHelpers) {
    if (!rect || !isFilledPaint(rect.paint) || !rect.canvasBox) {
      return null;
    }
    if (isPageFrameScaleFill(rect, pageSize, viewportSize)) {
      return null;
    }
    const shortPx = Math.min(rect.canvasBox.width || 0, rect.canvasBox.height || 0);
    const longPx = Math.max(rect.canvasBox.width || 0, rect.canvasBox.height || 0);
    const ratio = longPx / Math.max(shortPx, 0.001);
    if (ratio < 2.5 || shortPx < wallThicknessPx * 0.4 || shortPx > wallThicknessPx * 4) {
      return null;
    }
    const horizontal = (rect.canvasBox.width || 0) >= (rect.canvasBox.height || 0);
    const center = centerOfBox(rect.canvasBox);
    const canvasFrom = horizontal
      ? { x: rect.canvasBox.x0, y: center.y }
      : { x: center.x, y: rect.canvasBox.y0 };
    const canvasTo = horizontal
      ? { x: rect.canvasBox.x1, y: center.y }
      : { x: center.x, y: rect.canvasBox.y1 };
    const pageFrom = transformHelpers.canvasToPage(canvasFrom);
    const pageTo = transformHelpers.canvasToPage(canvasTo);
    return {
      id: "pdf-fill-wall-" + String(index + 1).padStart(4, "0"),
      type: shortPx >= wallThicknessPx * 1.2 ? "outer_or_structural_wall" : "inner_or_partition_wall",
      label: "填色牆候選",
      confidence: ratio >= 4 ? "high" : "medium",
      orientation: horizontal ? "horizontal" : "vertical",
      from: roundPoint(canvasFrom),
      to: roundPoint(canvasTo),
      pageFrom,
      pageTo,
      lengthPdf: round(distance(pageFrom, pageTo), 2),
      lineWidthPdf: round(Math.min(rect.widthPdf, rect.heightPdf), 3),
      lineWidthDevice: round(shortPx, 3),
      duplicateCount: rect.duplicateCount,
      reviewRequired: true,
      fromFilledWall: true,
      sourceRectId: rect.id
    };
  }

  function asAxisCandidate(line, index, pageSize, supportBounds) {
    const pageMin = Math.min(pageSize.width, pageSize.height);
    const segmentationMinimumLength = pageMin * 0.18;
    const evidenceRecallMinimumLength = pageMin * 0.03;
    if (!isStrokePaint(line.paint) || line.orientation === "diagonal") {
      return null;
    }
    if (line.lineWidthPdf > 0.35 || line.lengthPdf < evidenceRecallMinimumLength) {
      return null;
    }
    if (line.orientation === "horizontal" && pageSize.width && line.lengthPdf > pageSize.width * 0.6) {
      return null;
    }
    if (supportBounds && !isLineNearSupportBounds(line, supportBounds, pageMin)) {
      return null;
    }
    return {
      id: "pdf-axis-" + String(index + 1).padStart(4, "0"),
      type: "axis_or_dimension_line",
      label: "軸線 / 尺寸線候選",
      confidence: line.lengthPdf > pageMin * 0.28 ? "medium" : "low",
      orientation: line.orientation,
      from: line.from,
      to: line.to,
      pageFrom: line.pageFrom,
      pageTo: line.pageTo,
      lengthPdf: line.lengthPdf,
      lineWidthPdf: line.lineWidthPdf,
      lineWidthDevice: line.lineWidthDevice,
      duplicateCount: line.duplicateCount,
      regionSegmentationEligible: line.lengthPdf >= segmentationMinimumLength,
      reviewRequired: true
    };
  }

  function asLegacyColumnCandidate(rect, index) {
    const minSize = Math.min(rect.widthPdf, rect.heightPdf);
    const maxSize = Math.max(rect.widthPdf, rect.heightPdf);
    const ratio = maxSize / Math.max(minSize, 0.001);
    if (!isStrokePaint(rect.paint) || minSize < 16 || maxSize > 36 || ratio > 1.45 || rect.lineWidthPdf < 0.9) {
      return null;
    }
    const canvasBox = rect.canvasBox || {};
    return {
      id: "pdf-column-" + String(index + 1).padStart(4, "0"),
      type: ratio <= 1.2 ? "square_column" : "rectangular_column",
      label: ratio <= 1.2 ? "方柱候選" : "矩形柱候選",
      confidence: ratio <= 1.2 && minSize >= 18 ? "high" : "medium",
      center: {
        x: round((canvasBox.x0 + canvasBox.x1) / 2, 2),
        y: round((canvasBox.y0 + canvasBox.y1) / 2, 2)
      },
      pageCenter: { x: rect.x, y: rect.y },
      pageBox: rect.pageBox,
      canvasBox: rect.canvasBox,
      widthPdf: rect.widthPdf,
      heightPdf: rect.heightPdf,
      lineWidthPdf: rect.lineWidthPdf,
      duplicateCount: rect.duplicateCount,
      reviewRequired: true
    };
  }

  function createFilledColumnCandidate(rect, index, wallThicknessPx, walls, pageSize, viewportSize) {
    if (!rect || !isFilledPaint(rect.paint) || !rect.canvasBox) {
      return null;
    }
    if (isPageFrameScaleFill(rect, pageSize, viewportSize)) {
      return null;
    }
    const widthPx = Number(rect.canvasBox.width) || 0;
    const heightPx = Number(rect.canvasBox.height) || 0;
    const minSizePx = Math.min(widthPx, heightPx);
    const maxSizePx = Math.max(widthPx, heightPx);
    const aspect = widthPx / Math.max(heightPx, 0.001);
    if (aspect < 0.55 || aspect > 1.85) {
      return null;
    }
    if (minSizePx < wallThicknessPx * 0.8 || maxSizePx > wallThicknessPx * 16) {
      return null;
    }
    const center = centerOfBox(rect.canvasBox);
    const nearWallThreshold = Math.max(wallThicknessPx * 8, 40);
    const nearWall = (walls || []).some((wall) => distancePointToBox(center, lineCanvasBox(wall)) <= nearWallThreshold);
    if (!nearWall) {
      return null;
    }
    return {
      id: "pdf-fill-column-" + String(index + 1).padStart(4, "0"),
      type: aspect >= 0.82 && aspect <= 1.2 ? "square_column" : "rectangular_column",
      label: aspect >= 0.82 && aspect <= 1.2 ? "方柱候選" : "矩形柱候選",
      confidence: minSizePx >= wallThicknessPx * 1.4 ? "high" : "medium",
      center,
      pageCenter: rect.pageCenter || { x: rect.x, y: rect.y },
      pageBox: rect.pageBox,
      canvasBox: rect.canvasBox,
      widthPdf: rect.widthPdf,
      heightPdf: rect.heightPdf,
      lineWidthPdf: rect.lineWidthPdf,
      duplicateCount: rect.duplicateCount,
      reviewRequired: true,
      nearWall: true,
      sourceRectId: rect.id
    };
  }

  function dedupeColumnCandidates(columns, wallThicknessPx) {
    const byKey = new Map();
    const tolerance = Math.max(6, wallThicknessPx * 0.6);
    columns.forEach((column) => {
      if (!column || !column.center) {
        return;
      }
      const key = quantizedCenterKey(column.center, tolerance);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...column });
        return;
      }
      const confidenceScore = { high: 3, medium: 2, low: 1 };
      const keepCurrent = (confidenceScore[column.confidence] || 0) > (confidenceScore[existing.confidence] || 0) ||
        ((Number(column.widthPdf) || 0) * (Number(column.heightPdf) || 0)) > ((Number(existing.widthPdf) || 0) * (Number(existing.heightPdf) || 0));
      if (keepCurrent) {
        byKey.set(key, { ...existing, ...column, duplicateCount: (existing.duplicateCount || 1) + (column.duplicateCount || 1) });
      } else {
        existing.duplicateCount = (existing.duplicateCount || 1) + (column.duplicateCount || 1);
      }
    });
    return Array.from(byKey.values());
  }

  function limitCandidates(items, maxCount) {
    return items.slice(0, maxCount).map((item, index) => ({ ...item, rank: index + 1 }));
  }

  function boundsFromLinesAndRects(lines, rects) {
    const points = [];
    lines.forEach((line) => {
      if (line && line.pageFrom && line.pageTo) {
        points.push(line.pageFrom, line.pageTo);
      }
    });
    rects.forEach((rect) => {
      const box = rect && rect.pageBox;
      if (box) {
        points.push({ x: box.x0, y: box.y0 }, { x: box.x1, y: box.y1 });
      }
    });
    if (!points.length) {
      return null;
    }
    return boxFromPoints(points);
  }

  function lineBox(line) {
    return boxFromPoints([line.pageFrom, line.pageTo]);
  }

  function isLineNearSupportBounds(line, supportBounds, pageMin) {
    const padding = Math.max(80, pageMin * 0.12);
    const box = lineBox(line);
    const centerX = (box.x0 + box.x1) / 2;
    const centerY = (box.y0 + box.y1) / 2;
    const insidePaddedBounds =
      centerX >= supportBounds.x0 - padding &&
      centerX <= supportBounds.x1 + padding &&
      centerY >= supportBounds.y0 - padding &&
      centerY <= supportBounds.y1 + padding;
    if (!insidePaddedBounds) {
      return false;
    }
    const maxExpectedSpan = Math.max(supportBounds.width, supportBounds.height) + padding * 2;
    return line.lengthPdf <= maxExpectedSpan;
  }

  function lineWidthMetric(line) {
    const deviceWidth = Number(line && line.lineWidthDevice);
    if (Number.isFinite(deviceWidth) && deviceWidth > 0) {
      return deviceWidth;
    }
    const pdfWidth = Number(line && line.lineWidthPdf);
    return Number.isFinite(pdfWidth) && pdfWidth > 0 ? pdfWidth : 0;
  }

  function medianOfSorted(values) {
    if (!values.length) {
      return 0;
    }
    const middle = Math.floor(values.length / 2);
    if (values.length % 2) {
      return values[middle];
    }
    return (values[middle - 1] + values[middle]) / 2;
  }

  function analyzeLineWidthGroups(lines) {
    const widths = lines
      .filter((line) => line.orientation !== "diagonal" && isStrokePaint(line.paint) && line.lengthPdf >= 4)
      .map(lineWidthMetric)
      .filter((width) => Number.isFinite(width) && width > 0)
      .sort((a, b) => a - b);
    const count = widths.length;
    const disabled = { enabled: false, threshold: null, removedCount: 0, sampleCount: count };
    if (count < 24) {
      return disabled;
    }
    const p10 = widths[Math.floor(count * 0.1)];
    const p90 = widths[Math.min(count - 1, Math.ceil(count * 0.9))];
    if (!p10 || !p90 || p90 / p10 < 1.9) {
      return disabled;
    }
    const minGroup = Math.max(6, Math.round(count * 0.08));
    let bestIndex = -1;
    let bestGap = 1;
    for (let index = minGroup; index <= count - minGroup; index += 1) {
      const previous = widths[index - 1];
      const next = widths[index];
      if (!previous || !next) {
        continue;
      }
      const gap = next / previous;
      if (gap > bestGap) {
        bestGap = gap;
        bestIndex = index;
      }
    }
    if (bestIndex < 0 || bestGap < 1.75) {
      return disabled;
    }
    const lower = widths.slice(0, bestIndex);
    const upper = widths.slice(bestIndex);
    const lowerMedian = medianOfSorted(lower);
    const upperMedian = medianOfSorted(upper);
    if (!lowerMedian || !upperMedian || upperMedian / lowerMedian < 1.8) {
      return disabled;
    }
    const threshold = Math.sqrt(widths[bestIndex - 1] * widths[bestIndex]);
    return {
      enabled: true,
      threshold,
      removedCount: lines.filter((line) => line.orientation !== "diagonal" && lineWidthMetric(line) > 0 && lineWidthMetric(line) < threshold).length,
      sampleCount: count,
      lowerMedian,
      upperMedian,
      gapRatio: bestGap
    };
  }

  function applyLineWidthGrouping(lines) {
    const groups = analyzeLineWidthGroups(lines);
    if (!groups.enabled) {
      return { lines, groups };
    }
    const kept = lines.filter((line) => {
      if (line.orientation === "diagonal") {
        return true;
      }
      const width = lineWidthMetric(line);
      return !width || width >= groups.threshold;
    });
    return { lines: kept, groups: { ...groups, removedCount: lines.length - kept.length } };
  }

  function lineAxisData(line, orientation) {
    const from = line.pageFrom || {};
    const to = line.pageTo || {};
    if (orientation === "horizontal") {
      const x0 = Math.min(from.x || 0, to.x || 0);
      const x1 = Math.max(from.x || 0, to.x || 0);
      return {
        main0: x0,
        main1: x1,
        mainMid: (x0 + x1) / 2,
        perp: ((from.y || 0) + (to.y || 0)) / 2
      };
    }
    const y0 = Math.min(from.y || 0, to.y || 0);
    const y1 = Math.max(from.y || 0, to.y || 0);
    return {
      main0: y0,
      main1: y1,
      mainMid: (y0 + y1) / 2,
      perp: ((from.x || 0) + (to.x || 0)) / 2
    };
  }

  function intervalOverlapRatio(first, second) {
    const overlap = Math.max(0, Math.min(first.main1, second.main1) - Math.max(first.main0, second.main0));
    const shorter = Math.max(0.001, Math.min(first.main1 - first.main0, second.main1 - second.main0));
    return overlap / shorter;
  }

  function findHatchLikeLineIds(lines, pageSize) {
    const pageMin = Math.min(pageSize.width || 0, pageSize.height || 0) || 600;
    const maxShortLength = Math.max(36, pageMin * 0.16);
    const maxSpacing = Math.max(10, pageMin * 0.026);
    const minSpacing = 0.8;
    const ids = new Set();
    let groupCount = 0;
    ["horizontal", "vertical"].forEach((orientation) => {
      const source = lines
        .filter((line) => line.orientation === orientation && line.lengthPdf >= 4 && line.lengthPdf <= maxShortLength)
        .map((line) => ({ line, axis: lineAxisData(line, orientation) }))
        .sort((a, b) => (a.axis.mainMid - b.axis.mainMid) || (a.axis.perp - b.axis.perp));
      const groups = [];
      source.forEach((item) => {
        let target = null;
        for (let index = 0; index < groups.length; index += 1) {
          const group = groups[index];
          if (
            Math.abs(item.axis.mainMid - group.mainMid) <= maxShortLength * 0.45 &&
            intervalOverlapRatio(item.axis, group.axis) >= 0.48
          ) {
            target = group;
            break;
          }
        }
        if (!target) {
          target = {
            items: [],
            axis: { ...item.axis },
            mainMid: item.axis.mainMid
          };
          groups.push(target);
        }
        target.items.push(item);
        target.axis.main0 = Math.min(target.axis.main0, item.axis.main0);
        target.axis.main1 = Math.max(target.axis.main1, item.axis.main1);
        target.mainMid = target.items.reduce((sum, current) => sum + current.axis.mainMid, 0) / target.items.length;
      });
      groups.forEach((group) => {
        if (group.items.length < 5) {
          return;
        }
        const perps = group.items.map((item) => item.axis.perp).sort((a, b) => a - b);
        const spacings = [];
        for (let index = 1; index < perps.length; index += 1) {
          const spacing = perps[index] - perps[index - 1];
          if (spacing > 0.05) {
            spacings.push(spacing);
          }
        }
        if (spacings.length < 4) {
          return;
        }
        const sortedSpacings = spacings.slice().sort((a, b) => a - b);
        const medianSpacing = medianOfSorted(sortedSpacings);
        if (medianSpacing < minSpacing || medianSpacing > maxSpacing) {
          return;
        }
        const regularCount = spacings.filter((spacing) => Math.abs(spacing - medianSpacing) <= Math.max(1.2, medianSpacing * 0.42)).length;
        if (regularCount / spacings.length < 0.66) {
          return;
        }
        groupCount += 1;
        group.items.forEach((item) => ids.add(item.line.id));
      });
    });
    return { ids, groupCount };
  }

  function suppressHatchLikeLines(lines, pageSize) {
    const result = findHatchLikeLineIds(lines, pageSize);
    if (!result.ids.size) {
      return { lines, removedCount: 0, groupCount: 0 };
    }
    return {
      lines: lines.filter((line) => !result.ids.has(line.id)),
      removedCount: result.ids.size,
      groupCount: result.groupCount
    };
  }

  function isLabelLikeText(value) {
    return /[A-Za-z\u4E00-\u9FFF]/u.test(String(value || ""));
  }

  function buildTextZone(textItem, index) {
    const text = String(textItem && textItem.str || "").trim();
    if (!text || !isLabelLikeText(text)) {
      return null;
    }
    const transform = Array.isArray(textItem.transform) ? textItem.transform : null;
    if (!transform || transform.length < 6) {
      return null;
    }
    const width = Math.max(Math.abs(Number(textItem.width) || 0), 1);
    const height = Math.max(Math.abs(Number(textItem.height) || 0), Math.max(8, Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0)));
    const x = Number(transform[4]) || 0;
    const y = Number(transform[5]) || 0;
    return {
      id: "pdf-text-zone-" + String(index + 1).padStart(4, "0"),
      text,
      canvasBox: expandBox(boxFromPoints([
        { x, y: y - height },
        { x: x + width, y }
      ]), Math.max(2, Math.min(8, height * 0.18)))
    };
  }

  function buildTextZones(textItems) {
    return (Array.isArray(textItems) ? textItems : [])
      .map(buildTextZone)
      .filter(Boolean);
  }

  function numericDimensionText(value) {
    const normalized = String(value == null ? "" : value)
      .replace(/[\s,]/g, "")
      .replace(/[ｍＭ]/g, "m")
      .trim();
    const match = normalized.match(/^(\d{1,6}(?:\.\d{1,3})?)(mm|cm|m)?$/i);
    if (!match) return null;
    const numericValue = Number(match[1]);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return {
      rawLabel: String(value == null ? "" : value).trim(),
      normalizedNumericValue: numericValue,
      explicitUnit: match[2] ? match[2].toLowerCase() : null
    };
  }

  function buildNumericDimensionLabel(textItem, index) {
    const numeric = numericDimensionText(textItem && textItem.str);
    const transform = Array.isArray(textItem && textItem.transform) ? textItem.transform : null;
    if (!numeric || !transform || transform.length < 6) return null;
    const width = Math.max(Math.abs(Number(textItem.width) || 0), 1);
    const height = Math.max(Math.abs(Number(textItem.height) || 0), Math.max(1, Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0)));
    const x = Number(transform[4]);
    const y = Number(transform[5]);
    if (![x, y, width, height].every(Number.isFinite)) return null;
    const rotation = Math.atan2(Number(transform[1]) || 0, Number(transform[0]) || 1) * 180 / Math.PI;
    const orientation = Math.abs(Math.cos(rotation * Math.PI / 180)) >= Math.abs(Math.sin(rotation * Math.PI / 180)) ? "horizontal" : "vertical";
    return {
      id: "pdf-dimension-label-" + String(index + 1).padStart(4, "0"),
      source: "pdf-text-content",
      rawLabel: numeric.rawLabel,
      normalizedNumericValue: numeric.normalizedNumericValue,
      explicitUnit: numeric.explicitUnit,
      pageBox: {
        x0: round(Math.min(x, x + width), 3),
        y0: round(Math.min(y - height, y), 3),
        x1: round(Math.max(x, x + width), 3),
        y1: round(Math.max(y - height, y), 3)
      },
      orientation,
      rotationDegrees: round(rotation, 3),
      confidence: "high",
      runnerUpMargin: null,
      page: 1,
      evidenceOnly: true,
      reviewRequired: true
    };
  }

  function buildNumericDimensionLabels(textItems) {
    return (Array.isArray(textItems) ? textItems : [])
      .map(buildNumericDimensionLabel)
      .filter(Boolean)
      .sort((a, b) => (a.pageBox.y0 - b.pageBox.y0) || (a.pageBox.x0 - b.pageBox.x0) || a.id.localeCompare(b.id));
  }

  const OUTLINED_DIGIT_DECODER_VERSION = "r7-outlined-digit-corridor-20260718";
  const OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION = "r7-outlined-floor-semantic-glyphs-20260719";
  const OUTLINED_DIGIT_TEMPLATE_SIZE = Object.freeze({ width: 20, height: 30 });

  function createLocalCanvas(width, height) {
    if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
    if (typeof document !== "undefined" && document.createElement) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    return null;
  }

  function byteForeground(imageData, threshold) {
    const data = imageData && imageData.data;
    if (!data) return new Uint8Array(0);
    const output = new Uint8Array(imageData.width * imageData.height);
    for (let index = 0, pixel = 0; index < output.length; index += 1, pixel += 4) {
      const alpha = data[pixel + 3];
      const luminance = data[pixel] * 0.2126 + data[pixel + 1] * 0.7152 + data[pixel + 2] * 0.0722;
      output[index] = alpha > 24 && luminance < threshold ? 1 : 0;
    }
    return output;
  }

  function connectedForegroundComponents(binary, width, height) {
    const seen = new Uint8Array(binary.length);
    const components = [];
    const offsets = [-1, 0, 1];
    for (let start = 0; start < binary.length; start += 1) {
      if (!binary[start] || seen[start]) continue;
      const queue = [start];
      seen[start] = 1;
      let cursor = 0;
      let x0 = width;
      let y0 = height;
      let x1 = 0;
      let y1 = 0;
      while (cursor < queue.length) {
        const index = queue[cursor++];
        const x = index % width;
        const y = Math.floor(index / width);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
        offsets.forEach((dx) => offsets.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
          const next = ny * width + nx;
          if (binary[next] && !seen[next]) {
            seen[next] = 1;
            queue.push(next);
          }
        }));
      }
      const componentWidth = x1 - x0 + 1;
      const componentHeight = y1 - y0 + 1;
      if (queue.length >= 5 && componentWidth > 1 && componentHeight > 1) {
        components.push({ x0, y0, x1, y1, width: componentWidth, height: componentHeight, pixelCount: queue.length });
      }
    }
    return components;
  }

  function normalizedBitmap(binary, width, height, component, rotation) {
    const target = OUTLINED_DIGIT_TEMPLATE_SIZE;
    const result = new Uint8Array(target.width * target.height);
    const sourceWidth = component.width;
    const sourceHeight = component.height;
    for (let y = 0; y < target.height; y += 1) {
      for (let x = 0; x < target.width; x += 1) {
        const tx = (x + 0.5) / target.width;
        const ty = (y + 0.5) / target.height;
        let sourceX = Math.floor(tx * sourceWidth);
        let sourceY = Math.floor(ty * sourceHeight);
        if (rotation === "cw") {
          sourceX = Math.floor(ty * sourceWidth);
          sourceY = sourceHeight - 1 - Math.floor(tx * sourceHeight);
        } else if (rotation === "ccw") {
          sourceX = sourceWidth - 1 - Math.floor(ty * sourceWidth);
          sourceY = Math.floor(tx * sourceHeight);
        }
        sourceX = Math.max(0, Math.min(sourceWidth - 1, sourceX));
        sourceY = Math.max(0, Math.min(sourceHeight - 1, sourceY));
        result[y * target.width + x] = binary[(component.y0 + sourceY) * width + component.x0 + sourceX] ? 1 : 0;
      }
    }
    return result;
  }

  function bitmapScore(left, right) {
    let intersection = 0;
    let union = 0;
    const targetWidth = OUTLINED_DIGIT_TEMPLATE_SIZE.width;
    const targetHeight = OUTLINED_DIGIT_TEMPLATE_SIZE.height;
    const leftRows = new Array(targetHeight).fill(0);
    const rightRows = new Array(targetHeight).fill(0);
    const leftColumns = new Array(targetWidth).fill(0);
    const rightColumns = new Array(targetWidth).fill(0);
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] || right[index]) union += 1;
      if (left[index] && right[index]) intersection += 1;
      const row = Math.floor(index / targetWidth);
      const column = index % targetWidth;
      leftRows[row] += left[index] ? 1 : 0;
      rightRows[row] += right[index] ? 1 : 0;
      leftColumns[column] += left[index] ? 1 : 0;
      rightColumns[column] += right[index] ? 1 : 0;
    }
    if (!union) return 0;
    let profileDifference = 0;
    for (let index = 0; index < targetHeight; index += 1) {
      profileDifference += Math.abs(leftRows[index] - rightRows[index]);
    }
    for (let index = 0; index < targetWidth; index += 1) {
      profileDifference += Math.abs(leftColumns[index] - rightColumns[index]);
    }
    const intersectionOverUnion = intersection / union;
    const projectionSimilarity = Math.max(0, 1 - profileDifference / (2 * targetWidth * targetHeight));
    return 0.65 * intersectionOverUnion + 0.35 * projectionSimilarity;
  }

  function bitmapTopologyFeatures(bitmap) {
    const width = OUTLINED_DIGIT_TEMPLATE_SIZE.width;
    const height = OUTLINED_DIGIT_TEMPLATE_SIZE.height;
    const bandHeight = Math.ceil(height / 3);
    const bands = [0, 1, 2].map(() => ({ left: 0, right: 0, total: 0 }));
    const rowTransitions = [];
    const rowTransitionBands = [0, 1, 2].map(() => []);
    let inkCount = 0;
    for (let row = 0; row < height; row += 1) {
      let transitions = 0;
      let prior = bitmap[row * width] ? 1 : 0;
      for (let column = 0; column < width; column += 1) {
        const value = bitmap[row * width + column] ? 1 : 0;
        const band = bands[Math.min(2, Math.floor(row / bandHeight))];
        if (value) {
          inkCount += 1;
          band.total += 1;
          if (column < width / 2) band.left += 1;
          else band.right += 1;
        }
        if (column > 0 && value !== prior) transitions += 1;
        prior = value;
      }
      rowTransitions.push(transitions / Math.max(1, width - 1));
      rowTransitionBands[Math.min(2, Math.floor(row / bandHeight))].push(transitions / Math.max(1, width - 1));
    }
    const visited = new Uint8Array(bitmap.length);
    const holes = [];
    for (let start = 0; start < bitmap.length; start += 1) {
      if (bitmap[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let count = 0;
      let xTotal = 0;
      let yTotal = 0;
      let touchesBoundary = false;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        const x = index % width;
        const y = Math.floor(index / width);
        count += 1;
        xTotal += x;
        yTotal += y;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBoundary = true;
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nextX, nextY]) => {
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) return;
          const nextIndex = nextY * width + nextX;
          if (!bitmap[nextIndex] && !visited[nextIndex]) {
            visited[nextIndex] = 1;
            queue.push(nextIndex);
          }
        });
      }
      if (!touchesBoundary) {
        holes.push({
          areaRatio: count / (width * height),
          x: xTotal / count / Math.max(1, width - 1),
          y: yTotal / count / Math.max(1, height - 1)
        });
      }
    }
    holes.sort((left, right) => right.areaRatio - left.areaRatio || left.y - right.y || left.x - right.x);
    return {
      schema: "laibe.planPuzzle.outlinedDigitTopology.v1",
      inkDensity: round(inkCount / (width * height), 6),
      enclosedHoleCount: holes.length,
      primaryHole: holes[0] ? { areaRatio: round(holes[0].areaRatio, 6), x: round(holes[0].x, 6), y: round(holes[0].y, 6) } : null,
      bandSideDensity: bands.map((band) => ({
        left: round(band.left / Math.max(1, bandHeight * Math.ceil(width / 2)), 6),
        right: round(band.right / Math.max(1, bandHeight * Math.floor(width / 2)), 6)
      })),
      bandSideAsymmetry: bands.map((band) => round((band.left / Math.max(1, bandHeight * Math.ceil(width / 2))) - (band.right / Math.max(1, bandHeight * Math.floor(width / 2))), 6)),
      rowTransitionMean: round(rowTransitions.reduce((sum, value) => sum + value, 0) / rowTransitions.length, 6),
      rowTransitionBands: rowTransitionBands.map((values) => round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length), 6))
    };
  }

  function topologySimilarity(left, right, mode = "balanced") {
    if (!left || !right) return 0;
    const densitySimilarity = Math.max(0, 1 - Math.abs(left.inkDensity - right.inkDensity) / 0.35);
    const transitionSimilarity = Math.max(0, 1 - Math.abs(left.rowTransitionMean - right.rowTransitionMean) / 0.3);
    let bandDifference = 0;
    left.bandSideDensity.forEach((band, index) => {
      const other = right.bandSideDensity[index];
      bandDifference += Math.abs(band.left - other.left) + Math.abs(band.right - other.right);
    });
    const balancedBandSimilarity = Math.max(0, 1 - bandDifference / 6);
    const projectionBandSimilarity = Math.max(0, 1 - bandDifference / 0.9);
    const asymmetryDifference = left.bandSideAsymmetry.reduce((sum, value, index) => sum + Math.abs(value - right.bandSideAsymmetry[index]), 0);
    const asymmetrySimilarity = Math.max(0, 1 - asymmetryDifference / 0.7);
    const transitionBandDifference = left.rowTransitionBands.reduce((sum, value, index) => sum + Math.abs(value - right.rowTransitionBands[index]), 0);
    const transitionBandSimilarity = Math.max(0, 1 - transitionBandDifference / 0.45);
    let holeSimilarity = left.enclosedHoleCount === right.enclosedHoleCount ? 1 : 0;
    if (holeSimilarity && left.primaryHole && right.primaryHole) {
      holeSimilarity = Math.max(0, 1 - (
        2 * Math.abs(left.primaryHole.areaRatio - right.primaryHole.areaRatio) +
        1.4 * Math.abs(left.primaryHole.x - right.primaryHole.x) +
        4 * Math.abs(left.primaryHole.y - right.primaryHole.y)
      ));
    }
    const balanced = 0.2 * densitySimilarity + 0.2 * transitionSimilarity + 0.35 * balancedBandSimilarity + 0.25 * holeSimilarity;
    const projection = 0.08 * densitySimilarity + 0.08 * transitionSimilarity + 0.24 * projectionBandSimilarity + 0.22 * asymmetrySimilarity + 0.18 * transitionBandSimilarity + 0.2 * holeSimilarity;
    return mode === "projection" ? projection : balanced;
  }

  function outlinedDigitTemplates() {
    const canvas = createLocalCanvas(64, 64);
    if (!canvas) return [];
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    const families = ["Arial", "Helvetica", "Times New Roman", "Georgia", "Courier New", "Verdana", "Segoe UI"];
    const weights = ["400", "700"];
    const sizes = [40, 44, 48, 52];
    const styles = [
      { id: "fill", fill: true, stroke: false, lineWidth: 0 },
      { id: "outline", fill: false, stroke: true, lineWidth: 1.5 },
      { id: "fill-outline", fill: true, stroke: true, lineWidth: 1 }
    ];
    const templates = [];
    families.forEach((family) => weights.forEach((weight) => sizes.forEach((size) => styles.forEach((style) => {
      for (let digit = 0; digit <= 9; digit += 1) {
        context.clearRect(0, 0, 64, 64);
        context.fillStyle = "white";
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = "black";
        context.strokeStyle = "black";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.lineWidth = style.lineWidth;
        context.font = weight + " " + size + "px " + family;
        context.textAlign = "center";
        context.textBaseline = "middle";
        if (style.fill) context.fillText(String(digit), 32, 33);
        if (style.stroke) context.strokeText(String(digit), 32, 33);
        const binary = byteForeground(context.getImageData(0, 0, 64, 64), 192);
        const parts = connectedForegroundComponents(binary, 64, 64);
        const component = parts.sort((left, right) => right.pixelCount - left.pixelCount)[0];
        if (component) {
          const bitmap = normalizedBitmap(binary, 64, 64, component, "none");
          templates.push({ digit: String(digit), bitmap, topology: bitmapTopologyFeatures(bitmap), style: style.id });
        }
      }
    }))));
    return templates;
  }

  function classifyOutlinedDigit(binary, width, height, component, orientation, templates) {
    const rotations = orientation === "vertical" ? ["cw", "ccw"] : ["none"];
    const byRotation = {};
    rotations.forEach((rotation) => {
      const scores = [];
      const bitmap = normalizedBitmap(binary, width, height, component, rotation);
      const topology = bitmapTopologyFeatures(bitmap);
      templates.forEach((template) => {
        const templateScore = bitmapScore(bitmap, template.bitmap);
        const projectionMode = orientation === "horizontal";
        const featureScore = topologySimilarity(topology, template.topology, projectionMode ? "projection" : "balanced");
        const featureWeight = projectionMode ? (topology.primaryHole ? 0.7 : 0.6) : 0.38;
        scores.push({ digit: template.digit, score: (1 - featureWeight) * templateScore + featureWeight * featureScore, templateScore, featureScore, rotation });
      });
      const byDigit = new Map();
      scores.forEach((entry) => {
        const prior = byDigit.get(entry.digit);
        if (!prior || entry.score > prior.score) byDigit.set(entry.digit, entry);
      });
      const ranked = Array.from(byDigit.values()).sort((left, right) => right.score - left.score || left.digit.localeCompare(right.digit));
      const best = ranked[0] || null;
      const runnerUp = ranked[1] || null;
      byRotation[rotation] = {
        bestClass: best && best.digit || null,
        score: best ? round(best.score, 6) : 0,
        runnerUp: runnerUp && runnerUp.digit || null,
        runnerUpScore: runnerUp ? round(runnerUp.score, 6) : 0,
        margin: best && runnerUp ? round(best.score - runnerUp.score, 6) : 0,
        candidates: ranked.slice(0, 3).map((entry) => ({ digit: entry.digit, score: round(entry.score, 6), templateScore: round(entry.templateScore, 6), topologyScore: round(entry.featureScore, 6) })),
        rotation,
        topology
      };
    });
    const rankedRotations = Object.values(byRotation).sort((left, right) => right.score - left.score || right.margin - left.margin || left.rotation.localeCompare(right.rotation));
    const best = rankedRotations[0] || {};
    return {
      ...best,
      byRotation
    };
  }

  function outlinedFloorSemanticTemplates() {
    const canvas = createLocalCanvas(64, 64);
    if (!canvas) return [];
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    const families = ["Arial", "Helvetica", "Times New Roman", "Georgia", "Courier New", "Verdana", "Segoe UI"];
    const weights = ["400", "700"];
    const sizes = [40, 44, 48, 52];
    const styles = [
      { id: "fill", fill: true, stroke: false, lineWidth: 0 },
      { id: "outline", fill: false, stroke: true, lineWidth: 1.5 },
      { id: "fill-outline", fill: true, stroke: true, lineWidth: 1 }
    ];
    const glyphs = "0123456789BFGHLMOPRT/".split("");
    const templates = [];
    families.forEach((family) => weights.forEach((weight) => sizes.forEach((size) => styles.forEach((style) => {
      glyphs.forEach((glyph) => {
        context.clearRect(0, 0, 64, 64);
        context.fillStyle = "white";
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = "black";
        context.strokeStyle = "black";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.lineWidth = style.lineWidth;
        context.font = weight + " " + size + "px " + family;
        context.textAlign = "center";
        context.textBaseline = "middle";
        if (style.fill) context.fillText(glyph, 32, 33);
        if (style.stroke) context.strokeText(glyph, 32, 33);
        const binary = byteForeground(context.getImageData(0, 0, 64, 64), 192);
        const parts = connectedForegroundComponents(binary, 64, 64);
        const component = parts.sort((left, right) => right.pixelCount - left.pixelCount)[0];
        if (component) {
          const bitmap = normalizedBitmap(binary, 64, 64, component, "none");
          templates.push({ glyph, bitmap, topology: bitmapTopologyFeatures(bitmap), style: style.id });
        }
      });
    }))));
    return templates;
  }

  function classifyOutlinedFloorGlyph(binary, width, height, component, orientation, templates) {
    const rotations = orientation === "vertical" ? ["cw", "ccw"] : ["none"];
    const byRotation = {};
    rotations.forEach((rotation) => {
      const scores = [];
      const bitmap = normalizedBitmap(binary, width, height, component, rotation);
      const topology = bitmapTopologyFeatures(bitmap);
      templates.forEach((template) => {
        const templateScore = bitmapScore(bitmap, template.bitmap);
        const featureScore = topologySimilarity(topology, template.topology, orientation === "horizontal" ? "projection" : "balanced");
        const featureWeight = orientation === "horizontal" ? (topology.primaryHole ? 0.7 : 0.6) : 0.38;
        scores.push({ glyph: template.glyph, score: (1 - featureWeight) * templateScore + featureWeight * featureScore, templateScore, featureScore, rotation });
      });
      const byGlyph = new Map();
      scores.forEach((entry) => {
        const prior = byGlyph.get(entry.glyph);
        if (!prior || entry.score > prior.score) byGlyph.set(entry.glyph, entry);
      });
      const ranked = Array.from(byGlyph.values()).sort((left, right) => right.score - left.score || left.glyph.localeCompare(right.glyph));
      const best = ranked[0] || null;
      const runnerUp = ranked[1] || null;
      byRotation[rotation] = {
        bestClass: best && best.glyph || null,
        score: best ? round(best.score, 6) : 0,
        runnerUp: runnerUp && runnerUp.glyph || null,
        runnerUpScore: runnerUp ? round(runnerUp.score, 6) : 0,
        margin: best && runnerUp ? round(best.score - runnerUp.score, 6) : 0,
        candidates: ranked.slice(0, 3).map((entry) => ({ glyph: entry.glyph, score: round(entry.score, 6), templateScore: round(entry.templateScore, 6), topologyScore: round(entry.featureScore, 6) })),
        rotation,
        topology
      };
    });
    const rankedRotations = Object.values(byRotation).sort((left, right) => right.score - left.score || right.margin - left.margin || left.rotation.localeCompare(right.rotation));
    return { ...(rankedRotations[0] || {}), byRotation };
  }

  function parseFloorSemanticToken(rawToken) {
    const raw = String(rawToken || "").trim();
    const normalized = raw.toUpperCase().replace(/\s+/g, "").replace(/[\\\uFF0F]/g, "/");
    const compact = normalized.replace(/[._-]/g, "");
    let descriptor = null;
    if (/^[1-9]\d*F$/.test(compact)) {
      descriptor = { kind: "numbered_floor", ordinal: Number(compact.slice(0, -1)), normalizedToken: compact };
    } else if (/^B[1-9]\d*F?$/.test(compact)) {
      descriptor = { kind: "basement_floor", ordinal: Number(compact.replace(/^B|F$/g, "")), normalizedToken: compact };
    } else if (/^(?:R\/?F|ROOF)$/.test(compact)) {
      descriptor = { kind: "roof_floor", ordinal: null, normalizedToken: compact };
    } else if (/^(?:G\/?F|GF)$/.test(compact)) {
      descriptor = { kind: "ground_floor", ordinal: 0, normalizedToken: compact };
    } else if (/^(?:M\/?F|MF|MEZZ)$/.test(compact)) {
      descriptor = { kind: "mezzanine_floor", ordinal: null, normalizedToken: compact };
    } else if (/^(?:P\/?H|PH|PENTHOUSE)$/.test(compact)) {
      descriptor = { kind: "penthouse_floor", ordinal: null, normalizedToken: compact };
    }
    return {
      rawToken: raw,
      normalizedToken: compact,
      descriptor,
      accepted: Boolean(descriptor),
      reason: descriptor ? "standard_floor_designator_grammar" : "floor_designator_grammar_not_matched"
    };
  }

  function positivePageNumber(value) {
    const number = Math.floor(Number(value));
    return Number.isInteger(number) && number > 0 ? number : 1;
  }

  function finitePageBox(box) {
    if (!box || ![box.x0, box.y0, box.x1, box.y1].every((value) => Number.isFinite(Number(value)))) return null;
    const x0 = Math.min(Number(box.x0), Number(box.x1));
    const y0 = Math.min(Number(box.y0), Number(box.y1));
    const x1 = Math.max(Number(box.x0), Number(box.x1));
    const y1 = Math.max(Number(box.y0), Number(box.y1));
    return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
  }

  function outlinedFloorSemanticSupport(raw, pageWidth, pageHeight) {
    const boxes = [];
    (Array.isArray(raw && raw.walls) ? raw.walls : []).forEach((item) => {
      const from = item && item.pageFrom;
      const to = item && item.pageTo;
      if (from && to && [from.x, from.y, to.x, to.y].every((value) => Number.isFinite(Number(value)))) {
        boxes.push({ x0: Math.min(from.x, to.x), y0: Math.min(from.y, to.y), x1: Math.max(from.x, to.x), y1: Math.max(from.y, to.y), width: Math.abs(from.x - to.x), height: Math.abs(from.y - to.y) });
      }
    });
    ["columns", "stairCandidates", "spaceBoundaryCandidates"].forEach((key) => {
      (Array.isArray(raw && raw[key]) ? raw[key] : []).forEach((item) => {
        const box = finitePageBox(item && (item.pageBox || item.bbox));
        if (box) boxes.push(box);
      });
    });
    if (!boxes.length || !(pageWidth > 0) || !(pageHeight > 0)) return null;
    const x0 = Math.max(0, Math.min(...boxes.map((box) => box.x0)));
    const y0 = Math.max(0, Math.min(...boxes.map((box) => box.y0)));
    const x1 = Math.min(pageWidth, Math.max(...boxes.map((box) => box.x1)));
    const y1 = Math.min(pageHeight, Math.max(...boxes.map((box) => box.y1)));
    const base = finitePageBox({ x0, y0, x1, y1 });
    if (!base || base.width <= 0 || base.height <= 0) return null;
    const padding = Math.max(12, Math.min(48, Math.hypot(base.width, base.height) * 0.045));
    return finitePageBox({
      x0: Math.max(0, base.x0 - padding), y0: Math.max(0, base.y0 - padding),
      x1: Math.min(pageWidth, base.x1 + padding), y1: Math.min(pageHeight, base.y1 + padding)
    });
  }

  function floorSemanticGeometryPrimitives(raw) {
    const primitives = [];
    const add = (kind, box) => {
      const pageBox = finitePageBox(box);
      if (!pageBox) return;
      const signature = [kind, quantize(pageBox.x0, 0.25), quantize(pageBox.y0, 0.25), quantize(pageBox.x1, 0.25), quantize(pageBox.y1, 0.25)].join(":");
      primitives.push({
        id: "pdf-floor-semantic-geometry-" + signature.replace(/[^a-zA-Z0-9]+/g, "-"),
        kind,
        signature,
        pageBox
      });
    };
    (Array.isArray(raw && raw.walls) ? raw.walls : []).forEach((item) => {
      const from = item && item.pageFrom;
      const to = item && item.pageTo;
      if (from && to) add("wall", { x0: from.x, y0: from.y, x1: to.x, y1: to.y });
    });
    ["columns", "stairCandidates", "spaceBoundaryCandidates"].forEach((key) => {
      (Array.isArray(raw && raw[key]) ? raw[key] : []).forEach((item) => add(key, item && (item.pageBox || item.bbox)));
    });
    return Array.from(new Map(primitives.map((primitive) => [primitive.signature, primitive])).values())
      .sort((left, right) => left.signature.localeCompare(right.signature));
  }

  function floorSemanticGeometryRegions(raw, pageNumber) {
    const primitives = floorSemanticGeometryPrimitives(raw);
    const spans = primitives.map((primitive) => Math.max(primitive.pageBox.width, primitive.pageBox.height)).filter((span) => span > 0).sort((left, right) => left - right);
    const medianSpan = spans.length ? medianOfSorted(spans) : 0;
    const linkagePadding = Math.max(2, Math.min(18, medianSpan * 0.08 || 2));
    const visited = new Set();
    const regions = [];
    primitives.forEach((primitive, index) => {
      if (visited.has(index)) return;
      const members = [];
      const queue = [index];
      visited.add(index);
      while (queue.length) {
        const currentIndex = queue.shift();
        const current = primitives[currentIndex];
        members.push(current);
        primitives.forEach((candidate, candidateIndex) => {
          if (visited.has(candidateIndex)) return;
          if (boxDistance(expandBox(current.pageBox, linkagePadding), expandBox(candidate.pageBox, linkagePadding)) > 0) return;
          visited.add(candidateIndex);
          queue.push(candidateIndex);
        });
      }
      const pageBox = members.reduce((box, member) => box ? {
        x0: Math.min(box.x0, member.pageBox.x0), y0: Math.min(box.y0, member.pageBox.y0),
        x1: Math.max(box.x1, member.pageBox.x1), y1: Math.max(box.y1, member.pageBox.y1)
      } : { ...member.pageBox }, null);
      const signature = members.map((member) => member.signature).sort().join("_");
      const membershipBox = finitePageBox(expandBox(finitePageBox(pageBox), linkagePadding));
      regions.push({
        id: "pdf-floor-semantic-region-page-" + String(pageNumber) + "-" + signature.replace(/[^a-zA-Z0-9]+/g, "-"),
        page: pageNumber,
        coordinateFrame: "page-bottom-left-pdf-pt",
        pageBox: finitePageBox(pageBox),
        membershipBox,
        provenance: {
          method: "source-geometry-connected-components",
          linkagePadding: round(linkagePadding, 3),
          memberIds: members.map((member) => member.id).sort(),
          memberSignatures: members.map((member) => member.signature).sort()
        }
      });
    });
    return regions.sort((left, right) => left.id.localeCompare(right.id));
  }

  function resolveFloorSemanticRegion(pageBox, regions) {
    const box = finitePageBox(pageBox);
    const center = centerOfBox(box);
    if (!box || !center) return { semanticRegionId: null, status: "semantic_region_unavailable", provenance: { candidateCount: 0 } };
    const candidates = (Array.isArray(regions) ? regions : []).map((region) => {
      const membershipBox = region && region.membershipBox;
      const contained = pointInBox(center, membershipBox);
      const overlap = overlapArea(box, membershipBox);
      const overlapRatio = overlap / Math.max(0.001, boxArea(box));
      const distancePt = boxDistance(box, membershipBox);
      const score = contained ? 1 + Math.min(0.49, overlapRatio) : overlapRatio;
      return { region, contained, overlapRatio: round(overlapRatio, 6), distancePt: round(distancePt, 6), score: round(score, 6) };
    }).filter((candidate) => candidate.contained || candidate.overlapRatio > 0)
      .sort((left, right) => right.score - left.score || right.overlapRatio - left.overlapRatio || left.distancePt - right.distancePt || left.region.id.localeCompare(right.region.id));
    if (!candidates.length) return { semanticRegionId: null, status: "semantic_region_unavailable", provenance: { candidateCount: 0 } };
    const best = candidates[0];
    const runnerUp = candidates[1] || null;
    const margin = runnerUp ? round(best.score - runnerUp.score, 6) : null;
    if (runnerUp && margin <= 0.04) {
      return {
        semanticRegionId: null,
        status: "semantic_region_ambiguous",
        provenance: { candidateCount: candidates.length, bestRegionId: best.region.id, runnerUpRegionId: runnerUp.region.id, score: best.score, runnerUpScore: runnerUp.score, margin }
      };
    }
    return {
      semanticRegionId: best.region.id,
      status: "semantic_region_unique",
      provenance: { candidateCount: candidates.length, score: best.score, runnerUpScore: runnerUp && runnerUp.score || null, margin, region: best.region }
    };
  }

  function floorSemanticCorridorMetadata(group, pageNumber, orientation) {
    const meta = group && group._meta || {};
    const pageBox = floorGlyphGroupBox(group);
    const components = floorGlyphComponentProvenance(group);
    const orderedGlyphs = (Array.isArray(group) ? group : []).slice().sort((left, right) => {
      const left0 = orientation === "vertical" ? left && left.main0 : left && left.main0;
      const right0 = orientation === "vertical" ? right && right.main0 : right && right.main0;
      return Number(left0) - Number(right0) || Number(left && left.main1) - Number(right && right.main1);
    });
    const padding = Math.max(1, Math.min(10, Number(meta.maximumGap) || 1));
    const maximumGap = Math.max(0.001, Number(meta.maximumGap) || 0);
    const gaps = orderedGlyphs.slice(1).map((glyph, index) => Math.max(0, Number(glyph && glyph.main0) - Number(orderedGlyphs[index] && orderedGlyphs[index].main1)));
    const largestGap = gaps.length ? Math.max.apply(null, gaps) : 0;
    const continuousScore = round(Math.max(0, 1 - largestGap / maximumGap), 6);
    const splitScore = round(largestGap > 0 ? Math.max(0, largestGap / maximumGap - 0.5) : 0, 6);
    const disconnected = largestGap > maximumGap;
    const materiallyAmbiguous = !disconnected && largestGap > 0 && Math.abs(continuousScore - splitScore) <= 0.04;
    const corridorBounds = finitePageBox(expandBox(pageBox, padding));
    const signature = [
      pageNumber, meta.semanticRegionId || "unavailable", orientation,
      quantize(corridorBounds && corridorBounds.x0, 0.25), quantize(corridorBounds && corridorBounds.y0, 0.25),
      quantize(corridorBounds && corridorBounds.x1, 0.25), quantize(corridorBounds && corridorBounds.y1, 0.25),
      components.map((component) => component.signature).sort().join("_")
    ].join(":");
    const corridorStatus = !meta.semanticRegionId ? "corridor_membership_unavailable" :
      disconnected ? "disjoint_corridor_grouping_forbidden" :
      materiallyAmbiguous ? "corridor_membership_ambiguous" : "corridor_membership_unique";
    return {
      corridorId: corridorStatus === "corridor_membership_unique" ? "pdf-floor-semantic-corridor-" + signature.replace(/[^a-zA-Z0-9]+/g, "-") : null,
      corridorStatus,
      corridorBounds,
      corridorProvenance: {
        method: "continuous-scale-relative-component-corridor",
        maximumGap: round(maximumGap, 6),
        gaps: gaps.map((gap) => round(gap, 6)),
        largestGap: round(largestGap, 6),
        continuousScore,
        splitScore,
        candidateCount: largestGap > 0 ? 2 : 1,
        ambiguityMargin: largestGap > 0 ? round(Math.abs(continuousScore - splitScore), 6) : null,
        componentIds: components.map((component) => component.id),
        componentSignatures: components.map((component) => component.signature),
        witnessComponentIds: orderedGlyphs.map((glyph) => floorGlyphComponentProvenance([glyph])[0]).filter(Boolean).map((component) => component.id),
        floorBandId: meta.floorBandId || null
      }
    };
  }

  function outlinedFloorSemanticGroups(components, pageHeight, scale, supportBox, orientation, pageNumber, regions) {
    const wholePage = { canvasBox: { x0: 0, y0: 0 } };
    const glyphs = components.map((component) => ({ component, pageBox: componentPdfBox(component, wholePage, pageHeight, scale) }))
      .filter((entry) => {
        const box = entry.pageBox;
        const center = centerOfBox(box);
        const mainSpan = orientation === "horizontal" ? box.width : box.height;
        const crossSpan = orientation === "horizontal" ? box.height : box.width;
        return center && pointInBox(center, supportBox) && mainSpan >= 1.2 && crossSpan >= 2 && mainSpan <= 34 && crossSpan <= 34;
      })
      .map((entry) => {
        const box = entry.pageBox;
        const region = resolveFloorSemanticRegion(box, regions);
        const main0 = orientation === "horizontal" ? box.x0 : box.y0;
        const main1 = orientation === "horizontal" ? box.x1 : box.y1;
        const crossCenter = orientation === "horizontal" ? (box.y0 + box.y1) / 2 : (box.x0 + box.x1) / 2;
        const crossSpan = orientation === "horizontal" ? box.height : box.width;
        return { ...entry, ...region, main0, main1, mainSpan: Math.max(0.001, main1 - main0), crossCenter, crossSpan };
      });
    const bands = [];
    glyphs.slice().sort((left, right) => left.crossCenter - right.crossCenter || left.main0 - right.main0).forEach((glyph) => {
      const band = bands.find((candidate) => candidate.semanticRegionId && candidate.semanticRegionId === glyph.semanticRegionId &&
        Math.abs(candidate.crossCenter - glyph.crossCenter) <= Math.max(2.5, Math.min(10, (candidate.crossSpan + glyph.crossSpan) * 0.45)));
      if (!band) {
        bands.push({ glyphs: [glyph], crossCenter: glyph.crossCenter, crossSpan: glyph.crossSpan, semanticRegionId: glyph.semanticRegionId, semanticRegionStatus: glyph.status, semanticRegionProvenance: glyph.provenance });
        return;
      }
      band.glyphs.push(glyph);
      band.crossCenter = band.glyphs.reduce((sum, entry) => sum + entry.crossCenter, 0) / band.glyphs.length;
      band.crossSpan = band.glyphs.reduce((sum, entry) => sum + entry.crossSpan, 0) / band.glyphs.length;
    });
    const groups = [];
    bands.forEach((band) => {
      const ordered = band.glyphs.slice().sort((left, right) => left.main0 - right.main0 || left.main1 - right.main1);
      const spans = ordered.map((glyph) => glyph.mainSpan).sort((left, right) => left - right);
      const medianSpan = spans.length ? medianOfSorted(spans) : 0;
      const maximumGap = Math.max(2.5, Math.min(14, medianSpan * 1.1 + 1.5));
      ordered.forEach((glyph) => {
        const last = groups[groups.length - 1];
        const sameBand = last && last._band === band;
        const gap = sameBand ? glyph.main0 - last[last.length - 1].main1 : Infinity;
        if (!sameBand || gap > maximumGap || last.length >= 10) {
          const group = [glyph];
          group._band = band;
          group._meta = {
            orientation,
            maximumGap: round(maximumGap, 3),
            medianGlyphMainSpan: round(medianSpan, 3),
            supportBounds: supportBox,
            floorBandId: "pdf-floor-semantic-band-" + [pageNumber, orientation, band.semanticRegionId || band.semanticRegionStatus || "unavailable", quantize(band.crossCenter, 0.25), quantize(band.crossSpan, 0.25)].join(":").replace(/[^a-zA-Z0-9]+/g, "-"),
            semanticRegionId: band.semanticRegionId || null,
            semanticRegionStatus: band.semanticRegionStatus || "semantic_region_unavailable",
            semanticRegionProvenance: band.semanticRegionProvenance || null
          };
          groups.push(group);
        } else {
          last.push(glyph);
        }
      });
    });
    return groups.filter((group) => group._meta && group.length >= 1 && group.length <= 10)
      .map((group) => {
        Object.assign(group._meta, floorSemanticCorridorMetadata(group, pageNumber, orientation));
        return group;
      });
  }

  function childFloorSemanticRegionMetadata(group, regions) {
    const resolutions = (Array.isArray(group) ? group : []).map((glyph) => {
      const resolution = resolveFloorSemanticRegion(glyph && glyph.pageBox, regions);
      return {
        componentId: floorGlyphComponentProvenance([glyph])[0] && floorGlyphComponentProvenance([glyph])[0].id || null,
        semanticRegionId: resolution.semanticRegionId || null,
        status: resolution.status,
        provenance: resolution.provenance || null
      };
    });
    const uniqueIds = Array.from(new Set(resolutions.filter((resolution) => resolution.status === "semantic_region_unique" && resolution.semanticRegionId).map((resolution) => resolution.semanticRegionId)));
    if (resolutions.length && uniqueIds.length === 1 && resolutions.every((resolution) => resolution.status === "semantic_region_unique" && resolution.semanticRegionId === uniqueIds[0])) {
      return {
        semanticRegionId: uniqueIds[0],
        semanticRegionStatus: "semantic_region_unique",
        semanticRegionProvenance: { method: "child-component-source-region-resolution", componentResolutions: resolutions }
      };
    }
    const status = resolutions.some((resolution) => resolution.status === "semantic_region_ambiguous") || uniqueIds.length > 1 ? "semantic_region_ambiguous" : "semantic_region_unavailable";
    return {
      semanticRegionId: null,
      semanticRegionStatus: status,
      semanticRegionProvenance: { method: "child-component-source-region-resolution", componentResolutions: resolutions, uniqueRegionIds: uniqueIds }
    };
  }

  function outlinedFloorSemanticSubgroups(group, pageNumber, regions) {
    const parent = Array.isArray(group) ? group : [];
    const maxLength = Math.min(4, parent.length);
    const parentMeta = parent._meta || {};
    const subgroups = [];
    for (let length = 2; length <= maxLength; length += 1) {
      for (let start = 0; start + length <= parent.length; start += 1) {
        if (length === parent.length) continue;
        const subgroup = parent.slice(start, start + length);
        const spans = subgroup.map((glyph) => Number(glyph && glyph.mainSpan) || 0).filter((span) => span > 0).sort((left, right) => left - right);
        const medianSpan = spans.length ? medianOfSorted(spans) : 0;
        const region = childFloorSemanticRegionMetadata(subgroup, regions);
        const crossCenters = subgroup.map((glyph) => Number(glyph && glyph.crossCenter)).filter(Number.isFinite);
        const crossSpans = subgroup.map((glyph) => Number(glyph && glyph.crossSpan)).filter(Number.isFinite);
        const crossCenter = crossCenters.length ? crossCenters.reduce((sum, value) => sum + value, 0) / crossCenters.length : 0;
        const crossSpan = crossSpans.length ? medianOfSorted(crossSpans.sort((left, right) => left - right)) : 0;
        const orientation = parentMeta.orientation || "horizontal";
        subgroup._band = {
          page: pageNumber,
          orientation,
          semanticRegionId: region.semanticRegionId,
          semanticRegionStatus: region.semanticRegionStatus
        };
        subgroup._meta = {
          orientation,
          maximumGap: round(Math.max(2.5, Math.min(14, medianSpan * 1.1 + 1.5)), 3),
          medianGlyphMainSpan: round(medianSpan, 3),
          supportBounds: parentMeta.supportBounds || null,
          floorBandId: "pdf-floor-semantic-band-" + [pageNumber, orientation, region.semanticRegionId || region.semanticRegionStatus, quantize(crossCenter, 0.25), quantize(crossSpan, 0.25)].join(":").replace(/[^a-zA-Z0-9]+/g, "-"),
          ...region,
          groupingMethod: "contiguous-scale-relative-component-subgroup",
          subgroupStart: start,
          subgroupEnd: start + length - 1,
          subgroupLength: length
        };
        Object.assign(subgroup._meta, floorSemanticCorridorMetadata(subgroup, pageNumber, orientation));
        subgroups.push(subgroup);
      }
    }
    return subgroups;
  }

  function outlinedFloorSemanticReading(group, classifications, orientation) {
    const rotations = orientation === "vertical" ? ["cw", "ccw"] : ["none"];
    const readings = rotations.map((rotation) => {
      const ordered = orientation === "vertical" && rotation === "ccw" ? group.slice().reverse() : group.slice();
      const glyphs = ordered.map((glyph) => {
        const classified = classifications.get(glyph) || {};
        return classified.byRotation && classified.byRotation[rotation] || {};
      });
      return {
        rotation,
        glyphs,
        rawToken: glyphs.map((glyph) => glyph.bestClass || "").join(""),
        score: glyphs.length ? Math.min.apply(null, glyphs.map((glyph) => glyph.score || 0)) : 0,
        margin: glyphs.length ? Math.min.apply(null, glyphs.map((glyph) => glyph.margin || 0)) : 0
      };
    }).sort((left, right) => right.score - left.score || right.margin - left.margin || left.rawToken.localeCompare(right.rawToken));
    return readings[0] || { rawToken: "", glyphs: [], score: 0, margin: 0, rotation: "none" };
  }

  function outlinedFloorGlyphClassifications(reading) {
    return (reading && reading.glyphs || []).map((glyph) => ({
      bestClass: glyph.bestClass || null,
      candidates: glyph.candidates || [],
      topology: glyph.topology || null
    }));
  }

  function sharedFloorSemanticComponent(left, right) {
    if (!left || !right || !left.record || !right.record || left.record.page !== right.record.page) return false;
    const leftIds = new Set(left && left.record && left.record.componentIds || []);
    return (right && right.record && right.record.componentIds || []).some((id) => leftIds.has(id));
  }

  function sameFloorSemanticScope(left, right) {
    return !!left && !!right && !!left.record && !!right.record &&
      left.record.page === right.record.page &&
      left.record.orientation === right.record.orientation &&
      left.record.floorBandId && left.record.floorBandId === right.record.floorBandId &&
      left.record.semanticRegionId && left.record.semanticRegionId === right.record.semanticRegionId &&
      left.record.corridorId && left.record.corridorId === right.record.corridorId;
  }

  function resolveOutlinedFloorSemanticCandidates(entries) {
    const pending = Array.isArray(entries) ? entries.slice() : [];
    const accepted = [];
    const rejected = [];
    const scopeConflicts = new Set();
    pending.forEach((left, leftIndex) => {
      pending.slice(leftIndex + 1).forEach((right, relativeIndex) => {
        const rightIndex = leftIndex + relativeIndex + 1;
        if (sharedFloorSemanticComponent(left, right) && !sameFloorSemanticScope(left, right)) {
          scopeConflicts.add(leftIndex);
          scopeConflicts.add(rightIndex);
        }
      });
    });
    const visited = new Set();
    pending.forEach((entry, index) => {
      if (visited.has(index)) return;
      if (scopeConflicts.has(index)) {
        visited.add(index);
        rejected.push({ ...entry, reason: "subgroup_component_scope_conflict" });
        return;
      }
      const component = [];
      const queue = [index];
      visited.add(index);
      while (queue.length) {
        const current = queue.shift();
        component.push(pending[current]);
        pending.forEach((candidate, candidateIndex) => {
          if (!visited.has(candidateIndex) && !scopeConflicts.has(candidateIndex) && sameFloorSemanticScope(pending[current], candidate) && sharedFloorSemanticComponent(pending[current], candidate)) {
            visited.add(candidateIndex);
            queue.push(candidateIndex);
          }
        });
      }
      if (component.length === 1) {
        accepted.push(component[0]);
        return;
      }
      const ranked = component.slice().sort((left, right) => right.record.confidence - left.record.confidence || right.record.runnerUpMargin - left.record.runnerUpMargin || left.record.id.localeCompare(right.record.id));
      const best = ranked[0];
      const runnerUp = ranked[1];
      const decisive = best.record.confidence - runnerUp.record.confidence >= 0.04;
      if (!decisive) {
        component.forEach((candidate) => rejected.push({ ...candidate, reason: "subgroup_component_competition_not_unique" }));
        return;
      }
      accepted.push(best);
      ranked.slice(1).forEach((candidate) => rejected.push({ ...candidate, reason: "subgroup_component_competition_lower_confidence" }));
    });
    return { accepted, rejected };
  }

  function floorGlyphGroupBox(group) {
    const bounds = group.reduce((box, glyph) => box ? {
      x0: Math.min(box.x0, glyph.pageBox.x0), y0: Math.min(box.y0, glyph.pageBox.y0),
      x1: Math.max(box.x1, glyph.pageBox.x1), y1: Math.max(box.y1, glyph.pageBox.y1)
    } : { ...glyph.pageBox }, null);
    return finitePageBox(bounds);
  }

  function floorGlyphComponentProvenance(group) {
    return group.map((glyph) => {
      const box = finitePageBox(glyph && glyph.pageBox);
      const signature = [box && quantize(box.x0, 0.25), box && quantize(box.y0, 0.25), box && quantize(box.x1, 0.25), box && quantize(box.y1, 0.25), Number(glyph && glyph.component && glyph.component.pixelCount) || 0].join(":");
      return {
        id: "pdf-outlined-floor-component-" + signature.replace(/[^a-zA-Z0-9]+/g, "-"),
        signature,
        pageBox: box,
        pixelCount: Number(glyph && glyph.component && glyph.component.pixelCount) || 0
      };
    }).sort((left, right) => left.signature.localeCompare(right.signature));
  }

  function floorSemanticGroupId(pageNumber, orientation, rotation, normalizedToken, pageBox, components) {
    const signature = [
      "page", pageNumber, orientation, rotation, normalizedToken || "unclassified",
      quantize(pageBox && pageBox.x0, 0.5), quantize(pageBox && pageBox.y0, 0.5),
      quantize(pageBox && pageBox.x1, 0.5), quantize(pageBox && pageBox.y1, 0.5),
      (components || []).map((component) => component.signature).sort().join("_")
    ].join(":");
    return "pdf-outlined-floor-semantic-" + signature.replace(/[^a-zA-Z0-9]+/g, "-");
  }

  function floorSemanticGroupRecord(pageNumber, orientation, reading, parsed, pageBox, group, renderProvenance, accepted, rejectionReason) {
    const components = floorGlyphComponentProvenance(group);
    const normalizedToken = parsed && parsed.normalizedToken || "";
    const rotationDegrees = reading && reading.rotation === "cw" ? 90 : reading && reading.rotation === "ccw" ? -90 : 0;
    const parserResult = {
      method: "standard_floor_designator_grammar",
      rawToken: parsed && parsed.rawToken || "",
      normalizedToken,
      normalizedFloorToken: normalizedToken,
      descriptor: parsed && parsed.descriptor || null,
      accepted: Boolean(parsed && parsed.accepted),
      failed: !Boolean(parsed && parsed.accepted),
      reason: parsed && parsed.reason || "floor_designator_grammar_not_matched",
      score: round(reading && reading.score || 0, 6),
      runnerUpScore: round(reading && reading.glyphs && reading.glyphs.length ? Math.min.apply(null, reading.glyphs.map((glyph) => glyph.runnerUpScore)) : 0, 6),
      margin: round(reading && reading.margin || 0, 6)
    };
    return {
      id: floorSemanticGroupId(pageNumber, orientation, reading && reading.rotation || "none", normalizedToken, pageBox, components),
      source: "pdf-rendered-outlined-floor-semantic-glyph",
      decoderMethod: OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION,
      classifierVersion: OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION,
      parserMethod: "standard_floor_designator_grammar",
      parserResult,
      page: pageNumber,
      rawToken: parsed && parsed.rawToken || "",
      normalizedToken,
      normalizedFloorToken: normalizedToken,
      floorDescriptor: parsed && parsed.descriptor || null,
      pageBox,
      coordinateFrame: "page-bottom-left-pdf-pt",
      orientation,
      rotationDegrees,
      confidence: round(reading && reading.score || 0, 6),
      topScore: round(reading && reading.score || 0, 6),
      runnerUpMargin: round(reading && reading.margin || 0, 6),
      runnerUpScore: round(reading && reading.glyphs && reading.glyphs.length ? Math.min.apply(null, reading.glyphs.map((glyph) => glyph.runnerUpScore)) : 0, 6),
      componentIds: components.map((component) => component.id),
      componentSignatures: components.map((component) => component.signature),
      componentProvenance: components,
      groupingEvidence: group._meta || null,
      renderProvenance,
      pathProvenance: null,
      semanticRegionId: group && group._meta && group._meta.semanticRegionId || null,
      semanticRegionStatus: group && group._meta && group._meta.semanticRegionStatus || "semantic_region_unavailable",
      semanticRegionProvenance: group && group._meta && group._meta.semanticRegionProvenance || null,
      floorBandId: group && group._meta && group._meta.floorBandId || null,
      corridorId: group && group._meta && group._meta.corridorId || null,
      corridorStatus: group && group._meta && group._meta.corridorStatus || "corridor_membership_unavailable",
      corridorBounds: group && group._meta && group._meta.corridorBounds || null,
      corridorProvenance: group && group._meta && group._meta.corridorProvenance || null,
      accepted,
      rejected: !accepted,
      rejectionReason: rejectionReason || null,
      terminalDisposition: accepted ? "accepted" : "rejected",
      evidenceOnly: true,
      reviewRequired: true
    };
  }

  function floorSemanticGeometryCompetitionKey(record) {
    const pageBox = finitePageBox(record && record.pageBox);
    const centerX = pageBox ? (pageBox.x0 + pageBox.x1) / 2 : 0;
    const centerY = pageBox ? (pageBox.y0 + pageBox.y1) / 2 : 0;
    return [
      record && record.page || 0,
      record && record.semanticRegionId || "unavailable",
      record && record.normalizedFloorToken || "unclassified",
      quantize(centerX, 1),
      quantize(centerY, 1)
    ].join(":");
  }

  function resolveFloorSemanticGeometryCompetition(entries) {
    const tolerance = 0.000001;
    const byKey = new Map();
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const key = floorSemanticGeometryCompetitionKey(entry && entry.record);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(entry);
    });
    const selected = [];
    const rejected = [];
    Array.from(byKey.keys()).sort().forEach((key) => {
      const members = byKey.get(key) || [];
      const topConfidence = Math.max.apply(null, members.map((entry) => Number(entry && entry.record && entry.record.confidence) || 0));
      const confidenceLeaders = members.filter((entry) => Math.abs((Number(entry && entry.record && entry.record.confidence) || 0) - topConfidence) <= tolerance);
      const topMargin = Math.max.apply(null, confidenceLeaders.map((entry) => Number(entry && entry.record && entry.record.runnerUpMargin) || 0));
      const leaders = confidenceLeaders.filter((entry) => Math.abs((Number(entry && entry.record && entry.record.runnerUpMargin) || 0) - topMargin) <= tolerance);
      const memberIds = members.map((entry) => entry.record.id).slice().sort();
      const leaderIds = leaders.map((entry) => entry.record.id).slice().sort();
      const setBase = {
        key,
        memberIds,
        topEqualIds: leaderIds,
        confidenceTolerance: tolerance,
        topConfidence: round(topConfidence, 6),
        topMargin: round(topMargin, 6),
        comparison: "confidence_then_runner_up_margin"
      };
      if (leaders.length !== 1) {
        members.forEach((entry) => {
          entry.record.geometryCompetitionKey = key;
          entry.record.geometryCompetition = { ...setBase, winnerId: null, verdict: leaders.includes(entry) ? "equal_top_competition" : "lower_candidate" };
          rejected.push({ ...entry, reason: leaders.includes(entry) ? "subgroup_duplicate_geometry_equal_competition" : "subgroup_duplicate_geometry_lower_confidence" });
        });
        return;
      }
      const winner = leaders[0];
      members.forEach((entry) => {
        entry.record.geometryCompetitionKey = key;
        entry.record.geometryCompetition = { ...setBase, winnerId: winner.record.id, verdict: entry === winner ? "unique_winner" : "lower_candidate" };
        if (entry === winner) selected.push(entry);
        else rejected.push({ ...entry, reason: "subgroup_duplicate_geometry_lower_confidence" });
      });
    });
    return { selected, rejected, confidenceTolerance: tolerance };
  }

  function finalizeOutlinedFloorSemanticLedger(input) {
    const entries = Array.isArray(input && input.entries) ? input.entries : [];
    const rejectedCandidates = Array.isArray(input && input.resolvedCandidates && input.resolvedCandidates.rejected) ? input.resolvedCandidates.rejected : [];
    const rejectedGeometry = Array.isArray(input && input.geometryCompetition && input.geometryCompetition.rejected) ? input.geometryCompetition.rejected : [];
    const selectedGeometry = Array.isArray(input && input.geometryCompetition && input.geometryCompetition.selected) ? input.geometryCompetition.selected : [];
    const ordinalCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
    const auditIdKey = (value) => typeof value + ":" + (typeof value === "string" ? value : JSON.stringify(value));
    const cloneAndFreeze = (value) => {
      const copy = JSON.parse(JSON.stringify(value));
      const freeze = (current) => {
        if (!current || typeof current !== "object" || Object.isFrozen(current)) return current;
        Object.keys(current).forEach((key) => freeze(current[key]));
        return Object.freeze(current);
      };
      return freeze(copy);
    };
    const parentAudits = new Map();
    entries.forEach((entry, ledgerIndex) => {
      if (!entry || entry.kind !== "parent") return;
      const originalChildIds = (Array.isArray(entry.childIds) ? entry.childIds.slice() : []).sort((left, right) => ordinalCompare(auditIdKey(left), auditIdKey(right)));
      const validChildIds = originalChildIds.filter((id) => typeof id === "string" && id.length > 0);
      const invalidChildIds = originalChildIds.filter((id) => typeof id !== "string" || !id.length);
      const seen = new Set();
      const duplicateChildIds = [];
      validChildIds.forEach((id) => {
        if (seen.has(id) && !duplicateChildIds.includes(id)) duplicateChildIds.push(id);
        seen.add(id);
      });
      parentAudits.set(ledgerIndex, {
        originalChildIds,
        invalidChildIds,
        duplicateChildIds: duplicateChildIds.sort(ordinalCompare),
        normalizedChildIds: Array.from(new Set(validChildIds)).sort(ordinalCompare)
      });
    });
    const candidateOutcomes = new Map();
    rejectedCandidates.forEach((entry) => candidateOutcomes.set(entry && entry.ledgerIndex, { accepted: false, reason: entry && entry.reason || "subgroup_component_competition_not_unique", category: "competition" }));
    rejectedGeometry.forEach((entry) => candidateOutcomes.set(entry && entry.ledgerIndex, { accepted: false, reason: entry && entry.reason || "subgroup_duplicate_geometry_equal_competition", category: "competition" }));
    selectedGeometry.forEach((entry) => candidateOutcomes.set(entry && entry.ledgerIndex, { accepted: true, reason: null, category: null }));
    const outcomes = entries.map((entry, ledgerIndex) => {
      const initial = entry && entry.initialOutcome;
      const candidate = candidateOutcomes.get(ledgerIndex);
      const parentAudit = parentAudits.get(ledgerIndex);
      const parentIntegrityReason = parentAudit && (parentAudit.invalidChildIds.length ? "invalid_child_id" : parentAudit.duplicateChildIds.length ? "duplicate_child_link" : null);
      const outcome = parentIntegrityReason ? { accepted: false, reason: parentIntegrityReason, category: "competition" } : initial || candidate || { accepted: false, reason: "floor_semantic_candidate_not_finalized", category: "competition" };
      let record = {
        ...(entry && entry.record || {}),
        accepted: Boolean(outcome.accepted),
        rejected: !outcome.accepted,
        rejectionReason: outcome.accepted ? null : outcome.reason,
        terminalDisposition: outcome.accepted ? "accepted" : "rejected"
      };
      if (parentAudit) {
        record = cloneAndFreeze({
          ...record,
          originalChildIds: parentAudit.originalChildIds,
          childIds: parentAudit.normalizedChildIds,
          lineage: {
            ...(record.lineage || {}),
            parentGroupId: record.id || null,
            childIds: parentAudit.normalizedChildIds,
            method: record.lineage && record.lineage.method || "contiguous-scale-relative-component-subgroup",
            parentRetained: true
          }
        });
      }
      return {
        ledgerIndex,
        kind: entry && entry.kind || "child",
        corridorIndex: Number(entry && entry.corridorIndex),
        orientationIndex: Number(entry && entry.orientationIndex),
        grammarEligible: Boolean(entry && entry.grammarEligible),
        category: outcome.accepted ? null : outcome.category || "competition",
        record
      };
    });
    const parentOutcomes = outcomes.filter((outcome) => outcome.kind === "parent");
    const childOutcomes = outcomes.filter((outcome) => outcome.kind === "child");
    const counters = {
      generatedGroupCount: childOutcomes.length,
      generatedHypothesisCount: childOutcomes.length,
      grammarEligibleCount: childOutcomes.filter((outcome) => outcome.grammarEligible).length,
      grammarRejectedCount: 0,
      scoreRejectedCount: 0,
      marginRejectedCount: 0,
      competitionRejectedCount: 0,
      semanticRegionRejectedCount: 0,
      corridorRejectedCount: 0,
      acceptedSubgroupCount: 0
    };
    childOutcomes.forEach((outcome) => {
      if (outcome.record.accepted) {
        counters.acceptedSubgroupCount += 1;
        return;
      }
      const key = String(outcome.category || "competition") + "RejectedCount";
      if (Object.prototype.hasOwnProperty.call(counters, key)) counters[key] += 1;
    });
    const terminalIds = childOutcomes.map((outcome) => outcome.record.id);
    const parentIds = parentOutcomes.map((outcome) => outcome.record.id);
    const parentById = new Map();
    parentOutcomes.forEach((outcome) => {
      if (typeof outcome.record.id === "string" && outcome.record.id.length && !parentById.has(outcome.record.id)) parentById.set(outcome.record.id, outcome.record);
    });
    const supersededGroups = parentOutcomes.filter((outcome) => outcome.record.originalChildIds.length)
      .map((outcome) => ({
        parentGroupId: outcome.record.id || null,
        childIds: outcome.record.childIds,
        parentRetained: true,
        lineage: {
          ...outcome.record.lineage,
          parentGroupId: outcome.record.id || null,
          childIds: outcome.record.childIds,
          parentRetained: true
        },
        reason: "parent_retained_with_contiguous_subgroup_evaluation",
        parentRecord: outcome.record
      }));
    const terminalChildRows = childOutcomes.filter((outcome) => typeof outcome.record.id === "string" && outcome.record.id.length);
    const terminalChildIds = terminalChildRows.map((outcome) => outcome.record.id).sort(ordinalCompare);
    const listedLinks = supersededGroups.flatMap((group) => group.childIds || []).sort(ordinalCompare);
    const terminalChildSet = new Set(terminalChildIds);
    const listedLinkSet = new Set(listedLinks);
    const linkParents = new Map();
    supersededGroups.forEach((group) => (group.childIds || []).forEach((childId) => {
      if (!linkParents.has(childId)) linkParents.set(childId, []);
      linkParents.get(childId).push(group.parentGroupId);
    }));
    const invalidChildIds = parentOutcomes.flatMap((outcome) => parentAudits.get(outcome.ledgerIndex).invalidChildIds);
    const duplicateChildIds = parentOutcomes.flatMap((outcome) => parentAudits.get(outcome.ledgerIndex).duplicateChildIds).sort(ordinalCompare);
    const staleChildIds = Array.from(listedLinkSet).filter((id) => !terminalChildSet.has(id)).sort(ordinalCompare);
    const missingChildIds = Array.from(terminalChildSet).filter((id) => !listedLinkSet.has(id)).sort(ordinalCompare);
    const multiParentChildIds = Array.from(linkParents.entries()).filter(([, parentIdsForChild]) => new Set(parentIdsForChild).size > 1).map(([id]) => id).sort(ordinalCompare);
    const duplicateTerminalIds = terminalChildIds.filter((id, index) => index && terminalChildIds[index - 1] === id);
    const unknownParentLinkIds = terminalChildRows.filter((outcome) => typeof outcome.record.parentGroupId !== "string" || !parentById.has(outcome.record.parentGroupId)).map((outcome) => outcome.record.id).sort(ordinalCompare);
    const parentLinkMismatchIds = terminalChildRows.filter((outcome) => {
      const listedParents = linkParents.get(outcome.record.id) || [];
      return listedParents.length === 1 && listedParents[0] !== outcome.record.parentGroupId;
    }).map((outcome) => outcome.record.id).sort(ordinalCompare);
    const parentRecordMismatchIds = supersededGroups.filter((group) => JSON.stringify(group.parentRecord) !== JSON.stringify(parentById.get(group.parentGroupId))).map((group) => group.parentGroupId).sort(ordinalCompare);
    const coverageCountMismatch = terminalChildSet.size !== listedLinkSet.size || terminalChildSet.size !== terminalChildRows.length || listedLinks.length !== listedLinkSet.size;
    const integrityReasons = [];
    if (staleChildIds.length) integrityReasons.push("stale_child_link");
    if (duplicateChildIds.length) integrityReasons.push("duplicate_child_link");
    if (multiParentChildIds.length) integrityReasons.push("multi_parent_child_link");
    if (missingChildIds.length) integrityReasons.push("missing_child_link");
    if (unknownParentLinkIds.length || parentLinkMismatchIds.length) integrityReasons.push("unknown_parent_link");
    if (invalidChildIds.length || childOutcomes.length !== terminalChildRows.length) integrityReasons.push("invalid_child_id");
    if (parentRecordMismatchIds.length) integrityReasons.push("parent_record_mismatch");
    if (coverageCountMismatch || duplicateTerminalIds.length) integrityReasons.push("coverage_count_mismatch");
    const linkIntegrity = {
      terminalChildIds,
      listedLinks,
      terminalChildCount: terminalChildRows.length,
      listedLinkCount: listedLinks.length,
      parentChildCoverageCount: terminalChildSet.size,
      uniqueTerminalChildCount: terminalChildSet.size,
      uniqueListedLinkCount: listedLinkSet.size,
      staleChildIds,
      duplicateChildIds,
      multiParentChildIds,
      missingChildIds,
      unknownParentLinkIds,
      parentLinkMismatchIds,
      invalidChildIds,
      parentRecordMismatchIds,
      duplicateTerminalIds,
      coverageCountMismatch,
      exactSetEquality: terminalChildIds.join("\n") === Array.from(listedLinkSet).sort(ordinalCompare).join("\n"),
      reasons: integrityReasons,
      pass: !integrityReasons.length
    };
    const rejectedSubgroups = counters.grammarRejectedCount + counters.scoreRejectedCount + counters.marginRejectedCount + counters.competitionRejectedCount + counters.semanticRegionRejectedCount + counters.corridorRejectedCount;
    const conservation = {
      ...counters,
      terminalDispositionCount: terminalIds.length,
      uniqueTerminalDispositionCount: new Set(terminalIds).size,
      parentChildCoverageCount: linkIntegrity.parentChildCoverageCount,
      linkIntegrity,
      pass: counters.generatedHypothesisCount === rejectedSubgroups + counters.acceptedSubgroupCount &&
        counters.generatedHypothesisCount === terminalIds.length &&
        terminalIds.length === new Set(terminalIds).size &&
        linkIntegrity.pass
    };
    const parentDispositionConservation = {
      expectedParentCount: parentOutcomes.length,
      terminalDispositionCount: parentIds.length,
      uniqueTerminalDispositionCount: new Set(parentIds).size,
      pass: parentIds.length === new Set(parentIds).size
    };
    const rejectionDetailComplete = Boolean(conservation.pass && parentDispositionConservation.pass);
    const acceptedRecords = rejectionDetailComplete ? outcomes.filter((outcome) => outcome.record.accepted).map((outcome) => outcome.record) : [];
    return {
      outcomes,
      parentTerminalDispositions: parentOutcomes.map((outcome) => outcome.record),
      terminalDispositions: childOutcomes.map((outcome) => outcome.record),
      supersededGroups,
      conservation,
      parentDispositionConservation,
      acceptedRecords,
      rejectionDetailComplete,
      status: !rejectionDetailComplete ? "outlined_floor_semantic_ledger_incomplete" : acceptedRecords.length ? "outlined_floor_semantic_candidates_available" : "no_confident_outlined_floor_semantic_candidates"
    };
  }

  async function decodeOutlinedFloorSemanticGlyphs(page, raw, pageWidth, pageHeight, pageNumber, diagnostics) {
    const audit = diagnostics || {};
    const resolvedPageNumber = positivePageNumber(pageNumber);
    audit.schema = "laibe.planPuzzle.pdfOutlinedFloorSemanticGlyphDiagnostics.v1";
    audit.version = OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION;
    audit.page = resolvedPageNumber;
    audit.corridors = [];
    audit.orientations = [];
    audit.rejectedGroups = [];
    audit.parentTerminalDispositions = [];
    audit.subgroupDiagnostics = {
      generatedGroupCount: 0,
      generatedHypothesisCount: 0,
      grammarEligibleCount: 0,
      grammarRejectedCount: 0,
      scoreRejectedCount: 0,
      marginRejectedCount: 0,
      competitionRejectedCount: 0,
      semanticRegionRejectedCount: 0,
      corridorRejectedCount: 0,
      acceptedSubgroupCount: 0,
      rejectedGroups: [],
      supersededGroups: [],
      terminalDispositions: []
    };
    const supportBox = outlinedFloorSemanticSupport(raw, pageWidth, pageHeight);
    const semanticRegions = floorSemanticGeometryRegions(raw, resolvedPageNumber);
    audit.structuralSupportBounds = supportBox;
    audit.semanticRegions = semanticRegions;
    if (!page || typeof page.render !== "function" || !supportBox) {
      audit.status = "no_renderable_page_or_structural_support";
      audit.rejectionDetailComplete = true;
      return [];
    }
    const renderScale = 4;
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = createLocalCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas && canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) {
      audit.status = "canvas_unavailable";
      audit.rejectionDetailComplete = true;
      return [];
    }
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff", intent: "display" }).promise;
    const renderProvenance = {
      source: "pdf-page-render",
      scale: renderScale,
      viewport: { width: Number(viewport.width), height: Number(viewport.height) },
      canvas: { width: Number(canvas.width), height: Number(canvas.height) }
    };
    const templates = outlinedFloorSemanticTemplates();
    audit.templateCount = templates.length;
    if (!templates.length) {
      audit.status = "font_templates_unavailable";
      audit.rejectionDetailComplete = true;
      return [];
    }
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const binary = byteForeground(image, 184);
    const components = connectedForegroundComponents(binary, canvas.width, canvas.height);
    audit.componentCount = components.length;
    const candidates = [];
    const ledgerEntries = [];
    ["horizontal", "vertical"].forEach((orientation) => {
      const groups = outlinedFloorSemanticGroups(components, pageHeight, renderScale, supportBox, orientation, resolvedPageNumber, semanticRegions);
      const orientationAudit = {
        orientation,
        componentCount: components.length,
        groupCount: groups.length,
        acceptedLabelCount: 0,
        rejected: { grammar: 0, score: 0, margin: 0, competition: 0, semanticRegion: 0, corridor: 0 },
        rejectedGroups: [],
        corridorCount: groups.length
      };
      audit.orientations.push(orientationAudit);
      groups.forEach((group) => {
        const groupMeta = group._meta || {};
        const corridorAudit = {
          corridorId: groupMeta.corridorId || null,
          semanticRegionId: groupMeta.semanticRegionId || null,
          semanticRegionStatus: groupMeta.semanticRegionStatus || "semantic_region_unavailable",
          corridorStatus: groupMeta.corridorStatus || "corridor_membership_unavailable",
          corridorBounds: groupMeta.corridorBounds || null,
          corridorProvenance: groupMeta.corridorProvenance || null,
          orientation,
          componentCount: group.length,
          acceptedLabelCount: 0,
          rejected: { grammar: 0, score: 0, margin: 0, competition: 0, semanticRegion: 0, corridor: 0 },
          rejectedGroups: [],
          parentTerminalDispositions: [],
          subgroups: {
            generatedGroupCount: 0,
            generatedHypothesisCount: 0,
            grammarEligibleCount: 0,
            grammarRejectedCount: 0,
            scoreRejectedCount: 0,
            marginRejectedCount: 0,
            competitionRejectedCount: 0,
            semanticRegionRejectedCount: 0,
            corridorRejectedCount: 0,
            acceptedSubgroupCount: 0,
            rejected: { grammar: 0, score: 0, margin: 0, competition: 0, semanticRegion: 0, corridor: 0 },
            rejectedGroups: [],
            terminalDispositions: []
          }
        };
        audit.corridors.push(corridorAudit);
        const classified = new Map(group.map((glyph) => [glyph, classifyOutlinedFloorGlyph(binary, canvas.width, canvas.height, glyph.component, orientation, templates)]));
        const reading = outlinedFloorSemanticReading(group, classified, orientation);
        const parsed = parseFloorSemanticToken(reading.rawToken);
        const pageBox = floorGlyphGroupBox(group);
        const parentRecord = {
          ...floorSemanticGroupRecord(resolvedPageNumber, orientation, reading, parsed, pageBox, group, renderProvenance, true, null),
          glyphClassifications: outlinedFloorGlyphClassifications(reading)
        };
        const parentEntry = {
          kind: "parent",
          record: parentRecord,
          corridorIndex: audit.corridors.length - 1,
          orientationIndex: audit.orientations.length - 1,
          childIds: [],
          grammarEligible: false,
          initialOutcome: null
        };
        const parentLedgerIndex = ledgerEntries.push(parentEntry) - 1;
        if (parentRecord.semanticRegionStatus !== "semantic_region_unique") parentEntry.initialOutcome = { accepted: false, reason: parentRecord.semanticRegionStatus, category: "semanticRegion" };
        else if (parentRecord.corridorStatus !== "corridor_membership_unique") parentEntry.initialOutcome = { accepted: false, reason: parentRecord.corridorStatus, category: "corridor" };
        else if (!parsed.accepted) parentEntry.initialOutcome = { accepted: false, reason: parsed.reason, category: "grammar" };
        else if (reading.score < 0.5) parentEntry.initialOutcome = { accepted: false, reason: "minimum_floor_glyph_score", category: "score" };
        else if (reading.margin < 0.04) parentEntry.initialOutcome = { accepted: false, reason: "minimum_floor_glyph_margin", category: "margin" };
        else candidates.push({ record: parentRecord, parent: true, ledgerIndex: parentLedgerIndex });

        outlinedFloorSemanticSubgroups(group, resolvedPageNumber, semanticRegions).forEach((subgroup) => {
          const subgroupReading = outlinedFloorSemanticReading(subgroup, classified, orientation);
          const subgroupParsed = parseFloorSemanticToken(subgroupReading.rawToken);
          const subgroupBox = floorGlyphGroupBox(subgroup);
          const record = {
            ...floorSemanticGroupRecord(resolvedPageNumber, orientation, subgroupReading, subgroupParsed, subgroupBox, subgroup, renderProvenance, true, null),
            parentGroupId: parentRecord.id,
            lineage: {
              parentGroupId: parentRecord.id,
              method: "contiguous-scale-relative-component-subgroup",
              parentRetained: true
            },
            glyphClassifications: outlinedFloorGlyphClassifications(subgroupReading)
          };
          const childEntry = {
            kind: "child",
            record,
            corridorIndex: audit.corridors.length - 1,
            orientationIndex: audit.orientations.length - 1,
            grammarEligible: false,
            initialOutcome: null
          };
          parentEntry.childIds.push(record.id);
          const childLedgerIndex = ledgerEntries.push(childEntry) - 1;
          if (record.semanticRegionStatus !== "semantic_region_unique") childEntry.initialOutcome = { accepted: false, reason: record.semanticRegionStatus, category: "semanticRegion" };
          else if (record.corridorStatus !== "corridor_membership_unique") childEntry.initialOutcome = { accepted: false, reason: record.corridorStatus, category: "corridor" };
          else if (!subgroupParsed.accepted) childEntry.initialOutcome = { accepted: false, reason: subgroupParsed.reason, category: "grammar" };
          else {
            childEntry.grammarEligible = true;
            if (subgroupReading.score < 0.5) childEntry.initialOutcome = { accepted: false, reason: "minimum_floor_glyph_score", category: "score" };
            else if (subgroupReading.margin < 0.04) childEntry.initialOutcome = { accepted: false, reason: "minimum_floor_glyph_margin", category: "margin" };
            else candidates.push({ record, parent: false, ledgerIndex: childLedgerIndex });
          }
        });
      });
    });
    const resolvedCandidates = resolveOutlinedFloorSemanticCandidates(candidates);
    const geometryCompetition = resolveFloorSemanticGeometryCompetition(resolvedCandidates.accepted);
    const finalizedLedger = finalizeOutlinedFloorSemanticLedger({
      entries: ledgerEntries,
      resolvedCandidates,
      geometryCompetition
    });
    audit.geometryCompetition = {
      confidenceTolerance: geometryCompetition.confidenceTolerance,
      selectedIds: geometryCompetition.selected.map((entry) => entry.record.id).slice().sort(),
      rejectedIds: geometryCompetition.rejected.map((entry) => entry.record.id).slice().sort()
    };
    audit.parentTerminalDispositions = finalizedLedger.parentTerminalDispositions;
    audit.rejectedGroups = [];
    audit.corridors.forEach((corridor) => {
      corridor.parentTerminalDispositions = [];
      corridor.rejectedGroups = [];
      corridor.acceptedLabelCount = 0;
      corridor.rejected = { grammar: 0, score: 0, margin: 0, competition: 0, semanticRegion: 0, corridor: 0 };
      corridor.subgroups = {
        generatedGroupCount: 0,
        generatedHypothesisCount: 0,
        grammarEligibleCount: 0,
        grammarRejectedCount: 0,
        scoreRejectedCount: 0,
        marginRejectedCount: 0,
        competitionRejectedCount: 0,
        semanticRegionRejectedCount: 0,
        corridorRejectedCount: 0,
        acceptedSubgroupCount: 0,
        acceptedLabelCount: 0,
        rejected: { grammar: 0, score: 0, margin: 0, competition: 0, semanticRegion: 0, corridor: 0 },
        rejectedGroups: [],
        terminalDispositions: []
      };
    });
    finalizedLedger.outcomes.forEach((outcome) => {
      const corridor = audit.corridors[outcome.corridorIndex];
      const orientationAudit = audit.orientations[outcome.orientationIndex];
      if (!corridor || !orientationAudit) return;
      if (outcome.kind === "parent") {
        corridor.parentTerminalDispositions.push(outcome.record);
        if (outcome.record.accepted) {
          corridor.acceptedLabelCount += 1;
          orientationAudit.acceptedLabelCount += 1;
        } else {
          corridor.rejectedGroups.push(outcome.record);
          audit.rejectedGroups.push(outcome.record);
          corridor.rejected[outcome.category] = (corridor.rejected[outcome.category] || 0) + 1;
          orientationAudit.rejected[outcome.category] = (orientationAudit.rejected[outcome.category] || 0) + 1;
        }
        return;
      }
      const subgroup = corridor.subgroups;
      subgroup.generatedGroupCount += 1;
      subgroup.generatedHypothesisCount += 1;
      if (outcome.grammarEligible) subgroup.grammarEligibleCount += 1;
      subgroup.terminalDispositions.push(outcome.record);
      if (outcome.record.accepted) {
        subgroup.acceptedSubgroupCount += 1;
        subgroup.acceptedLabelCount += 1;
        return;
      }
      subgroup.rejectedGroups.push(outcome.record);
      const counterKey = outcome.category + "RejectedCount";
      subgroup[counterKey] = (subgroup[counterKey] || 0) + 1;
      subgroup.rejected[outcome.category] = (subgroup.rejected[outcome.category] || 0) + 1;
    });
    audit.subgroupDiagnostics = {
      ...finalizedLedger.conservation,
      rejectedGroups: finalizedLedger.terminalDispositions.filter((record) => record.rejected),
      supersededGroups: finalizedLedger.supersededGroups,
      terminalDispositions: finalizedLedger.terminalDispositions,
      conservation: finalizedLedger.conservation
    };
    audit.parentDispositionConservation = finalizedLedger.parentDispositionConservation;
    const result = finalizedLedger.acceptedRecords.slice().sort((left, right) => left.pageBox.y0 - right.pageBox.y0 || left.pageBox.x0 - right.pageBox.x0 || left.id.localeCompare(right.id));
    audit.acceptedLabelCount = result.length;
    audit.rejectionDetailComplete = finalizedLedger.rejectionDetailComplete;
    audit.status = finalizedLedger.status;
    return result;
  }

  function corridorBoundsForAxis(axis, pageHeight, scale) {
    const from = axis && axis.pageFrom;
    const to = axis && axis.pageTo;
    if (!from || !to || !Number.isFinite(axis.axisSpanPt) || axis.axisSpanPt <= 0) return null;
    const orientation = axis.orientation === "vertical" ? "vertical" : "horizontal";
    const mainPadding = 18;
    const perpendicularPadding = Math.max(34, Math.min(64, axis.axisSpanPt * 0.2));
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);
    const pdfBox = orientation === "horizontal"
      ? { x0: minX - mainPadding, y0: minY - perpendicularPadding, x1: maxX + mainPadding, y1: maxY + perpendicularPadding }
      : { x0: minX - perpendicularPadding, y0: minY - mainPadding, x1: maxX + perpendicularPadding, y1: maxY + mainPadding };
    const canvasBox = {
      x0: Math.max(0, Math.floor(pdfBox.x0 * scale)),
      x1: Math.ceil(pdfBox.x1 * scale),
      y0: Math.max(0, Math.floor((pageHeight - pdfBox.y1) * scale)),
      y1: Math.ceil((pageHeight - pdfBox.y0) * scale)
    };
    return { orientation, pdfBox, canvasBox };
  }

  function componentPdfBox(component, corridor, pageHeight, scale) {
    const x0 = corridor.canvasBox.x0 + component.x0;
    const x1 = corridor.canvasBox.x0 + component.x1 + 1;
    const y0 = corridor.canvasBox.y0 + component.y0;
    const y1 = corridor.canvasBox.y0 + component.y1 + 1;
    const pageBox = {
      x0: round(x0 / scale, 3),
      y0: round(pageHeight - y1 / scale, 3),
      x1: round(x1 / scale, 3),
      y1: round(pageHeight - y0 / scale, 3)
    };
    return { ...pageBox, width: round(pageBox.x1 - pageBox.x0, 3), height: round(pageBox.y1 - pageBox.y0, 3) };
  }

  function outlinedVectorDigitGlyphs(paths) {
    const candidates = (Array.isArray(paths) ? paths : [])
      .map((path, index) => ({ path, index, pageBox: path && path.pageBox }))
      .filter((entry) => {
        const box = entry.pageBox;
        const paint = String(entry.path && entry.path.paint || "");
        if (!box || !paint.includes("fill")) return false;
        const width = Number(box.width);
        const height = Number(box.height);
        return width >= 0.08 && height >= 0.08 && width <= 7 && height <= 7;
      });
    const parent = candidates.map((_, index) => index);
    const find = (index) => {
      let root = index;
      while (parent[root] !== root) root = parent[root];
      while (parent[index] !== index) {
        const next = parent[index];
        parent[index] = root;
        index = next;
      }
      return root;
    };
    const unite = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    };
    candidates.forEach((left, leftIndex) => {
      candidates.slice(leftIndex + 1).forEach((right, offset) => {
        if (boxesIntersect(left.pageBox, right.pageBox)) unite(leftIndex, leftIndex + offset + 1);
      });
    });
    const groups = new Map();
    candidates.forEach((entry, index) => {
      const root = find(index);
      const group = groups.get(root) || [];
      group.push(entry);
      groups.set(root, group);
    });
    return Array.from(groups.values()).map((entries, index) => {
      const pageBox = entries.reduce((box, entry) => unionBoxes(box, entry.pageBox), null);
      return {
        id: "pdf-vector-digit-glyph-" + String(index + 1).padStart(4, "0"),
        pageBox,
        pathIds: entries.map((entry) => entry.index).sort((left, right) => left - right),
        pathCount: entries.length,
        pathSignature: entries.map((entry) => [
          round(entry.pageBox.width, 2),
          round(entry.pageBox.height, 2),
          Array.isArray(entry.path && entry.path.segments) ? entry.path.segments.length : 0
        ].join("x")).sort().join("|")
      };
    }).filter((glyph) => glyph.pageBox
      && glyph.pageBox.width >= 0.35
      && glyph.pageBox.height >= 0.35
      && glyph.pageBox.width <= 8
      && glyph.pageBox.height <= 8);
  }

  function outlinedVectorDimensionGroups(paths, axisCandidates) {
    const glyphs = outlinedVectorDigitGlyphs(paths);
    const results = [];
    (axisCandidates || []).forEach((axis) => {
      if (!axis || !axis.pageFrom || !axis.pageTo || !["horizontal", "vertical"].includes(axis.orientation)) return;
      const horizontal = axis.orientation === "horizontal";
      const mainStart = horizontal ? Math.min(axis.pageFrom.x, axis.pageTo.x) : Math.min(axis.pageFrom.y, axis.pageTo.y);
      const mainEnd = horizontal ? Math.max(axis.pageFrom.x, axis.pageTo.x) : Math.max(axis.pageFrom.y, axis.pageTo.y);
      const perpendicular = horizontal ? axis.pageFrom.y : axis.pageFrom.x;
      const compatible = glyphs.map((glyph) => {
        const box = glyph.pageBox;
        const main0 = horizontal ? box.x0 : box.y0;
        const main1 = horizontal ? box.x1 : box.y1;
        const perp0 = horizontal ? box.y0 : box.x0;
        const perp1 = horizontal ? box.y1 : box.x1;
        const mainSpan = main1 - main0;
        const perpSpan = perp1 - perp0;
        const perpCenter = (perp0 + perp1) / 2;
        return { ...glyph, main0, main1, mainSpan, perpSpan, perpCenter };
      }).filter((glyph) => glyph.main1 >= mainStart - 12
        && glyph.main0 <= mainEnd + 12
        && Math.abs(glyph.perpCenter - perpendicular) >= 1.5
        && Math.abs(glyph.perpCenter - perpendicular) <= 18
        && glyph.perpSpan >= glyph.mainSpan * 1.08);
      const bands = [];
      compatible.sort((left, right) => left.perpCenter - right.perpCenter || left.main0 - right.main0).forEach((glyph) => {
        const band = bands.find((candidate) => Math.abs(candidate.perpCenter - glyph.perpCenter) <= Math.max(1.2, Math.min(3, (candidate.perpSpan + glyph.perpSpan) * 0.3)));
        if (!band) {
          bands.push({ glyphs: [glyph], perpCenter: glyph.perpCenter, perpSpan: glyph.perpSpan });
          return;
        }
        band.glyphs.push(glyph);
        band.perpCenter = band.glyphs.reduce((sum, entry) => sum + entry.perpCenter, 0) / band.glyphs.length;
        band.perpSpan = band.glyphs.reduce((sum, entry) => sum + entry.perpSpan, 0) / band.glyphs.length;
      });
      bands.forEach((band, bandIndex) => {
        const ordered = band.glyphs.slice().sort((left, right) => left.main0 - right.main0 || left.main1 - right.main1);
        let group = [];
        const flush = () => {
          if (group.length >= 2 && group.length <= 6) {
            results.push({
              id: "pdf-vector-dimension-group-" + String(axis.id) + "-" + String(bandIndex + 1).padStart(2, "0") + "-" + String(results.length + 1).padStart(3, "0"),
              axisId: axis.id,
              orientation: axis.orientation,
              glyphs: group,
              pageBox: group.reduce((box, glyph) => unionBoxes(box, glyph.pageBox), null),
              perpendicularDistanceToAxis: round(Math.abs(band.perpCenter - perpendicular), 3)
            });
          }
          group = [];
        };
        ordered.forEach((glyph) => {
          const prior = group[group.length - 1];
          const maximumGap = prior ? Math.max(1.8, Math.min(4.5, Math.max(prior.mainSpan, glyph.mainSpan) * 1.35)) : Infinity;
          if (prior && (glyph.main0 - prior.main1 > maximumGap || group.length >= 6)) flush();
          group.push(glyph);
        });
        flush();
      });
    });
    const byKey = new Map();
    results.sort((left, right) => left.perpendicularDistanceToAxis - right.perpendicularDistanceToAxis || left.id.localeCompare(right.id)).forEach((group) => {
      const key = [
        group.orientation,
        quantize(group.pageBox.x0, 0.5),
        quantize(group.pageBox.y0, 0.5),
        quantize(group.pageBox.x1, 0.5),
        quantize(group.pageBox.y1, 0.5)
      ].join(":");
      if (!byKey.has(key)) byKey.set(key, group);
    });
    return Array.from(byKey.values());
  }

  function vectorGlyphRasterComponent(glyph, corridor, pageHeight, scale, width, height) {
    const box = glyph && glyph.pageBox;
    if (!box) return null;
    const x0 = Math.max(0, Math.floor(box.x0 * scale) - corridor.canvasBox.x0);
    const x1 = Math.min(width - 1, Math.ceil(box.x1 * scale) - corridor.canvasBox.x0 - 1);
    const y0 = Math.max(0, Math.floor((pageHeight - box.y1) * scale) - corridor.canvasBox.y0);
    const y1 = Math.min(height - 1, Math.ceil((pageHeight - box.y0) * scale) - corridor.canvasBox.y0 - 1);
    if (x1 < x0 || y1 < y0) return null;
    return {
      x0,
      x1,
      y0,
      y1,
      width: x1 - x0 + 1,
      height: y1 - y0 + 1,
      pixelCount: (x1 - x0 + 1) * (y1 - y0 + 1)
    };
  }

  function outlinedDigitGroups(components, corridor, axis, pageHeight, scale) {
    const orientation = corridor.orientation;
    const mainStart = orientation === "horizontal" ? Math.min(axis.pageFrom.x, axis.pageTo.x) : Math.min(axis.pageFrom.y, axis.pageTo.y);
    const mainEnd = orientation === "horizontal" ? Math.max(axis.pageFrom.x, axis.pageTo.x) : Math.max(axis.pageFrom.y, axis.pageTo.y);
    const perpendicular = orientation === "horizontal" ? axis.pageFrom.y : axis.pageFrom.x;
    const glyphs = components.map((component) => ({ component, pageBox: componentPdfBox(component, corridor, pageHeight, scale) }))
      .filter((entry) => {
        const box = entry.pageBox;
        const main0 = orientation === "horizontal" ? box.x0 : box.y0;
        const main1 = orientation === "horizontal" ? box.x1 : box.y1;
        const perpCenter = orientation === "horizontal" ? (box.y0 + box.y1) / 2 : (box.x0 + box.x1) / 2;
        const mainSpan = Math.max(0.001, main1 - main0);
        const perpSpan = orientation === "horizontal" ? box.height : box.width;
        const withinAxis = main1 >= mainStart - 12 && main0 <= mainEnd + 12;
        const awayFromAxis = Math.abs(perpCenter - perpendicular) >= 2.5;
        const notAxisStroke = !(mainSpan >= (mainEnd - mainStart) * 0.45 && perpSpan <= 1.8);
        return withinAxis && awayFromAxis && notAxisStroke && mainSpan <= 30 && perpSpan <= 30;
      })
      .map((entry) => {
        const box = entry.pageBox;
        const main0 = orientation === "horizontal" ? box.x0 : box.y0;
        const main1 = orientation === "horizontal" ? box.x1 : box.y1;
        const perp0 = orientation === "horizontal" ? box.y0 : box.x0;
        const perp1 = orientation === "horizontal" ? box.y1 : box.x1;
        return {
          ...entry,
          main0,
          main1,
          mainSpan: Math.max(0.001, main1 - main0),
          perpCenter: (perp0 + perp1) / 2,
          perpSpan: Math.max(0.001, perp1 - perp0)
        };
      });
    const bands = [];
    glyphs.slice().sort((left, right) => left.perpCenter - right.perpCenter || left.main0 - right.main0).forEach((glyph) => {
      const candidate = bands.find((band) => Math.abs(band.perpCenter - glyph.perpCenter) <= Math.max(3, Math.min(14, (band.perpSpan + glyph.perpSpan) * 0.45)));
      if (!candidate) {
        bands.push({ glyphs: [glyph], perpCenter: glyph.perpCenter, perpSpan: glyph.perpSpan });
        return;
      }
      candidate.glyphs.push(glyph);
      candidate.perpCenter = candidate.glyphs.reduce((sum, entry) => sum + entry.perpCenter, 0) / candidate.glyphs.length;
      candidate.perpSpan = candidate.glyphs.reduce((sum, entry) => sum + entry.perpSpan, 0) / candidate.glyphs.length;
    });
    const groups = [];
    bands.forEach((band) => {
      const ordered = band.glyphs.slice().sort((left, right) => left.main0 - right.main0 || left.main1 - right.main1);
      const spans = ordered.map((glyph) => glyph.mainSpan).sort((left, right) => left - right);
      const medianSpan = spans.length ? medianOfSorted(spans) : 0;
      const maximumGap = Math.max(3, Math.min(16, medianSpan * 0.95 + 2));
      ordered.forEach((glyph) => {
        const last = groups[groups.length - 1];
        const sameBand = last && last._band === band;
        const previousEnd = sameBand ? last[last.length - 1].main1 : null;
        const gap = sameBand ? glyph.main0 - previousEnd : Infinity;
        if (!sameBand || gap > maximumGap || last.length >= 6) {
          const group = [glyph];
          group._band = band;
          group._meta = {
            perpendicularDistanceToAxis: round(Math.abs(band.perpCenter - perpendicular), 3),
            labelBandLimit: round(Math.max(18, Math.min(36, (mainEnd - mainStart) * 0.12)), 3),
            medianGlyphMainSpan: round(medianSpan, 3),
            maximumGap: round(maximumGap, 3),
            bandGlyphCount: ordered.length
          };
          groups.push(group);
        } else {
          last.push(glyph);
        }
      });
    });
    return groups.filter((group) => group.length >= 1 && group.length <= 6);
  }

  async function decodeOutlinedDimensionLabels(page, axisCandidates, pageWidth, pageHeight, diagnostics, vectorGroups) {
    const audit = diagnostics || {};
    audit.schema = "laibe.planPuzzle.pdfOutlinedDigitDecoderDiagnostics.v1";
    audit.version = OUTLINED_DIGIT_DECODER_VERSION;
    const axes = (axisCandidates || []).filter((axis) => axis && Number(axis.axisSpanPt) > 0 && (axis.orientation === "horizontal" || axis.orientation === "vertical"));
    audit.axisCount = axes.length;
    audit.corridors = [];
    if (!page || typeof page.render !== "function" || !axes.length) {
      audit.status = "no_renderable_page_or_axis";
      return [];
    }
    const renderScale = 4;
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = createLocalCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas && canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) {
      audit.status = "canvas_unavailable";
      return [];
    }
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff", intent: "display" }).promise;
    const templates = outlinedDigitTemplates();
    const documentVectorTemplates = new Map();
    audit.templateCount = templates.length;
    if (!templates.length) {
      audit.status = "font_templates_unavailable";
      return [];
    }
    const labels = [];
    axes.forEach((axis) => {
      const corridor = corridorBoundsForAxis(axis, pageHeight, renderScale);
      if (!corridor) return;
      corridor.canvasBox.x1 = Math.min(canvas.width, corridor.canvasBox.x1);
      corridor.canvasBox.y1 = Math.min(canvas.height, corridor.canvasBox.y1);
      const width = corridor.canvasBox.x1 - corridor.canvasBox.x0;
      const height = corridor.canvasBox.y1 - corridor.canvasBox.y0;
      if (width < 8 || height < 8) return;
      const image = context.getImageData(corridor.canvasBox.x0, corridor.canvasBox.y0, width, height);
      const binary = byteForeground(image, 184);
      const componentList = connectedForegroundComponents(binary, width, height);
      const groups = outlinedDigitGroups(componentList, corridor, axis, pageHeight, renderScale);
      const axisVectorGroups = (vectorGroups || []).filter((group) => group.axisId === axis.id && group.orientation === corridor.orientation);
      const corridorAudit = { axisId: axis.id || null, orientation: corridor.orientation, componentCount: componentList.length, groupCount: groups.length, vectorGroupCount: axisVectorGroups.length, vectorReadings: [], acceptedLabelCount: 0, rejected: { nonNumeric: 0, score: 0, margin: 0 }, rejectedGroups: [] };
      audit.corridors.push(corridorAudit);
      groups.forEach((group, groupIndex) => {
        const classifiedDigits = group.map((glyph) => classifyOutlinedDigit(binary, width, height, glyph.component, corridor.orientation, templates));
        const rotations = corridor.orientation === "vertical" ? ["cw", "ccw"] : ["none"];
        const readings = rotations.map((rotation) => {
          // Components are sorted bottom-to-top in immutable PDF coordinates. A
          // counter-clockwise label is therefore read in the opposite order.
          const ordered = corridor.orientation === "vertical" && rotation === "ccw" ? group.slice().reverse() : group.slice();
          const indexByGlyph = new Map(group.map((glyph, index) => [glyph, index]));
          const digits = ordered.map((glyph) => classifiedDigits[indexByGlyph.get(glyph)].byRotation[rotation]);
          const rawLabel = digits.map((digit) => digit.bestClass || "").join("");
          return {
            rotation,
            digits,
            rawLabel,
            numeric: numericDimensionText(rawLabel),
            score: digits.length ? Math.min.apply(null, digits.map((digit) => digit.score)) : 0,
            margin: digits.length ? Math.min.apply(null, digits.map((digit) => digit.margin)) : 0
          };
        }).sort((left, right) => right.score - left.score || right.margin - left.margin || left.rawLabel.localeCompare(right.rawLabel));
        const reading = readings[0] || { rawLabel: "", digits: [], score: 0, margin: 0, numeric: null, rotation: "none" };
        const rawLabel = reading.rawLabel;
        const numeric = reading.numeric;
        const score = reading.score;
        const margin = reading.margin;
        const rejection = (rule) => {
          if (corridorAudit.rejectedGroups.length < 6) {
            corridorAudit.rejectedGroups.push({
              rule,
              rawLabel,
              rotation: reading.rotation,
              score: round(score, 6),
              margin: round(margin, 6),
              grouping: group._meta || null,
              digits: reading.digits.map((digit) => ({
                bestClass: digit.bestClass || null,
                candidates: digit.candidates || [],
                topology: digit.topology || null
              }))
            });
          }
        };
        if (!numeric || rawLabel.length > 6) { corridorAudit.rejected.nonNumeric += 1; rejection("numeric_string_required"); return; }
        if (group._meta && group._meta.perpendicularDistanceToAxis > group._meta.labelBandLimit) { corridorAudit.rejected.nonNumeric += 1; rejection("axis_label_band_distance"); return; }
        if (score < 0.47) { corridorAudit.rejected.score += 1; rejection("minimum_digit_score"); return; }
        if (margin < 0.035) { corridorAudit.rejected.margin += 1; rejection("minimum_digit_margin"); return; }
        const pageBox = group.reduce((box, glyph) => box ? {
          x0: Math.min(box.x0, glyph.pageBox.x0), y0: Math.min(box.y0, glyph.pageBox.y0),
          x1: Math.max(box.x1, glyph.pageBox.x1), y1: Math.max(box.y1, glyph.pageBox.y1)
        } : { ...glyph.pageBox }, null);
        labels.push({
          id: "pdf-outlined-dimension-label-" + String(axis.id || "axis") + "-" + String(groupIndex + 1).padStart(2, "0"),
          source: "pdf-rendered-outlined-digit",
          decoderMethod: OUTLINED_DIGIT_DECODER_VERSION,
          rawLabel: numeric.rawLabel,
          normalizedNumericValue: numeric.normalizedNumericValue,
          explicitUnit: numeric.explicitUnit,
          pageBox,
          orientation: corridor.orientation,
          rotationDegrees: reading.rotation === "cw" ? 90 : reading.rotation === "ccw" ? -90 : 0,
          confidence: round(score, 6),
          runnerUpMargin: round(margin, 6),
          digitEvidence: reading.digits.map((digit) => ({ bestClass: digit.bestClass, score: digit.score, runnerUp: digit.runnerUp, runnerUpScore: digit.runnerUpScore, margin: digit.margin, rotation: reading.rotation })),
          groupingEvidence: group._meta || null,
          page: 1,
          evidenceOnly: true,
          reviewRequired: true
        });
        corridorAudit.acceptedLabelCount += 1;
      });
      axisVectorGroups.forEach((group, groupIndex) => {
        const glyphComponents = group.glyphs.map((glyph) => {
          const component = vectorGlyphRasterComponent(glyph, corridor, pageHeight, renderScale, width, height);
          return {
            glyph,
            component,
            classified: component ? classifyOutlinedDigit(binary, width, height, component, corridor.orientation, templates) : null
          };
        });
        if (glyphComponents.some((entry) => !entry.classified)) return;
        const rotations = corridor.orientation === "vertical" ? ["cw", "ccw"] : ["none"];
        const readings = rotations.map((rotation) => {
          const ordered = corridor.orientation === "vertical" && rotation === "ccw"
            ? glyphComponents.slice().reverse()
            : glyphComponents;
          const digits = ordered.map((entry) => {
            const base = entry.classified.byRotation[rotation];
            const bitmap = normalizedBitmap(binary, width, height, entry.component, rotation);
            const localMatches = Array.from(documentVectorTemplates.entries()).map(([digit, localTemplates]) => ({
              digit,
              score: Math.max(...localTemplates.map((template) => template.pathSignature === entry.glyph.pathSignature
                ? 1
                : bitmapScore(bitmap, template.bitmap)))
            })).sort((left, right) => right.score - left.score || left.digit.localeCompare(right.digit));
            const localBest = localMatches[0] || null;
            const localRunner = localMatches[1] || null;
            const localMargin = localBest ? localBest.score - (localRunner ? localRunner.score : 0) : 0;
            if (localBest && localBest.score >= 0.72 && localMargin >= 0.08) {
              return {
                ...base,
                bestClass: localBest.digit,
                score: round(Math.max(base.score, localBest.score * 0.9), 6),
                runnerUp: localRunner && localRunner.digit || base.runnerUp,
                runnerUpScore: round(localRunner ? localRunner.score * 0.9 : base.runnerUpScore, 6),
                margin: round(Math.max(base.margin, localMargin * 0.9), 6),
                documentLocalMatch: {
                  source: "same-document-confirmed-vector-glyph",
                  score: round(localBest.score, 6),
                  margin: round(localMargin, 6)
                },
                bitmap,
                pathSignature: entry.glyph.pathSignature
              };
            }
            return { ...base, bitmap, pathSignature: entry.glyph.pathSignature };
          });
          const rawLabel = digits.map((digit) => digit.bestClass || "").join("");
          return {
            rotation,
            digits,
            rawLabel,
            numeric: numericDimensionText(rawLabel),
            score: digits.length ? Math.min(...digits.map((digit) => digit.score)) : 0,
            margin: digits.length ? Math.min(...digits.map((digit) => digit.margin)) : 0
          };
        }).sort((left, right) => right.score - left.score || right.margin - left.margin || left.rawLabel.localeCompare(right.rawLabel));
        const rasterAnchor = labels.find((label) => label
          && label.source === "pdf-rendered-outlined-digit"
          && String(label.rawLabel || "").length === group.glyphs.length
          && overlapArea(label.pageBox, group.pageBox) / Math.max(0.001, Math.min(boxArea(label.pageBox), boxArea(group.pageBox))) >= 0.72);
        const anchoredReading = rasterAnchor
          ? readings.find((entry) => entry.rawLabel === rasterAnchor.rawLabel)
          : null;
        const reading = anchoredReading || readings[0];
        if (anchoredReading) {
          String(rasterAnchor.rawLabel).split("").forEach((digit, index) => {
            const localTemplates = documentVectorTemplates.get(digit) || [];
            localTemplates.push({
              bitmap: anchoredReading.digits[index].bitmap,
              pathSignature: anchoredReading.digits[index].pathSignature
            });
            documentVectorTemplates.set(digit, localTemplates);
          });
        }
        corridorAudit.vectorReadings.push({
          groupId: group.id,
          readings: readings.map((entry) => ({
            rotation: entry.rotation,
            rawLabel: entry.rawLabel,
            score: round(entry.score, 6),
            margin: round(entry.margin, 6),
            digits: entry.digits.map((digit) => ({
              bestClass: digit.bestClass,
              score: digit.score,
              runnerUp: digit.runnerUp,
              runnerUpScore: digit.runnerUpScore,
              margin: digit.margin
            }))
          }))
        });
        if (!reading || !reading.numeric || reading.score < 0.6 || reading.margin < 0.035) return;
        labels.push({
          id: "pdf-vector-dimension-label-" + String(axis.id || "axis") + "-" + String(groupIndex + 1).padStart(2, "0"),
          source: "pdf-rendered-outlined-vector-glyph",
          decoderMethod: OUTLINED_DIGIT_DECODER_VERSION + "-vector-path-grouping",
          rawLabel: reading.numeric.rawLabel,
          normalizedNumericValue: reading.numeric.normalizedNumericValue,
          explicitUnit: reading.numeric.explicitUnit,
          pageBox: group.pageBox,
          orientation: corridor.orientation,
          rotationDegrees: reading.rotation === "cw" ? 90 : reading.rotation === "ccw" ? -90 : 0,
          confidence: round(reading.score, 6),
          runnerUpMargin: round(reading.margin, 6),
          digitEvidence: reading.digits.map((digit) => ({ bestClass: digit.bestClass, score: digit.score, runnerUp: digit.runnerUp, runnerUpScore: digit.runnerUpScore, margin: digit.margin, rotation: reading.rotation, documentLocalMatch: digit.documentLocalMatch || null })),
          groupingEvidence: {
            method: "native-filled-path-overlap-glyphs",
            perpendicularDistanceToAxis: group.perpendicularDistanceToAxis,
            glyphCount: group.glyphs.length,
            pathIds: group.glyphs.flatMap((glyph) => glyph.pathIds).sort((left, right) => left - right)
          },
          page: 1,
          evidenceOnly: true,
          reviewRequired: true
        });
        corridorAudit.acceptedLabelCount += 1;
      });
    });
    const byKey = new Map();
    labels.sort((left, right) => right.confidence - left.confidence || right.runnerUpMargin - left.runnerUpMargin || left.id.localeCompare(right.id)).forEach((label) => {
      const key = [label.rawLabel, label.orientation, quantize((label.pageBox.x0 + label.pageBox.x1) / 2, 2), quantize((label.pageBox.y0 + label.pageBox.y1) / 2, 2)].join(":");
      if (!byKey.has(key)) byKey.set(key, label);
    });
    const result = Array.from(byKey.values()).sort((left, right) => (left.pageBox.y0 - right.pageBox.y0) || (left.pageBox.x0 - right.pageBox.x0) || left.id.localeCompare(right.id));
    audit.status = result.length ? "outlined_labels_available" : "no_confident_outlined_labels";
    audit.acceptedLabelCount = result.length;
    return result;
  }

  function dimensionAxisLabelAssociation(axis, labels, axes) {
    if (!(axis && axis.pageFrom && axis.pageTo && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.chainCompatible)) return null;
    const horizontal = axis.orientation === "horizontal";
    const mainStart = horizontal ? Math.min(axis.pageFrom.x, axis.pageTo.x) : Math.min(axis.pageFrom.y, axis.pageTo.y);
    const mainEnd = horizontal ? Math.max(axis.pageFrom.x, axis.pageTo.x) : Math.max(axis.pageFrom.y, axis.pageTo.y);
    const midpoint = (mainStart + mainEnd) / 2;
    const perpendicular = horizontal ? axis.pageFrom.y : axis.pageFrom.x;
    const compatible = (labels || []).filter((label) => {
      if (!label || !label.pageBox || (label.orientation && label.orientation !== axis.orientation)) return false;
      const confidence = Number(label.confidence);
      const margin = Number(label.runnerUpMargin);
      return label.source === "pdf-rendered-outlined-vector-glyph"
        ? confidence >= 0.6 && margin >= 0.035
        : confidence >= 0.75 && margin >= 0.08;
    }).map((label) => {
      const box = label.pageBox;
      const main = horizontal ? (box.x0 + box.x1) / 2 : (box.y0 + box.y1) / 2;
      const perp = horizontal ? (box.y0 + box.y1) / 2 : (box.x0 + box.x1) / 2;
      const perpendicularDistance = Math.abs(perp - perpendicular);
      const midpointDistanceRatio = Math.abs(main - midpoint) / Math.max(1, mainEnd - mainStart);
      const inSpan = main >= mainStart - 12 && main <= mainEnd + 12;
      const score = inSpan && perpendicularDistance <= 18
        ? 1.25 - perpendicularDistance / 30 - midpointDistanceRatio * 0.45 + Math.min(0.12, Number(label.confidence || 0) * 0.12)
        : -Infinity;
      return { label, score, perpendicularDistance, midpointDistanceRatio };
    }).filter((entry) => Number.isFinite(entry.score))
      .sort((left, right) => right.score - left.score || String(left.label.id).localeCompare(String(right.label.id)));
    const best = compatible[0] || null;
    if (!best) return null;
    const competingAxes = (axes || []).filter((other) => other !== axis
      && other.orientation === axis.orientation
      && other.dimensionAxisEvidence && other.dimensionAxisEvidence.chainCompatible).map((other) => {
      const otherPerpendicular = horizontal ? other.pageFrom.y : other.pageFrom.x;
      const otherMainStart = horizontal ? Math.min(other.pageFrom.x, other.pageTo.x) : Math.min(other.pageFrom.y, other.pageTo.y);
      const otherMainEnd = horizontal ? Math.max(other.pageFrom.x, other.pageTo.x) : Math.max(other.pageFrom.y, other.pageTo.y);
      const box = best.label.pageBox;
      const main = horizontal ? (box.x0 + box.x1) / 2 : (box.y0 + box.y1) / 2;
      const perp = horizontal ? (box.y0 + box.y1) / 2 : (box.x0 + box.x1) / 2;
      if (main < otherMainStart - 12 || main > otherMainEnd + 12) return null;
      const otherScore = 1.25 - Math.abs(perp - otherPerpendicular) / 30 - Math.abs(main - (otherMainStart + otherMainEnd) / 2) / Math.max(1, otherMainEnd - otherMainStart) * 0.45 + Math.min(0.12, Number(best.label.confidence || 0) * 0.12);
      return { axisId: other.id, score: otherScore };
    }).filter(Boolean).sort((left, right) => right.score - left.score);
    const runnerUp = Math.max(
      compatible[1] ? compatible[1].score : 0,
      competingAxes[0] ? competingAxes[0].score : 0
    );
    const margin = best.score - runnerUp;
    return {
      labelId: best.label.id,
      score: round(best.score, 6),
      runnerUpMargin: round(margin, 6),
      perpendicularDistancePt: round(best.perpendicularDistance, 3),
      midpointDistanceRatio: round(best.midpointDistanceRatio, 6),
      eligible: best.score >= 0.8 && margin >= 0.08
    };
  }

  function enrichDimensionAxisEvidence(axisCandidates, candidateLines, numericDimensionLabels) {
    const sourceLines = Array.isArray(candidateLines) ? candidateLines : [];
    const enriched = (axisCandidates || []).map((axis) => {
      const p1 = axis && axis.pageFrom;
      const p2 = axis && axis.pageTo;
      if (!p1 || !p2) return axis;
      const spanPt = Math.hypot(Number(p2.x) - Number(p1.x), Number(p2.y) - Number(p1.y));
      const witnessTolerance = Math.max(3, Math.min(18, spanPt * 0.08));
      const witnessRows = sourceLines.map((line) => {
        if (!line || line.orientation === axis.orientation || line.orientation === "diagonal") return false;
        const from = line.pageFrom;
        const to = line.pageTo;
        if (!from || !to) return false;
        const nearFirst = Math.min(Math.hypot(from.x - p1.x, from.y - p1.y), Math.hypot(to.x - p1.x, to.y - p1.y)) <= witnessTolerance;
        const nearSecond = Math.min(Math.hypot(from.x - p2.x, from.y - p2.y), Math.hypot(to.x - p2.x, to.y - p2.y)) <= witnessTolerance;
        return nearFirst || nearSecond ? { id: line.id, nearFirst, nearSecond } : null;
      }).filter(Boolean);
      const firstWitnessLineIds = witnessRows.filter((row) => row.nearFirst).map((row) => row.id).filter(Boolean).sort();
      const secondWitnessLineIds = witnessRows.filter((row) => row.nearSecond).map((row) => row.id).filter(Boolean).sort();
      const witnesses = Array.from(new Set(firstWitnessLineIds.concat(secondWitnessLineIds))).sort();
      return {
        ...axis,
        pageFrom: { x: round(p1.x, 3), y: round(p1.y, 3) },
        pageTo: { x: round(p2.x, 3), y: round(p2.y, 3) },
        axisSpanPt: round(spanPt, 6),
        dimensionAxisEvidence: {
          orientation: axis.orientation,
          witnessLineIds: witnesses,
          witnessCount: witnesses.length,
          witnessEndpointCoverage: {
            first: firstWitnessLineIds,
            second: secondWitnessLineIds
          },
          chainCompatible: firstWitnessLineIds.length >= 1 && secondWitnessLineIds.length >= 1,
          regionSegmentationEligible: axis.regionSegmentationEligible === true,
          evidenceOnly: true
        }
      };
    });
    return enriched.map((axis) => {
      const association = dimensionAxisLabelAssociation(axis, numericDimensionLabels, enriched);
      return {
        ...axis,
        dimensionAxisEvidence: {
          ...(axis.dimensionAxisEvidence || {}),
          labelAssociation: association,
          labelAssociationEligible: association && association.eligible === true
        }
      };
    });
  }

  function suppressTextZoneGeometry(lines, rects, textZones) {
    if (!textZones || !textZones.length) {
      return {
        lines,
        rects,
        suppressedLineCount: 0,
        suppressedRectCount: 0,
        textZoneCount: 0
      };
    }
    const keptLines = [];
    let suppressedLineCount = 0;
    lines.forEach((line) => {
      const box = expandBox(lineCanvasBox(line), Math.max(1, (Number(line.lineWidthDevice) || 0) * 0.5));
      const center = centerOfBox(box);
      const overlapsText = textZones.some((zone) => {
        const overlap = overlapArea(box, zone.canvasBox);
        return pointInBox(center, zone.canvasBox) ||
          (overlap > 0 && overlap / Math.max(1, boxArea(box)) >= 0.2 && line.lengthPx <= Math.max(zone.canvasBox.width, zone.canvasBox.height) * 1.8);
      });
      if (overlapsText) {
        suppressedLineCount += 1;
      } else {
        keptLines.push(line);
      }
    });
    const keptRects = [];
    let suppressedRectCount = 0;
    rects.forEach((rect) => {
      const box = rect.canvasBox;
      const center = centerOfBox(box);
      const overlapsText = textZones.some((zone) => {
        const overlap = overlapArea(box, zone.canvasBox);
        return pointInBox(center, zone.canvasBox) || overlap / Math.max(1, boxArea(box)) >= 0.3;
      });
      if (overlapsText) {
        suppressedRectCount += 1;
      } else {
        keptRects.push(rect);
      }
    });
    return {
      lines: keptLines,
      rects: keptRects,
      suppressedLineCount,
      suppressedRectCount,
      textZoneCount: textZones.length
    };
  }

  function canonicalWallCandidateKey(wall) {
    const tolerance = 0.65;
    const points = [wall.pageFrom, wall.pageTo].sort((a, b) => (a.x - b.x) || (a.y - b.y));
    return [
      wall.orientation,
      quantize(points[0].x, tolerance),
      quantize(points[0].y, tolerance),
      quantize(points[1].x, tolerance),
      quantize(points[1].y, tolerance)
    ].join(":");
  }

  function wallAxisValues(wall, pointSpace) {
    const from = pointSpace === "canvas" ? wall.from : wall.pageFrom;
    const to = pointSpace === "canvas" ? wall.to : wall.pageTo;
    if (!from || !to) return null;
    const horizontal = wall.orientation === "horizontal";
    const main0 = horizontal ? Math.min(from.x, to.x) : Math.min(from.y, to.y);
    const main1 = horizontal ? Math.max(from.x, to.x) : Math.max(from.y, to.y);
    const lateral = horizontal ? (from.y + to.y) / 2 : (from.x + to.x) / 2;
    return { main0, main1, lateral, horizontal };
  }

  function rebuildWallEndpoints(wall, pointSpace, main0, main1, lateral) {
    const horizontal = wall.orientation === "horizontal";
    const from = horizontal ? { x: round(main0, 3), y: round(lateral, 3) } : { x: round(lateral, 3), y: round(main0, 3) };
    const to = horizontal ? { x: round(main1, 3), y: round(lateral, 3) } : { x: round(lateral, 3), y: round(main1, 3) };
    if (pointSpace === "canvas") {
      wall.from = from;
      wall.to = to;
    } else {
      wall.pageFrom = from;
      wall.pageTo = to;
    }
  }

  // 同一道實體牆常被抽成多筆候選：同軸多段重疊，或厚牆的兩條面線各自成
  // 牆（側向錯開約一個牆厚）。此步驟把冗餘候選收斂成單一真實厚度的牆，
  // 讓下游 1:1 對應的就是實體牆而不是面線。
  function mergeRedundantWallCandidates(walls, wallThicknessPx) {
    const maxLateralOffsetPt = Math.max(4, Number(wallThicknessPx || 0) * 1.7);
    const minOverlapRatio = 0.55;
    const pools = { horizontal: [], vertical: [], other: [] };
    (walls || []).forEach((wall) => {
      if (!wall || !wall.pageFrom || !wall.pageTo) return;
      const key = wall.orientation === "horizontal" || wall.orientation === "vertical" ? wall.orientation : "other";
      pools[key].push({ ...wall, mergedFromIds: Array.isArray(wall.mergedFromIds) ? wall.mergedFromIds.slice() : [wall.id] });
    });
    let mergedCount = 0;
    ["horizontal", "vertical"].forEach((orientation) => {
      const pool = pools[orientation];
      let changed = true;
      while (changed) {
        changed = false;
        outer: for (let i = 0; i < pool.length; i += 1) {
          for (let j = i + 1; j < pool.length; j += 1) {
            const a = pool[i];
            const b = pool[j];
            const pa = wallAxisValues(a, "page");
            const pb = wallAxisValues(b, "page");
            if (!pa || !pb) continue;
            const offset = Math.abs(pa.lateral - pb.lateral);
            if (offset > maxLateralOffsetPt) continue;
            const overlap = Math.min(pa.main1, pb.main1) - Math.max(pa.main0, pb.main0);
            const shorter = Math.max(0.001, Math.min(pa.main1 - pa.main0, pb.main1 - pb.main0));
            const collinear = offset <= Math.max(1.2, (Number(a.lineWidthPdf || 0) + Number(b.lineWidthPdf || 0)) * 0.25);
            const collinearJoinGapPt = Math.max(1.5, Number(wallThicknessPx || 0) * 0.4);
            const compatible = collinear
              ? overlap >= -collinearJoinGapPt
              : overlap >= shorter * minOverlapRatio;
            if (!compatible) continue;
            const widthA = Number(a.lineWidthPdf || 0);
            const widthB = Number(b.lineWidthPdf || 0);
            const lengthA = pa.main1 - pa.main0;
            const lengthB = pb.main1 - pb.main0;
            const primary = lengthA >= lengthB ? a : b;
            const merged = { ...primary };
            merged.mergedFromIds = Array.from(new Set([].concat(a.mergedFromIds, b.mergedFromIds))).sort();
            merged.duplicateCount = (a.duplicateCount || 1) + (b.duplicateCount || 1);
            merged.lineWidthPdf = collinear
              ? round(Math.max(widthA, widthB), 3)
              : round(offset + (widthA + widthB) / 2, 3);
            merged.lineWidthDevice = Math.max(Number(a.lineWidthDevice || 0), Number(b.lineWidthDevice || 0), merged.lineWidthPdf);
            if (a.type === "outer_or_structural_wall" || b.type === "outer_or_structural_wall" || merged.lineWidthPdf >= 1) {
              merged.type = "outer_or_structural_wall";
              merged.label = "外牆 / 結構牆候選";
            }
            merged.fromFilledWall = Boolean(a.fromFilledWall || b.fromFilledWall);
            const mergedMain0 = Math.min(pa.main0, pb.main0);
            const mergedMain1 = Math.max(pa.main1, pb.main1);
            const mergedLateral = collinear
              ? (lengthA >= lengthB ? pa.lateral : pb.lateral)
              : (pa.lateral * lengthA + pb.lateral * lengthB) / Math.max(0.001, lengthA + lengthB);
            rebuildWallEndpoints(merged, "page", mergedMain0, mergedMain1, mergedLateral);
            const ca = wallAxisValues(a, "canvas");
            const cb = wallAxisValues(b, "canvas");
            if (ca && cb) {
              const canvasMain0 = Math.min(ca.main0, cb.main0);
              const canvasMain1 = Math.max(ca.main1, cb.main1);
              const canvasLateral = collinear
                ? (lengthA >= lengthB ? ca.lateral : cb.lateral)
                : (ca.lateral * lengthA + cb.lateral * lengthB) / Math.max(0.001, lengthA + lengthB);
              rebuildWallEndpoints(merged, "canvas", canvasMain0, canvasMain1, canvasLateral);
            }
            merged.lengthPdf = round(distance(merged.pageFrom, merged.pageTo), 2);
            merged.mergeKind = collinear ? "collinear_union" : "parallel_face_pair";
            pool.splice(j, 1);
            pool.splice(i, 1, merged);
            mergedCount += 1;
            changed = true;
            break outer;
          }
        }
      }
    });
    return {
      walls: pools.horizontal.concat(pools.vertical, pools.other),
      mergedWallCount: mergedCount
    };
  }

  // 樓梯梯級的線對不得升為牆：與已辨識梯級線同向、側向距離一個牆厚內且
  // 大幅重疊的牆候選，一律降回樓梯來源線，不進入牆集合。
  function filterStairTreadWallCandidates(walls, stairCandidates, openingCandidates, wallThicknessPx) {
    const treadLines = [];
    (stairCandidates || []).forEach((stair) => {
      const items = stair && stair.evidence && Array.isArray(stair.evidence.treadLines) ? stair.evidence.treadLines : [];
      items.forEach((tread) => {
        if (tread && tread.p1 && tread.p2) treadLines.push(tread);
      });
    });
    if (!treadLines.length) {
      return { walls: walls || [], removedTreadWallCount: 0, removedTreadWallIds: [] };
    }
    const openingEvidenceJson = JSON.stringify(openingCandidates || []);
    const lateralTolerancePt = Math.max(3, Number(wallThicknessPx || 0) * 1.1);
    const removedTreadWallIds = [];
    const kept = (walls || []).filter((wall) => {
      const axis = wallAxisValues(wall, "page");
      if (!axis) return true;
      if (wall.id && openingEvidenceJson.indexOf('"' + wall.id + '"') >= 0) return true;
      const matchesTread = treadLines.some((tread) => {
        const horizontal = Math.abs(tread.p2.x - tread.p1.x) >= Math.abs(tread.p2.y - tread.p1.y);
        if (horizontal !== axis.horizontal) return false;
        const treadMain0 = horizontal ? Math.min(tread.p1.x, tread.p2.x) : Math.min(tread.p1.y, tread.p2.y);
        const treadMain1 = horizontal ? Math.max(tread.p1.x, tread.p2.x) : Math.max(tread.p1.y, tread.p2.y);
        const treadLateral = horizontal ? (tread.p1.y + tread.p2.y) / 2 : (tread.p1.x + tread.p2.x) / 2;
        if (Math.abs(treadLateral - axis.lateral) > lateralTolerancePt) return false;
        const overlap = Math.min(axis.main1, treadMain1) - Math.max(axis.main0, treadMain0);
        const wallLength = Math.max(0.001, axis.main1 - axis.main0);
        return overlap >= wallLength * 0.5;
      });
      if (matchesTread) {
        removedTreadWallIds.push(wall.id || null);
        return false;
      }
      return true;
    });
    return { walls: kept, removedTreadWallCount: removedTreadWallIds.length, removedTreadWallIds };
  }

  function dedupeWallCandidates(walls) {
    const byKey = new Map();
    walls.forEach((wall) => {
      if (!wall || !wall.pageFrom || !wall.pageTo) {
        return;
      }
      const key = canonicalWallCandidateKey(wall);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...wall });
        return;
      }
      existing.duplicateCount = (existing.duplicateCount || 1) + (wall.duplicateCount || 1);
      existing.lineWidthPdf = Math.max(existing.lineWidthPdf || 0, wall.lineWidthPdf || 0);
      existing.lineWidthDevice = Math.max(existing.lineWidthDevice || 0, wall.lineWidthDevice || 0);
      existing.lengthPdf = Math.max(existing.lengthPdf || 0, wall.lengthPdf || 0);
      if (wall.type === "outer_or_structural_wall") {
        existing.type = wall.type;
        existing.label = wall.label;
      }
      if (wall.fromFilledWall) {
        existing.fromFilledWall = true;
      }
    });
    return Array.from(byKey.values());
  }

  function healWallEndpoints(walls, wallThicknessPx, transformHelpers) {
    const thresholdPx = Math.max(wallThicknessPx * 3, 12);
    const healedWalls = walls.map((wall) => ({ ...wall, from: { ...wall.from }, to: { ...wall.to }, pageFrom: { ...wall.pageFrom }, pageTo: { ...wall.pageTo } }));
    const horizontals = healedWalls.filter((wall) => wall.orientation === "horizontal");
    const verticals = healedWalls.filter((wall) => wall.orientation === "vertical");
    let healedEndpointCount = 0;

    function findSnapTarget(point, targets, axis) {
      let best = null;
      targets.forEach((targetWall) => {
        const targetBox = lineCanvasBox(targetWall);
        const withinPrimary = axis === "horizontal"
          ? point.y >= targetBox.y0 - thresholdPx && point.y <= targetBox.y1 + thresholdPx
          : point.x >= targetBox.x0 - thresholdPx && point.x <= targetBox.x1 + thresholdPx;
        if (!withinPrimary) {
          return;
        }
        const distance = axis === "horizontal"
          ? Math.abs(point.x - ((targetBox.x0 + targetBox.x1) / 2))
          : Math.abs(point.y - ((targetBox.y0 + targetBox.y1) / 2));
        if (distance > thresholdPx) {
          return;
        }
        if (!best || distance < best.distance) {
          best = { targetBox, distance };
        }
      });
      return best;
    }

    function snapEndpoint(wall, endpointKey, targets, axis) {
      const point = wall[endpointKey];
      if (!point) {
        return false;
      }
      const match = findSnapTarget(point, targets, axis);
      if (!match) {
        return false;
      }
      const targetBox = match.targetBox;
      const before = { x: point.x, y: point.y };
      if (axis === "horizontal") {
        point.x = round((targetBox.x0 + targetBox.x1) / 2, 2);
      } else {
        point.y = round((targetBox.y0 + targetBox.y1) / 2, 2);
      }
      if (Math.abs(point.x - before.x) < 0.01 && Math.abs(point.y - before.y) < 0.01) {
        return false;
      }
      wall[endpointKey === "from" ? "pageFrom" : "pageTo"] = transformHelpers.canvasToPage(point);
      return true;
    }

    horizontals.forEach((wall) => {
      if (snapEndpoint(wall, "from", verticals, "horizontal")) {
        healedEndpointCount += 1;
      }
      if (snapEndpoint(wall, "to", verticals, "horizontal")) {
        healedEndpointCount += 1;
      }
    });
    verticals.forEach((wall) => {
      if (snapEndpoint(wall, "from", horizontals, "vertical")) {
        healedEndpointCount += 1;
      }
      if (snapEndpoint(wall, "to", horizontals, "vertical")) {
        healedEndpointCount += 1;
      }
    });
    healedWalls.forEach((wall) => {
      wall.lengthPdf = round(distance(wall.pageFrom, wall.pageTo), 2);
    });
    return { walls: healedWalls, healedEndpointCount };
  }

  function summarizeOptionalContentConfig(config) {
    if (!config) {
      return {
        available: false,
        layerCount: 0,
        selectedLayerCount: 0,
        visibleLayerCount: 0,
        selectedLayerNames: []
      };
    }
    const groupSource = typeof config.getGroups === "function" ? config.getGroups() : config.groups;
    const groups = [];
    if (groupSource instanceof Map) {
      groupSource.forEach((value, key) => groups.push({ id: key, ...value }));
    } else if (Array.isArray(groupSource)) {
      groupSource.forEach((value, index) => groups.push({ id: value && value.id || index, ...(value || {}) }));
    } else if (groupSource && typeof groupSource === "object") {
      Object.keys(groupSource).forEach((key) => groups.push({ id: key, ...(groupSource[key] || {}) }));
    }
    const structureNamePattern = /(牆|柱|結構|隔間|wall|column)/i;
    const visibleGroups = groups.filter((group) => {
      if (typeof config.isVisible !== "function") {
        return group.visible !== false;
      }
      try {
        return config.isVisible(group);
      } catch (error) {
        try {
          return config.isVisible(group.id);
        } catch (innerError) {
          return group.visible !== false;
        }
      }
    });
    const selectedLayerNames = visibleGroups
      .map((group) => String(group.name || group.title || group.id || "").trim())
      .filter((name) => structureNamePattern.test(name));
    return {
      available: true,
      layerCount: groups.length,
      selectedLayerCount: selectedLayerNames.length,
      visibleLayerCount: visibleGroups.length,
      selectedLayerNames
    };
  }

  function createEmptyPath(lineWidthPdf, lineWidthDevice) {
    return {
      lineWidthPdf: round(lineWidthPdf || 0, 3),
      lineWidthDevice: round(lineWidthDevice || 0, 3),
      segments: [],
      hasCurve: false,
      closed: false,
      pageBox: null,
      canvasBox: null
    };
  }

  function appendPendingPath(target, path, bbox, lineWidthPdf, lineWidthDevice) {
    target.lineWidthPdf = Math.max(target.lineWidthPdf || 0, round(lineWidthPdf || 0, 3));
    target.lineWidthDevice = Math.max(target.lineWidthDevice || 0, round(lineWidthDevice || 0, 3));
    target.segments.push(...(path.segments || []));
    target.hasCurve = target.hasCurve || !!path.hasCurve;
    target.closed = target.closed || !!path.closed;
    target.pageBox = unionBoxes(target.pageBox, bbox && bbox.page);
    target.canvasBox = unionBoxes(target.canvasBox, bbox && bbox.canvas);
  }

  function finiteBox(box) {
    return box && [box.x0, box.y0, box.x1, box.y1].every((value) => Number.isFinite(Number(value)))
      ? box
      : null;
  }

  function pageLineBox(line, padding = 0) {
    if (!line || !line.pageFrom || !line.pageTo) return null;
    return boxFromPoints([
      { x: Number(line.pageFrom.x) - padding, y: Number(line.pageFrom.y) - padding },
      { x: Number(line.pageTo.x) + padding, y: Number(line.pageTo.y) + padding }
    ]);
  }

  function lineAxisRange(line) {
    if (!line || !line.pageFrom || !line.pageTo) return null;
    const orientation = line.orientation;
    if (orientation === "horizontal") {
      const main0 = Math.min(line.pageFrom.x, line.pageTo.x);
      const main1 = Math.max(line.pageFrom.x, line.pageTo.x);
      return {
        orientation,
        main0,
        main1,
        mainMid: (main0 + main1) / 2,
        perp: (line.pageFrom.y + line.pageTo.y) / 2
      };
    }
    if (orientation === "vertical") {
      const main0 = Math.min(line.pageFrom.y, line.pageTo.y);
      const main1 = Math.max(line.pageFrom.y, line.pageTo.y);
      return {
        orientation,
        main0,
        main1,
        mainMid: (main0 + main1) / 2,
        perp: (line.pageFrom.x + line.pageTo.x) / 2
      };
    }
    return null;
  }

  function axisOverlapRatio(first, second) {
    if (!first || !second || first.orientation !== second.orientation) return 0;
    const overlap = Math.max(0, Math.min(first.main1, second.main1) - Math.max(first.main0, second.main0));
    const shorter = Math.max(0.001, Math.min(first.main1 - first.main0, second.main1 - second.main0));
    return overlap / shorter;
  }

  function pointDistance(first, second) {
    return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : Number.POSITIVE_INFINITY;
  }

  function boxDistance(first, second) {
    if (!first || !second) return Number.POSITIVE_INFINITY;
    const dx = first.x1 < second.x0 ? second.x0 - first.x1 : second.x1 < first.x0 ? first.x0 - second.x1 : 0;
    const dy = first.y1 < second.y0 ? second.y0 - first.y1 : second.y1 < first.y0 ? first.y0 - second.y1 : 0;
    return Math.hypot(dx, dy);
  }

  function uniqueSortedNumbers(values) {
    return Array.from(new Set((values || []).filter(Number.isFinite).map((value) => round(value, 3)))).sort((a, b) => a - b);
  }

  function stableGeometryBox(items) {
    const boxes = (items || []).map((item) => item && (item.pageBox || pageLineBox(item))).filter(finiteBox);
    return boxes.reduce((box, next) => unionBoxes(box, next), null);
  }

  function hostWallGapEvidence(candidateBox, walls, wallThicknessPx) {
    if (!candidateBox) return null;
    const tolerance = Math.max(2, Number(wallThicknessPx || 0) * 2.5);
    const maxGap = Math.max(18, Math.max(candidateBox.width, candidateBox.height) * 1.5);
    const candidates = (walls || []).map((wall) => ({ wall, axis: lineAxisRange(wall), box: pageLineBox(wall, tolerance) }))
      .filter((entry) => entry.axis && entry.box && boxDistance(entry.box, candidateBox) <= maxGap);
    const result = [];
    ["horizontal", "vertical"].forEach((orientation) => {
      const aligned = candidates.filter((entry) => entry.axis.orientation === orientation &&
        Math.abs(entry.axis.perp - (orientation === "horizontal"
          ? (candidateBox.y0 + candidateBox.y1) / 2
          : (candidateBox.x0 + candidateBox.x1) / 2)) <= Math.max(tolerance, Math.min(candidateBox.width, candidateBox.height) * 0.8));
      for (let leftIndex = 0; leftIndex < aligned.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < aligned.length; rightIndex += 1) {
          const left = aligned[leftIndex];
          const right = aligned[rightIndex];
          if (Math.abs(left.axis.perp - right.axis.perp) > tolerance * 2) continue;
          const first = left.axis.main0 <= right.axis.main0 ? left : right;
          const second = first === left ? right : left;
          const gap = second.axis.main0 - first.axis.main1;
          const candidateMain0 = orientation === "horizontal" ? candidateBox.x0 : candidateBox.y0;
          const candidateMain1 = orientation === "horizontal" ? candidateBox.x1 : candidateBox.y1;
          const candidateCenter = (candidateMain0 + candidateMain1) / 2;
          const gapCenter = (first.axis.main1 + second.axis.main0) / 2;
          const candidateSpan = Math.max(0.001, candidateMain1 - candidateMain0);
          const bracketOverlap = Math.max(0, Math.min(second.axis.main0, candidateMain1) - Math.max(first.axis.main1, candidateMain0));
          const centerOffset = Math.abs(candidateCenter - gapCenter);
          const spanToGapRatio = candidateSpan / Math.max(gap, 0.001);
          const centerOffsetRatio = centerOffset / Math.max(candidateSpan, gap, 0.001);
          const spanFitPass = spanToGapRatio >= 0.45 && spanToGapRatio <= 2.25;
          const centerFitPass = centerOffsetRatio <= 0.35;
          if (gap >= 0 && gap <= maxGap && gap >= Math.min(candidateBox.width, candidateBox.height) * 0.15 &&
            bracketOverlap > 0 && centerOffset <= Math.max(12, Math.max(candidateSpan, gap) * 0.9)) {
            result.push({
              orientation,
              wallIds: [first.wall.id || null, second.wall.id || null],
              gapMainStartPdf: round(first.axis.main1, 2),
              gapMainEndPdf: round(second.axis.main0, 2),
              hostAxisPerpendicularPdf: round((first.axis.perp + second.axis.perp) / 2, 2),
              gapLengthPdf: round(gap, 2),
              wallPerpendicularDistancePdf: round(Math.abs(first.axis.perp - second.axis.perp), 2),
              candidateSpanPdf: round(candidateSpan, 2),
              centerOffsetPdf: round(centerOffset, 2),
              spanToGapRatio: round(spanToGapRatio, 3),
              centerOffsetRatio: round(centerOffsetRatio, 3),
              spanFitPass,
              centerFitPass,
              candidateFitPass: spanFitPass && centerFitPass,
              fitScore: round(Math.abs(Math.log(Math.max(spanToGapRatio, 0.001))) + centerOffsetRatio, 4),
              thresholdPdf: round(maxGap, 2)
            });
          }
        }
      }
    });
    return result.sort((a, b) =>
      Number(b.candidateFitPass) - Number(a.candidateFitPass) ||
      a.fitScore - b.fitScore ||
      a.centerOffsetPdf - b.centerOffsetPdf ||
      a.gapLengthPdf - b.gapLengthPdf
    )[0] || null;
  }

  function nearbyHostWall(candidateBox, walls, wallThicknessPx) {
    if (!candidateBox) return null;
    const padding = Math.max(4, Number(wallThicknessPx || 0) * 3);
    return (walls || []).map((wall) => ({ wall, box: pageLineBox(wall, padding) }))
      .filter((entry) => entry.box && boxesIntersect(entry.box, candidateBox))
      .sort((a, b) => boxDistance(a.box, candidateBox) - boxDistance(b.box, candidateBox))[0] || null;
  }

  function pathHasClosedTopology(path) {
    return !!(path && path.closed && Array.isArray(path.segments) && path.segments.length >= 4 && finiteBox(path.pageBox));
  }

  function pathBoundaryContactCount(path, walls, tolerance) {
    if (!path || !Array.isArray(path.segments)) return 0;
    return path.segments.filter((segment) => {
      const box = pageLineBox({ pageFrom: segment.pageFrom, pageTo: segment.pageTo }, tolerance);
      return (walls || []).some((wall) => {
        const wallBox = pageLineBox(wall, tolerance);
        return wallBox && box && boxesIntersect(wallBox, box);
      });
    }).length;
  }

  const semanticDetectorPredicates = Object.freeze({
    door(input) {
      const evidence = input || {};
      const rules = {
        curvedArc: Boolean(evidence.curvedArc && evidence.curvedArc.hasCurve === true),
        leaf: Boolean(evidence.leaf),
        hinge: Boolean(evidence.hinge),
        compatibleHostWallGap: Boolean(evidence.hostWallGap && Array.isArray(evidence.hostWallGap.wallIds) && evidence.hostWallGap.wallIds.length >= 1),
        hostGapGeometryFit: Boolean(evidence.hostWallGap && evidence.hostWallGap.candidateFitPass === true),
        arcLeafGeometryFit: Boolean(evidence.doorArcLeafFit === true)
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "door", rules, failedRules, pass: failedRules.length === 0 };
    },
    window(input) {
      const evidence = input || {};
      const rules = {
        parallelLineSpan: Array.isArray(evidence.parallelLines) && evidence.parallelLines.length >= 2,
        compatibleOverlap: Number(evidence.overlapRatio) >= 0.55,
        positiveSeparation: Number(evidence.separationPdf) > 0,
        compatibleHostWallGap: Boolean(evidence.hostWallGap && Array.isArray(evidence.hostWallGap.wallIds) && evidence.hostWallGap.wallIds.length >= 1),
        hostGapGeometryFit: Boolean(evidence.hostWallGap && evidence.hostWallGap.candidateFitPass === true),
        compatibleFrameAndHostThickness: Boolean(evidence.windowFrameFitPass === true),
        noTitleLikeParallelNoise: Number(evidence.parallelNeighborCount || 0) <= Math.max(2, Number(evidence.maximumParallelRailCount || 2))
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "window", rules, failedRules, pass: failedRules.length === 0 };
    },
    stair(input) {
      const evidence = input || {};
      const envelope = evidence.boundedEnvelope || {};
      const rules = {
        repeatedTreads: Number(evidence.treadCount) >= 5,
        positiveSpacing: Number(evidence.spacingPdf) > 0,
        regularSpacing: Number(evidence.regularSpacingRatio) >= 0.7,
        boundedEnvelopeOrLanding: envelope.bounded === true && (Number(envelope.sideCount) >= 3 || Boolean(evidence.landingLineId))
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "stair", rules, failedRules, pass: failedRules.length === 0 };
    },
    stairVoid(input) {
      const evidence = input || {};
      const rules = {
        independentlyClosedBoundary: evidence.closedPath === true,
        boundarySegments: Number(evidence.boundarySegmentCount) >= 4,
        hostWallContact: Number(evidence.hostWallContactCount) >= 3,
        relatedStair: Boolean(evidence.relatedStairId)
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "stairVoid", rules, failedRules, pass: failedRules.length === 0 };
    },
    space(input) {
      const evidence = input || {};
      const rules = {
        closedTopology: evidence.closedPath === true,
        boundarySegments: Number(evidence.boundarySegmentCount) >= 4,
        hostWallContact: Number(evidence.hostWallContactCount) >= 3,
        openingTreatment: evidence.openingTreatment === true
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "space", rules, failedRules, pass: failedRules.length === 0 };
    },
    bathroomFixture(input) {
      const evidence = input || {};
      const rules = {
        recognizedGeometryMotif: evidence.recognizedGeometryMotif === true,
        compactPathCluster: Number(evidence.clusterPathCount) >= 20,
        curvedInterior: Number(evidence.curvedPathCount) >= 4,
        closedDetails: Number(evidence.closedPathCount) >= 3,
        containedBySourceSpace: Boolean(evidence.sourceSpaceId)
      };
      const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
      return { schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1", name: "bathroomFixture", rules, failedRules, pass: failedRules.length === 0 };
    },
    fixedCabinet(input) {
      const evidence = input || {};
      const widthPt = Number(evidence.widthPt) || 0;
      const depthPt = Number(evidence.depthPt) || 0;
      const ratio = widthPt / Math.max(0.001, depthPt);
      const pass = Number(evidence.parallelEdgeCount) >= 2 &&
        Number(evidence.closedRectCount) >= 1 &&
        widthPt >= 48 &&
        widthPt <= 240 &&
        depthPt >= 16 &&
        depthPt <= 48 &&
        ratio >= 2.2 &&
        ratio <= 12 &&
        evidence.hostWallContact === true &&
        evidence.bathroomOverlap !== true;
      return {
        pass,
        reason: pass ? "fixed_cabinet_geometry_motif" : "fixed_cabinet_geometry_rejected"
      };
    }
  });

  const semanticDetectorPredicateContract = Object.freeze({
    schema: "laibe.planPuzzle.pdfSemanticDetectorPredicateContract.v1",
    source: "vector-operator-list-geometry-relations",
    names: Object.freeze(["door", "window", "stair", "stairVoid", "space", "bathroomFixture", "fixedCabinet"]),
    ruleVersion: "r8-fixed-cabinet-candidate-20260723"
  });

  function detectDoorCandidates(paths, lines, walls, wallThicknessPx) {
    const arcs = (paths || []).filter((path) => path && path.hasCurve && finiteBox(path.pageBox) &&
      Math.min(path.pageBox.width, path.pageBox.height) >= 1.5 &&
      !isPageFrameScaleFill({ pageBox: path.pageBox, canvasBox: path.canvasBox },
        { width: Math.max(path.pageBox.x1, path.pageBox.y1), height: Math.max(path.pageBox.x1, path.pageBox.y1) },
        { width: Math.max(path.canvasBox ? path.canvasBox.x1 : path.pageBox.x1, 1), height: Math.max(path.canvasBox ? path.canvasBox.y1 : path.pageBox.y1, 1) }));
    const shortLines = (lines || []).filter((line) => line && line.orientation !== "diagonal" &&
      line.lengthPdf >= 10 && line.lengthPdf <= Math.max(90, Number(wallThicknessPx || 0) * 18) &&
      line.lineWidthPdf <= Math.max(1.4, Number(wallThicknessPx || 0) * 0.65));
    const candidates = [];
    arcs.forEach((arc, arcIndex) => {
      const arcBox = arc.pageBox;
      const nearby = shortLines.filter((line) => boxDistance(pageLineBox(line, 1), arcBox) <= Math.max(24, Math.max(arcBox.width, arcBox.height) * 0.75));
      const associations = nearby.map((leaf) => {
        const leafBox = pageLineBox(leaf, 1);
        const hingeCandidates = [leaf.pageFrom, leaf.pageTo].map((point) => ({ point, distance: distancePointToBox(point, arcBox) }));
        const hinge = hingeCandidates.sort((a, b) => a.distance - b.distance)[0];
        if (!hinge || hinge.distance > Math.max(10, Math.min(arcBox.width, arcBox.height) * 0.9)) return null;
        const combinedBox = unionBoxes(arcBox, leafBox);
        const hostGap = hostWallGapEvidence(combinedBox, walls, wallThicknessPx);
        const minimumArcSpanPdf = Math.max(8, Number(wallThicknessPx || 0) * 1.15);
        const arcLeafRatio = Math.min(arcBox.width, arcBox.height) / Math.max(0.001, leaf.lengthPdf);
        const hingeEnvelopeRatio = hinge.distance / Math.max(0.001, Math.max(arcBox.width, arcBox.height));
        const doorArcLeafFit = Math.min(arcBox.width, arcBox.height) >= minimumArcSpanPdf && arcLeafRatio >= 0.3 && arcLeafRatio <= 1.5 && hingeEnvelopeRatio <= 0.75;
        const detectorPredicate = semanticDetectorPredicates.door({
          curvedArc: { hasCurve: true },
          leaf,
          hinge,
          hostWallGap: hostGap,
          doorArcLeafFit
        });
        if (!detectorPredicate.pass) return null;
        return { leaf, leafBox, hinge, combinedBox, hostGap, detectorPredicate, arcLeafRatio, hingeEnvelopeRatio, doorArcLeafFit };
      }).filter(Boolean).sort((a, b) =>
        a.hostGap.fitScore - b.hostGap.fitScore ||
        a.hinge.distance - b.hinge.distance ||
        b.leaf.lengthPdf - a.leaf.lengthPdf ||
        String(a.leaf.id || "").localeCompare(String(b.leaf.id || ""))
      );
      const association = associations[0];
      if (!association) return;
      const leaf = association.leaf;
      const hinge = association.hinge;
      const combinedBox = association.combinedBox;
      const hostGap = association.hostGap;
      const detectorPredicate = association.detectorPredicate;
      const host = nearbyHostWall(combinedBox, walls, wallThicknessPx);
      candidates.push({
        id: "pdf-opening-door-" + String(arcIndex + 1).padStart(4, "0"),
        category: "opening",
        subtype: "hinged_door",
        coordinateFrame: "page-bottom-left-pdf-pt",
        bbox: combinedBox,
        pageBox: combinedBox,
        evidence: {
          curvedArc: { pathIndex: arcIndex, bbox: arcBox, hasCurve: true },
          leaf: { lineId: leaf.id, pageFrom: leaf.pageFrom, pageTo: leaf.pageTo, lengthPdf: leaf.lengthPdf },
          hinge: { point: hinge.point, distanceToArcPdf: round(hinge.distance, 2) },
          arcLeafRatio: round(association.arcLeafRatio, 3),
          hingeEnvelopeRatio: round(association.hingeEnvelopeRatio, 3),
          minimumArcSpanPdf: round(Math.max(8, Number(wallThicknessPx || 0) * 1.15), 2),
          doorArcLeafFit: association.doorArcLeafFit,
          hostWallGap: hostGap,
          hostWallId: host && host.wall && host.wall.id || null,
          detectorPredicate
        },
        confidence: "candidate",
        semantic_status: "candidate_unaccepted",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        reviewRequired: true
      });
    });
    return dedupeSemanticCandidates(candidates);
  }

  function detectWindowCandidates(lines, walls, wallThicknessPx) {
    const thinLines = (lines || []).filter((line) => line && line.orientation !== "diagonal" && line.lengthPdf >= 8 &&
      line.lengthPdf <= 120 && line.lineWidthPdf <= Math.max(0.9, Number(wallThicknessPx || 0) * 0.35));
    const candidates = [];
    for (let firstIndex = 0; firstIndex < thinLines.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < thinLines.length; secondIndex += 1) {
        const first = thinLines[firstIndex];
        const second = thinLines[secondIndex];
        const firstAxis = lineAxisRange(first);
        const secondAxis = lineAxisRange(second);
        if (!firstAxis || !secondAxis || firstAxis.orientation !== secondAxis.orientation) continue;
        const separation = Math.abs(firstAxis.perp - secondAxis.perp);
        if (separation < 1.5 || separation > Math.max(18, Number(wallThicknessPx || 0) * 3.5)) continue;
        const overlap = axisOverlapRatio(firstAxis, secondAxis);
        if (overlap < 0.55) continue;
        const parallelNeighborCount = thinLines.filter((line) => {
          const axis = lineAxisRange(line);
          return axis && axis.orientation === firstAxis.orientation &&
            Math.abs(axis.perp - firstAxis.perp) <= Math.max(16, separation * 1.6) &&
            axisOverlapRatio(axis, firstAxis) >= 0.8;
        }).length;
        // Vector PDFs commonly emit the two frame rails twice (stroke and inset
        // contour). Treat that as a bounded multi-rail frame, not as four
        // independent window candidates. The host-gap and frame-fit predicates
        // below still have to establish an actual opening.
        if (parallelNeighborCount > 4) continue;
        const box = unionBoxes(pageLineBox(first, 1), pageLineBox(second, 1));
        const hostGap = hostWallGapEvidence(box, walls, wallThicknessPx);
        if (!hostGap) continue;
        const firstLength = Math.max(0.001, first.lengthPdf);
        const secondLength = Math.max(0.001, second.lengthPdf);
        const lineLengthRatio = Math.min(firstLength, secondLength) / Math.max(firstLength, secondLength);
        const averageLength = (firstLength + secondLength) / 2;
        const hostThickness = Number(hostGap.wallPerpendicularDistancePdf || 0);
        const separationToHostThicknessRatio = hostThickness > 0 ? separation / hostThickness : null;
        const hostThicknessFit = hostThickness > 0 && separationToHostThicknessRatio >= 0.45 && separationToHostThicknessRatio <= 2.1;
        const compactInsetFallback = hostThickness === 0 && averageLength / Math.max(0.001, separation) >= 1 && averageLength / Math.max(0.001, separation) <= 2;
        const windowFrameFitPass = lineLengthRatio >= 0.78 && (hostThicknessFit || compactInsetFallback);
        const host = nearbyHostWall(box, walls, wallThicknessPx);
        const detectorPredicate = semanticDetectorPredicates.window({
          parallelLines: [first.id, second.id],
          separationPdf: separation,
          overlapRatio: overlap,
          parallelNeighborCount,
          maximumParallelRailCount: 4,
          hostWallGap: hostGap,
          windowFrameFitPass
        });
        if (!detectorPredicate.pass) continue;
        candidates.push({
          id: "pdf-opening-window-" + String(candidates.length + 1).padStart(4, "0"),
          category: "opening",
          subtype: "window",
          coordinateFrame: "page-bottom-left-pdf-pt",
          bbox: box,
          pageBox: box,
          evidence: {
            parallelLines: [first.id, second.id],
            lineLengthsPdf: [first.lengthPdf, second.lengthPdf],
            separationPdf: round(separation, 2),
            overlapRatio: round(overlap, 3),
            parallelNeighborCount,
            maximumParallelRailCount: 4,
            lineLengthRatio: round(lineLengthRatio, 3),
            separationToHostThicknessRatio: separationToHostThicknessRatio === null ? null : round(separationToHostThicknessRatio, 3),
            hostThicknessFit,
            compactInsetFallback,
            windowFrameFitPass,
            hostWallGap: hostGap,
            hostWallId: host && host.wall && host.wall.id || null,
            detectorPredicate
          },
          confidence: "candidate",
          semantic_status: "candidate_unaccepted",
          human_confirmation_required: true,
          mapping_state: "not_accepted",
          editable_object_id: null,
          acceptedTransformId: null,
          reviewRequired: true
        });
      }
    }
    return dedupeSemanticCandidates(candidates);
  }

  function groupedAxesForWindowFrames(lines, orientation, tolerance) {
    const groups = [];
    (lines || []).filter((line) => line && line.orientation === orientation).map((line) => ({ line, axis: lineAxisRange(line) }))
      .filter((entry) => entry.axis)
      .sort((first, second) => first.axis.perp - second.axis.perp || first.axis.main0 - second.axis.main0 || first.axis.main1 - second.axis.main1)
      .forEach((entry) => {
        const previous = groups[groups.length - 1];
        if (previous && Math.abs(previous.perp - entry.axis.perp) <= tolerance) {
          previous.entries.push(entry);
          previous.perp = previous.entries.reduce((sum, item) => sum + item.axis.perp, 0) / previous.entries.length;
          previous.main0 = Math.min(previous.main0, entry.axis.main0);
          previous.main1 = Math.max(previous.main1, entry.axis.main1);
          return;
        }
        groups.push({ perp: entry.axis.perp, main0: entry.axis.main0, main1: entry.axis.main1, entries: [entry] });
      });
    return groups;
  }

  function axisIntervalOverlapLength(axis, from, to) {
    return Math.max(0, Math.min(axis.main1, to) - Math.max(axis.main0, from));
  }

  function detectWindowGapFrameCandidates(lines, walls, wallThicknessPx) {
    const thickness = Math.max(1, Number(wallThicknessPx || 0));
    const maxGap = Math.max(72, thickness * 28);
    const supportLines = (lines || []).filter((line) => line && line.orientation !== "diagonal" && line.lengthPdf >= 8 &&
      line.lengthPdf <= Math.max(180, thickness * 52) && line.lineWidthPdf <= Math.max(0.9, thickness * 0.38));
    const candidates = [];
    ["horizontal", "vertical"].forEach((orientation) => {
      const wallGroups = groupedAxesForWindowFrames(walls, orientation, Math.max(1.5, thickness * 0.55));
      const rails = groupedAxesForWindowFrames(supportLines, orientation, Math.max(1.1, thickness * 0.28));
      wallGroups.forEach((group) => {
        const intervals = group.entries.map((entry) => entry.axis).sort((first, second) => first.main0 - second.main0 || first.main1 - second.main1);
        for (let index = 0; index < intervals.length - 1; index += 1) {
          const first = intervals[index];
          const second = intervals[index + 1];
          const gapStart = first.main1;
          const gapEnd = second.main0;
          const gapLength = gapEnd - gapStart;
          if (!(gapLength >= Math.max(6, thickness * 0.55) && gapLength <= maxGap)) continue;
          const compatibleRails = rails.filter((rail) => {
            const overlapLength = axisIntervalOverlapLength(rail, gapStart, gapEnd);
            const overlapRatio = overlapLength / Math.max(0.001, gapLength);
            return overlapRatio >= 0.5 && Math.abs(rail.perp - group.perp) <= Math.max(18, thickness * 4.5);
          });
          if (compatibleRails.length < 2) continue;
          // A real framed opening has a bounded outside rail pair. Emitting every
          // internal contour combination turns duplicated vector strokes into a
          // combinatorial set of false windows.
          const firstRail = compatibleRails[0];
          const secondRail = compatibleRails[compatibleRails.length - 1];
          const separation = Math.abs(firstRail.perp - secondRail.perp);
          if (separation < Math.max(3.5, thickness * 0.5) || separation > Math.max(24, thickness * 4.5)) continue;
          const railBox = orientation === "horizontal"
            ? { x0: gapStart, y0: Math.min(firstRail.perp, secondRail.perp), x1: gapEnd, y1: Math.max(firstRail.perp, secondRail.perp) }
            : { x0: Math.min(firstRail.perp, secondRail.perp), y0: gapStart, x1: Math.max(firstRail.perp, secondRail.perp), y1: gapEnd };
          railBox.width = railBox.x1 - railBox.x0;
          railBox.height = railBox.y1 - railBox.y0;
          if (!finiteBox(railBox)) continue;
          const hostGap = hostWallGapEvidence(railBox, walls, thickness);
          if (!hostGap) continue;
          const railEntryIds = Array.from(new Set(firstRail.entries.concat(secondRail.entries).map((entry) => entry.line.id).filter(Boolean))).sort();
          const parallelNeighborCount = compatibleRails.length;
          const frameSpan = orientation === "horizontal" ? railBox.width : railBox.height;
          const frameDepth = orientation === "horizontal" ? railBox.height : railBox.width;
          const windowFrameFitPass = frameSpan >= Math.max(frameDepth, gapLength * 0.5) &&
            frameSpan <= Math.max(gapLength * 1.2, thickness * 16) &&
            hostGap.candidateFitPass === true;
          const detectorPredicate = semanticDetectorPredicates.window({
            parallelLines: railEntryIds,
            separationPdf: separation,
            overlapRatio: 1,
            parallelNeighborCount,
            maximumParallelRailCount: 4,
            hostWallGap: hostGap,
            windowFrameFitPass
          });
          if (!detectorPredicate.pass) continue;
          candidates.push({
            id: "pdf-opening-window-gap-" + String(candidates.length + 1).padStart(4, "0"),
            category: "opening",
            subtype: "window",
            coordinateFrame: "page-bottom-left-pdf-pt",
            bbox: railBox,
            pageBox: railBox,
            evidence: {
              detectorMethod: "host_gap_parallel_frame",
              parallelLines: railEntryIds,
              wallAxisIds: group.entries.map((entry) => entry.line.id).filter(Boolean).sort(),
              gapMainStartPdf: round(gapStart, 2),
              gapMainEndPdf: round(gapEnd, 2),
              gapLengthPdf: round(gapLength, 2),
              separationPdf: round(separation, 2),
              overlapRatio: 1,
              parallelNeighborCount,
              maximumParallelRailCount: 4,
              windowFrameFitPass,
              hostWallGap: hostGap,
              detectorPredicate
            },
            confidence: "candidate",
            semantic_status: "candidate_unaccepted",
            human_confirmation_required: true,
            mapping_state: "not_accepted",
            editable_object_id: null,
            acceptedTransformId: null,
            reviewRequired: true
          });
        }
      });
    });
    return dedupeSemanticCandidates(candidates);
  }

  function groupRepeatedTreads(lines, wallThicknessPx) {
    const source = (lines || []).filter((line) => line && line.orientation !== "diagonal" && line.lengthPdf >= 8 &&
      line.lengthPdf <= 220 && line.lineWidthPdf <= Math.max(1.4, Number(wallThicknessPx || 0) * 0.55))
      .map((line) => ({ line, axis: lineAxisRange(line) }))
      .filter((entry) => entry.axis)
      .sort((a, b) => (a.axis.orientation.localeCompare(b.axis.orientation)) || (a.axis.mainMid - b.axis.mainMid) || (a.axis.perp - b.axis.perp));
    const groups = [];
    source.forEach((entry) => {
      let group = groups.find((candidate) => candidate.orientation === entry.axis.orientation &&
        Math.abs(candidate.anchorMainMid - entry.axis.mainMid) <= Math.max(10, Math.min(24, candidate.initialLength * 0.45)) &&
        axisOverlapRatio(candidate.axis, entry.axis) >= 0.6 &&
        (entry.axis.perp >= candidate.perpMin - Math.max(8, Math.min(64, candidate.initialLength * 1.5)) &&
          entry.axis.perp <= candidate.perpMax + Math.max(8, Math.min(64, candidate.initialLength * 1.5))) &&
        Math.min(candidate.length, entry.axis.main1 - entry.axis.main0) /
          Math.max(candidate.length, entry.axis.main1 - entry.axis.main0, 0.001) >= 0.75);
      if (!group) {
        group = { orientation: entry.axis.orientation, axis: { ...entry.axis }, items: [], anchorMainMid: entry.axis.mainMid, mainMid: entry.axis.mainMid, initialLength: entry.axis.main1 - entry.axis.main0, length: entry.axis.main1 - entry.axis.main0, perpMin: entry.axis.perp, perpMax: entry.axis.perp };
        groups.push(group);
      }
      group.items.push(entry);
      group.axis.main0 = Math.min(group.axis.main0, entry.axis.main0);
      group.axis.main1 = Math.max(group.axis.main1, entry.axis.main1);
      group.mainMid = group.items.reduce((sum, item) => sum + item.axis.mainMid, 0) / group.items.length;
      group.length = group.axis.main1 - group.axis.main0;
      group.perpMin = Math.min(group.perpMin, entry.axis.perp);
      group.perpMax = Math.max(group.perpMax, entry.axis.perp);
    });
    const qualified = [];
    const rejectionCounts = {};
    const recordRejection = (reason) => {
      rejectionCounts[reason] = (rejectionCounts[reason] || 0) + 1;
    };
    groups.forEach((group) => {
      const perps = uniqueSortedNumbers(group.items.map((entry) => entry.axis.perp));
      const spacings = perps.slice(1).map((value, index) => value - perps[index]).filter((value) => value > 0.05);
      if (group.items.length < 5 || spacings.length < 4) {
        recordRejection("insufficient_repeated_lines");
        return;
      }
      const medianSpacing = medianOfSorted(spacings.slice().sort((a, b) => a - b));
      const regularCount = spacings.filter((spacing) => Math.abs(spacing - medianSpacing) <= Math.max(1.2, medianSpacing * 0.42)).length;
      if (medianSpacing < 1 || medianSpacing > 32 || regularCount / spacings.length < 0.7) {
        recordRejection("irregular_spacing");
        return;
      }
      const bbox = stableGeometryBox(group.items.map((entry) => entry.line));
      if (!bbox || Math.min(bbox.width, bbox.height) < Math.max(12, medianSpacing * 2)) {
        recordRejection("insufficient_extent");
        return;
      }
      qualified.push({ ...group, bbox, spacingPdf: round(medianSpacing, 2), regularSpacingRatio: round(regularCount / spacings.length, 3) });
    });
    qualified.diagnostics = {
      sourceCount: source.length,
      groupedCount: groups.length,
      qualifiedCount: qualified.length,
      rejectionCounts,
      groupSummaries: groups.map((group) => ({
        orientation: group.orientation,
        itemCount: group.items.length,
        mainMid: round(group.mainMid, 2),
        length: round(group.length, 2),
        perpendicularCount: uniqueSortedNumbers(group.items.map((entry) => entry.axis.perp)).length
      }))
    };
    return qualified;
  }

  function summarizeMergedTreadGroup(groups) {
    const first = groups[0];
    const uniqueItems = new Map();
    groups.forEach((group) => (group.items || []).forEach((entry) => {
      const key = entry && entry.line && entry.line.id || [entry.axis.orientation, entry.axis.main0, entry.axis.perp].join(":" );
      if (!uniqueItems.has(key)) uniqueItems.set(key, entry);
    }));
    const items = Array.from(uniqueItems.values()).sort((a, b) =>
      a.axis.perp - b.axis.perp || a.axis.main0 - b.axis.main0 || String(a.line.id || "").localeCompare(String(b.line.id || ""))
    );
    const perps = uniqueSortedNumbers(items.map((entry) => entry.axis.perp));
    const spacings = perps.slice(1).map((value, index) => value - perps[index]).filter((value) => value > 0.05);
    const medianSpacing = medianOfSorted(spacings.slice().sort((a, b) => a - b));
    const regularCount = spacings.filter((spacing) => Math.abs(spacing - medianSpacing) <= Math.max(1.2, medianSpacing * 0.42)).length;
    const bbox = stableGeometryBox(items.map((entry) => entry.line));
    const main0 = Math.min(...items.map((entry) => entry.axis.main0));
    const main1 = Math.max(...items.map((entry) => entry.axis.main1));
    return {
      orientation: first.orientation,
      items,
      axis: { orientation: first.orientation, main0, main1, mainMid: (main0 + main1) / 2 },
      bbox,
      length: main1 - main0,
      spacingPdf: round(medianSpacing, 2),
      regularSpacingRatio: round(regularCount / Math.max(1, spacings.length), 3)
    };
  }

  function mergeCompatibleTreadGroups(groups) {
    const source = (groups || []).slice();
    const parent = source.map((_, index) => index);
    const rootOf = (index) => {
      let root = index;
      while (parent[root] !== root) root = parent[root];
      while (parent[index] !== index) {
        const next = parent[index];
        parent[index] = root;
        index = next;
      }
      return root;
    };
    const unite = (first, second) => {
      const firstRoot = rootOf(first);
      const secondRoot = rootOf(second);
      if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
    };
    for (let firstIndex = 0; firstIndex < source.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < source.length; secondIndex += 1) {
        const first = source[firstIndex];
        const second = source[secondIndex];
        if (!first || !second || first.orientation !== second.orientation || !first.bbox || !second.bbox) continue;
        const spacingRatio = Math.max(first.spacingPdf, second.spacingPdf) / Math.max(0.001, Math.min(first.spacingPdf, second.spacingPdf));
        const mergePadding = Math.max(10, Math.min(first.spacingPdf, second.spacingPdf) * 2.5);
        if (spacingRatio <= 1.3 && boxesIntersect(expandBox(first.bbox, mergePadding), second.bbox)) unite(firstIndex, secondIndex);
      }
    }
    const clusters = new Map();
    source.forEach((group, index) => {
      const root = rootOf(index);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(group);
    });
    return Array.from(clusters.values()).map(summarizeMergedTreadGroup).filter((group) => {
      if (!group.bbox || group.items.length < 5 || !(group.spacingPdf > 0)) return false;
      return group.regularSpacingRatio >= 0.7 && Math.min(group.bbox.width, group.bbox.height) >= Math.max(12, group.spacingPdf * 2);
    }).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  }

  function filterDominantTreadLattice(group) {
    if (!group || !Array.isArray(group.items) || group.items.length < 5) return null;
    const spanGroups = [];
    group.items
      .slice()
      .sort((first, second) =>
        first.axis.mainMid - second.axis.mainMid ||
        first.axis.perp - second.axis.perp ||
        String(first.line.id || "").localeCompare(String(second.line.id || ""))
      )
      .forEach((entry) => {
        const entryLength = entry.axis.main1 - entry.axis.main0;
        const compatible = spanGroups
          .map((candidate) => {
            const candidateLength = candidate.main1 - candidate.main0;
            const overlap = Math.max(
              0,
              Math.min(candidate.main1, entry.axis.main1) -
                Math.max(candidate.main0, entry.axis.main0)
            );
            const overlapRatio = overlap /
              Math.max(0.001, Math.min(candidateLength, entryLength));
            const lengthRatio = Math.min(candidateLength, entryLength) /
              Math.max(0.001, Math.max(candidateLength, entryLength));
            return {
              candidate,
              overlapRatio,
              lengthRatio,
              midpointDistance: Math.abs(candidate.mainMid - entry.axis.mainMid)
            };
          })
          .filter((match) =>
            match.overlapRatio >= 0.78 &&
            match.lengthRatio >= 0.72 &&
            match.midpointDistance <= Math.max(
              4,
              Math.min(match.candidate.main1 - match.candidate.main0, entryLength) * 0.22
            )
          )
          .sort((first, second) =>
            second.overlapRatio - first.overlapRatio ||
            second.lengthRatio - first.lengthRatio ||
            first.midpointDistance - second.midpointDistance
          )[0];
        if (compatible) {
          compatible.candidate.entries.push(entry);
          compatible.candidate.main0 = compatible.candidate.entries.reduce(
            (value, item) => Math.min(value, item.axis.main0),
            Number.POSITIVE_INFINITY
          );
          compatible.candidate.main1 = compatible.candidate.entries.reduce(
            (value, item) => Math.max(value, item.axis.main1),
            Number.NEGATIVE_INFINITY
          );
          compatible.candidate.mainMid = compatible.candidate.entries.reduce(
            (sum, item) => sum + item.axis.mainMid,
            0
          ) / compatible.candidate.entries.length;
        } else {
          spanGroups.push({
            entries: [entry],
            main0: entry.axis.main0,
            main1: entry.axis.main1,
            mainMid: entry.axis.mainMid
          });
        }
      });
    const expectedSpacing = Math.max(0.001, Number(group.spacingPdf) || 0);
    const spacingTolerance = Math.max(1.2, expectedSpacing * 0.38);
    const retainedFlights = spanGroups.map((spanGroup, flightIndex) => {
      const entries = spanGroup.entries.slice().sort((first, second) =>
        first.axis.perp - second.axis.perp ||
        String(first.line.id || "").localeCompare(String(second.line.id || ""))
      );
      const runs = [];
      entries.forEach((entry) => {
        const active = runs[runs.length - 1];
        if (!active) {
          runs.push([entry]);
          return;
        }
        const gap = entry.axis.perp - active[active.length - 1].axis.perp;
        if (gap > 0.05 &&
          gap <= expectedSpacing * 1.65 &&
          Math.abs(gap - expectedSpacing) <= spacingTolerance) {
          active.push(entry);
        } else {
          runs.push([entry]);
        }
      });
      const dominant = runs
        .map((run) => {
          const spacings = run.slice(1).map((entry, index) =>
            entry.axis.perp - run[index].axis.perp
          );
          const spacingError = spacings.reduce(
            (sum, spacing) => sum + Math.abs(spacing - expectedSpacing),
            0
          ) / Math.max(1, spacings.length);
          return { run, spacingError };
        })
        .filter((candidate) => candidate.run.length >= 5)
        .sort((first, second) =>
          second.run.length - first.run.length ||
          first.spacingError - second.spacingError ||
          first.run[0].axis.perp - second.run[0].axis.perp
        )[0];
      return dominant ? {
        flightIndex,
        entries: dominant.run,
        sourceEntryCount: entries.length,
        removedLineIds: entries
          .filter((entry) => !dominant.run.includes(entry))
          .map((entry) => entry.line.id)
          .filter(Boolean)
          .sort()
      } : null;
    }).filter(Boolean);
    const items = retainedFlights.flatMap((flight) => flight.entries);
    if (items.length < 5) return null;
    const perps = uniqueSortedNumbers(items.map((entry) => entry.axis.perp));
    const spacings = retainedFlights.flatMap((flight) =>
      flight.entries.slice(1).map((entry, index) =>
        entry.axis.perp - flight.entries[index].axis.perp
      )
    ).filter((value) => value > 0.05);
    const medianSpacing = medianOfSorted(spacings.slice().sort((a, b) => a - b));
    const regularCount = spacings.filter((spacing) =>
      Math.abs(spacing - medianSpacing) <= Math.max(1.2, medianSpacing * 0.42)
    ).length;
    const bbox = stableGeometryBox(items.map((entry) => entry.line));
    const main0 = Math.min(...items.map((entry) => entry.axis.main0));
    const main1 = Math.max(...items.map((entry) => entry.axis.main1));
    return {
      ...group,
      items,
      axis: {
        orientation: group.orientation,
        main0,
        main1,
        mainMid: (main0 + main1) / 2
      },
      bbox,
      length: main1 - main0,
      spacingPdf: round(medianSpacing, 2),
      regularSpacingRatio: round(regularCount / Math.max(1, spacings.length), 3),
      dominantLatticeEvidence: {
        sourceItemCount: group.items.length,
        retainedItemCount: items.length,
        flightCount: retainedFlights.length,
        expectedSpacingPt: round(expectedSpacing, 3),
        retainedFlights: retainedFlights.map((flight) => ({
          flightIndex: flight.flightIndex,
          retainedLineIds: flight.entries.map((entry) => entry.line.id).filter(Boolean).sort(),
          removedLineIds: flight.removedLineIds
        })),
        removedLineIds: group.items
          .filter((entry) => !items.includes(entry))
          .map((entry) => entry.line.id)
          .filter(Boolean)
          .sort(),
        method: "dominant_regular_lattice_by_consistent_flight_span"
      }
    };
  }

  function boundedEnvelopeEvidence(group, walls, rects) {
    const expanded = expandBox(group.bbox, Math.max(4, group.spacingPdf * 1.5));
    const wallContacts = (walls || []).filter((wall) => {
      const box = pageLineBox(wall, 1);
      return box && boxesIntersect(box, expanded);
    });
    const rectContacts = (rects || []).filter((rect) => rect && rect.pageBox && boxesIntersect(rect.pageBox, expanded) &&
      rect.pageBox.width < group.bbox.width * 2.5 && rect.pageBox.height < group.bbox.height * 2.5);
    const sides = new Set();
    wallContacts.forEach((wall) => {
      const box = pageLineBox(wall);
      if (!box) return;
      if (box.y1 <= group.bbox.y0 + Math.max(8, group.spacingPdf * 2)) sides.add("top");
      if (box.y0 >= group.bbox.y1 - Math.max(8, group.spacingPdf * 2)) sides.add("bottom");
      if (box.x1 <= group.bbox.x0 + Math.max(8, group.spacingPdf * 2)) sides.add("left");
      if (box.x0 >= group.bbox.x1 - Math.max(8, group.spacingPdf * 2)) sides.add("right");
    });
    return {
      bounded: sides.size >= 3 || rectContacts.length > 0,
      sideCount: sides.size,
      sides: Array.from(sides).sort(),
      enclosingRectCount: rectContacts.length,
      hostWallIds: wallContacts.map((wall) => wall.id).filter(Boolean).sort()
    };
  }

  function stairOperatorLineEvidence(line, relationReason) {
    if (!line || !line.id || !line.pageFrom || !line.pageTo) return null;
    return {
      id: line.id,
      operatorLineId: line.id,
      p1: line.pageFrom,
      p2: line.pageTo,
      coordinateFrame: "page-bottom-left-pdf-pt",
      sourceEvidence: "pdf_operator_line_geometry",
      relationReason
    };
  }

  function stairLinePointDistance(first, second) {
    if (!first || !second) return Number.POSITIVE_INFINITY;
    return Math.hypot(Number(first.x) - Number(second.x), Number(first.y) - Number(second.y));
  }

  function stairLineEndpoints(line) {
    return line && line.pageFrom && line.pageTo ? [line.pageFrom, line.pageTo] : [];
  }

  function stairClosestEndpointRelation(first, second) {
    let result = null;
    stairLineEndpoints(first).forEach((firstPoint, firstIndex) => {
      stairLineEndpoints(second).forEach((secondPoint, secondIndex) => {
        const distance = stairLinePointDistance(firstPoint, secondPoint);
        if (!result || distance < result.distance) {
          result = { firstPoint, firstIndex, secondPoint, secondIndex, distance };
        }
      });
    });
    return result;
  }

  function stairPointToSegmentDistance(point, line) {
    if (!point || !line || !line.pageFrom || !line.pageTo) return Number.POSITIVE_INFINITY;
    const x1 = Number(line.pageFrom.x);
    const y1 = Number(line.pageFrom.y);
    const x2 = Number(line.pageTo.x);
    const y2 = Number(line.pageTo.y);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (!(lengthSquared > 0)) return Math.hypot(Number(point.x) - x1, Number(point.y) - y1);
    const ratio = Math.max(0, Math.min(1,
      ((Number(point.x) - x1) * dx + (Number(point.y) - y1) * dy) / lengthSquared
    ));
    return Math.hypot(
      Number(point.x) - (x1 + ratio * dx),
      Number(point.y) - (y1 + ratio * dy)
    );
  }

  function uniqueStairLines(lines) {
    const byId = new Map();
    (lines || []).forEach((line) => {
      if (line && line.id && !byId.has(line.id)) byId.set(line.id, line);
    });
    return Array.from(byId.values()).sort((first, second) =>
      String(first.id).localeCompare(String(second.id))
    );
  }

  function stairTreadBands(group) {
    const vertical = group.orientation === "vertical";
    const source = (group.items || []).map((entry) => {
      const line = entry.line;
      const first = vertical ? Number(line.pageFrom.y) : Number(line.pageFrom.x);
      const second = vertical ? Number(line.pageTo.y) : Number(line.pageTo.x);
      return {
        line,
        axis: lineAxisRange(line),
        start: Math.min(first, second),
        end: Math.max(first, second),
        center: (first + second) / 2
      };
    }).filter((entry) =>
      entry.axis &&
      [entry.start, entry.end, entry.center, entry.axis.perp].every(Number.isFinite)
    )
      .sort((first, second) => first.center - second.center);
    const medianLength = medianOfSorted(
      source.map((entry) => entry.end - entry.start).sort((first, second) => first - second)
    );
    const threshold = Math.max(group.spacingPdf * 2, medianLength * 0.35, 4);
    const bands = [];
    source.forEach((entry) => {
      const band = bands.find((candidate) => Math.abs(candidate.center - entry.center) <= threshold);
      if (band) {
        band.entries.push(entry);
        band.start = Math.min(band.start, entry.start);
        band.end = Math.max(band.end, entry.end);
        band.center = band.entries.reduce((sum, item) => sum + item.center, 0) / band.entries.length;
      } else {
        bands.push({
          entries: [entry],
          start: entry.start,
          end: entry.end,
          center: entry.center
        });
      }
    });
    return bands.sort((first, second) => first.center - second.center);
  }

  function stairLandingEvidence(group, sourceLines, treadIds) {
    const bands = stairTreadBands(group);
    const perpendicularOrientation = group.orientation === "vertical" ? "horizontal" : "vertical";
    if (bands.length < 2) {
      return {
        lines: [],
        roleStatus: "unresolved",
        roleAbsentEvidence: {
          source: "operator_tread_band_geometry",
          reason: "detector_found_no_distinct_tread_band_gap",
          provesSourceAbsence: false
        }
      };
    }
    const gaps = bands.slice(1).map((band, index) => ({
      start: bands[index].end,
      end: band.start,
      width: band.start - bands[index].end
    })).filter((gap) => gap.width >= -Math.max(1, group.spacingPdf * 0.25))
      .sort((first, second) => second.width - first.width);
    const gap = gaps[0];
    if (!gap) {
      return {
        lines: [],
        roleStatus: "unresolved",
        roleAbsentEvidence: {
          source: "operator_tread_band_geometry",
          reason: "detector_found_no_landing_gap",
          provesSourceAbsence: false
        }
      };
    }
    const tolerance = Math.max(1.5, group.spacingPdf * 0.55);
    const perpendicularStart = group.orientation === "vertical" ? group.bbox.x0 : group.bbox.y0;
    const perpendicularEnd = group.orientation === "vertical" ? group.bbox.x1 : group.bbox.y1;
    const perpendicularSpan = Math.max(1, perpendicularEnd - perpendicularStart);
    const lines = (sourceLines || []).filter((line) => {
      if (!line || treadIds.has(line.id) || line.orientation !== perpendicularOrientation) return false;
      const axis = lineAxisRange(line);
      if (!axis) return false;
      const coordinate = axis.perp;
      const overlap = Math.max(0,
        Math.min(axis.main1, perpendicularEnd) - Math.max(axis.main0, perpendicularStart)
      );
      return coordinate >= gap.start - tolerance &&
        coordinate <= gap.end + tolerance &&
        overlap / perpendicularSpan >= 0.3 &&
        line.lengthPdf <= perpendicularSpan * 2;
    });
    return {
      lines: uniqueStairLines(lines),
      roleStatus: lines.length ? "geometry_bound" : "unresolved",
      roleAbsentEvidence: null,
      gapEvidence: {
        source: "operator_tread_band_geometry",
        startPt: round(gap.start, 3),
        endPt: round(gap.end, 3),
        widthPt: round(gap.width, 3),
        bandCount: bands.length
      }
    };
  }

  function stairArrowheadMotifs(group, sourceLines, treadIds, landingIds) {
    const tolerance = Math.max(1.5, group.spacingPdf * 0.3);
    const treadBands = stairTreadBands(group);
    const flightEnvelopes = treadBands.flatMap((band, bandIndex) => {
      const entries = band.entries.slice().sort((first, second) =>
        first.axis.perp - second.axis.perp ||
        String(first.line.id).localeCompare(String(second.line.id))
      );
      const runs = [];
      const maximumTreadGap = Math.max(8, group.spacingPdf * 1.8);
      entries.forEach((entry) => {
        const active = runs[runs.length - 1];
        if (!active ||
          entry.axis.perp - active.entries[active.entries.length - 1].axis.perp > maximumTreadGap) {
          runs.push({ entries: [entry] });
        } else {
          active.entries.push(entry);
        }
      });
      return runs.map((run, runIndex) => {
        const perpendicularValues = run.entries.map((entry) => entry.axis.perp);
        const mainSpan = Math.max(1, band.end - band.start);
        const coreInset = Math.min(
          mainSpan * 0.24,
          Math.max(3, group.spacingPdf * 0.9)
        );
        return {
          id: `flight-${bandIndex + 1}-${runIndex + 1}`,
          bandIndex,
          runIndex,
          treadCount: run.entries.length,
          main0: band.start,
          main1: band.end,
          coreMain0: band.start + coreInset,
          coreMain1: band.end - coreInset,
          perp0: Math.min(...perpendicularValues),
          perp1: Math.max(...perpendicularValues)
        };
      }).filter((flight) => flight.treadCount >= 4);
    });
    const nearby = (sourceLines || []).filter((line) => {
      if (!line || treadIds.has(line.id) || landingIds.has(line.id)) return false;
      const box = pageLineBox(line, tolerance);
      return box && boxesIntersect(box, expandBox(group.bbox, Math.max(14, group.spacingPdf * 3)));
    });
    const diagonals = nearby.filter((line) =>
      line.orientation === "diagonal" &&
      line.lengthPdf >= Math.max(3, group.spacingPdf * 0.25) &&
      line.lengthPdf <= Math.max(30, group.spacingPdf * 3)
    );
    const axisLines = nearby.filter((line) => line.orientation !== "diagonal");
    const shaftOrientation = group.orientation === "vertical" ? "horizontal" : "vertical";
    const motifCandidates = [];
    const pointMain = (point) => group.orientation === "vertical" ? Number(point.y) : Number(point.x);
    const pointPerpendicular = (point) =>
      group.orientation === "vertical" ? Number(point.x) : Number(point.y);
    const lineMainCoordinate = (line) => {
      const axis = lineAxisRange(line);
      return axis && axis.perp;
    };
    const baseEndpointClosure = (line, firstPoint, secondPoint) => {
      const endpoints = stairLineEndpoints(line);
      if (endpoints.length !== 2) return null;
      const direct = [
        stairLinePointDistance(endpoints[0], firstPoint),
        stairLinePointDistance(endpoints[1], secondPoint)
      ];
      const reverse = [
        stairLinePointDistance(endpoints[0], secondPoint),
        stairLinePointDistance(endpoints[1], firstPoint)
      ];
      const directMaximum = Math.max(...direct);
      const reverseMaximum = Math.max(...reverse);
      return directMaximum <= reverseMaximum
        ? { maximumDistance: directMaximum, totalDistance: direct[0] + direct[1] }
        : { maximumDistance: reverseMaximum, totalDistance: reverse[0] + reverse[1] };
    };
    for (let firstIndex = 0; firstIndex < diagonals.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < diagonals.length; secondIndex += 1) {
        const first = diagonals[firstIndex];
        const second = diagonals[secondIndex];
        const shared = stairClosestEndpointRelation(first, second);
        if (!shared || shared.distance > tolerance) continue;
        const firstOther = stairLineEndpoints(first)[shared.firstIndex === 0 ? 1 : 0];
        const secondOther = stairLineEndpoints(second)[shared.secondIndex === 0 ? 1 : 0];
        const wingRatio = Math.max(first.lengthPdf, second.lengthPdf) /
          Math.max(0.001, Math.min(first.lengthPdf, second.lengthPdf));
        if (wingRatio > 1.45) continue;
        const baseEntry = axisLines
          .filter((line) =>
            line.orientation === group.orientation &&
            line.lengthPdf <= Math.max(20, group.spacingPdf * 2)
          )
          .map((line) => ({
            line,
            closure: baseEndpointClosure(line, firstOther, secondOther)
          }))
          .filter((entry) =>
            entry.closure &&
            entry.closure.maximumDistance <= tolerance
          )
          .sort((firstEntry, secondEntry) =>
            firstEntry.closure.totalDistance - secondEntry.closure.totalDistance ||
            String(firstEntry.line.id).localeCompare(String(secondEntry.line.id))
          )[0];
        if (!baseEntry) continue;
        const base = baseEntry.line;
        const tip = {
          x: (Number(shared.firstPoint.x) + Number(shared.secondPoint.x)) / 2,
          y: (Number(shared.firstPoint.y) + Number(shared.secondPoint.y)) / 2
        };
        const baseCenter = {
          x: (Number(firstOther.x) + Number(secondOther.x)) / 2,
          y: (Number(firstOther.y) + Number(secondOther.y)) / 2
        };
        const tipMain = pointMain(tip);
        const tipPerpendicular = pointPerpendicular(tip);
        const baseMain = pointMain(baseCenter);
        const basePerpendicular = pointPerpendicular(baseCenter);
        const arrowAxisError = Math.abs(tipMain - baseMain);
        const arrowAxisLength = Math.abs(tipPerpendicular - basePerpendicular);
        if (arrowAxisError > tolerance ||
          arrowAxisLength < Math.max(3, group.spacingPdf * 0.3)) continue;
        const headAllowance = Math.max(4, group.spacingPdf * 1.5);
        const flight = flightEnvelopes
          .filter((candidate) =>
            tipMain >= candidate.coreMain0 &&
            tipMain <= candidate.coreMain1 &&
            baseMain >= candidate.coreMain0 - tolerance &&
            baseMain <= candidate.coreMain1 + tolerance &&
            tipPerpendicular >= candidate.perp0 - headAllowance &&
            tipPerpendicular <= candidate.perp1 + headAllowance &&
            basePerpendicular >= candidate.perp0 - headAllowance &&
            basePerpendicular <= candidate.perp1 + headAllowance
          )
          .sort((firstFlight, secondFlight) => {
            const firstCenter = (firstFlight.perp0 + firstFlight.perp1) / 2;
            const secondCenter = (secondFlight.perp0 + secondFlight.perp1) / 2;
            return Math.abs(tipPerpendicular - firstCenter) -
              Math.abs(tipPerpendicular - secondCenter);
          })[0];
        if (!flight) continue;
        const shaftExcursion = Math.max(28, group.spacingPdf * 3);
        const flightPerpendicularSpan = Math.max(1, flight.perp1 - flight.perp0);
        const shaft = axisLines
          .filter((line) =>
            line.id !== base.id &&
            line.orientation === shaftOrientation &&
            line.lengthPdf >= Math.max(12, group.spacingPdf * 1.25) &&
            line.lengthPdf <= flightPerpendicularSpan + shaftExcursion * 2
          )
          .map((line) => {
            const axis = lineAxisRange(line);
            const connectionDistance = Math.min(
              ...stairLineEndpoints(line).map((point) =>
                Math.min(stairLinePointDistance(point, tip), stairLinePointDistance(point, baseCenter))
              )
            );
            const overlap = axis
              ? Math.max(0, Math.min(axis.main1, flight.perp1) - Math.max(axis.main0, flight.perp0))
              : 0;
            return {
              line,
              axis,
              connectionDistance,
              overlapRatio: overlap / Math.max(0.001, line.lengthPdf),
              outsideExtent: axis
                ? Math.max(
                  0,
                  flight.perp0 - axis.main0,
                  axis.main1 - flight.perp1
                )
                : Number.POSITIVE_INFINITY
            };
          })
          .filter((entry) =>
            entry.axis &&
            entry.connectionDistance <= tolerance &&
            entry.outsideExtent <= shaftExcursion &&
            lineMainCoordinate(entry.line) >= flight.coreMain0 &&
            lineMainCoordinate(entry.line) <= flight.coreMain1
          )
          .sort((firstEntry, secondEntry) =>
            secondEntry.overlapRatio - firstEntry.overlapRatio ||
            firstEntry.connectionDistance - secondEntry.connectionDistance ||
            secondEntry.line.lengthPdf - firstEntry.line.lengthPdf
          )[0];
        if (!shaft) continue;
        const directionSign = tipPerpendicular >= basePerpendicular ? 1 : -1;
        const motifLines = uniqueStairLines([first, second, base, shaft.line]);
        const motifBox = motifLines.reduce((box, line) =>
          unionBoxes(box, pageLineBox(line, 0)), null);
        const motifCenter = centerOfBox(motifBox);
        const centerInsideStair = Boolean(
          motifCenter &&
          motifCenter.x >= group.bbox.x0 &&
          motifCenter.x <= group.bbox.x1 &&
          motifCenter.y >= group.bbox.y0 &&
          motifCenter.y <= group.bbox.y1
        );
        const flightCenterMain = (flight.coreMain0 + flight.coreMain1) / 2;
        const coreDeviation = Math.abs(tipMain - flightCenterMain) /
          Math.max(1, flight.coreMain1 - flight.coreMain0);
        motifCandidates.push({
          flightKey: flight.id,
          flight,
          directionSign,
          directionEligible: centerInsideStair && shaft.overlapRatio >= 0.55,
          score:
            shaft.overlapRatio * 5 +
            (1 - Math.min(1, coreDeviation)) * 2 +
            (1 / wingRatio) +
            Math.max(0, 1 - baseEntry.closure.totalDistance / Math.max(tolerance, 0.001)),
          lines: uniqueStairLines([first, second, base, shaft.line]),
          wingLineIds: [first.id, second.id].sort(),
          baseLineId: base.id,
          shaftLineId: shaft.line.id,
          tip,
          baseCenter,
          shaftOverlapRatio: shaft.overlapRatio,
          source: "closed_arrowhead_plus_connected_shaft_within_flight_core_operator_geometry"
        });
      }
    }
    const uniqueMotifs = [];
    const signatures = new Set();
    motifCandidates
      .sort((first, second) =>
        second.score - first.score ||
        first.flightKey.localeCompare(second.flightKey) ||
        first.lines.map((line) => line.id).join("|")
          .localeCompare(second.lines.map((line) => line.id).join("|"))
      )
      .forEach((motif) => {
      const signature = motif.lines.map((line) => line.id).sort().join("|");
      if (!signatures.has(signature)) {
        signatures.add(signature);
        uniqueMotifs.push(motif);
      }
    });
    const selectedMotifs = [];
    const usedFlightKeys = new Set();
    const usedLineIds = new Set();
    uniqueMotifs.forEach((motif) => {
      if (!motif.directionEligible ||
        usedFlightKeys.has(motif.flightKey) ||
        motif.lines.some((line) => usedLineIds.has(line.id))) return;
      usedFlightKeys.add(motif.flightKey);
      motif.lines.forEach((line) => usedLineIds.add(line.id));
      selectedMotifs.push(motif);
    });
    const directionLines = uniqueStairLines(selectedMotifs.flatMap((motif) => motif.lines));
    return {
      lines: uniqueStairLines(directionLines),
      roleStatus: directionLines.length ? "geometry_bound" : "unresolved",
      roleAbsentEvidence: directionLines.length ? null : {
        source: "operator_line_endpoint_topology",
        reason: "detector_found_no_closed_arrowhead_with_connected_shaft",
        provesSourceAbsence: false
      },
      motifCount: selectedMotifs.length,
      candidateMotifs: uniqueMotifs,
      selectedMotifs,
      nearbyLines: nearby,
      flightEnvelopes,
      motifs: selectedMotifs.map((motif) => ({
        flightId: motif.flight.id,
        flightBandIndex: motif.flight.bandIndex,
        flightRunIndex: motif.flight.runIndex,
        lineIds: motif.lines.map((line) => line.id).sort(),
        wingLineIds: motif.wingLineIds,
        baseLineId: motif.baseLineId,
        shaftLineId: motif.shaftLineId,
        directionSign: motif.directionSign,
        tipPt: {
          x: round(motif.tip.x, 3),
          y: round(motif.tip.y, 3)
        },
        baseCenterPt: {
          x: round(motif.baseCenter.x, 3),
          y: round(motif.baseCenter.y, 3)
        },
        flightCoreRangePt: {
          main0: round(motif.flight.coreMain0, 3),
          main1: round(motif.flight.coreMain1, 3),
          perpendicular0: round(motif.flight.perp0, 3),
          perpendicular1: round(motif.flight.perp1, 3)
        },
        shaftOverlapRatio: round(motif.shaftOverlapRatio, 4),
        closedTriangle: true,
        shaftTouchesArrow: true,
        withinFlightCore: true,
        source: motif.source
      }))
    };
  }

  function serializeStairDirectionMotif(motif) {
    return {
      markerType: "direction_arrow",
      flightId: motif.flight.id,
      flightBandIndex: motif.flight.bandIndex,
      flightRunIndex: motif.flight.runIndex,
      lineIds: motif.lines.map((line) => line.id).sort(),
      wingLineIds: motif.wingLineIds,
      baseLineId: motif.baseLineId,
      shaftLineId: motif.shaftLineId,
      directionSign: motif.directionSign,
      tipPt: {
        x: round(motif.tip.x, 3),
        y: round(motif.tip.y, 3)
      },
      baseCenterPt: {
        x: round(motif.baseCenter.x, 3),
        y: round(motif.baseCenter.y, 3)
      },
      flightCoreRangePt: {
        main0: round(motif.flight.coreMain0, 3),
        main1: round(motif.flight.coreMain1, 3),
        perpendicular0: round(motif.flight.perp0, 3),
        perpendicular1: round(motif.flight.perp1, 3)
      },
      shaftOverlapRatio: round(motif.shaftOverlapRatio, 4),
      closedTriangle: true,
      shaftTouchesArrow: true,
      withinFlightCore: true,
      source: motif.source
    };
  }

  function stairBreakMotifs(group, arrowEvidence, treadIds, landingIds) {
    const tolerance = Math.max(1.5, group.spacingPdf * 0.3);
    const connectorTolerance = Math.max(1.5, group.spacingPdf * 0.65);
    const pointMain = (point) => group.orientation === "vertical" ? Number(point.y) : Number(point.x);
    const pointPerpendicular = (point) =>
      group.orientation === "vertical" ? Number(point.x) : Number(point.y);
    const shaftOrientation = group.orientation === "vertical" ? "horizontal" : "vertical";
    const candidates = arrowEvidence.candidateMotifs || [];
    const results = [];
    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const first = candidates[firstIndex];
        const second = candidates[secondIndex];
        if (first.flight.id !== second.flight.id ||
          first.directionSign === second.directionSign ||
          first.lines.some((line) => second.lines.some((other) => other.id === line.id))) continue;
        const ordered = [first, second].sort((left, right) =>
          pointPerpendicular(left.tip) - pointPerpendicular(right.tip)
        );
        const left = ordered[0];
        const right = ordered[1];
        if (left.directionSign !== 1 || right.directionSign !== -1) continue;
        const markerMain = (pointMain(left.tip) + pointMain(right.tip)) / 2;
        const headSeparation = pointPerpendicular(right.tip) - pointPerpendicular(left.tip);
        if (Math.abs(pointMain(left.tip) - pointMain(right.tip)) > tolerance ||
          headSeparation < Math.max(3, group.spacingPdf * 0.35) ||
          headSeparation > Math.max(24, group.spacingPdf * 2.2)) continue;
        const leftShaft = left.lines.find((line) => line.id === left.shaftLineId);
        const rightShaft = right.lines.find((line) => line.id === right.shaftLineId);
        const leftShaftAxis = lineAxisRange(leftShaft);
        const rightShaftAxis = lineAxisRange(rightShaft);
        if (!leftShaftAxis || !rightShaftAxis ||
          leftShaftAxis.orientation !== shaftOrientation ||
          rightShaftAxis.orientation !== shaftOrientation ||
          Math.abs(leftShaftAxis.perp - rightShaftAxis.perp) > tolerance) continue;
        const arrowIds = new Set(
          left.lines.concat(right.lines).map((line) => line.id).filter(Boolean)
        );
        const flight = left.flight;
        const corridorPadding = Math.max(4, group.spacingPdf * 0.65);
        const corridorPerpendicular0 =
          pointPerpendicular(left.tip) - corridorPadding;
        const corridorPerpendicular1 =
          pointPerpendicular(right.tip) + corridorPadding;
        const breakCandidates = (arrowEvidence.nearbyLines || []).filter((line) => {
          if (!line || arrowIds.has(line.id) || treadIds.has(line.id) || landingIds.has(line.id)) {
            return false;
          }
          if (line.orientation !== "diagonal" &&
            !(line.orientation === shaftOrientation &&
              line.lengthPdf <= Math.max(8, group.spacingPdf * 0.8))) return false;
          const endpoints = stairLineEndpoints(line);
          if (endpoints.length !== 2) return false;
          const mainValues = endpoints.map(pointMain);
          const perpendicularValues = endpoints.map(pointPerpendicular);
          return Math.min(...mainValues) >= flight.main0 - corridorPadding &&
            Math.max(...mainValues) <= flight.main1 + corridorPadding &&
            Math.min(...perpendicularValues) >= corridorPerpendicular0 &&
            Math.max(...perpendicularValues) <= corridorPerpendicular1;
        });
        const parent = breakCandidates.map((_, index) => index);
        const rootOf = (index) => {
          let root = index;
          while (parent[root] !== root) root = parent[root];
          while (parent[index] !== index) {
            const next = parent[index];
            parent[index] = root;
            index = next;
          }
          return root;
        };
        const join = (firstLineIndex, secondLineIndex) => {
          const firstRoot = rootOf(firstLineIndex);
          const secondRoot = rootOf(secondLineIndex);
          if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
        };
        for (let firstLineIndex = 0; firstLineIndex < breakCandidates.length; firstLineIndex += 1) {
          for (let secondLineIndex = firstLineIndex + 1;
            secondLineIndex < breakCandidates.length;
            secondLineIndex += 1) {
            const relation = stairClosestEndpointRelation(
              breakCandidates[firstLineIndex],
              breakCandidates[secondLineIndex]
            );
            if (relation && relation.distance <= connectorTolerance) {
              join(firstLineIndex, secondLineIndex);
            }
          }
        }
        const components = new Map();
        breakCandidates.forEach((line, index) => {
          const root = rootOf(index);
          if (!components.has(root)) components.set(root, []);
          components.get(root).push(line);
        });
        const breakComponent = Array.from(components.values())
          .map((lines) => {
            const endpoints = lines.flatMap(stairLineEndpoints);
            const mainValues = endpoints.map(pointMain);
            const perpendicularValues = endpoints.map(pointPerpendicular);
            const diagonalLines = lines.filter((line) => line.orientation === "diagonal");
            const slopeSigns = new Set(diagonalLines.map((line) => {
              const endpointsForLine = stairLineEndpoints(line);
              const mainDelta = pointMain(endpointsForLine[1]) - pointMain(endpointsForLine[0]);
              const perpendicularDelta =
                pointPerpendicular(endpointsForLine[1]) - pointPerpendicular(endpointsForLine[0]);
              return Math.sign(mainDelta * perpendicularDelta);
            }).filter((sign) => sign !== 0));
            const mainSpan = Math.max(...mainValues) - Math.min(...mainValues);
            const perpendicularSpan =
              Math.max(...perpendicularValues) - Math.min(...perpendicularValues);
            const markerPoint = {
              x: group.orientation === "vertical"
                ? (pointPerpendicular(left.tip) + pointPerpendicular(right.tip)) / 2
                : markerMain,
              y: group.orientation === "vertical"
                ? markerMain
                : (pointPerpendicular(left.tip) + pointPerpendicular(right.tip)) / 2
            };
            const markerDistance = Math.min(
              ...lines.map((line) => stairPointToSegmentDistance(markerPoint, line))
            );
            return {
              lines: uniqueStairLines(lines),
              diagonalLines: uniqueStairLines(diagonalLines),
              mainSpan,
              perpendicularSpan,
              slopeSigns,
              markerDistance,
              crossesMarkerAxis:
                Math.min(...mainValues) <= markerMain + tolerance &&
                Math.max(...mainValues) >= markerMain - tolerance,
              score:
                diagonalLines.length * 3 +
                mainSpan / Math.max(1, flight.main1 - flight.main0) * 2 -
                markerDistance / Math.max(1, group.spacingPdf)
            };
          })
          .filter((component) =>
            component.diagonalLines.length >= 3 &&
            component.slopeSigns.size >= 2 &&
            component.mainSpan >= Math.max(12, (flight.main1 - flight.main0) * 0.75) &&
            component.perpendicularSpan <= Math.max(30, group.spacingPdf * 3) &&
            component.markerDistance <= Math.max(6, group.spacingPdf * 0.8) &&
            component.crossesMarkerAxis
          )
          .sort((firstComponent, secondComponent) =>
            secondComponent.score - firstComponent.score ||
            firstComponent.lines.map((line) => line.id).join("|")
              .localeCompare(secondComponent.lines.map((line) => line.id).join("|"))
          )[0];
        if (!breakComponent) continue;
        const lines = uniqueStairLines(
          left.lines.concat(right.lines, breakComponent.lines)
        );
        results.push({
          markerType: "stair_break",
          flight,
          lines,
          diagonalBreakLines: breakComponent.diagonalLines,
          breakPathLines: breakComponent.lines,
          headMotifs: [left, right],
          score: left.score + right.score + breakComponent.score,
          opposingHeads: true,
          coaxialShafts: true,
          connectedBreakPath: true,
          source: "opposing_closed_arrowheads_coaxial_shafts_connected_diagonal_break_operator_geometry"
        });
      }
    }
    const selected = [];
    const usedFlights = new Set();
    const usedLineIds = new Set();
    results
      .sort((first, second) =>
        second.score - first.score ||
        first.flight.id.localeCompare(second.flight.id) ||
        first.lines.map((line) => line.id).join("|")
          .localeCompare(second.lines.map((line) => line.id).join("|"))
      )
      .forEach((motif) => {
        if (usedFlights.has(motif.flight.id) ||
          motif.lines.some((line) => usedLineIds.has(line.id))) return;
        usedFlights.add(motif.flight.id);
        motif.lines.forEach((line) => usedLineIds.add(line.id));
        selected.push(motif);
      });
    return selected;
  }

  function stairMarkerEvidence(group, sourceLines, treadIds, landingIds) {
    const arrowEvidence = stairArrowheadMotifs(group, sourceLines, treadIds, landingIds);
    const breakMotifs = stairBreakMotifs(group, arrowEvidence, treadIds, landingIds);
    const breakFlightIds = new Set(breakMotifs.map((motif) => motif.flight.id));
    const directionMotifs = (arrowEvidence.selectedMotifs || [])
      .filter((motif) => !breakFlightIds.has(motif.flight.id));
    const directionLines = uniqueStairLines(
      directionMotifs.flatMap((motif) => motif.lines)
    );
    const breakLines = uniqueStairLines(
      breakMotifs.flatMap((motif) => motif.lines)
    );
    const markerLines = uniqueStairLines(directionLines.concat(breakLines));
    const serializedDirectionMotifs = directionMotifs.map(serializeStairDirectionMotif);
    const serializedBreakMotifs = breakMotifs.map((motif) => ({
      markerType: "stair_break",
      flightId: motif.flight.id,
      flightBandIndexes: [motif.flight.bandIndex],
      lineIds: motif.lines.map((line) => line.id).sort(),
      diagonalBreakLineIds: motif.diagonalBreakLines.map((line) => line.id).sort(),
      breakPathLineIds: motif.breakPathLines.map((line) => line.id).sort(),
      headMotifs: motif.headMotifs.map(serializeStairDirectionMotif),
      opposingHeads: motif.opposingHeads,
      coaxialShafts: motif.coaxialShafts,
      connectedBreakPath: motif.connectedBreakPath,
      source: motif.source
    }));
    const markerTypes = [];
    if (serializedDirectionMotifs.length) markerTypes.push("direction_arrow");
    if (serializedBreakMotifs.length) markerTypes.push("stair_break");
    const markerType = markerTypes.length === 1
      ? markerTypes[0]
      : markerTypes.length > 1
        ? "mixed_verified_stair_markers"
        : null;
    return {
      markerLines,
      directionLines,
      breakLines,
      markerType,
      motifs: serializedDirectionMotifs.concat(serializedBreakMotifs),
      directionMotifs: serializedDirectionMotifs,
      breakMotifs: serializedBreakMotifs,
      roleStatus: markerLines.length ? "geometry_bound" : "unresolved",
      roleAbsentEvidence: markerLines.length ? null : {
        source: "operator_line_marker_topology",
        reason: "detector_found_no_verified_direction_arrow_or_stair_break_marker",
        provesSourceAbsence: false
      }
    };
  }

  function stairBoundaryEvidence(group, sourceLines, treadIds) {
    const perpendicularOrientation = group.orientation === "vertical" ? "horizontal" : "vertical";
    const tolerance = Math.max(2, group.spacingPdf * 0.65);
    const perpendicularCandidates = (sourceLines || []).filter((line) => {
      if (!line || treadIds.has(line.id) || line.orientation !== perpendicularOrientation) return false;
      return Boolean(lineAxisRange(line));
    });
    const flightSideCoverage = stairTreadBands(group).map((band, bandIndex) => {
      const entries = band.entries.slice().sort((first, second) =>
        first.axis.perp - second.axis.perp ||
        String(first.line.id).localeCompare(String(second.line.id))
      );
      const perpendicularStart = entries[0] && entries[0].axis.perp;
      const perpendicularEnd = entries[entries.length - 1] && entries[entries.length - 1].axis.perp;
      const perpendicularSpan = Math.max(1, Number(perpendicularEnd) - Number(perpendicularStart));
      const selectSideRail = (edge) => perpendicularCandidates
        .map((line) => {
          const axis = lineAxisRange(line);
          const overlap = Math.max(0,
            Math.min(axis.main1, perpendicularEnd) - Math.max(axis.main0, perpendicularStart)
          );
          return {
            line,
            distance: Math.abs(axis.perp - edge),
            overlap
          };
        })
        .filter((entry) =>
          entry.distance <= tolerance &&
          entry.overlap / perpendicularSpan >= 0.3
        )
        .sort((first, second) =>
          first.distance - second.distance ||
          second.overlap - first.overlap ||
          first.line.lengthPdf - second.line.lengthPdf ||
          String(first.line.id).localeCompare(String(second.line.id))
        )[0];
      const startRail = selectSideRail(band.start);
      const endRail = selectSideRail(band.end);
      const sideLines = uniqueStairLines(
        [startRail && startRail.line, endRail && endRail.line].filter(Boolean)
      );
      const firstTread = entries[0] && entries[0].line;
      const lastTread = entries[entries.length - 1] && entries[entries.length - 1].line;
      const crossFlightEndLines = uniqueStairLines(
        [firstTread, lastTread].filter(Boolean)
      );
      return {
        bandIndex,
        lineIds: sideLines.map((line) => line.id),
        sideCount: sideLines.length,
        crossFlightEndLineIds: crossFlightEndLines.map((line) => line.id),
        crossFlightEndCount: crossFlightEndLines.length,
        source: "flight_side_rails_and_extremal_tread_end_edges_operator_geometry",
        sideRailSource: "perpendicular_operator_lines_at_flight_band_extent",
        crossFlightEndSource: "extremal_tread_operator_geometry",
        crossFlightEndsSharedWithTreadRole: true,
        edgeDistancesPt: {
          start: startRail ? round(startRail.distance, 3) : null,
          end: endRail ? round(endRail.distance, 3) : null
        }
      };
    });
    const sideRailLines = uniqueStairLines(
      flightSideCoverage.flatMap((coverage) =>
        coverage.lineIds.map((id) =>
          perpendicularCandidates.find((line) => line.id === id)
        ).filter(Boolean)
      )
    );
    const sharedCrossFlightEndLines = uniqueStairLines(
      flightSideCoverage.flatMap((coverage) =>
        coverage.crossFlightEndLineIds.map((id) =>
          (group.items || []).map((entry) => entry.line).find((line) => line.id === id)
        ).filter(Boolean)
      )
    );
    const lines = uniqueStairLines(sideRailLines.concat(sharedCrossFlightEndLines));
    const axisCoverage = [];
    if (flightSideCoverage.length &&
      flightSideCoverage.every((coverage) => coverage.sideCount >= 2)) {
      axisCoverage.push("perpendicular_to_treads");
    }
    if (flightSideCoverage.length &&
      flightSideCoverage.every((coverage) => coverage.crossFlightEndCount >= 2)) {
      axisCoverage.push("parallel_to_treads");
    }
    const complete = axisCoverage.length === 2;
    return {
      lines,
      sideRailLines,
      sharedCrossFlightEndLines,
      axisCoverage,
      flightSideCoverage,
      sharedRoleLineIds: sharedCrossFlightEndLines.map((line) => line.id),
      roleStatus: complete ? "geometry_bound" : "unresolved",
      roleAbsentEvidence: null,
      relationEvidence: {
        source: "operator_line_flight_side_rails_and_extremal_tread_end_edges",
        axisCoverage,
        flightSideCoverage,
        sharedRoleLineIds: sharedCrossFlightEndLines.map((line) => line.id),
        sharedRoleMeaning: "cross_flight_end_edges_also_classified_as_extremal_treads"
      }
    };
  }

  function aggregateStairRoleEvidence(group, sourceLines) {
    const treadIds = new Set((group.items || []).map((entry) => entry.line.id).filter(Boolean));
    const landing = stairLandingEvidence(group, sourceLines, treadIds);
    const landingIds = new Set(landing.lines.map((line) => line.id));
    const marker = stairMarkerEvidence(group, sourceLines, treadIds, landingIds);
    const boundaries = stairBoundaryEvidence(group, sourceLines, treadIds);
    const requiredRoleStatus = {
      treads: treadIds.size ? "geometry_bound" : "unresolved",
      boundaries: boundaries.roleStatus,
      landing: landing.roleStatus,
      stairMarker: marker.roleStatus
    };
    const unresolvedRoles = Object.entries(requiredRoleStatus)
      .filter(([, status]) => status === "unresolved")
      .map(([role]) => role);
    return {
      boundaryLines: boundaries.lines,
      landingLines: landing.lines,
      markerLines: marker.markerLines,
      directionLines: marker.directionLines,
      breakLines: marker.breakLines,
      requiredRoleStatus,
      requiredRolesComplete: unresolvedRoles.length === 0,
      completeCoverage: {
        schema: "laibe.planPuzzle.pdfStairCompleteCoverage.v1",
        source: "pdf_operator_line_geometry",
        roleCounts: {
          treads: treadIds.size,
          boundaries: boundaries.lines.length,
          landing: landing.lines.length,
          stairMarker: marker.markerLines.length,
          directionArrow: marker.directionLines.length,
          stairBreak: marker.breakLines.length
        },
        boundaryAxisCoverage: boundaries.axisCoverage,
        boundaryFlightSideCoverage: boundaries.flightSideCoverage,
        sharedBoundaryTreadLineCount: boundaries.sharedRoleLineIds.length,
        stairMarkerType: marker.markerType,
        directionMotifCount: marker.directionMotifs.length,
        stairBreakMotifCount: marker.breakMotifs.length,
        allPresentSourceRolesOwnedByGroup: unresolvedRoles.length === 0
      },
      roleAbsentEvidence: {
        landing: landing.roleAbsentEvidence,
        stairMarker: marker.roleAbsentEvidence
      },
      roleRelationEvidence: {
        boundaries: boundaries.relationEvidence,
        landing: landing.gapEvidence || null,
        stairMarker: {
          source: "verified_stair_marker_operator_geometry",
          markerType: marker.markerType,
          motifs: marker.motifs,
          directionArrowMotifs: marker.directionMotifs,
          stairBreakMotifs: marker.breakMotifs
        }
      },
      unresolvedReason: unresolvedRoles.length
        ? "missing_required_stair_source_geometry:" + unresolvedRoles.join(",")
        : null
    };
  }

  function detectStairCandidates(lines, walls, rects, wallThicknessPx) {
    const eligibleLineEntries = (lines || []).filter((line) => line && line.orientation !== "diagonal" && line.lengthPdf >= 8 &&
      line.lengthPdf <= 220 && line.lineWidthPdf <= Math.max(1.4, Number(wallThicknessPx || 0) * 0.55));
    const rectTreadLines = (rects || []).map((rect, index) => {
      if (!rect || !rect.pageBox || !isStrokePaint(rect.paint)) return null;
      const width = Number(rect.pageBox.width) || 0;
      const height = Number(rect.pageBox.height) || 0;
      const short = Math.min(width, height);
      const long = Math.max(width, height);
      if (short < 1.5 || short > 10 || long < 8 || long > 140 || long / Math.max(short, 0.001) < 1.8) return null;
      const horizontal = width >= height;
      const center = centerOfBox(rect.pageBox);
      return {
        id: "pdf-rect-tread-" + String(index + 1).padStart(4, "0"),
        orientation: horizontal ? "horizontal" : "vertical",
        pageFrom: horizontal ? { x: rect.pageBox.x0, y: center.y } : { x: center.x, y: rect.pageBox.y0 },
        pageTo: horizontal ? { x: rect.pageBox.x1, y: center.y } : { x: center.x, y: rect.pageBox.y1 },
        lengthPdf: long,
        lineWidthPdf: short,
        paint: rect.paint
      };
    }).filter(Boolean);
    const treadSource = (lines || []).concat(rectTreadLines);
    const grouped = groupRepeatedTreads(treadSource, wallThicknessPx);
    const mergedGroups = mergeCompatibleTreadGroups(grouped)
      .map(filterDominantTreadLattice)
      .filter(Boolean);
    const candidates = mergedGroups.map((group, index) => {
      const envelope = boundedEnvelopeEvidence(group, walls, rects);
      if (!envelope.bounded) return null;
      const roles = aggregateStairRoleEvidence(group, lines);
      const primaryLanding = roles.landingLines.slice()
        .sort((first, second) =>
          second.lengthPdf - first.lengthPdf ||
          String(first.id).localeCompare(String(second.id))
        )[0] || null;
      if (!primaryLanding && envelope.sideCount < 3 &&
        roles.requiredRoleStatus.landing !== "source_role_not_present") return null;
      const detectorPredicate = semanticDetectorPredicates.stair({
        treadCount: group.items.length,
        spacingPdf: group.spacingPdf,
        regularSpacingRatio: group.regularSpacingRatio,
        boundedEnvelope: envelope,
        landingLineId: primaryLanding && primaryLanding.id || null
      });
      if (!detectorPredicate.pass) return null;
      const treadLines = group.items.map((entry) =>
        stairOperatorLineEvidence(entry.line, "repeated_regular_tread_operator_geometry")
      ).filter(Boolean);
      const boundaryLines = roles.boundaryLines.map((line) =>
        stairOperatorLineEvidence(line, "extremal_tread_envelope_boundary_operator_geometry")
      ).filter(Boolean);
      const landingLines = roles.landingLines.map((line) =>
        stairOperatorLineEvidence(line, "inter_flight_landing_gap_operator_geometry")
      ).filter(Boolean);
      const directionLines = roles.directionLines.map((line) =>
        stairOperatorLineEvidence(line, "closed_arrowhead_connected_direction_path_operator_geometry")
      ).filter(Boolean);
      const breakLines = roles.breakLines.map((line) =>
        stairOperatorLineEvidence(line, "opposing_arrowheads_connected_stair_break_operator_geometry")
      ).filter(Boolean);
      const markerLines = roles.markerLines.map((line) =>
        stairOperatorLineEvidence(line, "verified_stair_marker_operator_geometry")
      ).filter(Boolean);
      return {
        id: "pdf-stair-" + String(index + 1).padStart(4, "0"),
        category: "stair",
        subtype: "treads_landing_verified_marker_envelope",
        coordinateFrame: "page-bottom-left-pdf-pt",
        bbox: group.bbox,
        pageBox: group.bbox,
        evidence: {
          treadLineIds: treadLines.map((line) => line.id).sort(),
          treadLines,
          treadCount: group.items.length,
          spacingPdf: group.spacingPdf,
          regularSpacingRatio: group.regularSpacingRatio,
          dominantLatticeEvidence: group.dominantLatticeEvidence,
          boundaryLineIds: boundaryLines.map((line) => line.id).sort(),
          boundaryLines,
          landingLineId: primaryLanding && primaryLanding.id || null,
          landingLine: primaryLanding
            ? stairOperatorLineEvidence(primaryLanding, "primary_inter_flight_landing_operator_geometry")
            : null,
          landingLineIds: landingLines.map((line) => line.id).sort(),
          landingLines,
          directionLineIds: directionLines.map((line) => line.id).sort(),
          directionLines,
          stairBreakLineIds: breakLines.map((line) => line.id).sort(),
          stairBreakLines: breakLines,
          markerLineIds: markerLines.map((line) => line.id).sort(),
          markerLines,
          requiredRoleStatus: roles.requiredRoleStatus,
          requiredRolesComplete: roles.requiredRolesComplete,
          completeCoverage: roles.completeCoverage,
          roleAbsentEvidence: roles.roleAbsentEvidence,
          roleRelationEvidence: roles.roleRelationEvidence,
          unresolvedReason: roles.unresolvedReason,
          boundedEnvelope: envelope,
          detectorPredicate
        },
        confidence: roles.requiredRolesComplete ? "candidate" : "unresolved",
        semantic_status: roles.requiredRolesComplete
          ? "candidate_unaccepted"
          : "unresolved_source_geometry",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        reviewRequired: true
      };
    }).filter(Boolean);
    candidates.diagnostics = {
      schema: "laibe.planPuzzle.pdfStairDetectorDiagnostics.v1",
      sourceLineCount: (lines || []).length,
      eligibleLineCount: eligibleLineEntries.length,
      eligibleLineOrientationCounts: eligibleLineEntries.reduce((counts, line) => {
        counts[line.orientation] = (counts[line.orientation] || 0) + 1;
        return counts;
      }, {}),
      eligibleLineSample: eligibleLineEntries.filter((line) => line.lengthPdf <= 80).slice(0, 160).map((line) => ({
        id: line.id,
        orientation: line.orientation,
        lengthPdf: line.lengthPdf,
        lineWidthPdf: line.lineWidthPdf,
        from: line.pageFrom,
        to: line.pageTo
      })),
      rectangleTreadCount: rectTreadLines.length,
      treadSourceCount: treadSource.length,
      repeatedGroupCount: grouped.length,
      mergedRepeatedGroupCount: mergedGroups.length,
      boundedCandidateCount: candidates.length,
      groupingDiagnostics: grouped.diagnostics || null,
      repeatedGroups: mergedGroups.map((group) => ({
        orientation: group.orientation,
        itemCount: group.items.length,
        bbox: group.bbox,
        spacingPdf: group.spacingPdf,
        regularSpacingRatio: group.regularSpacingRatio,
        envelope: boundedEnvelopeEvidence(group, walls, rects)
      }))
    };
    return candidates;
  }

  function rectangularClosedTopology(rects) {
    return (rects || []).map((rect, index) => {
      const box = rect && rect.pageBox;
      if (!box || !isStrokePaint(rect.paint) || !(box.width > 8) || !(box.height > 8)) return null;
      return {
        id: "pdf-rect-closed-topology-" + String(index + 1).padStart(4, "0"),
        pageBox: box,
        segments: [0, 1, 2, 3],
        closedTopology: true,
        source: "stroke_rect"
      };
    }).filter(Boolean);
  }

  function lineCoversInterval(axis, from, to, tolerance) {
    return axis && axis.main0 <= from + tolerance && axis.main1 >= to - tolerance;
  }

  function orthogonalLineCycleTopologies(stair, lines, walls) {
    const stairBox = stair && stair.pageBox;
    const spacing = Number(stair && stair.evidence && stair.evidence.spacingPdf) || 0;
    if (!stairBox || !(spacing > 0)) return [];
    const padding = Math.max(12, spacing * 4);
    const searchBox = expandBox(stairBox, padding);
    const seen = new Set();
    const entries = (lines || []).concat(walls || []).map((line) => {
      const axis = lineAxisRange(line);
      const box = pageLineBox(line, 0.8);
      if (!axis || !box || !boxesIntersect(box, searchBox) || line.orientation === "diagonal") return null;
      const key = [line.id || "", axis.orientation, round(axis.main0, 2), round(axis.main1, 2), round(axis.perp, 2)].join(":");
      if (seen.has(key)) return null;
      seen.add(key);
      return { line, axis, box, centerDistance: boxDistance(box, stairBox) };
    }).filter(Boolean).sort((a, b) => a.centerDistance - b.centerDistance || String(a.line.id || "").localeCompare(String(b.line.id || "")));
    const horizontal = entries.filter((entry) => entry.axis.orientation === "horizontal").slice(0, 36);
    const vertical = entries.filter((entry) => entry.axis.orientation === "vertical").slice(0, 36);
    const minSide = Math.max(8, spacing * 1.4);
    const maxWidth = stairBox.width * 1.9 + padding;
    const maxHeight = stairBox.height * 1.9 + padding;
    const horizontalPairs = [];
    const verticalPairs = [];
    for (let firstIndex = 0; firstIndex < horizontal.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < horizontal.length; secondIndex += 1) {
        const first = horizontal[firstIndex];
        const second = horizontal[secondIndex];
        const height = Math.abs(second.axis.perp - first.axis.perp);
        if (height >= minSide && height <= maxHeight) horizontalPairs.push({ first, second, y0: Math.min(first.axis.perp, second.axis.perp), y1: Math.max(first.axis.perp, second.axis.perp) });
      }
    }
    for (let firstIndex = 0; firstIndex < vertical.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < vertical.length; secondIndex += 1) {
        const first = vertical[firstIndex];
        const second = vertical[secondIndex];
        const width = Math.abs(second.axis.perp - first.axis.perp);
        if (width >= minSide && width <= maxWidth) verticalPairs.push({ first, second, x0: Math.min(first.axis.perp, second.axis.perp), x1: Math.max(first.axis.perp, second.axis.perp) });
      }
    }
    const treadIds = new Set((stair.evidence && stair.evidence.treadLineIds || []).filter(Boolean));
    const sourceLineById = new Map((lines || []).map((line) => [line.id, line]));
    const topologies = [];
    horizontalPairs.forEach((horizontalPair) => {
      verticalPairs.forEach((verticalPair) => {
        const tolerance = Math.max(1.25, spacing * 0.2);
        if (!lineCoversInterval(horizontalPair.first.axis, verticalPair.x0, verticalPair.x1, tolerance) ||
          !lineCoversInterval(horizontalPair.second.axis, verticalPair.x0, verticalPair.x1, tolerance) ||
          !lineCoversInterval(verticalPair.first.axis, horizontalPair.y0, horizontalPair.y1, tolerance) ||
          !lineCoversInterval(verticalPair.second.axis, horizontalPair.y0, horizontalPair.y1, tolerance)) return;
        const box = { x0: verticalPair.x0, y0: horizontalPair.y0, x1: verticalPair.x1, y1: horizontalPair.y1, width: verticalPair.x1 - verticalPair.x0, height: horizontalPair.y1 - horizontalPair.y0 };
        const overlap = overlapArea(box, stairBox);
        if (overlap / Math.max(0.001, Math.min(boxArea(box), boxArea(stairBox))) < 0.06) return;
        const treadInteriorCount = Array.from(treadIds).reduce((count, id) => {
          const tread = sourceLineById.get(id);
          const treadBox = tread && pageLineBox(tread, 0);
          const center = treadBox && centerOfBox(treadBox);
          return count + (center && pointInBox(center, box) ? 1 : 0);
        }, 0);
        const treadInteriorRatio = treadInteriorCount / Math.max(1, treadIds.size);
        const pathArea = Math.max(0.001, boxArea(box));
        const exteriorOfTreadEnvelopeRatio = Math.max(0, pathArea - overlap) / pathArea;
        const enclosureDistinctFromTreadEnvelope = exteriorOfTreadEnvelopeRatio >= 0.12 || pathArea / Math.max(0.001, boxArea(stairBox)) >= 1.14;
        // A stair void may contain part of a tread bundle, but its independently
        // closed boundary must extend beyond the tread envelope. This prevents a
        // staircase outline from being relabeled as its own void.
        if (treadInteriorRatio > 0.45 && !enclosureDistinctFromTreadEnvelope) return;
        const hostWallIds = (walls || []).filter((wall) => {
          const wallBox = pageLineBox(wall, 1.5);
          return wallBox && boxesIntersect(wallBox, expandBox(box, 1.5));
        }).map((wall) => wall.id).filter(Boolean).sort();
        if (hostWallIds.length < 3) return;
        const boundaryLineIds = [horizontalPair.first.line.id, horizontalPair.second.line.id, verticalPair.first.line.id, verticalPair.second.line.id].filter(Boolean).sort();
        topologies.push({
          id: "pdf-orthogonal-line-cycle-" + boundaryLineIds.join("-"),
          pageBox: box,
          segments: boundaryLineIds,
          closedTopology: true,
          source: "orthogonal_line_cycle",
          hostWallContactCount: hostWallIds.length,
          hostWallIds,
          relatedStairId: stair.id,
          treadInteriorCount,
          treadInteriorRatio: round(treadInteriorRatio, 3),
          exteriorOfTreadEnvelopeRatio: round(exteriorOfTreadEnvelopeRatio, 3),
          enclosureDistinctFromTreadEnvelope,
          geometryScore: round(hostWallIds.length + overlap / Math.max(1, boxArea(box)), 3)
        });
      });
    });
    const selected = [];
    topologies.sort((a, b) => b.geometryScore - a.geometryScore || boxArea(b.pageBox) - boxArea(a.pageBox) || a.id.localeCompare(b.id)).forEach((topology) => {
      const duplicate = selected.some((existing) => {
        const overlap = overlapArea(existing.pageBox, topology.pageBox);
        return overlap / Math.max(0.001, Math.min(boxArea(existing.pageBox), boxArea(topology.pageBox))) >= 0.75;
      });
      if (!duplicate) selected.push(topology);
    });
    return selected;
  }

  function detectStairVoidCandidates(stairs, paths, lines, walls, rects) {
    const candidates = [];
    const boundaries = (paths || []).filter(pathHasClosedTopology)
      .concat(rectangularClosedTopology(rects));
    (stairs || []).forEach((stair, stairIndex) => {
      const stairBoundaries = boundaries.concat(orthogonalLineCycleTopologies(stair, lines, walls));
      stairBoundaries.forEach((path, pathIndex) => {
        if (path.relatedStairId && path.relatedStairId !== stair.id) return;
        const expandedStairBox = expandBox(stair.pageBox, 12);
        if (!boxesIntersect(path.pageBox, expandedStairBox)) return;
        const intersection = overlapArea(path.pageBox, stair.pageBox);
        const stairArea = Math.max(0.001, stair.pageBox.width * stair.pageBox.height);
        const pathArea = Math.max(0.001, path.pageBox.width * path.pageBox.height);
        const mutualCoverage = intersection / Math.min(stairArea, pathArea);
        const treadInteriorRatio = Number(path.treadInteriorRatio || 0);
        const enclosureDistinctFromTreadEnvelope = path.enclosureDistinctFromTreadEnvelope !== false;
        if (mutualCoverage < 0.06 || pathArea > stairArea * 2.2 || stairArea > pathArea * 8 || (treadInteriorRatio > 0.45 && !enclosureDistinctFromTreadEnvelope)) return;
        const contactCount = Number(path.hostWallContactCount || 0) || (path.source === "stroke_rect"
          ? (walls || []).filter((wall) => boxesIntersect(pageLineBox(wall, 2), expandBox(path.pageBox, 2))).length
          : pathBoundaryContactCount(path, walls, 2));
        if (contactCount < 3) return;
        const detectorPredicate = semanticDetectorPredicates.stairVoid({
          closedPath: true,
          boundarySegmentCount: path.segments.length,
          hostWallContactCount: contactCount,
          relatedStairId: stair.id
        });
        if (!detectorPredicate.pass) return;
        candidates.push({
          id: "pdf-stair-void-" + String(stairIndex + 1).padStart(4, "0") + "-" + String(pathIndex + 1).padStart(4, "0"),
          category: "stair_void",
          subtype: "independently_bounded_stair_void",
          coordinateFrame: "page-bottom-left-pdf-pt",
          bbox: path.pageBox,
          pageBox: path.pageBox,
          evidence: { sourcePathIndex: pathIndex, closedPath: true, boundarySource: path.source || "path", boundarySegmentCount: path.segments.length, hostWallContactCount: contactCount, hostWallIds: path.hostWallIds || [], treadGroupRelation: { relatedStairId: stair.id, interiorTreadCount: Number(path.treadInteriorCount || 0), interiorTreadRatio: treadInteriorRatio, enclosureDistinctFromTreadEnvelope }, geometryScore: Number(path.geometryScore || 0), relatedStairId: stair.id, detectorPredicate },
          confidence: "candidate",
          semantic_status: "candidate_unaccepted",
          human_confirmation_required: true,
          mapping_state: "not_accepted",
          editable_object_id: null,
          acceptedTransformId: null,
          reviewRequired: true
        });
      });
    });
    return dedupeSemanticCandidates(candidates);
  }

  function hostWallGapOnBoundary(box, walls) {
    if (!box) return null;
    const result = [];
    ["horizontal", "vertical"].forEach((orientation) => {
      const sides = orientation === "horizontal" ? [box.y0, box.y1] : [box.x0, box.x1];
      const main0 = orientation === "horizontal" ? box.x0 : box.y0;
      const main1 = orientation === "horizontal" ? box.x1 : box.y1;
      const sideLength = Math.max(0.001, main1 - main0);
      sides.forEach((side) => {
        const aligned = (walls || []).map((wall) => ({ wall, axis: lineAxisRange(wall) }))
          .filter((entry) => entry.axis && entry.axis.orientation === orientation && Math.abs(entry.axis.perp - side) <= 2.5)
          .sort((first, second) => first.axis.main0 - second.axis.main0 || first.axis.main1 - second.axis.main1);
        for (let index = 0; index < aligned.length - 1; index += 1) {
          const first = aligned[index];
          const second = aligned[index + 1];
          const gap = second.axis.main0 - first.axis.main1;
          const center = (first.axis.main1 + second.axis.main0) / 2;
          if (gap >= 2 && gap <= Math.max(30, sideLength * 0.65) && center > main0 + 1 && center < main1 - 1) {
            result.push({ orientation, side: round(side, 2), wallIds: [first.wall.id || null, second.wall.id || null], gapLengthPdf: round(gap, 2), centerPdf: round(center, 2) });
          }
        }
      });
    });
    return result.sort((first, second) => second.gapLengthPdf - first.gapLengthPdf || first.centerPdf - second.centerPdf)[0] || null;
  }

  function boundaryCoverage(entries, orientation, perpendicular, from, to, tolerance) {
    const aligned = (entries || []).filter((entry) => entry && entry.axis && entry.axis.orientation === orientation &&
      Math.abs(entry.axis.perp - perpendicular) <= tolerance && entry.axis.main1 >= from - tolerance && entry.axis.main0 <= to + tolerance)
      .map((entry) => ({ from: Math.max(from, entry.axis.main0), to: Math.min(to, entry.axis.main1), id: entry.line.id || null }))
      .filter((entry) => entry.to > entry.from)
      .sort((first, second) => first.from - second.from || first.to - second.to || String(first.id).localeCompare(String(second.id)));
    const merged = [];
    aligned.forEach((entry) => {
      const previous = merged[merged.length - 1];
      if (previous && entry.from <= previous.to + tolerance) {
        previous.to = Math.max(previous.to, entry.to);
        if (entry.id) previous.ids.push(entry.id);
        return;
      }
      merged.push({ from: entry.from, to: entry.to, ids: entry.id ? [entry.id] : [] });
    });
    const coveredLength = merged.reduce((total, entry) => total + Math.max(0, entry.to - entry.from), 0);
    const length = Math.max(0.001, to - from);
    return {
      ratio: coveredLength / length,
      segmentCount: merged.length,
      ids: Array.from(new Set(merged.flatMap((entry) => entry.ids))).sort()
    };
  }

  function groupedWallAxes(entries, orientation, perpendicularTolerance) {
    const groups = [];
    (entries || []).filter((entry) => entry && entry.axis && entry.axis.orientation === orientation)
      .sort((first, second) => first.axis.perp - second.axis.perp || first.axis.main0 - second.axis.main0 || first.axis.main1 - second.axis.main1)
      .forEach((entry) => {
        const previous = groups[groups.length - 1];
        if (previous && Math.abs(entry.axis.perp - previous.perpendicularMean) <= perpendicularTolerance) {
          previous.members.push(entry);
          previous.perpendicularMean = previous.members.reduce((total, member) => total + member.axis.perp, 0) / previous.members.length;
          return;
        }
        groups.push({ perpendicularMean: entry.axis.perp, members: [entry] });
      });
    return groups.map((group) => ({
      axis: {
        orientation,
        perp: group.perpendicularMean,
        main0: Math.min(...group.members.map((member) => member.axis.main0)),
        main1: Math.max(...group.members.map((member) => member.axis.main1))
      },
      members: group.members
    })).filter((group) => group.axis.main1 - group.axis.main0 >= 16);
  }

  function orthogonalWallCycleTopologies(walls, pageSize) {
    const pageWidth = Number(pageSize && pageSize.width) || 0;
    const pageHeight = Number(pageSize && pageSize.height) || 0;
    const pageArea = Math.max(1, pageWidth * pageHeight);
    if (!(pageWidth > 0) || !(pageHeight > 0)) return [];
    const seen = new Set();
    const entries = (walls || []).map((line) => {
      const axis = lineAxisRange(line);
      if (!axis || line.orientation === "diagonal" || axis.main1 - axis.main0 < 16) return null;
      const key = [axis.orientation, round(axis.perp, 2), round(axis.main0, 2), round(axis.main1, 2)].join(":");
      if (seen.has(key)) return null;
      seen.add(key);
      return { line, axis };
    }).filter(Boolean);
    const horizontal = groupedWallAxes(entries, "horizontal", 2.5);
    const vertical = groupedWallAxes(entries, "vertical", 2.5);
    const minSide = Math.max(32, Math.min(pageWidth, pageHeight) * 0.035);
    const maxArea = pageArea * 0.06;
    const candidates = [];
    for (let leftIndex = 0; leftIndex < vertical.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < vertical.length; rightIndex += 1) {
        const left = vertical[leftIndex];
        const right = vertical[rightIndex];
        const x0 = Math.min(left.axis.perp, right.axis.perp);
        const x1 = Math.max(left.axis.perp, right.axis.perp);
        const width = x1 - x0;
        if (width < minSide || width > pageWidth * 0.72) continue;
        const boundaryTolerance = Math.max(2, Math.min(6, width * 0.035));
        const horizontalCandidates = horizontal.filter((entry) => {
          const coverage = boundaryCoverage(entries, "horizontal", entry.axis.perp, x0, x1, boundaryTolerance);
          return coverage.ratio >= 0.68;
        });
        for (let bottomIndex = 0; bottomIndex < horizontalCandidates.length; bottomIndex += 1) {
          for (let topIndex = bottomIndex + 1; topIndex < horizontalCandidates.length; topIndex += 1) {
            const bottom = horizontalCandidates[bottomIndex];
            const top = horizontalCandidates[topIndex];
            const y0 = Math.min(bottom.axis.perp, top.axis.perp);
            const y1 = Math.max(bottom.axis.perp, top.axis.perp);
            const height = y1 - y0;
            const area = width * height;
            if (height < minSide || height > pageHeight * 0.5 || area > maxArea) continue;
            const horizontalBottom = boundaryCoverage(entries, "horizontal", y0, x0, x1, boundaryTolerance);
            const horizontalTop = boundaryCoverage(entries, "horizontal", y1, x0, x1, boundaryTolerance);
            const verticalLeft = boundaryCoverage(entries, "vertical", x0, y0, y1, boundaryTolerance);
            const verticalRight = boundaryCoverage(entries, "vertical", x1, y0, y1, boundaryTolerance);
            const coverage = [horizontalBottom, horizontalTop, verticalLeft, verticalRight];
            const coveredSides = coverage.filter((side) => side.ratio >= 0.92).length;
            if (coveredSides < 3 || coverage.some((side) => side.ratio < 0.68)) continue;
            const ids = Array.from(new Set(coverage.flatMap((side) => side.ids))).sort();
            if (ids.length < 3) continue;
            candidates.push({
              id: "pdf-orthogonal-wall-cycle-" + ids.join("-"),
              pageBox: { x0, y0, x1, y1, width, height },
              segments: ids,
              boundaryPoints: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }],
              closedTopology: true,
              source: "orthogonal_wall_cycle",
              hostWallContactCount: ids.length,
              coverage: coverage.map((side) => round(side.ratio, 3)),
              geometryScore: round(coveredSides + coverage.reduce((sum, side) => sum + side.ratio, 0), 3)
            });
          }
        }
      }
    }
    const selected = [];
    candidates.sort((a, b) => b.geometryScore - a.geometryScore || boxArea(b.pageBox) - boxArea(a.pageBox) || a.id.localeCompare(b.id)).forEach((candidate) => {
      const duplicate = selected.some((existing) => {
        const overlap = overlapArea(existing.pageBox, candidate.pageBox);
        return overlap / Math.max(0.001, Math.min(boxArea(existing.pageBox), boxArea(candidate.pageBox))) >= 0.86;
      });
      if (!duplicate) selected.push(candidate);
    });
    return selected;
  }

  function detectSpaceBoundaryCandidates(paths, walls, openingCandidates, pageSize, rects) {
    const diagnostics = [];
    const boundaryTopologies = (paths || []).filter(pathHasClosedTopology)
      .concat(rectangularClosedTopology(rects))
      .concat(orthogonalWallCycleTopologies(walls, pageSize));
    const candidates = boundaryTopologies.map((path, index) => {
      const box = path.pageBox;
      const pageArea = Math.max(1, pageSize.width * pageSize.height);
      const area = boxArea(box);
      const diagnostic = { sourceIndex: index, source: path.source || "path", bbox: box, areaPdf: round(area, 2), boundarySegmentCount: Array.isArray(path.segments) ? path.segments.length : 0 };
      if (area < 600 || area > pageArea * 0.06 || Math.min(box.width, box.height) < 35) {
        diagnostics.push({ ...diagnostic, pass: false, reason: "outside_space_area_or_extent_bounds" });
        return null;
      }
      const boundaryContactCount = Number(path.hostWallContactCount || 0) || (path.source === "stroke_rect"
        ? (walls || []).filter((wall) => boxesIntersect(pageLineBox(wall, 2), expandBox(box, 2))).length
        : pathBoundaryContactCount(path, walls, 2));
      const hostWallIds = Array.from(new Set(
        (Array.isArray(path.segments) ? path.segments : []).filter((value) => typeof value === "string")
          .concat((walls || []).filter((wall) => boxesIntersect(pageLineBox(wall, 2), expandBox(box, 2))).map((wall) => wall.id))
      )).sort();
      const openingTolerance = Math.max(2, Math.min(12, Math.min(box.width, box.height) * 0.08));
      const semanticOpeningTreatment = (openingCandidates || []).some((opening) => boxesIntersect(opening.pageBox, expandBox(box, openingTolerance)));
      const hostGapTreatment = semanticOpeningTreatment ? null : hostWallGapOnBoundary(box, walls);
      const openingTreatment = semanticOpeningTreatment || Boolean(hostGapTreatment);
      if (boundaryContactCount < 3 || !openingTreatment) {
        diagnostics.push({ ...diagnostic, boundaryContactCount, semanticOpeningTreatment, hostGapTreatment, pass: false, reason: boundaryContactCount < 3 ? "insufficient_host_wall_contact" : "no_opening_treatment" });
        return null;
      }
      const detectorPredicate = semanticDetectorPredicates.space({
        closedPath: true,
        boundarySegmentCount: path.segments.length,
        hostWallContactCount: boundaryContactCount,
        openingTreatment
      });
      if (!detectorPredicate.pass) {
        diagnostics.push({ ...diagnostic, boundaryContactCount, semanticOpeningTreatment, hostGapTreatment, detectorPredicate, pass: false, reason: "shared_space_predicate_rejected" });
        return null;
      }
      diagnostics.push({ ...diagnostic, boundaryContactCount, semanticOpeningTreatment, hostGapTreatment, detectorPredicate, pass: true, reason: "closed_host_related_topology_with_opening_treatment" });
      return {
        id: "pdf-space-boundary-" + String(index + 1).padStart(4, "0"),
        category: "space_boundary",
        subtype: "closed_host_related_topology_with_opening_treatment",
        coordinateFrame: "page-bottom-left-pdf-pt",
        bbox: box,
        pageBox: box,
        boundaryPoints: Array.isArray(path.boundaryPoints) ? path.boundaryPoints.map((point) => ({ x: point.x, y: point.y })) : [],
        evidence: { sourcePathIndex: index, closedPath: true, boundarySource: path.source || "path", boundarySegmentCount: path.segments.length, hostWallContactCount: boundaryContactCount, hostWallIds, openingTreatment: true, openingTreatmentSource: semanticOpeningTreatment ? "semantic_opening_candidate" : "host_wall_gap", hostWallGap: hostGapTreatment, areaPdf: round(area, 2), detectorPredicate },
        confidence: "candidate",
        semantic_status: "candidate_unaccepted",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        reviewRequired: true
      };
    }).filter(Boolean);
    candidates.diagnostics = {
      schema: "laibe.planPuzzle.pdfSpaceDetectorDiagnostics.v1",
      topologyCount: diagnostics.length,
      acceptedCount: candidates.length,
      rows: diagnostics
    };
    return candidates;
  }

  function boxContainsBox(container, candidate, padding) {
    if (!finiteBox(container) || !finiteBox(candidate)) return false;
    const value = Math.max(0, Number(padding) || 0);
    return candidate.x0 >= container.x0 - value &&
      candidate.y0 >= container.y0 - value &&
      candidate.x1 <= container.x1 + value &&
      candidate.y1 <= container.y1 + value;
  }

  function smallestContainingSpace(box, spaceBoundaryCandidates) {
    const center = centerOfBox(box);
    return (spaceBoundaryCandidates || [])
      .filter((space) => pointInBox(center, space && space.pageBox))
      .sort((first, second) => boxArea(first.pageBox) - boxArea(second.pageBox) || String(first.id || "").localeCompare(String(second.id || "")))[0] || null;
  }

  function bathroomFixtureCandidate(subtype, box, members, sourceSpace, motifEvidence, index) {
    const curvedPaths = members.filter((entry) => entry.path.hasCurve);
    const closedPaths = members.filter((entry) => entry.path.closed);
    const detectorPredicate = semanticDetectorPredicates.bathroomFixture({
      recognizedGeometryMotif: true,
      clusterPathCount: members.length,
      curvedPathCount: curvedPaths.length,
      closedPathCount: closedPaths.length,
      sourceSpaceId: sourceSpace && sourceSpace.id
    });
    if (!detectorPredicate.pass) return null;
    return {
      id: "pdf-bathroom-fixture-" + subtype + "-" + String(index + 1).padStart(4, "0"),
      category: "bathroom_fixture",
      subtype,
      coordinateFrame: "page-bottom-left-pdf-pt",
      bbox: box,
      pageBox: box,
      evidence: {
        geometrySource: "vector_path_motif",
        recognizedGeometryMotif: true,
        clusterPathCount: members.length,
        curvedPathCount: curvedPaths.length,
        closedPathCount: closedPaths.length,
        sourcePathIndexes: members.map((entry) => entry.index).sort((a, b) => a - b),
        sourceSpaceId: sourceSpace.id,
        sourceSpaceBox: sourceSpace.pageBox,
        motif: motifEvidence,
        detectorPredicate
      },
      confidence: "candidate",
      semantic_status: "candidate_unaccepted",
      human_confirmation_required: true,
      mapping_state: "not_accepted",
      editable_object_id: null,
      acceptedTransformId: null,
      reviewRequired: true
    };
  }

  function detectBathroomFixtureCandidates(paths, spaceBoundaryCandidates) {
    const indexedStrokePaths = (paths || []).map((path, index) => ({ path, index }))
      .filter((entry) => entry.path && isStrokePaint(entry.path.paint) && finiteBox(entry.path.pageBox) && Number(entry.path.lineWidthPdf) <= 1.2);
    const candidates = [];
    const diagnostics = [];

    indexedStrokePaths.filter((entry) => {
      const path = entry.path;
      const box = path.pageBox;
      return path.closed && path.segments.length === 4 &&
        box.width >= 20 && box.width <= 60 && box.height >= 18 && box.height <= 60 &&
        box.width / Math.max(0.001, box.height) >= 0.65 && box.width / Math.max(0.001, box.height) <= 1.6;
    }).forEach((seed) => {
      const box = seed.path.pageBox;
      const members = indexedStrokePaths.filter((entry) => boxContainsBox(box, entry.path.pageBox, 1));
      const curvedPathCount = members.filter((entry) => entry.path.hasCurve).length;
      const closedPathCount = members.filter((entry) => entry.path.closed).length;
      const sourceSpace = smallestContainingSpace(box, spaceBoundaryCandidates);
      const pass = members.length >= 20 && curvedPathCount >= 4 && closedPathCount >= 3 && Boolean(sourceSpace);
      diagnostics.push({ subtype: "washbasin", seedPathIndex: seed.index, bbox: box, clusterPathCount: members.length, curvedPathCount, closedPathCount, sourceSpaceId: sourceSpace && sourceSpace.id || null, pass });
      if (!pass) return;
      const candidate = bathroomFixtureCandidate("washbasin", box, members, sourceSpace, {
        name: "rectangular_basin_with_curved_interior",
        seedPathIndex: seed.index,
        outerClosedRectangle: true
      }, candidates.length);
      if (candidate) candidates.push(candidate);
    });

    const symmetricCurves = indexedStrokePaths.filter((entry) => {
      const path = entry.path;
      const box = path.pageBox;
      return path.hasCurve && box.width >= 3 && box.width <= 14 && box.height >= 8 && box.height <= 25;
    });
    for (let firstIndex = 0; firstIndex < symmetricCurves.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < symmetricCurves.length; secondIndex += 1) {
        const first = symmetricCurves[firstIndex];
        const second = symmetricCurves[secondIndex];
        const firstBox = first.path.pageBox;
        const secondBox = second.path.pageBox;
        if (Math.abs(firstBox.y0 - secondBox.y0) > 1 || Math.abs(firstBox.y1 - secondBox.y1) > 1 ||
          Math.abs(firstBox.width - secondBox.width) > 1.5 || Math.abs(firstBox.height - secondBox.height) > 1.5) continue;
        const gap = Math.max(firstBox.x0, secondBox.x0) - Math.min(firstBox.x1, secondBox.x1);
        if (gap < 1 || gap > 20) continue;
        const box = {
          x0: round(Math.min(firstBox.x0, secondBox.x0) - 3, 2),
          y0: round(Math.min(firstBox.y0, secondBox.y0) - 20, 2),
          x1: round(Math.max(firstBox.x1, secondBox.x1) + 3, 2),
          y1: round(Math.max(firstBox.y1, secondBox.y1) + 3, 2)
        };
        box.width = round(box.x1 - box.x0, 2);
        box.height = round(box.y1 - box.y0, 2);
        const members = indexedStrokePaths.filter((entry) => boxContainsBox(box, entry.path.pageBox, 0.5));
        const curvedPathCount = members.filter((entry) => entry.path.hasCurve).length;
        const closedPathCount = members.filter((entry) => entry.path.closed).length;
        const sourceSpace = smallestContainingSpace(box, spaceBoundaryCandidates);
        const pass = members.length >= 20 && curvedPathCount >= 4 && closedPathCount >= 3 && Boolean(sourceSpace);
        diagnostics.push({ subtype: "toilet", seedPathIndexes: [first.index, second.index], bbox: box, symmetricCurveGap: round(gap, 3), clusterPathCount: members.length, curvedPathCount, closedPathCount, sourceSpaceId: sourceSpace && sourceSpace.id || null, pass });
        if (!pass) continue;
        const candidate = bathroomFixtureCandidate("toilet", box, members, sourceSpace, {
          name: "paired_symmetric_bowl_curves_with_base",
          symmetricCurvePathIndexes: [first.index, second.index],
          symmetricCurveGap: round(gap, 3)
        }, candidates.length);
        if (candidate) candidates.push(candidate);
      }
    }

    const deduped = [];
    candidates.sort((first, second) => first.pageBox.y0 - second.pageBox.y0 || first.pageBox.x0 - second.pageBox.x0 || first.subtype.localeCompare(second.subtype)).forEach((candidate) => {
      const duplicate = deduped.some((existing) => existing.subtype === candidate.subtype && overlapArea(existing.pageBox, candidate.pageBox) / Math.max(0.001, Math.min(boxArea(existing.pageBox), boxArea(candidate.pageBox))) >= 0.72);
      if (!duplicate) deduped.push(candidate);
    });
    deduped.diagnostics = {
      schema: "laibe.planPuzzle.pdfBathroomFixtureDetectorDiagnostics.v1",
      candidateCount: deduped.length,
      rows: diagnostics
    };
    return deduped;
  }

  function detectFixedCabinetCandidates(input) {
    const source = input || {};
    const rects = (source.rects || []).filter((rect) => rect && finiteBox(rect.pageBox));
    const lines = (source.lines || []).filter((line) => line && line.orientation !== "diagonal" && pageLineBox(line));
    const walls = (source.walls || []).filter(Boolean);
    const bathroomFixtures = (source.bathroomFixtureCandidates || []).filter((item) => finiteBox(item && item.pageBox));
    const wallThicknessPx = Math.max(1, Number(source.wallThicknessPx) || 1);
    const hostWallBoxes = walls.map((wall) => {
      const thickness = Math.max(Number(wall.lineWidthPdf) || 0, Number(wall.width) || 0);
      if (!wall.fromFilledWall && thickness < Math.max(3, wallThicknessPx * 0.45)) return null;
      const box = pageLineBox(wall, Math.max(1, thickness / 2));
      return box ? { id: wall.id || null, box, source: "wall_candidate" } : null;
    }).filter(Boolean).concat(rects.filter((rect) =>
      isFilledPaint(rect.paint) &&
      Math.max(Number(rect.pageBox.width) || 0, Number(rect.pageBox.height) || 0) /
        Math.max(0.001, Math.min(Number(rect.pageBox.width) || 0, Number(rect.pageBox.height) || 0)) >= 2.5
    ).map((rect) => ({
      id: rect.id || null,
      box: rect.pageBox,
      source: "filled_wall_body"
    })));
    const cabinetRects = rects.filter((rect) => {
      if (isFilledPaint(rect.paint)) return false;
      const width = Math.max(Number(rect.pageBox.width) || 0, Number(rect.pageBox.height) || 0);
      const depth = Math.min(Number(rect.pageBox.width) || 0, Number(rect.pageBox.height) || 0);
      return width >= 48 && width <= 240 && depth >= 16 && depth <= 48 &&
        width / Math.max(0.001, depth) >= 2.2;
    }).sort((first, second) =>
      boxArea(second.pageBox) - boxArea(first.pageBox) ||
      first.pageBox.y0 - second.pageBox.y0 ||
      first.pageBox.x0 - second.pageBox.x0
    );
    const diagnostics = [];
    const candidates = [];
    cabinetRects.forEach((seed) => {
      const box = seed.pageBox;
      const containedByLargerCabinet = cabinetRects.some((other) =>
        other !== seed &&
        boxArea(other.pageBox) > boxArea(box) &&
        boxContainsBox(other.pageBox, box, 1)
      );
      if (containedByLargerCabinet) return;
      const nestedRects = cabinetRects.filter((rect) => boxContainsBox(box, rect.pageBox, 1));
      const horizontal = Number(box.width) >= Number(box.height);
      const parallelLines = lines.filter((line) => {
        if (line.orientation !== (horizontal ? "horizontal" : "vertical")) return false;
        const lineBox = pageLineBox(line, 0.5);
        if (!lineBox || !boxContainsBox(expandBox(box, 1), lineBox, 1)) return false;
        return Number(line.lengthPdf) >= Math.max(12, Math.max(box.width, box.height) * 0.45);
      });
      const hostWall = hostWallBoxes
        .map((entry) => ({ ...entry, distance: boxDistance(entry.box, box) }))
        .filter((entry) => entry.distance <= Math.max(4, wallThicknessPx))
        .sort((first, second) => first.distance - second.distance || String(first.id || "").localeCompare(String(second.id || "")))[0] || null;
      const bathroomOverlap = bathroomFixtures.some((fixture) =>
        overlapArea(box, fixture.pageBox) / Math.max(0.001, Math.min(boxArea(box), boxArea(fixture.pageBox))) >= 0.12
      );
      const widthPt = Math.max(Number(box.width) || 0, Number(box.height) || 0);
      const depthPt = Math.min(Number(box.width) || 0, Number(box.height) || 0);
      const detectorPredicate = semanticDetectorPredicates.fixedCabinet({
        parallelEdgeCount: parallelLines.length,
        closedRectCount: nestedRects.length,
        widthPt,
        depthPt,
        hostWallContact: Boolean(hostWall),
        bathroomOverlap
      });
      diagnostics.push({
        bbox: box,
        parallelEdgeCount: parallelLines.length,
        closedRectCount: nestedRects.length,
        hostWallId: hostWall && hostWall.id || null,
        bathroomOverlap,
        pass: detectorPredicate.pass
      });
      if (!detectorPredicate.pass) return;
      candidates.push({
        id: "pdf-fixed-cabinet-" + String(candidates.length + 1).padStart(4, "0"),
        category: "fixed_cabinet",
        subtype: "wall_fixed_cabinet",
        coordinateFrame: "page-bottom-left-pdf-pt",
        bbox: box,
        pageBox: box,
        evidence: {
          geometrySource: "closed_rectangles_parallel_edges_wall_contact",
          sourceRectIds: nestedRects.map((rect) => rect.id).filter(Boolean).sort(),
          sourceLineIds: parallelLines.map((line) => line.id).filter(Boolean).sort(),
          parallelEdgeCount: parallelLines.length,
          closedRectCount: nestedRects.length,
          widthPt: round(widthPt, 2),
          depthPt: round(depthPt, 2),
          hostWallContact: true,
          hostWallId: hostWall && hostWall.id || null,
          hostWallEvidenceSource: hostWall && hostWall.source || null,
          bathroomOverlap: false,
          detectorPredicate
        },
        confidence: "candidate",
        semantic_status: "candidate_unaccepted",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        reviewRequired: true
      });
    });
    const deduped = dedupeSemanticCandidates(candidates);
    Object.defineProperty(deduped, "diagnostics", {
      configurable: true,
      enumerable: false,
      value: {
        schema: "laibe.planPuzzle.pdfFixedCabinetDetectorDiagnostics.v1",
        candidateCount: deduped.length,
        inputRectangleCount: rects.length,
        evaluatedCabinetRectangleCount: cabinetRects.length,
        coverageBounds: source.coverageBounds || null,
        status: deduped.length
          ? "matching_fixed_cabinet_motif_found"
          : "no_matching_fixed_cabinet_motif",
        rows: diagnostics
      }
    });
    return deduped;
  }

  function detectUnresolvedCrossedFrameCandidates(
    lines,
    _rects,
    bathroomFixtureCandidates,
    spaceBoundaryCandidates
  ) {
    const bathroomSpaceIds = new Set(
      (bathroomFixtureCandidates || [])
        .map((fixture) => fixture && fixture.evidence && fixture.evidence.sourceSpaceId)
        .filter(Boolean)
    );
    const bathroomSpaceBoxes = (spaceBoundaryCandidates || [])
      .filter((space) => bathroomSpaceIds.has(space && space.id) && finiteBox(space && space.pageBox))
      .map((space) => space.pageBox);
    const nearBathroom = (box, padding = 42) => bathroomSpaceBoxes.some((spaceBox) =>
      pointInBox(centerOfBox(box), expandBox(spaceBox, padding))
    );
    const diagonalLines = (lines || []).filter((line) => {
      const box = pageLineBox(line);
      if (!line || line.orientation !== "diagonal" || !box || !nearBathroom(box, 50)) {
        return false;
      }
      const endpoints = stairLineEndpoints(line);
      if (endpoints.length !== 2) return false;
      const xSpan = Math.abs(endpoints[1].x - endpoints[0].x);
      const ySpan = Math.abs(endpoints[1].y - endpoints[0].y);
      const length = Math.hypot(xSpan, ySpan);
      return xSpan >= 4 && ySpan >= 4 && length >= 7 && length <= 90;
    });
    const axisLines = (lines || []).filter((line) =>
      line && (line.orientation === "horizontal" || line.orientation === "vertical") &&
      pageLineBox(line)
    );
    const diagonalSlopeSign = (line) => {
      const endpoints = stairLineEndpoints(line);
      if (endpoints.length !== 2) return 0;
      return Math.sign(
        (endpoints[1].x - endpoints[0].x) *
        (endpoints[1].y - endpoints[0].y)
      );
    };
    const crossProduct = (first, second, third) =>
      (Number(second.x) - Number(first.x)) * (Number(third.y) - Number(first.y)) -
      (Number(second.y) - Number(first.y)) * (Number(third.x) - Number(first.x));
    const diagonalsCross = (first, second) => {
      const firstPoints = stairLineEndpoints(first);
      const secondPoints = stairLineEndpoints(second);
      if (firstPoints.length !== 2 || secondPoints.length !== 2) return false;
      const firstSideA = crossProduct(firstPoints[0], firstPoints[1], secondPoints[0]);
      const firstSideB = crossProduct(firstPoints[0], firstPoints[1], secondPoints[1]);
      const secondSideA = crossProduct(secondPoints[0], secondPoints[1], firstPoints[0]);
      const secondSideB = crossProduct(secondPoints[0], secondPoints[1], firstPoints[1]);
      const tolerance = 0.05;
      return firstSideA * firstSideB <= tolerance && secondSideA * secondSideB <= tolerance;
    };
    const axisCoverageForBox = (box) => {
      const tolerance = Math.max(1.5, Math.min(box.width, box.height) * 0.2);
      const sideLines = { left: [], right: [], bottom: [], top: [] };
      axisLines.forEach((line) => {
        const axis = lineAxisRange(line);
        if (!axis) return;
        if (axis.orientation === "vertical") {
          const overlap = Math.max(0, Math.min(axis.main1, box.y1) - Math.max(axis.main0, box.y0));
          if (overlap < box.height * 0.45) return;
          if (Math.abs(axis.perp - box.x0) <= tolerance) sideLines.left.push(line);
          if (Math.abs(axis.perp - box.x1) <= tolerance) sideLines.right.push(line);
          return;
        }
        const overlap = Math.max(0, Math.min(axis.main1, box.x1) - Math.max(axis.main0, box.x0));
        if (overlap < box.width * 0.45) return;
        if (Math.abs(axis.perp - box.y0) <= tolerance) sideLines.bottom.push(line);
        if (Math.abs(axis.perp - box.y1) <= tolerance) sideLines.top.push(line);
      });
      const coveredSides = Object.keys(sideLines).filter((side) => sideLines[side].length > 0);
      return {
        tolerance,
        sideLines,
        coveredSides,
        sourceLineIds: uniqueStairLines(
          coveredSides.flatMap((side) => sideLines[side])
        ).map((line) => line.id).filter(Boolean)
      };
    };
    const frameSeeds = [];
    for (let firstIndex = 0; firstIndex < diagonalLines.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < diagonalLines.length; secondIndex += 1) {
        const first = diagonalLines[firstIndex];
        const second = diagonalLines[secondIndex];
        if (!diagonalSlopeSign(first) ||
          diagonalSlopeSign(first) === diagonalSlopeSign(second) ||
          !diagonalsCross(first, second)) continue;
        const box = unionBoxes(pageLineBox(first), pageLineBox(second));
        const shortSide = Math.min(box.width, box.height);
        const longSide = Math.max(box.width, box.height);
        if (shortSide < 5 || shortSide > 55 || longSide > 90 ||
          longSide / Math.max(0.001, shortSide) > 4 ||
          !nearBathroom(box)) continue;
        const firstBox = pageLineBox(first);
        const secondBox = pageLineBox(second);
        const spansFrame = [firstBox, secondBox].every((lineBox) =>
          lineBox.width >= box.width * 0.52 && lineBox.height >= box.height * 0.52
        );
        if (!spansFrame) continue;
        frameSeeds.push({
          box,
          diagonalLines: [first, second],
          axisCoverage: axisCoverageForBox(box)
        });
      }
    }
    const frameDiagnostics = [];
    const candidates = frameSeeds.map((seed, seedIndex) => {
      const box = seed.box;
      const crossingLines = seed.diagonalLines;
      const slopeSigns = new Set(crossingLines.map(diagonalSlopeSign).filter(Boolean));
      const coveredSides = seed.axisCoverage.coveredSides;
      frameDiagnostics.push({
        bbox: box,
        diagonalLineIds: crossingLines.map((line) => line.id).filter(Boolean).sort(),
        frameLineIds: seed.axisCoverage.sourceLineIds,
        opposingDiagonalCount: crossingLines.length,
        opposingSlopeSignCount: slopeSigns.size,
        coveredSides,
        pass: crossingLines.length >= 2 && slopeSigns.size >= 2 &&
          coveredSides.length === 4
      });
      if (crossingLines.length < 2 || slopeSigns.size < 2 ||
        coveredSides.length !== 4) return null;
      const bathroomOverlap = (bathroomFixtureCandidates || []).some((fixture) =>
        overlapArea(box, fixture.pageBox) /
          Math.max(0.001, Math.min(boxArea(box), boxArea(fixture.pageBox))) >= 0.2
      );
      if (bathroomOverlap) return null;
      const sourceSpace = bathroomSpaceBoxes
        .map((spaceBox) => ({ spaceBox, distance: boxDistance(spaceBox, box) }))
        .sort((first, second) => first.distance - second.distance)[0] || null;
      return {
        id: "pdf-unresolved-crossed-frame-" + String(seedIndex + 1).padStart(4, "0"),
        category: "unresolved_symbol",
        subtype: "crossed_frame_near_bathroom",
        coordinateFrame: "page-bottom-left-pdf-pt",
        bbox: box,
        pageBox: box,
        evidence: {
          geometrySource: "closed_frame_with_opposing_diagonal_operator_lines",
          closedFrame: true,
          diagonalLineIds: crossingLines.map((line) => line.id).filter(Boolean).sort(),
          frameLineIds: seed.axisCoverage.sourceLineIds,
          coveredFrameSides: coveredSides,
          opposingDiagonalCount: crossingLines.length,
          opposingSlopeSigns: Array.from(slopeSigns).sort(),
          nearestBathroomSpaceBox: sourceSpace && sourceSpace.spaceBox || null,
          nearestBathroomSpaceDistancePt: sourceSpace
            ? round(sourceSpace.distance, 3)
            : null,
          fixedCabinetMotifMatch: false,
          classification: "unresolved_requires_human_review",
          detectorPredicate: {
            schema: "laibe.planPuzzle.pdfSemanticDetectorPredicate.v1",
            name: "unresolvedSymbol",
            rules: {
              closedFrame: true,
              opposingDiagonals: true,
              nearBathroomSpace: Boolean(sourceSpace)
            },
            failedRules: [],
            pass: true
          }
        },
        confidence: "unresolved",
        semantic_status: "unresolved_source_geometry",
        human_confirmation_required: true,
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null,
        reviewRequired: true
      };
    }).filter(Boolean);
    const deduped = dedupeSemanticCandidates(candidates);
    deduped.diagnostics = {
      schema: "laibe.planPuzzle.pdfUnresolvedSymbolDetectorDiagnostics.v1",
      evaluatedFrameCount: frameSeeds.length,
      crossedFrameCount: deduped.length,
      bathroomSpaceBounds: bathroomSpaceBoxes,
      frameRows: frameDiagnostics,
      rows: deduped.map((candidate) => ({
        id: candidate.id,
        subtype: candidate.subtype,
        bbox: candidate.pageBox,
        classification: candidate.evidence.classification
      }))
    };
    return deduped;
  }

  function dedupeSemanticCandidates(candidates) {
    const byKey = new Map();
    (candidates || []).forEach((candidate) => {
      const box = candidate && candidate.pageBox;
      if (!candidate || !box) return;
      const key = [candidate.category, quantize((box.x0 + box.x1) / 2, 1), quantize((box.y0 + box.y1) / 2, 1), quantize(box.width, 1), quantize(box.height, 1)].join(":");
      if (!byKey.has(key)) byKey.set(key, candidate);
    });
    return Array.from(byKey.values()).sort((a, b) => (a.category.localeCompare(b.category)) || (a.pageBox.y0 - b.pageBox.y0) || (a.pageBox.x0 - b.pageBox.x0));
  }

  function semanticCandidateDiagnosticRows(candidates) {
    return (candidates || []).map((candidate) => {
      const evidence = candidate && candidate.evidence || {};
      return {
        id: candidate && candidate.id || null,
        category: candidate && candidate.category || null,
        subtype: candidate && candidate.subtype || null,
        bbox: candidate && candidate.pageBox || null,
        hostWallGap: evidence.hostWallGap || null,
        arcBox: evidence.curvedArc && evidence.curvedArc.bbox || null,
        leafLengthPdf: Number(evidence.leaf && evidence.leaf.lengthPdf || 0),
        hingeDistancePdf: Number(evidence.hinge && evidence.hinge.distanceToArcPdf || 0),
        lineLengthsPdf: evidence.lineLengthsPdf || null,
        separationPdf: Number(evidence.separationPdf || 0),
        overlapRatio: Number(evidence.overlapRatio || 0),
        parallelNeighborCount: Number(evidence.parallelNeighborCount || 0),
        treadCount: Number(evidence.treadCount || 0),
        spacingPdf: Number(evidence.spacingPdf || 0),
        boundarySegmentCount: Number(evidence.boundarySegmentCount || 0),
        hostWallContactCount: Number(evidence.hostWallContactCount || 0),
        relatedStairId: evidence.relatedStairId || null,
        detectorPass: Boolean(evidence.detectorPredicate && evidence.detectorPredicate.pass)
      };
    });
  }

  function detectSemanticCandidates(paths, lines, walls, rects, pageSize, wallThicknessPx, supportBounds) {
    const openingCandidates = detectDoorCandidates(paths, lines, walls, wallThicknessPx)
      .concat(detectWindowCandidates(lines, walls, wallThicknessPx))
      .concat(detectWindowGapFrameCandidates(lines, walls, wallThicknessPx));
    const stairCandidates = detectStairCandidates(lines, walls, rects, wallThicknessPx);
    const stairVoidCandidates = detectStairVoidCandidates(stairCandidates, paths, lines, walls, rects);
    const detectedSpaceBoundaryCandidates = detectSpaceBoundaryCandidates(paths, walls, openingCandidates, pageSize, rects);
    const spaceBoundaryCandidates = dedupeSemanticCandidates(detectedSpaceBoundaryCandidates);
    spaceBoundaryCandidates.diagnostics = detectedSpaceBoundaryCandidates.diagnostics || null;
    const detectedBathroomFixtureCandidates = detectBathroomFixtureCandidates(paths, spaceBoundaryCandidates);
    const bathroomFixtureCandidates = dedupeSemanticCandidates(detectedBathroomFixtureCandidates);
    bathroomFixtureCandidates.diagnostics = detectedBathroomFixtureCandidates.diagnostics || null;
    const detectedFixedCabinetCandidates = detectFixedCabinetCandidates({
      rects,
      lines,
      walls,
      bathroomFixtureCandidates,
      wallThicknessPx,
      coverageBounds: supportBounds
    });
    const fixedCabinetCandidates = dedupeSemanticCandidates(detectedFixedCabinetCandidates);
    fixedCabinetCandidates.diagnostics = detectedFixedCabinetCandidates.diagnostics || null;
    const detectedUnresolvedSymbolCandidates = detectUnresolvedCrossedFrameCandidates(
      lines,
      rects,
      bathroomFixtureCandidates,
      spaceBoundaryCandidates
    );
    const unresolvedSymbolCandidates = dedupeSemanticCandidates(
      detectedUnresolvedSymbolCandidates
    );
    unresolvedSymbolCandidates.diagnostics =
      detectedUnresolvedSymbolCandidates.diagnostics || null;
    const insideSupport = (candidate) => !supportBounds || pointInBox(centerOfBox(candidate && candidate.pageBox), expandBox(supportBounds, 18));
    const supportedBathroomFixtures = bathroomFixtureCandidates.filter(insideSupport);
    const supportedFixedCabinets = fixedCabinetCandidates.filter(insideSupport);
    const supportedUnresolvedSymbols = unresolvedSymbolCandidates.filter(insideSupport);
    const visibleSymbolRows = []
      .concat(supportedBathroomFixtures.map((candidate) => ({
        sourceCandidateId: candidate.id,
        subtype: candidate.subtype,
        bbox: candidate.pageBox,
        disposition: "bathroom_fixture_excluded"
      })))
      .concat(supportedFixedCabinets.map((candidate) => ({
        sourceCandidateId: candidate.id,
        subtype: candidate.subtype,
        bbox: candidate.pageBox,
        disposition: "fixed_cabinet_excluded"
      })))
      .concat(supportedUnresolvedSymbols.map((candidate) => ({
        sourceCandidateId: candidate.id,
        subtype: candidate.subtype,
        bbox: candidate.pageBox,
        disposition: "unresolved_important"
      })));
    return {
      openingCandidates: dedupeSemanticCandidates(openingCandidates.filter(insideSupport)),
      stairCandidates: stairCandidates.filter(insideSupport),
      stairVoidCandidates: stairVoidCandidates.filter(insideSupport),
      spaceBoundaryCandidates: spaceBoundaryCandidates.filter(insideSupport),
      bathroomFixtureCandidates: supportedBathroomFixtures,
      fixedCabinetCandidates: supportedFixedCabinets,
      unresolvedSymbolCandidates: supportedUnresolvedSymbols,
      classificationCoverage: {
        schema: "laibe.planPuzzle.pdfVisibleSymbolClassificationCoverage.v1",
        coverageBounds: supportBounds || null,
        visibleSymbolRows,
        fixedCabinetEvaluation: {
          status: supportedFixedCabinets.length
            ? "matching_fixed_cabinet_motif_found"
            : "no_matching_fixed_cabinet_motif",
          coverageBounds: supportBounds || null,
          evaluatedRectangleCount:
            Number(fixedCabinetCandidates.diagnostics &&
              fixedCabinetCandidates.diagnostics.evaluatedCabinetRectangleCount) || 0,
          detectorRule:
            "closed_long_rectangle_parallel_edges_wall_contact_without_bathroom_overlap"
        }
      },
      diagnostics: {
        stair: stairCandidates.diagnostics || null,
        space: spaceBoundaryCandidates.diagnostics || null,
        bathroomFixture: bathroomFixtureCandidates.diagnostics || null,
        fixedCabinet: fixedCabinetCandidates.diagnostics || null,
        unresolvedSymbol: unresolvedSymbolCandidates.diagnostics || null,
        candidateRows: {
          openings: semanticCandidateDiagnosticRows(openingCandidates.filter(insideSupport)),
          stairs: semanticCandidateDiagnosticRows(stairCandidates.filter(insideSupport)),
          stairVoids: semanticCandidateDiagnosticRows(stairVoidCandidates.filter(insideSupport)),
          spaces: semanticCandidateDiagnosticRows(spaceBoundaryCandidates.filter(insideSupport)),
          bathroomFixtures: semanticCandidateDiagnosticRows(bathroomFixtureCandidates.filter(insideSupport)),
          fixedCabinets: semanticCandidateDiagnosticRows(fixedCabinetCandidates.filter(insideSupport)),
          unresolvedSymbols: semanticCandidateDiagnosticRows(
            unresolvedSymbolCandidates.filter(insideSupport)
          )
        }
      }
    };
  }

  function extractFromOperatorList(operatorList, options) {
    const pdfjsLib = options && options.pdfjsLib;
    const ops = getOps(pdfjsLib);
    const drawOps = getDrawOps(pdfjsLib);
    const viewport = (options && options.viewport) || {};
    const viewportMatrix = cloneMatrix(viewport.transform || IDENTITY);
    const transformHelpers = createTransformHelpers(viewportMatrix);
    const pageSize = {
      width: Number(options && options.pageWidth) || Number(viewport.width) || 0,
      height: Number(options && options.pageHeight) || Number(viewport.height) || 0
    };
    const viewportSize = {
      width: Number(viewport.width) || 0,
      height: Number(viewport.height) || 0
    };
    const fnArray = operatorList && operatorList.fnArray ? operatorList.fnArray : [];
    const argsArray = operatorList && operatorList.argsArray ? operatorList.argsArray : [];
    const stack = [];
    const state = {
      matrix: IDENTITY.slice(),
      lineWidth: 1
    };
    const paths = [];
    let pendingPath = null;

    function flushPendingPath(paintOp) {
      if (!pendingPath) {
        return;
      }
      const kind = paintKind(paintOp, ops);
      if (kind !== "unknown") {
        paths.push({
          paint: kind,
          paintOp,
          lineWidthPdf: pendingPath.lineWidthPdf,
          lineWidthDevice: pendingPath.lineWidthDevice,
          segments: pendingPath.segments,
          hasCurve: pendingPath.hasCurve,
          closed: pendingPath.closed,
          pageBox: pendingPath.pageBox,
          canvasBox: pendingPath.canvasBox
        });
      }
      pendingPath = null;
    }

    for (let index = 0; index < fnArray.length; index += 1) {
      const fn = fnArray[index];
      const args = argsArray[index] || [];
      if (fn === ops.save) {
        stack.push({ matrix: cloneMatrix(state.matrix), lineWidth: state.lineWidth });
      } else if (fn === ops.restore) {
        const restored = stack.pop();
        if (restored) {
          state.matrix = restored.matrix;
          state.lineWidth = restored.lineWidth;
        }
      } else if (fn === ops.transform) {
        state.matrix = multiplyMatrix(state.matrix, args);
      } else if (fn === ops.setLineWidth) {
        state.lineWidth = Number(args[0]) || 0;
      } else if (fn === ops.constructPath) {
        const lineWidthPdf = Number(state.lineWidth) || 0;
        const lineWidthPx = deviceLineWidth(lineWidthPdf, state.matrix, viewportMatrix);
        const legacyPaintKind = paintKind(args[0], ops);
        if (legacyPaintKind !== "unknown") {
          const bbox = transformBBox(args[2], state.matrix, viewportMatrix);
          const path = readPath(args[1], null, state.matrix, viewportMatrix, drawOps);
          paths.push({
            paint: legacyPaintKind,
            paintOp: args[0],
            lineWidthPdf,
            lineWidthDevice: round(lineWidthPx, 3),
            segments: path.segments,
            hasCurve: path.hasCurve,
            closed: path.closed,
            pageBox: bbox && bbox.page,
            canvasBox: bbox && bbox.canvas
          });
          pendingPath = null;
        } else {
          const bbox = transformBBox(args[2], state.matrix, viewportMatrix);
          const path = readPath(args[0], args[1], state.matrix, viewportMatrix, drawOps);
          if (!pendingPath) {
            pendingPath = createEmptyPath(lineWidthPdf, lineWidthPx);
          }
          appendPendingPath(pendingPath, path, bbox, lineWidthPdf, lineWidthPx);
        }
      } else if (paintKind(fn, ops) !== "unknown") {
        flushPendingPath(fn);
      }
    }

    const rawLines = [];
    paths.forEach((path) => {
      if (!isStrokePaint(path.paint)) {
        return;
      }
      path.segments.forEach((segment) => {
        if (segment.lengthPdf >= 4) {
          rawLines.push(normalizeLine(segment, path, rawLines.length));
        }
      });
    });
    const lines = dedupeLines(rawLines);
    const rects = dedupeRects(paths.map(createRectCandidate).filter(Boolean));
    const lineWidthFilter = options && options.disableLineWidthGrouping
      ? { lines, groups: { enabled: false, threshold: null, removedCount: 0, sampleCount: lines.length } }
      : applyLineWidthGrouping(lines);
    const hatchFilter = options && options.disableHatchSuppression
      ? { lines: lineWidthFilter.lines, removedCount: 0, groupCount: 0 }
      : suppressHatchLikeLines(lineWidthFilter.lines, pageSize);
    const textZoneFilter = options && options.disableTextZoneFiltering
      ? {
          lines: hatchFilter.lines,
          rects,
          suppressedLineCount: 0,
          suppressedRectCount: 0,
          textZoneCount: Array.isArray(options && options.textZones) ? options.textZones.length : 0
        }
      : suppressTextZoneGeometry(hatchFilter.lines, rects, options && options.textZones);
    const candidateLines = textZoneFilter.lines;
    const filteredRects = textZoneFilter.rects;
    const lineWallCandidatePool = candidateLines.map((line, index) => asWallCandidate(line, index, pageSize)).filter(Boolean);
    const wallThicknessPx = estimateWallThicknessPx(lineWallCandidatePool.length ? lineWallCandidatePool : candidateLines);
    const filledWallCandidatePool = options && options.disableFilledWallDetection
      ? []
      : filteredRects.map((rect, index) => createFilledWallCandidate(rect, index, wallThicknessPx, pageSize, viewportSize, transformHelpers)).filter(Boolean);
    const wallCandidatePool = dedupeWallCandidates(lineWallCandidatePool.concat(filledWallCandidatePool));
    const healingResult = options && options.disableWallHealing
      ? { walls: wallCandidatePool, healedEndpointCount: 0 }
      : healWallEndpoints(wallCandidatePool, wallThicknessPx, transformHelpers);
    const wallMergeResult = options && options.disableWallMerging
      ? { walls: healingResult.walls, mergedWallCount: 0 }
      : mergeRedundantWallCandidates(healingResult.walls, wallThicknessPx);
    const legacyColumnCandidatePool = filteredRects.map((rect, index) => asLegacyColumnCandidate(rect, index)).filter(Boolean);
    const filledColumnCandidatePool = filteredRects
      .map((rect, index) => createFilledColumnCandidate(rect, index, wallThicknessPx, wallMergeResult.walls, pageSize, viewportSize))
      .filter(Boolean);
    const columnCandidatePool = dedupeColumnCandidates(legacyColumnCandidatePool.concat(filledColumnCandidatePool), wallThicknessPx);
    const supportBounds = boundsFromLinesAndRects(wallMergeResult.walls, columnCandidatePool);
    const preStairWallCandidates = limitCandidates(
      wallMergeResult.walls
        .sort((a, b) => (b.lineWidthPdf - a.lineWidthPdf) || (b.lengthPdf - a.lengthPdf)),
      (options && options.maxWalls) || 240
    );
    const columnCandidates = limitCandidates(
      columnCandidatePool
        .sort((a, b) => {
          const confidenceScore = { high: 3, medium: 2, low: 1 };
          return (confidenceScore[b.confidence] - confidenceScore[a.confidence]) ||
            (b.lineWidthPdf - a.lineWidthPdf) ||
            (b.widthPdf * b.heightPdf - a.widthPdf * a.heightPdf);
        }),
      (options && options.maxColumns) || 80
    );
    const axisCandidates = enrichDimensionAxisEvidence(limitCandidates(
      candidateLines.map((line, index) => asAxisCandidate(line, index, pageSize, supportBounds)).filter(Boolean)
        .sort((a, b) => b.lengthPdf - a.lengthPdf),
      (options && options.maxAxisLines) || 80
    ), candidateLines, options && options.numericDimensionLabels);
    const outlinedVectorDimensionGlyphGroups = outlinedVectorDimensionGroups(paths, axisCandidates);
    const semanticCandidates = detectSemanticCandidates(paths, lines, wallMergeResult.walls, filteredRects, pageSize, wallThicknessPx, supportBounds);
    const stairTreadWallFilter = options && options.disableStairTreadWallFilter
      ? { walls: preStairWallCandidates, removedTreadWallCount: 0, removedTreadWallIds: [] }
      : filterStairTreadWallCandidates(preStairWallCandidates, semanticCandidates.stairCandidates, semanticCandidates.openingCandidates, wallThicknessPx);
    const wallCandidates = stairTreadWallFilter.walls;
    const outerWallCandidateCount = wallCandidates.filter((item) => item.type === "outer_or_structural_wall").length;
    const innerWallCandidateCount = wallCandidates.filter((item) => item.type === "inner_or_partition_wall").length;

    return {
      status: "candidate_review_required",
      extractorVersion: "0.7.0-r9-wall-merge-stair-tread-filter-20260721",
      source: "pdf-vector-operator-list",
      sourceFileName: (options && options.sourceFileName) || "",
      pageNumber: Number(options && options.pageNumber) || 1,
      page: {
        width: round(pageSize.width, 2),
        height: round(pageSize.height, 2),
        viewportWidth: round(viewport.width || 0, 2),
        viewportHeight: round(viewport.height || 0, 2)
      },
      summary: {
        rawPathCount: paths.length,
        rawSegmentCount: rawLines.length,
        lineCandidateCount: lines.length,
        filteredLineCandidateCount: candidateLines.length,
        lineWidthFilteredCount: lineWidthFilter.groups.removedCount || 0,
        lineWidthGroupingApplied: !!lineWidthFilter.groups.enabled,
        hatchSuppressedLineCount: hatchFilter.removedCount,
        hatchSuppressedGroupCount: hatchFilter.groupCount,
        rawRectCount: rects.length,
        textZoneCount: textZoneFilter.textZoneCount || 0,
        textZoneSuppressedLineCount: textZoneFilter.suppressedLineCount || 0,
        textZoneSuppressedRectCount: textZoneFilter.suppressedRectCount || 0,
        textZoneSuppressedCount: (textZoneFilter.suppressedLineCount || 0) + (textZoneFilter.suppressedRectCount || 0),
        wallCandidateCount: wallCandidates.length,
        outerWallCandidateCount,
        innerWallCandidateCount,
        filledWallCandidateCount: filledWallCandidatePool.length,
        columnCandidateCount: columnCandidates.length,
        filledColumnCandidateCount: filledColumnCandidatePool.length,
        axisLineCandidateCount: axisCandidates.length,
        numericDimensionLabelCount: Array.isArray(options && options.numericDimensionLabels) ? options.numericDimensionLabels.length : 0,
        floorSemanticGlyphCandidateCount: Array.isArray(options && options.floorSemanticGlyphCandidates) ? options.floorSemanticGlyphCandidates.length : 0,
        openingCandidateCount: semanticCandidates.openingCandidates.length,
        doorCandidateCount: semanticCandidates.openingCandidates.filter((item) => item.subtype === "hinged_door").length,
        windowCandidateCount: semanticCandidates.openingCandidates.filter((item) => item.subtype === "window").length,
        stairCandidateCount: semanticCandidates.stairCandidates.length,
        stairVoidCandidateCount: semanticCandidates.stairVoidCandidates.length,
        spaceBoundaryCandidateCount: semanticCandidates.spaceBoundaryCandidates.length,
        bathroomFixtureCandidateCount: semanticCandidates.bathroomFixtureCandidates.length,
        fixedCabinetCandidateCount: semanticCandidates.fixedCabinetCandidates.length,
        unresolvedSymbolCandidateCount: semanticCandidates.unresolvedSymbolCandidates.length,
        estimatedWallThicknessPx: round(wallThicknessPx, 3),
        healedEndpointCount: healingResult.healedEndpointCount || 0,
        mergedWallCount: wallMergeResult.mergedWallCount || 0,
        removedStairTreadWallCount: stairTreadWallFilter.removedTreadWallCount || 0,
        ocgLayerCount: Number(options && options.optionalContentSummary && options.optionalContentSummary.layerCount) || 0,
        ocgSelectedLayerCount: Number(options && options.optionalContentSummary && options.optionalContentSummary.selectedLayerCount) || 0,
        reviewRequired: true
      },
      walls: wallCandidates,
      columns: columnCandidates,
      axisLines: axisCandidates,
      numericDimensionLabels: Array.isArray(options && options.numericDimensionLabels) ? options.numericDimensionLabels : [],
      floorSemanticGlyphCandidates: Array.isArray(options && options.floorSemanticGlyphCandidates) ? options.floorSemanticGlyphCandidates : [],
      floorSemanticGlyphDiagnostics: options && options.floorSemanticGlyphDiagnostics ? options.floorSemanticGlyphDiagnostics : null,
      openingCandidates: semanticCandidates.openingCandidates,
      stairCandidates: semanticCandidates.stairCandidates,
      stairVoidCandidates: semanticCandidates.stairVoidCandidates,
      spaceBoundaryCandidates: semanticCandidates.spaceBoundaryCandidates,
      bathroomFixtureCandidates: semanticCandidates.bathroomFixtureCandidates,
      fixedCabinetCandidates: semanticCandidates.fixedCabinetCandidates,
      unresolvedSymbolCandidates: semanticCandidates.unresolvedSymbolCandidates,
      semanticDetection: {
        schema: "laibe.planPuzzle.pdfSemanticGeometryDetection.v1",
        source: "vector-operator-list-geometry-relations",
        coordinateFrame: "page-bottom-left-pdf-pt",
        candidateOnly: true,
        humanConfirmationRequired: true,
        counts: {
          openings: semanticCandidates.openingCandidates.length,
          doors: semanticCandidates.openingCandidates.filter((item) => item.subtype === "hinged_door").length,
          windows: semanticCandidates.openingCandidates.filter((item) => item.subtype === "window").length,
          stairs: semanticCandidates.stairCandidates.length,
          stairVoids: semanticCandidates.stairVoidCandidates.length,
          spaces: semanticCandidates.spaceBoundaryCandidates.length,
          bathroomFixtures: semanticCandidates.bathroomFixtureCandidates.length,
          fixedCabinets: semanticCandidates.fixedCabinetCandidates.length,
          unresolvedSymbols: semanticCandidates.unresolvedSymbolCandidates.length
        },
        detectorRules: {
          door: "curve-plus-leaf-plus-hinge-plus-compatible-host-wall-gap",
          window: "parallel-line-span-plus-compatible-host-wall-gap",
          stair: "repeated-treads-plus-regular-spacing-plus-bounded-envelope-or-landing",
          stairVoid: "independent-closed-boundary-plus-stair-intersection-plus-host-contact",
          space: "closed-topology-plus-host-contact-plus-opening-treatment",
          bathroomFixture: "compact-curved-closed-vector-motif-contained-by-source-space",
          fixedCabinet: "closed-long-rectangle-plus-parallel-edges-plus-wall-contact-minus-bathroom-overlap",
          unresolvedSymbol: "closed-frame-plus-opposing-diagonals-near-bathroom-space"
        },
        detectorPredicateContract: semanticDetectorPredicateContract,
        diagnostics: semanticCandidates.diagnostics,
        candidateRows: semanticCandidates.diagnostics.candidateRows,
        classificationCoverage: semanticCandidates.classificationCoverage
      },
      dimensionEvidence: {
        schema: "laibe.planPuzzle.pdfDimensionEvidence.v1",
        source: "pdf-text-content-or-runtime-raster-decoder",
        labels: Array.isArray(options && options.numericDimensionLabels) ? options.numericDimensionLabels : [],
        axes: axisCandidates.map((axis) => ({
          id: axis.id,
          orientation: axis.orientation,
          pageFrom: axis.pageFrom,
          pageTo: axis.pageTo,
          axisSpanPt: axis.axisSpanPt,
          dimensionAxisEvidence: axis.dimensionAxisEvidence
        })),
        status: (Array.isArray(options && options.numericDimensionLabels) ? options.numericDimensionLabels.length : 0) > 0
          ? "numeric_labels_available_for_runtime_pairing"
          : "numeric_labels_not_available_from_pdf_text_layer",
        outlinedDigitDecoder: options && options.outlinedDigitDiagnostics
          ? options.outlinedDigitDiagnostics
          : null,
        vectorGlyphGroups: outlinedVectorDimensionGlyphGroups.map((group) => ({
          id: group.id,
          axisId: group.axisId,
          orientation: group.orientation,
          pageBox: group.pageBox,
          perpendicularDistanceToAxis: group.perpendicularDistanceToAxis,
          glyphCount: group.glyphs.length,
          pathIds: group.glyphs.flatMap((glyph) => glyph.pathIds).sort((left, right) => left - right)
        }))
      },
      outlinedVectorDimensionGlyphGroups,
      notes: [
        "PDF 向量候選需人工確認後才可採用。",
        "細長線可能包含尺寸線或標註線，不會自動視為牆面。",
        "衛浴設備圖元只建立來源候選，不會自動進入預算或正式物件。",
        "固定櫃體只建立排除候選，不會自動轉成可編輯物件。"
      ],
      createdAt: new Date().toISOString()
    };
  }

  async function extractFromPage(page, options) {
    if (!page || typeof page.getOperatorList !== "function") {
      throw new Error("PDF page is not readable.");
    }
    const scale = Number(options && options.scale) > 0 ? Number(options.scale) : 1;
    const pageNumber = positivePageNumber(options && options.pageNumber);
    const viewport = page.getViewport({ scale });
    const operatorList = await page.getOperatorList();
    let textZones = [];
    let numericDimensionLabels = [];
    let floorSemanticGlyphCandidates = [];
    try {
      const textContent = await page.getTextContent({ includeMarkedContent: true, disableNormalization: false });
      const textItems = textContent && textContent.items;
      textZones = buildTextZones(textItems);
      numericDimensionLabels = buildNumericDimensionLabels(textItems);
    } catch (textError) {}
    let optionalContentSummary = {
      available: false,
      layerCount: 0,
      selectedLayerCount: 0,
      visibleLayerCount: 0,
      selectedLayerNames: []
    };
    try {
      const sourceDocument = (options && options.pdfDocument) || page._pdfDocument || null;
      if (sourceDocument && typeof sourceDocument.getOptionalContentConfig === "function") {
        optionalContentSummary = summarizeOptionalContentConfig(await sourceDocument.getOptionalContentConfig({ intent: "display" }));
      }
    } catch (ocgError) {}
    const extractionOptions = {
      ...(options || {}),
      viewport,
      textZones,
      numericDimensionLabels,
      optionalContentSummary,
      pageNumber,
      pageWidth: viewport.width / scale,
      pageHeight: viewport.height / scale
    };
    const firstPass = extractFromOperatorList(operatorList, extractionOptions);
    let outlinedDigitDiagnostics = { schema: "laibe.planPuzzle.pdfOutlinedDigitDecoderDiagnostics.v1", version: OUTLINED_DIGIT_DECODER_VERSION, status: numericDimensionLabels.length ? "text_layer_labels_available" : "not_attempted" };
    let floorSemanticGlyphDiagnostics = { schema: "laibe.planPuzzle.pdfOutlinedFloorSemanticGlyphDiagnostics.v1", version: OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION, page: pageNumber, status: "not_attempted" };
    if (!numericDimensionLabels.length) {
      try {
        numericDimensionLabels = await decodeOutlinedDimensionLabels(page, firstPass.axisLines, extractionOptions.pageWidth, extractionOptions.pageHeight, outlinedDigitDiagnostics, firstPass.outlinedVectorDimensionGlyphGroups);
      } catch (outlinedDigitError) {
        outlinedDigitDiagnostics = { schema: "laibe.planPuzzle.pdfOutlinedDigitDecoderDiagnostics.v1", version: OUTLINED_DIGIT_DECODER_VERSION, status: "decoder_render_or_segmentation_failure", message: String(outlinedDigitError && outlinedDigitError.message || "outlined digit decoder failed").slice(0, 160) };
        numericDimensionLabels = [];
      }
    }
    try {
      floorSemanticGlyphCandidates = await decodeOutlinedFloorSemanticGlyphs(page, firstPass, extractionOptions.pageWidth, extractionOptions.pageHeight, pageNumber, floorSemanticGlyphDiagnostics);
    } catch (outlinedFloorSemanticError) {
      floorSemanticGlyphDiagnostics = {
        schema: "laibe.planPuzzle.pdfOutlinedFloorSemanticGlyphDiagnostics.v1",
        version: OUTLINED_FLOOR_SEMANTIC_DECODER_VERSION,
        page: pageNumber,
        status: "decoder_render_or_segmentation_failure",
        message: String(outlinedFloorSemanticError && outlinedFloorSemanticError.message || "outlined floor semantic decoder failed").slice(0, 160),
        rejectionDetailComplete: false
      };
      floorSemanticGlyphCandidates = [];
    }
    if (!numericDimensionLabels.length && !floorSemanticGlyphCandidates.length) {
      firstPass.dimensionEvidence = { ...(firstPass.dimensionEvidence || {}), outlinedDigitDecoder: outlinedDigitDiagnostics };
      firstPass.floorSemanticGlyphDiagnostics = floorSemanticGlyphDiagnostics;
      return firstPass;
    }
    return extractFromOperatorList(operatorList, {
      ...extractionOptions,
      numericDimensionLabels,
      outlinedDigitDiagnostics,
      floorSemanticGlyphCandidates,
      floorSemanticGlyphDiagnostics
    });
  }

  global.LaibePdfPlanVectorExtractor = {
    extractFromPage,
    extractFromOperatorList,
    detectFixedCabinetCandidates,
    semanticDetectorPredicates,
    semanticDetectorPredicateContract
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.LaibePdfPlanVectorExtractor;
  }
})(typeof window !== "undefined" ? window : globalThis);

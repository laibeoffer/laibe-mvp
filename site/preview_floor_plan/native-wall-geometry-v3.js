(function registerNativeWallGeometryV3(global) {
  "use strict";

  const EPSILON = 1e-7;
  const WALL_PRIORITY = [
    "rc_wall",
    "bearing_wall",
    "exterior_wall",
    "brick_wall",
    "lightweight_solid_wall",
    "light_partition",
    "wood_partition",
    "partition_wall",
    "unknown"
  ];

  function add(left, right) {
    return { x: left.x + right.x, y: left.y + right.y };
  }

  function subtract(left, right) {
    return { x: left.x - right.x, y: left.y - right.y };
  }

  function scale(vector, amount) {
    return { x: vector.x * amount, y: vector.y * amount };
  }

  function dot(left, right) {
    return left.x * right.x + left.y * right.y;
  }

  function cross(left, right) {
    return left.x * right.y - left.y * right.x;
  }

  function length(vector) {
    return Math.hypot(vector.x, vector.y);
  }

  function unit(vector) {
    const magnitude = length(vector);
    if (magnitude <= EPSILON) throw new TypeError("Wall endpoints must be distinct finite points.");
    return scale(vector, 1 / magnitude);
  }

  function normal(vector) {
    return { x: -vector.y, y: vector.x };
  }

  function roundCoordinate(value) {
    const rounded = Math.round(value * 1e6) / 1e6;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function roundPoint(point) {
    return { x: roundCoordinate(point.x), y: roundCoordinate(point.y) };
  }

  function samePoint(left, right) {
    return Math.abs(left.x - right.x) <= EPSILON
      && Math.abs(left.y - right.y) <= EPSILON;
  }

  function normalizePolygon(points) {
    const normalized = [];
    points.map(roundPoint).forEach((point) => {
      if (!normalized.length || !samePoint(point, normalized[normalized.length - 1])) {
        normalized.push(point);
      }
    });
    if (normalized.length > 1 && samePoint(normalized[0], normalized[normalized.length - 1])) {
      normalized.pop();
    }
    return normalized;
  }

  function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function rectangle(from, to, thickness) {
    const direction = unit(subtract(to, from));
    const offset = scale(normal(direction), thickness / 2);
    return [
      add(from, offset),
      add(to, offset),
      subtract(to, offset),
      subtract(from, offset)
    ].map(roundPoint);
  }

  function polygonToSvgPath(points) {
    return points.length
      ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`
      : "";
  }

  function polygonSignedArea(points) {
    if (points.length < 3) return 0;
    return points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
  }

  function lineIntersection(firstPoint, firstDirection, secondPoint, secondDirection) {
    const denominator = cross(firstDirection, secondDirection);
    if (Math.abs(denominator) <= EPSILON) return null;
    const delta = subtract(secondPoint, firstPoint);
    const firstParameter = cross(delta, secondDirection) / denominator;
    const secondParameter = cross(delta, firstDirection) / denominator;
    return {
      point: add(firstPoint, scale(firstDirection, firstParameter)),
      firstParameter,
      secondParameter
    };
  }

  function centerlineIntersection(left, right, toleranceMm) {
    const intersection = lineIntersection(left.from, left.vector, right.from, right.vector);
    if (!intersection) return null;
    const leftAllowance = toleranceMm / left.length;
    const rightAllowance = toleranceMm / right.length;
    if (
      intersection.firstParameter < -leftAllowance
      || intersection.firstParameter > 1 + leftAllowance
      || intersection.secondParameter < -rightAllowance
      || intersection.secondParameter > 1 + rightAllowance
    ) {
      return null;
    }
    return {
      point: intersection.point,
      leftParameter: Math.max(0, Math.min(1, intersection.firstParameter)),
      rightParameter: Math.max(0, Math.min(1, intersection.secondParameter))
    };
  }

  function endpointKind(parameter, wallLength, toleranceMm) {
    if (parameter * wallLength <= toleranceMm) return "from";
    if ((1 - parameter) * wallLength <= toleranceMm) return "to";
    return null;
  }

  function awayFromJunction(wall, endpoint) {
    return endpoint === "from" ? wall.direction : scale(wall.direction, -1);
  }

  function otherEndpoint(wall, endpoint) {
    return endpoint === "from" ? wall.to : wall.from;
  }

  function wallType(wall) {
    const candidate = wall.structuralType || wall.wallType || wall.type || wall.category || "unknown";
    return WALL_PRIORITY.includes(candidate) ? candidate : "unknown";
  }

  function compareHostPriority(left, right) {
    return WALL_PRIORITY.indexOf(wallType(left.source)) - WALL_PRIORITY.indexOf(wallType(right.source))
      || right.thickness - left.thickness
      || compareText(left.id, right.id);
  }

  function miterBoundary(left, leftEndpoint, right, rightEndpoint, junctionPoint) {
    const leftAway = awayFromJunction(left, leftEndpoint);
    const rightAway = awayFromJunction(right, rightEndpoint);
    const leftNormal = normal(leftAway);
    const rightNormal = normal(rightAway);
    const boundary = [-1, 1].map((leftSide) => lineIntersection(
      add(junctionPoint, scale(leftNormal, leftSide * left.thickness / 2)),
      leftAway,
      add(junctionPoint, scale(rightNormal, -leftSide * right.thickness / 2)),
      rightAway
    ));
    if (boundary.some((intersection) => !intersection)) {
      throw new TypeError("L junction walls must meet at a non-collinear angle.");
    }
    return boundary.map((intersection) => roundPoint(intersection.point));
  }

  function hostFaceConstraint(host, junctionPoint, awayDirection, keepPoint) {
    const hostNormal = normal(host.direction);
    const faceSign = dot(awayDirection, hostNormal) >= 0 ? 1 : -1;
    const facePoint = add(
      junctionPoint,
      scale(hostNormal, faceSign * host.thickness / 2)
    );
    return {
      lineStart: roundPoint(facePoint),
      lineEnd: roundPoint(add(facePoint, host.direction)),
      keepPoint: roundPoint(keepPoint),
      coverageSolid: {
        id: `wall:${host.id}`,
        kind: "wall",
        polygonMm: rectangle(host.from, host.to, host.thickness)
      }
    };
  }

  function clipPolygonToConstraint(polygon, constraint) {
    const lineDirection = subtract(constraint.lineEnd, constraint.lineStart);
    const keepSide = Math.sign(cross(
      lineDirection,
      subtract(constraint.keepPoint, constraint.lineStart)
    ));
    if (!keepSide) throw new TypeError("A wall-body clipping constraint needs an exterior keep point.");
    const inside = (point) => keepSide * cross(
      lineDirection,
      subtract(point, constraint.lineStart)
    ) >= -EPSILON;
    const output = [];
    let start = polygon[polygon.length - 1];
    polygon.forEach((end) => {
      const startInside = inside(start);
      const endInside = inside(end);
      if (endInside) {
        if (!startInside) {
          const hit = lineIntersection(
            start,
            subtract(end, start),
            constraint.lineStart,
            lineDirection
          );
          if (hit) output.push(roundPoint(hit.point));
        }
        output.push(roundPoint(end));
      } else if (startInside) {
        const hit = lineIntersection(
          start,
          subtract(end, start),
          constraint.lineStart,
          lineDirection
        );
        if (hit) output.push(roundPoint(hit.point));
      }
      start = end;
    });
    return output;
  }

  function pointOnSegment(point, start, end, tolerance) {
    const segment = subtract(end, start);
    const relative = subtract(point, start);
    if (Math.abs(cross(segment, relative)) > tolerance * Math.max(1, length(segment))) return false;
    return dot(relative, segment) >= -tolerance
      && dot(subtract(point, end), segment) <= tolerance;
  }

  function pointInPolygon(point, polygon, tolerance) {
    if (polygon.some((start, index) => (
      pointOnSegment(point, start, polygon[(index + 1) % polygon.length], tolerance)
    ))) {
      return true;
    }
    let inside = false;
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      if (
        (start.y > point.y) !== (end.y > point.y)
        && point.x < ((end.x - start.x) * (point.y - start.y)) / (end.y - start.y) + start.x
      ) {
        inside = !inside;
      }
    });
    return inside;
  }

  function segmentPolygonIntersections(from, to, polygon, tolerance) {
    const direction = subtract(to, from);
    const intersections = [];
    polygon.forEach((edgeStart, index) => {
      const edgeEnd = polygon[(index + 1) % polygon.length];
      const hit = lineIntersection(from, direction, edgeStart, subtract(edgeEnd, edgeStart));
      if (
        hit
        && hit.firstParameter >= -tolerance
        && hit.firstParameter <= 1 + tolerance
        && hit.secondParameter >= -tolerance
        && hit.secondParameter <= 1 + tolerance
      ) {
        intersections.push({
          parameter: Math.max(0, Math.min(1, hit.firstParameter)),
          point: roundPoint(hit.point),
          edgeStart: roundPoint(edgeStart),
          edgeEnd: roundPoint(edgeEnd)
        });
      }
    });
    return intersections
      .sort((left, right) => left.parameter - right.parameter)
      .filter((hit, index, all) => (
        index === 0 || Math.abs(hit.parameter - all[index - 1].parameter) > EPSILON
      ));
  }

  function clipPolygon(subjectPolygon, clipBoundary) {
    let output = subjectPolygon.map((point) => ({ ...point }));
    const orientation = Math.sign(polygonSignedArea(clipBoundary)) || 1;
    const inside = (point, start, end) => orientation * cross(
      subtract(end, start),
      subtract(point, start)
    ) >= -EPSILON;

    clipBoundary.forEach((clipStart, index) => {
      if (!output.length) return;
      const clipEnd = clipBoundary[(index + 1) % clipBoundary.length];
      const input = output;
      output = [];
      let start = input[input.length - 1];
      input.forEach((end) => {
        const startInside = inside(start, clipStart, clipEnd);
        const endInside = inside(end, clipStart, clipEnd);
        if (endInside) {
          if (!startInside) {
            const hit = lineIntersection(start, subtract(end, start), clipStart, subtract(clipEnd, clipStart));
            if (hit) output.push(hit.point);
          }
          output.push(end);
        } else if (startInside) {
          const hit = lineIntersection(start, subtract(end, start), clipStart, subtract(clipEnd, clipStart));
          if (hit) output.push(hit.point);
        }
        start = end;
      });
    });
    return output;
  }

  function polygonOverlapArea(left, right) {
    return Math.abs(polygonSignedArea(clipPolygon(left, right)));
  }

  function columnFaceConstraint(column, edgeStart, edgeEnd, keepPoint) {
    return {
      lineStart: roundPoint(edgeStart),
      lineEnd: roundPoint(edgeEnd),
      keepPoint: roundPoint(keepPoint),
      coverageSolid: {
        id: `column:${column.columnId}`,
        kind: "column",
        polygonMm: column.polygonMm
      }
    };
  }

  function resolveColumnOverlapCut(wall, column, toleranceMm) {
    const wallPolygon = rectangle(wall.from, wall.to, wall.thickness);
    const overlapAreaMm2 = polygonOverlapArea(wallPolygon, column.polygonMm);
    if (overlapAreaMm2 <= EPSILON) return null;
    if (wall.source && wall.source.source_kind === "pdf") {
      const wallTransformId = String(wall.source.r6AppliedTransformId || "").trim();
      const columnTransformId = String(
        column.source.r6AppliedPolygonTransformId
        || column.source.r6AppliedTransformId
        || ""
      ).trim();
      if (!wallTransformId || wallTransformId !== columnTransformId) return null;
    }
    const centerlineHits = segmentPolygonIntersections(
      wall.from,
      wall.to,
      column.polygonMm,
      toleranceMm / wall.length
    );
    if (
      !centerlineHits.length
      && wall.source
      && wall.source.source_kind !== "pdf"
      && wall.source.native === true
      && wall.source.locked === true
    ) {
      return null;
    }

    const fromInside = pointInPolygon(wall.from, column.polygonMm, toleranceMm);
    const toInside = pointInPolygon(wall.to, column.polygonMm, toleranceMm);
    if (fromInside && toInside) {
      throw new TypeError("A wall-column junction requires one wall endpoint outside the column.");
    }

    const allowance = toleranceMm / wall.length;
    const candidates = column.polygonMm
      .map((edgeStart, index) => {
        const edgeEnd = column.polygonMm[(index + 1) % column.polygonMm.length];
        const hit = lineIntersection(
          wall.from,
          wall.vector,
          edgeStart,
          subtract(edgeEnd, edgeStart)
        );
        if (
          !hit
          || hit.firstParameter < -allowance
          || hit.firstParameter > 1 + allowance
        ) {
          return null;
        }
        const parameter = Math.max(0, Math.min(1, hit.firstParameter));
        const beforeConstraint = columnFaceConstraint(
          column,
          edgeStart,
          edgeEnd,
          wall.from
        );
        const afterConstraint = columnFaceConstraint(
          column,
          edgeStart,
          edgeEnd,
          wall.to
        );
        let beforeOverlapAreaMm2 = Number.POSITIVE_INFINITY;
        let afterOverlapAreaMm2 = Number.POSITIVE_INFINITY;
        try {
          beforeOverlapAreaMm2 = polygonOverlapArea(
            clipPolygonToConstraint(wallPolygon, beforeConstraint),
            column.polygonMm
          );
        } catch (error) {
          beforeOverlapAreaMm2 = Number.POSITIVE_INFINITY;
        }
        try {
          afterOverlapAreaMm2 = polygonOverlapArea(
            clipPolygonToConstraint(wallPolygon, afterConstraint),
            column.polygonMm
          );
        } catch (error) {
          afterOverlapAreaMm2 = Number.POSITIVE_INFINITY;
        }
        return {
          parameter,
          beforeConstraint,
          afterConstraint,
          clearsBefore: beforeOverlapAreaMm2 <= EPSILON,
          clearsAfter: afterOverlapAreaMm2 <= EPSILON
        };
      })
      .filter(Boolean);

    const entry = candidates
      .filter((candidate) => candidate.clearsBefore)
      .sort((left, right) => right.parameter - left.parameter)[0] || null;
    const exit = candidates
      .filter((candidate) => candidate.clearsAfter)
      .sort((left, right) => left.parameter - right.parameter)[0] || null;
    if (!entry && !exit) {
      if (!centerlineHits.length) return null;
      throw new TypeError("A wall-column overlap requires a resolvable column face.");
    }
    if (!centerlineHits.length && entry && exit) {
      return null;
    }

    const startParameter = entry ? entry.parameter : 0;
    const endParameter = exit ? exit.parameter : 1;
    if (endParameter - startParameter <= EPSILON) {
      throw new TypeError("A wall-column overlap requires a positive axial cut interval.");
    }
    return {
      columnId: column.columnId,
      startParameter,
      endParameter,
      beforeConstraint: entry && {
        ...entry.beforeConstraint,
        extendEndpoint: "to"
      },
      afterConstraint: exit && {
        ...exit.afterConstraint,
        extendEndpoint: "from"
      }
    };
  }

  function isConvexPolygon(polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let orientation = 0;
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const after = polygon[(index + 2) % polygon.length];
      const turn = cross(subtract(next, current), subtract(after, next));
      if (Math.abs(turn) <= EPSILON) continue;
      const sign = Math.sign(turn);
      if (orientation && sign !== orientation) return false;
      orientation = sign;
    }
    return orientation !== 0;
  }

  function proveCoveredByCanonicalSolids(fragmentPolygon, constraints) {
    const fragmentAreaMm2 = Math.abs(polygonSignedArea(fragmentPolygon));
    const solidsById = new Map();
    (constraints || []).forEach((constraint) => {
      const solid = constraint && constraint.coverageSolid;
      if (
        solid &&
        solid.id &&
        isConvexPolygon(solid.polygonMm)
      ) {
        solidsById.set(String(solid.id), {
          id: String(solid.id),
          kind: String(solid.kind || "unknown"),
          polygonMm: normalizePolygon(solid.polygonMm)
        });
      }
    });
    const solids = Array.from(solidsById.values())
      .sort((left, right) => compareText(left.id, right.id));
    if (!(fragmentAreaMm2 > EPSILON) || !solids.length || solids.length > 8) {
      return {
        pass: false,
        fragmentAreaMm2,
        coveredAreaMm2: 0,
        uncoveredAreaMm2: fragmentAreaMm2,
        solids
      };
    }
    let coveredAreaMm2 = 0;
    const subsetCount = 2 ** solids.length;
    for (let mask = 1; mask < subsetCount; mask += 1) {
      let intersection = fragmentPolygon;
      let cardinality = 0;
      for (let index = 0; index < solids.length && intersection.length >= 3; index += 1) {
        if (!(mask & 2 ** index)) continue;
        cardinality += 1;
        intersection = clipPolygon(intersection, solids[index].polygonMm);
      }
      const area = Math.abs(polygonSignedArea(intersection));
      coveredAreaMm2 += cardinality % 2 ? area : -area;
    }
    const uncoveredAreaMm2 = Math.max(0, fragmentAreaMm2 - coveredAreaMm2);
    const toleranceMm2 = Math.max(EPSILON, fragmentAreaMm2 * 1e-9);
    return {
      pass: uncoveredAreaMm2 <= toleranceMm2,
      fragmentAreaMm2,
      coveredAreaMm2,
      uncoveredAreaMm2,
      toleranceMm2,
      solids
    };
  }

  function polygonsTouch(left, right, tolerance) {
    return left.some((point) => right.some((start, index) => (
      pointOnSegment(point, start, right[(index + 1) % right.length], tolerance)
    ))) || right.some((point) => left.some((start, index) => (
      pointOnSegment(point, start, left[(index + 1) % left.length], tolerance)
    )));
  }

  function canonicalPolygon(points) {
    const rounded = points.map(roundPoint);
    if (!rounded.length) return [];
    const rotations = [];
    [rounded, [...rounded].reverse()].forEach((orientation) => {
      orientation.forEach((unused, index) => {
        rotations.push([...orientation.slice(index), ...orientation.slice(0, index)]);
      });
    });
    rotations.sort((left, right) => compareText(JSON.stringify(left), JSON.stringify(right)));
    return rotations[0];
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
          bytes[byteIndex] << 24
          | bytes[byteIndex + 1] << 16
          | bytes[byteIndex + 2] << 8
          | bytes[byteIndex + 3]
        ) >>> 0;
      }
      for (let index = 16; index < 64; index += 1) {
        const previous15 = words[index - 15];
        const previous2 = words[index - 2];
        const sigma0 = (
          (previous15 >>> 7 | previous15 << 25)
          ^ (previous15 >>> 18 | previous15 << 14)
          ^ previous15 >>> 3
        ) >>> 0;
        const sigma1 = (
          (previous2 >>> 17 | previous2 << 15)
          ^ (previous2 >>> 19 | previous2 << 13)
          ^ previous2 >>> 10
        ) >>> 0;
        words[index] = (
          words[index - 16] + sigma0 + words[index - 7] + sigma1
        ) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = (
          (e >>> 6 | e << 26)
          ^ (e >>> 11 | e << 21)
          ^ (e >>> 25 | e << 7)
        ) >>> 0;
        const choice = (e & f ^ ~e & g) >>> 0;
        const temporary1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
        const sum0 = (
          (a >>> 2 | a << 30)
          ^ (a >>> 13 | a << 19)
          ^ (a >>> 22 | a << 10)
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
      [a, b, c, d, e, f, g, h].forEach((value, index) => {
        hash[index] = (hash[index] + value) >>> 0;
      });
    }
    return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
  }

  function stableGeometryHash(geometry) {
    const canonical = {
      wallBodies: [...(geometry.wallBodies || [])]
        .map((body) => ({
          wallId: String(body.wallId),
          partId: String(body.partId),
          polygonMm: canonicalPolygon(body.polygonMm || [])
        }))
        .sort((left, right) => (
          compareText(left.wallId, right.wallId) || compareText(left.partId, right.partId)
        )),
      columns: [...(geometry.columns || [])]
        .map((column) => ({
          columnId: String(column.columnId),
          polygonMm: canonicalPolygon(column.polygonMm || [])
        }))
        .sort((left, right) => compareText(left.columnId, right.columnId))
    };
    return sha256(JSON.stringify(canonical));
  }

  function resolve(input) {
    const toleranceMm = Number.isFinite(input && input.toleranceMm)
      ? Math.max(EPSILON, input.toleranceMm)
      : 0.5;
    const walls = [...(input && input.walls || [])]
      .map((source) => {
        const from = roundPoint(source.from);
        const to = roundPoint(source.to);
        const vector = subtract(to, from);
        const wallLength = length(vector);
        const thickness = Number(source.thickness);
        if (
          !source.id
          || !Number.isFinite(from.x)
          || !Number.isFinite(from.y)
          || !Number.isFinite(to.x)
          || !Number.isFinite(to.y)
          || !Number.isFinite(thickness)
          || thickness <= 0
          || wallLength <= EPSILON
        ) {
          throw new TypeError("Each wall requires a stable id, finite endpoints, and positive thickness.");
        }
        return {
          id: String(source.id),
          source,
          from,
          to,
          vector,
          direction: unit(vector),
          length: wallLength,
          thickness
        };
      })
      .sort((left, right) => compareText(left.id, right.id));
    const columns = [...(input && input.columns || [])]
      .map((source) => {
        if (!source.id || !Array.isArray(source.polygonMm) || source.polygonMm.length < 3) {
          throw new TypeError("Each column requires a stable id and polygon.");
        }
        return {
          source,
          columnId: String(source.id),
          polygonMm: source.polygonMm.map(roundPoint),
          locked: true,
          native: true
        };
      })
      .sort((left, right) => compareText(left.columnId, right.columnId));
    const endpointConstraints = new Map(walls.map((wall) => [wall.id, {
      from: [],
      to: []
    }]));
    const crossSplits = new Map(walls.map((wall) => [wall.id, []]));
    const columnCuts = new Map(walls.map((wall) => [wall.id, []]));
    const junctionSpecs = [];
    const addEndpointConstraint = (wall, endpoint, constraint) => {
      endpointConstraints.get(wall.id)[endpoint].push(constraint);
    };

    for (let leftIndex = 0; leftIndex < walls.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < walls.length; rightIndex += 1) {
        const left = walls[leftIndex];
        const right = walls[rightIndex];
        const hit = centerlineIntersection(left, right, toleranceMm);
        if (!hit) continue;
        const leftEndpoint = endpointKind(hit.leftParameter, left.length, toleranceMm);
        const rightEndpoint = endpointKind(hit.rightParameter, right.length, toleranceMm);

        if (leftEndpoint && rightEndpoint) {
          const boundary = miterBoundary(left, leftEndpoint, right, rightEndpoint, hit.point);
          addEndpointConstraint(left, leftEndpoint, {
            lineStart: boundary[0],
            lineEnd: boundary[1],
            keepPoint: otherEndpoint(left, leftEndpoint),
            extendEndpoint: leftEndpoint
          });
          addEndpointConstraint(right, rightEndpoint, {
            lineStart: boundary[0],
            lineEnd: boundary[1],
            keepPoint: otherEndpoint(right, rightEndpoint),
            extendEndpoint: rightEndpoint
          });
          junctionSpecs.push({
            kind: "wall_l_miter",
            wallIds: [left.id, right.id].sort(compareText)
          });
        } else if (leftEndpoint || rightEndpoint) {
          const branch = leftEndpoint ? left : right;
          const branchEndpoint = leftEndpoint || rightEndpoint;
          const host = leftEndpoint ? right : left;
          const branchAway = awayFromJunction(branch, branchEndpoint);
          const approach = Math.abs(dot(branchAway, normal(host.direction)));
          if (approach <= EPSILON) continue;
          addEndpointConstraint(
            branch,
            branchEndpoint,
            hostFaceConstraint(
              host,
              hit.point,
              branchAway,
              otherEndpoint(branch, branchEndpoint)
            )
          );
          junctionSpecs.push({
            kind: "wall_t",
            wallIds: [host.id, branch.id],
            hostWallId: host.id,
            branchWallId: branch.id
          });
        } else {
          const host = [left, right].sort(compareHostPriority)[0];
          const crossing = host === left ? right : left;
          const approach = Math.abs(dot(crossing.direction, normal(host.direction)));
          if (approach <= EPSILON) continue;
          const crossingParameter = crossing === left
            ? hit.leftParameter
            : hit.rightParameter;
          crossSplits.get(crossing.id).push({
            parameter: crossingParameter,
            point: roundPoint(hit.point),
            beforeConstraint: hostFaceConstraint(
              host,
              hit.point,
              scale(crossing.direction, -1),
              crossing.from
            ),
            afterConstraint: hostFaceConstraint(
              host,
              hit.point,
              crossing.direction,
              crossing.to
            )
          });
          junctionSpecs.push({
            kind: "wall_cross_partition",
            wallIds: [host.id, crossing.id],
            hostWallId: host.id,
            crossingWallId: crossing.id,
            crossingParameter
          });
        }
      }
    }

    walls.forEach((wall) => {
      columns.forEach((column) => {
        const overlapCut = resolveColumnOverlapCut(wall, column, toleranceMm);
        if (overlapCut) {
          columnCuts.get(wall.id).push(overlapCut);
          junctionSpecs.push({
            kind: "wall_column_butt",
            wallIds: [wall.id],
            wallId: wall.id,
            columnId: column.columnId
          });
          return;
        }
        const hits = segmentPolygonIntersections(
          wall.from,
          wall.to,
          column.polygonMm,
          toleranceMm / wall.length
        );
        if (!hits.length) return;
        const fromInside = pointInPolygon(wall.from, column.polygonMm, toleranceMm);
        const toInside = pointInPolygon(wall.to, column.polygonMm, toleranceMm);
        if (fromInside && toInside) {
          throw new TypeError("A wall-column junction requires one wall endpoint outside the column.");
        }
        let endpoint;
        let hit;
        let keepPoint;
        if (toInside || (!fromInside && !toInside)) {
          endpoint = "to";
          hit = hits[0];
          keepPoint = wall.from;
        } else {
          endpoint = "from";
          hit = hits[hits.length - 1];
          keepPoint = wall.to;
        }
        addEndpointConstraint(wall, endpoint, {
          lineStart: hit.edgeStart,
          lineEnd: hit.edgeEnd,
          keepPoint,
          coverageSolid: {
            id: `column:${column.columnId}`,
            kind: "column",
            polygonMm: column.polygonMm
          }
        });
        junctionSpecs.push({
          kind: "wall_column_butt",
          wallIds: [wall.id],
          wallId: wall.id,
          columnId: column.columnId
        });
      });
    });

    const coveredFragments = [];
    const wallBodies = walls
      .flatMap((wall) => {
        const splits = crossSplits.get(wall.id)
          .sort((left, right) => left.parameter - right.parameter);
        const uniqueSplits = splits.filter((split, index) => (
          index === 0 || Math.abs(split.parameter - splits[index - 1].parameter) > EPSILON
        ));
        const cuts = columnCuts.get(wall.id)
          .sort((left, right) => (
            left.startParameter - right.startParameter
            || left.endParameter - right.endParameter
            || compareText(left.columnId, right.columnId)
          ));
        const parameters = [
          0,
          ...uniqueSplits.map((split) => split.parameter),
          ...cuts.flatMap((cut) => [cut.startParameter, cut.endParameter]),
          1
        ]
          .sort((left, right) => left - right)
          .filter((parameter, index, all) => (
            index === 0 || Math.abs(parameter - all[index - 1]) > EPSILON
          ));
        const visibleSegments = parameters.slice(0, -1)
          .map((parameter, index) => ({
            fromParameter: parameter,
            toParameter: parameters[index + 1]
          }))
          .filter((segment) => {
            const midpoint = (segment.fromParameter + segment.toParameter) / 2;
            return !cuts.some((cut) => (
              midpoint > cut.startParameter - EPSILON
              && midpoint < cut.endParameter + EPSILON
            ));
          });
        const bodies = visibleSegments.map((segment, index) => {
          const constraints = [];
          if (Math.abs(segment.fromParameter) <= EPSILON) {
            constraints.push(...endpointConstraints.get(wall.id).from);
          }
          if (Math.abs(segment.toParameter - 1) <= EPSILON) {
            constraints.push(...endpointConstraints.get(wall.id).to);
          }
          uniqueSplits.forEach((split) => {
            if (Math.abs(segment.fromParameter - split.parameter) <= EPSILON) {
              constraints.push(split.afterConstraint);
            }
            if (Math.abs(segment.toParameter - split.parameter) <= EPSILON) {
              constraints.push(split.beforeConstraint);
            }
          });
          cuts.forEach((cut) => {
            if (
              cut.afterConstraint
              && Math.abs(segment.fromParameter - cut.endParameter) <= EPSILON
            ) {
              constraints.push(cut.afterConstraint);
            }
            if (
              cut.beforeConstraint
              && Math.abs(segment.toParameter - cut.startParameter) <= EPSILON
            ) {
              constraints.push(cut.beforeConstraint);
            }
          });
          return {
            wallId: wall.id,
            partId: `${wall.id}:part-${index + 1}`,
            from: roundPoint(add(wall.from, scale(wall.vector, segment.fromParameter))),
            to: roundPoint(add(wall.from, scale(wall.vector, segment.toParameter))),
            fromParameter: segment.fromParameter,
            toParameter: segment.toParameter,
            constraints,
            thickness: wall.thickness,
            direction: wall.direction
          };
        });
        uniqueSplits.forEach((split) => {
          const beforeBody = bodies.find((body) => (
            Math.abs(body.toParameter - split.parameter) <= EPSILON
          ));
          const afterBody = bodies.find((body) => (
            Math.abs(body.fromParameter - split.parameter) <= EPSILON
          ));
          split.adjacentPartIds = [beforeBody, afterBody]
            .filter(Boolean)
            .map((body) => body.partId);
        });
        return bodies;
      })
      .map((body) => {
        let rectangleFrom = body.from;
        let rectangleTo = body.to;
        body.constraints.forEach((constraint) => {
          if (constraint.extendEndpoint === "from") {
            const extension = Math.min(
              0,
              dot(subtract(constraint.lineStart, body.from), body.direction),
              dot(subtract(constraint.lineEnd, body.from), body.direction)
            );
            rectangleFrom = add(body.from, scale(body.direction, extension));
          } else if (constraint.extendEndpoint === "to") {
            const extension = Math.max(
              0,
              dot(subtract(constraint.lineStart, body.to), body.direction),
              dot(subtract(constraint.lineEnd, body.to), body.direction)
            );
            rectangleTo = add(body.to, scale(body.direction, extension));
          }
        });
        const unclippedPolygonMm = rectangle(rectangleFrom, rectangleTo, body.thickness);
        const polygonMm = normalizePolygon(body.constraints
          .reduce(
            (polygon, constraint) => clipPolygonToConstraint(polygon, constraint),
            unclippedPolygonMm
          ));
        if (polygonMm.length < 3 || Math.abs(polygonSignedArea(polygonMm)) <= EPSILON) {
          const coverage = proveCoveredByCanonicalSolids(
            unclippedPolygonMm,
            body.constraints
          );
          if (!coverage.pass) {
            throw new TypeError(`Wall body ${body.partId} was fully removed by junction constraints.`);
          }
          const receipt = {
            schema: "laibe.planPuzzle.nativeWallGeometry.coveredFragment.v1",
            status: "fully_covered_by_adjacent_canonical_solids",
            wallId: body.wallId,
            partId: body.partId,
            logicalWallPreserved: true,
            fragmentPolygonMm: canonicalPolygon(unclippedPolygonMm),
            fragmentAreaMm2: roundCoordinate(coverage.fragmentAreaMm2),
            coveredAreaMm2: roundCoordinate(coverage.coveredAreaMm2),
            uncoveredAreaMm2: roundCoordinate(coverage.uncoveredAreaMm2),
            coverageSolidIds: coverage.solids.map((solid) => solid.id),
            coverageSolids: coverage.solids.map((solid) => ({
              id: solid.id,
              kind: solid.kind,
              polygonMm: canonicalPolygon(solid.polygonMm)
            }))
          };
          receipt.coverageProofHash = sha256(JSON.stringify(receipt));
          coveredFragments.push(receipt);
          return null;
        }
        const finalized = {
          wallId: body.wallId,
          partId: body.partId,
          polygonMm,
          renderPath: polygonToSvgPath(polygonMm)
        };
        finalized.geometryHash = stableGeometryHash({ wallBodies: [finalized], columns: [] });
        return finalized;
      })
      .filter(Boolean)
      .sort((left, right) => (
        compareText(left.wallId, right.wallId) || compareText(left.partId, right.partId)
      ));

    let illegalOverlapCount = 0;
    for (let leftIndex = 0; leftIndex < wallBodies.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < wallBodies.length; rightIndex += 1) {
        if (
          polygonOverlapArea(
            wallBodies[leftIndex].polygonMm,
            wallBodies[rightIndex].polygonMm
          ) > EPSILON
        ) {
          illegalOverlapCount += 1;
        }
      }
    }
    const protrusions = [];
    wallBodies.forEach((body) => {
      columns.forEach((column) => {
        const overlapAreaMm2 = polygonOverlapArea(body.polygonMm, column.polygonMm);
        if (overlapAreaMm2 > EPSILON) {
          protrusions.push({
            wallId: body.wallId,
            partId: body.partId,
            columnId: column.columnId,
            overlapAreaMm2: roundCoordinate(overlapAreaMm2)
          });
        }
      });
    });
    protrusions.sort((left, right) => (
      compareText(left.wallId, right.wallId)
      || compareText(left.partId, right.partId)
      || compareText(left.columnId, right.columnId)
    ));
    const protrusionCount = protrusions.length;

    let gapCount = 0;
    let disconnectedBoundaryCount = 0;
    const junctions = junctionSpecs
      .map((junction) => {
        let connected = true;
        let adjacentPartIds;
        if (junction.kind === "wall_column_butt") {
          const bodies = wallBodies.filter((candidate) => candidate.wallId === junction.wallId);
          const column = columns.find((candidate) => candidate.columnId === junction.columnId);
          const coveredConnection = coveredFragments.some((fragment) => (
            fragment.wallId === junction.wallId
            && fragment.coverageSolidIds.includes(`column:${junction.columnId}`)
          ));
          connected = Boolean(
            coveredConnection ||
            (column && bodies.some((body) => polygonsTouch(
              body.polygonMm,
              column.polygonMm,
              toleranceMm
            )))
          );
        } else if (junction.kind === "wall_cross_partition") {
          const hostBodies = wallBodies.filter((body) => body.wallId === junction.hostWallId);
          const splits = crossSplits.get(junction.crossingWallId)
            .sort((left, right) => left.parameter - right.parameter)
            .filter((split, index, all) => (
              index === 0 || Math.abs(split.parameter - all[index - 1].parameter) > EPSILON
            ));
          const splitIndex = splits.findIndex((split) => (
            Math.abs(split.parameter - junction.crossingParameter) <= EPSILON
          ));
          adjacentPartIds = splitIndex < 0
            ? []
            : Array.from(splits[splitIndex].adjacentPartIds || []);
          const adjacentParts = adjacentPartIds.map((partId) => ({
            body: wallBodies.find((body) => body.partId === partId),
            covered: coveredFragments.find((fragment) => fragment.partId === partId)
          }));
          connected = Boolean(
            hostBodies.length
            && adjacentParts.length === 2
            && adjacentParts.every(({ body, covered }) => (
              (
                body &&
                hostBodies.some((host) => polygonsTouch(
                  host.polygonMm,
                  body.polygonMm,
                  toleranceMm
                ))
              ) ||
              (
                covered &&
                covered.coverageSolidIds.includes(`wall:${junction.hostWallId}`)
              )
            ))
          );
        } else {
          const firstBodies = wallBodies.filter((body) => body.wallId === junction.wallIds[0]);
          const secondBodies = wallBodies.filter((body) => body.wallId === junction.wallIds[1]);
          connected = firstBodies.some((first) => secondBodies.some((second) => (
            polygonsTouch(first.polygonMm, second.polygonMm, toleranceMm)
          )));
        }
        if (!connected) {
          gapCount += 1;
          disconnectedBoundaryCount += 1;
        }
        const resolvedJunction = {
          id: `${junction.kind}:${[
            ...(junction.wallIds || []),
            junction.columnId || ""
          ].filter(Boolean).sort().join(":")}`,
          kind: junction.kind,
          pass: connected
        };
        if (adjacentPartIds) resolvedJunction.adjacentPartIds = adjacentPartIds;
        return resolvedJunction;
      })
      .sort((left, right) => compareText(left.id, right.id));
    const renderGeometryHash = stableGeometryHash({ wallBodies, columns });
    const coveredFragmentsHash = sha256(JSON.stringify(coveredFragments));
    const accountingGeometryHash = sha256(JSON.stringify({
      renderGeometryHash,
      coveredFragmentsHash
    }));
    const audit = {
      gapCount,
      illegalOverlapCount,
      protrusionCount,
      protrusions,
      disconnectedBoundaryCount,
      failedJunctions: junctions.filter((junction) => junction.pass !== true),
      renderGeometryHash,
      accountingGeometryHash,
      coveredFragmentCount: coveredFragments.length,
      coveredFragmentsHash,
      pass: (
        gapCount === 0
        && illegalOverlapCount === 0
        && protrusionCount === 0
        && disconnectedBoundaryCount === 0
      )
    };

    const resolvedColumns = columns.map(({ source, ...column }) => column);
    return {
      schema: "laibe.planPuzzle.nativeWallGeometry.v3",
      wallBodies,
      columns: resolvedColumns,
      coveredFragments,
      junctions,
      audit
    };
  }

  global.LaibeNativeWallGeometryV3 = Object.freeze({
    resolve,
    stableGeometryHash,
    polygonToSvgPath
  });
})(window);

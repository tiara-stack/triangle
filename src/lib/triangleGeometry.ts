import type { SideValues } from "./triangle";

export type DiagramPoint = readonly [number, number];
type SideName = "a" | "b" | "c";

export type TriangleDiagramModel =
  | {
      kind: "triangle";
      vertices: { a: DiagramPoint; b: DiagramPoint; c: DiagramPoint };
      labels: { a: DiagramPoint; b: DiagramPoint; c: DiagramPoint };
      dotRadius: number;
      withinDomain: boolean;
    }
  | {
      kind: "no-triangle";
      sides: ReadonlyArray<{
        name: SideName;
        value: number;
        start: DiagramPoint;
        end: DiagramPoint;
        label: DiagramPoint;
      }>;
    }
  | { kind: "incomplete" };

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function distance(left: DiagramPoint, right: DiagramPoint): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function outsideMidpoint(
  start: DiagramPoint,
  end: DiagramPoint,
  centroid: DiagramPoint,
  offset: number,
): DiagramPoint {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  let normalX = -dy / length;
  let normalY = dx / length;

  if (normalX * (centroid[0] - midX) + normalY * (centroid[1] - midY) > 0) {
    normalX *= -1;
    normalY *= -1;
  }

  return [midX + normalX * offset, midY + normalY * offset];
}

export function createTriangleDiagramModel(values: SideValues): TriangleDiagramModel {
  const a = parsePositiveInteger(values.a);
  const b = parsePositiveInteger(values.b);
  const c = parsePositiveInteger(values.c);
  if (a === null || b === null || c === null) return { kind: "incomplete" };

  const withinDomain = [a, b, c].every((side) => side <= 200);
  if (!(a < b + c && b < a + c && c < a + b)) {
    const scale = 1.8 / Math.max(a, b, c);
    const rowY: Record<SideName, number> = { a: 0.48, b: 0, c: -0.48 };
    const barStart = -0.68;
    return {
      kind: "no-triangle",
      sides: (["a", "b", "c"] as const).map((name) => ({
        name,
        value: { a, b, c }[name],
        start: [barStart, rowY[name]],
        end: [barStart + { a, b, c }[name] * scale, rowY[name]],
        label: [-0.82, rowY[name]],
      })),
    };
  }

  const scale = 1.8 / Math.max(a, b, c);
  const base = b * scale;
  const apexX = ((a * a - c * c) / (2 * b)) * scale;
  const height = Math.sqrt(Math.max(0, a * a - ((a * a + b * b - c * c) / (2 * b)) ** 2)) * scale;
  const vertices = {
    a: [-base / 2, -height / 2] as DiagramPoint,
    b: [base / 2, -height / 2] as DiagramPoint,
    c: [apexX, height / 2] as DiagramPoint,
  };
  const centroid: DiagramPoint = [
    (vertices.a[0] + vertices.b[0] + vertices.c[0]) / 3,
    (vertices.a[1] + vertices.b[1] + vertices.c[1]) / 3,
  ];
  const labels = {
    a: outsideMidpoint(vertices.a, vertices.c, centroid, 0.28),
    b: outsideMidpoint(vertices.a, vertices.b, centroid, 0.28),
    c: outsideMidpoint(vertices.c, vertices.b, centroid, 0.28),
  };

  if (distance(labels.b, labels.c) < 0.28 || distance(labels.b, labels.a) < 0.28) {
    labels.b = [labels.b[0], labels.b[1] - 0.18];
  }

  const shiftUp = ([x, y]: DiagramPoint): DiagramPoint => [x, y + 0.14];
  const fittedVertices = {
    a: shiftUp(vertices.a),
    b: shiftUp(vertices.b),
    c: shiftUp(vertices.c),
  };
  const fittedLabels = {
    a: shiftUp(labels.a),
    b: shiftUp(labels.b),
    c: shiftUp(labels.c),
  };

  const shortestSide = Math.min(a, b, c) * scale;
  return {
    kind: "triangle",
    vertices: fittedVertices,
    labels: fittedLabels,
    dotRadius: Math.max(0.012, Math.min(0.05, shortestSide * 0.3)),
    withinDomain,
  };
}

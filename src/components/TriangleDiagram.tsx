import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Stack } from "@astryxdesign/core/Stack";
import type { SideValues } from "../lib/triangle";
import { createTriangleDiagramModel, type DiagramPoint } from "../lib/triangleGeometry";

const TriangleCanvas = lazy(() =>
  import("./TriangleCanvas").then((module) => ({ default: module.TriangleCanvas })),
);

type TriangleDiagramProps = {
  values: SideValues;
};

function TriangleDiagramFallback({ values, ready }: TriangleDiagramProps & { ready: boolean }) {
  const model = createTriangleDiagramModel(values);
  const className = `triangle-fallback${ready ? " is-hidden" : ""}`;
  const toSvg = ([x, y]: DiagramPoint): DiagramPoint => [120 + x * 85, 110 - y * 85];

  if (model.kind === "incomplete") {
    return (
      <svg aria-hidden="true" className={`${className} triangle-fallback--invalid`} viewBox="0 0 240 220">
        <text className="triangle-fallback__state-label" x="120" y="115" textAnchor="middle">
          Enter whole sides
        </text>
      </svg>
    );
  }

  if (model.kind === "no-triangle") {
    return (
      <svg aria-hidden="true" className={`${className} triangle-fallback--invalid`} viewBox="0 0 240 220">
        {model.sides.map((side) => {
          const [x1, y] = toSvg(side.start);
          const [x2] = toSvg(side.end);
          const [labelX, labelY] = toSvg(side.label);
          return (
            <g key={side.name}>
              <line x1={x1} y1={y} x2={x2} y2={y} />
              <text className="triangle-fallback__side-label" x={labelX} y={labelY} textAnchor="end">
                {`${side.name}=${side.value}`}
              </text>
            </g>
          );
        })}
        <text className="triangle-fallback__state-label" x="120" y="204" textAnchor="middle">
          No triangle
        </text>
      </svg>
    );
  }

  const left = toSvg(model.vertices.a);
  const right = toSvg(model.vertices.b);
  const apex = toSvg(model.vertices.c);
  const labelA = toSvg(model.labels.a);
  const labelB = toSvg(model.labels.b);
  const labelC = toSvg(model.labels.c);

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 240 220">
      <path
        className="triangle-fallback__outline"
        d={`M${left[0]} ${left[1]} L${apex[0]} ${apex[1]} L${right[0]} ${right[1]} Z`}
      />
      {[left, apex, right].map((point, index) => (
        <circle cx={point[0]} cy={point[1]} key={index} r={Math.max(1, model.dotRadius * 85)} />
      ))}
      <text x={labelA[0]} y={labelA[1]} textAnchor="middle">{`a=${values.a}`}</text>
      <text x={labelB[0]} y={labelB[1]} textAnchor="middle">{`b=${values.b}`}</text>
      <text x={labelC[0]} y={labelC[1]} textAnchor="middle">{`c=${values.c}`}</text>
    </svg>
  );
}

export function TriangleDiagram({ values }: TriangleDiagramProps) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const renderRevision = useRef(0);
  renderRevision.current += 1;
  const model = createTriangleDiagramModel(values);
  const description =
    model.kind === "triangle"
      ? `Triangle with side a equal to ${values.a}, side b equal to ${values.b}, and side c equal to ${values.c}, drawn to scale${model.withinDomain ? "" : "; values exceed the allowed range"}`
      : model.kind === "no-triangle"
        ? `Side a equals ${values.a}, side b equals ${values.b}, and side c equals ${values.c}. They do not form a triangle; their lengths are shown separately to scale.`
        : "Enter three positive whole-number side lengths to see the diagram";

  return (
    <Stack aria-label={description} className="triangle-diagram" role="img">
      <TriangleDiagramFallback ready={ready} values={values} />
      <Suspense fallback={null}>
        <TriangleCanvas onReady={onReady} ready={ready} renderRevision={renderRevision.current} values={values} />
      </Suspense>
    </Stack>
  );
}

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import { useTheme } from "@astryxdesign/core/theme";
import type { SideValues } from "../lib/triangle";
import { createTriangleDiagramModel, type DiagramPoint } from "../lib/triangleGeometry";

const labelFont = "/fonts/Sintony-Bold.ttf";

type TriangleCanvasProps = {
  values: SideValues;
  renderRevision: number;
  onReady: () => void;
  ready: boolean;
};

type TriangleSceneProps = Pick<TriangleCanvasProps, "values" | "onReady" | "renderRevision"> & {
  ink: string;
  correction: string;
};

function TriangleScene({ values, onReady, renderRevision, ink, correction }: TriangleSceneProps) {
  const model = createTriangleDiagramModel(values);
  const { camera, invalidate, size } = useThree();

  useEffect(() => {
    const orthographicCamera = camera as typeof camera & {
      isOrthographicCamera: boolean;
      zoom: number;
      updateProjectionMatrix: () => void;
    };
    if (!orthographicCamera.isOrthographicCamera || size.height <= 0) return;

    const isNarrow = window.matchMedia("(max-width: 1000px)").matches;
    orthographicCamera.zoom = isNarrow
      ? Math.min(75, size.height / 2.35)
      : size.height / 2.8;
    orthographicCamera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.height, size.width]);

  useEffect(() => {
    // A DOM-only lab update can clear a demand-rendered canvas in the browser.
    invalidate();
  }, [invalidate, renderRevision]);

  useEffect(() => onReady(), [onReady]);

  if (model.kind === "incomplete") {
    return (
      <group>
        <Text
          anchorX="center"
          anchorY="middle"
          color={ink}
          font={labelFont}
          fontSize={0.18}
          position={[0, 0, 0.02]}
        >
          Enter side lengths
        </Text>
      </group>
    );
  }

  if (model.kind === "no-triangle") {
    return (
      <group>
        {model.sides.map((side) => (
          <group key={side.name}>
            <Line
              color={correction}
              dashed
              dashSize={0.1}
              gapSize={0.06}
              lineWidth={2.5}
              points={[
                [side.start[0], side.start[1], 0],
                [side.end[0], side.end[1], 0],
              ]}
            />
            <Text
              anchorX="right"
              anchorY="middle"
              color={correction}
              font={labelFont}
              fontSize={0.14}
              position={[side.label[0], side.label[1], 0.02]}
            >
              {`${side.name}=${side.value}`}
            </Text>
          </group>
        ))}
        <Text
          anchorX="center"
          anchorY="middle"
          color={correction}
          font={labelFont}
          fontSize={0.18}
          position={[0, -0.92, 0.02]}
        >
          No triangle
        </Text>
      </group>
    );
  }

  const to3d = ([x, y]: DiagramPoint): [number, number, number] => [x, y, 0];
  const left = to3d(model.vertices.a);
  const right = to3d(model.vertices.b);
  const apex = to3d(model.vertices.c);
  const labelA = to3d(model.labels.a);
  const labelB = to3d(model.labels.b);
  const labelC = to3d(model.labels.c);
  const vertices = [left, apex, right] as const;

  return (
    <group>
      <Line color={ink} lineWidth={2.5} points={[...vertices, left]} />
      {vertices.map((position, index) => (
        <mesh key={index} position={[position[0], position[1], 0.01]}>
          <circleGeometry args={[model.dotRadius, 24]} />
          <meshBasicMaterial color={ink} toneMapped={false} />
        </mesh>
      ))}
      <Text anchorX="center" anchorY="middle" color={ink} font={labelFont} fontSize={0.2} position={[labelA[0], labelA[1], 0.02]}>
        {`a=${values.a}`}
      </Text>
      <Text anchorX="center" anchorY="middle" color={ink} font={labelFont} fontSize={0.2} position={[labelB[0], labelB[1], 0.02]}>
        {`b=${values.b}`}
      </Text>
      <Text anchorX="center" anchorY="middle" color={ink} font={labelFont} fontSize={0.2} position={[labelC[0], labelC[1], 0.02]}>
        {`c=${values.c}`}
      </Text>
    </group>
  );
}

export function TriangleCanvas({ values, onReady, ready, renderRevision }: TriangleCanvasProps) {
  const { token } = useTheme();
  const ink = token("--color-text-primary");
  const correction = token("--color-error");

  return (
    <Canvas
      aria-hidden="true"
      camera={{ far: 100, near: 0.1, position: [0, 0, 10], zoom: 75 }}
      className={`triangle-canvas${ready ? " is-ready" : ""}`}
      dpr={[1, 2]}
      fallback={null}
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
      orthographic
    >
      <Suspense fallback={null}>
        <TriangleScene correction={correction} ink={ink} onReady={onReady} renderRevision={renderRevision} values={values} />
      </Suspense>
    </Canvas>
  );
}

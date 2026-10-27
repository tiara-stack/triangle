import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { handleTriangleRunRequest } from "../../../lib/triangleApi";

export const Route = createFileRoute("/api/triangle/run")({
  server: {
    handlers: {
      POST: ({ request }) => Effect.runPromise(handleTriangleRunRequest(request)),
    },
  },
});

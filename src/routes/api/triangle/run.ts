import { createFileRoute } from "@tanstack/react-router";
import { handleTriangleRunRequest } from "../../../lib/triangleApi";

export const Route = createFileRoute("/api/triangle/run")({
  server: {
    handlers: {
      POST: ({ request }) => handleTriangleRunRequest(request),
    },
  },
});

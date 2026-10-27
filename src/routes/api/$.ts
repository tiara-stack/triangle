import { createFileRoute } from "@tanstack/react-router";
import { triangleApiWebHandler } from "../../lib/triangleApiServer";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      POST: ({ request }) => triangleApiWebHandler.handler(request),
    },
  },
});

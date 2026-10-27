import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-start";
import type { RequestHandler } from "@tanstack/react-start/server";
import { triangleApiWebHandler } from "./lib/triangleApiServer";

const startHandler = createStartHandler(defaultStreamHandler);

export default {
  fetch(request, options) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return triangleApiWebHandler.handler(request);
    }

    return startHandler(request, options);
  },
} satisfies { fetch: RequestHandler<Register> };

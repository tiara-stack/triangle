import "../src/styles.css";
import "../src/themes/triangle-lab.css";
import "vitest-browser-react";
import { afterEach, beforeAll } from "vitest";
import { requests } from "./mocks/apiHandlers";
import { worker } from "./mocks/browser";

beforeAll(async () => {
  await worker.start({ onUnhandledFrame: "error" });
});

afterEach(() => {
  worker.resetHandlers();
  requests.length = 0;
});

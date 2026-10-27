import { setupWorker } from "msw/browser";
import { handlers } from "./apiHandlers";

export const worker = setupWorker(...handlers);

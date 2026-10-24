import type { ReactNode } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { AtomRegistry } from "effect/reactivity";
import { Theme } from "@astryxdesign/core/theme";
import { triangleLabTheme } from "../themes/triangle-lab.js";
import "../themes/triangle-lab.css";
import appCss from "../styles.css?url";

type RouterContext = {
  atomRegistry: AtomRegistry.AtomRegistry;
};

const directionContract = [
  "THESIS: A compact hands-on test sheet lists three verified Triangle defects and three valid controls, then compares the expected and faulty outputs for the selected case.",
  "OWN-WORLD: Bright white exercise sheet, cobalt section bands, deep ink, precise answer boxes, and vermilion instructor marks.",
  "STORY: Choose one of six cases, edit three side values, run the faulty classifier, and compare its output with the rule-based oracle.",
  "FIRST VIEWPORT: A six-case list sits left; the active side inputs and triangle diagram sit above expected and observed results.",
  "FORM: The Marked Practical; assigned grounded form 6 of 7; seed 85ee714d.",
  "FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance",
].join("\n");

function DirectionContract() {
  const script = `document.body.insertBefore(document.createComment(${JSON.stringify(directionContract)}), document.currentScript);`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        <DirectionContract />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { title: "Triangle Test Lab" },
      {
        name: "description",
        content:
          "Run six Triangle test cases and compare expected results with a known faulty classifier.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: () => (
    <Theme theme={triangleLabTheme}>
      <Outlet />
    </Theme>
  ),
});

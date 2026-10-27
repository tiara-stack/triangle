import { createElement } from "react";
import { RegistryProvider } from "@effect/atom-react";
import { Theme } from "@astryxdesign/core/theme";
import { render } from "vitest-browser-react";
import { triangleLabTheme } from "../../src/themes/triangle-lab.js";
import { Route } from "../../src/routes/index";

export function renderLab() {
  const routeComponent = Route.options.component;
  if (!routeComponent) throw new Error("The Triangle Lab route has no page component.");

  return render(
    <RegistryProvider>
      <Theme theme={triangleLabTheme}>
        {createElement(routeComponent)}
      </Theme>
    </RegistryProvider>,
  );
}

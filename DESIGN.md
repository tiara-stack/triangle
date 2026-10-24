---
name: Triangle Test Lab
description: The Marked Practical, a compact test sheet for selecting and comparing Triangle cases.
colors:
  cobalt: "#2863de"
  cobalt-press: "#1748b4"
  correction: "#d8270d"
  expected: "#eaf8f8"
  observed: "#f8eaea"
  pass-ink: "#176c58"
  pass-wash: "#e8f6f3"
  paper: "#f5fafd"
  ink: "#0e0e3b"
  line: "#c3cbd8"
  muted: "#59617e"
  quiet: "#626e92"
  white: "#ffffff"
typography:
  headline:
    fontFamily: '"Sintony", sans-serif'
    fontSize: "clamp(24px, 2.4vw, 34px)"
    fontWeight: 700
    lineHeight: 1.12
  sheet-title:
    fontFamily: '"Sintony", sans-serif'
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.015em"
  product-name:
    fontFamily: '"Sintony", sans-serif'
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.025em"
  title:
    fontFamily: 'system-ui, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 750
    lineHeight: 1.05
  body:
    fontFamily: 'system-ui, "Segoe UI", sans-serif'
    fontSize: "17px"
    lineHeight: 1.55
  result:
    fontFamily: 'system-ui, "Segoe UI", sans-serif'
    fontSize: "36px"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  action:
    fontFamily: 'system-ui, "Segoe UI", sans-serif'
    fontSize: "18px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "0.045em"
  data:
    fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace'
    fontSize: "17px"
  utility-label:
    fontFamily: 'system-ui, "Segoe UI", sans-serif'
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.1
rounded:
  square: "0px"
  answer: "5px"
  selector: "6px"
  marker: "50%"
spacing:
  compact: "8px"
  group: "12px"
  grid-gap: "14px"
  inset: "16px"
  heading-gap: "28px"
  section-inset: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.answer}"
    padding: "0 16px"
    height: "61px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-press}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "#626b88"
    rounded: "{rounded.answer}"
    padding: "0 16px"
    height: "61px"
  input-side:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    padding: "0 14px"
    height: "58px"
  case-selector:
    backgroundColor: "#fbfdfe"
    textColor: "{colors.ink}"
    rounded: "{rounded.selector}"
    padding: "16px 14px 12px"
  case-selector-selected:
    backgroundColor: "{colors.expected}"
  result-expected:
    backgroundColor: "{colors.expected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    padding: "16px 34px"
  result-observed:
    backgroundColor: "{colors.observed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    padding: "16px 34px"
  status-passed:
    backgroundColor: "{colors.pass-wash}"
    textColor: "{colors.pass-ink}"
    padding: "4px 7px"
---

# Design System: Triangle Test Lab

## Overview

**Creative North Star: "The Marked Practical"**

The Marked Practical takes its character from a software-testing exercise sheet and an instructor's correction marks. Cool paper, deep ink, cobalt bands, editable answer boxes, and vermilion assertions keep the test itself prominent. A tagged case library loads the chosen sides into a compact workspace; expected and observed results stay together beneath the controls and triangle.

Compact sans lettering carries the sheet title and assertion labels. System text carries case names and controls; monospace carries side values and run history. Geometry is explanatory linework with labeled vertices and sides. The interface stays useful before the canvas is ready.

**Key Characteristics:**

- Cobalt bands organize the exercise; vermilion marks a failed assertion.
- Expected and observed values have separate, consistently ordered reading positions.
- Three defect examples, three valid examples, and session-only custom cases share one selectable library.
- Compact answer boxes and rounded controls sit inside a mostly flat, ruled sheet.
- The desktop workspace reflows into readable, stacked mobile panels.

This is a scan of the current implementation, direction seed `85ee714d`, built comp-first. The approved `triangle-01-marked-practical.png` comp governs desktop composition, lettering character, color, and materials; `.impeccable/build/spec.json` records its measured regions. The user later requested removal of the right margin note, the optional raw output panel, and the added explainer/pass-control sections. The six built-in examples and session-only custom cases now share a tagged library. Full-page desktop and mobile captures document the current implementation and responsive reflow. Sources are `src/styles.css`, its imported scaffold, `src/routes/__root.tsx`, `src/routes/index.tsx`, and both triangle components. Product scope remains in `PRODUCT.md`; this document records reusable visual decisions.

## Colors

The palette combines cool paper and navy ink with a clear blue action color and a red correction color. Frontmatter values preserve the implemented CSS palette.

### Primary

- Cobalt organizes the sheet header, primary action, active case marker, selection, and keyboard focus.
- Pressed cobalt darkens the primary hover state and supports passed workspace assertions.

### Secondary

- Correction vermilion identifies failed or modified cases, the failed assertion, invalid geometry, and the caret.
- Expected wash and observed wash distinguish the two comparison positions. The observed wash remains rose even for a passing result; it identifies the output column, not the verdict.
- Pass ink and pass wash identify passing runs in the optional history.

### Neutral

- Paper is the page ground; white is used for editable fields and diagram interiors on mobile.
- Deep ink carries headings, values, and valid triangle geometry.
- Rule gray divides regions. Muted ink carries supporting labels; quiet ink carries inactive status and counts.

**The evidence order Rule.** Expected precedes observed; a written assertion and drawn mark identify the comparison outcome. Color supports that reading order.

## Typography

Sintony Bold gives the product name, sheet title, and assertion labels their compact sans character. Gudea Bold labels the desktop diagram. System UI text carries case names and controls; the data stack is reserved for side triples and ledger values, with tabular numerals for aligned data. The 11px utility-label role carries supporting case metadata and the tag filter.

The frontmatter records desktop baseline roles, not a universal scale ratio. Sheet titles scale with the measured desktop frame between 1001px and 1450px; the mobile sheet title uses `clamp(16px, 4vw, 22px)`. Mobile workspace headings use system UI at 17px with 1.25 line height. Desktop result values use the result role; mobile values use `clamp(17px, 5vw, 25px)` and wrap. Case names and controls use stronger weights than their supporting values.

Case names and side triples sit together in the selectable case library. The workspace keeps its headings short and direct.

## Layout

The desktop workspace uses the approved comp's 1586:992 frame, centered at a maximum width of 1586px. Its measured percentage positions are route-specific composition data, not a generic page grid. The case library occupies roughly the left 18.5%; the active sheet runs to roughly 82.5%. Clear space remains at right. Within the sheet, inputs and actions occupy the left half, geometry the right, followed by expected and observed results and an assertion. The optional raw classifier output has been removed per the user's scope direction. Thin rules preserve the reading sequence.

At 1000px and below, absolute regions become document flow. The header compacts and workspace panels use 12px gaps and 20px outer padding. Phones start with a compact “Change case” disclosure beside a one-tap “Add custom case” action; opening the disclosure gives the case list the full width and moves custom creation below it. Selecting a case closes the disclosure. The list follows page scroll instead of clipping inside a nested fixed-height viewport. The initial case filter selects both “Verified defects” and “Valid controls,” showing all six built-in cases; additional tags narrow the list, and the case count says how many cases are available or shown by the active filters. Batch selection stays inside a “Batch tools” disclosure, and batch checkboxes appear while it is open. On desktop, custom-case creation and batch actions share a “Custom and batch tools” disclosure. Built-in side values are visibly fixed; a custom case starts from those values and can be edited. The side inputs and Run/Restore actions follow the sheet title; the result panel follows the form and comes before the triangle diagram. Before the first run, the active defect case shows a short “What this case checks” rationale; expected-result guidance links to download the Lesson 3 PDF containing the Triangle problem, and the result panel identifies Expected as the triangle-rule answer and Observed as the faulty classifier’s output. Fields and actions are 48px high. The phone diagram keeps a wider aspect; desktop uses a larger near-square canvas to balance the sheet against the bottom history drawer. Expected and observed values stay side by side in the responsive result panel. At 560px and below, outer padding is 14px and panel padding is 13px; at 360px and below, the range hint shares the input heading. On short phones (360px wide and 640px high or less), the header becomes one line and the input panel keeps 12px below the actions. The result panel retains a visible lower edge in the first viewport. Side inputs stay at least 44px high and actions stay 48px high.

Run history stays session-only. Wide screens show its count in a bottom-anchored disclosure that opens a scrollable list; phones keep the history inline below the workspace. Each record shows the case, side triple, expected and observed values, and assertion status.

## Elevation & Depth

The sheet and run history stay flat. Rules, a cobalt band, and pale comparison fills separate regions without workspace shadows.

## Shapes

The sheet uses square structural edges. Small controls soften the geometry: answer fields and result boxes use the answer radius, selectors use the selector radius, and circular case numbers and assertion marks carry state. SVG marks use rounded stroke caps and joins. Keep the angular diagram legible against these quiet containers.

## Components

### Buttons

The primary Run Case button is a solid cobalt rectangle with white text and an inline SVG play mark. It submits the side-length form, including when Enter is pressed from a side field. Restore preset is a pale outlined companion with muted text. Baseline height is 61px; mobile height is 48px. Hover darkens the primary button and shifts the secondary border and text toward cobalt. Pressing moves an enabled action down by 1px. Pending runs change the primary label to RUNNING and disable both actions and the numeric fields, with opacity 0.68 and a progress cursor.

Keyboard focus uses a 3px cobalt outline offset by 3px across buttons and inputs. Preserve this independently of hover.

### Inputs / Fields

Three labeled number fields retain visible native steppers. A hint beside SIDE LENGTHS states “Whole numbers, 1–200.” Each field accepts integer steps with those bounds, and client validation repeats the constraints before a run. A nearby vermilion message identifies the invalid side and required range while preserving the entered value. White fill, a thin cool-gray border, and tabular numbers make the fields read as editable answers. Desktop fields are 58px high with 24px numbers; mobile fields are 48px high with 18px numbers. Focus changes the field border to cobalt as well as showing the shared outline.

### Navigation

Case selectors are buttons with pressed semantics, a numbered circle, side triple, and written status. The tag filter groups examples by `example:defect` and `example:success`, exposes `custom` cases, and includes any additional user tags. The built-in defect names remain plain language: “a and c match,” “Short sides sum to long,” and “Valid 200 rejected.” Thin cool outlines keep inactive selectors legible; active selection uses a pale expected wash, a light blue border, and a cobalt number circle. Hover adds a pale blue-gray fill and a 1px upward shift. Not-run and modified statuses use an outlined circle; failure and pass use authored circled cross and check SVGs. Modified status is explicit text. Each case keeps its own edited values and latest comparison when the learner switches cases; “Restore preset” returns that case's saved triple. A focus-visible “Skip to workspace” link moves keyboard users past the case library to the workspace title.

### Custom case dialog

“Add case” saves the current three side values with a required name and optional comma-separated tags. Every new case receives the `custom` source tag automatically. The native modal dialog keeps this authoring flow out of the worksheet until requested; focus and Escape behavior come from the browser dialog element. Custom cases exist for the current session and appear in the custom filter and any matching tag filters.

### Comparison and assertion

The expected answer appears first in a cool wash and the observed answer second in a rose wash. The internal NotATriangle output is displayed as “Not a triangle.” Mobile comparison labels align at the top when one value wraps. Before a learner runs a case, the result panel identifies Expected as the triangle-rule answer and Observed as the faulty classifier’s output; after a run, the values appear with a circled cross or check and a written failure or pass. No result is preloaded. The live status announces the expected and observed values whenever a saved result is active. Editing a case clears its previous comparison and marks that case Modified; its edited values remain when switching away and back. Restore preset returns the case to its starting values and restores its prior recorded comparison if that preset has already been run. Loading or request errors use the assertion region rather than an unrelated overlay. Preserve the distinction between a known program defect and a failed request.

The six built-in examples are `(2, 1, 2)`, `(1, 2, 1)`, `(1, 200, 200)`, `(3, 3, 3)`, `(4, 4, 5)`, and `(3, 4, 5)`. `PRODUCT.md` owns their domain meaning.

### Diagram

The diagram uses React Three Fiber with Drei Line and Text in an orthographic, transparent canvas rendered on demand. Valid geometry is computed from the side lengths, scaled uniformly to fit, and each edge label identifies its variable and value, such as `a=3`. Camera zoom adapts to the diagram box height so the triangle apex and side labels remain inside at intermediate desktop sizes. Side labels retain a safe inset from the diagram boundary, and the accessible description names the same variable-to-value mapping. Near-boundary triangles stay visibly narrow or flat instead of being widened. Triples that cannot close into a triangle show their three side lengths as separate proportional vermilion bars labeled with their variables and values, plus a "No triangle" label. Incomplete side values show a short prompt instead of a shape.

An SVG is visible during server rendering, lazy loading, and unsupported WebGL. It uses the same scaled geometry and side bars as the canvas. It fades out only after the canvas reports ready, while the canvas fades in over 160ms. The parent exposes a descriptive image label with the side ratios and non-triangle state; the renderers are hidden from assistive technology. The diagram is functional geometry, not a decorative illustration.

### Run history

The run history stays session-only, with an empty state before the first run. On wide screens, a bottom-anchored disclosure keeps the session count visible and opens a scrollable list of run records. On narrow screens, the same history remains inline beneath the workspace. Each record shows the case, input triple, expected value, observed value, and written assertion status. Pass/fail badges belong to evidence rows.

The history starts empty. Completed runs append session-only records; selecting or resetting a case does not erase history. Custom cases and the case catalog also stay in the current session. A writable Effect Atom run action owns pending and error state while its Effect program builds a typed `HttpClientRequest`, sends it through Effect HttpClient to `/api/triangle/run`, and decodes the response with Effect Schema. The route adapts TanStack's Web request to Effect `HttpServerRequest`, decodes it and evaluates the faulty classifier in Effect, then creates an Effect `HttpServerResponse` before adapting back to Web `Response`. Effect Atom also owns the case catalog and current tag filter through the Start/SSR hydration bridge.

### Motion

The failed correction cross draws over 360ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Routine color and border transitions last 150ms; button press movement lasts 120ms. Case selectors rise 1px on hover. Reduced-motion CSS collapses animations and transitions to 0.01ms.

## Do's and Don'ts

### Do:

- Do keep expected before observed and name both in text.
- Do pair assertion color with a written verdict and a drawn mark.
- Do keep numerical fields visibly editable, labeled, and keyboard accessible.
- Do preserve the diagram's proportional side lengths, labeled SVG fallback, and clear non-triangle state.
- Do keep run counts and recorded rows consistent with the current session.

### Don't:

- Don't restore the removed right margin note or its heading.
- Don't promote the shipped eyebrow or kicker styling into reusable tokens or component recipes.
- Don't use monospace for general instructions or headings.
- Don't replace explanatory triangle geometry with a decorative illustration.
- Don't treat a preloaded result as a recorded run.

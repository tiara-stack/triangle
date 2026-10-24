# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TanStack Start, Effect TS v4, Effect Atom, `@typeonce/effect-machine`, Immer, React Three Fiber, and Drei. Use the sibling `tiara-stack/packages/start-atom` SSR and hydration bridge for Effect Atom. The Effect Machine owns case data, run workflows, form drafts and errors, and page-level presentation state; its Atom bridge feeds React. Use Immer in pure state reducers for nested updates. Do not add TanStack Query for the same state.

## Users

People who need to see how to test the defect described in the sibling `testing_hw` lesson materials.

## Product Purpose

A hands-on web test lab where learners select a built-in Triangle example or create a custom case, run it, and compare the expected result with the faulty program's observed result. The starting catalog shows all three verified defects and one valid control for each classification type.

## Positioning

The lab centers on a tagged case library and one active workspace for editing and expected-versus-observed comparison. The built-in examples stay easy to distinguish from session-only custom triples.

## Operating Context

The demo is tied to the software testing materials in `/opt/data/testing_hw`. Lesson 3 defines the Triangle problem with three integer side lengths, `a`, `b`, and `c`, each from 1 through 200, and the outcomes Equilateral, Isosceles, Scalene, or NotATriangle.

## Capabilities and Constraints

- The requested platform is web.
- Learners can run built-in cases with fixed side lengths or create editable custom cases, then compare expected and observed results.
- The case list covers all three numeric defects documented in the sibling assignment materials.
- The same list includes valid equilateral, isosceles, and scalene controls that should pass.
- Learners can save the current valid-range side triple as a named custom case and add optional comma-separated tags.
- Creating a custom case starts with the active side values; built-in cases remain fixed.
- The tag filter includes `example:defect`, `example:success`, `custom`, and any custom tags; the visible case list is derived from the selected filter.
- The initial case filter selects both `example:defect` and `example:success`, showing all six built-in cases before custom tags are applied.
- Custom cases and their edits stay in the current session.
- The workspace shows three bounded integer inputs, a triangle diagram, and expected and observed results.
- Expected-result guidance links to the Lesson 3 PDF containing the Triangle problem.
- Runs are recorded in a session-only history shown after the first run.
- The requested stack is TanStack Start, Effect TS v4, Effect Atom, `@typeonce/effect-machine`, React Three Fiber, and Drei. Use the sibling `tiara-stack/packages/start-atom` SSR and hydration bridge for Effect Atom. The machine owns case data, filters, run transitions, form drafts and validation, and page-level presentation state; its Atom bridge exposes state to React.
- The triangle diagram is rendered through a React Three Fiber canvas with a static SVG fallback for server render and unsupported WebGL.
- Valid triangles are drawn with proportional side lengths and fitted uniformly to the diagram area. Non-triangle triples show the three measured sides separately without closing them into a triangle.
- Keep the lab surface to the case list, side inputs, triangle diagram, results, and optional run history.
- The assignment's optional malformed-text parsing finding is outside its stated integer-input domain.

## Evidence on Hand

- `/opt/data/testing_hw/lesson_3/lesson_3.md` describes the Triangle problem and its input and output rules.
- `/opt/data/testing_hw/assignment_1/verified_defects.md` documents three verified cases: `(2, 1, 2)` expected Isosceles but observed Scalene; `(1, 2, 1)` expected NotATriangle but observed Scalene; and `(1, 200, 200)` expected Isosceles but observed an out-of-range result.
- `/opt/data/testing_hw/assignment_1/README.md` explains the oracle-based defect tester and notes that the malformed-text parsing finding is outside the assignment's integer-input requirement.

## Product Principles

- Show the expected result alongside the observed result for each demonstrated case.
- Keep examples tied to the Triangle problem's stated input domain unless the scope changes.
- Keep the connection between each demo case and its lesson or assignment source clear.

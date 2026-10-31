"""Build the six-page Qase demonstration handout. Requires reportlab and Pillow."""

from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT.parent / "triangle-qase-quick-guide.pdf"
PAGE_W, PAGE_H = A4
MARGIN = 36
WIDTH = PAGE_W - 2 * MARGIN
INK = colors.HexColor("#18243B")
MUTED = colors.HexColor("#56657A")
PURPLE = colors.HexColor("#6453CC")
LIGHT = colors.HexColor("#F2F3FA")
LINE = colors.HexColor("#D9DFE9")
PASS = colors.HexColor("#087D69")
FAIL = colors.HexColor("#B42338")
WHITE = colors.white

for name, file in [
    ("Guide", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("Guide-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("Guide-Mono", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
]:
    pdfmetrics.registerFont(TTFont(name, file))
pdfmetrics.registerFontFamily("Guide", normal="Guide", bold="Guide-Bold")

c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
c.setTitle("Triangle Test Lab: Qase quick guide")
c.setAuthor("Triangle Test Lab")
c.setSubject("Four-case demonstration: Qase repository, manual run, automated results")


def paragraph(text, x, top, width, size=10, leading=14, color=INK, bold=False):
    style = ParagraphStyle(
        "guide", fontName="Guide-Bold" if bold else "Guide", fontSize=size,
        leading=leading, textColor=color, alignment=TA_LEFT, spaceAfter=0,
        allowWidows=0, allowOrphans=0,
    )
    p = Paragraph(text, style)
    _, height = p.wrap(width, PAGE_H)
    p.drawOn(c, x, top - height)
    if top - height < 42:
        raise ValueError(f"Text overflow below footer: {text[:90]}")
    return top - height


def link(label, url):
    return f'<link href="{escape(url)}" color="#6453CC"><u>{escape(label)}</u></link>'


def footer(page):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, 31, PAGE_W - MARGIN, 31)
    c.setFillColor(MUTED)
    c.setFont("Guide", 7)
    c.drawString(MARGIN, 18, "Triangle Test Lab  /  Qase demo  /  28 Oct 2026")
    c.drawRightString(PAGE_W - MARGIN, 18, f"{page} / 6")


def header(page, section, title, subtitle):
    c.setFillColor(PURPLE)
    c.setFont("Guide-Bold", 8.5)
    c.drawString(MARGIN, 808, f"{page:02d}   {section.upper()}")
    y = paragraph(title, MARGIN, 786, WIDTH, size=25, leading=30, bold=True)
    y = paragraph(subtitle, MARGIN, y - 9, WIDTH, size=10, leading=14, color=MUTED)
    return y - 18


def image(path, x, top, width, border=True):
    im = Image.open(path)
    height = width * im.height / im.width
    c.drawImage(str(path), x, top - height, width=width, height=height, mask="auto")
    if border:
        c.setStrokeColor(LINE)
        c.setLineWidth(0.65)
        c.rect(x, top - height, width, height)
    return top - height


def number_step(number, title, body, top, width=WIDTH, x=MARGIN):
    c.setFillColor(PURPLE)
    c.circle(x + 9, top - 9, 9, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Guide-Bold", 9)
    c.drawCentredString(x + 9, top - 12, str(number))
    y = paragraph(title, x + 28, top, width - 28, size=10, leading=14, bold=True)
    y = paragraph(body, x + 28, y - 3, width - 28, size=9.4, leading=13, color=MUTED)
    return y - 12


def note(top, title, text, height, color=PURPLE):
    c.setFillColor(LIGHT)
    c.roundRect(MARGIN, top - height, WIDTH, height, 7, stroke=0, fill=1)
    c.setFillColor(color)
    c.roundRect(MARGIN, top - height, 3, height, 1.5, stroke=0, fill=1)
    y = paragraph(title, MARGIN + 13, top - 11, WIDTH - 26, size=10, leading=14, bold=True)
    paragraph(text, MARGIN + 13, y - 3, WIDTH - 26, size=9, leading=12.5)


def cell(text, bold=False, color=INK, size=8.9):
    return Paragraph(text, ParagraphStyle(
        "cell", fontName="Guide-Bold" if bold else "Guide", fontSize=size,
        leading=12, textColor=color,
    ))


def draw_table(data, widths, top, heights=None, header_row=True):
    table = Table(data, colWidths=widths, rowHeights=heights, hAlign="LEFT")
    styles = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
    ]
    if header_row:
        styles.append(("BACKGROUND", (0, 0), (-1, 0), INK))
        styles.append(("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]))
    else:
        styles.append(("BACKGROUND", (0, 0), (0, -1), LIGHT))
    table.setStyle(TableStyle(styles))
    _, height = table.wrap(WIDTH, PAGE_H)
    table.drawOn(c, MARGIN, top - height)
    return top - height


# Setup page: a reader can reproduce the reporting connection.
y = header(
    1, "Before the demonstration", "Set up Qase and GitHub",
    "For a new audience: prepare access and reporting once. The existing Triangle project already has the apps and tests.",
)
y = number_step(1, "Sign in and choose a Qase project", 'Create a Qase account and workspace, or accept a workspace invitation. Open Projects. Reuse Triangle, code TR, or create a project and record its code. You need permission to create cases and runs.', y)
y = paragraph("Project = the product. Suite = a group of cases. Case = inputs, steps and expected result. Run = one execution with results.", MARGIN + 28, y, WIDTH - 28, size=9, leading=13, color=MUTED) - 15
y = number_step(2, "Activate the reporter apps and create tokens", 'Open Qase Apps. Open Vitest and activate it if needed. In Access tokens, create a token. Repeat for Playwright. Keep the two tokens separate so their results appear under the corresponding app.', y)
y = number_step(3, "Use the existing GitHub workflow", f'Open {link("tiara-stack/triangle", "https://github.com/tiara-stack/triangle")}, or fork it to your own account and enable Actions. You need permission to run workflows and configure repository secrets and variables.', y)
y = number_step(4, "Add the repository variable and two secrets", 'In your GitHub repository, open Settings > Secrets and variables > Actions. Use the Variables tab for the project code and the Secrets tab for the two tokens.', y)
setup_rows = [[cell("GitHub setting", True, WHITE, 8.3), cell("Name", True, WHITE, 8.3), cell("Value", True, WHITE, 8.3)],
 [cell("Repository variable"), cell("QASE_TESTOPS_PROJECT", size=8), cell("TR, or your project code")],
 [cell("Repository secret"), cell("QASE_VITEST_API_TOKEN", size=8), cell("Vitest app token")],
 [cell("Repository secret"), cell("QASE_PLAYWRIGHT_API_TOKEN", size=8), cell("Playwright app token")]]
y = draw_table(setup_rows, [112, 211, WIDTH - 323], y, [30, 36, 36, 36]) - 15
y = paragraph('A shared personal token can instead use the single secret QASE_TESTOPS_API_TOKEN. For separate app tokens, use the two secret names above. Never paste a real token into a case, slide, or repository file.', MARGIN, y, WIDTH, size=9, leading=13, color=MUTED) - 15
note(y, "Check the connection before presenting", 'Launch Performative defect detection once. Its configuration step should say "Qase TestOps reporting is enabled." Verify four results in each new Qase run. The classifier assertions should fail in two cases per suite. Local setup commands are on page 6.', 91)
y -= 104
paragraph('Setup references: ' + link("Qase first steps", "https://docs.qase.io/en/articles/5563688-getting-started") + ' / ' + link("Reporter tokens", "https://developers.qase.io/docs/prerequisites") + ' / ' + link("Playwright app", "https://developers.qase.io/docs/playwright") + ' / ' + link("GitHub secrets", "https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets"), MARGIN, y, WIDTH, size=7.5, leading=10.5, color=MUTED)
footer(1)
c.showPage()

# Answer sheet: expected values and current faulty output.
y = header(
    2, "The four-case answer sheet", "Test four triangle cases",
    "Use Qase to define the expected result, record a manual run, and review automated results.",
)
y = paragraph(
    f'{link("Open Triangle Lab", "https://triangle.theerapakg.moe/")}'
    f'   |   {link("Open Qase project TR", "https://app.qase.io/project/TR")}'
    f'   |   {link("Lesson 3 specification", "https://triangle.theerapakg.moe/lesson-3-triangle-problem.pdf")}',
    MARGIN, y, WIDTH, size=9, leading=13,
) - 16

headers = ["Case", "Inputs<br/>a, b, c", "Expected<br/>in Qase", "Actual classifier<br/>output", "Record"]
data = [[cell(h, bold=True, color=WHITE, size=8.4) for h in headers]]
rows = [
    ("01  a and c match", "2, 1, 2", "Isosceles", "Scalene", "Failed", FAIL),
    ("02  200 is allowed", "1, 200, 200", "Isosceles", "Value is<br/>out of range", "Failed", FAIL),
    ("03  Equilateral", "3, 3, 3", "Equilateral", "Equilateral", "Passed", PASS),
    ("04  201 is rejected", "201, 1, 1", "Value is<br/>out of range", "Value is<br/>out of range", "Passed", PASS),
]
for title, values, expected, actual, status, color in rows:
    data.append([cell(title, bold=True), cell(values), cell(expected), cell(actual), cell(status, bold=True, color=color)])
y = draw_table(data, [130, 76, 103, 138, WIDTH - 447], y, [34, 51, 51, 51, 51])
y = paragraph(
    "Allowed side lengths are whole numbers from 1 through 200, including 200. "
    "Three equal sides are Equilateral. A valid triangle with two equal sides is Isosceles.",
    MARGIN, y - 13, WIDTH, size=9, leading=13, color=MUTED,
) - 14

c.setFillColor(LIGHT)
c.roundRect(MARGIN, y - 43, WIDTH, 43, 6, stroke=0, fill=1)
paragraph("2 passed + 2 failed", MARGIN + 12, y - 9, 220, size=12, leading=15, bold=True)
paragraph("Expected in the manual run and in each automated suite.", MARGIN + 12, y - 25, WIDTH - 24, size=8.5, leading=11, color=MUTED)
y -= 60
y = image(ASSETS / "lab-ac-input-result.png", MARGIN, y, WIDTH)
y = paragraph(
    "Current demo build: inputs 2, 1, 2 produce Scalene. Record that actual value in Qase and mark this case Failed.",
    MARGIN, y - 7, WIDTH, size=8.1, leading=11, color=MUTED,
) - 14
paragraph(
    "For a short presentation, prepare the four cases first. Start the automated job, then run the manual checks while it works. "
    "A convenient manual order is 03, 01, 02, 04.",
    MARGIN, y, WIDTH, size=9.2, leading=13,
)
footer(2)
c.showPage()

# Page 2: a worked manual case, using the user's signed-in Qase screenshot.
y = header(
    3, "Qase repository", "Register the four cases",
    "Prepare these once in the Triangle project, code TR. Use four separate manual cases.",
)
y = image(ASSETS / "qase-create-menu-crop.png", MARGIN, y, WIDTH)
y = paragraph("Your Triangle repository. Use Manual test, then Create manually.", MARGIN, y - 7, WIDTH, size=8, leading=11, color=MUTED) - 18
y = number_step(1, "Open Repository and create a suite", 'Name the suite "Triangle demo - four cases".', y)
y = number_step(2, "Open the full case editor", 'Use Manual test, then Create manually. Choose this suite, leave Status as Actual, choose Manual for Automation status, and set Type to Functional. Under Test Case Steps, use Classic and New step.', y)
y = number_step(3, "Enter the case content and save", "Use the example below for case 01. The other three use the same action, with their own inputs and expected result from page 2.", y)

y = paragraph("Example content for case 01", MARGIN, y - 3, WIDTH, size=12, leading=16, bold=True) - 10
form_rows = [
    [cell("Title", bold=True), cell("Classifies a = c as Isosceles")],
    [cell("Preconditions", bold=True), cell("Triangle Lab is open. Select Enter sides only.")],
    [cell("Classic step / Action", bold=True), cell("Enter the three side lengths, click Run test, and read the classifier output.")],
    [cell("Data", bold=True), cell("a = 2; b = 1; c = 2")],
    [cell("Expected result", bold=True, color=PURPLE), cell("Isosceles", bold=True, color=PURPLE)],
]
y = draw_table(form_rows, [130, WIDTH - 130], y, [39, 45, 56, 39, 39], header_row=False)
y = paragraph(
    'Use "Save and create another" to add the remaining cases. Suggested titles: "Accepts 200 as an allowed side length", '
    '"Classifies equal sides as Equilateral", and "Rejects a side length of 201".',
    MARGIN, y - 16, WIDTH, size=9.2, leading=13,
) - 16
note(y, "Use the specification for Expected result", "Qase assigns a case ID with the TR prefix. Keep those IDs. Record the faulty output in the run's Comment field.", 70)
footer(3)
c.showPage()

# Page 3: execution and result entry.
y = header(
    4, "Manual execution in Qase", "Record a manual run",
    "The lab shows the classifier's actual output. Your Qase case supplies the expected result.",
)
y = number_step(1, "Start an express run", 'In Repository, select the four cases and click Run. Name it "Triangle demo - Manual" and start it.', y)
y = number_step(2, "Open the run wizard", "Open any case in the run, or use Open Wizard. Keep Triangle Lab open in a second tab.", y)
y = number_step(3, "Execute the case in Triangle Lab", "Select Enter sides only. Enter its a, b, c values and click Run test. Read the value under Observed / Faulty classifier.", y)
y = number_step(4, "Record the result in Qase", "Compare that value with the case's expected result. Use Passed when they match and Failed when they differ. Add a brief comment and a screenshot for each failure.", y)

top = y - 6
left_w = 221
right_x = MARGIN + left_w + 20
right_w = WIDTH - left_w - 20
paragraph("Example failure comment", MARGIN, top, left_w, size=12, leading=16, bold=True)
paragraph(
    "Inputs: a=2, b=1, c=2.<br/><br/>Expected: Isosceles.<br/>Actual: Scalene.<br/><br/>The classifier missed the equal a and c sides.",
    MARGIN, top - 28, left_w, size=10, leading=15,
)
paragraph(
    "Choose Failed, add the comment, attach the lab screenshot, and save the result. A successful HTTP request still needs the correct classification to pass.",
    MARGIN, top - 172, left_w, size=9.2, leading=13, color=MUTED,
)
bottom = image(ASSETS / "qase-add-result.png", right_x, top, right_w)
paragraph("Qase Add result dialog. Official help example, cropped to show the result fields.", right_x, bottom - 7, right_w, size=7.6, leading=10.5, color=MUTED)
y = min(bottom - 41, top - 250) - 18
note(y, "Finish the four cases and complete the run", "Cases 01 and 02 should be Failed. Cases 03 and 04 should be Passed. The completed manual run should show 2 passed and 2 failed.", 76, color=FAIL)
footer(4)
c.showPage()

# Page 4: current automation trigger and the corresponding Qase reports.
y = header(
    5, "Automation results in Qase", "Trigger once, review two runs",
    "GitHub Actions executes the current tests. The installed reporters send their results to project TR.",
)

box_w = (WIDTH - 32) / 3
labels = [
    ("GitHub Actions", "Run workflow on main"),
    ("Vitest + Playwright", "4 cases in each suite"),
    ("Qase Test Runs", "Two result reports"),
]
for i, (title, body) in enumerate(labels):
    x = MARGIN + i * (box_w + 16)
    c.setFillColor(LIGHT)
    c.roundRect(x, y - 66, box_w, 66, 6, stroke=0, fill=1)
    paragraph(title, x + 10, y - 12, box_w - 20, size=10, leading=14, bold=True)
    paragraph(body, x + 10, y - 34, box_w - 20, size=8.2, leading=11.5, color=MUTED)
    if i < 2:
        c.setStrokeColor(PURPLE)
        c.setLineWidth(1.2)
        x0 = x + box_w + 3
        c.line(x0, y - 33, x0 + 10, y - 33)
        c.line(x0 + 7, y - 36, x0 + 10, y - 33)
        c.line(x0 + 7, y - 30, x0 + 10, y - 33)
y -= 84
y = number_step(1, "Launch the existing workflow", f'In your repository or fork, open {link("Performative defect detection", "https://github.com/tiara-stack/triangle/actions/workflows/performative.yml")}. Click Run workflow, choose main, and click Run workflow again.', y)
y = number_step(2, "Confirm that the tests ran and reports uploaded", 'Open the new job. In its test step, check that failures concern the a = c and valid-200 cases, and confirm that Qase reporting is enabled and that the reporters uploaded results. These assertion failures make the workflow red.', y)
y = number_step(3, "Inspect the newest Qase results", 'In Triangle / Test Runs, open the newest runs ending in "Direct Effect" and "Browser UI". Open a failed result to show its assertion details. Each run should contain four checks. If Qase still says In Progress after all four have results, use Complete to close the run.', y)

y = image(ASSETS / "qase-run-table.png", MARGIN, y - 2, WIDTH)
y = paragraph("Actual Browser UI report: 2 passed and 2 failed. " + link("Direct Effect report", "https://app.qase.io/run/TR/dashboard/15") + " / " + link("Browser UI report", "https://app.qase.io/run/TR/dashboard/16"), MARGIN, y - 7, WIDTH, size=8.1, leading=11.5, color=MUTED) - 13
y = paragraph(
    f'These totals were verified in {link("workflow run 40702371101", "https://github.com/tiara-stack/triangle/actions/runs/40702371101")} '
    'at revision 785557b. A new launch produces new run IDs. Across the two runs, the four scenarios appear twice, for eight results total.',
    MARGIN, y, WIDTH, size=8.1, leading=11.5, color=MUTED,
) - 13
note(
    y, "Case IDs and shared history",
    "The current code has no explicit Qase case IDs. Automated results match by title and suite path, so they can appear separately from the manual cases you created. Link the real Qase IDs in both test files to share one case history. If first-run failing cases are absent, enable case auto-creation for all statuses or link IDs.",
    104,
)
y -= 118
paragraph(
    "References: "
    + link("Qase cases", "https://docs.qase.io/en/articles/5563704-test-cases")
    + "  /  " + link("Qase runs", "https://docs.qase.io/en/articles/5563702-test-runs")
    + "  /  " + link("Linking tests", "https://developers.qase.io/docs/linking-tests")
    + "  /  " + link("GitHub manual trigger", "https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow")
    + "<br/>Image credit: " + link("Qase Help Center, GitHub integration", "https://docs.qase.io/en/articles/6417206-github")
    + ". Other Qase screenshots are from project TR. Lab image is from the current demo build.",
    MARGIN, y, WIDTH, size=7.3, leading=10, color=MUTED,
)
footer(5)
c.showPage()

# Optional appendix: reproduce the existing repository locally.
y = header(
    6, "Optional local setup", "Run the same tests locally",
    "Use this when following along on your own machine. Manual testing only needs a browser and Qase.",
)
y = number_step(1, "Install the tools and get the repository", 'Use Git, Node.js 22.18 and pnpm 11.9.0 to match this repository\'s workflow. Clone the repository or your fork, then install its locked dependencies.', y)
commands = "git clone https://github.com/tiara-stack/triangle.git<br/>cd triangle<br/>pnpm install --frozen-lockfile<br/>node node_modules/@playwright/test/cli.js install chromium"
c.setFillColor(LIGHT)
c.roundRect(MARGIN, y - 86, WIDTH, 86, 6, stroke=0, fill=1)
paragraph(commands, MARGIN + 12, y - 12, WIDTH - 24, size=8.5, leading=15)
y -= 101
y = paragraph("On Linux, Chromium may also require OS packages. Use the Playwright install command with --with-deps chromium if the browser reports missing libraries.", MARGIN, y, WIDTH, size=8.8, leading=12.5, color=MUTED) - 16
y = number_step(2, "Create .env.local for Qase reporting", 'Copy .env.local.example to .env.local. Fill in the project code and app tokens below. Leave QASE_TESTOPS_API_TOKEN empty when using the two app tokens. This file is ignored by Git.', y)
env = "QASE_TESTOPS_PROJECT=TR<br/>QASE_VITEST_API_TOKEN=&lt;your Vitest app token&gt;<br/>QASE_PLAYWRIGHT_API_TOKEN=&lt;your Playwright app token&gt;"
c.setFillColor(LIGHT)
c.roundRect(MARGIN, y - 72, WIDTH, 72, 6, stroke=0, fill=1)
paragraph(env, MARGIN + 12, y - 12, WIDTH - 24, size=8.6, leading=15)
y -= 88
y = number_step(3, "Run both suites and publish their results", 'Run pnpm test:performative:qase. The script loads .env.local with Effect ConfigProvider, starts Vitest, then Playwright, and selects each reporter\'s token. Playwright builds and starts the local app automatically.', y)
y = paragraph('For a private rehearsal without uploading results, use QASE_MODE=off pnpm test:performative. A two-failure exit is expected while the two classifier defects remain.', MARGIN + 28, y, WIDTH - 28, size=9.2, leading=13, color=MUTED) - 18
note(y, "Find the code when adapting this exercise", 'Direct tests: tests/performative/triangle.test.ts<br/>UI tests: tests/e2e/performative.spec.ts<br/>Reporter selection: vitest.node.config.ts and playwright.config.ts<br/>Token routing and local config: scripts/performative-test.ts<br/>GitHub trigger: .github/workflows/performative.yml', 116)
y -= 131
paragraph('The two reporters are already installed and enabled conditionally in these configs. Shell environment variables take precedence over .env.local. Current automated cases match by title and suite path; register manual cases separately unless you add real Qase case IDs to both test files.', MARGIN, y, WIDTH, size=9, leading=13, color=MUTED)
footer(6)
c.showPage()

c.save()
print(OUTPUT)

# Reusable Prompts (Codex/ChatGPT)

## 1) Generate structured data (JSON-LD)
You are a strict web SEO/structured data assistant.
Input: the Astro Content Collection resume JSON (I’ll paste it next).
Task: produce valid JSON-LD (Schema.org Person + Occupation + WorkExperience + CreativeWork) for my /resume page.
Constraints:
- Flatten dates as ISO.
- Include sameAs for site, LinkedIn, GitHub.
- Include work.metrics as “measuredProperty” entries when sensible.
Output: return only JSON (no prose).

## 2) Create Zod types from a YAML/JSON sample
You are a TypeScript domain modeler.
Given this resume sample (paste below), generate:
- Zod schemas for resume, work item, and project item.
- TypeScript types inferred from schemas.
- A narrow validator function `parseResume(input: unknown)`.
Return one .ts file.

## 3) Playwright smoke tests for a11y and nav
You are a Playwright test author.
Target routes: /, /resume, /projects.
Write tests that:
- Assert no 404s, a <h1> exists, and there are no obvious contrast issues (basic color checks on body and headings).
- Verify the Command Palette toggles with meta/ctrl+K and that "Export JSON" appears in results and is clickable.
Return a self-contained tests file.

## 4) Accessible Before/After slider
You are an accessibility-first React dev.
Implement a BeforeAfter<TSX> component that:
- Supports mouse, touch, and keyboard (left/right to adjust).
- Uses <input type="range"> with proper aria labels and roles.
- Accepts before/after URLs and alts.
Return a single TSX component plus minimal CSS classes.

## 5) Optimize print CSS for a 1-page A4 resume
You are a print CSS expert.
Generate CSS scoped to @media print that:
- Targets A4, narrow margins, no background.
- Sets a compact typographic scale for a dense 1-page resume.
- Avoids orphans/widows and prevents section cards from breaking across pages.
Return only CSS.

## 6) Lighthouse budget tuned for 300KB total
You are a performance SRE for front-end.
Return a `budgets.json` with:
- 300KB total, 90KB JS, 2.5s TTI budget.
- Comments explaining how to evolve budgets for case-study pages.

## 7) Command palette “actions” authoring
You are a product copywriter.
Given my resume JSON, propose 10 high-utility command palette actions with labels and hrefs.
Constraints:
- Include contact, exports, top 3 projects, and 2 deep links to timeline sections (hash anchors).
Output JSON array of {id,label,href}.

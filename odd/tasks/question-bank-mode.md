# Question bank mode (up to 100 cards)

Objective: allow decks of up to 100 flashcards and add an upload mode that turns an exam
question PDF into one card per numbered question, with the AI only paraphrasing the
question and the answer taken verbatim from that question's own block.
Branch: `main`. Delivery: `ask-on-risk`. Verification: `npm run build --prefix backend`,
`npm run build --prefix frontend`, `npm run lint --prefix frontend` (no test runner).

## Specs

- **S1** — `cardCount` accepts `1..100`. Error text stays `cardCount must be between 1 and 100`.
- **S2** — `POST /api/v1/decks/generate` accepts a `questionBank` boolean field (multipart,
  `true`/`1`/`on`). When true, the uploaded PDF is read in question-bank mode instead of
  plain-text mode.
- **S3** — Question-bank mode returns one card per numbered question found in the PDF
  (`N.` / `N)`), in document order, without mixing content between numbered blocks.
- **S4** — For each numbered block, the AI rewrites only the question ("un poco diferente"),
  keeping the meaning, the terminology, and the difficulty. The answer is never
  model-written: it is the block's own text.
- **S5** — Multiple-choice blocks (`●a.` … `●e.`) mark a correct answer when the option line
  is underlined, or — when no option in the block is underlined — when the option text ends
  with a literal `V`. An option ending in `F` is incorrect. Blocks where several options are
  marked produce a card whose answer lists every correct option.
- **S6** — If the AI fails to rewrite a block, the original question text from the PDF is
  used. No card is ever dropped or invented.
- **S7** — Frontend uploader exposes a question-bank toggle (default off) and card counts
  `10, 20, 30, 40, 50, 75, 100`; the toggle is sent with the upload.
- **S8** — `docs/project-context.md` and `docs/DEPLOYMENT.md` document the new mode, the new
  runtime dependencies, and the 100-card cap.

## Tasks

- [x] T1 (S1) Raise the deck card-count cap to 100. Route: inline.
- [x] T2 (S3, S5) Question-bank reader: lines with underline flags + numbered-block parser. Route: inline.
- [x] T3 (S2, S3) Wire question-bank extraction through the PDF worker and the generate endpoint. Route: inline.
- [x] T4 (S4, S6) Paraphrase-only generator path. Route: inline.
- [x] T5 (S7) Frontend toggle, count options, i18n. Route: inline.
- [x] T6 (S8) Docs. Route: inline.

## Log

- **L1** (user, verbatim): "las preguntas tipo test las correctas las q estan subrayadas son las correctas
  hay preguntas donde varias respuestas pueden ser las correctas"
- **L2** (user, earlier): web must allow up to 100 cards; uploading the exam PDF must produce one card per
  numbered question; the AI must rephrase each question a little; concepts must never be mixed between
  sections; answers must be based on the PDF.
- **L3** decision: underlines are not in the text layer (no annotations, no `/BS`), so the underline flag is
  detected by rendering each page and scanning the pixel band 1-6 px below each text line's baseline for a
  dark horizontal run covering >50% of the line width. Validated against the source PDF: 60 underlined
  lines across 8 pages, matching the visual ground truth (Q14 and Q17 have all four options underlined).
- **L4** decision: answers are copied from the block, never model-written. This makes the
  "no mixing / no hallucination" rule structural instead of prompt-dependent.
- **L5** decision: the underline convention wins over `V`/`F` when both appear in the same block, because
  superscript extraction artifacts (`...incidenteV90`) would otherwise be read as a mark.

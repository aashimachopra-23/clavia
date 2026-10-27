# Clavia

## Run it

Nothing to install. Everything Clavia needs is in this folder.

**Just look at it:** open `dist/app.html` in Chrome, Safari or Edge. It is one
self-contained file: every script, style, icon, logo and photo is inside it.

**Work on it:** with Node 18 or later (no `npm install`, no packages):

```
node dev-server.mjs        # serves src/ at http://localhost:4325
node build.mjs             # rebuilds dist/ from src/ after you change anything
```

Good to know:

- **Fonts** (Geist, Spectral, Cormorant Garamond) load from Google Fonts. Offline,
  it still works, in the system fonts.
- **Uploading a .docx** loads a small reader (mammoth) from cdnjs the first time.
- **Your clicks are saved** in the browser (local storage, key `clavia:state`).
  Clear the site's data to start the demo fresh.
- Useful addresses: `#agents`, `#agents/build/done`, `#playbooks`, `#vault`,
  `#requests`, press **X** for the agents nav.

What is in the folder:

| Path | What it is |
|---|---|
| `src/` | The app: `index.html`, the scripts, styles and `assets/` (icons, logos, photos) |
| `dist/` | The built, single-file version (`app.html`) |
| `build.mjs`, `sprite.mjs`, `dev-server.mjs` | Build, icon sprite and local server (Node only) |
| `handoff/`, `Clavia brand and motion/` | The brand and logo motion files |
| `report/` | A design review report (HTML and PDF) |
| `BUILD.md`, `research.md`, `PLAYBOOK-RESEARCH.md` | How it was designed and built |
| `export-reviews.py` | Optional. Regenerated `src/reviews-data.js` from the separate Jev project; not needed to run Clavia |


The legal product. Forked on 25 Sep 2026 from `Experiments/artefacts` (the
UnifyApps workspace), including that repo's uncommitted working tree, so it
starts with everything the workspace already does and grows legal on top.

## What it inherits

Everything below is working code on day one. The plan is to reuse the frames and
reshape the content, not rebuild them.

| Concept | Where it lives | What it gives Clavia |
|---|---|---|
| Shell | `src/index.html`, `src/styles.css` | Rail (collapses to 56px), view slot, split artifact panel, design tokens, motion |
| Chat | `src/app.js` (`thread`, `home`), `src/composer.js` | Home ask box, threads, the composer with + menu, @ and / triggers, pills, model switcher |
| Trace | `src/trace.js` | What the assistant did before it answered. A new source is one `SOURCES` entry |
| Artifacts | `src/artifacts.js`, `src/artifacts.css` | Deck, sheet, doc and app renderers, the library, provenance, versions, sharing |
| Meetings | `src/app.js` (`meetingsView`) | Meeting list, the meeting page, notes templates, recording |
| Do list, agents, routines | `src/app.js` | Rail items and their views |

`planFor()` in `src/app.js` decides which trace steps a prompt triggers. It is
still the seam where a real backend (or legal-specific retrieval) goes.

## What has changed so far

- Title and home link label read **Clavia**.
- localStorage key is `clavia:state`, so Clavia and the workspace never share
  saved state.
- Dev server defaults to port 4325.

The mark is the Clavia quill from the identity study ("Clavia Marks" artifact),
ported to `src/quill.js` + `src/quill.css`: the sidebar lockup with the Cormorant
Garamond wordmark, the New Chat glyph, the chat's working indicator, the
playbook builder and the tab icon. `quillEl(state, { tone })` — states idle,
greet, work, done.

Still inherited as-is: every piece of
sample content (people, companies, meetings, decks). Swapping those for legal
content is the next step.

## Playbooks

`src/playbooks.js` + `src/playbooks.css`, data in `src/playbooks-data.js`
(the five playbooks from `Experiments/jev/playbooks`, ported as they were).

- `#playbooks` is the list: full width, a table of Name · Status (Live, Draft,
  Archived) · Owner (real photo) · Last updated, sortable by any column, with
  status tabs and search. ⋯ on a row: View, Edit, Share (the app's share
  dialog), Duplicate, Delete with Undo.
- **New Playbook** is a dropdown of three ways in: Build with AI
  (`#playbooks/new`, the New Chat page asking "Create New Playbook"), Choose
  from template (the standard playbooks, copied as your draft), Build manually.
- The Build with AI page uses the New Chat composer itself (`initComposer`) with
  `attach` (its own + menu rows: Upload, From SharePoint / Google Drive /
  OneDrive / Box, each with a file picker), `noTokens` (no @ or / lookups) and
  `noModel`. Attached files ride in the box as pills, like skills do in New Chat.
- A playbook is an **artifact** (kind `playbook`, `src/playbook-view.js`), so it
  has the artifact chrome: title with versions, Edit with Chat, Publish, full
  screen, close. From the list it opens full screen to read
  (`#artifact/playbook-<id>`); Edit with Chat opens its conversation
  (`#chat/pb-ses-<id>`) with the playbook docked and editable.
- The page: a clause index on the left, one sheet with every clause laid out as
  Starting Position / Not acceptable / Fallback / Fallback 2…; every text is
  edited inline like a document, in any view (only the position labels are
  fixed; older versions read only); a clause's hover panel carries its delete;
  "+ Add Fallback". Drafting wording is kept in the data but not shown.
- Clauses are grouped into **sections** (`clause.section`; sections are the
  distinct names in order of first appearance). The index and the sheet both
  show them, numbered 1. / 1.1, 1.2… (sections carry a period: "1. Service
  commitments"); sections fold in the index, rename inline,
  and the + menu in the sheet's bar is the only way to add (Add New Clause, into the section being read; Add New Section) — there are no add buttons in the page itself. A clause added from
  chat is filed by `pbGuessSection()`.
- In the index a clause can be **dragged** to a new place, within its section
  or into another (pointer-driven: a lifted ghost, a slot the list opens
  around, live renumbering; Escape cancels; a folded section lights as a target).
  A **section** is dragged by its heading: the list folds to headings while it
  is carried, and its clauses move with it.
- A section's row in the index: number · name · chevron at the far right (the
  only fold control; every section is open by default). On hover the number
  becomes a grip and a pencil shows beside the chevron; double-click or the
  pencil renames it in place (Enter keeps, Escape reverts, a duplicate name is
  refused). Clause rows sit one step in, their 1.1 numbers under the section's
  name. The list is sans serif; numbers hug their names (about 7px of air).
- The list's right edge drags to resize it (220–460px, double-click resets,
  arrow keys nudge; kept in `state.pbIdxW`). Hiding it is a plain icon in the list's
  head; the button that brings it back is a small bordered square
  (`.pbv-panel-btn`) pinned to the view's corner (a child of `.pbv`, so it
  does not scroll), its top on the sheet's top edge. The list slides: its
  column (`.pbv-idx-wrap`) animates to 0 while the list keeps its own width
  inside, so nothing is squeezed (`showList()`).
- Reordering **on the sheet**: every clause and section heading has a grip in
  its margin (hover). Picking one up folds the sheet to an outline
  (`.pbv-cls.is-outline`, or `.is-sec-outline` for a section: headings only),
  keeps the heading under the pointer by adjusting the scroll, and carries a
  one-line ghost; rows slide (FLIP), numbers recount live, the edges
  autoscroll, Escape cancels. On drop the sheet opens again with the dropped
  heading where it was put down (`sheetLift` / `sheetPlace` / `sheetDrop`).
- The list's head has a "sections only" toggle beside the hide icon (folds or
  opens every section in the list).
- A section heading on the sheet has no rule under it and no clause count:
  number, serif name (an input sized to its text), then the fold chevron right
  after the name (`foldSection`, `PB.secFold`). On hover, after the chevron: a
  trash, then a + that adds a clause to that section. Going to a clause, adding one, dropping
  one in, or a search opens a folded section.
- `PBV_CARD_BORDERS` (top of `playbook-view.js`): `'always'` (current) outlines
  every position card; `'hover'` shows outlines only while the clause is hovered
  or edited — tried and rejected (the positions looked like they were hanging).
- Under a clause's cards, while it is hovered or focused: two underlined text
  links, "Add Fallback" and "Add Clause" (a new clause directly after this
  one, `addClauseAfter`). No icon, no button fill; their space is always
  reserved so nothing shifts.
- Deleting, always hover-only: a trash on a section heading, on a clause
  heading, and on each fallback card. A
  clause or fallback goes at once (clause: toast with Undo). A **section**
  asks first — `pbConfirm()` names the clauses that go with it — then leaves
  with a toast and Undo.
- Search on the sheet has no box: the glass, the words, a count, and a clear
  ×. `/` opens it, Escape clears and closes, Enter / Shift+Enter walk the
  matches ("2 of 7"). It matches what can be read — section name, clause
  title, every position — and marks each match in yellow. The text lives in
  inputs and textareas, which cannot colour part of their text, so
  `paintHits()` lays a transparent mirror (`.pbv-hl`, same font and wrapping,
  `mix-blend-mode: multiply`) over each field that has a match; plain text
  (the list, read-only versions) uses the CSS Custom Highlight API
  (`::highlight(pbv-find)`). A ResizeObserver re-lays the marks when anything
  rewraps. Folded sections and clauses are opened while a search is on.
- Tooltips: every icon control in the playbook view carries `data-tip` (the
  workspace's own tooltip in `composer.js`), in Title Case and named for what
  it does ("Delete Section", "Add Clause", "Collapse All Clauses"). Do not use
  `title` for these. The tip now follows keyboard focus only, not a click.
- Once the page is scrolled the sheet's bar casts a soft shadow from its own
  edge (`.pbv-bar.is-stuck`, a box-shadow pulled in at the sides); the section
  strip carries the same shadow when it is down. The strip is opaque and reads
  "1. Section name".
- Each clause on the sheet folds to its heading from the chevron at the end of
  it (`foldClause`, kept in `PB.clFold` for the session; jumping to a folded
  clause from the list opens it). The trash stays hover-only, left of the chevron.
- Section names in the list are medium weight in the same soft ink as the
  clauses; only the section being read (and the clause in it) is full ink.
- The sheet's bar: "Clauses" + count, a search glass, a collapse-all /
  expand-all toggle (`foldAll`), and one **+** that opens a plain menu
  (`pbWaysMenu` with `small: true`: glyph and name only, no descriptions,
  no icon tiles): Add New Clause / Add New Section. The sheet's text measure is capped at 640px.
- `PLAYBOOK_SEED_V` in `playbooks-data.js`: bump it when the shipped playbooks
  change and saved copies of them are replaced (playbooks the user made are kept).
  The DPA is the full sample: 25 clauses in six sections.
- Versions live on the playbook (`pb.versions`, snapshots); chat changes
  (`PB_ASKS`: hard line, N-year term, add fallback, add clause) make a new
  version; the artifact system's Restore is followed. Publish = the version
  reviews use (`pb.published`).
- Hooks added to shared code for this, each a no-op for other artifacts:
  `a.session()`, `a.onPublish()`, `a.pubInfo()`, `a.onDelete()` in
  artifacts.js; `answer()` routes a chat about a playbook to `playbookTurn`;
  bot messages can carry `suggest`.
- Build with AI is scripted: the description (or attached file names) picks
  the closest standard playbook and the draft starts from its clauses.
  `buildPlaybook()` is the seam for a real drafter.

## Working on it

Preview with the `clavia` entry in `Experiments/.claude/launch.json`, or:

    node dev-server.mjs 4325

Use this server, not `python -m http.server`: that one lets the browser cache
`app.js` and quietly serve stale code.

## Publishing

    node build.mjs

Writes `dist/app.html` (standalone), `dist/index.html` (same bytes for static
hosts) and `dist/artifact.html` (no html/head/body skeleton, for the Artifact
publisher). Everything under `src/assets/` is inlined as `data:` URIs.

## Design

Same system as the workspace: Geist + Spectral, rail `#0D1F16`, sand `#E3D8C2`,
gold `#847347`. Single light theme. Icons are a generated sprite. Run
`node sprite.mjs` after changing anything in `src/assets/`.

## Vault, Templates, Requests, Projects

`src/modules-data.js` (seed, `MX_SEED_V`), `src/modules.js` (shared parts, Vault,
Templates), `src/modules-work.js` (Requests, Projects), `src/modules.css`.
State lives in `state.mx`; `MX` holds what is open and each table's tab, search
and sort. Routes: `#vault/<id>`, `#templates/<id>|new`, `#requests/<id>|new`,
`#projects/<id>` (`mxRoute`, `mxHash`, `mxOpen`, `mxClose`).

Every list is the Playbooks list again, through one builder: `mxTable(cfg)` —
text tabs with counts, a search glass, sortable columns, rows, a ⋯ menu — using
the `.pb-card` / `.pb-table` / `.pb-row` classes. A tab may bring its own body
in place of the rows (`tabs: [{ k, label, body }]`). Column minimums are sized
so each table fits at a 1180px window; check that sum when adding a column.
Only Roger, Grace and Matt appear as people: they are the ones with photos.

- **Vault** — a set of documents. List: Name · Source · Files · Owner · Last
  updated. New Vault: Upload Files, or "Add from" a connected source. A vault:
  Files (rows read "Reading…" then their length; drop files anywhere on the
  page) and **Review** — one row a document, one column a question
  (`vaultReview`), the pattern Harvey calls a review table and Legora tabular
  review. Columns start as the terms most files state; "+" adds a suggested
  term or a question in your own words, answered down the page. A row opens
  Quick Look (`fileLook`). Ask Clavia opens New Chat with the vault attached
  (`mxAsk` → `mxTakePills` in the home view).
- **Templates** — our paper with its blanks named. Two pages from one function,
  `templatePage(t, use)`:
  - **Keeping the template** (`#templates/<id>`): the wording is editable in
    place (contenteditable paragraphs, blanks are `.mx-chip`); the panel lists
    the fields as a name and an "e.g." example, with Add Field. The bar has
    Publish (drafts), Open in Word, and **Use Template**.
  - **Using it** (`#templates/<id>/use`): the document is read-only and fills
    as you go. The panel opens with a box to describe the deal in a sentence
    (`mxReadDeal` reads counterparty, address, dates, law, term, purpose,
    signatory, seats, fees — scripted, fills only what the sentence says) and a
    paperclip to fill from a Vault document (`READ` table); then the value
    inputs. The bar has Open in Word (filled) and **Create Draft**, which makes
    a `doc` artifact and opens it beside a chat.
  Open in Word downloads a Word-readable `.doc`. New Template: Build with AI /
  From a document / Start blank.
- **Requests** (view id `intake`, `#intake`) — what the business asks legal for.
  List of open requests (Request # · Request · Counterparty · Type · Submitter ·
  Attorney · Status), tabs Open / Unassigned / Assigned to Me, one filter button
  (Type, Attorney, Submitter, Status), attorney assigned in the row with a
  searchable picker. New Request: Submit with AI (`mxReadRequest`) or a
  four-field form. Each request opens at `#intake/<id>` (`intakePage`): the ask,
  Clavia's first pass with one next step (open the Contracts review, draft from
  a template with the fields carried over, draft an answer, or send for
  signature), activity with replies to the submitter and internal notes, and the
  facts down the right. A draft made from a request comes back to it.
- **Contracts** (renamed from Requests on 2026-10-02; the code, routes, ids
  and `REQ-` numbers keep the old name) — what the business asks legal for. List: Request · Type ·
  Requester · Status · Due, status changed in place (`mxStatusBtn`). New
  Request is a New-Chat-style page (`mxCreatePage`) that triages what you
  describe. A request: the ask, its files, a First pass (findings marked with
  the playbook's position marks), Activity with a reply line, and its facts
  down the side. "Review with Clavia" opens it as a chat.
  A request that carries a contract (`request.review`) opens onto the contract
  instead: the **Jev experiment's review workspace**, brought over as it was
  (`src/review.js`, `src/review.css`, data in `src/reviews-data.js`, with
  Clavia's hand-written additions — extra wordings such as Fallback 2 — kept
  apart in `src/reviews-extra.js` so a re-export does not lose them). The
  contract on the left with tracked changes; on the right the playbook's
  reading — the three-position bar, clauses worst first, reasoning with
  citations, "View playbook clause", and a redline to Apply (tracked, clean, or
  with a comment); Word-style margin notes, internal or for them; bottom tabs
  Playbook · Ask (a Request tab was tried and removed). The standalone "Add
  note" link under a clause is removed; a note is added with "Apply with
  comment" or "Add comment" on an applied redline. (Jev's coloured rule down the side of each clause
  is switched off.) Every class, custom property and keyframe from Jev
  is prefixed `jv-`; the top of `review.css` maps Jev's tokens to Clavia's and
  the end holds the theme changes. No server: reviews are static, exported by
  `export-reviews.py` (run it with Jev's venv: `cd ../jev && .venv/bin/python
  ../clavia/export-reviews.py`; it only reads from jev/). What you apply and
  note is saved on the request (`request.work`). "View playbook clause" opens
  the three positions with a capsule on the one their draft is on and, under
  Starting position and Fallback, the **response** (the redline that gets the
  clause there) with a one-click Apply that closes the sheet and scrolls to
  the change in the contract. The playbook name opens Jev's
  "Run a playbook" sheet (the one in use: a Current capsule and Re-run; one
  already run on this contract, kept in `request.runs`: View; the rest: Run); running one is a stand-in (`rerun()`): clauses both
  playbooks have keep their reading, the rest become not-in-playbook or
  missing, and the panel says so. The **Ask** tab also does work, scripted (no
  model): "flag the issues" reads the contract, asks one docked question
  ("How hard should I push?", answered with 1/2/3, Enter or Skip) and stages a
  suggestion card per clause that is off its position — redline, wording
  chips, Reasoning, hover ✓/✕, one flat list with a quiet "Apply all N" link; applying writes
  the tracked change into the contract and scrolls to it. "Redraft" (typed, or
  from the Ask · Redraft pill over a selection) stages the same card for one
  clause (`runFlag`, `runRedraft`, `suggestionCard`, `questionEl`). Anything
  else is answered by quotation. Left out because each needs Jev's server:
  their reply and rounds, the Word download, tailored drafts. Ask answers by word overlap with the contract.
- **Projects** — one matter. A project: an ask box (the real composer), and
  everything in it as one table — chats, vaults, playbooks, requests — filtered
  by tabs. Vaults, playbooks and requests are linked (`mxPick`), not copied.

Shared pieces: `mxDetailPage` (back, tile, name typed on the page, actions),
`mxPick` (tick from a grouped list), `mxCreatePage`, `mxTile` (the four paper
marks), `MX_ST` (status marks). `pbWaysMenu` gained `{ sec }` labels and
`{ on }` ticks. Not built: real triage, real extraction, persistence of chats
opened from these modules across a reload.


## Matters

A matter is an Intake request that grew into longer work. There is one
item and one number: "Turn into a Matter" (a request's ⋯ menu, or Clavia's
suggestion on a request that looks like a dispute) gives the same request a
matter's parts in `r.mt`. Code: `src/matters.js`, `src/matters.css`, data in
`src/matters-data.js`. Intake's own code only has small hooks, each a no-op
for a request that isn't a matter.

- **A request that is a matter** shows a "Matter" label and two extra tabs,
  Tasks and Decisions. Overview adds Next Tasks and Next Dates; Documents adds
  the matter's emails and files; Details adds key dates, key facts, money and
  linked records (edited in place); Deal Team adds outside lawyers, kept-out
  people and the Private switch. Its ⋯ menu has Hand Over and Close Matter
  (outcome and lesson) in place of Mark as Completed. Everything done on the
  matter is written to the request's own Activity. Its stages are the five
  matter stages, also shown on the requester's view.
- **Opening one** runs a conflict check (`MO_HISTORY`): anyone on the legal
  team who used to work for the other side is offered to be kept out.
- **Intake's list** has four more views: Matters, Needs You, Tasks, Key Dates.
  New Request has "Start a matter" for work that didn't come in as a request.
- **Settings › Intake** has Kinds of matter, Who gets which matter and Matter
  numbers.
- `moAsMatter(r)` gives the matter code a matter made from the request: the
  number, name, owner, who asked and where it came in are the request's own.
- The five demo matters are seeded once into Intake (`moMattersSeed`). Dates
  are counted from the day the demo is first opened.

## Skills

`src/skills.js` + `src/skills.css`, data in `src/skills-data.js`. Rail item
after Templates; routes `#skills`, `#skills/<id>`, `#skills/new` (Build with AI
chat), `#skills/demo` (a finished Build with AI conversation).

- **What a skill is:** the brief Clavia follows every time it does one kind of
  work — when to use it, what it asks for (kept as data for running it),
  numbered steps in plain English, what it follows (playbooks,
  templates, vaults), what it hands back, and who can use it (Only me · Legal
  team · Everyone at the company, who can run it but not read it). One object
  in place of Harvey's prompts/workflow agents or Legora's prompts/workflows/skills.
- **List:** the shared `mxTable` — Name · Output · Status · Runs · Owner · Last
  updated, tabs by area, filters (Status, Output, Who can use it, Owner).
  New Skill = Build with AI · Choose from Library (`SK_LIBRARY`, added as your
  drafts) · Build Manually.
- **Page:** the brief on the left — "Use it when…", then numbered steps edited
  like a document (step 1 says what it asks for; a playbook, template or vault
  named in a step is a link to it). A details panel on the right: Status
  (opens Versions with Restore), Who can use it, Hands back, Uses (+ to add),
  Area, Owner, Runs (opens the run list), Last updated — Runs and Versions open
  in the panel itself. Header: Publish / Publish Changes (only when there is
  something to publish), Run Skill (Try Skill for a draft), ⋯ = Duplicate,
  Download as Markdown, Unpublish, Delete. Drafts have no published versions.
- **Running:** Run Skill (Try Skill for a draft) opens New Chat with the skill
  pill; `/` lists published skills (`skSync()` refills `SKILL_LIST` in place).
  `skillAnswer()` in `answer()` catches a prompt carrying a skill: it asks for
  the required document first, then the trace shows the document, the skill
  version and what it followed; results are scripted per skill in
  `SK_RESULTS`. Every run is logged on the skill.
- **Build with AI:** the standard chat with artifact kind `skill` (`skRender`),
  scripted like the request chat: description → nearest known skill as a
  draft → who can use it → anything it should never do → Save Skill.

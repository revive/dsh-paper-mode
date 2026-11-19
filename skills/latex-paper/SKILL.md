---
name: latex-paper
description: Use when a paper, thesis, report, or camera-ready manuscript is written, compiled, debugged, or submitted as LaTeX — choosing a TeX engine, laying out a .tex project, fixing compile and font errors, managing BibTeX/biblatex references, and checking the built PDF against venue or school formatting rules.
whenToUse: The user keeps a .tex project, asks to convert a draft to LaTeX, hits a LaTeX compile error, needs a submission-ready PDF plus source bundle, or wants Chinese and English typesetting handled correctly.
---

# LaTeX paper workflow

Work from the project's real files and its actual compiler output. Never claim a document compiles until the build has run and the log has been read. Loading this skill authorizes no file or profile change: inspect, build in a scratch directory, and edit only when the user asked for the change.

## 1. Diagnose the project before editing

- Find the main file: usually `main.tex`, `paper.tex`, or the `.tex` file holding `\documentclass`. `scripts/latex-build.sh` prints the main file and engine it selected.
- Read the preamble: document class; `ctex` / `xeCJK` / `fontspec` (Chinese and Unicode); `biblatex` vs `natbib` / `\bibliography`; `hyperref`, `geometry`, `cleveref`, `booktabs`, `siunitx`.
- Pick the engine from evidence, not taste: `ctex*`, `xeCJK`, `fontspec`, `unicode-math`, `polyglossia` require XeLaTeX or LuaLaTeX; plain `article` with `fontenc` / `inputenc` uses pdfLaTeX. A `% !TEX program = ...` magic comment or `.latexmkrc` wins over inference.
- Read the venue or school rule before proposing formatting changes. When a template ships a class file, compile it unmodified first so template errors are not blamed on content.

## 2. Run the build loop

```bash
bash scripts/latex-doctor.sh                 # read-only toolchain and font report
bash scripts/latex-build.sh main.tex         # latexmk when installed, manual passes otherwise
bash scripts/latex-build.sh main.tex --engine xelatex
```

Copy the templates beside the manuscript rather than editing them in place: `templates/latexmkrc`, `templates/Makefile`, `templates/main.tex`, `templates/refs.bib`, `templates/gitignore`.

- Prefer `latexmk`: it reruns the engine and the bibliography backend as often as the aux files demand.
- Without `latexmk`, the order is engine -> BibTeX/Biber -> engine -> engine. One pass after a citation change is always wrong.
- Keep auxiliary output (`.aux`, `.log`, `.out`, `.toc`, `.bbl`, `.blg`, `.run.xml`, `.synctex.gz`) out of version control; `templates/gitignore` lists them.

## 3. Structure, cite, and cross-reference

- `main.tex` holds the preamble and `\include` / `\input` calls only; chapters live under `sections/`, figures under `figures/`, references in one `.bib` file. See `references/project-layout.md`.
- Every `\label` needs a `\ref` or `\cref`; every `\cite` key needs an entry in the `.bib` file. Undefined references are a delivery blocker, not a cosmetic warning.
- Bibliography backend, style, and commands must match: see `references/bibliography.md` for BibTeX, biblatex/biber, natbib, GB/T 7714, IEEE, and APA setups.
- Never invent a reference, DOI, volume, or page range. Verify each entry against the database or publisher page; mark unverifiable entries for the user instead of filling them in.

## 4. Triage the log

- Find the first `!` line and its `l.<number>`; fix that before reading any warning. A single missing brace can produce hundreds of downstream errors.
- Classify: missing package or font, engine mismatch, math-mode misuse, malformed environment, stale aux files, missing bibliography pass. `references/troubleshooting.md` maps symptoms to fixes.
- Do not silence warnings by deleting content, disabling `hyperref`, or adding `\sloppy`. Fix the cause; report warnings that legitimately stay (for example overfull lines inside a verbatim block).

## 5. Check the PDF, not just the log

- Compile, then inspect the PDF: use `office_render` when it is available, otherwise `pdfinfo`, `pdffonts`, and page count from the shell.
- Check page limit, figure and table placement, orphan and widow lines, header and footer, reference formatting, embedded fonts, hyperlinks, page size (A4 vs US Letter), and Chinese glyph coverage.
- For a submission package, follow `references/submission.md`: anonymization, source bundle contents, clean-room recompile, and venue declarations.

## 6. Deliver

Give the complete project, not a fragment: `.tex` sources, `.bib`, figures, class/style files the venue requires, plus the exact build command (or the copied `latexmkrc` / `Makefile`). State the engine, known warnings, and remaining to-dos. When the user asks for Word, convert from a compiling PDF or LaTeX source and re-check formulas, numbering, and pagination.

## Read next

| Task | File |
|---|---|
| Choose an engine; install TeX Live, latexmk, biber; Chinese fonts | `references/engines.md` |
| Lay out a maintainable paper repository | `references/project-layout.md` |
| Set up BibTeX, biblatex/biber, natbib, GB/T 7714, IEEE, APA | `references/bibliography.md` |
| Diagnose compile, font, reference, and layout errors | `references/troubleshooting.md` |
| Prepare a PDF and source bundle for submission | `references/submission.md` |
| Build scripts and project templates | `scripts/`, `templates/` |

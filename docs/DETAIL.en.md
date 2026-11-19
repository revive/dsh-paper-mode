# Paper writing mode

An agent preset for DeepSeek Harness that turns a session into an academic writing workspace. Selecting it gives the session a standing methodology prompt plus the tools to read sources, verify literature, build LaTeX projects, and deliver documents.

## Who it is for

- Authors of course papers, theses, dissertations, journal articles, conference papers, research proposals, and grant applications
- Writers who need topic framing, literature-review structure, section architecture, and argument checks, not just copy-editing
- LaTeX users who want the build log read, compile errors fixed, and the PDF checked before submission
- Anyone who prefers advice that says "change this sentence to that" over general praise

## What it covers

The standing prompt is organized by writing stage:

| Stage | What the mode provides |
|---|---|
| Alignment | Identify the stage and constraints first; ask only questions that change the answer; state the cost of each option |
| Topic | The four questions of a research problem, three kinds of contribution, feasibility, three levels of narrowing, candidate titles with risks |
| Literature | Search strategy and databases, citation chasing, a literature matrix, thematic synthesis, locating the gap |
| Structure | IMRaD and humanities/social-science skeletons, thesis introduction and conclusion requirements, length budgets, reverse outlining |
| Language | Paragraph discipline, academic register and hedging, a list of common faults, typical Chinese/English issues, before/after rewrites |
| LaTeX | Engine choice, project layout, build loop, log triage, cross-reference and citation closure, PDF layout checks |
| Integrity | Citation practice and paraphrase, figure and data provenance, academic ethics boundaries |
| Submission | Self-review checklist, point-by-point reviewer responses, venue selection priorities, revision order |

## Tooling

- File read/write, directory search, background jobs
- Shell: bash on Linux and macOS, PowerShell on Windows, enabled by host platform
- Web search and fetch for verifying real sources
- The bundled `latex-paper` skill: toolchain report, build script, project templates, troubleshooting, and submission references
- Office skills plus Office render/convert for docx delivery and PDF layout inspection
- Todo list, user questions, working directory, deliverable presentation
- Subagents and workflow for parallel literature sweeps, chapter drafts, and independent review

## Use

1. Start a new session and pick **论文写作** (Paper writing) in the mode selector.
2. Or set it as the default mode for later sessions under Settings → General.
3. Existing sessions keep their preset; create a new session after installing or changing the bundle.

## Limitations

- The methodology prompt is written in Chinese. With English papers the prose follows the target language, but the methodology text stays Chinese.
- The TeX toolchain is not bundled. The mode detects `xelatex`, `pdflatex`, `lualatex`, `latexmk`, `bibtex`, and `biber`, and reports what is missing.
- Search results can return sources that do not exist or contain errors. Verify every citation against the database or publisher page.
- The preset depends on the in-box DSH plugins (files, search, Office, subagents, and so on). `engines.dsh` is enforced at install time, so an incompatible DSH refuses the bundle instead of mounting a mode that cannot start.
- No ghostwriting, no fabricated data or references, no help evading similarity checks.

## Install and share

- From a directory: **Add plugin** on the Plugins page, or `plugin_manager`'s `install_bundle` pointed at the directory.
- From a tarball: the same `install_bundle` accepts a `.tgz`, or run `dsh plugin --profile <name> add ./dsh-paper-mode-<version>.tgz`.
- From npm: after publication, `dsh plugin --profile <name> add dsh-paper-mode`.

## Customize

The prompt and tool rows live in the `preset-paper` row of `cordis.patch.yml`; the LaTeX skill lives in `skills/latex-paper/`. Reinstall the bundle after editing, and create a new session. `persona.prefix` and `suffix` are templates: do not use double braces in the body, or they are parsed as prompt variables.

# dsh-paper-mode

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.3%20%3C0.4.0-4b32c3)](https://github.com/deepseek-ai/deepseek-harness)
[![LaTeX](https://img.shields.io/badge/LaTeX-XeLaTeX%20%7C%20pdfLaTeX%20%7C%20LuaLaTeX-008080)](skills/latex-paper/SKILL.md)
[![Platforms](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)](#platforms-and-shells)

English | [简体中文](README.zh-CN.md)

An agent preset for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that turns a session into an **academic paper writing mode**. The session gets a standing methodology prompt plus the tools to read sources, verify literature, build LaTeX projects, and deliver documents.

The preset covers course papers, theses, dissertations, journal articles, conference papers, research proposals, and grant applications. The methodology prompt is written in Chinese; the paper itself follows its target language, and the LaTeX skill is written in English.

## Features

| Stage | What the mode does |
|---|---|
| Alignment | Identifies the writing stage and constraints first; asks only questions that change the answer; states the cost of each option |
| Topic | The four questions of a research problem, three kinds of contribution, feasibility, three levels of narrowing, candidate titles with risks |
| Literature | Search strategy and database choice, citation chasing, a literature matrix, thematic synthesis, gap identification |
| Structure | IMRaD and humanities/social-science skeletons, thesis introduction and conclusion requirements, length budgets, reverse outlining |
| Language | Paragraph discipline, academic register and hedging, common faults, Chinese/English pitfalls, before/after rewrites |
| LaTeX | Engine choice, project layout, build loop, log triage, cross-reference and citation closure, PDF layout checks |
| Integrity | Citation practice and paraphrase, figure and data provenance, academic ethics boundaries |
| Submission | Self-review checklist, point-by-point reviewer responses, venue selection, revision order |

Tooling includes file read/write and search, background jobs, web search and fetch for verifying real sources, a todo list, user questions, Office rendering/conversion, deliverable presentation, skills, subagents, and workflow.

## Linux and macOS first

The mode was originally developed on Windows; it now treats Linux and macOS as first-class hosts:

- **Shell follows the platform.** The preset mounts `bash` on Linux/macOS and `pwsh` on Windows, chosen by `process.platform`, so compile commands, `latexmk`, `biber`, and `fc-list` work where they usually exist.
- **LF line endings.** `.gitattributes` normalizes YAML, JSON, Markdown, shell, and SVG files to LF, so scripts and patches behave the same after a clone on any OS.
- **POSIX build scripts.** The LaTeX tools are plain `bash`, dependency-free, and work in CI containers.
- **Case-sensitive paths.** The skill explicitly forbids mixed-case or space-containing figure paths that break on Linux builds.

## LaTeX support

The bundle ships a `latex-paper` skill, mounted automatically through `skill-filesystem`:

```text
skills/latex-paper/
├── SKILL.md                     # workflow: diagnose, build, cite, triage, check, deliver
├── references/
│   ├── engines.md               # engine choice, TeX Live/biber/latexmk install, CJK fonts
│   ├── project-layout.md        # main.tex, sections/, figures/, .gitignore, naming rules
│   ├── bibliography.md          # BibTeX vs biblatex, GB/T 7714, IEEE, APA, verification
│   ├── troubleshooting.md       # log reading and a symptom → cause → fix table
│   └── submission.md            # anonymization, PDF checks, source bundle, arXiv
├── scripts/
│   ├── latex-doctor.sh          # read-only toolchain and font report
│   └── latex-build.sh           # engine detection, latexmk or manual passes, error summary
└── templates/
    ├── latexmkrc                # XeLaTeX-first latexmk configuration
    ├── Makefile                 # make / make watch / make clean
    ├── main.tex                 # ctex + natbib skeleton
    ├── refs.bib                 # example bibliography
    └── gitignore                # LaTeX auxiliary output
```

What the mode does with it:

- detects the engine from `% !TEX program`, `.latexmkrc`, or the preamble (`ctex`, `xeCJK`, `fontspec`, `unicode-math` → XeLaTeX/LuaLaTeX);
- prefers `latexmk` and falls back to engine → BibTeX/Biber → engine → engine;
- fails the build on hard errors and undefined references, and reports missing glyphs and overfull boxes;
- checks the built PDF (page count, fonts, layout) before declaring a paper ready;
- never invents a reference to fill a bibliography.

Example:

```bash
bash skills/latex-paper/scripts/latex-doctor.sh
bash skills/latex-paper/scripts/latex-build.sh main.tex
```

The TeX toolchain is **not bundled**; the mode detects what is installed and tells the user what to install. See [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md#external-tools-optional-detected-at-run-time).

## Platforms and shells

| Host | Shell row | Notes |
|---|---|---|
| Linux | `tool-bash` | Tested on Debian/Ubuntu with TeX Live; works in containers and CI |
| macOS | `tool-bash` | MacTeX or `brew install texlive`; fonts come from the system |
| Windows | `tool-pwsh` | PowerShell instead of bash; the persona and skill give platform-specific commands |

The shell rows are complementary: exactly one is enabled per host. The LaTeX scripts are `bash` and therefore target Linux/macOS (and WSL2 on Windows).

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| DeepSeek Harness | `>=0.2.2-rc.3 <0.4.0` | Declared in `engines.dsh`; install and startup refuse an unsatisfying range |
| In-box DSH plugins | shipped with the DSH version above | No out-of-tree plugin is required |
| TeX Live (optional) | any current release | `xelatex` for Chinese, `pdflatex` for English, `latexmk` and `biber`/`bibtex` recommended |
| CJK fonts (optional) | Noto CJK or Fandol | Fandol ships with `texlive-lang-chinese` |

There are no runtime npm dependencies. The full row-by-row matrix, install commands, and compatibility policy are in [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).

## Installation

This is a self-contained DSH bundle: a `package.json` with `dsh.bundle.patch` and no build step.

### Plugins page

Clone the repository, open **Plugins → Add plugin** in DSH, and select the repository directory (the one containing `package.json`).

### Agent tool

```text
plugin_manager install_bundle target=<absolute path to this repository>
```

The same action accepts a packed tarball.

### Release tarball or npm

Download `dsh-paper-mode-<version>.tgz` from [Releases](https://github.com/revive/dsh-paper-mode/releases), then:

```bash
dsh plugin --profile <name> add ./dsh-paper-mode-<version>.tgz
# or, once published to npm:
dsh plugin --profile <name> add dsh-paper-mode
```

Restart the GUI after adding a bundle layer, then start a **new session** and choose **论文写作** (Paper writing) in the mode selector. Existing sessions keep their preset.

## Customize

Everything the mode is made of lives in `cordis.patch.yml`:

- `persona.prefix` — the standing methodology (about 4,000 characters)
- `persona.suffix` — the pre-delivery checklist
- `plugins` — the tool rows mounted into the preset

The LaTeX skill lives under `skills/latex-paper/`. Edit, reinstall the bundle, and start a new session. `prefix` and `suffix` are templates: double braces are parsed as prompt variables, so avoid them in the text.

The methodology prompt is Chinese by design. [docs/PROMPT-LANGUAGE.md](docs/PROMPT-LANGUAGE.md) records its measured size, a Chinese-vs-English pilot, and why the repository keeps one canonical prompt instead of two translations.

## Repository layout

```text
.
├── cordis.patch.yml            # the one preset row: persona + tool rows
├── package.json                # bundle manifest: dsh.bundle.patch, engines.dsh, files
├── locale/
│   ├── en.json                 # Plugins page title/description (English)
│   └── zh.json                 # Plugins page title/description (Chinese)
├── docs/
│   ├── DETAIL.en.md            # Plugins detail page (English)
│   ├── DETAIL.zh.md            # Plugins detail page (Chinese)
│   └── DEPENDENCIES.md         # dependency matrix and compatibility policy
├── skills/latex-paper/         # bundled LaTeX skill (references, scripts, templates)
├── scripts/check-bundle.mjs    # validation used by CI and contributors
├── .github/                    # CI and release workflows, topic list, helper scripts
├── CHANGELOG.md
├── README.md                   # this file
├── README.zh-CN.md             # Chinese README
└── LICENSE
```

## Development

Requirements: Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm run check          # manifest, patch YAML, locales, docs, skills, pack contents
pnpm pack               # builds dsh-paper-mode-<version>.tgz
```

`pnpm run check` resolves every plugin row against an installed DSH when one is available (set `DSH_PACKAGE_DIR` to point at a specific installation). Use `--strict` to turn warnings into failures.

Test an install without touching your real profile:

```bash
export DSH_HOME="$(mktemp -d)"
pnpm pack --pack-destination dist
export TGZ="$(pwd)/$(ls dist/dsh-paper-mode-*.tgz)"
dsh --profile papertest --from-default-profile web --dump-config >/dev/null
dsh plugin --profile papertest add "$TGZ"
dsh --profile papertest --dump-config | grep -A3 'preset-paper'
```

## Release process

1. Update `version` in `package.json` and add a `## [<version>]` section to `CHANGELOG.md`.
2. Run `pnpm run check` and `pnpm pack`.
3. Commit, then tag and push:

   ```bash
   git tag v<version>
   git push origin v<version>
   ```

4. The `release` workflow verifies the tag matches the package version, runs the checks, composes the release notes from `CHANGELOG.md`, packs the tarball, writes a SHA-256 checksum, and creates or updates the GitHub release.
5. If the notes need rewriting, run the same workflow manually (`workflow_dispatch`) with the version.

## Repository topics

The intended set lives in [`.github/topics.txt`](.github/topics.txt) and is set once, by hand — **About → Topics** on the repository page, or:

```bash
GH_TOKEN=<token with repository administration write> bash .github/scripts/set-topics.sh
```

Topics are metadata, not a delivery channel: this bundle is discovered through the DSH plugin market and npm, both of which read `package.json` `keywords`. There is deliberately no workflow for this. Syncing six strings would mean storing a repository-administration token in the repository's secrets, and the broad topics (`latex`, `ai-agent`) hold tens of thousands of repositories anyway.

## Limitations

- The methodology prompt is written in Chinese; English papers get English prose but the methodology text stays Chinese.
- Web search can return sources that do not exist or contain errors. Verify each citation against the database or publisher before submission.
- The bundle validates `engines.dsh`; an incompatible DSH refuses the bundle instead of mounting a mode that cannot start.
- The LaTeX skill is guidance and tooling, not a TeX distribution. Without a local TeX toolchain, no PDF is produced.
- No ghostwriting, no fabricated data or references, no help evading similarity checks.

## License

[MIT](LICENSE)

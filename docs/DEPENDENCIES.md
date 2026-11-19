# Dependencies and compatibility

This bundle contains no runtime npm dependencies. It ships one Cordis patch, one skill directory, locale files, and documentation; every plugin row resolves from the DSH installation that loads it.

## Runtime requirements

| Requirement | Version / note | Enforced by |
|---|---|---|
| DeepSeek Harness | `>=0.2.2-rc.3 <0.4.0` (`engines.dsh`) | `dsh plugin add` and profile startup refuse an unsatisfying range |
| Node.js | 24.x for development and CI; the DSH runtime owns the production range | CI workflow (`.github/workflows/ci.yml`); this bundle ships no Node runtime code |
| pnpm | 11.5.3 (declared in `packageManager`) | CI and `dsh plugin` profile management |
| Shell | bash on Linux and macOS, PowerShell on Windows | platform-gated rows in `cordis.patch.yml` |

The preset's plugin rows are all in-box packages of the DSH installation; no out-of-tree plugin is required.

## Plugin rows and why they are there

| Row | Package | Purpose | Platform gate |
|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | Standing methodology prompt | — |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | Project instruction files (`AGENTS.md`) | — |
| `time-context` | `@deepseek-ai/dsh-time-context` | Current date for deadlines and submission windows | — |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | Shell builds and scripted checks | disabled on Windows |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | Shell builds and scripted checks | disabled off Windows |
| `tool-fs`, `tool-fs-search` | `@deepseek-ai/dsh-tool-fs`, `-fs-search` | Read drafts, write sections, search the project | — |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | Long compile runs in the background | — |
| `skill-filesystem`, `tool-skill` | `@deepseek-ai/dsh-skill-filesystem`, `-tool-skill` | Skill catalog; mounts this bundle's `skills/` | — |
| `compaction` group | `dsh-compaction-basic`, `dsh-command-compact`, `dsh-compaction-tool-result-pruner` | Long writing sessions stay within context | — |
| `delegation` group | `dsh-tool-subagent-control`, `dsh-tool-subagent`, `dsh-workflow-ptc`, `dsh-tool-workflow` | Parallel literature sweeps, chapter drafts, independent review | — |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | Ask stage and format questions once | — |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | Track stage progress | — |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | Verify literature and fetch sources | needs a configured DSH search provider |
| `present` | `@deepseek-ai/dsh-tool-present` | Declare deliverables | — |
| `tool-office` | `@deepseek-ai/dsh-tool-office` | Render PDF/docx, convert, inspect layout | — |

## Host services the preset expects

The preset declares child plugins but provides no host services itself. The `dsh-base` and `dsh-web-app` bundles ship the provider rows; a custom composition must provide them, or the row that injects a missing service stays unloaded.

| Service | Consumed by |
|---|---|
| `tools` | every `tool-*` row, `present` |
| `systemPrompt` | `persona`, shell/file/web/todo/delegation rows |
| `workingDirectory` | file, job, office, skill, subagent, present rows |
| `fs` | `tool-fs`, `present`, `tool-office` |
| `shell`, `shellEnv` | `tool-bash` |
| `subprocess` | `tool-fs-search` (bundled ripgrep) |
| `jobs` | `tool-jobs` |
| `skills` | `skill-filesystem`, `tool-skill` |
| `agents` | `agent-instructions`, `time-context`, `tool-skill`, `tool-present`, `tool-office`, `tool-subagent-control` |
| `sessionProjections` | `time-context`, `tool-todo`, `tool-subagent` |
| `userQuestions` | `tool-ask-user` |
| `web` | `tool-web` (requires a configured search provider) |
| `subagents`, `workflowEngine` | the `delegation` group |
| `commands`, `compaction` | the `compaction` group |

`officeKit`, `attachments`, and `llm` are read at call time by `tool-office`; when the host lacks them, that call fails with a clear error and the preset still mounts.

## External tools (optional, detected at run time)

These are not required to install or mount the mode. The LaTeX rows are required only when the user writes LaTeX.

| Tool | Needed for | Install |
|---|---|---|
| `xelatex` (or `lualatex`) | Chinese/Unicode LaTeX documents | TeX Live: `texlive-xetex` + `texlive-lang-chinese` on Debian/Ubuntu |
| `pdflatex` | English LaTeX documents | `texlive-latex-recommended` |
| `latexmk` | Automatic rerun and bibliography ordering | `latexmk` package; without it the bundled script falls back to manual passes |
| `bibtex` / `biber` | Reference lists | `texlive-bibtex-extra`, `biber` |
| `ctex`, `gbt7714`, `biblatex` | Chinese typesetting, GB/T 7714, modern bibliography | `texlive-lang-chinese`, `texlive-bibtex-extra` |
| Noto CJK or other Chinese fonts | XeLaTeX font lookup | `fonts-noto-cjk`, `noto-fonts-cjk`, `google-noto-sans-cjk-fonts` |
| `pdfinfo`, `pdffonts` | Page count, font embedding checks | `poppler-utils` (optional) |

Office rendering and docx conversion use the LibreOffice kit shipped inside the DSH installation (native where available, WASM elsewhere); a system LibreOffice is not required. Web search requires a search provider configured in DSH, and literature verification requires network access.

## How dependencies are checked

1. **Install time**: `dsh plugin add` compares `engines.dsh` with the running DSH version; a mismatch refuses the bundle.
2. **Repository check**: `pnpm run check` (`scripts/check-bundle.mjs`) validates the manifest, patch YAML, locale files, detail documents, skill frontmatter, and package contents. When a DSH installation is resolvable (or `DSH_PACKAGE_DIR` is set), it also:
   - resolves every `@deepseek-ai/*` row against that installation;
   - compares the row set with the shipped `standard` preset, catching renamed or removed packages;
   - checks the installed DSH version against `engines.dsh`.
3. **CI**: the `validate` workflow installs DSH at the `engines.dsh` floor, runs the strict check, packs the bundle, and installs it into a throwaway profile to confirm the layer composes.

## Compatibility matrix

| Bundle | DSH range | Verified with |
|---|---|---|
| 1.2.x | `>=0.2.2-rc.3 <0.4.0` | 0.2.2-rc.3 (CI floor) |
| 1.0.x–1.1.x | `>=0.2.2-rc.3 <0.4.0` | 0.2.2-rc.3 (manual) |

When a new DSH release changes a plugin name, config schema, or preset behavior, update the patch, run `pnpm run check`, install into a throwaway profile, create a session, and verify the tool catalog before widening `engines.dsh`.

## Updating the floor or ceiling

1. Install the target DSH release.
2. Run `DSH_PACKAGE_DIR=<dsh-package-dir> node scripts/check-bundle.mjs --strict`.
3. Run the release workflow's pack/install steps locally against a temporary `DSH_HOME`.
4. Change `engines.dsh`, add a CHANGELOG entry, and tag the release.

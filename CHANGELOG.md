# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-11-22

### Added

- `paper-decisions` skill: a decision record for papers revised across sessions. It keeps two files in the paper repository — an append-only `decisions.md` (date, type, trigger, options, criteria, ruling, reason, impact, status) and a living `theory-map.md` (theory → construct → operationalization → section → test, with a Mermaid graph) — and specifies the loop that makes them useful: read the relevant rulings before a structural revision, ask the user when a new change contradicts one, append after, and mark superseded entries instead of deleting them.
- Literature decisions are covered by the same log: why a paper was kept, dropped, or only mentioned in the discussion, with the criteria recorded rather than a bare "not relevant".
- A conflict-check procedure: compress each settled ruling into a testable proposition, compare it against the abstract and introduction's promises, the hypotheses and model, and the conclusion, then report mutual exclusion, tension, or no conflict — with locations and suggested precedence, without editing on its own.
- One persona line points at the skill and fixes the trigger: a user comment, or the model restructuring on its own.

### Changed

- The persona grows by about 90 characters (3,482 → 3,572); the skill carries the detail, so nothing else is added to the standing prompt.

### Notes

- Mermaid renders in Typora, Obsidian, and GitHub, but not in the DSH chat renderer, which has no diagram support; the skill therefore tells the model to use a table or an outline in chat and to keep the Mermaid block for the file.
- The record stores decisions and their reasons, not model reasoning traces: internal reasoning cannot be reviewed, so logging it would only add noise.

## [1.3.0] - 2026-11-19

### Added

- Four behavioural rules in the persona, each aimed at a failure mode seen in a real humanities session:
  - **Diagnosis ships with the smallest usable draft.** A complaint such as "this section doesn't read clearly" is a revision request, not a question: the problem list must be followed by pasteable replacement text for that passage.
  - **Rewrite, rewrite-again, and polish requests deliver the artefact**, not a description of what the artefact should contain.
  - **State the kind of study and why the materials belong together** when framing a research question; materials that each stand alone do not make a systemic problem.
  - **Workspace drafts are material, not instructions.** A draft left by an earlier session is not the text the user is asking about, and it carries no presumption of correctness; cite it in one line instead of turning the answer into a review of it. This one is preventive: it rests on a single observed case.

### Changed

- Persona compressed from 3,950 to 3,482 characters while gaining the four rules above. The LaTeX section drops from 1,227 to 471 characters: engine choice, project layout, bibliography backends, log triage, and submission checks now live only in the `latex-paper` skill, which the persona instructs the model to load before touching a `.tex` project.
- Generic English mechanics advice (subject-verb agreement, articles) removed from the persona; it restated what the model already does.
- README notes the persona's size as about 3,500 characters.

### Evidence

- Rule 1 and 2 were A/B tested on the same model: draft delivery rose from 1/2 to 2/2 runs, and the "two-variant inconsistency" catch from 1/2 to 2/2.
- Rule 3 raised the "why must these be examined together" framing from 0/2 to 2/2.
- Compression was regression-tested on the Debian `gbt7714.sty` task (2/2 correct package, versus 2/3 before) and the topic-narrowing task (unchanged). Two replicates per cell, one model, two tasks: this shows no observed regression, not equivalence.

## [1.2.1] - 2026-11-19

### Removed

- The `topics` workflow. Repository topics are now set once by hand (About → Topics, or `.github/scripts/set-topics.sh`). Syncing them from CI required storing a repository-administration token, and topics are not a delivery channel for a bundle that is discovered through the DSH plugin market and npm keywords. The list also drops from 15 to 6 topics, keeping only the ones narrow enough to surface anything.

## [1.2.0] - 2026-11-19

### Added

- Bundled `latex-paper` skill (workflow, five references, two build scripts, and project templates) mounted through `skill-filesystem`, with engine detection, `latexmk`/manual build fallback, error and undefined-reference gates, and PDF layout checks.
- Linux and macOS are first-class hosts: the preset keeps the complementary bash/PowerShell rows, and the new scripts are POSIX `bash`.
- `scripts/check-bundle.mjs`: validates the manifest, patch YAML, locale files, detail documents, skill frontmatter and scripts, workflows, LF line endings, and packed contents; resolves every plugin row against an installed DSH when available.
- GitHub Actions: `validate` (checks, pack inspection, DSH floor compatibility) and `release` (tag-verified pack, CHANGELOG notes, tarball, SHA-256).
- `topics` workflow and `.github/topics.txt` for repository-topic discoverability.
- Bilingual documentation: English README (default) and `README.zh-CN.md`; the Plugins detail page is split into `docs/DETAIL.en.md` and `docs/DETAIL.zh.md`.
- `docs/DEPENDENCIES.md`: dependency matrix, compatibility policy, and external-tool install table.
- `docs/PROMPT-LANGUAGE.md`: a 60-run comparison of the Chinese methodology prompt against an English translation, with the measured token cost and the reason the bundle keeps one canonical prompt.

### Changed

- Package renamed from `@local/dsh-paper-preset` to `dsh-paper-mode`; `private` removed, and `publishConfig`, `homepage`, `bugs`, keywords, and `packageManager` added.
- Persona adds a LaTeX section, asks for the delivery format during alignment, and treats LaTeX as a first-class deliverable.
- Detail pages, README, and dependency notes now document the Linux/macOS shell, TeX toolchain, and CJK font requirements.

### Removed

- `docs/DETAIL.md`, replaced by the bilingual detail pages.

## [1.1.0] - 2026-11-19

### Added

- Initial public snapshot of the paper-writing preset: a standing Chinese methodology prompt, 17 plugin rows, Chinese and English Plugins-page locale files, an icon, and the MIT license.

[1.4.0]: https://github.com/revive/dsh-paper-mode/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/revive/dsh-paper-mode/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/revive/dsh-paper-mode/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/revive/dsh-paper-mode/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/revive/dsh-paper-mode/releases/tag/v1.1.0

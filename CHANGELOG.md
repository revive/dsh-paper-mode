# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.2.1]: https://github.com/revive/dsh-paper-mode/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/revive/dsh-paper-mode/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/revive/dsh-paper-mode/releases/tag/v1.1.0

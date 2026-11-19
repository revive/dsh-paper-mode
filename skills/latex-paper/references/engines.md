# Engines, installation, and fonts

Choose the engine from what the project already uses. Changing the engine to dodge an error is a last resort, and it changes font handling, Unicode support, and package compatibility.

## Choose the engine

| Evidence in the project | Engine |
|---|---|
| `\documentclass{ctexart}`, `\documentclass{ctexrep}`, `\documentclass{ctexbook}`, `\usepackage{ctex}` | XeLaTeX or LuaLaTeX |
| `xeCJK`, `fontspec`, `unicode-math`, `polyglossia` | XeLaTeX or LuaLaTeX |
| `article` / `IEEEtran` / `acmart` / `elsarticle` with `inputenc` + `fontenc` | pdfLaTeX |
| `luacode`, `luatexja`, Lua-specific packages | LuaLaTeX |
| `% !TEX program = <engine>` magic comment | that engine |
| A venue template that names its compiler | that compiler |

`latexmk` maps the engine to a flag: `-pdf` for pdflatex, `-xelatex` for XeLaTeX, `-lualatex` for LuaLaTeX. A `.latexmkrc` can set `$pdf_mode` instead: 1 = pdflatex, 4 = LuaLaTeX, 5 = XeLaTeX.

## Install the toolchain

Install what the project needs, not necessarily everything. A typical Chinese paper needs an engine, `latexmk`, `texlive-lang-chinese`, and one bibliography backend.

| Platform | Command |
|---|---|
| Debian / Ubuntu | `sudo apt install texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-lang-chinese latexmk biber` |
| Fedora | `sudo dnf install texlive-scheme-medium texlive-lang-chinese latexmk biber` |
| Arch / Manjaro | `sudo pacman -S texlive-core texlive-latexextra texlive-langchinese texlive-bibtexextra latexmk biber` |
| openSUSE | `sudo zypper install texlive-xetex texlive-latex texlive-lang-chinese latexmk biber` |
| macOS | MacTeX (`brew install --cask mactex-no-gui`) or `brew install texlive` |
| Windows | TeX Live (full) or MiKTeX with on-demand package installation; run builds in PowerShell |
| WSL2 | Follow the Ubuntu row; Chinese fonts must be installed inside WSL, not only on Windows |

Debian and Ubuntu do not ship a working `tlmgr`; install missing packages through `apt` (`texlive-latex-extra`, `texlive-science`, `texlive-bibtex-extra`, `texlive-fonts-extra`). A TeX Live installation from upstream keeps `tlmgr install <package>` available.

## Chinese fonts

XeLaTeX finds fonts through the operating system, so the font named in the preamble must exist on the machine that compiles.

```bash
fc-list :lang=zh family | sort -u | head -20   # what this machine has
kpsewhich ctex.sty fandol.sty                  # what TeX Live provides
```

- `ctex` works out of the box with the bundled Fandol fonts when `texlive-lang-chinese` is installed.
- For print quality, install Noto CJK (`fonts-noto-cjk` on Debian/Fedora, `noto-fonts-cjk` on Arch) and set an explicit font.
- In a minimal CI image, install the fonts as a build step or glyphs disappear with "Missing character" warnings that do not stop the build.

```latex
% ctex document class or package
\setCJKmainfont{Noto Serif CJK SC}
\setCJKsansfont{Noto Sans CJK SC}

% plain article with fontspec
\usepackage{fontspec}
\setmainfont{Noto Serif CJK SC}
```

## Compile commands

```bash
# XeLaTeX project with a bibliography
latexmk -xelatex -interaction=nonstopmode -halt-on-error -file-line-error -synctex=1 main.tex

# English paper
latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error main.tex

# Watch mode while drafting
latexmk -pvc -xelatex -interaction=nonstopmode main.tex

# Manual fallback without latexmk
xelatex -interaction=nonstopmode -halt-on-error main.tex
biber main            # or: bibtex main
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
```

`latexmk -c` removes auxiliary files but keeps the PDF; `latexmk -C` also removes the PDF. Do not delete `.bbl` by hand when `biber` or `bibtex` is configured, and do not leave stale `.aux` files after renaming labels or the main file.

## Reproducibility

- Pin the TeX Live year when the paper must compile in a specific venue pipeline; upstream `tlmgr` can roll back packages with `tlmgr install --reinstall` only within the installed year.
- In CI, use a TeX Live container (`texlive/texlive:<year>`) or `xu-cheng/latex-action` with `root_file` and `latexmk_use_xelatex`.
- Record the engine and TeX distribution in the source package README so a copy editor can reproduce the PDF.
- `tectonic` is convenient for a single self-contained paper: it downloads packages on demand, but it can diverge from the venue's TeX Live version.

## Version pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `biblatex` complains about `biber` version | TeX Live package versions are split | update `biblatex` and `biber` together, or use the version pinned by the distribution |
| `fontspec` cannot find the font | Font missing or name mismatch | `fc-list`, then use the exact family name |
| `Unicode character ... not set up` | pdfLaTeX compiling Unicode text | switch to XeLaTeX, or replace the character |
| Package not found after `tlmgr install` | Two TeX installations on `PATH` | `which pdflatex`, `tlmgr --version`, align them |

# Project layout that stays maintainable

A paper repository is a program: one entry point, small modules, and reproducible inputs. Keep the buildable sources together and keep generated files out of version control.

## Recommended layout

```text
paper/
├── main.tex                 # preamble + \include calls only
├── preamble.tex             # optional: packages, macros, fonts
├── sections/
│   ├── 01-introduction.tex
│   ├── 02-related-work.tex
│   ├── 03-method.tex
│   ├── 04-results.tex
│   └── 05-conclusion.tex
├── figures/
│   ├── pipeline.pdf
│   └── results.png
├── tables/                  # optional: \input files shared with appendices
├── refs.bib
├── latexmkrc                # or .latexmkrc
├── Makefile                 # optional wrapper
└── .gitignore
```

Keep the main file's preamble readable: group packages by purpose (encoding and fonts, layout, floats, math, tables, references, links), and put project macros in `preamble.tex` only when the preamble grows past a screen.

## main.tex skeleton

```latex
\documentclass[UTF8,a4paper,12pt]{ctexart}

\input{preamble}

\title{...}
\author{...}
\date{\today}

\begin{document}
\maketitle
\begin{abstract}
...
\end{abstract}

\tableofcontents   % only for theses and reports

\include{sections/01-introduction}
\include{sections/02-related-work}
\include{sections/03-method}
\include{sections/04-results}
\include{sections/05-conclusion}

\bibliographystyle{plainnat}
\bibliography{refs}
\end{document}
```

`\include` starts a new page and writes one `.aux` file per chapter; `\input` is a plain textual paste. Use `\include` for chapters and `\includeonly{sections/03-method}` while editing one chapter; use `\input` for tables, algorithms, and snippets that must not break pages.

## Figures and tables

- Prefer vector output: PDF for plots (matplotlib `savefig("x.pdf")`), PNG at 300 dpi or higher for screenshots. pdfLaTeX cannot read SVG or EPS directly; convert to PDF first.
- Keep one `\graphicspath{{figures/}}` and reference files without a directory: `\includegraphics[width=0.8\linewidth]{pipeline}`.
- Set width relative to `\linewidth` or `\textwidth`, never in absolute centimeters, so the figure survives a two-column template.
- Use `booktabs` rules (`\toprule`, `\midrule`, `\bottomrule`), `siunitx` for numbers and units, and `threeparttable` for table notes.
- Put captions in a consistent position (above tables, below figures) and make each caption self-contained.
- Use `subcaption` for subfigures; never nest `figure` environments.
- Place floats with `[tbp]`, not `[H]`, unless the venue forbids floating; `H` creates large white gaps.

## Paths and portability

- File names: ASCII, no spaces, no uppercase/lowercase collisions. Windows and macOS are case-insensitive; Linux is not, so `Figure.PDF` and `figure.pdf` are different files on the build server.
- Reference figures with forward slashes; backslashes break on Linux and in CI.
- Do not use absolute paths such as `C:/Users/...` or `/home/...`.
- Test the build from a clean clone, not only from the author's working directory.
- Keep line endings LF (the repository's `.gitattributes` can enforce it); some editors convert `.tex` to CRLF and produce odd spacing in verbatim content.

## Version control

```gitignore
# LaTeX auxiliary output
*.aux
*.log
*.out
*.toc
*.lof
*.lot
*.bbl
*.blg
*.run.xml
*.bcf
*.fls
*.fdb_latexmk
*.synctex.gz
*.xdv
*.nav
*.snm
*.vrb

# Build directories
build/
.dist/
```

Commit: `.tex`, `.bib`, `.bst`/`.cls`/`.sty` the venue requires, figures, and the build configuration. Do not commit the generated PDF unless the repository is the submission artifact; a PDF committed beside the source drifts silently. If a repository must keep large figure files, use Git LFS for `*.pdf`, `*.png`, `*.tiff` and document it.

## Collaboration habits

- One chapter per file keeps merge conflicts local.
- Agree on label prefixes and citation keys before parallel writing: `fig:`, `tab:`, `sec:`, `eq:`; `firstauthorYEARkeyword`.
- Run the build once after every merge; a broken preamble blocks everyone.
- Keep a `README` in the paper repository with the engine, TeX distribution, build command, and data availability statement.

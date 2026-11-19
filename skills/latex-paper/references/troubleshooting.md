# Diagnosing LaTeX build failures

Read the log in order. The first error is the cause; everything after it is often noise, especially after an unmatched brace or a missing `\end{document}`.

## Read the log efficiently

```bash
# First hard error with its line number
grep -n -m 5 '^!' main.log
grep -n -m 5 'l\.[0-9]' main.log

# Locate context around the first error
awk '/^!/{print NR": "$0; for(i=0;i<6;i++){getline; print NR": "$0}; exit}' main.log

# Warnings worth acting on
grep -nE 'undefined (reference|citation)|Citation .* undefined|multiply defined|Missing character' main.log

# Layout warnings (count first, inspect only if they affect the PDF)
grep -c 'Overfull \\hbox' main.log
```

Compile with `-file-line-error` so the error names `file:line`, not just `l.<n>`. With an `\include`d chapter, the line number refers to that chapter file, not `main.tex`.

## Error table

| Message | Cause | Fix |
|---|---|---|
| `File 'foo.sty' not found` | package not installed | `tlmgr install foo` (upstream TeX Live) or install the matching `texlive-*` package; check `kpsewhich foo.sty` |
| `LaTeX Error: File 'bar.cls' not found` | venue class file missing or in the wrong directory | copy the class file beside `main.tex`; do not rename it |
| `fontspec error: "font-not-found"` | font absent or family name wrong | `fc-list :lang=zh family`, then use the exact name; install fonts-noto-cjk |
| `Missing character: There is no ... in font` | glyph missing in the chosen font | use a font with Chinese coverage; avoid mixing symbol fonts |
| `Unicode character ... not set up for use with LaTeX` | pdfLaTeX compiling Unicode text | switch to XeLaTeX/LuaLaTeX; or replace the character |
| `! Package inputenc Error: Unicode character` | pdflatex with UTF-8 characters outside its tables | switch engine, or add `\DeclareUnicodeCharacter` |
| `Undefined control sequence` | typo, missing package, or command from a newer TeX Live | check spelling; add the package; check the command exists in this version |
| `Missing $ inserted` | `_`, `^`, or `%` used outside math mode | escape as `\_`, `\textasciicircum`, `\%`, or enter math mode |
| `Missing } inserted` / `Runaway argument` | unmatched brace or an unclosed environment | balance braces; check `\newcommand` and `\caption` arguments |
| `LaTeX Error: \begin{document} ended by \end{foo}` | environment nesting error | close in reverse order; check `\begin{figure}` inside `\end{table}` |
| `LaTeX Error: Something's wrong--perhaps a missing \item` | list environment without `\item` | add `\item`, or check an environment leaked from the previous line |
| `Emergency stop` | too many errors, missing `\end{document}`, or a fatal macro loop | fix the first error; check `\end{document}` exists |
| `TeX capacity exceeded` | recursion, huge table, or self-referencing macro | simplify the macro/table; raise `main_memory` only as a last resort |
| `! I can't find file 'figures/x.pdf'` | wrong path, missing extension, case mismatch | check `\graphicspath`, file name case, and that the file was committed |
| `pdfTeX error ... cannot determine size of graphic` | unsupported image format | convert EPS/SVG to PDF; check PNG is not corrupt |
| `Package hyperref Error: Wrong DVI mode driver` | hyperref loaded under the wrong engine or before it | load `hyperref` last, after `fontspec`/`unicode-math`; do not pass a driver manually |
| `! LaTeX Error: Option clash for package foo` | package loaded twice with different options | load once with all options, usually in the preamble |
| `biber: Cannot find 'main.bcf'` | biber ran before the first engine pass | run the engine first; use latexmk so the order is automatic |
| `Package biblatex Error: File 'main.bbl' not created` | backend failed | inspect `main.blg`, fix the .bib entry, rerun the full cycle |
| `Citation 'x' undefined` after a full build | key mismatch or excluded `.bib` | compare keys exactly; check `\bibliography` / `\addbibresource` |
| `Reference 'fig:x' undefined` | label after the reference, or no second pass | put `\label` after `\caption`; rerun the engine |
| `There were multiply-defined labels` | duplicate `\label` | make labels unique; check copied chapter files |
| `No room for a new \write` | too many packages allocating write registers | remove packages; use `\RequirePackage` sparingly |
| `LaTeX Warning: Float too large for page` | figure or table taller than the text block | scale the figure, split the table, or use `\begin{table}[p]` |
| `Overfull \hbox (12.3pt too wide)` | a line cannot break | shorten text, add hyphenation, adjust `\emergencystretch`, or fix the column width; never blanket `\sloppy` |
| `Underfull \vbox` in the bibliography | stretched page | adjust spacing after the real errors are fixed |
| `! LaTeX Error: \pdfendlink ended up in different nesting level` | hyperref link split across pages | move the link, break the paragraph, or upgrade `hyperref` |

## Stale auxiliary files

Symptoms that survive a correct source: old page numbers, ghost references, duplicate citations, a bibliography that never updates. Clean the generated files, not the sources:

```bash
latexmk -c          # remove aux files, keep the PDF
latexmk -C          # also remove the PDF
rm -f main.aux main.bbl main.blg main.bcf main.run.xml main.toc main.out
```

After renaming a chapter file or a label, delete the stale `.aux` files by hand; latexmk usually detects it, a bare engine loop does not.

## Images and fonts

- `\includegraphics` without an extension prefers PDF, then PNG, then JPG, depending on the engine. Be explicit when a directory holds two formats of the same figure.
- pdflatex cannot include SVG or EPS. Convert with `inkscape --export-filename=fig.pdf fig.svg` or `epstopdf`.
- Transparent PNGs render with a black background in some PDF viewers; flatten them.
- If Chinese glyphs are boxes, the font lacks them: confirm with `pdffonts main.pdf` and set a CJK font that exists.
- For a missing glyph in one word, replace the character or set a fallback font, not the whole document font.

## When the error is in a package or class

- Read the package documentation shipped beside it (`texdoc foo` or `kpsewhich foo.pdf`), not a random blog post from an older version.
- Check the version: `kpsewhich foo.sty` and the header comment show the release date.
- Reproduce the failure in a minimal example (a few preamble lines and one offending paragraph). Most "LaTeX bugs" are option clashes or obsolete commands.
- If a venue class fails on its own template, do not patch the class silently: report the exact version, engine, and error, and ask the venue or use the documented workaround.

## Delivery gate

Do not hand over a PDF while any of these remain:

- a hard error, or a run that exited non-zero;
- `undefined references` or `undefined citations`;
- missing glyph warnings for text that should be visible;
- a page count over the venue limit;
- a figure or table missing from the PDF.

Warnings about overfull boxes, underfull boxes, and font substitutions are judgment calls; report the ones that visibly damage the page.

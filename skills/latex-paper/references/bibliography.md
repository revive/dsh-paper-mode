# References: BibTeX, biblatex, and verification

Pick one backend per project and keep it consistent. Mixing `natbib` with `biblatex`, or running `bibtex` on a `biber` project, produces errors that look like content problems but are toolchain problems.

## Which backend fits which template

| Project | Package / class | Backend | Typical commands |
|---|---|---|---|
| Generic English paper, author-year | `natbib` | BibTeX | `\bibliographystyle{plainnat}`, `\bibliography{refs}` |
| Generic English paper, numeric | `natbib` | BibTeX | `\bibliographystyle{unsrtnat}` |
| IEEE conference / journal | `IEEEtran` | BibTeX | `\bibliographystyle{IEEEtran}` |
| ACM | `acmart` | BibTeX (natbib) | `\bibliographystyle{ACM-Reference-Format}` |
| Elsevier | `elsarticle` | BibTeX | `\bibliographystyle{elsarticle-num}` or `elsarticle-harv` |
| Chinese GB/T 7714 | `gbt7714` (BibTeX) or `biblatex-gb7714-2015` (biber) | either | `\bibliographystyle{gbt7714-numerical}` or `\usepackage[style=gb7714-2015]{biblatex}` |
| Modern biblatex setup | `biblatex` | Biber | `\addbibresource{refs.bib}`, `\printbibliography` |
| APA 7 | `biblatex-apa` (biber) or `apacite` (BibTeX) | either | `\usepackage[style=apa]{biblatex}` |
| Chicago | `biblatex-chicago` | Biber | `\usepackage[authordate]{biblatex-chicago}` |

Minimal setups:

```latex
% BibTeX + natbib
\usepackage[numbers,sort&compress]{natbib}
\bibliographystyle{unsrtnat}
\bibliography{refs}

% biblatex + biber
\usepackage[backend=biber,style=numeric,sorting=none]{biblatex}
\addbibresource{refs.bib}
\printbibliography
```

If a venue ships a class file, use the bibliography commands its documentation prescribes instead of these defaults.

## .bib hygiene

- One key per work, stable across rewrites: `surnameYEARkeyword`, for example `chen2026latex`. Lowercase keys avoid case-sensitivity surprises.
- Use the correct entry type: `@article` for journals, `@inproceedings` for conference papers, `@book` for books, `@incollection` for chapters, `@phdthesis` / `@mastersthesis`, `@techreport`, `@misc` or `@online` for websites and preprints.
- Required fields for an article: author, title, journal, year, volume, number, pages, doi. A missing volume or page range is visible in the PDF reference list.
- Store real Unicode text (UTF-8) with XeLaTeX/biber; for BibTeX with pdfLaTeX, use LaTeX escapes for accents (`{\'e}`) and check the `.bib` encoding.
- Protect capitalization with braces: `{BERT}`, `{LaTeX}`. Protect corporate authors with double braces: `{{World Health Organization}}`.
- Use `month` as `jan`..`dec` for BibTeX, and `date = {2026-11-19}` for biblatex.
- Escape special characters: `\&`, `\%`, `\_`, `\#`, `\$`. A bare `&` inside a title silently breaks the table parser.
- Keep the `.bib` file sorted or grouped by topic; duplicates under different keys waste review time and split citations.
- Do not cite a paper you have only seen in another paper's reference list without verifying it.

## Chinese references (GB/T 7714)

- `gbt7714` (BibTeX) requires `\usepackage{gbt7714}` and `\bibliographystyle{gbt7714-numerical}` (or `gbt7714-author-year`); it needs `texlive-bibtex-extra` or `tlmgr install gbt7714`.
- `biblatex-gb7714-2015` needs biber, plus XeLaTeX for Chinese sorting. Set `\usepackage[backend=biber,style=gb7714-2015]{biblatex}`.
- Chinese entries need `language = {chinese}` (biblatex) or the matching `gbt7714` field so that "等" and punctuation are correct.
- Use the Chinese author's name as it appears in the publication; do not transliterate inconsistently across entries.
- For bilingual entries (Chinese paper with English abstract), keep one entry and one language, not two duplicate entries.
- GB/T 7714-2015 examples:
  - Journal: 作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.
  - Book: 作者. 书名[M]. 版次. 出版地: 出版社, 年: 页码.
  - Thesis: 作者. 题名[D]. 城市: 学校, 年.
  - Standard: 标准编号 标准名称[S]. 出版地: 出版社, 年.
  - Online: 作者. 题名[EB/OL]. (发布日期)[引用日期]. URL.

## Verify every entry

Before delivery, check each entry against a primary source:

- DOI resolves on `https://doi.org/<doi>` and the title/authors match.
- Crossref metadata: `https://api.crossref.org/works/<doi>` returns the canonical title, venue, volume, pages, and year.
- For Chinese literature, check CNKI or Wanfang for the exact title, journal, year, issue, and pages; check the author order.
- For arXiv preprints, record the arXiv id and version; note whether the paper was later published.
- Verify that cited claims actually appear in the cited work; a reference list can be correct while the citation placement is wrong.

Mark anything you cannot verify as `TODO-verify` rather than inventing fields. Tell the user which entries remain unverified.

## Common errors

| Message | Cause | Fix |
|---|---|---|
| `I couldn't open database file refs.bib` | wrong path or extension | use `\bibliography{refs}` without `.bib`; check the working directory |
| `Citation 'x' undefined` | key missing, or no BibTeX/biber pass | check the key, then run the full build loop |
| `There were undefined references` | labels or citations changed | rerun the engine twice after the bibliography pass |
| `Package biblatex Warning: Please (re)run Biber` | biber has not run | run `biber main`, or let latexmk do it |
| `File 'main.bbl' not created` | backend failed | read `main.blg`, fix the .bib entry, rerun |
| `biber: Cannot find 'main.bcf'` | latexmk/biber sequence broken | run the engine once before biber |
| Wrong sort order or missing "et al." | style option mismatch | fix `style`/`sorting`, not the .bib data |
| Reference list empty | `\printbibliography` or `\bibliography` missing | add the command, rebuild |
| Duplicate keys | copy-pasted entries | keep one, merge fields |
| `\cite` prints [?] | citation before bibliography pass | run the engine, backend, engine, engine |

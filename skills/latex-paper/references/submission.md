# Submission package and final PDF checks

A submission is a build artifact plus its sources. Check both in a clean directory, not in the working tree that produced them.

## Read the venue rules first

Collect these before formatting anything:

- page limit and whether references, appendices, and acknowledgements count;
- required template and its version (a class file from last year may be rejected);
- engine required or allowed by the venue;
- anonymization rules for the review version;
- figure resolution, color, and font-embedding rules;
- supplementary material format and size limit;
- declarations: conflicts of interest, funding, data and code availability, generative-AI use, ethics approval;
- submission system quirks: filename rules, PDF-only vs source upload, maximum file size.

When the rules conflict with the template's documentation, follow the current call for papers and say what you chose.

## Review vs camera-ready

Review version:

- remove author names, affiliations, emails, acknowledgements, and funding;
- remove or anonymize self-identifying URLs and repository links ("our previous work" phrasing included);
- check PDF metadata: `\hypersetup{pdfauthor={},pdfcreator={}}` or the venue's anonymization option;
- check embedded images and file paths for identifying names;
- keep line numbers if the venue requests them.

Camera-ready version:

- restore authors, affiliations, acknowledgements, and funding;
- add the final DOI, ORCID, and copyright block the venue requires;
- fix page numbers and the copyright line if the template expects them;
- replace placeholder citations with final references.

## PDF checks

```bash
pdfinfo main.pdf              # page size, page count, title, producer
pdffonts main.pdf             # every font must be embedded
pdftotext main.pdf - | head  # text extraction sanity check
```

Check by eye as well:

- page size is the venue's (A4 vs US Letter);
- no content outside the margins, no clipped tables;
- all figures and tables appear and are numbered in order;
- no "??" references, no "[?]" citations;
- Chinese text renders without boxes or fallback substitutions;
- headers, footers, and page numbers match the template;
- the PDF opens without warnings in a second viewer.

## Source bundle

A source bundle must rebuild the PDF without the author's machine:

```text
main.tex
preamble.tex
sections/*.tex
refs.bib
figures/*.pdf
venue class/style files (only if the venue requires or permits them)
README.txt        # engine, TeX version, build command, known warnings
```

Rules:

- use relative paths only;
- no absolute paths, no `C:\Users\...`, no symlinks;
- include `.bib` and any custom `.bst`;
- do not include `.aux`, `.log`, `.out`, `.toc`, `.bbl`, `.blg`, `.synctex.gz`, or the generated PDF unless asked;
- flatten directories if the submission system cannot handle nested folders;
- test: copy the bundle to an empty directory, run the documented command, compare the PDF.

## arXiv and preprint servers

- Flatten the source and remove build artifacts; arXiv compiles the upload, it does not accept a PDF-only source package.
- Use the engine the paper needs; if the paper needs XeLaTeX, declare it in the submission metadata or a `00README.json`.
- Check that custom fonts are either included or replaced with standard ones; arXiv may not have them.
- Verify the compiled PDF after upload; the preview server can differ from the local TeX Live.
- Link the arXiv DOI in the paper only after it is assigned.

## Chinese journals and thesis submission

- Check the journal's template version on its official site, not a mirror.
- Fill the Chinese and English title, abstract, keywords, and author information consistently.
- Keep the funding note exactly as required; include grant numbers.
- Check the confidentiality review requirement if the institution has one.
- For a thesis, follow the school's format file for cover, declaration page, table of contents, chapter numbering, figure/table captions, references, and appendices.

## Final checklist

- [ ] PDF compiles from a clean copy of the sources with the documented command
- [ ] page limit respected, including references and appendices as the venue counts them
- [ ] all references verified and formatted in one style
- [ ] all figures/tables cited in the text and numbered in order
- [ ] fonts embedded, no missing glyphs, Chinese renders correctly
- [ ] anonymization applied for review, restored for camera-ready
- [ ] declarations and data/code availability statements present
- [ ] file names, sizes, and formats accepted by the submission system
- [ ] known warnings and unverified references reported to the user

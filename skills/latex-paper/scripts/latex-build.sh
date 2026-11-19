#!/usr/bin/env bash
# latex-build.sh - build one LaTeX project with the engine it asks for.
#
# Usage:
#   bash latex-build.sh [MAIN.tex] [--engine auto|pdflatex|xelatex|lualatex]
#                       [--clean] [--clean-all]
#
# Behaviour:
#   * MAIN defaults to the first of main.tex, paper.tex, manuscript.tex,
#     thesis.tex in the current directory, otherwise the first .tex file that
#     contains \documentclass.
#   * --engine auto (the default) reads a "% !TEX program = ..." magic comment,
#     then .latexmkrc, then the project preamble: ctex, xeCJK, fontspec,
#     unicode-math, or polyglossia imply XeLaTeX; otherwise pdfLaTeX.
#   * latexmk is used when installed, so bibliography reruns are automatic.
#     Otherwise the script runs engine -> BibTeX/Biber -> engine -> engine.
#   * --clean removes auxiliary files but keeps the PDF; --clean-all also
#     removes the generated PDF.
#   * Exits non-zero on a hard error, a failed pass, or undefined references.
#
# The script writes only inside the project directory (plus short-lived files
# under /tmp). It never edits sources.

set -euo pipefail

usage() {
  awk 'NR > 1 { if ($0 ~ /^#/) { sub(/^# ?/, ""); print } else { exit } }' "$0"
}

MAIN=""
ENGINE="auto"
CLEAN=0
CLEAN_ALL=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --engine)
      [ "$#" -ge 2 ] || { echo "error: --engine needs a value" >&2; exit 2; }
      ENGINE="$2"
      shift 2
      ;;
    --engine=*)
      ENGINE="${1#*=}"
      shift
      ;;
    --clean)
      CLEAN=1
      shift
      ;;
    --clean-all)
      CLEAN=1
      CLEAN_ALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "error: unknown option $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$MAIN" ]; then
        echo "error: more than one main file given" >&2
        exit 2
      fi
      MAIN="$1"
      shift
      ;;
  esac
done

case "$ENGINE" in
  auto|pdflatex|xelatex|lualatex) ;;
  *) echo "error: unsupported engine '$ENGINE' (use auto, pdflatex, xelatex, or lualatex)" >&2; exit 2 ;;
esac

find_main() {
  local f
  for f in main.tex paper.tex manuscript.tex thesis.tex; do
    if [ -f "$f" ]; then
      printf '%s' "$f"
      return 0
    fi
  done
  for f in *.tex; do
    [ -e "$f" ] || continue
    if grep -qsE '^[^%]*\\documentclass' "$f"; then
      printf '%s' "$f"
      return 0
    fi
  done
  return 1
}

detect_engine() {
  local main="$1" magic rc
  magic="$(sed -n 's/^%[[:space:]]*!TEX[[:space:]]*program[[:space:]]*=[[:space:]]*\([A-Za-z][A-Za-z]*\).*/\1/p' "$main" | head -n 1 | tr '[:upper:]' '[:lower:]')"
  case "$magic" in
    pdflatex|xelatex|lualatex)
      printf '%s' "$magic"
      return 0
      ;;
  esac

  for rc in .latexmkrc latexmkrc; do
    [ -f "$rc" ] || continue
    if grep -qsE '\$pdf_mode[[:space:]]*=[[:space:]]*5' "$rc"; then printf 'xelatex'; return 0; fi
    if grep -qsE '\$pdf_mode[[:space:]]*=[[:space:]]*4' "$rc"; then printf 'lualatex'; return 0; fi
    if grep -qsE '\$pdf_mode[[:space:]]*=[[:space:]]*1' "$rc"; then printf 'pdflatex'; return 0; fi
  done

  if grep -rqsE '(ctex|xeCJK|fontspec|unicode-math|polyglossia|luatexja)' --include='*.tex' .; then
    if command -v xelatex >/dev/null 2>&1; then printf 'xelatex'; return 0; fi
    if command -v lualatex >/dev/null 2>&1; then printf 'lualatex'; return 0; fi
  fi

  if command -v pdflatex >/dev/null 2>&1; then printf 'pdflatex'; return 0; fi
  if command -v xelatex >/dev/null 2>&1; then printf 'xelatex'; return 0; fi
  if command -v lualatex >/dev/null 2>&1; then printf 'lualatex'; return 0; fi
  return 1
}

latexmk_flag() {
  case "$1" in
    pdflatex) printf '%s' '-pdf' ;;
    xelatex) printf '%s' '-xelatex' ;;
    lualatex) printf '%s' '-lualatex' ;;
    *) printf '%s' '-pdf' ;;
  esac
}

run_engine() {
  local engine="$1" base="$2" out
  out="$(mktemp)"
  if ! "$engine" -interaction=nonstopmode -halt-on-error -file-line-error "$base" >"$out" 2>&1; then
    echo "-- $engine failed; last 30 lines --" >&2
    tail -n 30 "$out" >&2
    rm -f "$out"
    return 1
  fi
  rm -f "$out"
}

needs_bib() {
  local base="$1"
  if [ -f "$base.bcf" ]; then return 0; fi
  if [ -f "$base.aux" ] && grep -qsE '\\(bibdata|abx@aux|citation)' "$base.aux"; then return 0; fi
  return 1
}

run_bib() {
  local base="$1" out rc=0
  out="$(mktemp)"
  if [ -f "$base.bcf" ] || grep -rqsE '\\(usepackage(\[[^]]*\])?\{biblatex\}|\\addbibresource)' --include='*.tex' .; then
    if ! command -v biber >/dev/null 2>&1; then
      echo "error: this project uses biblatex, but biber is not installed" >&2
      rm -f "$out"
      return 1
    fi
    biber "$base" >"$out" 2>&1 || rc=$?
  else
    if ! command -v bibtex >/dev/null 2>&1; then
      echo "error: the project has a bibliography, but bibtex is not installed" >&2
      rm -f "$out"
      return 1
    fi
    bibtex "$base" >"$out" 2>&1 || rc=$?
  fi
  cat "$out"
  # BibTeX exits non-zero when the document has no \citation yet; that is not a
  # build failure, so keep going while the database itself opened cleanly.
  if [ "$rc" -ne 0 ] \
     && grep -qs 'I found no \\citation commands' "$out" \
     && ! grep -qs "I couldn't open database file" "$out"; then
    rc=0
  fi
  rm -f "$out"
  return "$rc"
}

clean_project() {
  local base="$1" all="$2"
  if command -v latexmk >/dev/null 2>&1; then
    if [ "$all" -eq 1 ]; then latexmk -C; else latexmk -c; fi
    return
  fi
  rm -f "$base.aux" "$base.log" "$base.out" "$base.toc" \
        "$base.lof" "$base.lot" "$base.bbl" "$base.blg" \
        "$base.bcf" "$base.run.xml" "$base.fls" \
        "$base.fdb_latexmk" "$base.synctex.gz" "$base.xdv" \
        "$base.nav" "$base.snm" "$base.vrb"
  if [ "$all" -eq 1 ]; then
    rm -f "$base.pdf"
  fi
}

summarize() {
  local base="$1" log="$1.log" status=0
  if [ ! -f "$log" ]; then
    echo "build summary: no log produced" >&2
    return 1
  fi
  local errors undef missing overfull underfull pages=""
  errors="$(grep -cE '^!|^[^:[:space:]]+\.(tex|sty|cls|def|cfg):[0-9]+:' "$log" 2>/dev/null || true)"
  undef="$(grep -Eci 'undefined (reference|citation)|(Reference|Citation) .* undefined' "$log" 2>/dev/null || true)"
  missing="$(grep -c 'Missing character' "$log" 2>/dev/null || true)"
  overfull="$(grep -cF 'Overfull \hbox' "$log" 2>/dev/null || true)"
  underfull="$(grep -cE 'Underfull \\[hv]box' "$log" 2>/dev/null || true)"
  errors="${errors:-0}"
  undef="${undef:-0}"
  missing="${missing:-0}"
  overfull="${overfull:-0}"
  underfull="${underfull:-0}"
  if command -v pdfinfo >/dev/null 2>&1 && [ -f "$base.pdf" ]; then
    pages="$(pdfinfo "$base.pdf" 2>/dev/null | awk '/^Pages:/{print $2}')"
  fi

  echo
  echo "== build summary =="
  echo "engine:          $ENGINE"
  echo "main file:       $MAIN"
  echo "errors:          $errors"
  echo "undefined refs:  $undef"
  echo "missing glyphs:  $missing"
  echo "overfull hboxes: $overfull"
  echo "underfull boxes: $underfull"
  if [ -n "$pages" ]; then echo "pages:           $pages"; fi
  if [ -f "$base.pdf" ]; then
    echo "pdf:             $(pwd)/$base.pdf"
  else
    echo "pdf:             not produced"
    status=1
  fi

  if [ "$errors" -gt 0 ]; then
    echo
    echo "-- first errors --"
    grep -nE '^!|^[^:[:space:]]+\.(tex|sty|cls|def|cfg):[0-9]+:' "$log" | head -n 5 || true
    status=1
  fi
  if [ "$undef" -gt 0 ]; then
    echo
    echo "-- undefined references/citations --"
    grep -nE 'undefined (reference|citation)|(Reference|Citation) .* undefined' "$log" | head -n 10 || true
    status=1
  fi
  if [ "$missing" -gt 0 ]; then
    echo
    echo "-- missing glyphs (first 5) --"
    grep -n 'Missing character' "$log" | head -n 5 || true
  fi
  return "$status"
}

if [ -z "$MAIN" ]; then
  if ! MAIN="$(find_main)"; then
    echo "error: no .tex file with \\documentclass found; pass the main file explicitly" >&2
    exit 2
  fi
fi

if [ ! -f "$MAIN" ]; then
  echo "error: main file '$MAIN' does not exist" >&2
  exit 2
fi

if [ "$ENGINE" = "auto" ]; then
  if ! ENGINE="$(detect_engine "$MAIN")"; then
    echo "error: no TeX engine found; run scripts/latex-doctor.sh for install hints" >&2
    exit 2
  fi
fi

if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "error: engine '$ENGINE' is not installed; run scripts/latex-doctor.sh" >&2
  exit 2
fi

cd "$(dirname "$MAIN")"
MAIN="$(basename "$MAIN")"
BASE="${MAIN%.tex}"

if [ "$CLEAN" -eq 1 ]; then
  echo "== cleaning auxiliary files =="
  clean_project "$BASE" "$CLEAN_ALL"
fi

echo "== building $MAIN with $ENGINE =="

run_status=0
if command -v latexmk >/dev/null 2>&1; then
  if ! latexmk "$(latexmk_flag "$ENGINE")" -interaction=nonstopmode -halt-on-error \
       -file-line-error -synctex=1 "$MAIN"; then
    run_status=1
  fi
else
  if ! run_engine "$ENGINE" "$BASE"; then run_status=1; fi
  if [ "$run_status" -eq 0 ]; then
    if needs_bib "$BASE"; then
      if ! run_bib "$BASE"; then run_status=1; fi
    fi
    if [ "$run_status" -eq 0 ]; then
      if ! run_engine "$ENGINE" "$BASE"; then run_status=1; fi
      if ! run_engine "$ENGINE" "$BASE"; then run_status=1; fi
    fi
  fi
fi

summary_status=0
if ! summarize "$BASE"; then summary_status=1; fi

if [ "$run_status" -ne 0 ] || [ "$summary_status" -ne 0 ]; then
  echo
  echo "build failed; fix the first error or undefined reference above and rerun" >&2
  exit 1
fi

echo
echo "build ok"

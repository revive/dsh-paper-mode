#!/usr/bin/env bash
# latex-doctor.sh - report the TeX toolchain available on this machine.
#
# Read-only: it installs nothing and writes nothing.
#
# Usage: bash latex-doctor.sh
#
# Exit 0 when at least one TeX engine is available, 1 otherwise.

set -u

have() { command -v "$1" >/dev/null 2>&1; }

version_of() {
  local cmd="$1" out=""
  out="$("$cmd" --version 2>/dev/null | head -n 1)" || true
  printf '%s' "${out:-unknown version}"
}

os_name() {
  case "$(uname -s)" in
    Linux)
      # shellcheck disable=SC1091
      . /etc/os-release 2>/dev/null || true
      printf '%s' "${PRETTY_NAME:-Linux}"
      ;;
    Darwin) printf 'macOS' ;;
    MINGW*|MSYS*|CYGWIN*) printf 'Windows (%s)' "$(uname -s)" ;;
    *) printf '%s' "$(uname -s)" ;;
  esac
}

echo "== LaTeX toolchain report =="
echo "system: $(os_name)"
echo "kernel: $(uname -srm)"
echo

echo "== commands =="
for c in pdflatex xelatex lualatex latexmk bibtex biber kpsewhich tlmgr; do
  if have "$c"; then
    printf '%-10s ok      %s\n' "$c" "$(version_of "$c")"
  else
    printf '%-10s missing\n' "$c"
  fi
done
echo

echo "== TeX packages =="
if have kpsewhich; then
  for f in ctex.sty fontspec.sty biblatex.sty biblatex-gb7714-2015.sty gbt7714.sty IEEEtran.cls acmart.cls elsarticle.cls; do
    p="$(kpsewhich "$f" 2>/dev/null || true)"
    if [ -n "$p" ]; then
      printf '%-26s %s\n' "$f" "$p"
    else
      printf '%-26s missing\n' "$f"
    fi
  done
else
  echo "kpsewhich not found; cannot probe packages"
fi
echo

echo "== CJK fonts =="
if have fc-list; then
  zh="$(fc-list :lang=zh family 2>/dev/null | sort -u | head -n 8)"
  if [ -n "$zh" ]; then
    printf '%s\n' "$zh"
  else
    echo "no Chinese font found (install fonts-noto-cjk / noto-fonts-cjk / google-noto-sans-cjk-fonts)"
  fi
else
  echo "fontconfig (fc-list) not found; XeLaTeX font lookup may still work"
fi
echo

engine_ok=0
for c in pdflatex xelatex lualatex; do
  if have "$c"; then engine_ok=1; fi
done

if [ "$engine_ok" -eq 0 ]; then
  cat <<'HINT'
No TeX engine found. Install one:

  Debian/Ubuntu: sudo apt install texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-lang-chinese latexmk biber
  Fedora:        sudo dnf install texlive-scheme-medium texlive-lang-chinese latexmk biber
  Arch:          sudo pacman -S texlive-core texlive-latexextra texlive-langchinese texlive-bibtexextra latexmk biber
  macOS:         brew install --cask mactex-no-gui
  Windows:       install TeX Live (full) or MiKTeX, then run builds in PowerShell
HINT
  exit 1
fi

if ! have latexmk; then
  echo "note: latexmk is missing; latex-build.sh will fall back to manual passes"
fi
if ! have biber && ! have bibtex; then
  echo "note: neither biber nor bibtex is installed; bibliography builds will fail"
fi
if ! have xelatex; then
  echo "note: xelatex is missing; Chinese documents (ctex/xeCJK/fontspec) need it"
fi

echo
echo "== result =="
echo "at least one engine is available; see notes above"
exit 0

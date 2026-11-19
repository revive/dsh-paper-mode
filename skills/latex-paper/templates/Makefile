# Makefile wrapper for a latexmk project.
# Copy beside main.tex, then: make, make watch, make clean, make distclean.
# Override on the command line, for example: make ENGINE=pdflatex

MAIN ?= main.tex
ENGINE ?= xelatex
FLAGS ?= -interaction=nonstopmode -halt-on-error -file-line-error -synctex=1
LATEXMK ?= latexmk

ifeq ($(ENGINE),pdflatex)
LATEXMK_ENGINE := -pdf
else
LATEXMK_ENGINE := -$(ENGINE)
endif

.PHONY: all watch clean distclean

all:
	$(LATEXMK) $(LATEXMK_ENGINE) $(FLAGS) $(MAIN)

watch:
	$(LATEXMK) -pvc $(LATEXMK_ENGINE) $(FLAGS) $(MAIN)

clean:
	$(LATEXMK) -c

distclean:
	$(LATEXMK) -C

# Prompt-language study

Reproduces the comparison behind [docs/PROMPT-LANGUAGE.md](../../docs/PROMPT-LANGUAGE.md): the shipped Chinese methodology prompt against the English translation in [prompt-en.md](prompt-en.md).

This directory is research tooling. It is not part of the published bundle and is not listed in package.json files.

## Run it

~~~sh
export STUDY_API=http://127.0.0.1:8000/v1/chat/completions   # any OpenAI-compatible chat endpoint
export STUDY_MODEL=deepseek-v4.1-flash
export STUDY_AUTH="Bearer local"
export STUDY_OUT=.study

node tools/prompt-language-study/run.mjs generate --reps 3
node tools/prompt-language-study/run.mjs score
node tools/prompt-language-study/run.mjs judge
node tools/prompt-language-study/run.mjs analyze
~~~

generate runs 10 tasks x 2 arms x N replicates at temperature 0.7, in shuffled arm order, and writes each answer under an opaque id. score applies the objective checks. judge scores each answer on a 4-dimension rubric and runs an order-swapped pairwise comparison. analyze prints the 2x2, per-task, dimension, pairwise, language-control, and token tables.

Useful flags: --tasks T5-rewrite-en,T7-latex-zh to run a subset, --max-tokens 3000 to lift the per-task cap.

## Read the warnings

- generate prints a warning whenever an answer hits its token cap. A truncated answer is not a bad answer, it is a missing one: re-run that task with --max-tokens before drawing conclusions. The first run of this study did not, and produced a fake "the Chinese prompt knows Debian packaging better" result.
- The judge is the same model as the generator unless STUDY_MODEL points elsewhere for judging. Self-preference is symmetric between arms, a preference for English prose is not.
- The English arm is a translation. Edit prompt-en.md only to keep it structurally identical to the shipped prompt; a divergence invalidates the comparison.

## Results

See [docs/PROMPT-LANGUAGE.md](../../docs/PROMPT-LANGUAGE.md) for the numbers from the 2026-11-19 run.

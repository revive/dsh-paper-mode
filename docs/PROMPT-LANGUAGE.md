# Methodology prompt language: a 60-run comparison

The preset's standing methodology prompt is written in Chinese (9 sections, 44 bullets). The English README and Plugins-page locale are for discoverability, not a switch of the prompt. This note records what changes if the prompt is translated, and reports a controlled comparison run on 2026-11-19.

## Question

Does the language of the methodology prompt change the quality of the answers, and does it interact with the language of the paper being written? The practical worry is the second half: a Chinese prompt might degrade English academic writing, which is exactly the case the README claims to serve.

## Setup

| | |
|---|---|
| Model | `deepseek-v4.1-flash` served by vLLM, `temperature=0.7`, thinking disabled, no tools |
| Arms | `zh`: the shipped `persona.prefix` + `suffix`; `en`: a faithful English translation of the same text (same 9 headings, same 44 bullets) |
| Tasks | 10 tasks, 5 expecting Chinese output and 5 expecting English output |
| Replicates | 3 per cell, cell order shuffled, opaque ids assigned before scoring |
| Runs | 60, plus 24 re-runs after fixing a truncation artifact |

Tasks: topic narrowing; literature-gap synthesis under a strict citation budget; splitting mixed results/interpretation into IMRaD; Chinese academic rewrite; English academic rewrite; reference verification with a known ground truth; a Debian/TeX Live package-resolution failure; a reviewer response; a structured abstract under numeric constraints; a results paragraph with five planted reporting errors.

Scoring had two independent parts:

- **Objective checks**, fixed before the run: citation-budget compliance, word limits, section separation, number preservation, output language, and ground-truth facts (which reference is fabricated, which field is wrong, which apt package owns `gbt7714.sty`, how many planted errors were caught). These are language-neutral by construction.
- **Judge**: the same model, blind to arm, scoring each answer 1-5 on adherence, specificity, caution, and craft, plus an order-swapped pairwise comparison per (task, replicate). The rubric instructs it to ignore language, length, and formatting.

## Three measurement artifacts, and what they would have caused

All three are worth recording, because each produced a confident and wrong conclusion before it was caught.

**Truncation.** The first pass capped four tasks at 900-1200 output tokens. The English arm hit the cap on the two knowledge-heavy tasks while the Chinese arm did not, so the Chinese prompt looked better there: T6 0.92 vs 0.75, T7 0.83 vs 0.67. Re-running those four tasks with a 3000-token cap removed the effect (T6 1.00 vs 0.92, T7 0.92 vs 0.92). The apparent "the Chinese prompt knows Debian packaging better" finding was an output-length artifact.

**A block-extraction bug in the reference task.** The checker sliced each `[n]` entry up to the next Markdown heading, and an answer that opened its entry with `## [2]` truncated the block to nothing. Both arms then looked like they had failed to diagnose the corrupted reference. After the fix, every run that diagnosed it was counted.

A third bug, in the same task, counted an honest "do not cite this until verified" as a claim that the entry was verified. Fixing it removed a second false difference.

## Results

**Quality.** No reliable difference.

| Measure | Chinese prompt | English prompt |
|---|---|---|
| Objective compliance (0-1) | 0.964 | 0.983 |
| Judge, 4 dimensions (1-5) | 4.34 | 4.32 |
| Paired objective, per (task, replicate) | better in 2 | better in 4 (24 equal) |
| Pairwise, order-consistent pairs | 4 wins | 11 wins |
| Pairwise sign test | - | p = 0.12 |

The objective checks lean English by about 2 points, the absolute judge leans Chinese by 0.02, and the pairwise judge leans English at 73% of resolved pairs but is not significant. Read together: the effect is small, inconsistent across instruments, and within what 3 replicates can resolve.

**Where the differences are.** Four checks separated the arms, each by one run in three, and they point in different directions:

| Check | Chinese prompt | English prompt |
|---|---|---|
| Topic task gave at least three candidate titles | 2/3 | 3/3 |
| Literature paragraph stayed within 150-200 words | 2/3 (mean 205 words) | 3/3 (mean 171) |
| English rewrite kept the cross-sectional caveat | 2/3 | 3/3 |
| Did not assert an error in a correct reference | 3/3 | 2/3 |

The last one is the only outright fabrication: one English-prompt run declared that MoodleREC was published in *Computers & Education* and flagged the journal as wrong, while Crossref confirms *Computers in Human Behavior*, matching the DOI prefix. Both arms also misnamed the Debian package in one run of three (`texlive-lang-chinese` instead of `texlive-bibtex-extra`, verified on this machine with `dpkg -S`), so the knowledge tasks did not separate the arms.

**Cost.**

| | Chinese prompt | English prompt |
|---|---|---|
| Prompt tokens | 2,557 | 2,790 (+9.1%) |
| Completion tokens, all tasks | 743 | 863 (+16.1%) |
| Completion tokens, Chinese-output tasks | 625 | 852 (+36%) |
| Completion tokens, English-output tasks | 862 | 873 (+1.3%) |

The English prompt costs materially more on Chinese tasks and essentially nothing on English ones.

**Language control.** The English prompt answered in the requested language in 30/30 runs. The Chinese prompt did so in 29/30: one English reviewer-response task came back with English headings over a Chinese body.

**Ceiling effects.** Five of ten tasks scored 1.00 on objective checks for both arms, and judge scores occupied only 3.75-5.00. The instrument cannot separate the arms on tasks both do well, which is itself the finding.

**Length bias check.** Pearson r between answer length and judge score is -0.13, so the judge did not reward verbosity; the English arm's longer answers gained nothing from their length.

## What this supports

- **Keep one canonical Chinese prompt.** Translation buys no measurable quality, costs 9-16% more tokens, and doubles the text that must stay in sync. The repository should not ship two translations of the same methodology.
- **Do not claim that an English prompt improves English writing.** On the English rewrite task the arms were equivalent (objective 0.89 vs 1.00 on one check, judge 4.08 vs 4.00), and the Chinese prompt answered English tasks in English 14/15 times.
- **Treat prompt language as a style/cost lever, not a quality lever.** If an English-facing preset is ever a product goal, build it as a separate preset and evaluate it against this baseline, rather than swapping the language of the existing one.
- **Keep facts out of the prompt.** Both arms got the package name wrong in one run in three, and one arm invented a journal error. Domain facts belong in tool checks (`kpsewhich`, `dpkg -S`, Crossref, the LaTeX log), not in prompt text.

## Threats to validity

- One model, three replicates, one domain. The confidence intervals around a 1-in-3 difference are wide.
- The judge is the same model as the generator. Self-preference is symmetric between arms, but a general preference for English prose is not, and the rubric's instruction to ignore language cannot be verified.
- The English arm is a translation, not natively authored English, which biases slightly against it.
- No tools were available in this harness, so the reference-verification task measured knowledge and epistemic honesty rather than tool use. A real DSH session can call `web_fetch` and would behave differently.
- Objective checks saturate, so the objective gap rests on four single-run differences.

## Re-running it

The harness is committed at [`tools/prompt-language-study/`](../tools/prompt-language-study/README.md): the 10 tasks, both prompt arms, the objective checks, and the judge rubric. Point `STUDY_API` at any OpenAI-compatible endpoint and run `generate`, `score`, `judge`, `analyze`. It is research tooling, not part of the bundle.

For a stronger design, use 8-12 tasks, at least 5 replicates per cell, a non-zero temperature, opaque ids, and a judge from a different model family if one is available. Report per-task results: an aggregate score hides exactly the differences that matter. Check the truncation warnings, and hand-verify at least a few automatic checks against the raw answers: two of the three bugs above were in the scoring code, not the model.

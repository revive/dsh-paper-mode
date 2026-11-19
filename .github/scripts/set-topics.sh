#!/usr/bin/env bash
# Set this repository's GitHub topics to the list in .github/topics.txt.
#
# This is a one-off helper, not part of CI: GITHUB_TOKEN cannot change
# repository topics, and storing a repository-administration token in the
# repository's secrets to sync a short list is not worth it. Run it by hand
# when the list changes, or edit About -> Topics on the repository page.
#
# Usage:
#   GH_TOKEN=<token with repository administration write> \
#     bash .github/scripts/set-topics.sh [topics-file]
#
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"

for command in gh jq; do
  command -v "$command" >/dev/null 2>&1 || { echo "error: $command is required" >&2; exit 1; }
done

repo="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
topics_file="${1:-.github/topics.txt}"

if [ ! -f "${topics_file}" ]; then
  echo "error: ${topics_file} not found" >&2
  exit 1
fi

topics=()
while IFS= read -r topic; do
  case "${topic}" in
    ''|'#'*) continue ;;
  esac
  topics+=("${topic}")
done < "${topics_file}"

if [ "${#topics[@]}" -eq 0 ]; then
  echo "error: no topics found in ${topics_file}" >&2
  exit 1
fi

payload="$(printf '%s\n' "${topics[@]}" | jq -R . | jq -s '{names: .}')"

echo "applying ${#topics[@]} topic(s) to ${repo}"
printf '%s' "${payload}" | gh api --method PUT "repos/${repo}/topics" --input - --jq '.names[]'
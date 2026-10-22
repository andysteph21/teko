#!/usr/bin/env bash
# Reprise non destructive du seul banc alpha ; aucun reset, aucune donnée terrain.
set -euo pipefail
audit_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd -- "$audit_root"
audit_evidence="$audit_root/.local/alpha-evidence"
mkdir -p -- "$audit_evidence"
audit_runtime="$(docker ps --filter 'name=^/supabase_edge_runtime_teko-alpha-audit$' --format '{{.Names}}')"
if [[ -n "$audit_runtime" ]]; then
  echo 'Un runtime alpha est déjà actif ; ne pas le remplacer automatiquement.' >&2
  exit 1
fi
node --input-type=module - <<'JS'
import { readFileSync, readdirSync } from 'node:fs';
for (const pid of readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
  let args;
  try { args = readFileSync(`/proc/${pid}/cmdline`).toString().split('\0'); }
  catch { continue; }
  if (args.slice(1,5).join(' ') === 'functions serve --workdir /tmp/teko-alpha-bench') {
    throw new Error('Un runtime alpha est actif : arrêter son processus avant la validation simulée.');
  }
}
JS
node tools/audit/prepare-bench.mjs
node --input-type=module - <<'JS'
import { readFileSync } from 'node:fs';
const settings = Object.fromEntries(readFileSync('/tmp/teko-alpha-functions.env','utf8')
  .trim().split('\n').map(line => line.split(/=(.*)/s).slice(0,2)));
if (settings.PUSH_PROVIDER !== 'mock' || settings.PAYMENT_PROVIDER !== 'mock' ||
    settings.TEKO_PUSH_SANDBOX !== 'true' || settings.TEKO_PAYMENT_SANDBOX !== 'true') {
  throw new Error('Validation automatique réservée aux fournisseurs simulés du banc.');
}
JS
supabase functions serve --workdir /tmp/teko-alpha-bench \
  --env-file /tmp/teko-alpha-functions.env > "$audit_evidence/functions-validation.log" 2>&1 &
audit_functions_pid=$!
cleanup() {
  kill -TERM "$audit_functions_pid" 2>/dev/null || true
  wait "$audit_functions_pid" 2>/dev/null || true
}
trap cleanup EXIT
node tools/audit/run-bench.mjs node "$audit_root/tools/audit/wait-functions.mjs"
node tools/audit/generate-types.mjs
supabase test db --workdir /tmp/teko-alpha-bench > "$audit_evidence/database-validation.log" 2>&1
echo 'Tests SQL terminés.'
node tools/audit/run-bench.mjs > "$audit_evidence/backend-validation.log" 2>&1
echo 'Tests JWT/HTTP terminés.'
node tools/audit/check-mutations.mjs > "$audit_evidence/mutations-validation.log" 2>&1
echo 'Mutations terminées ; gardes restaurées par le harnais.'

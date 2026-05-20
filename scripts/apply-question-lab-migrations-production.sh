#!/usr/bin/env bash
# Apply Question Lab SQL migrations to production (qhhmcsdteqcuhvdqhkfo).
# The app uses VITE_SUPABASE_URL for that project. CLI link may point elsewhere.
#
# Usage (requires Supabase DB password for production):
#   export SUPABASE_DB_PASSWORD='your-db-password'
#   ./scripts/apply-question-lab-migrations-production.sh
#
# Or apply via Supabase Dashboard SQL editor, running each file in order:
#   supabase/migrations/20260520100000_question_lab_tables.sql
#   ... through 20260520210000_allow_active_teaching_edits.sql
# Then run: NOTIFY pgrst, 'reload schema';

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="qhhmcsdteqcuhvdqhkfo"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD for project ${PROJECT_REF}, or apply migrations in Dashboard SQL."
  exit 1
fi

DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

for f in \
  "$ROOT/supabase/migrations/20260520100000_question_lab_tables.sql" \
  "$ROOT/supabase/migrations/20260520110000_dm_rpc_question_lab.sql" \
  "$ROOT/supabase/migrations/20260520120000_question_lab_admin_policies.sql" \
  "$ROOT/supabase/migrations/20260520130000_sjt_rpc_question_lab.sql" \
  "$ROOT/supabase/migrations/20260520140000_admin_reports_rpc.sql" \
  "$ROOT/supabase/migrations/20260520153221_repair_question_lab_admin_rpcs.sql" \
  "$ROOT/supabase/migrations/20260520160000_admin_import_trainer_drafts.sql" \
  "$ROOT/supabase/migrations/20260520170000_trainer_rpc_full_content.sql" \
  "$ROOT/supabase/migrations/20260520180000_admin_send_to_review_queue.sql" \
  "$ROOT/supabase/migrations/20260520190000_admin_update_trainer_question.sql" \
  "$ROOT/supabase/migrations/20260520200000_question_lab_legacy_and_full_edit.sql" \
  "$ROOT/supabase/migrations/20260520210000_allow_active_teaching_edits.sql"
do
  echo "Applying $(basename "$f")..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

psql "$DB_URL" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';"
echo "Done. API schema reload signalled."

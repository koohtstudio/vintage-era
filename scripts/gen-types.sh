#!/usr/bin/env bash
# Regenerates lib/supabase/types.ts from the LOCAL database.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm exec supabase gen types typescript --local > lib/supabase/types.ts
echo "wrote lib/supabase/types.ts"

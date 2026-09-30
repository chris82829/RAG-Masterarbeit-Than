#!/usr/bin/env bash
# Optional manual restore into the local development database.
set -euo pipefail
DUMP_FILE="${1:?Usage: bash containers/db/restore_dump.sh /path/to/backup.dump}"
test -f "$DUMP_FILE"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
docker compose --project-directory "$PROJECT_DIR" exec -T db sh -c   'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' < "$DUMP_FILE"

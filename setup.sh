#!/bin/bash
# PK1 Setup Script
# Run this once after you have your Supabase project credentials.
# Usage: ./setup.sh

set -e

echo "=== PK1 Setup ==="
echo ""

# ── Prompt for credentials ────────────────────────────────────────────────────
read -p "Supabase Project URL (https://xxxx.supabase.co): " SUPABASE_URL
read -p "Supabase anon/public key: " SUPABASE_ANON_KEY
read -p "Supabase service_role key: " SUPABASE_SERVICE_ROLE_KEY
read -p "Claude API key (from console.anthropic.com): " CLAUDE_API_KEY

echo ""
echo "Writing environment files..."

# ── Backend .env ──────────────────────────────────────────────────────────────
cat > packages/backend/.env <<EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
PORT=3001
EOF

# ── Agent .env ────────────────────────────────────────────────────────────────
cat > packages/agent/.env <<EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
CLAUDE_API_KEY=${CLAUDE_API_KEY}
BACKEND_URL=http://localhost:3001
EOF

# ── Frontend .env ─────────────────────────────────────────────────────────────
cat > packages/frontend/.env <<EOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_API_URL=http://localhost:3001
EOF

echo "Environment files written."
echo ""

# ── Run migrations ────────────────────────────────────────────────────────────
echo "Running Supabase migrations..."
echo ""
echo "  Go to: ${SUPABASE_URL/https:\/\//https://supabase.com/dashboard/project/}/sql/new"
echo ""
echo "  Copy and paste each migration file from supabase/migrations/ in order:"
ls supabase/migrations/*.sql | sort
echo ""
echo "  Or use the Supabase CLI (if you have it linked):"
echo "    npx supabase db push"
echo ""

# ── Create first user ─────────────────────────────────────────────────────────
echo "After running migrations, create your first user:"
echo "  Go to: Authentication → Users → Add user"
echo "  Email: your email | Password: your choice"
echo ""
echo "Then copy your user ID from the Users list and update supabase/seed.sql:"
echo "  Replace '00000000-0000-0000-0000-000000000000' with your actual user ID"
echo "  Run seed.sql in the SQL editor"
echo ""
echo "=== Setup complete! Start the app with: npm run dev ==="

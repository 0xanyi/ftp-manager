#!/bin/bash
# Script to fix the production database migration state
# Run this with your production DATABASE_URL

echo "This script will fix the failed migration state in your production database."
echo "Make sure you have your production DATABASE_URL set as an environment variable."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    echo "Please set it to your production database URL:"
    echo "export DATABASE_URL='your-production-database-url'"
    exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL}"
echo ""

# Show current migration state
echo "Current migration state:"
npx prisma migrate status

echo ""
echo "Resolving failed migration 20251009172043_..."

# Mark the failed migration as resolved (rolled back)
npx prisma migrate resolve --rolled-back 20251009172043_

echo ""
echo "Checking migration state after fix:"
npx prisma migrate status

echo ""
echo "Migration state resolved! Your next Coolify deployment should work correctly."
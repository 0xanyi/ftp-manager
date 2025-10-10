#!/bin/bash
# Script to resolve the failed migration state using Prisma's built-in tools

echo "Resolving failed migration 20251009172043_..."

# Mark the failed migration as resolved (rolled back)
npx prisma migrate resolve --rolled-back 20251009172043_

echo "Migration state resolved. Next deployment should work correctly."
echo "You can now deploy again on Coolify."
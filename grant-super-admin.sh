#!/bin/bash
# Script to grant super admin access to a user

if [ -z "$1" ]; then
  echo "Usage: ./grant-super-admin.sh <user-email>"
  echo "Example: ./grant-super-admin.sh admin@example.com"
  exit 1
fi

EMAIL=$1

echo "Granting SUPER_ADMIN role to user: $EMAIL"
echo ""
echo "Run this SQL command in your database:"
echo ""
echo "UPDATE user_tenants"
echo "SET role = 'SUPER_ADMIN'"
echo "WHERE \"userId\" = ("
echo "  SELECT id FROM users WHERE email = '$EMAIL'"
echo ");"
echo ""
echo "After running this, the user will need to log out and log back in to see the super admin options."

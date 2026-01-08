#!/bin/bash

# Script to create super admin account
# Usage: ./create-super-admin.sh [email] [password] [firstName] [lastName] [tenantName]

EMAIL="${1:-admin@nurtureengine.net}"
PASSWORD="${2:-Admin123!@#}"
FIRST_NAME="${3:-App}"
LAST_NAME="${4:-Owner}"
TENANT_NAME="${5:-NurtureEngine}"

echo "Creating super admin account..."
echo "Email: $EMAIL"
echo "Tenant: $TENANT_NAME"
echo ""

# Check if API is running
API_URL="${API_URL:-http://localhost:3000}"
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  echo "⚠ Warning: API doesn't seem to be running at $API_URL"
  echo "Make sure the backend is running before proceeding."
  echo ""
fi

# Create super admin via API
RESPONSE=$(curl -s -X POST "$API_URL/api/setup/create-super-admin" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\",
    \"tenantName\": \"$TENANT_NAME\"
  }")

if echo "$RESPONSE" | grep -q "success"; then
  echo "✓ Super admin account created successfully!"
  echo ""
  echo "Login credentials:"
  echo "  Email: $EMAIL"
  echo "  Password: $PASSWORD"
  echo ""
  echo "Next steps:"
  echo "1. Log in at http://localhost:5001/login"
  echo "2. Navigate to /super-admin for the dashboard"
  echo "3. Navigate to /super-admin/limits for limits & pricing"
else
  echo "✗ Failed to create super admin account"
  echo "Response: $RESPONSE"
  echo ""
  echo "Possible reasons:"
  echo "- Super admin already exists"
  echo "- API is not running"
  echo "- Database connection issue"
  echo ""
  echo "To check if super admin exists, run:"
  echo "  psql -U postgres -d sms_platform -c \"SELECT u.email, ut.role FROM users u JOIN user_tenants ut ON u.id = ut.\\\"userId\\\" WHERE ut.role = 'SUPER_ADMIN';\""
fi


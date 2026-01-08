#!/bin/bash
# Database Setup Script - Creates a new database for SMS Platform

echo "Setting up database for SMS Platform..."
echo ""

# Get database name from environment or use default
DB_NAME="${DB_NAME:-sms_platform}"
DB_USER="${DB_USER:-sms_user}"
DB_PASSWORD="${DB_PASSWORD:-sms_password}"

echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo ""

# Try different connection methods
echo "Attempting to connect to PostgreSQL..."

# Method 1: Try as postgres user via sudo
if sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
    echo "✅ Connected via sudo -u postgres"
    sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Grant privileges
ALTER USER $DB_USER CREATEDB;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    echo "✅ Database setup complete!"
    
# Method 2: Try direct connection
elif psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
    echo "✅ Connected directly"
    psql -h localhost -U postgres -d postgres << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    echo "✅ Database setup complete!"
    
# Method 3: Try with password
elif PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
    echo "✅ Connected with password"
    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    echo "✅ Database setup complete!"
else
    echo "⚠️  Cannot connect to PostgreSQL automatically."
    echo ""
    echo "Please provide your PostgreSQL connection details:"
    echo "1. Is PostgreSQL running? Check with: sudo systemctl status postgresql"
    echo "2. What's the PostgreSQL host/port?"
    echo "3. What's the admin username/password?"
    echo ""
    echo "Or manually run:"
    echo "  psql -h <host> -U <admin_user> -d postgres"
    echo "  CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    echo "  CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo ""
    echo "Then update /root/SMS/backend/.env with:"
    echo "  DB_HOST=<your-postgres-host>"
    echo "  DB_PORT=<your-postgres-port>"
    echo "  DB_USERNAME=$DB_USER"
    echo "  DB_PASSWORD=$DB_PASSWORD"
    echo "  DB_DATABASE=$DB_NAME"
fi

# Test connection
echo ""
echo "Testing connection..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT current_database();" &> /dev/null; then
    echo "✅ Connection test successful!"
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT current_database(), current_user;"
else
    echo "⚠️  Connection test failed. Please verify credentials."
fi


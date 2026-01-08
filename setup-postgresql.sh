#!/bin/bash
# PostgreSQL Setup Script for SMS SaaS Platform

echo "Setting up PostgreSQL for SMS SaaS Platform..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL client not found. Please install PostgreSQL first."
    echo "Run: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Try to start PostgreSQL service
echo "Attempting to start PostgreSQL..."
sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || echo "Could not start PostgreSQL service"

sleep 3

# Try to connect as postgres user
if sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
    echo "✅ PostgreSQL is running"
    
    # Create user if it doesn't exist
    echo "Creating database user..."
    sudo -u postgres psql -c "CREATE USER sms_user WITH PASSWORD 'sms_password';" 2>/dev/null || echo "User may already exist"
    sudo -u postgres psql -c "ALTER USER sms_user WITH PASSWORD 'sms_password';" 2>/dev/null
    
    # Grant privileges
    sudo -u postgres psql -c "ALTER USER sms_user CREATEDB;" 2>/dev/null
    
    # Create database
    echo "Creating database..."
    sudo -u postgres psql -c "CREATE DATABASE sms_saas OWNER sms_user;" 2>/dev/null || echo "Database may already exist"
    
    # Test connection
    echo "Testing connection..."
    PGPASSWORD=sms_password psql -h localhost -U sms_user -d sms_saas -c "SELECT current_database();" &> /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL setup complete!"
        echo "Database: sms_saas"
        echo "User: sms_user"
        echo "Password: sms_password"
    else
        echo "⚠️  Connection test failed. Please check PostgreSQL configuration."
    fi
else
    echo "⚠️  Cannot connect to PostgreSQL."
    echo "You may need to:"
    echo "1. Install PostgreSQL: sudo apt-get install postgresql postgresql-contrib"
    echo "2. Initialize PostgreSQL data directory"
    echo "3. Start PostgreSQL service"
    echo ""
    echo "Or use GCP Cloud SQL and update .env file with Cloud SQL connection details."
fi


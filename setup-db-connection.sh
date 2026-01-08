#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up database connection...${NC}"
echo ""

# Check if PostgreSQL container exists
if docker ps --format "{{.Names}}" | grep -q "dialer-postgres-master"; then
    echo -e "${GREEN}✓ Found existing PostgreSQL container: dialer-postgres-master${NC}"
    echo -e "${YELLOW}Port mapping: 5433 -> 5432${NC}"
    
    # Get PostgreSQL credentials from container
    POSTGRES_USER=$(docker exec dialer-postgres-master printenv POSTGRES_USER 2>/dev/null || echo "postgres")
    POSTGRES_PASSWORD=$(docker exec dialer-postgres-master printenv POSTGRES_PASSWORD 2>/dev/null || echo "")
    
    echo ""
    echo -e "${YELLOW}Current PostgreSQL container settings:${NC}"
    echo "  User: $POSTGRES_USER"
    echo "  Port: 5433 (host) -> 5432 (container)"
    echo ""
    
    # Try to create user and database
    echo -e "${YELLOW}Creating database user and database...${NC}"
    
    # Create user
    docker exec dialer-postgres-master psql -U $POSTGRES_USER -c "CREATE USER sms_user WITH PASSWORD 'sms_password';" 2>/dev/null && \
        echo -e "${GREEN}✓ Created user sms_user${NC}" || \
        echo -e "${YELLOW}User sms_user may already exist${NC}"
    
    # Grant privileges
    docker exec dialer-postgres-master psql -U $POSTGRES_USER -c "ALTER USER sms_user CREATEDB;" 2>/dev/null && \
        echo -e "${GREEN}✓ Granted CREATEDB to sms_user${NC}"
    
    # Create database
    docker exec dialer-postgres-master psql -U $POSTGRES_USER -c "CREATE DATABASE sms_platform OWNER sms_user;" 2>/dev/null && \
        echo -e "${GREEN}✓ Created database sms_platform${NC}" || \
        echo -e "${YELLOW}Database sms_platform may already exist${NC}"
    
    echo ""
    echo -e "${GREEN}✅ Database setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}Update your backend/.env file with:${NC}"
    echo "DB_HOST=localhost"
    echo "DB_PORT=5433"
    echo "DB_USERNAME=sms_user"
    echo "DB_PASSWORD=sms_password"
    echo "DB_DATABASE=sms_platform"
    echo ""
    
else
    echo -e "${RED}✗ PostgreSQL container not found${NC}"
    echo ""
    echo "Starting PostgreSQL with docker-compose..."
    cd /root/SMS && docker-compose up -d postgres
fi


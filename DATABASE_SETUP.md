# Database Setup Guide

## Database Name Changed

The application now uses database name: **`sms_platform`** (instead of `sms_saas`)

This avoids conflicts with any existing databases on your server.

## Current Configuration

File: `/root/SMS/backend/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=sms_user
DB_PASSWORD=sms_password
DB_DATABASE=sms_platform
```

## Setup Options

### Option 1: Use Existing PostgreSQL (Recommended)

If you have PostgreSQL running on this server:

1. **Find your PostgreSQL connection details:**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Or check for PostgreSQL processes
   ps aux | grep postgres
   
   # Check what port it's on
   sudo netstat -tlnp | grep postgres
   ```

2. **Connect to your PostgreSQL:**
   ```bash
   # Try different methods:
   psql -h localhost -U postgres -d postgres
   # OR
   sudo -u postgres psql
   # OR if you know the admin password:
   PGPASSWORD=<your-password> psql -h localhost -U postgres -d postgres
   ```

3. **Create the database and user:**
   ```sql
   -- Create user
   CREATE USER sms_user WITH PASSWORD 'sms_password';
   ALTER USER sms_user CREATEDB;
   
   -- Create database
   CREATE DATABASE sms_platform OWNER sms_user;
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE sms_platform TO sms_user;
   ```

4. **Update .env if needed:**
   - If PostgreSQL is on a different host: Update `DB_HOST`
   - If PostgreSQL is on a different port: Update `DB_PORT`
   - If using different credentials: Update `DB_USERNAME` and `DB_PASSWORD`

### Option 2: Use GCP Cloud SQL

If you're using GCP Cloud SQL:

1. **Get your Cloud SQL connection details** from GCP Console
2. **Update `/root/SMS/backend/.env`:**
   ```env
   DB_HOST=<cloud-sql-ip-or-hostname>
   DB_PORT=5432
   DB_USERNAME=<your-cloud-sql-user>
   DB_PASSWORD=<your-cloud-sql-password>
   DB_DATABASE=sms_platform
   DB_SSL=true
   ```

3. **Create the database in Cloud SQL:**
   ```sql
   CREATE DATABASE sms_platform;
   CREATE USER sms_user WITH PASSWORD 'sms_password';
   GRANT ALL PRIVILEGES ON DATABASE sms_platform TO sms_user;
   ```

### Option 3: Automated Setup Script

Run the setup script (it will try to auto-detect and configure):

```bash
/root/SMS/setup-database.sh
```

Or with custom values:
```bash
DB_NAME=sms_platform DB_USER=sms_user DB_PASSWORD=sms_password /root/SMS/setup-database.sh
```

## Verify Connection

After setup, test the connection:

```bash
PGPASSWORD=sms_password psql -h localhost -U sms_user -d sms_platform -c "SELECT version();"
```

## Restart Backend

Once PostgreSQL is configured and accessible:

```bash
cd /root/SMS/backend
pkill -f "nest start"
npm run start:dev
```

The backend will automatically:
- Connect to PostgreSQL
- Create all tables (in development mode)
- Start serving API requests

## Troubleshooting

**If connection fails:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Check firewall/network: `telnet localhost 5432`
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
4. Verify credentials in `.env` file

**If you need to use a different database name:**
- Update `DB_DATABASE` in `/root/SMS/backend/.env`
- The backend will use whatever database name you specify


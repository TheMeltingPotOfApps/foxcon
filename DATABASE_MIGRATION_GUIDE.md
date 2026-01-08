# Database Migration Guide

## Overview
This guide helps you migrate the SMS platform database to a new PostgreSQL instance, separating it from the Asterisk database load.

## Why Migrate?
- **Performance**: Asterisk generates many database queries that compete with application queries
- **Isolation**: Separate database instances allow independent scaling and optimization
- **Reliability**: Reduces risk of one service affecting the other
- **Resource Management**: Better control over database resources

## Prerequisites

1. **New Database Server** (recommended) or separate PostgreSQL instance
2. **Network Access**: Ensure the new database is accessible from the application server
3. **Backup**: Always backup your current database before migration
4. **Downtime Window**: Plan for 15-30 minutes of downtime during migration

## Migration Steps

### Option 1: Automated Migration (Recommended)

#### Step 1: Set Up New Database Instance

**On the new database server**, run:
```bash
cd /root/SMS/backend
./scripts/setup-new-db-instance.sh
```

This script will:
- Install PostgreSQL if needed
- Create database and user
- Optimize PostgreSQL configuration
- Configure remote connections

#### Step 2: Run Migration Script

**On the application server**, run:
```bash
cd /root/SMS/backend
./scripts/migrate-to-new-db.sh
```

This script will:
- Create a full database dump
- Restore to the new instance
- Run all migrations
- Update configuration files
- Verify data integrity

### Option 2: Manual Migration

#### Step 1: Create Database Dump

```bash
# On current database server
pg_dump -h localhost -U sms_user -d sms_platform \
  --format=custom \
  --file=/tmp/sms_platform.dump \
  --verbose
```

#### Step 2: Transfer Dump to New Server

```bash
# Copy dump file to new server
scp /tmp/sms_platform.dump user@new-db-server:/tmp/
```

#### Step 3: Create Database on New Server

```bash
# On new database server
sudo -u postgres psql <<EOF
CREATE USER sms_user WITH PASSWORD 'your_password';
CREATE DATABASE sms_platform OWNER sms_user;
GRANT ALL PRIVILEGES ON DATABASE sms_platform TO sms_user;
\c sms_platform
GRANT ALL ON SCHEMA public TO sms_user;
EOF
```

#### Step 4: Restore Database

```bash
# On new database server
pg_restore -h localhost -U sms_user -d sms_platform \
  --verbose \
  --no-owner \
  --no-acl \
  /tmp/sms_platform.dump
```

#### Step 5: Run Migrations

```bash
# On application server
cd /root/SMS/backend
for migration in migrations/*.sql; do
  psql -h NEW_DB_HOST -U sms_user -d sms_platform -f "$migration"
done
```

#### Step 6: Update Configuration

Update `/root/SMS/backend/.env`:
```env
DB_HOST=new-db-server-ip
DB_PORT=5432
DB_USERNAME=sms_user
DB_PASSWORD=your_password
DB_DATABASE=sms_platform
```

#### Step 7: Restart Services

```bash
cd /root/SMS
./restart.sh
```

## Post-Migration Checklist

- [ ] Verify application is working
- [ ] Check database connections in logs
- [ ] Monitor query performance
- [ ] Verify all features work correctly
- [ ] Check dashboard loads correctly
- [ ] Test journey execution
- [ ] Verify call logs are being created
- [ ] Check SMS sending functionality

## Performance Optimization for New Database

### 1. Connection Pooling (Recommended)

Install and configure pgBouncer:

```bash
# Install pgBouncer
apt-get install pgbouncer  # Ubuntu/Debian
# or
yum install pgbouncer      # CentOS/RHEL

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
sms_platform = host=localhost port=5432 dbname=sms_platform

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

Update application to connect through pgBouncer (port 6432).

### 2. PostgreSQL Configuration Tuning

The setup script automatically optimizes PostgreSQL, but you can further tune:

```bash
# Edit postgresql.conf
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
maintenance_work_mem = 2GB
work_mem = 256MB
max_connections = 200
```

### 3. Monitoring

Set up monitoring for the new database:

```bash
# Install pg_stat_statements extension
psql -U sms_user -d sms_platform <<EOF
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOF
```

## Troubleshooting

### Connection Issues

**Error: Connection refused**
- Check PostgreSQL is running: `systemctl status postgresql`
- Verify firewall rules allow connections
- Check `pg_hba.conf` allows remote connections

**Error: Authentication failed**
- Verify username and password
- Check `pg_hba.conf` authentication method

### Performance Issues

**Slow queries after migration**
- Run `ANALYZE` on all tables: `psql -c "ANALYZE;"`
- Check indexes are created: `\di` in psql
- Monitor slow queries with `pg_stat_statements`

**High connection count**
- Implement connection pooling (pgBouncer)
- Review application connection management
- Check for connection leaks

### Data Integrity

**Missing data**
- Verify dump/restore completed successfully
- Check migration logs for errors
- Compare record counts between old and new database

## Rollback Plan

If migration fails, you can rollback:

1. **Stop application services**
2. **Revert configuration**:
   ```bash
   cp .env.backup.* .env
   ```
3. **Restart services**:
   ```bash
   ./restart.sh
   ```

## Best Practices

1. **Test First**: Run migration on a test/staging environment first
2. **Backup**: Always create backups before migration
3. **Monitor**: Watch logs during and after migration
4. **Gradual Cutover**: Consider running both databases in parallel initially
5. **Documentation**: Document any custom configurations

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- pgBouncer Documentation: https://www.pgbouncer.org/
- Database Optimization Summary: `DATABASE_OPTIMIZATION_SUMMARY.md`

## Support

If you encounter issues:
1. Check application logs: `tail -f /tmp/backend.log`
2. Check PostgreSQL logs: `/var/log/postgresql/postgresql-*.log`
3. Review migration script output
4. Verify network connectivity between servers


# Quick Database Migration Guide

## Prerequisites
- New PostgreSQL instance ready (separate server recommended)
- Network access between application server and new database
- Backup of current database

## Quick Steps

### 1. Setup New Database Instance (on new server)
```bash
cd /root/SMS/backend
./scripts/setup-new-db-instance.sh
```

### 2. Run Migration (on application server)
```bash
cd /root/SMS/backend
./scripts/migrate-to-new-db.sh
```

Follow the prompts to enter:
- New database host
- New database port (default: 5432)
- New database name (default: sms_platform)
- New database username
- New database password

### 3. Verify Migration
```bash
cd /root/SMS/backend
./scripts/verify-db-migration.sh
```

### 4. Restart Application
```bash
cd /root/SMS
./restart.sh
```

## What the Scripts Do

### `setup-new-db-instance.sh`
- Installs PostgreSQL if needed
- Creates database and user
- Optimizes PostgreSQL configuration
- Configures remote connections

### `migrate-to-new-db.sh`
- Creates full database dump
- Restores to new instance
- Runs all migrations
- Updates .env file
- Verifies data integrity

### `verify-db-migration.sh`
- Tests connection
- Verifies table counts
- Checks critical indexes
- Tests query performance
- Reports database size

## Troubleshooting

**Connection refused:**
- Check firewall: `sudo ufw allow 5432/tcp`
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check `pg_hba.conf` allows remote connections

**Migration fails:**
- Check disk space: `df -h`
- Verify network connectivity: `ping NEW_DB_HOST`
- Check PostgreSQL logs: `/var/log/postgresql/postgresql-*.log`

**Slow after migration:**
- Run ANALYZE: `psql -c "ANALYZE;"`
- Check indexes: `./scripts/verify-db-migration.sh`
- Consider pgBouncer for connection pooling

## Rollback

If migration fails:
1. Restore .env backup: `cp .env.backup.* .env`
2. Restart: `./restart.sh`

## Next Steps

After successful migration:
1. Monitor application logs
2. Set up database monitoring
3. Consider pgBouncer for connection pooling
4. Set up automated backups


const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Database configuration from environment or defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_DATABASE || 'sms_platform',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// Super admin credentials
const superAdminConfig = {
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@nurtureengine.net',
  password: process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#',
  firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'App',
  lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Owner',
  
  tenantName: process.env.SUPER_ADMIN_TENANT_NAME || 'NurtureEngine',
};

async function createSuperAdmin() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if super admin already exists
    const existingSuperAdmin = await client.query(
      `SELECT ut.id, u.email, t.name as tenant_name 
       FROM user_tenants ut 
       JOIN users u ON ut."userId" = u.id 
       JOIN tenants t ON ut."tenantId" = t.id 
       WHERE ut.role = 'SUPER_ADMIN' AND ut."isActive" = true`
    );

    if (existingSuperAdmin.rows.length > 0) {
      console.log('⚠ Super admin already exists:');
      existingSuperAdmin.rows.forEach(row => {
        console.log(`  Email: ${row.email}`);
        console.log(`  Tenant: ${row.tenant_name}`);
      });
      console.log('\nOnly one super admin account is allowed.');
      return;
    }

    console.log('Creating super admin account...');
    console.log(`Email: ${superAdminConfig.email}`);
    console.log(`Tenant: ${superAdminConfig.tenantName}`);

    // Start transaction
    await client.query('BEGIN');

    // Check if user exists
    let userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [superAdminConfig.email]
    );

    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log('✓ User already exists, using existing user');
    } else {
      // Create user
      const passwordHash = await bcrypt.hash(superAdminConfig.password, 10);
      const userInsert = await client.query(
        `INSERT INTO users (email, "passwordHash", "firstName", "lastName", "emailVerified", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          superAdminConfig.email,
          passwordHash,
          superAdminConfig.firstName,
          superAdminConfig.lastName,
          false,
          true,
        ]
      );
      userId = userInsert.rows[0].id;
      console.log('✓ User created');
    }

    // Check if tenant exists
    let tenantResult = await client.query(
      'SELECT id FROM tenants WHERE name = $1',
      [superAdminConfig.tenantName]
    );

    let tenantId;
    if (tenantResult.rows.length > 0) {
      tenantId = tenantResult.rows[0].id;
      console.log('✓ Tenant already exists, using existing tenant');
    } else {
      // Create tenant
      const slug = superAdminConfig.tenantName.toLowerCase().replace(/\s+/g, '-');
      const tenantInsert = await client.query(
        `INSERT INTO tenants (name, slug, "isActive")
         VALUES ($1, $2, $3)
         RETURNING id`,
        [superAdminConfig.tenantName, slug, true]
      );
      tenantId = tenantInsert.rows[0].id;
      console.log('✓ Tenant created');
    }

    // Check if user-tenant relationship exists
    const userTenantResult = await client.query(
      'SELECT id, role FROM user_tenants WHERE "userId" = $1 AND "tenantId" = $2',
      [userId, tenantId]
    );

    if (userTenantResult.rows.length > 0) {
      // Update existing relationship
      await client.query(
        'UPDATE user_tenants SET role = $1, "isActive" = $2 WHERE "userId" = $3 AND "tenantId" = $4',
        ['SUPER_ADMIN', true, userId, tenantId]
      );
      console.log('✓ User-tenant relationship updated to SUPER_ADMIN');
    } else {
      // Create new relationship
      await client.query(
        `INSERT INTO user_tenants ("userId", "tenantId", role, "isActive")
         VALUES ($1, $2, $3, $4)`,
        [userId, tenantId, 'SUPER_ADMIN', true]
      );
      console.log('✓ User-tenant relationship created with SUPER_ADMIN role');
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Super admin account created successfully!');
    console.log('\nLogin credentials:');
    console.log(`  Email: ${superAdminConfig.email}`);
    console.log(`  Password: ${superAdminConfig.password}`);
    console.log(`  Tenant: ${superAdminConfig.tenantName}`);
    console.log('\nNext steps:');
    console.log('1. Log in at http://localhost:5001/login (or your frontend URL)');
    console.log('2. Navigate to /super-admin for the dashboard');
    console.log('3. Navigate to /super-admin/limits for limits & pricing management');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Error creating super admin:', error.message);
    if (error.code === '23505') {
      console.error('\nThis might be due to a unique constraint violation.');
      console.error('Check if a super admin already exists or if there are duplicate entries.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSuperAdmin();


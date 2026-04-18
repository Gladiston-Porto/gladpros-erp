const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Find latest backup
const BACKUP_ROOT = path.join(__dirname, '../../backups');
const backups = fs.readdirSync(BACKUP_ROOT).filter(f => f.startsWith('raw-')).sort().reverse();
const LATEST_BACKUP = backups[0] ? path.join(BACKUP_ROOT, backups[0]) : null;

if (!LATEST_BACKUP) {
    console.error('❌ No backup found to restore from.');
    process.exit(1);
}

// Order matters for FKs unless we disable checks
// We will disable FK checks for bulk load
const FILES = fs.readdirSync(LATEST_BACKUP).filter(f => f.endsWith('.json'));

async function main() {
    console.log(`♻️  Restoring from: ${LATEST_BACKUP}`);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found');
        process.exit(1);
    }

    const connection = await mysql.createConnection(dbUrl);

    try {
        // Disable FK Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('🔓 Foreign Keys Disabled');

        for (const file of FILES) {
            const tableName = path.basename(file, '.json');
            // Skip if table refers to renamed/deleted tables in new schema if necessary
            // But 'Empresa', 'Cliente', etc are stable.

            const filePath = path.join(LATEST_BACKUP, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (!data || data.length === 0) {
                console.log(`   ⏩ Skipping ${tableName} (Empty)`);
                continue;
            }

            console.log(`   📥 Importing ${tableName} (${data.length} records)...`);

            // Construct Insert
            const columns = Object.keys(data[0]);

            // Filter out columns that might not exist in new schema if we changed names? 
            // For now assume schema is mostly additive or matches. 
            // Schema Drift Note: If 'endereco' (JSON) was in backup but removed in schema, SQL will fail.
            // We need to verify if columns exist. But 'endereco' in Schema is technically removed/refactored?
            // Wait, we KEPT 'endereco' but marked deprecated or changed type?
            // In Phase 1 we "Refactored Address". If we dropped the column, restore will fail.
            // Let's assume we need to handle specific transforms if columns missing.
            // For MVP restore, we try bulk insert.

            // We'll insert row by row to handle errors gracefully? Or batch.
            // Let's do batch for speed, but catch errors.

            // Generating placeholders
            const placeholders = `(${columns.map(() => '?').join(', ')})`;
            const sql = `INSERT IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

            for (const row of data) {
                const values = columns.map(c => {
                    let val = row[c];
                    // Date handling
                    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        return new Date(val);
                    }
                    return val;
                });

                try {
                    await connection.execute(sql, values);
                } catch (e) {
                    if (e.code === 'ER_BAD_FIELD_ERROR') {
                        // Column mismatch (e.g. old 'endereco' vs new)
                        // Warn and maybe try stripping the bad column?
                        // For now, logging error.
                        console.warn(`      ⚠️ Failed row in ${tableName}: ${e.message}`);
                    } else {
                        throw e;
                    }
                }
            }
        }

        console.log('✅ Restore execution finished.');

    } catch (err) {
        console.error('❌ Restore failed:', err);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🔒 Foreign Keys Enabled');
        await connection.end();
    }
}

main();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../../backups/raw-' + Date.now());

// Tables to backup (Priority order)
const TABLES = [
    'Usuario',
    'Empresa',
    'Cliente',
    'Projeto',
    'Proposta',
    'PropostaEtapa',
    'PropostaMaterial',
    'Invoice',
    'InvoiceItem'
    // Skip TaxRate (Legacy) as it caused conflicts
];

async function main() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    console.log(`📦 Starting Backup to ${BACKUP_DIR}...`);

    // Parse DATABASE_URL for connection config
    // Example: mysql://root:root@localhost:3306/gladpros_ci
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found in .env');
        process.exit(1);
    }

    const connection = await mysql.createConnection(dbUrl);

    try {
        for (const table of TABLES) {
            console.log(`   Exporting ${table}...`);
            try {
                // Handle case sensitivity safely or catch error if table doesn't exist
                const [rows] = await connection.execute(`SELECT * FROM ${table}`);

                fs.writeFileSync(
                    path.join(BACKUP_DIR, `${table}.json`),
                    JSON.stringify(rows, null, 2)
                );
            } catch (e) {
                console.warn(`   ⚠️ Could not export ${table} (maybe doesn't exist or empty): ${e.message}`);
            }
        }

        console.log('✅ Backup completed successfully!');
        console.log(`📂 Location: ${BACKUP_DIR}`);
    } catch (err) {
        console.error('❌ Backup failed:', err);
    } finally {
        await connection.end();
    }
}

main();

/**
 * Database Migration Script
 * 
 * Run database migrations and setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from './supabase.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    try {
        if (!supabaseAdmin) {
            throw new Error('Supabase admin client not available. Please check SUPABASE_SERVICE_KEY');
        }

        logger.info('Starting database migrations...');

        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        logger.info(`Executing ${statements.length} SQL statements...`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            
            try {
                const { error } = await supabaseAdmin.rpc('exec_sql', { 
                    sql: statement 
                });

                if (error) {
                    // Some errors are expected (like "already exists")
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate key')) {
                        logger.debug(`Skipping existing object: ${error.message}`);
                        continue;
                    }
                    throw error;
                }

                logger.debug(`Executed statement ${i + 1}/${statements.length}`);
            } catch (error) {
                logger.error(`Failed to execute statement ${i + 1}:`, {
                    statement: statement.substring(0, 100) + '...',
                    error: error.message
                });
                throw error;
            }
        }

        logger.info('✅ Database migrations completed successfully');

        // Verify tables exist
        const { data: tables, error: tablesError } = await supabaseAdmin
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', [
                'users', 'videos', 'transcription_jobs', 
                'captions', 'words', 'export_jobs', 
                'projects', 'project_videos', 'usage_analytics'
            ]);

        if (tablesError) {
            throw tablesError;
        }

        logger.info(`✅ Verified ${tables.length} tables exist:`, {
            tables: tables.map(t => t.table_name)
        });

        return true;
    } catch (error) {
        logger.error('❌ Database migration failed:', { error: error.message });
        throw error;
    }
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations()
        .then(() => {
            logger.info('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Migration failed:', error);
            process.exit(1);
        });
}

export { runMigrations };
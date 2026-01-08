/**
 * Supabase Database Client
 * 
 * Production-ready database integration with:
 * - Connection pooling
 * - Error handling
 * - Type safety
 * - Row Level Security (RLS)
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Initialize variables
let supabase = null;
let supabaseAdmin = null;

// Check if we're in demo mode
if (process.env.DEMO_MODE === 'true') {
    logger.info('Demo mode: Skipping Supabase configuration');
} else {
    // Validate Supabase configuration
    if (!config.supabase.url || !config.supabase.anonKey) {
        logger.error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY');
        process.exit(1);
    }

    // Create Supabase client for public operations
    supabase = createClient(
        config.supabase.url,
        config.supabase.anonKey,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'X-Client-Info': 'kalakar-backend@1.0.0'
                }
            }
        }
    );

    // Create Supabase admin client for service operations
    supabaseAdmin = config.supabase.serviceKey 
        ? createClient(
            config.supabase.url,
            config.supabase.serviceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                db: {
                    schema: 'public'
                }
            }
        )
        : null;
}

/**
 * Test database connection
 */
export async function testConnection() {
    if (process.env.DEMO_MODE === 'true') {
        return true;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            logger.error('Database connection test failed', { error: error.message });
            return false;
        }

        logger.info('Database connection successful');
        return true;
    } catch (error) {
        logger.error('Database connection error', { error: error.message });
        return false;
    }
}

/**
 * Database health check
 */
export async function healthCheck() {
    if (process.env.DEMO_MODE === 'true') {
        return { status: 'demo', responseTime: '0ms' };
    }

    try {
        const start = Date.now();
        const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        const duration = Date.now() - start;

        return {
            status: error ? 'unhealthy' : 'healthy',
            responseTime: `${duration}ms`,
            error: error?.message
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Execute database migration
 */
export async function runMigration(sql) {
    if (process.env.DEMO_MODE === 'true') {
        throw new Error('Migrations not available in demo mode');
    }

    if (!supabaseAdmin) {
        throw new Error('Admin client not available for migrations');
    }

    try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
        
        if (error) {
            throw error;
        }

        logger.info('Migration executed successfully');
        return true;
    } catch (error) {
        logger.error('Migration failed', { error: error.message });
        throw error;
    }
}

// Export clients
export { supabase, supabaseAdmin };
export default supabase;
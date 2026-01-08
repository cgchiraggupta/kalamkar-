/**
 * Test Setup Script
 * 
 * Quick test to verify the application is working correctly
 */

import { testConnection } from './src/database/supabase.js';
import { User } from './src/models/User.js';
import logger from './src/utils/logger.js';

async function runTests() {
    console.log('🧪 Running Kalakar Application Tests...\n');

    try {
        // Test 1: Database Connection
        console.log('1. Testing database connection...');
        const dbConnected = await testConnection();
        if (dbConnected) {
            console.log('   ✅ Database connection successful');
        } else {
            console.log('   ❌ Database connection failed');
            return;
        }

        // Test 2: User Model
        console.log('\n2. Testing User model...');
        try {
            // Try to find demo user
            const demoUser = await User.findByEmail('demo@kalakar.ai');
            if (demoUser) {
                console.log('   ✅ Demo user found');
                console.log(`   📊 Credits: ${demoUser.creditsRemaining}`);
                console.log(`   🎫 Tier: ${demoUser.subscriptionTier}`);
            } else {
                console.log('   ℹ️  Demo user not found (will be created on first use)');
            }
        } catch (error) {
            console.log(`   ⚠️  User model test: ${error.message}`);
        }

        // Test 3: Environment Configuration
        console.log('\n3. Testing configuration...');
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'JWT_SECRET'
        ];

        let configValid = true;
        for (const envVar of requiredEnvVars) {
            if (process.env[envVar]) {
                console.log(`   ✅ ${envVar} is set`);
            } else {
                console.log(`   ❌ ${envVar} is missing`);
                configValid = false;
            }
        }

        // Test 4: Whisper Setup
        console.log('\n4. Testing Whisper setup...');
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            // Test if Whisper script exists
            const fs = await import('fs');
            const path = await import('path');
            const scriptPath = path.join(process.cwd(), 'scripts', 'run_whisper.sh');
            
            if (fs.existsSync(scriptPath)) {
                console.log('   ✅ Whisper script found');
                
                // Test script execution
                try {
                    const { stdout } = await execAsync(`bash "${scriptPath}" --help`);
                    if (stdout.includes('Usage:')) {
                        console.log('   ✅ Whisper script is executable');
                    }
                } catch (error) {
                    console.log('   ⚠️  Whisper script test failed (this is normal if Whisper is not installed)');
                }
            } else {
                console.log('   ❌ Whisper script not found');
            }
        } catch (error) {
            console.log(`   ⚠️  Whisper test error: ${error.message}`);
        }

        // Test 5: File Upload Directory
        console.log('\n5. Testing file upload setup...');
        try {
            const fs = await import('fs');
            const path = await import('path');
            const uploadDir = path.join(process.cwd(), 'uploads');
            
            if (fs.existsSync(uploadDir)) {
                console.log('   ✅ Upload directory exists');
                
                // Check permissions
                try {
                    fs.accessSync(uploadDir, fs.constants.W_OK);
                    console.log('   ✅ Upload directory is writable');
                } catch (error) {
                    console.log('   ❌ Upload directory is not writable');
                }
            } else {
                console.log('   ⚠️  Upload directory does not exist (will be created automatically)');
            }
        } catch (error) {
            console.log(`   ⚠️  Upload directory test error: ${error.message}`);
        }

        console.log('\n🎉 Application test completed!');
        
        if (configValid && dbConnected) {
            console.log('\n✅ Your Kalakar application is ready to use!');
            console.log('   Start the servers with:');
            console.log('   Backend:  npm run dev (in backend directory)');
            console.log('   Frontend: npm run dev (in frontend directory)');
        } else {
            console.log('\n⚠️  Some issues were found. Please check the configuration.');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        logger.error('Application test failed', { error: error.message });
    }
}

// Run tests
runTests().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
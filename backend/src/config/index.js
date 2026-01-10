/**
 * Kalakar - Configuration Module
 * 
 * Centralizes all environment configuration with validation.
 * Fails fast if critical configuration is missing.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Validates that required environment variables are set
 * @param {string[]} requiredVars - Array of required variable names
 */
function validateEnvVars(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n📝 Copy .env.example to .env and fill in the values');
    process.exit(1);
  }
}

// Validate critical env vars (relaxed for development)
const criticalVars = process.env.NODE_ENV === 'production' 
  ? ['JWT_SECRET', 'FRONTEND_URL']
  : [];

if (criticalVars.length > 0) {
  validateEnvVars(criticalVars);
}

// Configuration object
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // CORS - Specific origins only (no wildcards per security rules)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // File Upload
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 500,
    maxFileSizeBytes: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 500) * 1024 * 1024,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
      'video/x-matroska',
    ],
    allowedExtensions: ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // AI Configuration
  ai: {
    useLocalWhisper: process.env.USE_LOCAL_WHISPER === 'true' || true, // Default to local
    whisperModel: process.env.WHISPER_MODEL || 'small',
    openaiApiKey: process.env.OPENAI_API_KEY, // Fallback for API usage
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },

  // Razorpay Payment Gateway
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  // Email (Resend)
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'noreply@kalakar.app',
    fromName: process.env.EMAIL_FROM_NAME || 'Kalakar',
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,
};

// Log configuration (excluding secrets) for debugging
if (config.isDev) {
  console.log('📋 Configuration loaded:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
  console.log(`   Max Upload Size: ${config.upload.maxFileSizeMB}MB`);
}

export default config;

# 🚀 Production Deployment Guide

Complete guide to deploy Kalakar to production with high availability and scalability.

## 🏗️ Architecture Overview

```
Internet → Cloudflare CDN → Load Balancer → App Servers → Database
                                        ↓
                                   File Storage (S3)
                                        ↓
                                   Background Jobs (Redis)
```

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Supabase production project created
- [ ] AWS account with S3 bucket configured
- [ ] Domain name purchased and DNS configured
- [ ] SSL certificates ready (Let's Encrypt or Cloudflare)
- [ ] Monitoring tools setup (Sentry, PostHog)

### 2. Security Checklist
- [ ] All environment variables secured
- [ ] JWT secrets are cryptographically strong
- [ ] Database RLS policies tested
- [ ] Rate limiting configured
- [ ] CORS origins restricted to production domains
- [ ] File upload validation enabled

### 3. Performance Checklist
- [ ] Database indexes optimized
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Gzip compression enabled
- [ ] Database connection pooling configured

## 🗄️ Database Deployment (Supabase)

### 1. Create Production Project

```bash
# 1. Go to https://supabase.com/dashboard
# 2. Create new project
# 3. Choose region closest to your users
# 4. Note down project URL and keys
```

### 2. Configure Database

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run migrations
cd backend
npm run migrate
```

### 3. Setup RLS Policies

```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Should return no rows (all tables should have RLS enabled)
```

### 4. Configure Backups

```bash
# In Supabase Dashboard:
# 1. Go to Settings → Database
# 2. Enable Point-in-Time Recovery
# 3. Set backup retention period
# 4. Configure backup notifications
```

## 🖥️ Backend Deployment

### Option A: Railway (Recommended)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and initialize
railway login
railway init

# 3. Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=5001
railway variables set SUPABASE_URL=your-url
railway variables set SUPABASE_ANON_KEY=your-key
railway variables set SUPABASE_SERVICE_KEY=your-service-key
railway variables set JWT_SECRET=your-strong-secret
railway variables set FRONTEND_URL=https://your-domain.com

# 4. Deploy
railway up
```

### Option B: Render

```yaml
# render.yaml
services:
  - type: web
    name: kalakar-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
      - key: SUPABASE_URL
        fromDatabase:
          name: supabase-url
          property: connectionString
```

### Option C: AWS ECS (Advanced)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 5001

CMD ["npm", "start"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

## 🌐 Frontend Deployment

### Option A: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy from frontend directory
cd frontend
vercel --prod

# 3. Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Option B: Netlify

```bash
# 1. Build the project
npm run build

# 2. Deploy to Netlify
# - Drag and drop the 'out' folder to Netlify
# - Or connect GitHub repository

# 3. Set environment variables in Netlify dashboard
```

### Option C: AWS CloudFront + S3

```bash
# 1. Build static files
npm run build
npm run export

# 2. Upload to S3
aws s3 sync out/ s3://your-bucket-name --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 📁 File Storage Setup (AWS S3)

### 1. Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://kalakar-videos-prod

# Set bucket policy
aws s3api put-bucket-policy --bucket kalakar-videos-prod --policy file://bucket-policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::kalakar-videos-prod/*"
    }
  ]
}
```

### 2. Configure CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3. Setup CDN (CloudFront)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

## 🔄 Background Jobs (Redis)

### 1. Setup Redis

```bash
# Option A: Railway Redis
railway add redis

# Option B: AWS ElastiCache
# Create through AWS Console

# Option C: Redis Cloud
# Sign up at redislabs.com
```

### 2. Configure Job Queue

```javascript
// backend/src/services/jobQueue.js
import Bull from 'bull';
import config from '../config/index.js';

export const transcriptionQueue = new Bull('transcription', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  }
});

// Process transcription jobs
transcriptionQueue.process('transcribe', async (job) => {
  const { videoId, userId, language } = job.data;
  // Process transcription...
});
```

## 📊 Monitoring & Analytics

### 1. Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/node @sentry/nextjs

# Configure backend
# backend/src/utils/sentry.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### 2. Performance Monitoring

```javascript
// backend/src/middleware/monitoring.js
import { performance } from 'perf_hooks';

export function performanceMonitoring(req, res, next) {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`
    });
  });
  
  next();
}
```

### 3. User Analytics (PostHog)

```bash
# Install PostHog
npm install posthog-js posthog-node

# Configure frontend tracking
# frontend/src/lib/analytics.js
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com'
});
```

## 🔒 Security Hardening

### 1. Environment Variables

```bash
# Use strong, unique secrets
JWT_SECRET=$(openssl rand -base64 64)
DATABASE_PASSWORD=$(openssl rand -base64 32)

# Never commit secrets to git
echo "*.env*" >> .gitignore
```

### 2. Rate Limiting

```javascript
// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:strict:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});
```

### 3. Security Headers

```javascript
// backend/src/middleware/security.js
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.your-domain.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

## 🚀 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_videos_user_created 
ON videos(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_transcription_jobs_status 
ON transcription_jobs(status) WHERE status IN ('pending', 'processing');

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;
```

### 2. Caching Strategy

```javascript
// backend/src/middleware/cache.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        redis.setex(key, ttl, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
}
```

### 3. CDN Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    loader: 'cloudinary', // or 'custom'
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

## 📈 Scaling Strategies

### 1. Horizontal Scaling

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kalakar-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kalakar-backend
  template:
    metadata:
      labels:
        app: kalakar-backend
    spec:
      containers:
      - name: backend
        image: kalakar/backend:latest
        ports:
        - containerPort: 5001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kalakar-secrets
              key: database-url
```

### 2. Load Balancing

```nginx
# nginx.conf
upstream backend {
    server backend1:5001;
    server backend2:5001;
    server backend3:5001;
}

server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Auto-scaling

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kalakar-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kalakar-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔍 Health Checks & Monitoring

### 1. Application Health Checks

```javascript
// backend/src/routes/healthRoutes.js
router.get('/health/live', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health/ready', async (req, res) => {
  try {
    // Check database connection
    await supabase.from('users').select('count').limit(1);
    
    // Check Redis connection
    await redis.ping();
    
    res.json({ 
      status: 'ready', 
      checks: {
        database: 'ok',
        redis: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message 
    });
  }
});
```

### 2. Uptime Monitoring

```bash
# Setup monitoring with UptimeRobot or Pingdom
# Monitor these endpoints:
# - https://your-domain.com (frontend)
# - https://api.your-domain.com/api/health (backend)
# - Database connectivity
# - S3 bucket accessibility
```

## 🚨 Disaster Recovery

### 1. Backup Strategy

```bash
# Database backups (automated by Supabase)
# - Point-in-time recovery enabled
# - Daily snapshots
# - Cross-region replication

# File storage backups
aws s3 sync s3://kalakar-videos-prod s3://kalakar-videos-backup --delete

# Application code backups
# - Git repository with multiple remotes
# - Docker images in registry
# - Infrastructure as Code (Terraform)
```

### 2. Recovery Procedures

```bash
# Database recovery
# 1. Create new Supabase project
# 2. Restore from backup
# 3. Update connection strings
# 4. Run migrations if needed

# Application recovery
# 1. Deploy from last known good commit
# 2. Update DNS if needed
# 3. Verify all services are running
# 4. Test critical user flows
```

## ✅ Post-Deployment Checklist

### 1. Functional Testing
- [ ] User registration and login works
- [ ] Video upload functionality
- [ ] Transcription jobs complete successfully
- [ ] Caption editing and export works
- [ ] Payment processing (if implemented)

### 2. Performance Testing
- [ ] Load test with expected traffic
- [ ] Database query performance
- [ ] File upload/download speeds
- [ ] API response times under load

### 3. Security Testing
- [ ] Penetration testing
- [ ] Vulnerability scanning
- [ ] SSL certificate validation
- [ ] Rate limiting effectiveness

### 4. Monitoring Setup
- [ ] Error tracking alerts configured
- [ ] Performance monitoring dashboards
- [ ] Uptime monitoring alerts
- [ ] Log aggregation working

## 📞 Support & Maintenance

### 1. Monitoring Dashboards

```javascript
// Create monitoring dashboard URLs
const dashboards = {
  application: 'https://sentry.io/organizations/kalakar/dashboard/',
  infrastructure: 'https://railway.app/project/your-project/metrics',
  database: 'https://app.supabase.com/project/your-project/reports',
  analytics: 'https://app.posthog.com/dashboard'
};
```

### 2. Maintenance Schedule

```bash
# Weekly tasks
- Review error logs and fix critical issues
- Monitor database performance and optimize queries
- Update dependencies and security patches
- Review user feedback and feature requests

# Monthly tasks  
- Database maintenance and cleanup
- Performance optimization review
- Security audit and updates
- Backup verification and testing

# Quarterly tasks
- Infrastructure cost optimization
- Capacity planning and scaling review
- Disaster recovery testing
- Security penetration testing
```

---

## 🎯 Success Metrics

Track these KPIs post-deployment:

- **Uptime**: > 99.9%
- **Response Time**: < 200ms (API), < 2s (Frontend)
- **Error Rate**: < 0.1%
- **User Satisfaction**: > 4.5/5
- **Transcription Accuracy**: > 95%
- **Processing Time**: < 2 minutes per video minute

---

**🚀 Your Kalakar platform is now production-ready!**

For support during deployment, reach out to our team or check the troubleshooting guide.
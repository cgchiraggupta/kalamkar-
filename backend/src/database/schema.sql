-- Kalakar Database Schema
-- Production-ready schema with proper indexing, constraints, and RLS

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'creator', 'business')),
    subscription_expires_at TIMESTAMPTZ,
    credits_remaining INTEGER DEFAULT 600, -- 10 minutes free transcription
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    duration_seconds DECIMAL(10,3),
    width INTEGER,
    height INTEGER,
    fps DECIMAL(5,2),
    storage_path TEXT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'local' CHECK (storage_provider IN ('local', 's3', 'supabase')),
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'ready', 'error')),
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Transcription jobs table
CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL DEFAULT 'auto',
    model_used VARCHAR(50) NOT NULL DEFAULT 'whisper-small',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    credits_used INTEGER DEFAULT 0,
    processing_time_seconds INTEGER,
    word_count INTEGER,
    accuracy_score DECIMAL(3,2),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Captions table
CREATE TABLE IF NOT EXISTS captions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_job_id UUID NOT NULL REFERENCES transcription_jobs(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    confidence DECIMAL(3,2),
    speaker_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT captions_time_order CHECK (start_time < end_time),
    CONSTRAINT captions_sequence_unique UNIQUE (transcription_job_id, sequence_number)
);

-- Words table (for word-level timing)
CREATE TABLE IF NOT EXISTS words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caption_id UUID NOT NULL REFERENCES captions(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    confidence DECIMAL(3,2),
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT words_time_order CHECK (start_time < end_time),
    CONSTRAINT words_sequence_unique UNIQUE (caption_id, sequence_number)
);

-- Export jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcription_job_id UUID REFERENCES transcription_jobs(id) ON DELETE SET NULL,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('video_with_captions', 'srt', 'vtt', 'json')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    output_filename VARCHAR(255),
    output_path TEXT,
    output_size BIGINT,
    quality VARCHAR(20) DEFAULT 'high' CHECK (quality IN ('low', 'medium', 'high')),
    style_config JSONB DEFAULT '{}'::jsonb,
    processing_time_seconds INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Projects table (for organizing videos)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Project videos junction table
CREATE TABLE IF NOT EXISTS project_videos (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (project_id, video_id)
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    credits_consumed INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_code VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transcription_jobs_video_id ON transcription_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_created_at ON transcription_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_captions_transcription_job_id ON captions(transcription_job_id);
CREATE INDEX IF NOT EXISTS idx_captions_video_id ON captions(video_id);
CREATE INDEX IF NOT EXISTS idx_captions_time_range ON captions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_captions_sequence ON captions(transcription_job_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_words_caption_id ON words(caption_id);
CREATE INDEX IF NOT EXISTS idx_words_sequence ON words(caption_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_video_id ON export_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires_at ON export_jobs(expires_at);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_videos_project_id ON project_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_videos_video_id ON project_videos(video_id);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created_at ON usage_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_action ON usage_analytics(action);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_captions_text_search ON captions USING gin(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_videos_name_search ON videos USING gin(to_tsvector('english', original_name));

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Videos policies
CREATE POLICY "Users can view own videos" ON videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON videos
    FOR DELETE USING (auth.uid() = user_id);

-- Transcription jobs policies
CREATE POLICY "Users can view own transcription jobs" ON transcription_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcription jobs" ON transcription_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcription jobs" ON transcription_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Captions policies
CREATE POLICY "Users can view captions for own videos" ON captions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id = captions.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert captions for own videos" ON captions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id = captions.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update captions for own videos" ON captions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id = captions.video_id 
            AND videos.user_id = auth.uid()
        )
    );

-- Words policies (similar to captions)
CREATE POLICY "Users can view words for own captions" ON words
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM captions 
            JOIN videos ON videos.id = captions.video_id
            WHERE captions.id = words.caption_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert words for own captions" ON words
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM captions 
            JOIN videos ON videos.id = captions.video_id
            WHERE captions.id = words.caption_id 
            AND videos.user_id = auth.uid()
        )
    );

-- Export jobs policies
CREATE POLICY "Users can view own export jobs" ON export_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export jobs" ON export_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own export jobs" ON export_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Project videos policies
CREATE POLICY "Users can view project videos for accessible projects" ON project_videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_videos.project_id 
            AND (projects.user_id = auth.uid() OR projects.is_public = true)
        )
    );

CREATE POLICY "Users can manage project videos for own projects" ON project_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_videos.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Usage analytics policies
CREATE POLICY "Users can view own analytics" ON usage_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON usage_analytics
    FOR INSERT WITH CHECK (true); -- Allow system to insert analytics

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcription_jobs_updated_at BEFORE UPDATE ON transcription_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_captions_updated_at BEFORE UPDATE ON captions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at BEFORE UPDATE ON export_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for common operations

-- Function to get user's remaining credits
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT credits_remaining 
        FROM users 
        WHERE id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume user credits
CREATE OR REPLACE FUNCTION consume_user_credits(user_uuid UUID, credits_to_consume INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    SELECT credits_remaining INTO current_credits
    FROM users 
    WHERE id = user_uuid;
    
    IF current_credits >= credits_to_consume THEN
        UPDATE users 
        SET credits_remaining = credits_remaining - credits_to_consume
        WHERE id = user_uuid;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM export_jobs 
    WHERE expires_at < NOW() 
    AND status = 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for video statistics
CREATE OR REPLACE VIEW video_stats AS
SELECT 
    v.id,
    v.user_id,
    v.original_name,
    v.duration_seconds,
    v.created_at,
    COUNT(tj.id) as transcription_count,
    COUNT(CASE WHEN tj.status = 'completed' THEN 1 END) as completed_transcriptions,
    COUNT(ej.id) as export_count,
    COUNT(CASE WHEN ej.status = 'completed' THEN 1 END) as completed_exports,
    MAX(tj.completed_at) as last_transcribed_at,
    MAX(ej.completed_at) as last_exported_at
FROM videos v
LEFT JOIN transcription_jobs tj ON v.id = tj.video_id
LEFT JOIN export_jobs ej ON v.id = ej.video_id
GROUP BY v.id, v.user_id, v.original_name, v.duration_seconds, v.created_at;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert default data
INSERT INTO users (id, email, password_hash, full_name, subscription_tier, credits_remaining) 
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'demo@kalakar.ai',
    '$2a$10$dummy.hash.for.demo.user.only',
    'Demo User',
    'creator',
    3000
) ON CONFLICT (id) DO NOTHING;
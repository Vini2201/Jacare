-- Supabase Schema V3 (Observability, Roles & Audit Logs)

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superuser');
CREATE TYPE event_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE event_category AS ENUM ('auth', 'admin', 'ai', 'billing', 'storage', 'system');

-- 2. Update user_profiles table
ALTER TABLE public.user_profiles 
  ADD COLUMN role user_role DEFAULT 'user',
  ADD COLUMN notify_preferences JSONB DEFAULT '{"telegram": true, "email_critical_only": true}'::jsonb;

-- Convert existing superusers (if any)
UPDATE public.user_profiles 
  SET role = 'superuser' 
  WHERE is_superuser = true;

-- Remove old column
ALTER TABLE public.user_profiles DROP COLUMN is_superuser;

-- 3. Create Audit Logs table
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category event_category NOT NULL,
    severity event_severity NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Audit Logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only superusers can view audit logs
CREATE POLICY "Superusers can view audit logs" ON admin_audit_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superuser')
  );

-- 4. Update the trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits, role)
  VALUES (new.id, 50, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

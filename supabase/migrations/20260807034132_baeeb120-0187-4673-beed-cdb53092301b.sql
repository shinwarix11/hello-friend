
-- ENUMS
CREATE TYPE public.license_status AS ENUM ('unused','active','expired','suspended','banned');
CREATE TYPE public.app_user_status AS ENUM ('active','banned','suspended');
CREATE TYPE public.subscription_status AS ENUM ('active','paused','archived');
CREATE TYPE public.webhook_event AS ENUM (
  'application.created','license.created','license.activated','license.expired',
  'license.banned','user.registered','user.login','subscription.updated',
  'version.published','secret.rotated'
);
CREATE TYPE public.webhook_delivery_status AS ENUM ('pending','success','failed');
CREATE TYPE public.auth_log_kind AS ENUM (
  'init','register','login','logout','validate','activate','session','heartbeat',
  'variable','version','download','error'
);

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_days integer,
  features text[] NOT NULL DEFAULT '{}',
  status subscription_status NOT NULL DEFAULT 'active',
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs write subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "devs update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "admins delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPLICATION END USERS
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text,
  password_hash text NOT NULL,
  status app_user_status NOT NULL DEFAULT 'active',
  hwid text,
  last_ip text,
  last_login_at timestamptz,
  login_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, username)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read app_users" ON public.app_users FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs insert app_users" ON public.app_users FOR INSERT TO authenticated WITH CHECK (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "devs update app_users" ON public.app_users FOR UPDATE TO authenticated USING (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "admins delete app_users" ON public.app_users FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE TRIGGER app_users_set_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LICENSES
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  license_key text NOT NULL UNIQUE,
  status license_status NOT NULL DEFAULT 'unused',
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  app_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  owner_label text,
  duration_days integer,
  activated_at timestamptz,
  expires_at timestamptz,
  hwid_lock boolean NOT NULL DEFAULT true,
  max_activations integer NOT NULL DEFAULT 1,
  current_activations integer NOT NULL DEFAULT 0,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX licenses_app_idx ON public.licenses(application_id, created_at DESC);
CREATE INDEX licenses_status_idx ON public.licenses(application_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read licenses" ON public.licenses FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "devs update licenses" ON public.licenses FOR UPDATE TO authenticated USING (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "admins delete licenses" ON public.licenses FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE TRIGGER licenses_set_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LICENSE ACTIVATIONS
CREATE TABLE public.license_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  hwid text,
  ip_address text,
  user_agent text,
  app_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX license_activations_license_idx ON public.license_activations(license_id, activated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_activations TO authenticated;
GRANT ALL ON public.license_activations TO service_role;
ALTER TABLE public.license_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read activations" ON public.license_activations FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs manage activations" ON public.license_activations FOR ALL TO authenticated USING (public.is_app_developer(application_id, auth.uid())) WITH CHECK (public.is_app_developer(application_id, auth.uid()));

-- APP USER SESSIONS
CREATE TABLE public.app_user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  hwid text,
  ip_address text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_user_sessions_app_idx ON public.app_user_sessions(application_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.app_user_sessions TO authenticated;
GRANT ALL ON public.app_user_sessions TO service_role;
ALTER TABLE public.app_user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sessions" ON public.app_user_sessions FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs revoke sessions" ON public.app_user_sessions FOR UPDATE TO authenticated USING (public.is_app_developer(application_id, auth.uid()));
CREATE POLICY "admins delete sessions" ON public.app_user_sessions FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));

-- API KEYS
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read api_keys" ON public.api_keys FOR SELECT TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins insert api_keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins update api_keys" ON public.api_keys FOR UPDATE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins delete api_keys" ON public.api_keys FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE TRIGGER api_keys_set_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WEBHOOKS
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events webhook_event[] NOT NULL DEFAULT '{}',
  signing_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read webhooks" ON public.webhooks FOR SELECT TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins insert webhooks" ON public.webhooks FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins update webhooks" ON public.webhooks FOR UPDATE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE POLICY "admins delete webhooks" ON public.webhooks FOR DELETE TO authenticated USING (public.is_app_admin(application_id, auth.uid()));
CREATE TRIGGER webhooks_set_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event webhook_event NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  response_status integer,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_deliveries_app_idx ON public.webhook_deliveries(application_id, created_at DESC);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));

-- USER VARIABLES
CREATE TABLE public.app_user_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_variables TO authenticated;
GRANT ALL ON public.app_user_variables TO service_role;
ALTER TABLE public.app_user_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read user vars" ON public.app_user_variables FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs manage user vars" ON public.app_user_variables FOR ALL TO authenticated USING (public.is_app_developer(application_id, auth.uid())) WITH CHECK (public.is_app_developer(application_id, auth.uid()));
CREATE TRIGGER app_user_vars_set_updated_at BEFORE UPDATE ON public.app_user_variables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LICENSE VARIABLES
CREATE TABLE public.license_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_variables TO authenticated;
GRANT ALL ON public.license_variables TO service_role;
ALTER TABLE public.license_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read license vars" ON public.license_variables FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY "devs manage license vars" ON public.license_variables FOR ALL TO authenticated USING (public.is_app_developer(application_id, auth.uid())) WITH CHECK (public.is_app_developer(application_id, auth.uid()));
CREATE TRIGGER license_vars_set_updated_at BEFORE UPDATE ON public.license_variables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTHENTICATION LOGS
CREATE TABLE public.authentication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  kind auth_log_kind NOT NULL,
  success boolean NOT NULL DEFAULT true,
  app_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  message text,
  ip_address text,
  hwid text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_logs_app_idx ON public.authentication_logs(application_id, created_at DESC);
GRANT SELECT ON public.authentication_logs TO authenticated;
GRANT ALL ON public.authentication_logs TO service_role;
ALTER TABLE public.authentication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read auth logs" ON public.authentication_logs FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));

-- API USAGE LOGS
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  status_code integer NOT NULL DEFAULT 200,
  duration_ms integer NOT NULL DEFAULT 0,
  ip_address text,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_usage_app_idx ON public.api_usage_logs(application_id, created_at DESC);
GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read api usage" ON public.api_usage_logs FOR SELECT TO authenticated USING (public.is_app_member(application_id, auth.uid()));

-- REPLAY PROTECTION (nonces)
CREATE TABLE public.api_request_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, nonce)
);
GRANT ALL ON public.api_request_nonces TO service_role;
ALTER TABLE public.api_request_nonces ENABLE ROW LEVEL SECURITY;

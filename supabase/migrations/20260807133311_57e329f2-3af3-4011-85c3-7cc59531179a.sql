
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  job_title TEXT,
  company TEXT,
  bio TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  product_emails BOOLEAN NOT NULL DEFAULT true,
  security_emails BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_all_own" ON public.user_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_user_created_idx ON public.audit_logs (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_own" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "audit_insert_own" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prefs_set_updated_at BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,'user'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

CREATE TYPE public.app_member_role AS ENUM ('owner','administrator','developer','support','viewer');
CREATE TYPE public.app_environment AS ENUM ('development','staging','production');
CREATE TYPE public.app_visibility AS ENUM ('private','internal','public');
CREATE TYPE public.app_status AS ENUM ('active','paused','maintenance','archived');
CREATE TYPE public.app_version_channel AS ENUM ('stable','beta','alpha','deprecated');
CREATE TYPE public.app_download_kind AS ENUM ('executable','zip','dll','installer','documentation','other');
CREATE TYPE public.app_invitation_status AS ENUM ('pending','accepted','revoked','expired');

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  internal_name text NOT NULL,
  description text,
  logo_url text,
  category text NOT NULL DEFAULT 'general',
  environment public.app_environment NOT NULL DEFAULT 'development',
  visibility public.app_visibility NOT NULL DEFAULT 'private',
  status public.app_status NOT NULL DEFAULT 'active',
  tags text[] NOT NULL DEFAULT '{}',
  public_key text NOT NULL DEFAULT ('pk_live_' || encode(gen_random_bytes(16), 'hex')),
  secret_key text NOT NULL DEFAULT ('sk_live_' || encode(gen_random_bytes(24), 'hex')),
  current_version text NOT NULL DEFAULT '1.0.0',
  minimum_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, internal_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.application_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_members TO authenticated;
GRANT ALL ON public.application_members TO service_role;
ALTER TABLE public.application_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.app_role_of(_application_id uuid, _user_id uuid)
RETURNS public.app_member_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.application_members
  WHERE application_id = _application_id AND user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_app_member(_application_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.application_members
    WHERE application_id = _application_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin(_application_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.application_members
    WHERE application_id = _application_id AND user_id = _user_id
      AND role IN ('owner','administrator')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_developer(_application_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.application_members
    WHERE application_id = _application_id AND user_id = _user_id
      AND role IN ('owner','administrator','developer')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_owner(_application_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications
    WHERE id = _application_id AND owner_id = _user_id
  )
$$;

CREATE POLICY applications_select ON public.applications FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_member(id, auth.uid()) OR visibility = 'public');
CREATE POLICY applications_insert ON public.applications FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY applications_update ON public.applications FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_admin(id, auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_app_admin(id, auth.uid()));
CREATE POLICY applications_delete ON public.applications FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY app_members_select ON public.application_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_member(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()));
CREATE POLICY app_members_insert ON public.application_members FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()));
CREATE POLICY app_members_update ON public.application_members FOR UPDATE TO authenticated
  USING (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()))
  WITH CHECK (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()));
CREATE POLICY app_members_delete ON public.application_members FOR DELETE TO authenticated
  USING (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()) OR user_id = auth.uid());

CREATE TABLE public.application_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_member_role NOT NULL DEFAULT 'viewer',
  status public.app_invitation_status NOT NULL DEFAULT 'pending',
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_invitations TO authenticated;
GRANT ALL ON public.application_invitations TO service_role;
ALTER TABLE public.application_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_inv_select ON public.application_invitations FOR SELECT TO authenticated
  USING (public.is_app_admin(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()));
CREATE POLICY app_inv_insert ON public.application_invitations FOR INSERT TO authenticated
  WITH CHECK ((public.is_app_admin(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid())) AND invited_by = auth.uid());
CREATE POLICY app_inv_update ON public.application_invitations FOR UPDATE TO authenticated
  USING (public.is_app_admin(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()))
  WITH CHECK (public.is_app_admin(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()));
CREATE POLICY app_inv_delete ON public.application_invitations FOR DELETE TO authenticated
  USING (public.is_app_admin(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()));

CREATE TABLE public.application_settings (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  accent_color text NOT NULL DEFAULT 'blue',
  banner_url text,
  support_email text,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  ip_allowlist text[] NOT NULL DEFAULT '{}',
  ip_blocklist text[] NOT NULL DEFAULT '{}',
  require_2fa boolean NOT NULL DEFAULT false,
  hwid_lock boolean NOT NULL DEFAULT false,
  force_https boolean NOT NULL DEFAULT true,
  rate_limit_per_minute integer NOT NULL DEFAULT 120,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  maintenance_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_settings TO authenticated;
GRANT ALL ON public.application_settings TO service_role;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_settings_select ON public.application_settings FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY app_settings_write ON public.application_settings FOR ALL TO authenticated
  USING (public.is_app_admin(application_id, auth.uid()))
  WITH CHECK (public.is_app_admin(application_id, auth.uid()));

CREATE TABLE public.application_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  description text,
  category text NOT NULL DEFAULT 'general',
  is_encrypted boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_variables TO authenticated;
GRANT ALL ON public.application_variables TO service_role;
ALTER TABLE public.application_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_vars_select ON public.application_variables FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()) AND (is_public OR public.is_app_developer(application_id, auth.uid())));
CREATE POLICY app_vars_write ON public.application_variables FOR ALL TO authenticated
  USING (public.is_app_developer(application_id, auth.uid()))
  WITH CHECK (public.is_app_developer(application_id, auth.uid()));

CREATE TABLE public.application_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  version text NOT NULL,
  channel public.app_version_channel NOT NULL DEFAULT 'stable',
  release_notes text,
  is_current boolean NOT NULL DEFAULT false,
  is_minimum boolean NOT NULL DEFAULT false,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_versions TO authenticated;
GRANT ALL ON public.application_versions TO service_role;
ALTER TABLE public.application_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_versions_select ON public.application_versions FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY app_versions_write ON public.application_versions FOR ALL TO authenticated
  USING (public.is_app_developer(application_id, auth.uid()))
  WITH CHECK (public.is_app_developer(application_id, auth.uid()));

CREATE TABLE public.application_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.application_versions(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind public.app_download_kind NOT NULL DEFAULT 'executable',
  file_url text,
  checksum text,
  size_bytes bigint NOT NULL DEFAULT 0,
  release_notes text,
  download_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_downloads TO authenticated;
GRANT ALL ON public.application_downloads TO service_role;
ALTER TABLE public.application_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_downloads_select ON public.application_downloads FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY app_downloads_write ON public.application_downloads FOR ALL TO authenticated
  USING (public.is_app_developer(application_id, auth.uid()))
  WITH CHECK (public.is_app_developer(application_id, auth.uid()));

CREATE TABLE public.application_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_audit_logs TO authenticated;
GRANT ALL ON public.application_audit_logs TO service_role;
ALTER TABLE public.application_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_audit_select ON public.application_audit_logs FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY app_audit_insert ON public.application_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_app_member(application_id, auth.uid()) AND user_id = auth.uid());

CREATE TABLE public.application_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_metadata TO authenticated;
GRANT ALL ON public.application_metadata TO service_role;
ALTER TABLE public.application_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_meta_select ON public.application_metadata FOR SELECT TO authenticated
  USING (public.is_app_member(application_id, auth.uid()));
CREATE POLICY app_meta_write ON public.application_metadata FOR ALL TO authenticated
  USING (public.is_app_admin(application_id, auth.uid()))
  WITH CHECK (public.is_app_admin(application_id, auth.uid()));

CREATE TABLE public.user_application_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  last_opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, application_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_application_state TO authenticated;
GRANT ALL ON public.user_application_state TO service_role;
ALTER TABLE public.user_application_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY uas_all_own ON public.user_application_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_members_set_updated_at BEFORE UPDATE ON public.application_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_inv_set_updated_at BEFORE UPDATE ON public.application_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.application_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_vars_set_updated_at BEFORE UPDATE ON public.application_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_versions_set_updated_at BEFORE UPDATE ON public.application_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_downloads_set_updated_at BEFORE UPDATE ON public.application_downloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_meta_set_updated_at BEFORE UPDATE ON public.application_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER uas_set_updated_at BEFORE UPDATE ON public.user_application_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.application_members (application_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (application_id, user_id) DO NOTHING;

  INSERT INTO public.application_settings (application_id)
  VALUES (NEW.id) ON CONFLICT (application_id) DO NOTHING;

  INSERT INTO public.application_versions (application_id, version, channel, is_current, is_minimum, release_notes, created_by)
  VALUES (NEW.id, NEW.current_version, 'stable', true, true, 'Initial release.', NEW.owner_id)
  ON CONFLICT (application_id, version) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_application_created AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_application();

CREATE INDEX idx_app_members_app ON public.application_members(application_id);
CREATE INDEX idx_app_members_user ON public.application_members(user_id);
CREATE INDEX idx_app_vars_app ON public.application_variables(application_id);
CREATE INDEX idx_app_versions_app ON public.application_versions(application_id);
CREATE INDEX idx_app_downloads_app ON public.application_downloads(application_id);
CREATE INDEX idx_app_audit_app ON public.application_audit_logs(application_id, created_at DESC);

REVOKE ALL ON FUNCTION public.handle_new_application() FROM PUBLIC, anon, authenticated;

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

CREATE TABLE public.api_request_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, nonce)
);
GRANT ALL ON public.api_request_nonces TO service_role;
ALTER TABLE public.api_request_nonces ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.is_app_member(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_developer(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_owner(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.app_role_of(uuid, uuid) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.is_app_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_developer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_role_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE TABLE public.developer_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_language text NOT NULL DEFAULT 'csharp',
  default_sdk text NOT NULL DEFAULT 'csharp',
  docs_density text NOT NULL DEFAULT 'comfortable',
  show_beta_docs boolean NOT NULL DEFAULT false,
  explorer_pretty_json boolean NOT NULL DEFAULT true,
  explorer_include_signature boolean NOT NULL DEFAULT false,
  notify_breaking_changes boolean NOT NULL DEFAULT true,
  notify_sdk_releases boolean NOT NULL DEFAULT true,
  notify_webhook_failures boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_preferences TO authenticated;
GRANT ALL ON public.developer_preferences TO service_role;

ALTER TABLE public.developer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers manage their own preferences"
ON public.developer_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER dev_prefs_set_updated_at
BEFORE UPDATE ON public.developer_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

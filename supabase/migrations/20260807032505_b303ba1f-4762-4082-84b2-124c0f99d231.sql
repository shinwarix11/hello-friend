-- ============ ENUMS ============
CREATE TYPE public.app_member_role AS ENUM ('owner','administrator','developer','support','viewer');
CREATE TYPE public.app_environment AS ENUM ('development','staging','production');
CREATE TYPE public.app_visibility AS ENUM ('private','internal','public');
CREATE TYPE public.app_status AS ENUM ('active','paused','maintenance','archived');
CREATE TYPE public.app_version_channel AS ENUM ('stable','beta','alpha','deprecated');
CREATE TYPE public.app_download_kind AS ENUM ('executable','zip','dll','installer','documentation','other');
CREATE TYPE public.app_invitation_status AS ENUM ('pending','accepted','revoked','expired');

-- ============ APPLICATIONS ============
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

-- ============ MEMBERS ============
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

-- ============ HELPERS (security definer, avoid RLS recursion) ============
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

REVOKE EXECUTE ON FUNCTION public.app_role_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_app_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_app_developer(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_app_owner(uuid, uuid) FROM anon;

-- applications policies
CREATE POLICY applications_select ON public.applications FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_member(id, auth.uid()) OR visibility = 'public');
CREATE POLICY applications_insert ON public.applications FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY applications_update ON public.applications FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_admin(id, auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_app_admin(id, auth.uid()));
CREATE POLICY applications_delete ON public.applications FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- members policies
CREATE POLICY app_members_select ON public.application_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_member(application_id, auth.uid()) OR public.is_app_owner(application_id, auth.uid()));
CREATE POLICY app_members_insert ON public.application_members FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()));
CREATE POLICY app_members_update ON public.application_members FOR UPDATE TO authenticated
  USING (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()))
  WITH CHECK (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()));
CREATE POLICY app_members_delete ON public.application_members FOR DELETE TO authenticated
  USING (public.is_app_owner(application_id, auth.uid()) OR public.is_app_admin(application_id, auth.uid()) OR user_id = auth.uid());

-- ============ INVITATIONS ============
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

-- ============ SETTINGS ============
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

-- ============ VARIABLES ============
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

-- ============ VERSIONS ============
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

-- ============ DOWNLOADS ============
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

-- ============ APP AUDIT LOGS ============
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

-- ============ METADATA ============
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

-- ============ USER APPLICATION STATE (favorites / pins / recents) ============
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

-- ============ TRIGGERS ============
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

-- Owner becomes a member + default settings row on application creation
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
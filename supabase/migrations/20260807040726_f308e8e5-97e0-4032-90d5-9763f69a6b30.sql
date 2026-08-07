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
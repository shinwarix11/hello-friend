export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_nonces: {
        Row: {
          application_id: string
          created_at: string
          id: string
          nonce: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          nonce: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          nonce?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_nonces_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          application_id: string
          created_at: string
          duration_ms: number
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          status_code: number
        }
        Insert: {
          api_key_id?: string | null
          application_id: string
          created_at?: string
          duration_ms?: number
          endpoint: string
          id?: string
          ip_address?: string | null
          method?: string
          status_code?: number
        }
        Update: {
          api_key_id?: string | null
          application_id?: string
          created_at?: string
          duration_ms?: number
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_sessions: {
        Row: {
          app_user_id: string
          application_id: string
          created_at: string
          expires_at: string
          hwid: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_seen_at: string
          license_id: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          app_user_id: string
          application_id: string
          created_at?: string
          expires_at: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen_at?: string
          license_id?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          app_user_id?: string
          application_id?: string
          created_at?: string
          expires_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen_at?: string
          license_id?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_user_sessions_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_user_sessions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_user_sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_variables: {
        Row: {
          app_user_id: string
          application_id: string
          created_at: string
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          app_user_id: string
          application_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          app_user_id?: string
          application_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_variables_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_user_variables_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          application_id: string
          created_at: string
          email: string | null
          hwid: string | null
          id: string
          last_ip: string | null
          last_login_at: string | null
          login_count: number
          metadata: Json
          password_hash: string
          status: Database["public"]["Enums"]["app_user_status"]
          updated_at: string
          username: string
        }
        Insert: {
          application_id: string
          created_at?: string
          email?: string | null
          hwid?: string | null
          id?: string
          last_ip?: string | null
          last_login_at?: string | null
          login_count?: number
          metadata?: Json
          password_hash: string
          status?: Database["public"]["Enums"]["app_user_status"]
          updated_at?: string
          username: string
        }
        Update: {
          application_id?: string
          created_at?: string
          email?: string | null
          hwid?: string | null
          id?: string
          last_ip?: string | null
          last_login_at?: string | null
          login_count?: number
          metadata?: Json
          password_hash?: string
          status?: Database["public"]["Enums"]["app_user_status"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_audit_logs: {
        Row: {
          application_id: string
          created_at: string
          description: string | null
          event: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          description?: string | null
          event: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string | null
          event?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_audit_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_downloads: {
        Row: {
          application_id: string
          checksum: string | null
          created_at: string
          created_by: string | null
          download_count: number
          file_url: string | null
          id: string
          kind: Database["public"]["Enums"]["app_download_kind"]
          name: string
          release_notes: string | null
          size_bytes: number
          updated_at: string
          version_id: string | null
        }
        Insert: {
          application_id: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["app_download_kind"]
          name: string
          release_notes?: string | null
          size_bytes?: number
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          application_id?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["app_download_kind"]
          name?: string
          release_notes?: string | null
          size_bytes?: number
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_downloads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_downloads_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "application_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_invitations: {
        Row: {
          application_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_member_role"]
          status: Database["public"]["Enums"]["app_invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_member_role"]
          status?: Database["public"]["Enums"]["app_invitation_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_member_role"]
          status?: Database["public"]["Enums"]["app_invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_members: {
        Row: {
          application_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_members_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_metadata: {
        Row: {
          application_id: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "application_metadata_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_settings: {
        Row: {
          accent_color: string
          allowed_domains: string[]
          application_id: string
          banner_url: string | null
          created_at: string
          force_https: boolean
          hwid_lock: boolean
          ip_allowlist: string[]
          ip_blocklist: string[]
          maintenance_message: string | null
          rate_limit_per_minute: number
          require_2fa: boolean
          session_timeout_minutes: number
          support_email: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          allowed_domains?: string[]
          application_id: string
          banner_url?: string | null
          created_at?: string
          force_https?: boolean
          hwid_lock?: boolean
          ip_allowlist?: string[]
          ip_blocklist?: string[]
          maintenance_message?: string | null
          rate_limit_per_minute?: number
          require_2fa?: boolean
          session_timeout_minutes?: number
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          allowed_domains?: string[]
          application_id?: string
          banner_url?: string | null
          created_at?: string
          force_https?: boolean
          hwid_lock?: boolean
          ip_allowlist?: string[]
          ip_blocklist?: string[]
          maintenance_message?: string | null
          rate_limit_per_minute?: number
          require_2fa?: boolean
          session_timeout_minutes?: number
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_settings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_variables: {
        Row: {
          application_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_encrypted: boolean
          is_public: boolean
          key: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          application_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean
          is_public?: boolean
          key: string
          name: string
          updated_at?: string
          value?: string
        }
        Update: {
          application_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean
          is_public?: boolean
          key?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_variables_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_versions: {
        Row: {
          application_id: string
          channel: Database["public"]["Enums"]["app_version_channel"]
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          is_minimum: boolean
          release_notes: string | null
          released_at: string
          updated_at: string
          version: string
        }
        Insert: {
          application_id: string
          channel?: Database["public"]["Enums"]["app_version_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          is_minimum?: boolean
          release_notes?: string | null
          released_at?: string
          updated_at?: string
          version: string
        }
        Update: {
          application_id?: string
          channel?: Database["public"]["Enums"]["app_version_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          is_minimum?: boolean
          release_notes?: string | null
          released_at?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_versions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          category: string
          created_at: string
          current_version: string
          description: string | null
          environment: Database["public"]["Enums"]["app_environment"]
          id: string
          internal_name: string
          logo_url: string | null
          minimum_version: string
          name: string
          owner_id: string
          public_key: string
          secret_key: string
          status: Database["public"]["Enums"]["app_status"]
          tags: string[]
          updated_at: string
          visibility: Database["public"]["Enums"]["app_visibility"]
        }
        Insert: {
          category?: string
          created_at?: string
          current_version?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["app_environment"]
          id?: string
          internal_name: string
          logo_url?: string | null
          minimum_version?: string
          name: string
          owner_id: string
          public_key?: string
          secret_key?: string
          status?: Database["public"]["Enums"]["app_status"]
          tags?: string[]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["app_visibility"]
        }
        Update: {
          category?: string
          created_at?: string
          current_version?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["app_environment"]
          id?: string
          internal_name?: string
          logo_url?: string | null
          minimum_version?: string
          name?: string
          owner_id?: string
          public_key?: string
          secret_key?: string
          status?: Database["public"]["Enums"]["app_status"]
          tags?: string[]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["app_visibility"]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          description: string | null
          event: string
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      authentication_logs: {
        Row: {
          app_user_id: string | null
          application_id: string
          created_at: string
          hwid: string | null
          id: string
          ip_address: string | null
          kind: Database["public"]["Enums"]["auth_log_kind"]
          license_id: string | null
          message: string | null
          metadata: Json
          success: boolean
          user_agent: string | null
        }
        Insert: {
          app_user_id?: string | null
          application_id: string
          created_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          kind: Database["public"]["Enums"]["auth_log_kind"]
          license_id?: string | null
          message?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          app_user_id?: string | null
          application_id?: string
          created_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          kind?: Database["public"]["Enums"]["auth_log_kind"]
          license_id?: string | null
          message?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authentication_logs_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authentication_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authentication_logs_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_preferences: {
        Row: {
          created_at: string
          default_language: string
          default_sdk: string
          docs_density: string
          explorer_include_signature: boolean
          explorer_pretty_json: boolean
          notify_breaking_changes: boolean
          notify_sdk_releases: boolean
          notify_webhook_failures: boolean
          show_beta_docs: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_language?: string
          default_sdk?: string
          docs_density?: string
          explorer_include_signature?: boolean
          explorer_pretty_json?: boolean
          notify_breaking_changes?: boolean
          notify_sdk_releases?: boolean
          notify_webhook_failures?: boolean
          show_beta_docs?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_language?: string
          default_sdk?: string
          docs_density?: string
          explorer_include_signature?: boolean
          explorer_pretty_json?: boolean
          notify_breaking_changes?: boolean
          notify_sdk_releases?: boolean
          notify_webhook_failures?: boolean
          show_beta_docs?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      license_activations: {
        Row: {
          activated_at: string
          app_user_id: string | null
          application_id: string
          created_at: string
          hwid: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          license_id: string
          user_agent: string | null
        }
        Insert: {
          activated_at?: string
          app_user_id?: string | null
          application_id: string
          created_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          license_id: string
          user_agent?: string | null
        }
        Update: {
          activated_at?: string
          app_user_id?: string | null
          application_id?: string
          created_at?: string
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          license_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_activations_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_activations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_activations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_variables: {
        Row: {
          application_id: string
          created_at: string
          id: string
          is_public: boolean
          key: string
          license_id: string
          updated_at: string
          value: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          key: string
          license_id: string
          updated_at?: string
          value: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          key?: string
          license_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_variables_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_variables_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activated_at: string | null
          app_user_id: string | null
          application_id: string
          created_at: string
          created_by: string | null
          current_activations: number
          duration_days: number | null
          expires_at: string | null
          hwid_lock: boolean
          id: string
          license_key: string
          max_activations: number
          notes: string | null
          owner_label: string | null
          status: Database["public"]["Enums"]["license_status"]
          subscription_id: string | null
          tags: string[]
          updated_at: string
          variables: Json
        }
        Insert: {
          activated_at?: string | null
          app_user_id?: string | null
          application_id: string
          created_at?: string
          created_by?: string | null
          current_activations?: number
          duration_days?: number | null
          expires_at?: string | null
          hwid_lock?: boolean
          id?: string
          license_key: string
          max_activations?: number
          notes?: string | null
          owner_label?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          subscription_id?: string | null
          tags?: string[]
          updated_at?: string
          variables?: Json
        }
        Update: {
          activated_at?: string | null
          app_user_id?: string | null
          application_id?: string
          created_at?: string
          created_by?: string | null
          current_activations?: number
          duration_days?: number | null
          expires_at?: string | null
          hwid_lock?: boolean
          id?: string
          license_key?: string
          max_activations?: number
          notes?: string | null
          owner_label?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          subscription_id?: string | null
          tags?: string[]
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "licenses_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          timezone: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration_days: number | null
          features: string[]
          id: string
          name: string
          price_cents: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          features?: string[]
          id?: string
          name: string
          price_cents?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          features?: string[]
          id?: string
          name?: string
          price_cents?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_application_state: {
        Row: {
          application_id: string
          created_at: string
          is_favorite: boolean
          is_pinned: boolean
          last_opened_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          is_favorite?: boolean
          is_pinned?: boolean
          last_opened_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          is_favorite?: boolean
          is_pinned?: boolean
          last_opened_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_application_state_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          marketing_emails: boolean
          product_emails: boolean
          security_emails: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          marketing_emails?: boolean
          product_emails?: boolean
          security_emails?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          marketing_emails?: boolean
          product_emails?: boolean
          security_emails?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          application_id: string
          attempts: number
          created_at: string
          error: string | null
          event: Database["public"]["Enums"]["webhook_event"]
          id: string
          next_retry_at: string | null
          payload: Json
          response_status: number | null
          status: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id: string
        }
        Insert: {
          application_id: string
          attempts?: number
          created_at?: string
          error?: string | null
          event: Database["public"]["Enums"]["webhook_event"]
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_status?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id: string
        }
        Update: {
          application_id?: string
          attempts?: number
          created_at?: string
          error?: string | null
          event?: Database["public"]["Enums"]["webhook_event"]
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_status?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          events: Database["public"]["Enums"]["webhook_event"][]
          id: string
          is_active: boolean
          name: string
          signing_secret: string
          updated_at: string
          url: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          name: string
          signing_secret: string
          updated_at?: string
          url: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          name?: string
          signing_secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_role_of: {
        Args: { _application_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_member_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      is_app_developer: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      is_app_member: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      is_app_owner: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_download_kind:
        | "executable"
        | "zip"
        | "dll"
        | "installer"
        | "documentation"
        | "other"
      app_environment: "development" | "staging" | "production"
      app_invitation_status: "pending" | "accepted" | "revoked" | "expired"
      app_member_role:
        | "owner"
        | "administrator"
        | "developer"
        | "support"
        | "viewer"
      app_role: "admin" | "moderator" | "user"
      app_status: "active" | "paused" | "maintenance" | "archived"
      app_user_status: "active" | "banned" | "suspended"
      app_version_channel: "stable" | "beta" | "alpha" | "deprecated"
      app_visibility: "private" | "internal" | "public"
      auth_log_kind:
        | "init"
        | "register"
        | "login"
        | "logout"
        | "validate"
        | "activate"
        | "session"
        | "heartbeat"
        | "variable"
        | "version"
        | "download"
        | "error"
        | "log"
      license_status: "unused" | "active" | "expired" | "suspended" | "banned"
      subscription_status: "active" | "paused" | "archived"
      webhook_delivery_status: "pending" | "success" | "failed"
      webhook_event:
        | "application.created"
        | "license.created"
        | "license.activated"
        | "license.expired"
        | "license.banned"
        | "user.registered"
        | "user.login"
        | "subscription.updated"
        | "version.published"
        | "secret.rotated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_download_kind: [
        "executable",
        "zip",
        "dll",
        "installer",
        "documentation",
        "other",
      ],
      app_environment: ["development", "staging", "production"],
      app_invitation_status: ["pending", "accepted", "revoked", "expired"],
      app_member_role: [
        "owner",
        "administrator",
        "developer",
        "support",
        "viewer",
      ],
      app_role: ["admin", "moderator", "user"],
      app_status: ["active", "paused", "maintenance", "archived"],
      app_user_status: ["active", "banned", "suspended"],
      app_version_channel: ["stable", "beta", "alpha", "deprecated"],
      app_visibility: ["private", "internal", "public"],
      auth_log_kind: [
        "init",
        "register",
        "login",
        "logout",
        "validate",
        "activate",
        "session",
        "heartbeat",
        "variable",
        "version",
        "download",
        "error",
        "log",
      ],
      license_status: ["unused", "active", "expired", "suspended", "banned"],
      subscription_status: ["active", "paused", "archived"],
      webhook_delivery_status: ["pending", "success", "failed"],
      webhook_event: [
        "application.created",
        "license.created",
        "license.activated",
        "license.expired",
        "license.banned",
        "user.registered",
        "user.login",
        "subscription.updated",
        "version.published",
        "secret.rotated",
      ],
    },
  },
} as const

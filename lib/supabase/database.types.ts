/**
 * Supabase `Database` type for `@supabase/supabase-js` clients.
 *
 * **Do not hand-edit column names to guess the remote schema.** Regenerate this file
 * whenever `public.*` tables change in Supabase:
 *
 * ```bash
 * npx supabase gen types typescript --project-id "<project-ref>" --schema public > lib/supabase/database.types.ts
 * ```
 *
 * Or, with the CLI and a linked project:
 *
 * ```bash
 * npx supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts
 * ```
 *
 * The committed version is expected to match the DDL in `supabase/migrations/`
 * (e.g. `public.messages`, `public.notifications`, `video_owner_id` from
 * `20260402220000_notifications.sql`, `goalnova_set_self_premium` from
 * `20260402240000_goalnova_set_self_premium_rpc.sql`,
 * `20260402250000_videos_select_public_explore.sql`, `20260405100000_challenges.sql`,
 * `20260405120000_ai_analyses_public_challenge_videos.sql`,
 * `20260416200000_scout_verification.sql`, `20260407140000_challenges_admin_fields_rls.sql`,
 * and follow-ups) until you replace it with CLI output.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          role: string | null;
          language_preference: string;
          is_premium: boolean;
          scout_verification_status: string;
          scout_apply_full_name: string | null;
          scout_apply_organization: string | null;
          scout_apply_business_email: string | null;
          scout_apply_country: string | null;
          scout_apply_description: string | null;
          scout_apply_web_url: string | null;
          scout_apply_submitted_at: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
          is_admin?: boolean;
          admin_role?: string | null;
          is_suspended?: boolean;
          is_deleted?: boolean;
          avatar_url?: string | null;
        };
        Insert: {
          id: string;
          email: string | null;
          role?: string | null;
          language_preference: string;
          is_premium?: boolean;
          is_admin?: boolean;
          admin_role?: string | null;
          is_suspended?: boolean;
          is_deleted?: boolean;
          scout_verification_status?: string;
          scout_apply_full_name?: string | null;
          scout_apply_organization?: string | null;
          scout_apply_business_email?: string | null;
          scout_apply_country?: string | null;
          scout_apply_description?: string | null;
          scout_apply_web_url?: string | null;
          scout_apply_submitted_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: string;
          language_preference?: string;
          is_premium?: boolean;
          avatar_url?: string | null;
          scout_verification_status?: string;
          scout_apply_full_name?: string | null;
          scout_apply_organization?: string | null;
          scout_apply_business_email?: string | null;
          scout_apply_country?: string | null;
          scout_apply_description?: string | null;
          scout_apply_web_url?: string | null;
          scout_apply_submitted_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
          is_admin?: boolean;
          admin_role?: string | null;
          is_suspended?: boolean;
          is_deleted?: boolean;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string | null;
          subject: string;
          message: string;
          category: string;
          ticket_type: string;
          account_email: string | null;
          contact_email: string | null;
          username: string | null;
          status: string;
          priority: string;
          assigned_admin_id: string | null;
          internal_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          subject: string;
          message: string;
          category?: string;
          ticket_type?: string;
          account_email?: string | null;
          contact_email?: string | null;
          username?: string | null;
          status?: string;
          priority?: string;
          assigned_admin_id?: string | null;
          internal_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          subject?: string;
          message?: string;
          category?: string;
          ticket_type?: string;
          account_email?: string | null;
          contact_email?: string | null;
          username?: string | null;
          status?: string;
          priority?: string;
          assigned_admin_id?: string | null;
          internal_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_recovery_requests: {
        Row: {
          id: string;
          account_email: string;
          contact_email: string;
          username: string | null;
          message: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_email: string;
          contact_email: string;
          username?: string | null;
          message: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_email?: string;
          contact_email?: string;
          username?: string | null;
          message?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_user_id: string | null;
          sender_admin_id: string | null;
          message: string;
          read_by_user_at: string | null;
          read_by_admin_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_user_id?: string | null;
          sender_admin_id?: string | null;
          message: string;
          read_by_user_at?: string | null;
          read_by_admin_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          sender_user_id?: string | null;
          sender_admin_id?: string | null;
          message?: string;
          read_by_user_at?: string | null;
          read_by_admin_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      moderation_reports: {
        Row: {
          id: string;
          reporter_user_id: string | null;
          target_type: string;
          target_id: string;
          reason: string | null;
          status: string;
          assigned_admin_id: string | null;
          resolution_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_user_id?: string | null;
          target_type: string;
          target_id: string;
          reason?: string | null;
          status?: string;
          assigned_admin_id?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_user_id?: string | null;
          target_type?: string;
          target_id?: string;
          reason?: string | null;
          status?: string;
          assigned_admin_id?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_user_id: string;
          target_user_id: string | null;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          target_user_id?: string | null;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string;
          target_user_id?: string | null;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      player_profiles: {
        Row: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          age?: number | null;
          bio?: string | null;
          position?: string | null;
          preferred_foot?: string | null;
          height?: number | null;
          weight?: number | null;
          city?: string | null;
          country?: string | null;
          club?: string | null;
          avatar_url?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          profile_completeness?: number | null;
          ai_overall_score?: number | null;
          is_available_for_trials?: boolean | null;
          is_looking_for_club?: boolean | null;
          achievements?: string[] | null;
          career_history?: Json | null;
          profile_highlight?: string | null;
          created_at?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          featured_player_until?: string | null;
          founding_player?: boolean | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          age?: number | null;
          bio?: string | null;
          position?: string | null;
          preferred_foot?: string | null;
          height?: number | null;
          weight?: number | null;
          city?: string | null;
          country?: string | null;
          club?: string | null;
          avatar_url?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          profile_completeness?: number | null;
          ai_overall_score?: number | null;
          is_available_for_trials?: boolean | null;
          is_looking_for_club?: boolean | null;
          achievements?: string[] | null;
          career_history?: Json | null;
          profile_highlight?: string | null;
          created_at?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          featured_player_until?: string | null;
          founding_player?: boolean | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          username?: string | null;
          age?: number | null;
          bio?: string | null;
          position?: string | null;
          preferred_foot?: string | null;
          height?: number | null;
          weight?: number | null;
          city?: string | null;
          country?: string | null;
          club?: string | null;
          avatar_url?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          profile_completeness?: number | null;
          ai_overall_score?: number | null;
          is_available_for_trials?: boolean | null;
          is_looking_for_club?: boolean | null;
          achievements?: string[] | null;
          career_history?: Json | null;
          profile_highlight?: string | null;
          created_at?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          featured_player_until?: string | null;
          founding_player?: boolean | null;
        };
        Relationships: [];
      };
      player_referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referred_user_id: string;
          referral_code: string;
          status: string;
          reward_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_user_id: string;
          referred_user_id: string;
          referral_code: string;
          status?: string;
          reward_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_user_id?: string;
          referred_user_id?: string;
          referral_code?: string;
          status?: string;
          reward_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      player_referral_reward_grants: {
        Row: {
          user_id: string;
          reward_key: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          reward_key: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          reward_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      scout_profiles: {
        Row: {
          id: string;
          bio?: string | null;
          organization?: string | null;
          role?: string | null;
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id: string;
          bio?: string | null;
          organization?: string | null;
          role?: string | null;
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          bio?: string | null;
          organization?: string | null;
          role?: string | null;
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      scout_saved_players: {
        Row: {
          scout_user_id: string;
          player_user_id: string;
          created_at: string;
        };
        Insert: {
          scout_user_id: string;
          player_user_id: string;
          created_at?: string;
        };
        Update: {
          scout_user_id?: string;
          player_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      scout_verification_applications: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          organization: string;
          business_email: string;
          country: string;
          description: string | null;
          web_url: string | null;
          status: string | null;
          created_at: string | null;
          proof_document_url: string | null;
          proof_document_name: string | null;
          proof_document_type: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          organization: string;
          business_email: string;
          country: string;
          description?: string | null;
          web_url?: string | null;
          status?: string | null;
          created_at?: string | null;
          proof_document_url?: string | null;
          proof_document_name?: string | null;
          proof_document_type?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          organization?: string;
          business_email?: string;
          country?: string;
          description?: string | null;
          web_url?: string | null;
          status?: string | null;
          created_at?: string | null;
          proof_document_url?: string | null;
          proof_document_name?: string | null;
          proof_document_type?: string | null;
        };
        Relationships: [];
      };
      /** `20260604120000_weekly_challenges_admin_foundation.sql` — admin-only until public UI ships. */
      weekly_challenges: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          rules: string | null;
          equipment: string | null;
          reward_xp: number;
          badge_name: string | null;
          max_video_duration_seconds: number | null;
          free_attempts: number;
          premium_attempts: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          is_public: boolean;
          translations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          rules?: string | null;
          equipment?: string | null;
          reward_xp?: number;
          badge_name?: string | null;
          max_video_duration_seconds?: number | null;
          free_attempts?: number;
          premium_attempts?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          is_public?: boolean;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          rules?: string | null;
          equipment?: string | null;
          reward_xp?: number;
          badge_name?: string | null;
          max_video_duration_seconds?: number | null;
          free_attempts?: number;
          premium_attempts?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          is_public?: boolean;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** `20260605120000_weekly_challenge_submissions_phase2.sql` */
      weekly_challenge_submissions: {
        Row: {
          id: string;
          challenge_id: string;
          player_id: string;
          video_id: string | null;
          score: number | null;
          rank: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          player_id: string;
          video_id?: string | null;
          score?: number | null;
          rank?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          player_id?: string;
          video_id?: string | null;
          score?: number | null;
          rank?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weekly_challenge_badges: {
        Row: {
          id: string;
          weekly_challenge_id: string;
          user_id: string;
          badge_name: string;
          earned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          weekly_challenge_id: string;
          user_id: string;
          badge_name: string;
          earned_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          weekly_challenge_id?: string;
          user_id?: string;
          badge_name?: string;
          earned_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      /** Matches `public.challenges` incl. admin fields (see `20260407140000_challenges_admin_fields_rls.sql`). */
      challenges: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          instructions: string | null;
          max_video_duration_seconds: number | null;
          equipment: Json | null;
          rules_json: Json | null;
          scoring: Json | null;
          badge: string | null;
          translations: Json | null;
          rules: string | null;
          reward: string | null;
          reward_title: string | null;
          reward_detail: string | null;
          reward_type: string | null;
          reward_image_url: string | null;
          expires_at: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          instructions?: string | null;
          max_video_duration_seconds?: number | null;
          equipment?: Json | null;
          rules_json?: Json | null;
          scoring?: Json | null;
          badge?: string | null;
          translations?: Json | null;
          rules?: string | null;
          reward?: string | null;
          reward_title?: string | null;
          reward_detail?: string | null;
          reward_type?: string | null;
          reward_image_url?: string | null;
          expires_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          max_video_duration_seconds?: number | null;
          equipment?: Json | null;
          rules_json?: Json | null;
          scoring?: Json | null;
          badge?: string | null;
          translations?: Json | null;
          rules?: string | null;
          reward?: string | null;
          reward_title?: string | null;
          reward_detail?: string | null;
          reward_type?: string | null;
          reward_image_url?: string | null;
          expires_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_winners: {
        Row: {
          id: string;
          challenge_id: string;
          video_id: string;
          rank: number;
          placement_source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          video_id: string;
          rank: number;
          placement_source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          video_id?: string;
          rank?: number;
          placement_source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      friend_challenges: {
        Row: {
          id: string;
          challenger_id: string;
          opponent_id: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenger_id: string;
          opponent_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenger_id?: string;
          opponent_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_scores: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          xp: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          xp?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          xp?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          category: string;
          question_text: Json;
          options: Json;
          correct_option_index: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          question_text: Json;
          options: Json;
          correct_option_index: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          question_text?: Json;
          options?: Json;
          correct_option_index?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_user_answers: {
        Row: {
          id: string;
          user_id: string;
          quiz_date: string;
          question_id: string;
          selected_option_index: number;
          is_correct: boolean;
          xp_awarded: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_date: string;
          question_id: string;
          selected_option_index: number;
          is_correct: boolean;
          xp_awarded?: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_date?: string;
          question_id?: string;
          selected_option_index?: number;
          is_correct?: boolean;
          xp_awarded?: number;
          answered_at?: string;
        };
        Relationships: [];
      };
      challenge_entries: {
        Row: {
          id: string;
          challenge_id: string;
          video_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          video_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          video_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          id?: string;
          user_id: string;
          video_url: string;
          source_video_url: string | null;
          processed_video_url: string | null;
          caption: string | null;
          skill_type: string | null;
          city: string | null;
          country: string | null;
          challenge_id: string | null;
          selected_music_track_id: string | null;
          music_start_seconds: number;
          music_end_seconds: number | null;
          music_volume: number;
          thumbnail_url?: string | null;
          poster_url?: string | null;
          is_featured?: boolean | null;
          views_count?: number | null;
          visibility_boost?: number | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_url: string;
          source_video_url?: string | null;
          processed_video_url?: string | null;
          caption?: string | null;
          skill_type?: string | null;
          city?: string | null;
          country?: string | null;
          challenge_id?: string | null;
          selected_music_track_id?: string | null;
          music_start_seconds?: number;
          music_end_seconds?: number | null;
          music_volume?: number;
          thumbnail_url?: string | null;
          poster_url?: string | null;
          is_featured?: boolean | null;
          views_count?: number | null;
          visibility_boost?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_url?: string;
          source_video_url?: string | null;
          processed_video_url?: string | null;
          caption?: string | null;
          skill_type?: string | null;
          city?: string | null;
          country?: string | null;
          challenge_id?: string | null;
          selected_music_track_id?: string | null;
          music_start_seconds?: number;
          music_end_seconds?: number | null;
          music_volume?: number;
          thumbnail_url?: string | null;
          poster_url?: string | null;
          is_featured?: boolean | null;
          views_count?: number | null;
          visibility_boost?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          content: string;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          content: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          content?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message: string;
          created_at: string;
          deleted_for_sender: boolean;
          deleted_for_recipient: boolean;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          message: string;
          created_at?: string;
          deleted_for_sender?: boolean;
          deleted_for_recipient?: boolean;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          message?: string;
          created_at?: string;
          deleted_for_sender?: boolean;
          deleted_for_recipient?: boolean;
        };
        Relationships: [];
      };
      scout_ai_insight_events: {
        Row: {
          id: string;
          scout_id: string;
          video_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          scout_id: string;
          video_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          scout_id?: string;
          video_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_analyses: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          speed: number | null;
          technique: number | null;
          decision_making: number | null;
          agility: number | null;
          shot_power: number | null;
          overall_score: number;
          feedback_text: string;
          visibility_analysis: Json | null;
          valid_for_football_analysis: boolean;
          clip_type: string | null;
          invalid_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          speed?: number | null;
          technique?: number | null;
          decision_making?: number | null;
          agility?: number | null;
          shot_power?: number | null;
          overall_score: number;
          feedback_text: string;
          visibility_analysis?: Json | null;
          valid_for_football_analysis?: boolean;
          clip_type?: string | null;
          invalid_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          speed?: number | null;
          technique?: number | null;
          decision_making?: number | null;
          agility?: number | null;
          shot_power?: number | null;
          overall_score?: number;
          feedback_text?: string;
          visibility_analysis?: Json | null;
          valid_for_football_analysis?: boolean;
          clip_type?: string | null;
          invalid_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      music_tracks: {
        Row: {
          id: string;
          title: string;
          artist: string;
          genre: string | null;
          mood: string | null;
          duration_seconds: number;
          audio_url: string;
          cover_image_url: string | null;
          license_type: string;
          provider: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist?: string;
          genre?: string | null;
          mood?: string | null;
          duration_seconds?: number;
          audio_url: string;
          cover_image_url?: string | null;
          license_type?: string;
          provider?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          genre?: string | null;
          mood?: string | null;
          duration_seconds?: number;
          audio_url?: string;
          cover_image_url?: string | null;
          license_type?: string;
          provider?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          related_user_id: string;
          related_video_id: string | null;
          related_challenge_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          message: string;
          related_user_id: string;
          related_video_id?: string | null;
          related_challenge_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          message?: string;
          related_user_id?: string;
          related_video_id?: string | null;
          related_challenge_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      video_owner_id: {
        Args: { p_video_id: string };
        Returns: string | null;
      };
      goalnova_set_self_premium: {
        Args: { p_is_premium: boolean };
        Returns: null;
      };
      goalnova_public_player_profile_gamification: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      goalnova_public_player_profile_row: {
        Args: { p_user_id: string };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
        }[];
      };
      goalnova_public_player_profile_by_username: {
        Args: { p_username: string };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
        }[];
      };
      goalnova_public_player_profiles_by_ids: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
        }[];
      };
      goalnova_public_player_profiles_search: {
        Args: {
          p_q?: string | null;
          p_position?: string | null;
          p_country?: string | null;
          p_city?: string | null;
          p_age_min?: number | null;
          p_age_max?: number | null;
          p_preferred_foot?: string | null;
          p_club?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
        }[];
      };
      goalnova_public_player_profiles_discover: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
        }[];
      };
      goalnova_public_ai_scores_for_videos: {
        Args: { p_video_ids: string[] };
        Returns: {
          video_id: string;
          overall_score: number | null;
          created_at: string | null;
          valid_for_football_analysis: boolean | null;
        }[];
      };
      goalnova_public_top_rated_ai_videos: {
        Args: { p_limit?: number };
        Returns: {
          video_id: string;
          overall_score: number | null;
          created_at: string | null;
          valid_for_football_analysis: boolean | null;
        }[];
      };
      goalnova_public_follow_counts: {
        Args: { p_user_id: string };
        Returns: {
          followers_count: number;
          following_count: number;
        }[];
      };
      goalnova_scout_player_profiles_by_ids: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          city: string | null;
          country: string | null;
          club: string | null;
          avatar_url: string | null;
          profile_completeness: number | null;
          ai_overall_score: number | null;
          is_available_for_trials: boolean | null;
          is_looking_for_club: boolean | null;
          achievements: string[] | null;
          career_history: Json | null;
          profile_highlight: string | null;
          created_at: string | null;
          featured_player_until: string | null;
          founding_player: boolean | null;
          is_player_premium: boolean | null;
        }[];
      };
      get_scout_profile_display_names: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          organization: string | null;
          avatar_url: string | null;
          display_name: string | null;
          verification_status: string;
        }[];
      };
      get_my_scout_access: {
        Args: Record<string, never>;
        Returns: {
          role: string;
          scout_verification_status: string;
        }[];
      };
      get_scout_verification_flags: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          role: string;
          scout_verification_status: string;
        }[];
      };
      submit_scout_verification_application: {
        Args: {
          p_business_email: string;
          p_country: string;
          p_description: string;
          p_full_name: string;
          p_organization: string;
          p_web_url: string | null;
          p_proof_document_url: string;
          p_proof_document_name: string;
          p_proof_document_type: string;
        };
        Returns: Database["public"]["Tables"]["scout_verification_applications"]["Row"];
      };
      admin_review_scout_verification: {
        Args: { p_subject_user_id: string; p_action: string };
        Returns: Json;
      };
      scout_discovery_feed: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_position?: string | null;
          p_country?: string | null;
          p_city?: string | null;
          p_age_min?: number | null;
          p_age_max?: number | null;
          p_sort?: string;
        };
        Returns: {
          video_id: string;
          user_id: string;
          video_url: string;
          processed_video_url: string | null;
          source_video_url: string | null;
          caption: string | null;
          skill_type: string | null;
          video_city: string | null;
          video_country: string | null;
          challenge_id: string | null;
          video_created_at: string;
          full_name: string | null;
          username: string | null;
          age: number | null;
          bio: string | null;
          player_position: string | null;
          preferred_foot: string | null;
          height: number | null;
          weight: number | null;
          profile_city: string | null;
          profile_country: string | null;
          club: string | null;
          likes_count: number;
          comments_count: number;
          ai_overall_score: number | null;
          profile_completeness: number;
        }[];
      };
      goalnova_staff_effective_role: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      goalnova_consume_scout_ai_preview: {
        Args: { p_video_id: string; p_for_run?: boolean };
        Returns: Json;
      };
      goalnova_hide_message_for_me: {
        Args: { p_message_id: string };
        Returns: boolean;
      };
      goalnova_delete_notification_for_me: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      goalnova_notify_players_about_challenge: {
        Args: { p_challenge_id: string };
        Returns: Json;
      };
      goalnova_player_referral_dashboard: {
        Args: Record<string, never>;
        Returns: Json;
      };
      goalnova_player_complete_referral: {
        Args: { p_referral_code: string };
        Returns: Json;
      };
      goalnova_player_ensure_referral_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      goalnova_admin_list_users: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_search?: string | null;
        };
        Returns: {
          id: string;
          email: string | null;
          role: string;
          admin_role: string | null;
          is_premium: boolean;
          scout_verification_status: string;
          is_suspended: boolean;
          is_deleted: boolean;
          created_at: string | null;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[];
      };
      goalnova_admin_get_user_detail: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      goalnova_admin_set_suspended: {
        Args: { p_user_id: string; p_suspended: boolean };
        Returns: Json;
      };
      goalnova_admin_set_deleted: {
        Args: { p_user_id: string; p_deleted: boolean };
        Returns: Json;
      };
      goalnova_admin_send_user_notice: {
        Args: {
          p_user_id: string;
          p_notice_type: string;
          p_message: string;
          p_locale?: string | null;
        };
        Returns: Json;
      };
      goalnova_grant_welcome_premium_trial: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      goalnova_send_welcome_inbox_message: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      goalnova_admin_get_platform_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      goalnova_record_welcome_trial_email_if_used: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      goalnova_admin_set_premium: {
        Args: { p_user_id: string; p_premium: boolean };
        Returns: Json;
      };
      goalnova_admin_set_founding_player: {
        Args: { p_user_id: string; p_enabled: boolean };
        Returns: Json;
      };
      goalnova_admin_set_scout_verification_status: {
        Args: { p_user_id: string; p_status: string };
        Returns: Json;
      };
      goalnova_admin_set_staff_role: {
        Args: { p_user_id: string; p_admin_role?: string | null };
        Returns: Json;
      };
      goalnova_admin_set_app_role: {
        Args: { p_user_id: string; p_role: string };
        Returns: Json;
      };
      goalnova_admin_merge_player_profile: {
        Args: { p_user_id: string; p_patch: Json };
        Returns: Json;
      };
      goalnova_admin_merge_scout_profile: {
        Args: { p_user_id: string; p_patch: Json };
        Returns: Json;
      };
      goalnova_admin_merge_scout_apply_fields: {
        Args: { p_user_id: string; p_patch: Json };
        Returns: Json;
      };
      goalnova_create_support_ticket: {
        Args: { p_subject: string; p_message: string; p_category?: string };
        Returns: string;
      };
      goalnova_admin_list_support_tickets: {
        Args: {
          p_status?: string | null;
          p_assigned_to_me?: boolean;
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["support_tickets"]["Row"][];
      };
      goalnova_admin_update_support_ticket: {
        Args: {
          p_ticket_id: string;
          p_status?: string | null;
          p_priority?: string | null;
          p_assigned_admin_id?: string | null;
          p_internal_note?: string | null;
          p_clear_assignment?: boolean;
        };
        Returns: Json;
      };
      goalnova_admin_create_support_ticket_for_user: {
        Args: {
          p_user_id: string;
          p_subject: string;
          p_message: string;
          p_assigned_admin_id?: string | null;
          p_category?: string;
        };
        Returns: string;
      };
      goalnova_admin_list_support_ticket_messages: {
        Args: { p_ticket_id: string };
        Returns: Database["public"]["Tables"]["support_ticket_messages"]["Row"][];
      };
      goalnova_admin_reply_support_ticket: {
        Args: { p_ticket_id: string; p_message: string };
        Returns: string;
      };
      goalnova_quiz_get_today: {
        Args: { p_locale?: string };
        Returns: Json;
      };
      goalnova_quiz_submit_answer: {
        Args: { p_selected_option_index: number; p_locale?: string };
        Returns: Json;
      };
      goalnova_quiz_weekly_leaderboard: {
        Args: { p_locale?: string; p_limit?: number };
        Returns: {
          rank: number;
          user_id: string;
          display_name: string;
          username: string;
          country: string | null;
          weekly_xp: number;
        }[];
      };
      goalnova_quiz_monthly_leaderboard: {
        Args: { p_locale?: string; p_limit?: number };
        Returns: {
          rank: number;
          user_id: string;
          display_name: string;
          username: string;
          country: string | null;
          monthly_xp: number;
        }[];
      };
      goalnova_clubs_list_public: {
        Args: { p_search?: string | null; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          cover_url: string | null;
          country: string | null;
          city: string | null;
          club_code: string;
          verified_partner: boolean;
          partnership_status: string;
          approved_player_count: number;
          total_xp: number;
          total_videos: number;
          club_score: number;
          global_rank: number | null;
        }[];
      };
      goalnova_club_rankings_public: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          cover_url: string | null;
          country: string | null;
          city: string | null;
          club_code: string;
          verified_partner: boolean;
          partnership_status: string;
          approved_player_count: number;
          total_xp: number;
          total_videos: number;
          club_score: number;
          global_rank: number | null;
        }[];
      };
      goalnova_club_get_public: {
        Args: { p_slug: string };
        Returns: Json;
      };
      goalnova_player_club_badge: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      goalnova_club_join: {
        Args: { p_club_id?: string | null; p_club_code?: string | null };
        Returns: Json;
      };
      goalnova_club_review_membership: {
        Args: { p_membership_id: string; p_approve: boolean };
        Returns: Json;
      };
      goalnova_club_accept_partnership_agreement: {
        Args: { p_club_id: string };
        Returns: Json;
      };
      goalnova_club_dashboard: {
        Args: { p_club_id: string };
        Returns: Json;
      };
      goalnova_club_submit_partnership_request: {
        Args: {
          p_club_name: string;
          p_country: string;
          p_contact_person: string;
          p_email: string;
          p_instagram?: string | null;
          p_website?: string | null;
          p_estimated_players?: number | null;
          p_message?: string | null;
        };
        Returns: Json;
      };
      goalnova_admin_clubs_list: {
        Args: Record<string, never>;
        Returns: Json;
      };
      goalnova_admin_club_requests_list: {
        Args: Record<string, never>;
        Returns: Json;
      };
      goalnova_admin_club_approve_request: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      goalnova_admin_club_set_status: {
        Args: { p_club_id: string; p_status: string };
        Returns: Json;
      };
      goalnova_admin_club_delete: {
        Args: { p_club_id: string };
        Returns: Json;
      };
      goalnova_friend_challenge_create: {
        Args: Record<string, never>;
        Returns: Json;
      };
      goalnova_friend_challenge_accept: {
        Args: { p_challenge_id: string };
        Returns: Json;
      };
      goalnova_friend_challenge_get: {
        Args: { p_challenge_id: string };
        Returns: Json;
      };
      goalnova_friend_challenge_list_mine: {
        Args: { p_limit?: number };
        Returns: Json;
      };
      goalnova_admin_delete_video: {
        Args: { p_video_id: string };
        Returns: Json;
      };
      goalnova_admin_delete_comment: {
        Args: { p_comment_id: string };
        Returns: Json;
      };
      goalnova_admin_list_moderation_reports: {
        Args: { p_status?: string; p_limit?: number };
        Returns: Database["public"]["Tables"]["moderation_reports"]["Row"][];
      };
      goalnova_admin_update_moderation_report: {
        Args: {
          p_report_id: string;
          p_status: string;
          p_assigned_admin_id?: string | null;
          p_resolution_note?: string | null;
        };
        Returns: Json;
      };
      goalnova_admin_list_audit_log: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["admin_audit_log"]["Row"][];
      };
      goalnova_admin_list_staff_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          admin_role: string | null;
        }[];
      };
      goalnova_submit_account_recovery_request: {
        Args: {
          p_account_email: string;
          p_contact_email: string;
          p_username?: string | null;
          p_message?: string | null;
        };
        Returns: string;
      };
      pitchrusch_submit_account_recovery_request: {
        Args: {
          p_account_email: string;
          p_contact_email: string;
          p_username?: string | null;
          p_message?: string | null;
        };
        Returns: string;
      };
      goalnova_submit_account_recovery_ticket: {
        Args: {
          p_account_email: string;
          p_contact_email: string;
          p_message?: string | null;
          p_username?: string | null;
        };
        Returns: string;
      };
      pitchrusch_submit_account_recovery_ticket: {
        Args: {
          p_account_email: string;
          p_contact_email: string;
          p_message?: string | null;
          p_username?: string | null;
        };
        Returns: string;
      };
      goalnova_admin_list_account_recovery_requests: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["account_recovery_requests"]["Row"][];
      };
      goalnova_admin_resolve_account_recovery_request: {
        Args: { p_id: string };
        Returns: Json;
      };
    };
  };
};

export type PublicMessagesRow = Database["public"]["Tables"]["messages"]["Row"];
export type PublicMessagesInsert = Database["public"]["Tables"]["messages"]["Insert"];

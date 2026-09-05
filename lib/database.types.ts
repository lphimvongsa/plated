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
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
          preferred_measurement: string;
          preferred_dimension: string;
          timezone: string;
          cooking_skill_level: string;
          specialties: string[];
          onboarding_complete: boolean;
          notification_master: boolean;
          notify_rsvps: boolean;
          notify_collaborator_invites: boolean;
          notify_collaborator_accepts: boolean;
          retain_receipt_images: boolean;
          profile_discoverable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          preferred_measurement?: string;
          preferred_dimension?: string;
          timezone?: string;
          cooking_skill_level?: string;
          specialties?: string[];
          onboarding_complete?: boolean;
          notification_master?: boolean;
          notify_rsvps?: boolean;
          notify_collaborator_invites?: boolean;
          notify_collaborator_accepts?: boolean;
          retain_receipt_images?: boolean;
          profile_discoverable?: boolean;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          preferred_measurement?: string;
          preferred_dimension?: string;
          timezone?: string;
          cooking_skill_level?: string;
          specialties?: string[];
          onboarding_complete?: boolean;
          notification_master?: boolean;
          notify_rsvps?: boolean;
          notify_collaborator_invites?: boolean;
          notify_collaborator_accepts?: boolean;
          retain_receipt_images?: boolean;
          profile_discoverable?: boolean;
        };
        Relationships: [];
      };
      parties: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          prep_starts_at: string | null;
          location: string | null;
          timezone: string;
          theme: string | null;
          cuisine: string | null;
          service_style: string | null;
          dress_code: string | null;
          guest_contribution_notes: string | null;
          hero_image: string | null;
          color_scheme: string;
          cover_position: string;
          cover_crop: Json | null;
          invitation_headline: string | null;
          invitation_message: string | null;
          invitation_signoff: string | null;
          invitation_rsvp_label: string | null;
          invitation_photo_urls: string[];
          invitation_photo_positions: string[];
          invitation_photo_crops: Json;
          invitation_photo_slots: string[];
          invitation_menu_overrides: Json;
          invitation_draft: boolean;
          share_token: string;
          planning_guest_count: number;
          shopping_dirty: boolean;
          shopping_refresh_token: string | null;
          shopping_refresh_started_at: string | null;
          timeline_dirty: boolean;
          timeline_refresh_token: string | null;
          timeline_refresh_started_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          prep_starts_at?: string | null;
          location?: string | null;
          timezone?: string;
          theme?: string | null;
          cuisine?: string | null;
          service_style?: string | null;
          dress_code?: string | null;
          guest_contribution_notes?: string | null;
          hero_image?: string | null;
          color_scheme?: string;
          cover_position?: string;
          cover_crop?: Json | null;
          invitation_headline?: string | null;
          invitation_message?: string | null;
          invitation_signoff?: string | null;
          invitation_rsvp_label?: string | null;
          invitation_photo_urls?: string[];
          invitation_photo_positions?: string[];
          invitation_photo_crops?: Json;
          invitation_photo_slots?: string[];
          invitation_menu_overrides?: Json;
          invitation_draft?: boolean;
          share_token?: string;
          planning_guest_count?: number;
          shopping_dirty?: boolean;
          shopping_refresh_token?: string | null;
          shopping_refresh_started_at?: string | null;
          timeline_dirty?: boolean;
          timeline_refresh_token?: string | null;
          timeline_refresh_started_at?: string | null;
          status?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          prep_starts_at?: string | null;
          location?: string | null;
          timezone?: string;
          theme?: string | null;
          cuisine?: string | null;
          service_style?: string | null;
          dress_code?: string | null;
          guest_contribution_notes?: string | null;
          hero_image?: string | null;
          color_scheme?: string;
          cover_position?: string;
          cover_crop?: Json | null;
          invitation_headline?: string | null;
          invitation_message?: string | null;
          invitation_signoff?: string | null;
          invitation_rsvp_label?: string | null;
          invitation_photo_urls?: string[];
          invitation_photo_positions?: string[];
          invitation_photo_crops?: Json;
          invitation_photo_slots?: string[];
          invitation_menu_overrides?: Json;
          invitation_draft?: boolean;
          share_token?: string;
          planning_guest_count?: number;
          shopping_dirty?: boolean;
          shopping_refresh_token?: string | null;
          shopping_refresh_started_at?: string | null;
          timeline_dirty?: boolean;
          timeline_refresh_token?: string | null;
          timeline_refresh_started_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      party_helpers: {
        Row: {
          id: string;
          party_id: string;
          user_id: string | null;
          name: string;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          user_id?: string | null;
          name: string;
          color?: string;
          sort_order?: number;
        };
        Update: {
          user_id?: string | null;
          name?: string;
          color?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      party_members: {
        Row: {
          party_id: string;
          user_id: string;
          role: string;
          skill_level: string | null;
          specialties: string[];
          created_at: string;
        };
        Insert: {
          party_id: string;
          user_id: string;
          role?: string;
          skill_level?: string | null;
          specialties?: string[];
        };
        Update: {
          role?: string;
          skill_level?: string | null;
          specialties?: string[];
        };
        Relationships: [];
      };
      party_collaborator_invites: {
        Row: {
          id: string;
          party_id: string;
          email: string;
          role: string;
          token: string;
          invited_by: string;
          created_at: string;
          last_sent_at: string | null;
          accepted_at: string | null;
          accepted_user_id: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          party_id: string;
          email: string;
          role: string;
          token?: string;
          invited_by: string;
          last_sent_at?: string | null;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          email?: string;
          role?: string;
          token?: string;
          last_sent_at?: string | null;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          owner_id: string;
          party_id: string | null;
          cookbook_recipe_id: string | null;
          title: string;
          description: string | null;
          image_url: string | null;
          color_hex: string | null;
          cover_text_color: string;
          source_url: string | null;
          servings: number;
          prep_minutes: number | null;
          cook_minutes: number | null;
          total_minutes: number | null;
          course: string | null;
          cuisine: string | null;
          difficulty: string | null;
          tags: string[];
          dietary_tags: string[];
          allergy_tags: string[];
          instructions: string | null;
          equipment: string[];
          notes: string | null;
          allergy_notes: string | null;
          make_ahead_notes: string | null;
          storage_notes: string | null;
          reheating_notes: string | null;
          import_status: string;
          import_source_type: string | null;
          estimated_cost: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          party_id?: string | null;
          cookbook_recipe_id?: string | null;
          title: string;
          description?: string | null;
          image_url?: string | null;
          color_hex?: string | null;
          cover_text_color?: string;
          source_url?: string | null;
          servings?: number;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          total_minutes?: number | null;
          course?: string | null;
          cuisine?: string | null;
          difficulty?: string | null;
          tags?: string[];
          dietary_tags?: string[];
          allergy_tags?: string[];
          instructions?: string | null;
          equipment?: string[];
          notes?: string | null;
          allergy_notes?: string | null;
          make_ahead_notes?: string | null;
          storage_notes?: string | null;
          reheating_notes?: string | null;
          import_status?: string;
          import_source_type?: string | null;
          estimated_cost?: number | null;
          status?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          image_url?: string | null;
          color_hex?: string | null;
          cover_text_color?: string;
          source_url?: string | null;
          servings?: number;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          total_minutes?: number | null;
          course?: string | null;
          cuisine?: string | null;
          difficulty?: string | null;
          tags?: string[];
          dietary_tags?: string[];
          allergy_tags?: string[];
          instructions?: string | null;
          equipment?: string[];
          notes?: string | null;
          allergy_notes?: string | null;
          make_ahead_notes?: string | null;
          storage_notes?: string | null;
          reheating_notes?: string | null;
          import_status?: string;
          import_source_type?: string | null;
          estimated_cost?: number | null;
          status?: string;
          party_id?: string | null;
          cookbook_recipe_id?: string | null;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          quantity: number | null;
          unit: string | null;
          section: string | null;
          secondary_quantity: number | null;
          secondary_unit: string | null;
          preparation_note: string | null;
          category: string | null;
          allergen_tags: string[];
          pantry_flag: boolean;
          sort_order: number;
          estimated_unit_cost: number | null;
          canonical_key: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          quantity?: number | null;
          unit?: string | null;
          section?: string | null;
          secondary_quantity?: number | null;
          secondary_unit?: string | null;
          preparation_note?: string | null;
          category?: string | null;
          allergen_tags?: string[];
          pantry_flag?: boolean;
          sort_order?: number;
          estimated_unit_cost?: number | null;
          canonical_key?: string | null;
        };
        Update: {
          name?: string;
          quantity?: number | null;
          unit?: string | null;
          section?: string | null;
          secondary_quantity?: number | null;
          secondary_unit?: string | null;
          preparation_note?: string | null;
          category?: string | null;
          allergen_tags?: string[];
          pantry_flag?: boolean;
          sort_order?: number;
          estimated_unit_cost?: number | null;
          canonical_key?: string | null;
        };
        Relationships: [];
      };
      recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          title: string;
          description: string | null;
          duration_minutes: number | null;
          task: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          title: string;
          description?: string | null;
          duration_minutes?: number | null;
          task?: string | null;
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string | null;
          duration_minutes?: number | null;
          task?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      ingredient_prices: {
        Row: {
          canonical_key: string;
          unit: string;
          price_per_unit: number;
          currency: string;
          market: string;
          source: string;
          observed_at: string | null;
          updated_at: string;
        };
        Insert: {
          canonical_key: string;
          unit: string;
          price_per_unit: number;
          currency?: string;
          market?: string;
          source?: string;
          observed_at?: string | null;
        };
        Update: {
          canonical_key?: string;
          unit?: string;
          price_per_unit?: number;
          currency?: string;
          market?: string;
          source?: string;
          observed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      grocery_ingredients: {
        Row: {
          canonical_key: string; display_name: string; category: string; subcategory: string | null;
          preferred_shopping_unit: string; keep_count: boolean; density_g_per_ml: number | null;
          edible_yield: number; cuisine_tags: string[]; notes: string | null; active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: {
          canonical_key: string; display_name: string; category: string; subcategory?: string | null;
          preferred_shopping_unit: string; keep_count?: boolean; density_g_per_ml?: number | null;
          edible_yield?: number; cuisine_tags?: string[]; notes?: string | null; active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["grocery_ingredients"]["Insert"]>;
        Relationships: [];
      };
      ingredient_aliases: {
        Row: { alias_key: string; canonical_key: string };
        Insert: { alias_key: string; canonical_key: string };
        Update: { alias_key?: string; canonical_key?: string };
        Relationships: [];
      };
      ingredient_unit_weights: {
        Row: { canonical_key: string; unit: string; grams_per_unit: number; source: string; updated_at: string };
        Insert: { canonical_key: string; unit: string; grams_per_unit: number; source?: string; updated_at?: string };
        Update: { canonical_key?: string; unit?: string; grams_per_unit?: number; source?: string; updated_at?: string };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          party_id: string;
          recipe_id: string;
          course: string | null;
          sort_order: number;
          serving_override: number | null;
          guest_visible: boolean;
        };
        Insert: {
          id?: string;
          party_id: string;
          recipe_id: string;
          course?: string | null;
          sort_order?: number;
          serving_override?: number | null;
          guest_visible?: boolean;
        };
        Update: {
          course?: string | null;
          sort_order?: number;
          serving_override?: number | null;
          guest_visible?: boolean;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          party_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          rsvp_status: string;
          allergies: string | null;
          dietary_preference: string | null;
          plus_one_count: number;
          notes: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          rsvp_status?: string;
          allergies?: string | null;
          dietary_preference?: string | null;
          plus_one_count?: number;
          notes?: string | null;
          source?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          rsvp_status?: string;
          allergies?: string | null;
          dietary_preference?: string | null;
          plus_one_count?: number;
          notes?: string | null;
          source?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          party_id: string;
          guest_id: string;
          token: string;
          created_at: string;
          revoked_at: string | null;
          last_opened_at: string | null;
          last_sent_at: string | null;
          last_sent_channel: string | null;
        };
        Insert: {
          id?: string;
          party_id: string;
          guest_id: string;
          token?: string;
          revoked_at?: string | null;
          last_opened_at?: string | null;
          last_sent_at?: string | null;
          last_sent_channel?: string | null;
        };
        Update: {
          token?: string;
          revoked_at?: string | null;
          last_opened_at?: string | null;
          last_sent_at?: string | null;
          last_sent_channel?: string | null;
        };
        Relationships: [];
      };
      invite_deliveries: {
        Row: {
          id: string;
          party_id: string;
          invite_id: string;
          guest_id: string;
          channel: string;
          recipient: string;
          status: string;
          provider: string | null;
          provider_message_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          invite_id: string;
          guest_id: string;
          channel: string;
          recipient: string;
          status: string;
          provider?: string | null;
          provider_message_id?: string | null;
          error?: string | null;
        };
        Update: {
          channel?: string;
          recipient?: string;
          status?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          error?: string | null;
        };
        Relationships: [];
      };
      grocery_items: {
        Row: {
          id: string;
          party_id: string;
          ingredient_name: string;
          required_quantity: string | null;
          quantity: number | null;
          unit: string | null;
          category: string | null;
          canonical_key: string | null;
          source_recipe_ids: string[];
          is_manual: boolean;
          already_owned: boolean;
          purchased: boolean;
          estimated_cost: number | null;
          actual_cost: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          party_id: string;
          ingredient_name: string;
          required_quantity?: string | null;
          quantity?: number | null;
          unit?: string | null;
          category?: string | null;
          canonical_key?: string | null;
          source_recipe_ids?: string[];
          is_manual?: boolean;
          already_owned?: boolean;
          purchased?: boolean;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sort_order?: number;
        };
        Update: {
          ingredient_name?: string;
          required_quantity?: string | null;
          quantity?: number | null;
          unit?: string | null;
          category?: string | null;
          canonical_key?: string | null;
          source_recipe_ids?: string[];
          is_manual?: boolean;
          already_owned?: boolean;
          purchased?: boolean;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          party_id: string;
          uploaded_by: string | null;
          store_name: string | null;
          purchased_at: string | null;
          subtotal: number | null;
          tax: number | null;
          total: number | null;
          image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string; party_id: string; uploaded_by?: string | null; store_name?: string | null; purchased_at?: string | null; subtotal?: number | null; tax?: number | null; total?: number | null; image_path?: string | null; created_at?: string;
        };
        Update: {
          store_name?: string | null; purchased_at?: string | null; subtotal?: number | null; tax?: number | null; total?: number | null; image_path?: string | null;
        };
        Relationships: [];
      };
      receipt_items: {
        Row: {
          id: string; receipt_id: string; grocery_item_id: string | null; raw_name: string; normalized_name: string | null; quantity: number | null; line_total: number; match_confidence: number | null; purchased: boolean; created_at: string;
        };
        Insert: {
          id?: string; receipt_id: string; grocery_item_id?: string | null; raw_name: string; normalized_name?: string | null; quantity?: number | null; line_total?: number; match_confidence?: number | null; purchased?: boolean; created_at?: string;
        };
        Update: {
          grocery_item_id?: string | null; raw_name?: string; normalized_name?: string | null; quantity?: number | null; line_total?: number; match_confidence?: number | null; purchased?: boolean;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          party_id: string;
          recipe_id: string | null;
          step_id: string | null;
          title: string;
          description: string | null;
          task: string | null;
          start_at: string | null;
          due_at: string | null;
          duration_minutes: number | null;
          base_duration_minutes: number | null;
          duration_scaling_mode: string | null;
          status: string;
          difficulty: string | null;
          required_specialty: string | null;
          assigned_name: string | null;
          helper_id: string | null;
          locked: boolean;
          dependency_ids: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          recipe_id?: string | null;
          step_id?: string | null;
          title: string;
          description?: string | null;
          task?: string | null;
          start_at?: string | null;
          due_at?: string | null;
          duration_minutes?: number | null;
          base_duration_minutes?: number | null;
          duration_scaling_mode?: string | null;
          status?: string;
          difficulty?: string | null;
          required_specialty?: string | null;
          assigned_name?: string | null;
          helper_id?: string | null;
          locked?: boolean;
          dependency_ids?: string[];
          sort_order?: number;
        };
        Update: {
          recipe_id?: string | null;
          step_id?: string | null;
          title?: string;
          description?: string | null;
          task?: string | null;
          start_at?: string | null;
          due_at?: string | null;
          duration_minutes?: number | null;
          base_duration_minutes?: number | null;
          duration_scaling_mode?: string | null;
          status?: string;
          difficulty?: string | null;
          assigned_name?: string | null;
          helper_id?: string | null;
          locked?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      user_pantry_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          party_id: string | null;
          type: string;
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          party_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          party_id?: string | null;
          type?: string;
          title?: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_party_refresh: {
        Args: { p_party_id: string; p_kind: string };
        Returns: string | null;
      };
      finish_party_refresh: {
        Args: { p_party_id: string; p_kind: string; p_token: string; p_success: boolean };
        Returns: boolean;
      };
      get_collaborator_invite_by_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      accept_collaborator_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_invite_by_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      rsvp_via_invite_token: {
        Args: {
          p_token: string;
          p_name: string;
          p_email: string;
          p_rsvp_status: string;
          p_allergies?: string;
          p_dietary_preference?: string;
          p_plus_one_count?: number;
          p_notes?: string;
        };
        Returns: Json;
      };
      queue_rsvp_notification: {
        Args: {
          p_party_id: string;
          p_guest_name: string;
          p_rsvp_status?: string;
        };
        Returns: undefined;
      };
      queue_collaborator_invite_notification: {
        Args: { p_email: string; p_party_id: string };
        Returns: undefined;
      };
      queue_collaborator_accept_notification: {
        Args: { p_party_id: string; p_invited_by: string; p_name: string };
        Returns: undefined;
      };
      cleanup_expired_parties: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type InvitePayload = {
  status: "active" | "soft_expired" | "revoked";
  kind?: "guest" | "share";
  ok?: boolean;
  error?: string;
  personal_token?: string;
  party?: {
    id: string;
    name: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    location: string | null;
    timezone: string;
    theme: string | null;
    cuisine: string | null;
    service_style: string | null;
    dress_code: string | null;
    guest_contribution_notes: string | null;
    hero_image: string | null;
    color_scheme: string;
    cover_position: string;
    cover_crop: Json | null;
    invitation_headline: string | null;
    invitation_message: string | null;
    invitation_signoff: string | null;
    invitation_rsvp_label: string | null;
    invitation_photo_urls: string[];
    invitation_photo_positions: string[];
    invitation_photo_crops: Json;
    invitation_photo_slots?: string[];
  };
  guest?: {
    id: string;
    name: string;
    email: string | null;
    rsvp_status: string;
    allergies: string | null;
    dietary_preference: string | null;
    plus_one_count: number;
    notes: string | null;
  };
  menu?: Array<{
    id?: string;
    course: string | null;
    title: string;
    description: string | null;
  }>;
  allergy_options?: Array<{
    kind: "allergen" | "ingredient";
    value: string;
    label: string;
    allergens: string[];
  }>;
};

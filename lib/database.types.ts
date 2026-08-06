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
          timezone: string;
          cooking_skill_level: string;
          specialties: string[];
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          preferred_measurement?: string;
          timezone?: string;
          cooking_skill_level?: string;
          specialties?: string[];
          onboarding_complete?: boolean;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          preferred_measurement?: string;
          timezone?: string;
          cooking_skill_level?: string;
          specialties?: string[];
          onboarding_complete?: boolean;
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
          location: string | null;
          timezone: string;
          theme: string | null;
          cuisine: string | null;
          service_style: string | null;
          dress_code: string | null;
          guest_contribution_notes: string | null;
          hero_image: string | null;
          planning_guest_count: number;
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
          location?: string | null;
          timezone?: string;
          theme?: string | null;
          cuisine?: string | null;
          service_style?: string | null;
          dress_code?: string | null;
          guest_contribution_notes?: string | null;
          hero_image?: string | null;
          planning_guest_count?: number;
          status?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          location?: string | null;
          timezone?: string;
          theme?: string | null;
          cuisine?: string | null;
          service_style?: string | null;
          dress_code?: string | null;
          guest_contribution_notes?: string | null;
          hero_image?: string | null;
          planning_guest_count?: number;
          status?: string;
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
      recipes: {
        Row: {
          id: string;
          owner_id: string;
          party_id: string | null;
          title: string;
          description: string | null;
          image_url: string | null;
          source_url: string | null;
          servings: number;
          prep_minutes: number | null;
          cook_minutes: number | null;
          course: string | null;
          cuisine: string | null;
          tags: string[];
          instructions: string | null;
          equipment: string[];
          notes: string | null;
          allergy_notes: string | null;
          estimated_cost: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          party_id?: string | null;
          title: string;
          description?: string | null;
          image_url?: string | null;
          source_url?: string | null;
          servings?: number;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          course?: string | null;
          cuisine?: string | null;
          tags?: string[];
          instructions?: string | null;
          equipment?: string[];
          notes?: string | null;
          allergy_notes?: string | null;
          estimated_cost?: number | null;
          status?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          image_url?: string | null;
          servings?: number;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          course?: string | null;
          allergy_notes?: string | null;
          estimated_cost?: number | null;
          status?: string;
          party_id?: string | null;
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
          preparation_note: string | null;
          category: string | null;
          allergen_tags: string[];
          pantry_flag: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          quantity?: number | null;
          unit?: string | null;
          preparation_note?: string | null;
          category?: string | null;
          allergen_tags?: string[];
          pantry_flag?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          quantity?: number | null;
          unit?: string | null;
          preparation_note?: string | null;
          category?: string | null;
          allergen_tags?: string[];
          pantry_flag?: boolean;
          sort_order?: number;
        };
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
        };
        Insert: {
          id?: string;
          party_id: string;
          guest_id: string;
          token?: string;
          revoked_at?: string | null;
          last_opened_at?: string | null;
        };
        Update: {
          token?: string;
          revoked_at?: string | null;
          last_opened_at?: string | null;
        };
        Relationships: [];
      };
      grocery_items: {
        Row: {
          id: string;
          party_id: string;
          ingredient_name: string;
          required_quantity: string | null;
          unit: string | null;
          category: string | null;
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
          unit?: string | null;
          category?: string | null;
          already_owned?: boolean;
          purchased?: boolean;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sort_order?: number;
        };
        Update: {
          ingredient_name?: string;
          required_quantity?: string | null;
          unit?: string | null;
          category?: string | null;
          already_owned?: boolean;
          purchased?: boolean;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          party_id: string;
          title: string;
          description: string | null;
          start_at: string | null;
          due_at: string | null;
          duration_minutes: number | null;
          status: string;
          difficulty: string | null;
          required_specialty: string | null;
          assigned_name: string | null;
          locked: boolean;
          dependency_ids: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          title: string;
          description?: string | null;
          start_at?: string | null;
          due_at?: string | null;
          duration_minutes?: number | null;
          status?: string;
          difficulty?: string | null;
          required_specialty?: string | null;
          assigned_name?: string | null;
          locked?: boolean;
          dependency_ids?: string[];
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string | null;
          start_at?: string | null;
          due_at?: string | null;
          status?: string;
          difficulty?: string | null;
          assigned_name?: string | null;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
  ok?: boolean;
  error?: string;
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
    course: string | null;
    title: string;
    description: string | null;
  }>;
};

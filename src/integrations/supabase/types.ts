export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          data: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          id: string;
          data?: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          id?: string;
          data?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_groups: {
        Row: {
          created_at: string;
          family_code: string;
          id: string;
          last_name: string;
          mission_pin_id: string | null;
          owner_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          family_code: string;
          id?: string;
          last_name: string;
          mission_pin_id?: string | null;
          owner_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          family_code?: string;
          id?: string;
          last_name?: string;
          mission_pin_id?: string | null;
          owner_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_groups_mission_pin_id_fkey";
            columns: ["mission_pin_id"];
            isOneToOne: false;
            referencedRelation: "mission_pins";
            referencedColumns: ["id"];
          },
        ];
      };
      family_members: {
        Row: {
          created_at: string;
          display_name: string;
          group_id: string;
          hometown_city: string | null;
          hometown_country: string | null;
          hometown_lat: number | null;
          hometown_lng: number | null;
          id: string;
          is_missionary: boolean;
          relationship: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          group_id: string;
          hometown_city?: string | null;
          hometown_country?: string | null;
          hometown_lat?: number | null;
          hometown_lng?: number | null;
          id?: string;
          is_missionary?: boolean;
          relationship?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          group_id?: string;
          hometown_city?: string | null;
          hometown_country?: string | null;
          hometown_lat?: number | null;
          hometown_lng?: number | null;
          id?: string;
          is_missionary?: boolean;
          relationship?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "family_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      library_books: {
        Row: {
          available: boolean;
          chapters: Json;
          created_at: string;
          flag: string;
          id: string;
          language: string;
          section: string;
          subtitle: string;
          target_label: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          available?: boolean;
          chapters?: Json;
          created_at?: string;
          flag?: string;
          id?: string;
          language: string;
          section?: string;
          subtitle?: string;
          target_label: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          available?: boolean;
          chapters?: Json;
          created_at?: string;
          flag?: string;
          id?: string;
          language?: string;
          section?: string;
          subtitle?: string;
          target_label?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mission_pins: {
        Row: {
          created_at: string;
          hometown_city: string;
          hometown_country: string;
          hometown_lat: number | null;
          hometown_lng: number | null;
          id: string;
          mission_id: string;
          mission_lat: number;
          mission_lng: number;
          mission_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hometown_city: string;
          hometown_country: string;
          hometown_lat?: number | null;
          hometown_lng?: number | null;
          id?: string;
          mission_id: string;
          mission_lat: number;
          mission_lng: number;
          mission_name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hometown_city?: string;
          hometown_country?: string;
          hometown_lat?: number | null;
          hometown_lng?: number | null;
          id?: string;
          mission_id?: string;
          mission_lat?: number;
          mission_lng?: number;
          mission_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      join_family_group: {
        Args: {
          p_family_code: string;
          p_last_name: string;
          p_display_name: string;
          p_relationship?: string;
          p_hometown_city?: string | null;
          p_hometown_country?: string | null;
        };
        Returns: Json;
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

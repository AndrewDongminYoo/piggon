export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
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
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_availability_periods: {
        Row: {
          created_at: string;
          ends_on: string | null;
          id: string;
          note: string | null;
          restaurant_id: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          note?: string | null;
          restaurant_id: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          note?: string | null;
          restaurant_id?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_availability_periods_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_awards: {
        Row: {
          award_year: number;
          competition_name: string;
          created_at: string;
          division: string;
          id: string;
          placement: string;
          restaurant_id: string;
          source_url: string;
          updated_at: string;
        };
        Insert: {
          award_year: number;
          competition_name: string;
          created_at?: string;
          division: string;
          id?: string;
          placement: string;
          restaurant_id: string;
          source_url: string;
          updated_at?: string;
        };
        Update: {
          award_year?: number;
          competition_name?: string;
          created_at?: string;
          division?: string;
          id?: string;
          placement?: string;
          restaurant_id?: string;
          source_url?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_awards_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_certifications: {
        Row: {
          certification_number: string | null;
          created_at: string;
          id: string;
          issuer: string;
          name: string;
          restaurant_id: string;
          source_url: string;
          updated_at: string;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          certification_number?: string | null;
          created_at?: string;
          id?: string;
          issuer: string;
          name: string;
          restaurant_id: string;
          source_url: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          certification_number?: string | null;
          created_at?: string;
          id?: string;
          issuer?: string;
          name?: string;
          restaurant_id?: string;
          source_url?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_certifications_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_videos: {
        Row: {
          context_note: string | null;
          restaurant_id: string;
          start_seconds: number | null;
          video_id: string;
        };
        Insert: {
          context_note?: string | null;
          restaurant_id: string;
          start_seconds?: number | null;
          video_id: string;
        };
        Update: {
          context_note?: string | null;
          restaurant_id?: string;
          start_seconds?: number | null;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_videos_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_videos_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          address: string | null;
          alternate_name: string | null;
          created_at: string;
          description: string | null;
          id: string;
          kakao_place_id: string | null;
          kind: Database["public"]["Enums"]["restaurant_kind"];
          latitude: number | null;
          longitude: number | null;
          name: string;
          region: string;
          slug: string;
          source_url: string | null;
          status: Database["public"]["Enums"]["publication_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          alternate_name?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kakao_place_id?: string | null;
          kind?: Database["public"]["Enums"]["restaurant_kind"];
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          region: string;
          slug: string;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          alternate_name?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kakao_place_id?: string | null;
          kind?: Database["public"]["Enums"]["restaurant_kind"];
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          region?: string;
          slug?: string;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          body: string;
          created_at: string;
          hidden: boolean;
          id: string;
          rating: number;
          updated_at: string;
          visit_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          rating: number;
          updated_at?: string;
          visit_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          rating?: number;
          updated_at?: string;
          visit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: true;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          canonical_url: string;
          created_at: string;
          id: string;
          metadata_fetch_state: string;
          published_at: string | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string;
          youtube_video_id: string;
        };
        Insert: {
          canonical_url: string;
          created_at?: string;
          id?: string;
          metadata_fetch_state?: string;
          published_at?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          youtube_video_id: string;
        };
        Update: {
          canonical_url?: string;
          created_at?: string;
          id?: string;
          metadata_fetch_state?: string;
          published_at?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          youtube_video_id?: string;
        };
        Relationships: [];
      };
      visit_evidence_validations: {
        Row: {
          object_version: string;
          path: string;
          user_id: string;
          validated_at: string;
        };
        Insert: {
          object_version: string;
          path: string;
          user_id: string;
          validated_at?: string;
        };
        Update: {
          object_version?: string;
          path?: string;
          user_id?: string;
          validated_at?: string;
        };
        Relationships: [];
      };
      visit_moderation_marks: {
        Row: {
          created_at: string;
          restaurant_id: string;
          review_hidden: boolean;
          updated_at: string;
          user_id: string;
          visit_hidden: boolean;
        };
        Insert: {
          created_at?: string;
          restaurant_id: string;
          review_hidden?: boolean;
          updated_at?: string;
          user_id: string;
          visit_hidden?: boolean;
        };
        Update: {
          created_at?: string;
          restaurant_id?: string;
          review_hidden?: boolean;
          updated_at?: string;
          user_id?: string;
          visit_hidden?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "visit_moderation_marks_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      visit_photo_cleanup_jobs: {
        Row: {
          created_at: string;
          last_error: string;
          path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          last_error: string;
          path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          last_error?: string;
          path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      visits: {
        Row: {
          created_at: string;
          evidence_type: Database["public"]["Enums"]["visit_evidence_type"];
          hidden: boolean;
          id: string;
          instagram_url: string | null;
          photo_path: string | null;
          restaurant_id: string;
          updated_at: string;
          user_id: string;
          visited_on: string;
        };
        Insert: {
          created_at?: string;
          evidence_type: Database["public"]["Enums"]["visit_evidence_type"];
          hidden?: boolean;
          id?: string;
          instagram_url?: string | null;
          photo_path?: string | null;
          restaurant_id: string;
          updated_at?: string;
          user_id: string;
          visited_on: string;
        };
        Update: {
          created_at?: string;
          evidence_type?: Database["public"]["Enums"]["visit_evidence_type"];
          hidden?: boolean;
          id?: string;
          instagram_url?: string | null;
          photo_path?: string | null;
          restaurant_id?: string;
          updated_at?: string;
          user_id?: string;
          visited_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "visits_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_has_profile: { Args: never; Returns: boolean };
      current_user_owns_visit_evidence: {
        Args: { p_path: string };
        Returns: boolean;
      };
      current_user_unreferenced_evidence_count: {
        Args: never;
        Returns: number;
      };
      list_reclaimable_visit_evidence: {
        Args: {
          p_except_path: string;
          p_limit: number;
          p_older_than_seconds: number;
          p_user_id: string;
        };
        Returns: string[];
      };
      lock_visit_evidence: { Args: { p_user_id: string }; Returns: undefined };
      record_visit_evidence_validation: {
        Args: { p_path: string; p_user_id: string };
        Returns: boolean;
      };
      save_restaurant_with_attributes: {
        Args: {
          p_availability_periods: Json;
          p_awards: Json;
          p_certifications: Json;
          p_restaurant: Json;
          p_restaurant_id?: string;
        };
        Returns: {
          restaurant_id: string;
          restaurant_slug: string;
        }[];
      };
      upsert_video_with_restaurants: {
        Args: {
          p_canonical_url: string;
          p_links: Json;
          p_metadata_fetch_state: string;
          p_thumbnail_url: string;
          p_title: string;
          p_youtube_video_id: string;
        };
        Returns: string;
      };
      visit_evidence_is_referenced: {
        Args: { p_path: string };
        Returns: boolean;
      };
      visit_evidence_is_validated: {
        Args: { p_path: string };
        Returns: boolean;
      };
    };
    Enums: {
      publication_status: "draft" | "published" | "archived";
      restaurant_kind: "pizzeria" | "restaurant" | "popup" | "franchise";
      visit_evidence_type: "photo" | "instagram";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      publication_status: ["draft", "published", "archived"],
      restaurant_kind: ["pizzeria", "restaurant", "popup", "franchise"],
      visit_evidence_type: ["photo", "instagram"],
    },
  },
} as const;

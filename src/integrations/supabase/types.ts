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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          artist_id: string | null
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          ends_at: string
          id: string
          manage_token: string
          notes: string
          price_cents: number
          service_id: string | null
          starts_at: string
          status: string
          studio_id: string
        }
        Insert: {
          artist_id?: string | null
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          ends_at: string
          id?: string
          manage_token?: string
          notes?: string
          price_cents?: number
          service_id?: string | null
          starts_at: string
          status?: string
          studio_id: string
        }
        Update: {
          artist_id?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          ends_at?: string
          id?: string
          manage_token?: string
          notes?: string
          price_cents?: number
          service_id?: string | null
          starts_at?: string
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          artist_id: string | null
          break_end: string | null
          break_start: string | null
          closed: boolean
          end_time: string
          id: string
          start_time: string
          studio_id: string
          weekday: number
        }
        Insert: {
          artist_id?: string | null
          break_end?: string | null
          break_start?: string | null
          closed?: boolean
          end_time: string
          id?: string
          start_time: string
          studio_id: string
          weekday: number
        }
        Update: {
          artist_id?: string | null
          break_end?: string | null
          break_start?: string | null
          closed?: boolean
          end_time?: string
          id?: string
          start_time?: string
          studio_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          full_name: string
          id: string
          notes: string
          phone: string
          studio_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          notes?: string
          phone: string
          studio_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          notes?: string
          phone?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      closures: {
        Row: {
          artist_id: string | null
          created_at: string
          day: string
          id: string
          reason: string
          studio_id: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          day: string
          id?: string
          reason?: string
          studio_id: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          day?: string
          id?: string
          reason?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closures_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          studio_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          studio_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string
          duration_minutes: number
          id: string
          image_url: string | null
          name: string
          price_cents: number
          sort_order: number
          studio_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          name: string
          price_cents?: number
          sort_order?: number
          studio_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          name?: string
          price_cents?: number
          sort_order?: number
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          about: string | null
          address: string | null
          created_at: string
          id: string
          instagram: string | null
          name: string
          phone: string | null
          slot_interval_minutes: number
          slug: string
        }
        Insert: {
          about?: string | null
          address?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          name: string
          phone?: string | null
          slot_interval_minutes?: number
          slug: string
        }
        Update: {
          about?: string | null
          address?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          slot_interval_minutes?: number
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          studio_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          studio_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_studio_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "artist"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "artist"],
    },
  },
} as const

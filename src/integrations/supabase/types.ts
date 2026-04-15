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
      event_comments: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          sender_member_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          sender_member_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          sender_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_sender_member_id_fkey"
            columns: ["sender_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_visible_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_visible_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_visible_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          day_part: string
          day_part_end: string | null
          day_part_start: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          household_id: string
          id: string
          location: string | null
          notes: string | null
          owner_member_id: string
          priority: string
          start_time: string | null
          title: string
          updated_at: string
          visibility_type: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          day_part: string
          day_part_end?: string | null
          day_part_start?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          household_id: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_member_id: string
          priority?: string
          start_time?: string | null
          title: string
          updated_at?: string
          visibility_type?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          day_part?: string
          day_part_end?: string | null
          day_part_start?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          household_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_member_id?: string
          priority?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          household_id: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          household_id: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          avatar_url: string | null
          color_token: string
          created_at: string
          display_name: string
          household_id: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          color_token?: string
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          color_token?: string
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      list_item_visible_members: {
        Row: {
          created_at: string
          id: string
          list_item_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_item_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_item_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_item_visible_members_list_item_id_fkey"
            columns: ["list_item_id"]
            isOneToOne: false
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_item_visible_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_checked: boolean
          item_date: string
          owner_member_id: string | null
          sort_order: number
          title: string
          updated_at: string
          visibility_type: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_checked?: boolean
          item_date: string
          owner_member_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          visibility_type?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_checked?: boolean
          item_date?: string
          owner_member_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_current_user_edit_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_current_user_view_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_current_user_view_list_item: {
        Args: { p_list_item_id: string }
        Returns: boolean
      }
      create_household_invite: {
        Args: never
        Returns: {
          code: string
          expires_at: string
          household_id: string
          invite_id: string
        }[]
      }
      create_household_with_owner: {
        Args: { p_color_token?: string; p_display_name: string; p_name: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_member_ids: { Args: never; Returns: string[] }
      is_household_member: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      join_household_by_code: {
        Args: {
          p_color_token?: string
          p_display_name: string
          p_invite_code: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

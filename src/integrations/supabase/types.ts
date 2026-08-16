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
      ai_summaries: {
        Row: {
          created_at: string
          id: string
          plant_id: string
          recommendations: Json | null
          status: string
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          plant_id: string
          recommendations?: Json | null
          status: string
          summary: string
        }
        Update: {
          created_at?: string
          id?: string
          plant_id?: string
          recommendations?: Json | null
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_records: {
        Row: {
          archived_at: string
          archived_by: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          owner_id: string | null
          reason: string | null
          restored_at: string | null
          restored_by: string | null
          snapshot: Json
          updated_at: string
        }
        Insert: {
          archived_at?: string
          archived_by: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          owner_id?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          snapshot: Json
          updated_at?: string
        }
        Update: {
          archived_at?: string
          archived_by?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          snapshot?: Json
          updated_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_message_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_message_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_message_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          plant_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          plant_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          plant_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_photos: {
        Row: {
          ai_analysis: Json | null
          bytes: number | null
          caption: string | null
          content_type: string | null
          created_at: string
          height: number | null
          id: string
          plant_id: string
          storage_path: string
          taken_at: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          bytes?: number | null
          caption?: string | null
          content_type?: string | null
          created_at?: string
          height?: number | null
          id?: string
          plant_id: string
          storage_path: string
          taken_at?: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          bytes?: number | null
          caption?: string | null
          content_type?: string | null
          created_at?: string
          height?: number | null
          id?: string
          plant_id?: string
          storage_path?: string
          taken_at?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_photos_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_species: {
        Row: {
          aliases: string[] | null
          archived_at: string | null
          archived_by: string | null
          care_tips: string | null
          common_diseases: string[] | null
          common_name: string
          common_pests: string[] | null
          created_at: string
          description: string | null
          fertilizer: string | null
          humidity_max: number | null
          humidity_min: number | null
          id: string
          image_url: string | null
          light: string | null
          scientific_name: string | null
          search_text: string | null
          slug: string
          soil: string | null
          soil_moisture_max: number | null
          soil_moisture_min: number | null
          source: string
          temperature_max_c: number | null
          temperature_min_c: number | null
          toxicity: string | null
          water_frequency_days: number | null
        }
        Insert: {
          aliases?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          care_tips?: string | null
          common_diseases?: string[] | null
          common_name: string
          common_pests?: string[] | null
          created_at?: string
          description?: string | null
          fertilizer?: string | null
          humidity_max?: number | null
          humidity_min?: number | null
          id?: string
          image_url?: string | null
          light?: string | null
          scientific_name?: string | null
          search_text?: string | null
          slug: string
          soil?: string | null
          soil_moisture_max?: number | null
          soil_moisture_min?: number | null
          source?: string
          temperature_max_c?: number | null
          temperature_min_c?: number | null
          toxicity?: string | null
          water_frequency_days?: number | null
        }
        Update: {
          aliases?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          care_tips?: string | null
          common_diseases?: string[] | null
          common_name?: string
          common_pests?: string[] | null
          created_at?: string
          description?: string | null
          fertilizer?: string | null
          humidity_max?: number | null
          humidity_min?: number | null
          id?: string
          image_url?: string | null
          light?: string | null
          scientific_name?: string | null
          search_text?: string | null
          slug?: string
          soil?: string | null
          soil_moisture_max?: number | null
          soil_moisture_min?: number | null
          source?: string
          temperature_max_c?: number | null
          temperature_min_c?: number | null
          toxicity?: string | null
          water_frequency_days?: number | null
        }
        Relationships: []
      }
      plant_weather_alerts: {
        Row: {
          created_at: string
          emailed_at: string | null
          for_date: string
          id: string
          message: string
          plant_id: string
          rule: string
          severity: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          for_date?: string
          id?: string
          message: string
          plant_id: string
          rule: string
          severity?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          for_date?: string
          id?: string
          message?: string
          plant_id?: string
          rule?: string
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_weather_alerts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          dedup_key: string | null
          deleted_at: string | null
          id: string
          kind: string
          payload: Json
          photo_id: string | null
          plant_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          dedup_key?: string | null
          deleted_at?: string | null
          id?: string
          kind: string
          payload?: Json
          photo_id?: string | null
          plant_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          dedup_key?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          photo_id?: string | null
          plant_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "plant_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notify_email: boolean
          notify_in_app: boolean
          notify_sms: boolean
          phone: string | null
          region: string | null
          timezone: string | null
          updated_at: string
          username: string | null
          username_set_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          notify_email?: boolean
          notify_in_app?: boolean
          notify_sms?: boolean
          phone?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
          username_set_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notify_email?: boolean
          notify_in_app?: boolean
          notify_sms?: boolean
          phone?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
          username_set_at?: string | null
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          extra: Json | null
          humidity: number | null
          id: string
          light_lux: number | null
          motion_events: number | null
          plant_id: string
          recorded_at: string
          snapshot_url: string | null
          soil_moisture: number | null
          source_device: string | null
          temperature_c: number | null
        }
        Insert: {
          extra?: Json | null
          humidity?: number | null
          id?: string
          light_lux?: number | null
          motion_events?: number | null
          plant_id: string
          recorded_at?: string
          snapshot_url?: string | null
          soil_moisture?: number | null
          source_device?: string | null
          temperature_c?: number | null
        }
        Update: {
          extra?: Json | null
          humidity?: number | null
          id?: string
          light_lux?: number | null
          motion_events?: number | null
          plant_id?: string
          recorded_at?: string
          snapshot_url?: string | null
          soil_moisture?: number | null
          source_device?: string | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plants: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          device_id: string | null
          id: string
          image_url: string | null
          last_watered_at: string | null
          location: string | null
          nickname: string
          notes: string | null
          species_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          image_url?: string | null
          last_watered_at?: string | null
          location?: string | null
          nickname: string
          notes?: string | null
          species_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          image_url?: string | null
          last_watered_at?: string | null
          location?: string | null
          nickname?: string
          notes?: string | null
          species_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plants_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "plant_species"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watering_events: {
        Row: {
          amount_ml: number | null
          created_at: string
          id: string
          notes: string | null
          plant_id: string
          watered_at: string
        }
        Insert: {
          amount_ml?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id: string
          watered_at?: string
        }
        Update: {
          amount_ml?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id?: string
          watered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watering_events_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_cache: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          lat: number
          lon: number
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          lat: number
          lon: number
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          lat?: number
          lon?: number
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation: string; _user: string }
        Returns: boolean
      }
      user_friend_count: { Args: { _user: string }; Returns: number }
      user_plant_count: { Args: { _user: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

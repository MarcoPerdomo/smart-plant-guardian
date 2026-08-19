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
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          id: string
          link_url: string | null
          published_at: string | null
          recipient_count: number
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          id?: string
          link_url?: string | null
          published_at?: string | null
          recipient_count?: number
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          id?: string
          link_url?: string | null
          published_at?: string | null
          recipient_count?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      listing_disclosures: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["disclosure_kind"]
          listing_id: string
          occurred_on: string | null
          resolved_on: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["disclosure_kind"]
          listing_id: string
          occurred_on?: string | null
          resolved_on?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["disclosure_kind"]
          listing_id?: string
          occurred_on?: string | null
          resolved_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_disclosures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          age_months: number | null
          allow_pickup: boolean
          allow_shipping: boolean
          archived_at: string | null
          box_size: Database["public"]["Enums"]["box_size"] | null
          country_code: string
          cover_photo_path: string | null
          created_at: string
          currency: string
          description: string | null
          health_rating: number | null
          id: string
          plant_id: string | null
          price_cents: number
          published_at: string | null
          seller_id: string
          shipping_cents: number
          size: Database["public"]["Enums"]["plant_size"] | null
          sold_at: string | null
          species_id: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          age_months?: number | null
          allow_pickup?: boolean
          allow_shipping?: boolean
          archived_at?: string | null
          box_size?: Database["public"]["Enums"]["box_size"] | null
          country_code?: string
          cover_photo_path?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          health_rating?: number | null
          id?: string
          plant_id?: string | null
          price_cents: number
          published_at?: string | null
          seller_id: string
          shipping_cents?: number
          size?: Database["public"]["Enums"]["plant_size"] | null
          sold_at?: string | null
          species_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          age_months?: number | null
          allow_pickup?: boolean
          allow_shipping?: boolean
          archived_at?: string | null
          box_size?: Database["public"]["Enums"]["box_size"] | null
          country_code?: string
          cover_photo_path?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          health_rating?: number | null
          id?: string
          plant_id?: string | null
          price_cents?: number
          published_at?: string | null
          seller_id?: string
          shipping_cents?: number
          size?: Database["public"]["Enums"]["plant_size"] | null
          sold_at?: string | null
          species_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "user_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "plant_species"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          accepted_at: string | null
          box_size: Database["public"]["Enums"]["box_size"] | null
          buyer_address: string | null
          buyer_id: string
          buyer_note: string | null
          cancelled_at: string | null
          carrier: string | null
          commission_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          expected_delivery: string | null
          id: string
          item_cents: number
          listing_id: string
          payment_provider: string
          pickup_address: string | null
          pickup_slot: string | null
          ready_at: string | null
          seller_id: string
          ship_by: string | null
          shipped_at: string | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          total_cents: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          box_size?: Database["public"]["Enums"]["box_size"] | null
          buyer_address?: string | null
          buyer_id: string
          buyer_note?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          commission_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          expected_delivery?: string | null
          id?: string
          item_cents: number
          listing_id: string
          payment_provider?: string
          pickup_address?: string | null
          pickup_slot?: string | null
          ready_at?: string | null
          seller_id: string
          ship_by?: string | null
          shipped_at?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_cents: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          box_size?: Database["public"]["Enums"]["box_size"] | null
          buyer_address?: string | null
          buyer_id?: string
          buyer_note?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          commission_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          expected_delivery?: string | null
          id?: string
          item_cents?: number
          listing_id?: string
          payment_provider?: string
          pickup_address?: string | null
          pickup_slot?: string | null
          ready_at?: string | null
          seller_id?: string
          ship_by?: string | null
          shipped_at?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_settings: {
        Row: {
          active_countries: string[]
          commission_bps: number
          id: boolean
          updated_at: string
        }
        Insert: {
          active_countries?: string[]
          commission_bps?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          active_countries?: string[]
          commission_bps?: number
          id?: boolean
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
      newsletter_subscriptions: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          status: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_id: string | null
          admin_note: string | null
          amount_cents: number
          created_at: string
          iban_last4: string | null
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          iban_last4?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          iban_last4?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          feed_last_seen_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          marketplace_sales_count: number
          marketplace_show_avatar: boolean
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
          feed_last_seen_at?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          marketplace_sales_count?: number
          marketplace_show_avatar?: boolean
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
          feed_last_seen_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          marketplace_sales_count?: number
          marketplace_show_avatar?: boolean
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
          acquired_at: string | null
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
          size: Database["public"]["Enums"]["plant_size"] | null
          species_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
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
          size?: Database["public"]["Enums"]["plant_size"] | null
          species_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
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
          size?: Database["public"]["Enums"]["plant_size"] | null
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
      wallet_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["wallet_txn_kind"]
          order_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["wallet_txn_kind"]
          order_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wallet_txn_kind"]
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_cents: number
          currency: string
          pending_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_cents?: number
          currency?: string
          pending_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_cents?: number
          currency?: string
          pending_cents?: number
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_post: { Args: { _post_id: string }; Returns: boolean }
      get_profile_by_username: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          created_at: string
          display_name: string
          friend_count: number
          id: string
          plant_count: number
          username: string
        }[]
      }
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
      profiles_public_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      search_profiles: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      user_friend_count: { Args: { _user: string }; Returns: number }
      user_plant_count: { Args: { _user: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      box_size: "s" | "m" | "l" | "xl"
      delivery_method: "pickup" | "shipping"
      disclosure_kind: "disease" | "pest" | "leaf_damage" | "repot" | "other"
      listing_status: "draft" | "active" | "reserved" | "sold" | "archived"
      order_status:
        | "placed"
        | "accepted"
        | "ready"
        | "in_transit"
        | "delivered"
        | "completed"
        | "cancelled"
        | "refunded"
        | "disputed"
      payout_status: "requested" | "approved" | "paid" | "rejected"
      plant_size: "xs" | "s" | "m" | "l" | "xl"
      wallet_txn_kind:
        | "sale"
        | "commission"
        | "shipping"
        | "refund"
        | "payout"
        | "adjustment"
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
      box_size: ["s", "m", "l", "xl"],
      delivery_method: ["pickup", "shipping"],
      disclosure_kind: ["disease", "pest", "leaf_damage", "repot", "other"],
      listing_status: ["draft", "active", "reserved", "sold", "archived"],
      order_status: [
        "placed",
        "accepted",
        "ready",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
        "refunded",
        "disputed",
      ],
      payout_status: ["requested", "approved", "paid", "rejected"],
      plant_size: ["xs", "s", "m", "l", "xl"],
      wallet_txn_kind: [
        "sale",
        "commission",
        "shipping",
        "refund",
        "payout",
        "adjustment",
      ],
    },
  },
} as const

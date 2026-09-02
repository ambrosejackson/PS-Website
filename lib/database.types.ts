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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          body_md: string | null
          excerpt: string | null
          hero_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo: Json | null
          slug: string
          title: string
        }
        Insert: {
          body_md?: string | null
          excerpt?: string | null
          hero_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo?: Json | null
          slug: string
          title: string
        }
        Update: {
          body_md?: string | null
          excerpt?: string | null
          hero_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo?: Json | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      catalog_products: {
        Row: {
          brand: string
          category: string | null
          description: string | null
          format: string | null
          id: string
          image_missing: boolean
          image_url: string | null
          is_active: boolean
          name: string
          quarantine_reason: string | null
          sheet_row_ref: string | null
          slug: string
          sort_order: number | null
          source: string
          strain_type: string | null
          sync_status: string | null
          synced_at: string | null
          terp_category: string | null
          terpene_profile: Json | null
          thc_range: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          brand: string
          category?: string | null
          description?: string | null
          format?: string | null
          id?: string
          image_missing?: boolean
          image_url?: string | null
          is_active?: boolean
          name: string
          quarantine_reason?: string | null
          sheet_row_ref?: string | null
          slug: string
          sort_order?: number | null
          source?: string
          strain_type?: string | null
          sync_status?: string | null
          synced_at?: string | null
          terp_category?: string | null
          terpene_profile?: Json | null
          thc_range?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          brand?: string
          category?: string | null
          description?: string | null
          format?: string | null
          id?: string
          image_missing?: boolean
          image_url?: string | null
          is_active?: boolean
          name?: string
          quarantine_reason?: string | null
          sheet_row_ref?: string | null
          slug?: string
          sort_order?: number | null
          source?: string
          strain_type?: string | null
          sync_status?: string | null
          synced_at?: string | null
          terp_category?: string | null
          terpene_profile?: Json | null
          thc_range?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          brand_context: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source_path: string | null
          subject: string | null
        }
        Insert: {
          brand_context?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source_path?: string | null
          subject?: string | null
        }
        Update: {
          brand_context?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source_path?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      content_banners: {
        Row: {
          badge_text: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          link_url: string | null
          media_type: string
          media_url: string
          sort_order: number | null
          starts_at: string | null
        }
        Insert: {
          badge_text?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          media_type: string
          media_url: string
          sort_order?: number | null
          starts_at?: string | null
        }
        Update: {
          badge_text?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          media_type?: string
          media_url?: string
          sort_order?: number | null
          starts_at?: string | null
        }
        Relationships: []
      }
      content_heroes: {
        Row: {
          audio_autoplay: boolean
          audio_volume: number
          has_audio: boolean
          id: string
          is_active: boolean
          is_default: boolean
          media_type: string
          media_url: string
          media_url_mobile: string | null
          nav_target: string | null
          page: string
          poster_url: string | null
          sort_order: number | null
          theme: string
          video_loop: boolean
        }
        Insert: {
          audio_autoplay?: boolean
          audio_volume?: number
          has_audio?: boolean
          id?: string
          is_active?: boolean
          is_default?: boolean
          media_type: string
          media_url: string
          media_url_mobile?: string | null
          nav_target?: string | null
          page: string
          poster_url?: string | null
          sort_order?: number | null
          theme?: string
          video_loop?: boolean
        }
        Update: {
          audio_autoplay?: boolean
          audio_volume?: number
          has_audio?: boolean
          id?: string
          is_active?: boolean
          is_default?: boolean
          media_type?: string
          media_url?: string
          media_url_mobile?: string | null
          nav_target?: string | null
          page?: string
          poster_url?: string | null
          sort_order?: number | null
          theme?: string
          video_loop?: boolean
        }
        Relationships: []
      }
      content_social_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          expires_at: string | null
          id: string
          pct: number
          redeemed_at: string | null
          stripe_promotion_code_id: string
          subscriber_id: string | null
        }
        Insert: {
          code: string
          expires_at?: string | null
          id?: string
          pct?: number
          redeemed_at?: string | null
          stripe_promotion_code_id: string
          subscriber_id?: string | null
        }
        Update: {
          code?: string
          expires_at?: string | null
          id?: string
          pct?: number
          redeemed_at?: string | null
          stripe_promotion_code_id?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_products: {
        Row: {
          brand: string | null
          created_at: string
          description: string | null
          fulfillment_provider: string
          id: string
          images: Json
          is_active: boolean
          name: string
          provider_product_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          description?: string | null
          fulfillment_provider?: string
          id?: string
          images?: Json
          is_active?: boolean
          name: string
          provider_product_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          description?: string | null
          fulfillment_provider?: string
          id?: string
          images?: Json
          is_active?: boolean
          name?: string
          provider_product_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      merch_variants: {
        Row: {
          color: string | null
          id: string
          is_active: boolean
          price_cents: number
          product_id: string
          provider_variant_id: string | null
          size: string | null
          sku: string
          stripe_price_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          is_active?: boolean
          price_cents: number
          product_id: string
          provider_variant_id?: string | null
          size?: string | null
          sku: string
          stripe_price_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          is_active?: boolean
          price_cents?: number
          product_id?: string
          provider_variant_id?: string | null
          size?: string | null
          sku?: string
          stripe_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merch_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merch_products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          company: string | null
          created_at: string
          email: string
          id: string
          inquiry_type: string
          name: string
          status: string
        }
        Insert: {
          body: string
          company?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_type: string
          name: string
          status?: string
        }
        Update: {
          body?: string
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          fulfillment_provider: string | null
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          provider_order_id: string | null
          qty: number
          sku: string | null
          title: string | null
          tracking: Json | null
          unit_price_cents: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          fulfillment_provider?: string | null
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          provider_order_id?: string | null
          qty: number
          sku?: string | null
          title?: string | null
          tracking?: Json | null
          unit_price_cents: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          fulfillment_provider?: string | null
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          provider_order_id?: string | null
          qty?: number
          sku?: string | null
          title?: string | null
          tracking?: Json | null
          unit_price_cents?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merch_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "merch_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          discount_cents: number | null
          discount_code_id: string | null
          email: string | null
          fulfillment_status: string
          id: string
          internal_note: string | null
          paid_at: string | null
          payment_provider: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          promo_code: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          stripe_tax_calculation_id: string | null
          subtotal_cents: number | null
          tax_cents: number
          total_cents: number | null
          tracking: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          discount_cents?: number | null
          discount_code_id?: string | null
          email?: string | null
          fulfillment_status?: string
          id?: string
          internal_note?: string | null
          paid_at?: string | null
          payment_provider: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          promo_code?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
          tracking?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          discount_cents?: number | null
          discount_code_id?: string | null
          email?: string | null
          fulfillment_status?: string
          id?: string
          internal_note?: string | null
          paid_at?: string | null
          payment_provider?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          promo_code?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
          tracking?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_availability: {
        Row: {
          brand: string
          checked_at: string
          image_url: string | null
          menu_product_url: string | null
          product_name: string
          store_id: string
          variant: string
        }
        Insert: {
          brand: string
          checked_at: string
          image_url?: string | null
          menu_product_url?: string | null
          product_name: string
          store_id: string
          variant?: string
        }
        Update: {
          brand?: string
          checked_at?: string
          image_url?: string | null
          menu_product_url?: string | null
          product_name?: string
          store_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_availability_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          availability_checked_at: string | null
          availability_tier: string | null
          brands: string[]
          chain_name: string | null
          city: string | null
          id: string
          last_delivery_within_90d: boolean
          latitude: number | null
          longitude: number | null
          menu_url: string | null
          name: string
          phone: string | null
          published_at: string
          state: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          availability_checked_at?: string | null
          availability_tier?: string | null
          brands?: string[]
          chain_name?: string | null
          city?: string | null
          id: string
          last_delivery_within_90d?: boolean
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name: string
          phone?: string | null
          published_at?: string
          state?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          availability_checked_at?: string | null
          availability_tier?: string | null
          brands?: string[]
          chain_name?: string | null
          city?: string | null
          id?: string
          last_delivery_within_90d?: boolean
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name?: string
          phone?: string | null
          published_at?: string
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      strains: {
        Row: {
          brand: string | null
          id: string
          is_active: boolean
          lineage: string | null
          our_name: string
          our_type: string | null
          slug: string | null
        }
        Insert: {
          brand?: string | null
          id: string
          is_active?: boolean
          lineage?: string | null
          our_name: string
          our_type?: string | null
          slug?: string | null
        }
        Update: {
          brand?: string | null
          id?: string
          is_active?: boolean
          lineage?: string | null
          our_name?: string
          our_type?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          brand_context: string | null
          consent_marketing: boolean
          consented_at: string
          discount_code_id: string | null
          email: string
          id: string
          persona: string
          source_path: string
          synced_to_psm_at: string | null
        }
        Insert: {
          brand_context?: string | null
          consent_marketing: boolean
          consented_at?: string
          discount_code_id?: string | null
          email: string
          id?: string
          persona: string
          source_path: string
          synced_to_psm_at?: string | null
        }
        Update: {
          brand_context?: string | null
          consent_marketing?: boolean
          consented_at?: string
          discount_code_id?: string | null
          email?: string
          id?: string
          persona?: string
          source_path?: string
          synced_to_psm_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_discount_code_fk"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      web_events: {
        Row: {
          element: string | null
          event_type: string | null
          id: number
          path: string | null
          referrer: string | null
          session_id: string | null
          ts: string
          utm: Json | null
        }
        Insert: {
          element?: string | null
          event_type?: string | null
          id?: never
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          ts?: string
          utm?: Json | null
        }
        Update: {
          element?: string | null
          event_type?: string | null
          id?: never
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          ts?: string
          utm?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

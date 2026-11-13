
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categories": {
                  Row: {
                    "id": string,"measurement_kind": Database["public"]['Enums']["measurement_kind"],"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"measurement_kind"?: Database["public"]['Enums']["measurement_kind"],"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "id"?: string,"measurement_kind"?: Database["public"]['Enums']["measurement_kind"],"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"name": string,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"name"?: string,"phone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"drop_pieces": {
                  Row: {
                    "drop_id": string,"piece_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "drop_id": string,"piece_id": string
                  }
                  Update: {
                    "drop_id"?: string,"piece_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drop_pieces_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drop_pieces_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: true
      referencedRelation: "pieces"
      referencedColumns: ["id"]
    }
                  ]
                },"drops": {
                  Row: {
                    "alert_on_release": boolean,"alert_sent_at": string | null,"created_at": string,"id": string,"name": string,"released_at": string | null,"starts_at": string,"status": Database["public"]['Enums']["drop_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_on_release"?: boolean,"alert_sent_at"?: string | null,"created_at"?: string,"id"?: string,"name": string,"released_at"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["drop_status"]
                  }
                  Update: {
                    "alert_on_release"?: boolean,"alert_sent_at"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"released_at"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["drop_status"]
                  }
                  Relationships: [
                    
                  ]
                },"holds": {
                  Row: {
                    "created_at": string,"expires_at": string,"extended": boolean,"id": string,"piece_id": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"extended"?: boolean,"id"?: string,"piece_id": string,"session_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"extended"?: boolean,"id"?: string,"piece_id"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "holds_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: true
      referencedRelation: "pieces"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications_log": {
                  Row: {
                    "body_html": string,"channel": Database["public"]['Enums']["notif_channel"],"created_at": string,"error": string | null,"id": string,"order_id": string | null,"provider_id": string | null,"status": Database["public"]['Enums']["notif_status"],"subject": string,"template": string,"to_address": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_html"?: string,"channel"?: Database["public"]['Enums']["notif_channel"],"created_at"?: string,"error"?: string | null,"id"?: string,"order_id"?: string | null,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["notif_status"],"subject"?: string,"template": string,"to_address": string
                  }
                  Update: {
                    "body_html"?: string,"channel"?: Database["public"]['Enums']["notif_channel"],"created_at"?: string,"error"?: string | null,"id"?: string,"order_id"?: string | null,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["notif_status"],"subject"?: string,"template"?: string,"to_address"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_log_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "committed": boolean,"id": string,"order_id": string,"piece_id": string,"price_cents": number,"seller_id": string | null,"store_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "committed"?: boolean,"id"?: string,"order_id": string,"piece_id": string,"price_cents": number,"seller_id"?: string | null,"store_id": string,"title": string
                  }
                  Update: {
                    "committed"?: boolean,"id"?: string,"order_id"?: string,"piece_id"?: string,"price_cents"?: number,"seller_id"?: string | null,"store_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: false
      referencedRelation: "pieces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "sellers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "created_at": string,"customer_id": string,"failure_reason": string | null,"fulfillment": Database["public"]['Enums']["fulfillment"],"id": string,"idempotency_key": string,"number": string,"paid_at": string | null,"payment_provider": string,"payment_ref": string | null,"public_token": string,"session_id": string,"ship_address": Json | null,"shipping_cents": number,"status": Database["public"]['Enums']["order_status"],"store_id": string | null,"subtotal_cents": number,"tax_cents": number,"total_cents": number,"tracking_carrier": string | null,"tracking_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"failure_reason"?: string | null,"fulfillment": Database["public"]['Enums']["fulfillment"],"id"?: string,"idempotency_key": string,"number"?: string,"paid_at"?: string | null,"payment_provider"?: string,"payment_ref"?: string | null,"public_token"?: string,"session_id": string,"ship_address"?: Json | null,"shipping_cents"?: number,"status"?: Database["public"]['Enums']["order_status"],"store_id"?: string | null,"subtotal_cents": number,"tax_cents"?: number,"total_cents": number,"tracking_carrier"?: string | null,"tracking_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"failure_reason"?: string | null,"fulfillment"?: Database["public"]['Enums']["fulfillment"],"id"?: string,"idempotency_key"?: string,"number"?: string,"paid_at"?: string | null,"payment_provider"?: string,"payment_ref"?: string | null,"public_token"?: string,"session_id"?: string,"ship_address"?: Json | null,"shipping_cents"?: number,"status"?: Database["public"]['Enums']["order_status"],"store_id"?: string | null,"subtotal_cents"?: number,"tax_cents"?: number,"total_cents"?: number,"tracking_carrier"?: string | null,"tracking_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "event_id": string,"id": string,"payload": NonNullable<Json>,"processed_at": string | null,"provider": string,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "event_id": string,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "event_id"?: string,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"piece_events": {
                  Row: {
                    "actor_id": string | null,"actor_label": string,"at": string,"from_status": Database["public"]['Enums']["piece_status"] | null,"id": number,"piece_id": string,"reason": string | null,"to_status": Database["public"]['Enums']["piece_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_label"?: string,"at"?: string,"from_status"?: Database["public"]['Enums']["piece_status"] | null,"id"?: never,"piece_id": string,"reason"?: string | null,"to_status": Database["public"]['Enums']["piece_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_label"?: string,"at"?: string,"from_status"?: Database["public"]['Enums']["piece_status"] | null,"id"?: never,"piece_id"?: string,"reason"?: string | null,"to_status"?: Database["public"]['Enums']["piece_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "piece_events_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: false
      referencedRelation: "pieces"
      referencedColumns: ["id"]
    }
                  ]
                },"piece_photos": {
                  Row: {
                    "blur_data_url": string | null,"created_at": string,"height": number | null,"id": string,"kind": Database["public"]['Enums']["photo_kind"],"path": string,"piece_id": string,"position": number,"source": Database["public"]['Enums']["photo_source"],"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "blur_data_url"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["photo_kind"],"path": string,"piece_id": string,"position"?: number,"source"?: Database["public"]['Enums']["photo_source"],"width"?: number | null
                  }
                  Update: {
                    "blur_data_url"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["photo_kind"],"path"?: string,"piece_id"?: string,"position"?: number,"source"?: Database["public"]['Enums']["photo_source"],"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "piece_photos_piece_id_fkey"
      columns: ["piece_id"]
isOneToOne: false
      referencedRelation: "pieces"
      referencedColumns: ["id"]
    }
                  ]
                },"pieces": {
                  Row: {
                    "authenticity_notes": string,"category_id": string,"condition": Database["public"]['Enums']["condition_grade"],"condition_notes": string,"created_at": string,"description": string,"era": string,"featured_rank": number | null,"held_until": string | null,"id": string,"just_dropped_until": string | null,"live_at": string | null,"measurements": NonNullable<Json>,"price_cents": number,"price_is_placeholder": boolean,"seller_id": string | null,"size": string,"slug": string,"sold_at": string | null,"sold_order_id": string | null,"sold_via": Database["public"]['Enums']["sold_via"] | null,"status": Database["public"]['Enums']["piece_status"],"store_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "authenticity_notes"?: string,"category_id": string,"condition"?: Database["public"]['Enums']["condition_grade"],"condition_notes"?: string,"created_at"?: string,"description"?: string,"era"?: string,"featured_rank"?: number | null,"held_until"?: string | null,"id"?: string,"just_dropped_until"?: string | null,"live_at"?: string | null,"measurements"?: NonNullable<Json>,"price_cents": number,"price_is_placeholder"?: boolean,"seller_id"?: string | null,"size"?: string,"slug": string,"sold_at"?: string | null,"sold_order_id"?: string | null,"sold_via"?: Database["public"]['Enums']["sold_via"] | null,"status"?: Database["public"]['Enums']["piece_status"],"store_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "authenticity_notes"?: string,"category_id"?: string,"condition"?: Database["public"]['Enums']["condition_grade"],"condition_notes"?: string,"created_at"?: string,"description"?: string,"era"?: string,"featured_rank"?: number | null,"held_until"?: string | null,"id"?: string,"just_dropped_until"?: string | null,"live_at"?: string | null,"measurements"?: NonNullable<Json>,"price_cents"?: number,"price_is_placeholder"?: boolean,"seller_id"?: string | null,"size"?: string,"slug"?: string,"sold_at"?: string | null,"sold_order_id"?: string | null,"sold_via"?: Database["public"]['Enums']["sold_via"] | null,"status"?: Database["public"]['Enums']["piece_status"],"store_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pieces_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "sellers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_sold_order_fk"
      columns: ["sold_order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pieces_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"store_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"id": string,"role": Database["public"]['Enums']["user_role"],"store_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"store_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "author": string,"confirmed": boolean,"created_at": string,"id": string,"quote": string,"sort": number,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string,"confirmed"?: boolean,"created_at"?: string,"id"?: string,"quote": string,"sort"?: number,"source"?: string
                  }
                  Update: {
                    "author"?: string,"confirmed"?: boolean,"created_at"?: string,"id"?: string,"quote"?: string,"sort"?: number,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sellers": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"instagram": string,"is_placeholder": boolean,"name": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"instagram"?: string,"is_placeholder"?: boolean,"name": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"instagram"?: string,"is_placeholder"?: boolean,"name"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "allow_placeholder_prices": boolean,"google_rating": number | null,"google_review_count": number | null,"hold_minutes": number,"id": boolean,"max_holds_per_session": number,"shipping_flat_cents": number,"shipping_is_placeholder": boolean,"sold_visible_days": number,"tax_rate": number,"ticker_messages": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_placeholder_prices"?: boolean,"google_rating"?: number | null,"google_review_count"?: number | null,"hold_minutes"?: number,"id"?: boolean,"max_holds_per_session"?: number,"shipping_flat_cents"?: number,"shipping_is_placeholder"?: boolean,"sold_visible_days"?: number,"tax_rate"?: number,"ticker_messages"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "allow_placeholder_prices"?: boolean,"google_rating"?: number | null,"google_review_count"?: number | null,"hold_minutes"?: number,"id"?: boolean,"max_holds_per_session"?: number,"shipping_flat_cents"?: number,"shipping_is_placeholder"?: boolean,"sold_visible_days"?: number,"tax_rate"?: number,"ticker_messages"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stores": {
                  Row: {
                    "address": string,"created_at": string,"hours": NonNullable<Json>,"hours_confirmed": boolean,"id": string,"instagram": string,"location_note": string,"maps_query": string,"name": string,"photo_path": string | null,"slug": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"created_at"?: string,"hours"?: NonNullable<Json>,"hours_confirmed"?: boolean,"id"?: string,"instagram"?: string,"location_note"?: string,"maps_query"?: string,"name": string,"photo_path"?: string | null,"slug": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"hours"?: NonNullable<Json>,"hours_confirmed"?: boolean,"id"?: string,"instagram"?: string,"location_note"?: string,"maps_query"?: string,"name"?: string,"photo_path"?: string | null,"slug"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscribers": {
                  Row: {
                    "consent_at": string,"consent_ip_hash": string | null,"consent_text": string,"consent_user_agent": string | null,"created_at": string,"email": string | null,"id": string,"phone": string | null,"source": string,"unsubscribe_token": string,"unsubscribed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at"?: string,"consent_ip_hash"?: string | null,"consent_text": string,"consent_user_agent"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"phone"?: string | null,"source"?: string,"unsubscribe_token"?: string,"unsubscribed_at"?: string | null
                  }
                  Update: {
                    "consent_at"?: string,"consent_ip_hash"?: string | null,"consent_text"?: string,"consent_user_agent"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"phone"?: string | null,"source"?: string,"unsubscribe_token"?: string,"unsubscribed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "advance_order":
{ Args: { "p_action": string,"p_carrier"?: string,"p_order": string,"p_tracking"?: string }; Returns: Json
                           },
"app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"app_store":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_manage_store":
{ Args: { "p_store": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: Json
                           },
"clear_old_badges":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"create_hold":
{ Args: { "p_piece": string,"p_session": string }; Returns: Json
                           },
"create_pending_order":
{ Args: { "p_email": string,"p_fulfillment": Database["public"]['Enums']["fulfillment"],"p_idempotency_key": string,"p_name": string,"p_phone": string,"p_provider": string,"p_session": string,"p_ship_address": Json,"p_store_slug": string }; Returns: Json
                           },
"customer_visible_to_staff":
{ Args: { "p_customer": string }; Returns: boolean
                           },
"drops_needing_alert":
{ Args: Record<PropertyKey, never>; Returns: {
              "alert_on_release": boolean,
"alert_sent_at": string | null,
"created_at": string,
"id": string,
"name": string,
"released_at": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["drop_status"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "drops"
        isOneToOne: false
        isSetofReturn: true
      } },
"expire_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"extend_holds_for_checkout":
{ Args: { "p_minutes"?: number,"p_session": string }; Returns: number
                           },
"finalize_order":
{ Args: { "p_order": string,"p_payment_ref": string }; Returns: Json
                           },
"get_my_bag":
{ Args: { "p_session": string }; Returns: Json
                           },
"get_order_by_token":
{ Args: { "p_token": string }; Returns: Json
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_order_refunded":
{ Args: { "p_order": string,"p_refund_ref": string }; Returns: undefined
                           },
"mark_sold_in_store":
{ Args: { "p_piece": string }; Returns: Json
                           },
"order_visible_to_staff":
{ Args: { "p_order": string }; Returns: boolean
                           },
"prune_rate_limits":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"release_due_drops":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"release_hold":
{ Args: { "p_piece": string,"p_session": string }; Returns: boolean
                           },
"release_hold_admin":
{ Args: { "p_piece": string }; Returns: Json
                           },
"require_staff":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"set_piece_status":
{ Args: { "p_piece": string,"p_reason"?: string,"p_to": Database["public"]['Enums']["piece_status"] }; Returns: Json
                           },
"subscribe_alerts":
{ Args: { "p_consent_text": string,"p_email": string,"p_ip_hash": string,"p_phone": string,"p_source": string,"p_user_agent": string }; Returns: Json
                           },
"unsubscribe_by_token":
{ Args: { "p_token": string }; Returns: boolean
                           }
          }
          Enums: {
            "condition_grade": "like_new"|"great"|"light_wear"|"worn_in","drop_status": "scheduled"|"live"|"cancelled","fulfillment": "pickup"|"ship","measurement_kind": "tops"|"bottoms"|"collectible"|"game","notif_channel": "email"|"sms","notif_status": "outbox"|"sent"|"failed","order_status": "pending"|"paid"|"bagged"|"ready"|"picked_up"|"packed"|"shipped"|"cancelled"|"refunded"|"refund_pending","photo_kind": "front"|"back"|"tag"|"flaw"|"detail","photo_source": "public"|"storage","piece_status": "draft"|"live"|"held"|"sold"|"archived","sold_via": "online"|"in_store","user_role": "owner"|"staff"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "condition_grade": ["like_new", "great", "light_wear", "worn_in"],"drop_status": ["scheduled", "live", "cancelled"],"fulfillment": ["pickup", "ship"],"measurement_kind": ["tops", "bottoms", "collectible", "game"],"notif_channel": ["email", "sms"],"notif_status": ["outbox", "sent", "failed"],"order_status": ["pending", "paid", "bagged", "ready", "picked_up", "packed", "shipped", "cancelled", "refunded", "refund_pending"],"photo_kind": ["front", "back", "tag", "flaw", "detail"],"photo_source": ["public", "storage"],"piece_status": ["draft", "live", "held", "sold", "archived"],"sold_via": ["online", "in_store"],"user_role": ["owner", "staff"]
          }
        }
} as const

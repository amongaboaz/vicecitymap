/**
 * Database types for ViceCityMap, matching supabase/migrations.
 * Regenerate with:  npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * (keep the convenience aliases at the bottom when regenerating).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccessLevel = "free" | "premium";
export type VerificationStatus = "unverified" | "community" | "verified";
export type ProgressStatus = "found" | "completed";
export type PurchaseStatus = "pending" | "paid" | "failed" | "expired" | "refunded";
export type AdminRole = "admin" | "editor";

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null } & Timestamps;
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; avatar_url?: string | null; updated_at?: string };
        Relationships: [];
      };
      admin_roles: {
        Row: { user_id: string; role: AdminRole; granted_by: string | null; created_at: string };
        Insert: { user_id: string; role?: AdminRole; granted_by?: string | null; created_at?: string };
        Update: { role?: AdminRole; granted_by?: string | null };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          is_premium: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string;
          is_premium?: boolean;
          sort_order?: number;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          is_premium?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      discoveries: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string;
          description: string;
          category_id: string;
          map_x: number;
          map_y: number;
          access_level: AccessLevel;
          verification_status: VerificationStatus;
          is_published: boolean;
          is_demo: boolean;
          source_note: string | null;
          created_by: string | null;
          verified_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary?: string;
          description?: string;
          category_id: string;
          map_x: number;
          map_y: number;
          access_level?: AccessLevel;
          verification_status?: VerificationStatus;
          is_published?: boolean;
          is_demo?: boolean;
          source_note?: string | null;
          created_by?: string | null;
          verified_at?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          summary?: string;
          description?: string;
          category_id?: string;
          map_x?: number;
          map_y?: number;
          access_level?: AccessLevel;
          verification_status?: VerificationStatus;
          is_published?: boolean;
          is_demo?: boolean;
          source_note?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "discoveries_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      discovery_premium_details: {
        Row: { discovery_id: string; details: string; updated_at: string };
        Insert: { discovery_id: string; details?: string; updated_at?: string };
        Update: { details?: string };
        Relationships: [
          { foreignKeyName: "discovery_premium_details_discovery_id_fkey"; columns: ["discovery_id"]; isOneToOne: true; referencedRelation: "discoveries"; referencedColumns: ["id"] },
        ];
      };
      discovery_images: {
        Row: { id: string; discovery_id: string; storage_path: string; alt: string; sort_order: number; created_at: string };
        Insert: { id?: string; discovery_id: string; storage_path: string; alt?: string; sort_order?: number };
        Update: { alt?: string; sort_order?: number };
        Relationships: [
          { foreignKeyName: "discovery_images_discovery_id_fkey"; columns: ["discovery_id"]; isOneToOne: false; referencedRelation: "discoveries"; referencedColumns: ["id"] },
        ];
      };
      user_progress: {
        Row: { id: string; user_id: string; discovery_id: string; status: ProgressStatus } & Timestamps;
        Insert: { id?: string; user_id: string; discovery_id: string; status?: ProgressStatus };
        Update: { status?: ProgressStatus };
        Relationships: [
          { foreignKeyName: "user_progress_discovery_id_fkey"; columns: ["discovery_id"]; isOneToOne: false; referencedRelation: "discoveries"; referencedColumns: ["id"] },
        ];
      };
      saved_locations: {
        Row: {
          id: string;
          user_id: string;
          discovery_id: string | null;
          label: string;
          note: string | null;
          map_x: number;
          map_y: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          discovery_id?: string | null;
          label: string;
          note?: string | null;
          map_x: number;
          map_y: number;
        };
        Update: { label?: string; note?: string | null };
        Relationships: [
          { foreignKeyName: "saved_locations_discovery_id_fkey"; columns: ["discovery_id"]; isOneToOne: false; referencedRelation: "discoveries"; referencedColumns: ["id"] },
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_reference: string | null;
          provider_payment_id: string | null;
          product_code: string;
          amount_cents: number;
          currency: string;
          status: PurchaseStatus;
          paid_at: string | null;
          refunded_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_reference?: string | null;
          provider_payment_id?: string | null;
          product_code: string;
          amount_cents: number;
          currency: string;
          status?: PurchaseStatus;
        };
        Update: {
          provider_reference?: string | null;
          provider_payment_id?: string | null;
          status?: PurchaseStatus;
          paid_at?: string | null;
          refunded_at?: string | null;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          product_code: string;
          purchase_id: string | null;
          granted_at: string;
          revoked_at: string | null;
          revoke_reason: string | null;
        };
        Insert: { id?: string; user_id: string; product_code: string; purchase_id?: string | null };
        Update: { revoked_at?: string | null; revoke_reason?: string | null };
        Relationships: [
          { foreignKeyName: "entitlements_purchase_id_fkey"; columns: ["purchase_id"]; isOneToOne: false; referencedRelation: "purchases"; referencedColumns: ["id"] },
        ];
      };
      payment_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          event_type: string;
          purchase_id: string | null;
          outcome: string;
          detail: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean };
      has_lifetime_access: { Args: { uid?: string }; Returns: boolean };
      discovery_counts: {
        Args: Record<PropertyKey, never>;
        Returns: { category_id: string; access_level: AccessLevel; total: number }[];
      };
      fulfill_purchase: {
        Args: {
          p_provider: string;
          p_event_id: string;
          p_event_type: string;
          p_purchase_id: string;
          p_user_id: string;
          p_provider_reference: string;
          p_provider_payment_id: string | null;
          p_product_code: string;
          p_amount_cents: number;
          p_currency: string;
        };
        Returns: string;
      };
      refund_purchase: {
        Args: { p_provider: string; p_event_id: string; p_event_type: string; p_provider_payment_id: string };
        Returns: string;
      };
      record_payment_event: {
        Args: {
          p_provider: string;
          p_event_id: string;
          p_event_type: string;
          p_purchase_id: string | null;
          p_outcome: string;
          p_detail: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      access_level: AccessLevel;
      verification_status: VerificationStatus;
      progress_status: ProgressStatus;
      purchase_status: PurchaseStatus;
      admin_role: AdminRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];

export type Category = Tables<"categories">;
export type Discovery = Tables<"discoveries">;
export type Purchase = Tables<"purchases">;
export type Entitlement = Tables<"entitlements">;

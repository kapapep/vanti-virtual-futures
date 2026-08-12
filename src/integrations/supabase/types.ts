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
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_price_history: {
        Row: {
          id: string
          market_id: string
          recorded_at: string
          yes_price: number
        }
        Insert: {
          id?: string
          market_id: string
          recorded_at?: string
          yes_price: number
        }
        Update: {
          id?: string
          market_id?: string
          recorded_at?: string
          yes_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_price_history_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          outcome: string | null
          question: string
          resolution_criteria: string | null
          resolution_date: string
          resolution_source: string | null
          status: string
          trader_count: number
          volume: number
          yes_price: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          question: string
          resolution_criteria?: string | null
          resolution_date: string
          resolution_source?: string | null
          status?: string
          trader_count?: number
          volume?: number
          yes_price?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          question?: string
          resolution_criteria?: string | null
          resolution_date?: string
          resolution_source?: string | null
          status?: string
          trader_count?: number
          volume?: number
          yes_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "markets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          avg_price: number
          contracts: number
          id: string
          market_id: string
          side: string
          syndicate_id: string | null
          user_id: string
        }
        Insert: {
          avg_price: number
          contracts?: number
          id?: string
          market_id: string
          side: string
          syndicate_id?: string | null
          user_id: string
        }
        Update: {
          avg_price?: number
          contracts?: number
          id?: string
          market_id?: string
          side?: string
          syndicate_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          audio_url: string | null
          body: string
          created_at: string
          id: string
          image_url: string | null
          market_id: string | null
          parent_id: string | null
          syndicate_id: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          market_id?: string | null
          parent_id?: string | null
          syndicate_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          market_id?: string | null
          parent_id?: string | null
          syndicate_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count_display: number | null
          hide_following: boolean
          id: string
          is_admin: boolean
          suspended_until: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count_display?: number | null
          hide_following?: boolean
          id: string
          is_admin?: boolean
          suspended_until?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count_display?: number | null
          hide_following?: boolean
          id?: string
          is_admin?: boolean
          suspended_until?: string | null
          username?: string
        }
        Relationships: []
      }
      reposts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_contributions: {
        Row: {
          amount: number
          created_at: string
          id: string
          price_at_entry: number
          shares_bought: number
          syndicate_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          price_at_entry: number
          shares_bought: number
          syndicate_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          price_at_entry?: number
          shares_bought?: number
          syndicate_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_contributions_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          entry_type: Database["public"]["Enums"]["syndicate_ledger_entry"]
          id: string
          metadata: Json
          syndicate_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          entry_type: Database["public"]["Enums"]["syndicate_ledger_entry"]
          id?: string
          metadata?: Json
          syndicate_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          entry_type?: Database["public"]["Enums"]["syndicate_ledger_entry"]
          id?: string
          metadata?: Json
          syndicate_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_ledger_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_members: {
        Row: {
          contributed: number
          id: string
          joined_at: string
          shares_owned: number
          syndicate_id: string
          user_id: string
        }
        Insert: {
          contributed?: number
          id?: string
          joined_at?: string
          shares_owned?: number
          syndicate_id: string
          user_id: string
        }
        Update: {
          contributed?: number
          id?: string
          joined_at?: string
          shares_owned?: number
          syndicate_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_members_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicates: {
        Row: {
          captain_fee_bps: number
          captain_id: string
          created_at: string
          description: string | null
          id: string
          lock_at: string
          market_id: string
          max_members: number
          min_contribution: number
          name: string
          outcome_side: string
          position_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["syndicate_status"]
          target_stake: number
          total_contributed: number
          total_shares: number
          updated_at: string
          visibility: Database["public"]["Enums"]["syndicate_visibility"]
        }
        Insert: {
          captain_fee_bps?: number
          captain_id: string
          created_at?: string
          description?: string | null
          id?: string
          lock_at: string
          market_id: string
          max_members?: number
          min_contribution?: number
          name: string
          outcome_side: string
          position_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["syndicate_status"]
          target_stake: number
          total_contributed?: number
          total_shares?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["syndicate_visibility"]
        }
        Update: {
          captain_fee_bps?: number
          captain_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lock_at?: string
          market_id?: string
          max_members?: number
          min_contribution?: number
          name?: string
          outcome_side?: string
          position_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["syndicate_status"]
          target_stake?: number
          total_contributed?: number
          total_shares?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["syndicate_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "syndicates_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          action: string
          contracts: number
          created_at: string
          id: string
          market_id: string
          price: number
          side: string
          total: number
          user_id: string
        }
        Insert: {
          action: string
          contracts: number
          created_at?: string
          id?: string
          market_id: string
          price: number
          side: string
          total: number
          user_id: string
        }
        Update: {
          action?: string
          contracts?: number
          created_at?: string
          id?: string
          market_id?: string
          price?: number
          side?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          trade_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          trade_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          trade_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string
          market_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          market_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          market_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_virtual_cash: { Args: { p_amount: number }; Returns: Json }
      cancel_syndicate: {
        Args: { p_reason?: string; p_syndicate_id: string }
        Returns: Json
      }
      execute_trade: {
        Args: {
          p_action: string
          p_amount: number
          p_market_id: string
          p_side: string
        }
        Returns: Json
      }
      is_syndicate_member: {
        Args: { p_syndicate_id: string; p_user_id: string }
        Returns: boolean
      }
      join_syndicate: {
        Args: { p_amount: number; p_syndicate_id: string }
        Returns: Json
      }
      process_syndicate_locks: { Args: never; Returns: Json }
      record_explicit_violation: { Args: { p_reason?: string }; Returns: Json }
      reset_virtual_balance: { Args: never; Returns: Json }
      resolve_market: {
        Args: { p_market_id: string; p_outcome: string }
        Returns: Json
      }
      sell_position: {
        Args: { p_contracts: number; p_market_id: string; p_side: string }
        Returns: Json
      }
      settle_syndicate: {
        Args: { p_result?: string; p_syndicate_id: string }
        Returns: Json
      }
      withdraw_virtual_cash: { Args: { p_amount: number }; Returns: Json }
    }
    Enums: {
      syndicate_ledger_entry: "contribution" | "payout" | "refund" | "fee"
      syndicate_status: "open" | "locked" | "settled" | "cancelled"
      syndicate_visibility: "public" | "invite_only"
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
      syndicate_ledger_entry: ["contribution", "payout", "refund", "fee"],
      syndicate_status: ["open", "locked", "settled", "cancelled"],
      syndicate_visibility: ["public", "invite_only"],
    },
  },
} as const

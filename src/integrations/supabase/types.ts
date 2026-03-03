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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_password: string
          id: string
        }
        Insert: {
          admin_password?: string
          id?: string
        }
        Update: {
          admin_password?: string
          id?: string
        }
        Relationships: []
      }
      cafe_scenarios: {
        Row: {
          barista_line: string
          created_at: string
          hint_ru: string
          hint_uk: string
          id: string
          level: string
          options: Json
          sort_order: number | null
          timer_sec: number
        }
        Insert: {
          barista_line: string
          created_at?: string
          hint_ru?: string
          hint_uk?: string
          id?: string
          level?: string
          options?: Json
          sort_order?: number | null
          timer_sec?: number
        }
        Update: {
          barista_line?: string
          created_at?: string
          hint_ru?: string
          hint_uk?: string
          id?: string
          level?: string
          options?: Json
          sort_order?: number | null
          timer_sec?: number
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: string
          challenger_answers: Json | null
          challenger_id: string
          challenger_score: number
          created_at: string
          id: string
          level: string
          opponent_answers: Json | null
          opponent_id: string
          opponent_score: number
          questions: Json
          status: string
          updated_at: string
          winner_id: string | null
          xp_reward: number
        }
        Insert: {
          challenge_type?: string
          challenger_answers?: Json | null
          challenger_id: string
          challenger_score?: number
          created_at?: string
          id?: string
          level?: string
          opponent_answers?: Json | null
          opponent_id: string
          opponent_score?: number
          questions?: Json
          status?: string
          updated_at?: string
          winner_id?: string | null
          xp_reward?: number
        }
        Update: {
          challenge_type?: string
          challenger_answers?: Json | null
          challenger_id?: string
          challenger_score?: number
          created_at?: string
          id?: string
          level?: string
          opponent_answers?: Json | null
          opponent_id?: string
          opponent_score?: number
          questions?: Json
          status?: string
          updated_at?: string
          winner_id?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_words: {
        Row: {
          article: string | null
          created_at: string
          example: string | null
          german: string
          id: string
          is_difficult: boolean
          russian: string
          user_id: string
        }
        Insert: {
          article?: string | null
          created_at?: string
          example?: string | null
          german: string
          id?: string
          is_difficult?: boolean
          russian: string
          user_id: string
        }
        Update: {
          article?: string | null
          created_at?: string
          example?: string | null
          german?: string
          id?: string
          is_difficult?: boolean
          russian?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_bonuses: {
        Row: {
          created_at: string
          id: string
          last_claimed_at: string
          streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_claimed_at?: string
          streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_claimed_at?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      demo_leaderboard: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          total_xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          total_xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          total_xp?: number
        }
        Relationships: []
      }
      grammar_lessons: {
        Row: {
          created_at: string
          id: string
          level: string
          theory: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          theory: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          theory?: string
          topic?: string
        }
        Relationships: []
      }
      grammar_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          level: string
          options: string[]
          question: string
          sort_order: number | null
          topic: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          level: string
          options: string[]
          question: string
          sort_order?: number | null
          topic?: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          level?: string
          options?: string[]
          question?: string
          sort_order?: number | null
          topic?: string
        }
        Relationships: []
      }
      listening_dictations: {
        Row: {
          created_at: string
          id: string
          listening_id: string
          sentence: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          listening_id: string
          sentence: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          listening_id?: string
          sentence?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_dictations_listening_id_fkey"
            columns: ["listening_id"]
            isOneToOne: false
            referencedRelation: "listening_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          listening_id: string
          options: string[]
          question: string
          sort_order: number | null
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          listening_id: string
          options: string[]
          question: string
          sort_order?: number | null
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          listening_id?: string
          options?: string[]
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_questions_listening_id_fkey"
            columns: ["listening_id"]
            isOneToOne: false
            referencedRelation: "listening_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_texts: {
        Row: {
          created_at: string
          id: string
          level: string
          sort_order: number | null
          text: string
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          sort_order?: number | null
          text: string
          title: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          sort_order?: number | null
          text?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_active: string | null
          telegram_chat_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_active?: string | null
          telegram_chat_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_active?: string | null
          telegram_chat_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: string[]
          question: string
          reading_id: string
          sort_order: number | null
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: string[]
          question: string
          reading_id: string
          sort_order?: number | null
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: string[]
          question?: string
          reading_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_questions_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "reading_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_texts: {
        Row: {
          created_at: string
          id: string
          level: string
          sort_order: number | null
          text: string
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          sort_order?: number | null
          text: string
          title: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          sort_order?: number | null
          text?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      referral_challenges: {
        Row: {
          challenge_type: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          referred_id: string
          referrer_id: string
          reward_type: string
          reward_value: string
          target_value: number
        }
        Insert: {
          challenge_type: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          referred_id: string
          referrer_id: string
          reward_type: string
          reward_value: string
          target_value?: number
        }
        Update: {
          challenge_type?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_type?: string
          reward_value?: string
          target_value?: number
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      saved_words: {
        Row: {
          id: string
          is_difficult: boolean
          learned_at: string
          user_id: string
          vocab_card_id: string
        }
        Insert: {
          id?: string
          is_difficult?: boolean
          learned_at?: string
          user_id: string
          vocab_card_id: string
        }
        Update: {
          id?: string
          is_difficult?: boolean
          learned_at?: string
          user_id?: string
          vocab_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_words_vocab_card_id_fkey"
            columns: ["vocab_card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          available: boolean
          content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          item_type: string
          price: number
          title: string
        }
        Insert: {
          available?: boolean
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          price?: number
          title: string
        }
        Update: {
          available?: boolean
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          price?: number
          title?: string
        }
        Relationships: []
      }
      translation_overrides: {
        Row: {
          id: string
          key: string
          lang: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          lang: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          lang?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          category: string
          completed: boolean | null
          created_at: string
          data: Json | null
          exercise_id: string
          id: string
          level: string
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean | null
          created_at?: string
          data?: Json | null
          exercise_id: string
          id?: string
          level: string
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean | null
          created_at?: string
          data?: Json | null
          exercise_id?: string
          id?: string
          level?: string
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_xp: {
        Row: {
          id: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocab_cards: {
        Row: {
          article: string | null
          created_at: string
          example: string | null
          german: string
          id: string
          level: string
          russian: string
          sort_order: number | null
          topic: string
        }
        Insert: {
          article?: string | null
          created_at?: string
          example?: string | null
          german: string
          id?: string
          level: string
          russian: string
          sort_order?: number | null
          topic?: string
        }
        Update: {
          article?: string | null
          created_at?: string
          example?: string | null
          german?: string
          id?: string
          level?: string
          russian?: string
          sort_order?: number | null
          topic?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_referral: { Args: { p_referred_id: string }; Returns: undefined }
      admin_set_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: undefined
      }
      apply_referral_code: {
        Args: { p_code: string; p_referred_id: string }
        Returns: boolean
      }
      award_coins: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      award_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      check_admin_password: {
        Args: { input_password: string }
        Returns: boolean
      }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          coin_balance: number
          display_name: string
          email: string
          last_active: string
          roles: string[]
          total_xp: number
          user_created_at: string
          user_id: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      get_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_referrals: number
          total_referrals: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
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

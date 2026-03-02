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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
      award_coins: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      check_admin_password: {
        Args: { input_password: string }
        Returns: boolean
      }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
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

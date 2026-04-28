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
      community_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          image_urls: Json | null
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_code: string
          course_id: string | null
          final_score: number | null
          id: string
          issued_at: string | null
          user_id: string
        }
        Insert: {
          certificate_code: string
          course_id?: string | null
          final_score?: number | null
          id?: string
          issued_at?: string | null
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string | null
          final_score?: number | null
          id?: string
          issued_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_cohort_messages: {
        Row: {
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_cohort_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          lesson_id: string | null
          score: number | null
          status: string | null
          user_answers: Json | null
          user_id: string
          video_watched_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          score?: number | null
          status?: string | null
          user_answers?: Json | null
          user_id: string
          video_watched_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          score?: number | null
          status?: string | null
          user_answers?: Json | null
          user_id?: string
          video_watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          coins_reward: number | null
          content: Json | null
          course_id: string
          created_at: string
          description: string | null
          estimated_minutes: number | null
          exercises: Json
          id: string
          is_free_preview: boolean | null
          lesson_type: string | null
          module_id: string | null
          sort_order: number | null
          theory: string
          title: string
          video_duration_sec: number | null
          video_subtitles_url: string | null
          video_url: string | null
          xp_reward: number | null
        }
        Insert: {
          coins_reward?: number | null
          content?: Json | null
          course_id: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          exercises?: Json
          id?: string
          is_free_preview?: boolean | null
          lesson_type?: string | null
          module_id?: string | null
          sort_order?: number | null
          theory?: string
          title: string
          video_duration_sec?: number | null
          video_subtitles_url?: string | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Update: {
          coins_reward?: number | null
          content?: Json | null
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          exercises?: Json
          id?: string
          is_free_preview?: boolean | null
          lesson_type?: string | null
          module_id?: string | null
          sort_order?: number | null
          theory?: string
          title?: string
          video_duration_sec?: number | null
          video_subtitles_url?: string | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_free_preview: boolean | null
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free_preview?: boolean | null
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free_preview?: boolean | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_notebooks: {
        Row: {
          auto_words: Json | null
          content: string | null
          course_id: string | null
          id: string
          lesson_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_words?: Json | null
          content?: string | null
          course_id?: string | null
          id?: string
          lesson_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_words?: Json | null
          content?: string | null
          course_id?: string | null
          id?: string
          lesson_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_notebooks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_notebooks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          course_id: string
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          available: boolean
          cohort_start_date: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          instructor_avatar: string | null
          instructor_bio: string | null
          instructor_name: string | null
          is_featured: boolean | null
          level: string
          outcomes: string[] | null
          price: number
          price_coins: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_hours: number | null
          total_lessons: number | null
          total_modules: number | null
          trailer_url: string | null
        }
        Insert: {
          available?: boolean
          cohort_start_date?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructor_avatar?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_featured?: boolean | null
          level?: string
          outcomes?: string[] | null
          price?: number
          price_coins?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_hours?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          trailer_url?: string | null
        }
        Update: {
          available?: boolean
          cohort_start_date?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructor_avatar?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_featured?: boolean | null
          level?: string
          outcomes?: string[] | null
          price?: number
          price_coins?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_hours?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          trailer_url?: string | null
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
          last_shield_used_at: string | null
          streak: number
          streak_shields: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_claimed_at?: string
          last_shield_used_at?: string | null
          streak?: number
          streak_shields?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_claimed_at?: string
          last_shield_used_at?: string | null
          streak?: number
          streak_shields?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          ai_requests_used: number
          created_at: string
          games_used: number
          id: string
          lessons_used: number
          usage_date: string
          user_id: string
        }
        Insert: {
          ai_requests_used?: number
          created_at?: string
          games_used?: number
          id?: string
          lessons_used?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          ai_requests_used?: number
          created_at?: string
          games_used?: number
          id?: string
          lessons_used?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_leaderboard: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          duels_played: number
          duels_won: number
          id: string
          lessons_completed: number
          telegram_chat_id: number | null
          total_xp: number
          words_learned: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          duels_played?: number
          duels_won?: number
          id?: string
          lessons_completed?: number
          telegram_chat_id?: number | null
          total_xp?: number
          words_learned?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          duels_played?: number
          duels_won?: number
          id?: string
          lessons_completed?: number
          telegram_chat_id?: number | null
          total_xp?: number
          words_learned?: number
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          image_urls: Json | null
          is_read: boolean
          receiver_id: string
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          sender_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          is_read?: boolean
          receiver_id: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          is_read?: boolean
          receiver_id?: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_items: {
        Row: {
          available: boolean
          category: string
          created_at: string
          description_ru: string | null
          description_uk: string | null
          emoji: string
          id: string
          image_url: string | null
          name: string
          price: number
          rarity: string
          sort_order: number | null
        }
        Insert: {
          available?: boolean
          category?: string
          created_at?: string
          description_ru?: string | null
          description_uk?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          rarity?: string
          sort_order?: number | null
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description_ru?: string | null
          description_uk?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          rarity?: string
          sort_order?: number | null
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
      kids_placement_questions: {
        Row: {
          correct: number
          created_at: string
          emoji: string
          hint_ru: string | null
          id: string
          level: string
          options: Json
          question_de: string
          sort_order: number | null
        }
        Insert: {
          correct: number
          created_at?: string
          emoji?: string
          hint_ru?: string | null
          id?: string
          level: string
          options: Json
          question_de: string
          sort_order?: number | null
        }
        Update: {
          correct?: number
          created_at?: string
          emoji?: string
          hint_ru?: string | null
          id?: string
          level?: string
          options?: Json
          question_de?: string
          sort_order?: number | null
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
          audio_url: string | null
          created_at: string
          id: string
          level: string
          sort_order: number | null
          text: string
          title: string
          topic: string
          voice_config: Json | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          level: string
          sort_order?: number | null
          text: string
          title: string
          topic?: string
          voice_config?: Json | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          level?: string
          sort_order?: number | null
          text?: string
          title?: string
          topic?: string
          voice_config?: Json | null
        }
        Relationships: []
      }
      placement_questions: {
        Row: {
          correct: number
          created_at: string | null
          id: string
          level: string
          options: Json
          question_de: string
          sort_order: number | null
        }
        Insert: {
          correct: number
          created_at?: string | null
          id?: string
          level: string
          options: Json
          question_de: string
          sort_order?: number | null
        }
        Update: {
          correct?: number
          created_at?: string | null
          id?: string
          level?: string
          options?: Json
          question_de?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by_teacher_id: string | null
          daily_goal_minutes: number | null
          display_name: string | null
          id: string
          is_kid: boolean
          language_locked: boolean
          last_active: string | null
          last_reminder_sent_at: string | null
          learning_goal: string | null
          must_change_password: boolean
          nickname: string | null
          nickname_changed_at: string | null
          onboarding_completed: boolean | null
          preferred_lang: string
          recommended_level: string | null
          telegram_chat_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by_teacher_id?: string | null
          daily_goal_minutes?: number | null
          display_name?: string | null
          id?: string
          is_kid?: boolean
          language_locked?: boolean
          last_active?: string | null
          last_reminder_sent_at?: string | null
          learning_goal?: string | null
          must_change_password?: boolean
          nickname?: string | null
          nickname_changed_at?: string | null
          onboarding_completed?: boolean | null
          preferred_lang?: string
          recommended_level?: string | null
          telegram_chat_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by_teacher_id?: string | null
          daily_goal_minutes?: number | null
          display_name?: string | null
          id?: string
          is_kid?: boolean
          language_locked?: boolean
          last_active?: string | null
          last_reminder_sent_at?: string | null
          learning_goal?: string | null
          must_change_password?: boolean
          nickname?: string | null
          nickname_changed_at?: string | null
          onboarding_completed?: boolean | null
          preferred_lang?: string
          recommended_level?: string | null
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
          file_url: string | null
          id: string
          image_url: string | null
          item_type: string
          payment_link: string | null
          price: number
          price_eur: number | null
          title: string
        }
        Insert: {
          available?: boolean
          content?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          payment_link?: string | null
          price?: number
          price_eur?: number | null
          title: string
        }
        Update: {
          available?: boolean
          content?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          payment_link?: string | null
          price?: number
          price_eur?: number | null
          title?: string
        }
        Relationships: []
      }
      srs_cards: {
        Row: {
          created_at: string | null
          custom_word_id: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          repetitions: number | null
          user_id: string
          vocab_card_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_word_id?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id: string
          vocab_card_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_word_id?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id?: string
          vocab_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "srs_cards_custom_word_id_fkey"
            columns: ["custom_word_id"]
            isOneToOne: false
            referencedRelation: "custom_words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_cards_vocab_card_id_fkey"
            columns: ["vocab_card_id"]
            isOneToOne: false
            referencedRelation: "vocab_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_milestones: {
        Row: {
          achieved_at: string | null
          coins_awarded: number
          id: string
          milestone_days: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          coins_awarded: number
          id?: string
          milestone_days: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          coins_awarded?: number
          id?: string
          milestone_days?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_chat_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          lesson_id: string | null
          sender: string
          user_id: string
          video_timecode: number | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lesson_id?: string | null
          sender: string
          user_id: string
          video_timecode?: number | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lesson_id?: string | null
          sender?: string
          user_id?: string
          video_timecode?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_chat_messages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          level: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          level?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          level?: string
          name?: string
          sort_order?: number | null
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
      tutoring_homework: {
        Row: {
          created_at: string
          description: string
          due_at: string | null
          feedback: string | null
          grade: number | null
          id: string
          lesson_id: string
          status: string
          submission: string | null
          submission_files: Json
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          due_at?: string | null
          feedback?: string | null
          grade?: number | null
          id?: string
          lesson_id: string
          status?: string
          submission?: string | null
          submission_files?: Json
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          due_at?: string | null
          feedback?: string | null
          grade?: number | null
          id?: string
          lesson_id?: string
          status?: string
          submission?: string | null
          submission_files?: Json
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_homework_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_lesson_exercises: {
        Row: {
          correct_answer: string | null
          created_at: string
          exercise_type: string
          explanation: string | null
          id: string
          lesson_id: string
          options: Json | null
          question: string
          sort_order: number | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          exercise_type?: string
          explanation?: string | null
          id?: string
          lesson_id: string
          options?: Json | null
          question: string
          sort_order?: number | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          exercise_type?: string
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json | null
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_lesson_recordings: {
        Row: {
          ai_errors: Json | null
          ai_new_words: Json | null
          ai_processed_at: string | null
          ai_summary: string | null
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          lesson_id: string
          status: string
          student_id: string
          teacher_id: string
          transcript: string | null
          updated_at: string
          video_url: string | null
          visibility: string
        }
        Insert: {
          ai_errors?: Json | null
          ai_new_words?: Json | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          lesson_id: string
          status?: string
          student_id: string
          teacher_id: string
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
          visibility?: string
        }
        Update: {
          ai_errors?: Json | null
          ai_new_words?: Json | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          lesson_id?: string
          status?: string
          student_id?: string
          teacher_id?: string
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_lesson_templates: {
        Row: {
          created_at: string
          default_duration_minutes: number
          default_meeting_link: string | null
          description: string | null
          exercise_types: Json
          exercises_count: number
          focus: string | null
          id: string
          level: string
          name: string
          structure: Json
          teacher_id: string
          theory_template: string | null
          topic: string | null
          updated_at: string
          use_count: number
          vocabulary: Json
          words_count: number
        }
        Insert: {
          created_at?: string
          default_duration_minutes?: number
          default_meeting_link?: string | null
          description?: string | null
          exercise_types?: Json
          exercises_count?: number
          focus?: string | null
          id?: string
          level?: string
          name: string
          structure?: Json
          teacher_id: string
          theory_template?: string | null
          topic?: string | null
          updated_at?: string
          use_count?: number
          vocabulary?: Json
          words_count?: number
        }
        Update: {
          created_at?: string
          default_duration_minutes?: number
          default_meeting_link?: string | null
          description?: string | null
          exercise_types?: Json
          exercises_count?: number
          focus?: string | null
          id?: string
          level?: string
          name?: string
          structure?: Json
          teacher_id?: string
          theory_template?: string | null
          topic?: string | null
          updated_at?: string
          use_count?: number
          vocabulary?: Json
          words_count?: number
        }
        Relationships: []
      }
      tutoring_lesson_words: {
        Row: {
          article: string | null
          created_at: string
          example: string | null
          german: string
          id: string
          lesson_id: string
          russian: string
          sort_order: number | null
        }
        Insert: {
          article?: string | null
          created_at?: string
          example?: string | null
          german: string
          id?: string
          lesson_id: string
          russian: string
          sort_order?: number | null
        }
        Update: {
          article?: string | null
          created_at?: string
          example?: string | null
          german?: string
          id?: string
          lesson_id?: string
          russian?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_words_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_lessons: {
        Row: {
          ai_prompt: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          level: string
          meeting_link: string | null
          notes: string | null
          scheduled_at: string | null
          status: string
          student_id: string
          teacher_id: string
          theory: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          ai_prompt?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          level?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          student_id: string
          teacher_id: string
          theory?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          ai_prompt?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          level?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          theory?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tutoring_placement_assignments: {
        Row: {
          ai_analysis: Json | null
          answers: Json
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          question_ids: Json
          recommended_level: string | null
          scores_by_level: Json | null
          selected_levels: Json | null
          started_at: string | null
          status: string
          student_id: string
          teacher_id: string
          total_questions: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_ids?: Json
          recommended_level?: string | null
          scores_by_level?: Json | null
          selected_levels?: Json | null
          started_at?: string | null
          status?: string
          student_id: string
          teacher_id: string
          total_questions?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_ids?: Json
          recommended_level?: string | null
          scores_by_level?: Json | null
          selected_levels?: Json | null
          started_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          total_questions?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tutoring_placement_questions: {
        Row: {
          audio_url: string | null
          context: string | null
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          level: string
          options: Json
          question: string
          question_type: string
          sort_order: number | null
        }
        Insert: {
          audio_url?: string | null
          context?: string | null
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          level: string
          options?: Json
          question: string
          question_type: string
          sort_order?: number | null
        }
        Update: {
          audio_url?: string | null
          context?: string | null
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          level?: string
          options?: Json
          question?: string
          question_type?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      tutoring_relationships: {
        Row: {
          created_at: string
          id: string
          note: string | null
          status: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
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
      user_gifts: {
        Row: {
          created_at: string
          displayed: boolean
          gift_id: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          displayed?: boolean
          gift_id: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          displayed?: boolean
          gift_id?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["id"]
          },
        ]
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
          ukrainian: string
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
          ukrainian?: string
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
          ukrainian?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
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
      complete_course_lesson: {
        Args: {
          p_answers?: Json
          p_lesson_id: string
          p_score?: number
          p_user_id: string
        }
        Returns: Json
      }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          coin_balance: number
          display_name: string
          duels_played: number
          duels_won: number
          email: string
          email_confirmed: boolean
          last_active: string
          lessons_completed: number
          roles: string[]
          total_xp: number
          user_created_at: string
          user_id: string
          words_learned: number
        }[]
      }
      get_course_progress: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: Json
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
      get_user_duel_stats: {
        Args: { p_user_id: string }
        Returns: {
          duels_played: number
          duels_won: number
        }[]
      }
      get_user_learning_stats: {
        Args: { p_user_id: string }
        Returns: {
          lessons_completed: number
          words_learned: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_usage: {
        Args: { p_type: string; p_user_id: string }
        Returns: Json
      }
      is_premium: { Args: { p_user_id: string }; Returns: boolean }
      issue_certificate: {
        Args: { p_course_id: string; p_score: number; p_user_id: string }
        Returns: string
      }
      purchase_course: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: boolean
      }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
      review_srs_card: {
        Args: { p_card_id: string; p_quality: number; p_user_id: string }
        Returns: undefined
      }
      search_teachers: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          nickname: string
          user_id: string
        }[]
      }
      send_gift: {
        Args: {
          p_gift_id: string
          p_message?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher"
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
      app_role: ["admin", "moderator", "user", "teacher"],
    },
  },
} as const

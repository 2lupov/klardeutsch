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
      book_audio: {
        Row: {
          book_id: string
          created_at: string
          duration_seconds: number | null
          file_path: string
          id: string
          lektion_id: string | null
          title: string
          track_no: number | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          id?: string
          lektion_id?: string | null
          title: string
          track_no?: number | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          id?: string
          lektion_id?: string | null
          title?: string
          track_no?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_audio_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_audio_lektion_id_fkey"
            columns: ["lektion_id"]
            isOneToOne: false
            referencedRelation: "book_lektionen"
            referencedColumns: ["id"]
          },
        ]
      }
      book_files: {
        Row: {
          created_at: string
          file_path: string
          id: string
          kind: string
          level: string | null
          notes: string | null
          owner_id: string
          publisher: string | null
          size_bytes: number
          title: string
          total_pages: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          kind?: string
          level?: string | null
          notes?: string | null
          owner_id: string
          publisher?: string | null
          size_bytes?: number
          title: string
          total_pages?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          level?: string | null
          notes?: string | null
          owner_id?: string
          publisher?: string | null
          size_bytes?: number
          title?: string
          total_pages?: number
          updated_at?: string
        }
        Relationships: []
      }
      book_lektionen: {
        Row: {
          book_id: string
          created_at: string
          id: string
          number: number
          page_from: number
          page_to: number
          title: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          number: number
          page_from?: number
          page_to?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          number?: number
          page_from?: number
          page_to?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_lektionen_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_pages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          image_path: string
          lektion_id: string | null
          ocr_status: string
          page_number: number
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          image_path: string
          lektion_id?: string | null
          ocr_status?: string
          page_number: number
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          image_path?: string
          lektion_id?: string | null
          ocr_status?: string
          page_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_pages_lektion_id_fkey"
            columns: ["lektion_id"]
            isOneToOne: false
            referencedRelation: "book_lektionen"
            referencedColumns: ["id"]
          },
        ]
      }
      book_tasks: {
        Row: {
          bbox: Json | null
          book_id: string
          code: string | null
          content: Json
          created_at: string
          id: string
          instructions: string | null
          kind: string
          page_id: string
          sort_order: number
          source: string
          title: string | null
          updated_at: string
        }
        Insert: {
          bbox?: Json | null
          book_id: string
          code?: string | null
          content?: Json
          created_at?: string
          id?: string
          instructions?: string | null
          kind?: string
          page_id: string
          sort_order?: number
          source?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          bbox?: Json | null
          book_id?: string
          code?: string | null
          content?: Json
          created_at?: string
          id?: string
          instructions?: string | null
          kind?: string
          page_id?: string
          sort_order?: number
          source?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tasks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_tasks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "book_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          created_at: string
          id: string
          kind: string
          language: string
          level: string | null
          owner_id: string | null
          publisher: string | null
          title: string
          total_pages: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          language?: string
          level?: string | null
          owner_id?: string | null
          publisher?: string | null
          title: string
          total_pages?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          language?: string
          level?: string | null
          owner_id?: string | null
          publisher?: string | null
          title?: string
          total_pages?: number
          updated_at?: string
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          timer_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "cafe_scenarios_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
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
          {
            foreignKeyName: "course_lessons_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
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
          target_language: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free_preview?: boolean | null
          sort_order?: number
          target_language?: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free_preview?: boolean | null
          sort_order?: number
          target_language?: string
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
          {
            foreignKeyName: "course_modules_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          thumbnail_url?: string | null
          title?: string
          total_hours?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          trailer_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
          target_language: string
          theory: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          target_language?: string
          theory: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          target_language?: string
          theory?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_lessons_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_questions_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      interactive_pages: {
        Row: {
          book_id: string | null
          created_at: string
          id: string
          level: string | null
          owner_id: string
          page_id: string | null
          scene: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          owner_id?: string
          page_id?: string | null
          scene?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          owner_id?: string
          page_id?: string | null
          scene?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_pages_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "book_pages"
            referencedColumns: ["id"]
          },
        ]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_placement_questions_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string
          is_active: boolean
          name_en: string
          name_native: string
          name_ru: string
          name_uk: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji: string
          is_active?: boolean
          name_en: string
          name_native: string
          name_ru: string
          name_uk: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string
          is_active?: boolean
          name_en?: string
          name_native?: string
          name_ru?: string
          name_uk?: string
          sort_order?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          consent: boolean
          consent_at: string | null
          created_at: string
          discount: string | null
          email: string | null
          id: string
          level: string | null
          name: string
          phone: string
          status: string
          telegram: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          consent?: boolean
          consent_at?: string | null
          created_at?: string
          discount?: string | null
          email?: string | null
          id?: string
          level?: string | null
          name: string
          phone: string
          status?: string
          telegram?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          consent?: boolean
          consent_at?: string | null
          created_at?: string
          discount?: string | null
          email?: string | null
          id?: string
          level?: string | null
          name?: string
          phone?: string
          status?: string
          telegram?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          duration_min: number | null
          id: string
          inline_payload: Json | null
          lesson_id: string
          library_item_id: string | null
          settings: Json
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type: string
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          id?: string
          inline_payload?: Json | null
          lesson_id: string
          library_item_id?: string | null
          settings?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          id?: string
          inline_payload?: Json | null
          lesson_id?: string
          library_item_id?: string | null
          settings?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_kits: {
        Row: {
          blocks: Json
          book_id: string | null
          created_at: string
          focus: string
          id: string
          kind: string
          last_assigned_at: string | null
          lektion_id: string | null
          level: string | null
          notes: string | null
          owner_id: string
          page_paths: Json
          presentation_id: string | null
          sections: Json
          source: string
          summary: string | null
          tags: string[]
          title: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          blocks?: Json
          book_id?: string | null
          created_at?: string
          focus?: string
          id?: string
          kind?: string
          last_assigned_at?: string | null
          lektion_id?: string | null
          level?: string | null
          notes?: string | null
          owner_id: string
          page_paths?: Json
          presentation_id?: string | null
          sections?: Json
          source?: string
          summary?: string | null
          tags?: string[]
          title?: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          blocks?: Json
          book_id?: string | null
          created_at?: string
          focus?: string
          id?: string
          kind?: string
          last_assigned_at?: string | null
          lektion_id?: string | null
          level?: string | null
          notes?: string | null
          owner_id?: string
          page_paths?: Json
          presentation_id?: string | null
          sections?: Json
          source?: string
          summary?: string | null
          tags?: string[]
          title?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_kits_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_kits_lektion_id_fkey"
            columns: ["lektion_id"]
            isOneToOne: false
            referencedRelation: "book_lektionen"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_slot_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          slots: Json
          status: string
          student_id: string
          teacher_id: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          slots?: Json
          status?: string
          student_id: string
          teacher_id?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          slots?: Json
          status?: string
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          owner_id: string | null
          payload: Json
          source: string
          tags: string[]
          target_language: string
          title: string
          topic: string | null
          type: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          owner_id?: string | null
          payload?: Json
          source?: string
          tags?: string[]
          target_language?: string
          title: string
          topic?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          owner_id?: string | null
          payload?: Json
          source?: string
          tags?: string[]
          target_language?: string
          title?: string
          topic?: string | null
          type?: string
          updated_at?: string
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
          target_language: string
        }
        Insert: {
          created_at?: string
          id?: string
          listening_id: string
          sentence: string
          sort_order?: number | null
          target_language?: string
        }
        Update: {
          created_at?: string
          id?: string
          listening_id?: string
          sentence?: string
          sort_order?: number | null
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_dictations_listening_id_fkey"
            columns: ["listening_id"]
            isOneToOne: false
            referencedRelation: "listening_texts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listening_dictations_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_questions_listening_id_fkey"
            columns: ["listening_id"]
            isOneToOne: false
            referencedRelation: "listening_texts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listening_questions_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          text?: string
          title?: string
          topic?: string
          voice_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_texts_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      live_class_answers: {
        Row: {
          answer: string | null
          class_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          item_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          class_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          class_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_answers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "live_class_items"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_grammar: {
        Row: {
          class_id: string
          created_at: string
          lesson: Json | null
          marks: string
          notes: string
          revealed: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          lesson?: Json | null
          marks?: string
          notes?: string
          revealed?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          lesson?: Json | null
          marks?: string
          notes?: string
          revealed?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_class_grammar_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_items: {
        Row: {
          class_id: string
          content: Json
          created_at: string
          id: string
          kind: string
          section: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          section: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          section?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_items_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_reading: {
        Row: {
          class_id: string
          created_at: string
          notes: string
          text: string
          topic: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          notes?: string
          text?: string
          topic?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          notes?: string
          text?: string
          topic?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_class_reading_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_seen: {
        Row: {
          class_id: string
          created_at: string
          id: string
          last_seen_at: string
          section: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          section: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          section?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_seen_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_writing: {
        Row: {
          class_id: string
          created_at: string
          text: string
          topic: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          text?: string
          topic?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          text?: string
          topic?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_class_writing_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          board: Json
          book_page: Json | null
          created_at: string
          current_section: string
          ended_at: string | null
          id: string
          live_view: Json | null
          started_at: string
          status: string
          student_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          board?: Json
          book_page?: Json | null
          created_at?: string
          current_section?: string
          ended_at?: string | null
          id?: string
          live_view?: Json | null
          started_at?: string
          status?: string
          student_id: string
          teacher_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          board?: Json
          book_page?: Json | null
          created_at?: string
          current_section?: string
          ended_at?: string | null
          id?: string
          live_view?: Json | null
          started_at?: string
          status?: string
          student_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_folders: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          name: string
          owner_id: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          name: string
          owner_id?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          name?: string
          owner_id?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      material_items: {
        Row: {
          content: Json
          created_at: string
          folder_id: string
          id: string
          kind: string
          level: string | null
          owner_id: string | null
          sort_order: number
          source: string
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          folder_id: string
          id?: string
          kind?: string
          level?: string | null
          owner_id?: string | null
          sort_order?: number
          source?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          folder_id?: string
          id?: string
          kind?: string
          level?: string | null
          owner_id?: string | null
          sort_order?: number
          source?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "material_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      mono_payments: {
        Row: {
          amount: number
          basket: Json | null
          cancelled_at: string | null
          ccy: number
          created_at: string
          destination: string | null
          discounts: Json | null
          finalized_at: string | null
          id: string
          invoice_id: string
          modified_date: string | null
          page_url: string | null
          payment_type: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          basket?: Json | null
          cancelled_at?: string | null
          ccy?: number
          created_at?: string
          destination?: string | null
          discounts?: Json | null
          finalized_at?: string | null
          id?: string
          invoice_id: string
          modified_date?: string | null
          page_url?: string | null
          payment_type?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          basket?: Json | null
          cancelled_at?: string | null
          ccy?: number
          created_at?: string
          destination?: string | null
          discounts?: Json | null
          finalized_at?: string | null
          id?: string
          invoice_id?: string
          modified_date?: string | null
          page_url?: string | null
          payment_type?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_data?: Json | null
        }
        Relationships: []
      }
      mono_webhook_logs: {
        Row: {
          created_at: string
          error: string | null
          headers: Json | null
          id: string
          invoice_id: string | null
          raw_body: Json | null
          signature_valid: boolean | null
          status: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          headers?: Json | null
          id?: string
          invoice_id?: string | null
          raw_body?: Json | null
          signature_valid?: boolean | null
          status?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          headers?: Json | null
          id?: string
          invoice_id?: string | null
          raw_body?: Json | null
          signature_valid?: boolean | null
          status?: string | null
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
          target_language: string
        }
        Insert: {
          correct: number
          created_at?: string | null
          id?: string
          level: string
          options: Json
          question_de: string
          sort_order?: number | null
          target_language?: string
        }
        Update: {
          correct?: number
          created_at?: string | null
          id?: string
          level?: string
          options?: Json
          question_de?: string
          sort_order?: number | null
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_questions_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      presentations: {
        Row: {
          created_at: string
          html: string | null
          id: string
          owner_id: string
          page_count: number
          slide_paths: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html?: string | null
          id?: string
          owner_id: string
          page_count?: number
          slide_paths?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html?: string | null
          id?: string
          owner_id?: string
          page_count?: number
          slide_paths?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          cost_uah: number | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          internal_id: number | null
          margin_pct: number | null
          name: string
          price_uah: number | null
          received_at: string | null
          stock: number | null
          supplier: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_uah?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          internal_id?: number | null
          margin_pct?: number | null
          name: string
          price_uah?: number | null
          received_at?: string | null
          stock?: number | null
          supplier?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_uah?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          internal_id?: number | null
          margin_pct?: number | null
          name?: string
          price_uah?: number | null
          received_at?: string | null
          stock?: number | null
          supplier?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academy_bg: string | null
          active_target_language: string
          age: number | null
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
          academy_bg?: string | null
          active_target_language?: string
          age?: number | null
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
          academy_bg?: string | null
          active_target_language?: string
          age?: number | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_active_target_language_fkey"
            columns: ["active_target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_questions_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "reading_texts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_questions_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      reading_texts: {
        Row: {
          created_at: string
          id: string
          level: string
          sort_order: number | null
          target_language: string
          text: string
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          sort_order?: number | null
          target_language?: string
          text: string
          title: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          sort_order?: number | null
          target_language?: string
          text?: string
          title?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_texts_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
      school_attendance: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          lesson_date: string
          note: string | null
          schedule_id: string | null
          status: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          lesson_date?: string
          note?: string | null
          schedule_id?: string | null
          status?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          lesson_date?: string
          note?: string | null
          schedule_id?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "school_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      school_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      school_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          language: string | null
          level: string | null
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          level?: string | null
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          level?: string | null
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          group_id: string | null
          id: string
          note: string | null
          paid_at: string | null
          status: string
          student_id: string
          teacher_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          student_id: string
          teacher_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      school_schedule: {
        Row: {
          created_at: string
          duration_min: number
          group_id: string | null
          id: string
          lesson_id: string | null
          notes: string | null
          starts_at: string
          status: string
          student_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          group_id?: string | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          starts_at: string
          status?: string
          student_id?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          group_id?: string | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          starts_at?: string
          status?: string
          student_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
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
      student_assignments: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          instructions: string | null
          level: string | null
          payload: Json
          status: string
          student_id: string
          teacher_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          level?: string | null
          payload?: Json
          status?: string
          student_id: string
          teacher_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          level?: string | null
          payload?: Json
          status?: string
          student_id?: string
          teacher_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_boards: {
        Row: {
          created_at: string
          elements: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elements?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elements?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_book_pages: {
        Row: {
          homework_note: string | null
          homework_status: string
          id: string
          page_number: number
          strokes: Json
          student_book_id: string
          updated_at: string
        }
        Insert: {
          homework_note?: string | null
          homework_status?: string
          id?: string
          page_number: number
          strokes?: Json
          student_book_id: string
          updated_at?: string
        }
        Update: {
          homework_note?: string | null
          homework_status?: string
          id?: string
          page_number?: number
          strokes?: Json
          student_book_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_book_pages_student_book_id_fkey"
            columns: ["student_book_id"]
            isOneToOne: false
            referencedRelation: "student_books"
            referencedColumns: ["id"]
          },
        ]
      }
      student_books: {
        Row: {
          book_file_id: string
          created_at: string
          current_page: number
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          book_file_id: string
          created_at?: string
          current_page?: number
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          book_file_id?: string
          created_at?: string
          current_page?: number
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_books_book_file_id_fkey"
            columns: ["book_file_id"]
            isOneToOne: false
            referencedRelation: "book_files"
            referencedColumns: ["id"]
          },
        ]
      }
      student_login_attempts: {
        Row: {
          failed_count: number
          id: string
          last_attempt_at: string
          locked_until: string | null
          nickname: string
        }
        Insert: {
          failed_count?: number
          id?: string
          last_attempt_at?: string
          locked_until?: string | null
          nickname: string
        }
        Update: {
          failed_count?: number
          id?: string
          last_attempt_at?: string
          locked_until?: string | null
          nickname?: string
        }
        Relationships: []
      }
      student_notes: {
        Row: {
          body: string
          created_at: string
          folder: string
          id: string
          level: string | null
          source: Json | null
          student_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          folder?: string
          id?: string
          level?: string | null
          source?: Json | null
          student_id: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          folder?: string
          id?: string
          level?: string | null
          source?: Json | null
          student_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_submissions: {
        Row: {
          ai_feedback: string | null
          answers: Json | null
          assignment_id: string
          audio_path: string | null
          auto_score: number | null
          created_at: string
          files: Json
          grade: number | null
          graded_at: string | null
          id: string
          status: string
          student_id: string
          submitted_at: string
          teacher_feedback: string | null
          text: string | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          answers?: Json | null
          assignment_id: string
          audio_path?: string | null
          auto_score?: number | null
          created_at?: string
          files?: Json
          grade?: number | null
          graded_at?: string | null
          id?: string
          status?: string
          student_id: string
          submitted_at?: string
          teacher_feedback?: string | null
          text?: string | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          answers?: Json | null
          assignment_id?: string
          audio_path?: string | null
          auto_score?: number | null
          created_at?: string
          files?: Json
          grade?: number | null
          graded_at?: string | null
          id?: string
          status?: string
          student_id?: string
          submitted_at?: string
          teacher_feedback?: string | null
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_assignments"
            referencedColumns: ["id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teacher_ai_chats: {
        Row: {
          created_at: string
          id: string
          student_id: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          teacher_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_ai_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ai_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "teacher_ai_chats"
            referencedColumns: ["id"]
          },
        ]
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
      teacher_student_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          level: string
          name: string
          sort_order: number | null
          target_language: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          level?: string
          name: string
          sort_order?: number | null
          target_language?: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          level?: string
          name?: string
          sort_order?: number | null
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
      tutoring_block_answers: {
        Row: {
          answers: Json
          block_id: string
          created_at: string
          id: string
          max_score: number
          score: number
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          block_id: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          block_id?: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_block_answers_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lesson_blocks"
            referencedColumns: ["id"]
          },
        ]
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
      tutoring_lesson_blocks: {
        Row: {
          book_page_id: string | null
          created_at: string
          id: string
          lesson_id: string
          payload: Json
          sort_order: number
          source: string
          title: string | null
          type: string
          updated_at: string
          visible_to_student: boolean
        }
        Insert: {
          book_page_id?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          payload?: Json
          sort_order?: number
          source?: string
          title?: string | null
          type: string
          updated_at?: string
          visible_to_student?: boolean
        }
        Update: {
          book_page_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          payload?: Json
          sort_order?: number
          source?: string
          title?: string | null
          type?: string
          updated_at?: string
          visible_to_student?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_blocks_lesson_id_fkey"
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
          payload: Json
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
          payload?: Json
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
          payload?: Json
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          teacher_id?: string
          theory_template?: string | null
          topic?: string | null
          updated_at?: string
          use_count?: number
          vocabulary?: Json
          words_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_lesson_templates_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
      tutoring_live_sessions: {
        Row: {
          created_at: string
          current_view: Json
          ended_at: string | null
          highlight: Json | null
          id: string
          lesson_id: string
          status: string
          student_id: string
          student_reaction: Json | null
          student_response: Json | null
          teacher_id: string
          updated_at: string
          whiteboard: Json
        }
        Insert: {
          created_at?: string
          current_view?: Json
          ended_at?: string | null
          highlight?: Json | null
          id?: string
          lesson_id: string
          status?: string
          student_id: string
          student_reaction?: Json | null
          student_response?: Json | null
          teacher_id: string
          updated_at?: string
          whiteboard?: Json
        }
        Update: {
          created_at?: string
          current_view?: Json
          ended_at?: string | null
          highlight?: Json | null
          id?: string
          lesson_id?: string
          status?: string
          student_id?: string
          student_reaction?: Json | null
          student_response?: Json | null
          teacher_id?: string
          updated_at?: string
          whiteboard?: Json
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
          is_kid_mode: boolean
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
          is_kid_mode?: boolean
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
          is_kid_mode?: boolean
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
      tutoring_reading_tasks: {
        Row: {
          body: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          gaps: Json
          id: string
          images: string[]
          kind: string
          lesson_id: string
          level: string | null
          quiz: Json
          quiz_answers: Json
          sort_order: number
          student_answers: Json
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          gaps?: Json
          id?: string
          images?: string[]
          kind?: string
          lesson_id: string
          level?: string | null
          quiz?: Json
          quiz_answers?: Json
          sort_order?: number
          student_answers?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          gaps?: Json
          id?: string
          images?: string[]
          kind?: string
          lesson_id?: string
          level?: string | null
          quiz?: Json
          quiz_answers?: Json
          sort_order?: number
          student_answers?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_reading_tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "tutoring_lessons"
            referencedColumns: ["id"]
          },
        ]
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
          target_language: string
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
          target_language?: string
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
          target_language?: string
          topic?: string
          ukrainian?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_cards_target_language_fkey"
            columns: ["target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
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
      public_profiles: {
        Row: {
          active_target_language: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          nickname: string | null
          preferred_lang: string | null
          user_id: string | null
        }
        Insert: {
          active_target_language?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          nickname?: string | null
          preferred_lang?: string | null
          user_id?: string | null
        }
        Update: {
          active_target_language?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          nickname?: string | null
          preferred_lang?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_target_language_fkey"
            columns: ["active_target_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      activate_referral: { Args: { p_referred_id: string }; Returns: undefined }
      admin_give_gift: {
        Args: { p_gift_id: string; p_message?: string; p_receiver_id: string }
        Returns: undefined
      }
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
      can_access_student_book: { Args: { _sb: string }; Returns: boolean }
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purchase_course: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: boolean
      }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      referral_code_exists: { Args: { p_code: string }; Returns: boolean }
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
      student_has_book_access: { Args: { _book_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

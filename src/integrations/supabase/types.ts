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
      appointments: {
        Row: {
          amount: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          mentor_id: string
          notes: string | null
          payment_status: string | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          mentor_id: string
          notes?: string | null
          payment_status?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          mentor_id?: string
          notes?: string | null
          payment_status?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          pdf_url: string | null
          template_data: Json | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          template_data?: Json | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          template_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          size: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          rank: number | null
          score: number | null
          status: string | null
          submission_url: string | null
          team_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          rank?: number | null
          score?: number | null
          status?: string | null
          submission_url?: string | null
          team_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          rank?: number | null
          score?: number | null
          status?: string | null
          submission_url?: string | null
          team_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_registrations: {
        Row: {
          competition_id: string
          id: string
          registered_at: string
          reminder_sent: boolean | null
          team_name: string | null
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          registered_at?: string
          reminder_sent?: boolean | null
          team_name?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          registered_at?: string
          reminder_sent?: boolean | null
          team_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_registrations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          end_date: string | null
          format: string | null
          id: string
          is_team_based: boolean | null
          max_participants: number | null
          organizer_id: string | null
          organizer_type: string | null
          prize_pool: string | null
          registration_deadline: string | null
          start_date: string | null
          status: string | null
          team_size_max: number | null
          team_size_min: number | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          format?: string | null
          id?: string
          is_team_based?: boolean | null
          max_participants?: number | null
          organizer_id?: string | null
          organizer_type?: string | null
          prize_pool?: string | null
          registration_deadline?: string | null
          start_date?: string | null
          status?: string | null
          team_size_max?: number | null
          team_size_min?: number | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          format?: string | null
          id?: string
          is_team_based?: boolean | null
          max_participants?: number | null
          organizer_id?: string | null
          organizer_type?: string | null
          prize_pool?: string | null
          registration_deadline?: string | null
          start_date?: string | null
          status?: string | null
          team_size_max?: number | null
          team_size_min?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_queries: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          responded_at: string | null
          response: string | null
          status: string | null
          subject: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          responded_at?: string | null
          response?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          responded_at?: string | null
          response?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          mentee_id: string
          mentor_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          mentee_id: string
          mentor_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          mentee_id?: string
          mentor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
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
      course_tags: {
        Row: {
          course_id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          tag_id: string
        }
        Update: {
          course_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_id: string
          uploaded_by: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          uploaded_by: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          uploaded_by?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          id: string
          is_published: boolean | null
          learning_outcomes: string[] | null
          price: number | null
          redirect_url: string | null
          syllabus: string | null
          thumbnail_file_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          is_published?: boolean | null
          learning_outcomes?: string[] | null
          price?: number | null
          redirect_url?: string | null
          syllabus?: string | null
          thumbnail_file_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          is_published?: boolean | null
          learning_outcomes?: string[] | null
          price?: number | null
          redirect_url?: string | null
          syllabus?: string | null
          thumbnail_file_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      institute_admins: {
        Row: {
          can_edit_profile: boolean | null
          can_manage_courses: boolean | null
          can_post_notices: boolean | null
          created_at: string
          id: string
          institute_id: string
          user_id: string
        }
        Insert: {
          can_edit_profile?: boolean | null
          can_manage_courses?: boolean | null
          can_post_notices?: boolean | null
          created_at?: string
          id?: string
          institute_id: string
          user_id: string
        }
        Update: {
          can_edit_profile?: boolean | null
          can_manage_courses?: boolean | null
          can_post_notices?: boolean | null
          created_at?: string
          id?: string
          institute_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institute_admins_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_notices: {
        Row: {
          attachment_url: string | null
          content: string | null
          created_at: string
          id: string
          institute_id: string
          is_pinned: boolean | null
          notice_type: string | null
          published_at: string
          title: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          institute_id: string
          is_pinned?: boolean | null
          notice_type?: string | null
          published_at?: string
          title: string
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          is_pinned?: boolean | null
          notice_type?: string | null
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "institute_notices_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          admission_deadline: string | null
          admission_guidelines: string | null
          admission_status: string | null
          affiliation: string | null
          applications_enabled: boolean
          available_seats: number | null
          contact_email: string | null
          contact_info: Json
          contact_phone: string | null
          courses_offered: Json
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          established_year: number | null
          featured_until: string | null
          gallery_urls: string[]
          id: string
          institution_category: string
          is_featured: boolean
          is_verified: boolean | null
          level: string | null
          location: string | null
          map_location: string | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          ranking: number | null
          salient_features: string[]
          scholarships: string | null
          short_name: string | null
          slug: string | null
          source_url: string | null
          status: string
          total_seats: number | null
          type: string | null
          updated_at: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          admission_deadline?: string | null
          admission_guidelines?: string | null
          admission_status?: string | null
          affiliation?: string | null
          applications_enabled?: boolean
          available_seats?: number | null
          contact_email?: string | null
          contact_info?: Json
          contact_phone?: string | null
          courses_offered?: Json
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          established_year?: number | null
          featured_until?: string | null
          gallery_urls?: string[]
          id?: string
          institution_category?: string
          is_featured?: boolean
          is_verified?: boolean | null
          level?: string | null
          location?: string | null
          map_location?: string | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          ranking?: number | null
          salient_features?: string[]
          scholarships?: string | null
          short_name?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          total_seats?: number | null
          type?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          admission_deadline?: string | null
          admission_guidelines?: string | null
          admission_status?: string | null
          affiliation?: string | null
          applications_enabled?: boolean
          available_seats?: number | null
          contact_email?: string | null
          contact_info?: Json
          contact_phone?: string | null
          courses_offered?: Json
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          established_year?: number | null
          featured_until?: string | null
          gallery_urls?: string[]
          id?: string
          institution_category?: string
          is_featured?: boolean
          is_verified?: boolean | null
          level?: string | null
          location?: string | null
          map_location?: string | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          ranking?: number | null
          salient_features?: string[]
          scholarships?: string | null
          short_name?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          total_seats?: number | null
          type?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      institutions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          type: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          type?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_at: string
          cover_letter: string | null
          cover_letter_file_url: string | null
          id: string
          job_id: string
          notes: string | null
          portfolio_url: string | null
          resume_url: string | null
          skills_match_score: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          cover_letter?: string | null
          cover_letter_file_url?: string | null
          id?: string
          job_id: string
          notes?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          skills_match_score?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          cover_letter?: string | null
          cover_letter_file_url?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          skills_match_score?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          company_id: string | null
          created_at: string
          description: string | null
          experience_level: string | null
          external_link: string | null
          id: string
          is_active: boolean | null
          is_remote: boolean | null
          job_type: string | null
          location: string | null
          requirements: string[] | null
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          experience_level?: string | null
          external_link?: string | null
          id?: string
          is_active?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          experience_level?: string | null
          external_link?: string | null
          id?: string
          is_active?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_preview: boolean | null
          live_class_link: string | null
          live_class_scheduled_at: string | null
          module_id: string
          order_index: number | null
          pdf_attachment_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          live_class_link?: string | null
          live_class_scheduled_at?: string | null
          module_id: string
          order_index?: number | null
          pdf_attachment_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          live_class_link?: string | null
          live_class_scheduled_at?: string | null
          module_id?: string
          order_index?: number | null
          pdf_attachment_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_trial_settings: {
        Row: {
          created_at: string
          free_trial_duration_minutes: number | null
          free_trial_enabled: boolean | null
          free_trial_type: string | null
          id: string
          mentor_id: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_trial_duration_minutes?: number | null
          free_trial_enabled?: boolean | null
          free_trial_type?: string | null
          id?: string
          mentor_id: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_trial_duration_minutes?: number | null
          free_trial_enabled?: boolean | null
          free_trial_type?: string | null
          id?: string
          mentor_id?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_trial_settings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: true
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_trial_usage: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          trial_ended_at: string | null
          trial_started_at: string | null
          trial_used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          trial_ended_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          trial_ended_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_trial_usage_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          created_at: string
          expertise: string[] | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          rating: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          expertise?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          expertise?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      mentorship_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          mentee_id: string
          mentor_id: string
          notes: string | null
          rating: number | null
          scheduled_at: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mentee_id: string
          mentor_id: string
          notes?: string | null
          rating?: number | null
          scheduled_at: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          rating?: number | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string
          sender_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id: string
          sender_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_type: string
          reference_id: string
          status: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_type: string
          reference_id: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_type?: string
          reference_id?: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          education: string | null
          email: string
          experience_level: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean | null
          phone: string | null
          resume_url: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education?: string | null
          email: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education?: string | null
          email?: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          module_id: string | null
          passing_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string | null
          passing_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string | null
          passing_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          competition_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          competition_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          competition_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          language: string
          notification_preferences: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          language?: string
          notification_preferences?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          language?: string
          notification_preferences?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: string | null
          skill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      institute_directory: {
        Row: {
          admission_deadline: string | null
          admission_guidelines: string | null
          admission_status: string | null
          affiliation: string | null
          applications_enabled: boolean | null
          available_seats: number | null
          chairperson_designation: string | null
          chairperson_image_url: string | null
          chairperson_message: string | null
          chairperson_name: string | null
          contact_email: string | null
          contact_info: Json | null
          contact_phone: string | null
          courses_offered: Json | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          established_year: number | null
          gallery_urls: string[] | null
          id: string
          institution_category: string | null
          is_featured: boolean | null
          level: string | null
          location: string | null
          logo_url: string | null
          map_location: string | null
          name: string
          payment_verified: boolean | null
          principal_designation: string | null
          principal_image_url: string | null
          principal_message: string | null
          principal_name: string | null
          program_names: string[] | null
          ranking: number | null
          salient_features: string[] | null
          search_document: string | null
          search_tags: string[] | null
          scholarships: string | null
          short_name: string | null
          slug: string | null
          source_url: string | null
          status: string | null
          total_seats: number | null
          type: string | null
          updated_at: string
          website: string | null
          youtube_url: string | null
        }
        Relationships: []
      }
      public_profile_directory: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          id: string | null
          location: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "talent"
        | "institution"
        | "company"
        | "mentor"
        | "instructor"
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
      app_role: [
        "admin",
        "talent",
        "institution",
        "company",
        "mentor",
        "instructor",
      ],
    },
  },
} as const

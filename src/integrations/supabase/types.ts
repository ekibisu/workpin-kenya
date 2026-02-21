export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          role: 'client' | 'provider'
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'client' | 'provider'
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'client' | 'provider'
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      client_profiles: {
        Row: {
          id: string
          user_id: string
          location_name: string | null
          lat: number | null
          lng: number | null
          mpesa_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_name?: string | null
          lat?: number | null
          lng?: number | null
          mpesa_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location_name?: string | null
          lat?: number | null
          lng?: number | null
          mpesa_phone?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      provider_profiles: {
        Row: {
          id: string
          user_id: string
          business_name: string
          bio: string | null
          location_name: string | null
          location_lat: number | null
          location_lng: number | null
          mpesa_phone: string | null
          avg_rating: number | null
          total_reviews: number | null
          is_verified: boolean | null
          subscription_status: string | null
          categories: string[] | null
          service_radius_km: number | null
          rate_kes: number | null
          rate_type: 'hourly' | 'per_job' | null
          portfolio_photos: string[] | null
          availability_json: Json | null
          response_time_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          bio?: string | null
          location_name?: string | null
          location_lat?: number | null
          location_lng?: number | null
          mpesa_phone?: string | null
          avg_rating?: number | null
          total_reviews?: number | null
          is_verified?: boolean | null
          subscription_status?: string | null
          categories?: string[] | null
          service_radius_km?: number | null
          rate_kes?: number | null
          rate_type?: 'hourly' | 'per_job' | null
          portfolio_photos?: string[] | null
          availability_json?: Json | null
          response_time_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          bio?: string | null
          location_name?: string | null
          location_lat?: number | null
          location_lng?: number | null
          mpesa_phone?: string | null
          avg_rating?: number | null
          total_reviews?: number | null
          is_verified?: boolean | null
          subscription_status?: string | null
          categories?: string[] | null
          service_radius_km?: number | null
          rate_kes?: number | null
          rate_type?: 'hourly' | 'per_job' | null
          portfolio_photos?: string[] | null
          availability_json?: Json | null
          response_time_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      services: {
        Row: {
          id: string
          name: string
          category: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          icon?: string | null
          created_at?: string
        }
        Relationships: []
      }

      job_requests: {
        Row: {
          id: string
          client_id: string
          service_id: string
          description: string
          budget_min_kes: number | null
          budget_max_kes: number | null
          status: 'open' | 'matched' | 'filled' | 'expired' | 'pending' | 'completed'
          location_name: string | null
          lat: number | null
          lng: number | null
          timeline: 'asap' | 'this_week' | 'this_month' | 'flexible' | null
          image_urls: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          description: string
          budget_min_kes?: number | null
          budget_max_kes?: number | null
          status?: 'open' | 'matched' | 'filled' | 'expired' | 'pending' | 'completed'
          location_name?: string | null
          lat?: number | null
          lng?: number | null
          timeline?: 'asap' | 'this_week' | 'this_month' | 'flexible' | null
          image_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          description?: string
          budget_min_kes?: number | null
          budget_max_kes?: number | null
          status?: 'open' | 'matched' | 'filled' | 'expired' | 'pending' | 'completed'
          location_name?: string | null
          lat?: number | null
          lng?: number | null
          timeline?: 'asap' | 'this_week' | 'this_month' | 'flexible' | null
          image_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }

      work_threads: {
        Row: {
          id: string
          job_request_id: string | null
          client_id: string
          provider_id: string
          status: 'new' | 'quoted' | 'negotiating' | 'active' | 'completed' | 'reviewed' | 'disputed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_request_id?: string | null
          client_id: string
          provider_id: string
          status?: 'new' | 'quoted' | 'negotiating' | 'active' | 'completed' | 'reviewed' | 'disputed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_request_id?: string | null
          client_id?: string
          provider_id?: string
          status?: 'new' | 'quoted' | 'negotiating' | 'active' | 'completed' | 'reviewed' | 'disputed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_threads_job_request_id_fkey"
            columns: ["job_request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_threads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      messages: {
        Row: {
          id: string
          work_thread_id: string
          sender_id: string
          body: string
          type: 'text' | 'quote' | 'system'
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_thread_id: string
          sender_id: string
          body: string
          type?: 'text' | 'quote' | 'system'
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_thread_id?: string
          sender_id?: string
          body?: string
          type?: 'text' | 'quote' | 'system'
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      quotes: {
        Row: {
          id: string
          request_id: string
          work_thread_id: string | null
          provider_id: string
          price_kes: number
          message: string | null
          timeline: string | null
          status: 'pending' | 'accepted' | 'declined' | 'countered'
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          work_thread_id?: string | null
          provider_id: string
          price_kes: number
          message?: string | null
          timeline?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'countered'
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          work_thread_id?: string | null
          provider_id?: string
          price_kes?: number
          message?: string | null
          timeline?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'countered'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      payments: {
        Row: {
          id: string
          client_id: string
          work_thread_id: string | null
          amount_kes: number
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          status: 'pending' | 'paid' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          work_thread_id?: string | null
          amount_kes: number
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          status?: 'pending' | 'paid' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          work_thread_id?: string | null
          amount_kes?: number
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          status?: 'pending' | 'paid' | 'failed'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          }
        ]
      }

      reviews: {
        Row: {
          id: string
          work_thread_id: string
          client_id: string
          provider_id: string
          rating: number | null
          body: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          work_thread_id: string
          client_id: string
          provider_id: string
          rating?: number | null
          body?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          work_thread_id?: string
          client_id?: string
          provider_id?: string
          rating?: number | null
          body?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      bookings: {
        Row: {
          id: string
          work_thread_id: string
          scheduled_at: string
          duration_minutes: number | null
          is_quick_pin: boolean
          created_at: string
        }
        Insert: {
          id?: string
          work_thread_id: string
          scheduled_at: string
          duration_minutes?: number | null
          is_quick_pin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          work_thread_id?: string
          scheduled_at?: string
          duration_minutes?: number | null
          is_quick_pin?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          }
        ]
      }

      disputes: {
        Row: {
          id: string
          work_thread_id: string
          filed_by_id: string
          reason: string
          description: string | null
          evidence_urls: string[] | null
          status: 'open' | 'in_review' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          work_thread_id: string
          filed_by_id: string
          reason: string
          description?: string | null
          evidence_urls?: string[] | null
          status?: 'open' | 'in_review' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          work_thread_id?: string
          filed_by_id?: string
          reason?: string
          description?: string | null
          evidence_urls?: string[] | null
          status?: 'open' | 'in_review' | 'resolved'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_work_thread_id_fkey"
            columns: ["work_thread_id"]
            isOneToOne: false
            referencedRelation: "work_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_filed_by_id_fkey"
            columns: ["filed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      provider_templates: {
        Row: {
          id: string
          provider_id: string
          title: string
          body: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          title: string
          body: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          title?: string
          body?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_templates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      provider_wallets: {
        Row: {
          id: string
          provider_id: string
          available_balance_kes: number
          pending_balance_kes: number
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          available_balance_kes?: number
          pending_balance_kes?: number
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          available_balance_kes?: number
          pending_balance_kes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_wallets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      wallet_transactions: {
        Row: {
          id: string
          provider_id: string
          type: 'credit' | 'debit' | 'fee'
          amount_kes: number
          description: string | null
          mpesa_receipt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          type: 'credit' | 'debit' | 'fee'
          amount_kes: number
          description?: string | null
          mpesa_receipt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          type?: 'credit' | 'debit' | 'fee'
          amount_kes?: number
          description?: string | null
          mpesa_receipt?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      fixed_price_services: {
        Row: {
          id: string
          provider_id: string
          service_name: string
          description: string | null
          price_kes: number
          duration_minutes: number | null
          availability_json: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          service_name: string
          description?: string | null
          price_kes: number
          duration_minutes?: number | null
          availability_json?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          service_name?: string
          description?: string | null
          price_kes?: number
          duration_minutes?: number | null
          availability_json?: Json
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_price_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      match_providers: {
        Args: {
          job_lat: number
          job_lng: number
          job_cat: string
          max_results?: number
        }
        Returns: {
          provider_id: string
          distance_km: number
          score: number
        }[]
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

// ── Convenience type aliases ─────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ── Row type shortcuts ───────────────────────────────────────────────

export type Profile = Tables<'profiles'>
export type ClientProfile = Tables<'client_profiles'>
export type ProviderProfile = Tables<'provider_profiles'>
export type Service = Tables<'services'>
export type JobRequest = Tables<'job_requests'>
export type WorkThread = Tables<'work_threads'>
export type Message = Tables<'messages'>
export type Quote = Tables<'quotes'>
export type Payment = Tables<'payments'>
export type Review = Tables<'reviews'>
export type Booking = Tables<'bookings'>
export type Dispute = Tables<'disputes'>
export type ProviderTemplate = Tables<'provider_templates'>
export type ProviderWallet = Tables<'provider_wallets'>
export type WalletTransaction = Tables<'wallet_transactions'>
export type FixedPriceService = Tables<'fixed_price_services'>

// ── Status union types ───────────────────────────────────────────────

export type WorkThreadStatus =
  | 'new'
  | 'quoted'
  | 'negotiating'
  | 'active'
  | 'completed'
  | 'reviewed'
  | 'disputed'

export type JobRequestStatus =
  | 'open'
  | 'matched'
  | 'filled'
  | 'expired'
  | 'pending'
  | 'completed'

export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'countered'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type DisputeStatus = 'open' | 'in_review' | 'resolved'
export type MessageType = 'text' | 'quote' | 'system'
export type UserRole = 'client' | 'provider'
export type RateType = 'hourly' | 'per_job'
export type WalletTxType = 'credit' | 'debit' | 'fee'
export type Timeline = 'asap' | 'this_week' | 'this_month' | 'flexible'

// ── Utility: KES currency formatter ─────────────────────────────────

export const formatKES = (amount: number): string =>
  `KES ${amount.toLocaleString('en-KE')}`
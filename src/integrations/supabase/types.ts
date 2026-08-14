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
      agent_activities: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          kind: string
          message: string
          metadata: Json
          org_id: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message: string
          metadata?: Json
          org_id?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          metadata?: Json
          org_id?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          agent_id: string | null
          category: string
          content: string
          created_at: string
          document_id: string | null
          embedding: string | null
          embedding_model: string | null
          expires_at: string | null
          file_url: string | null
          id: string
          importance: string
          last_used_at: string | null
          memory_type: string
          metadata: Json
          org_id: string | null
          pinned: boolean
          scope: string
          source: string | null
          task_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          vector_external_id: string | null
          vector_provider: string
          vector_status: string
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string
          content: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          importance?: string
          last_used_at?: string | null
          memory_type?: string
          metadata?: Json
          org_id?: string | null
          pinned?: boolean
          scope?: string
          source?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          vector_external_id?: string | null
          vector_provider?: string
          vector_status?: string
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          importance?: string
          last_used_at?: string | null
          memory_type?: string
          metadata?: Json
          org_id?: string | null
          pinned?: boolean
          scope?: string
          source?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vector_external_id?: string | null
          vector_provider?: string
          vector_status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "memory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          created_at: string
          from_agent_id: string | null
          from_step_run_id: string | null
          id: string
          kind: string
          metadata: Json
          org_id: string | null
          run_id: string
          to_agent_id: string | null
          to_step_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          from_agent_id?: string | null
          from_step_run_id?: string | null
          id?: string
          kind?: string
          metadata?: Json
          org_id?: string | null
          run_id: string
          to_agent_id?: string | null
          to_step_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          from_agent_id?: string | null
          from_step_run_id?: string | null
          id?: string
          kind?: string
          metadata?: Json
          org_id?: string | null
          run_id?: string
          to_agent_id?: string | null
          to_step_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_from_step_run_id_fkey"
            columns: ["from_step_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_to_step_id_fkey"
            columns: ["to_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_id: string | null
          cancel_requested: boolean
          completed_at: string | null
          cost_pence: number
          created_at: string
          duration_ms: number | null
          error: string | null
          heartbeat_at: string | null
          id: string
          input: string
          model: string | null
          org_id: string | null
          output: Json | null
          output_text: string | null
          provider: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["exec_status"]
          task_id: string | null
          title: string | null
          tokens_in: number
          tokens_out: number
          tool_calls: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          cancel_requested?: boolean
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          heartbeat_at?: string | null
          id?: string
          input: string
          model?: string | null
          org_id?: string | null
          output?: Json | null
          output_text?: string | null
          provider?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          task_id?: string | null
          title?: string | null
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          cancel_requested?: boolean
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          heartbeat_at?: string | null
          id?: string
          input?: string
          model?: string | null
          org_id?: string | null
          output?: Json | null
          output_text?: string | null
          provider?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          task_id?: string | null
          title?: string | null
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_versions: {
        Row: {
          agent_id: string
          changelog: string | null
          config: Json
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          model: string | null
          system_prompt: string | null
          version: number
        }
        Insert: {
          agent_id: string
          changelog?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          system_prompt?: string | null
          version: number
        }
        Update: {
          agent_id?: string
          changelog?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          system_prompt?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_four: string | null
          last_used_at: string | null
          name: string
          org_id: string | null
          request_count: number
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_four?: string | null
          last_used_at?: string | null
          name: string
          org_id?: string | null
          request_count?: number
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_four?: string | null
          last_used_at?: string | null
          name?: string
          org_id?: string | null
          request_count?: number
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          ip: string | null
          method: string
          org_id: string | null
          path: string
          plan_code: string | null
          status_code: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method: string
          org_id?: string | null
          path: string
          plan_code?: string | null
          status_code: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method?: string
          org_id?: string | null
          path?: string
          plan_code?: string | null
          status_code?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action_type: string
          agent_id: string | null
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          details: Json
          estimated_cost: number | null
          expires_at: string | null
          id: string
          org_id: string | null
          risk_level: Database["public"]["Enums"]["mc_risk_level"]
          status: Database["public"]["Enums"]["mc_approval_status"]
          summary: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type?: string
          agent_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: Json
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          risk_level?: Database["public"]["Enums"]["mc_risk_level"]
          status?: Database["public"]["Enums"]["mc_approval_status"]
          summary?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: Json
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          risk_level?: Database["public"]["Enums"]["mc_risk_level"]
          status?: Database["public"]["Enums"]["mc_approval_status"]
          summary?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          environment: string
          event_id: string
          received_at: string
          type: string
        }
        Insert: {
          environment: string
          event_id: string
          received_at?: string
          type: string
        }
        Update: {
          environment?: string
          event_id?: string
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      browser_sessions: {
        Row: {
          agent_id: string | null
          allowed_domains: string[]
          created_at: string
          ended_at: string | null
          id: string
          provider: string
          started_at: string | null
          status: string
          steps: Json
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          ended_at?: string | null
          id?: string
          provider?: string
          started_at?: string | null
          status?: string
          steps?: Json
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          ended_at?: string | null
          id?: string
          provider?: string
          started_at?: string | null
          status?: string
          steps?: Json
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "browser_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          handle?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          summary: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          summary: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          org_id: string | null
          phone: string | null
          source: string | null
          stage: string
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          value_gbp: number
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
          value_gbp?: number
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          value_gbp?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string
          description: string | null
          direction: string
          id: string
          occurred_on: string
          org_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          occurred_on?: string
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          occurred_on?: string
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          expires_at: string | null
          id: string
          integration_id: string
          provider: string
          refresh_token_ciphertext: string | null
          scopes: string[]
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_id: string
          provider: string
          refresh_token_ciphertext?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_id?: string
          provider?: string
          refresh_token_ciphertext?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          account_label: string | null
          config: Json
          connected_at: string | null
          created_at: string
          expires_at: string | null
          granted_scopes: string[]
          id: string
          integration_type: string
          last_error: string | null
          last_sync_at: string | null
          name: string | null
          org_id: string | null
          provider: string
          scopes: string[]
          secret_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          config?: Json
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_scopes?: string[]
          id?: string
          integration_type?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string | null
          org_id?: string | null
          provider: string
          scopes?: string[]
          secret_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          config?: Json
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_scopes?: string[]
          id?: string
          integration_type?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string | null
          org_id?: string | null
          provider?: string
          scopes?: string[]
          secret_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number
          channel: string
          clicks: number
          conversions: number
          created_at: string
          ended_at: string | null
          id: string
          impressions: number
          name: string
          org_id: string | null
          spend: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          impressions?: number
          name: string
          org_id?: string | null
          spend?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          impressions?: number
          name?: string
          org_id?: string | null
          spend?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_agents: {
        Row: {
          agent_id: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          icon: string | null
          id: string
          install_count: number
          metadata: Json
          org_id: string | null
          price_pence: number
          published_at: string | null
          publisher_id: string
          rating_avg: number
          rating_count: number
          required_plan: string
          revenue_share: number
          review_notes: string | null
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          usage_requirements: string | null
          version: string
        }
        Insert: {
          agent_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          install_count?: number
          metadata?: Json
          org_id?: string | null
          price_pence?: number
          published_at?: string | null
          publisher_id: string
          rating_avg?: number
          rating_count?: number
          required_plan?: string
          revenue_share?: number
          review_notes?: string | null
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          usage_requirements?: string | null
          version?: string
        }
        Update: {
          agent_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          install_count?: number
          metadata?: Json
          org_id?: string | null
          price_pence?: number
          published_at?: string | null
          publisher_id?: string
          rating_avg?: number
          rating_count?: number
          required_plan?: string
          revenue_share?: number
          review_notes?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          usage_requirements?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_purchases: {
        Row: {
          amount_pence: number
          created_at: string
          currency: string
          id: string
          listing_id: string
          org_id: string | null
          status: string
          stripe_payment_intent: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_pence?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id: string
          org_id?: string | null
          status?: string
          stripe_payment_intent?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_pence?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string
          org_id?: string | null
          status?: string
          stripe_payment_intent?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_chunks: {
        Row: {
          agent_id: string | null
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          embedding_model: string | null
          id: string
          metadata: Json
          org_id: string | null
          token_estimate: number | null
          user_id: string
          vector_external_id: string | null
          vector_provider: string
        }
        Insert: {
          agent_id?: string | null
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          token_estimate?: number | null
          user_id: string
          vector_external_id?: string | null
          vector_provider?: string
        }
        Update: {
          agent_id?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          token_estimate?: number | null
          user_id?: string
          vector_external_id?: string | null
          vector_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_chunks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "memory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_chunks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_documents: {
        Row: {
          agent_id: string | null
          chunk_count: number
          created_at: string
          id: string
          metadata: Json
          mime_type: string | null
          org_id: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          chunk_count?: number
          created_at?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          chunk_count?: number
          created_at?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_preferences: {
        Row: {
          auto_capture: boolean
          capture_sensitive: boolean
          created_at: string
          document_memory_enabled: boolean
          long_term_enabled: boolean
          organisation_sharing_enabled: boolean
          retention_days: number | null
          short_term_enabled: boolean
          short_term_ttl_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_capture?: boolean
          capture_sensitive?: boolean
          created_at?: string
          document_memory_enabled?: boolean
          long_term_enabled?: boolean
          organisation_sharing_enabled?: boolean
          retention_days?: number | null
          short_term_enabled?: boolean
          short_term_ttl_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_capture?: boolean
          capture_sensitive?: boolean
          created_at?: string
          document_memory_enabled?: boolean
          long_term_enabled?: boolean
          organisation_sharing_enabled?: boolean
          retention_days?: number | null
          short_term_enabled?: boolean
          short_term_ttl_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_audit_logs: {
        Row: {
          action: string
          agent_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          org_id: string | null
          status: string
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          org_id?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          org_id?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_push: boolean
          browser_push_details: boolean
          created_at: string
          in_app: boolean
          min_severity: string
          muted_types: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_push?: boolean
          browser_push_details?: boolean
          created_at?: string
          in_app?: boolean
          min_severity?: string
          muted_types?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_push?: boolean
          browser_push_details?: boolean
          created_at?: string
          in_app?: boolean
          min_severity?: string
          muted_types?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          metadata: Json
          org_id: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          org_id?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          org_id?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          billing_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_agents: {
        Row: {
          allowed_tools: string[]
          autonomy: Database["public"]["Enums"]["autonomy_level"]
          budget_limit: number | null
          category: string
          created_at: string
          currency: string
          current_version: number
          description: string | null
          icon: string | null
          id: string
          instructions: string | null
          last_run_at: string | null
          max_tokens: number
          memory_enabled: boolean
          model: string
          model_provider: string
          name: string
          org_id: string | null
          org_id_fk: string | null
          personality: string | null
          preferences: Json
          purpose: string | null
          requires_approval: boolean
          schedule: string | null
          scope: string
          slug: string | null
          status: string
          system_prompt: string | null
          team_id: string | null
          temperature: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          allowed_tools?: string[]
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          budget_limit?: number | null
          category?: string
          created_at?: string
          currency?: string
          current_version?: number
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          last_run_at?: string | null
          max_tokens?: number
          memory_enabled?: boolean
          model?: string
          model_provider?: string
          name: string
          org_id?: string | null
          org_id_fk?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          slug?: string | null
          status?: string
          system_prompt?: string | null
          team_id?: string | null
          temperature?: number
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          allowed_tools?: string[]
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          budget_limit?: number | null
          category?: string
          created_at?: string
          currency?: string
          current_version?: number
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          last_run_at?: string | null
          max_tokens?: number
          memory_enabled?: boolean
          model?: string
          model_provider?: string
          name?: string
          org_id?: string | null
          org_id_fk?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          slug?: string | null
          status?: string
          system_prompt?: string | null
          team_id?: string | null
          temperature?: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_agents_org_id_fk_fkey"
            columns: ["org_id_fk"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_memories: {
        Row: {
          agent_id: string | null
          category: string
          created_at: string
          id: string
          key: string
          metadata: Json
          org_id: string | null
          scope: string
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string
          created_at?: string
          id?: string
          key: string
          metadata?: Json
          org_id?: string | null
          scope?: string
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string
          created_at?: string
          id?: string
          key?: string
          metadata?: Json
          org_id?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_memories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tasks: {
        Row: {
          agent_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          involves_money: boolean
          org_id: string | null
          priority: string
          request: string
          required_tools: string[]
          requires_approval: boolean
          result: Json | null
          scope: string
          status: Database["public"]["Enums"]["mc_task_status"]
          title: string | null
          updated_at: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          involves_money?: boolean
          org_id?: string | null
          priority?: string
          request: string
          required_tools?: string[]
          requires_approval?: boolean
          result?: Json | null
          scope?: string
          status?: Database["public"]["Enums"]["mc_task_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          involves_money?: boolean
          org_id?: string | null
          priority?: string
          request?: string
          required_tools?: string[]
          requires_approval?: boolean
          result?: Json | null
          scope?: string
          status?: Database["public"]["Enums"]["mc_task_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          is_active: boolean
          limits: Json
          name: string
          price_pence: number
          sort_order: number
          stripe_price_id: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          is_active?: boolean
          limits?: Json
          name: string
          price_pence?: number
          sort_order?: number
          stripe_price_id?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          is_active?: boolean
          limits?: Json
          name?: string
          price_pence?: number
          sort_order?: number
          stripe_price_id?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_watches: {
        Row: {
          agent_id: string | null
          best_price: number | null
          created_at: string
          currency: string
          id: string
          in_stock: boolean | null
          last_checked_at: string | null
          last_price: number | null
          notes: string | null
          product: string
          seller: string | null
          shopping_result_id: string | null
          status: string
          target_price: number | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          best_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          in_stock?: boolean | null
          last_checked_at?: string | null
          last_price?: number | null
          notes?: string | null
          product: string
          seller?: string | null
          shopping_result_id?: string | null
          status?: string
          target_price?: number | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          best_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          in_stock?: boolean | null
          last_checked_at?: string | null
          last_price?: number | null
          notes?: string | null
          product?: string
          seller?: string | null
          shopping_result_id?: string | null
          status?: string
          target_price?: number | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_watches_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_watches_shopping_result_id_fkey"
            columns: ["shopping_result_id"]
            isOneToOne: false
            referencedRelation: "shopping_results"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          approval_request_id: string | null
          checkout_reference: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          delivery_cost: number
          fees: number
          id: string
          item_price: number
          product: string
          quantity: number
          seller: string | null
          shopping_result_id: string | null
          shopping_task_id: string | null
          status: string
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_request_id?: string | null
          checkout_reference?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delivery_cost?: number
          fees?: number
          id?: string
          item_price?: number
          product: string
          quantity?: number
          seller?: string | null
          shopping_result_id?: string | null
          shopping_task_id?: string | null
          status?: string
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_request_id?: string | null
          checkout_reference?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delivery_cost?: number
          fees?: number
          id?: string
          item_price?: number
          product?: string
          quantity?: number
          seller?: string | null
          shopping_result_id?: string | null
          shopping_task_id?: string | null
          status?: string
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_shopping_result_id_fkey"
            columns: ["shopping_result_id"]
            isOneToOne: false
            referencedRelation: "shopping_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_shopping_task_id_fkey"
            columns: ["shopping_task_id"]
            isOneToOne: false
            referencedRelation: "shopping_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          budget: number | null
          created_at: string
          id: string
          list_id: string
          name: string
          notes: string | null
          position: number
          quantity: number
          shopping_result_id: string | null
          shopping_task_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          id?: string
          list_id: string
          name: string
          notes?: string | null
          position?: number
          quantity?: number
          shopping_result_id?: string | null
          shopping_task_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          id?: string
          list_id?: string
          name?: string
          notes?: string | null
          position?: number
          quantity?: number
          shopping_result_id?: string | null
          shopping_task_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_shopping_result_id_fkey"
            columns: ["shopping_result_id"]
            isOneToOne: false
            referencedRelation: "shopping_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_shopping_task_id_fkey"
            columns: ["shopping_task_id"]
            isOneToOne: false
            referencedRelation: "shopping_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          agent_id: string | null
          budget: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_results: {
        Row: {
          created_at: string
          currency: string
          delivery: string | null
          delivery_cost: number | null
          id: string
          image_url: string | null
          in_stock: boolean
          price: number | null
          product: string
          rating: number | null
          reason: string | null
          selected: boolean
          seller: string | null
          shopping_task_id: string
          specs: Json
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          delivery?: string | null
          delivery_cost?: number | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          price?: number | null
          product: string
          rating?: number | null
          reason?: string | null
          selected?: boolean
          seller?: string | null
          shopping_task_id: string
          specs?: Json
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          delivery?: string | null
          delivery_cost?: number | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          price?: number | null
          product?: string
          rating?: number | null
          reason?: string | null
          selected?: boolean
          seller?: string | null
          shopping_task_id?: string
          specs?: Json
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_results_shopping_task_id_fkey"
            columns: ["shopping_task_id"]
            isOneToOne: false
            referencedRelation: "shopping_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_tasks: {
        Row: {
          agent_id: string | null
          budget: number | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          requirement: string
          status: Database["public"]["Enums"]["mc_task_status"]
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          budget?: number | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          requirement: string
          status?: Database["public"]["Enums"]["mc_task_status"]
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          budget?: number | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          requirement?: string
          status?: Database["public"]["Enums"]["mc_task_status"]
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_limits: {
        Row: {
          agent_id: string | null
          created_at: string
          currency: string
          id: string
          monthly_cap: number | null
          per_transaction_limit: number | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          monthly_cap?: number | null
          per_transaction_limit?: number | null
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          monthly_cap?: number | null
          per_transaction_limit?: number | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spend_limits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          metadata: Json
          org_id: string | null
          plan_code: string
          seats: number
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          metadata?: Json
          org_id?: string | null
          plan_code: string
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          metadata?: Json
          org_id?: string | null
          plan_code?: string
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_role: string
          body: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          author_role?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee: string | null
          body: string | null
          channel: string
          created_at: string
          first_response_at: string | null
          id: string
          org_id: string | null
          priority: string
          requester_email: string | null
          requester_name: string | null
          resolved_at: string | null
          satisfaction: number | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          goal: string | null
          id: string
          lead_agent_id: string | null
          name: string
          org_id: string
          permissions: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          lead_agent_id?: string | null
          name: string
          org_id: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          lead_agent_id?: string | null
          name?: string
          org_id?: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_agent_id_fkey"
            columns: ["lead_agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_executions: {
        Row: {
          agent_id: string | null
          agent_task_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json
          org_id: string | null
          output: Json | null
          status: Database["public"]["Enums"]["exec_status"]
          tool: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_task_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          org_id?: string | null
          output?: Json | null
          status?: Database["public"]["Enums"]["exec_status"]
          tool: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_task_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          org_id?: string | null
          output?: Json | null
          status?: Database["public"]["Enums"]["exec_status"]
          tool?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_executions_agent_task_id_fkey"
            columns: ["agent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_permissions: {
        Row: {
          agent_id: string | null
          allowed_domains: string[]
          created_at: string
          enabled: boolean
          id: string
          org_id: string | null
          requires_approval: boolean
          spend_cap: number | null
          tool: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string | null
          requires_approval?: boolean
          spend_cap?: number | null
          tool: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string | null
          requires_approval?: boolean
          spend_cap?: number | null
          tool?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          category: string
          config_schema: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          min_plan: string | null
          name: string
          requires_approval: boolean
          risk_level: Database["public"]["Enums"]["mc_risk_level"]
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_plan?: string | null
          name: string
          requires_approval?: boolean
          risk_level?: Database["public"]["Enums"]["mc_risk_level"]
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_plan?: string | null
          name?: string
          requires_approval?: boolean
          risk_level?: Database["public"]["Enums"]["mc_risk_level"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_min_plan_fkey"
            columns: ["min_plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      usage_records: {
        Row: {
          agent_id: string | null
          agent_task_id: string | null
          id: string
          metadata: Json
          metric: string
          occurred_at: string
          org_id: string | null
          period_start: string
          quantity: number
          unit: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_task_id?: string | null
          id?: string
          metadata?: Json
          metric: string
          occurred_at?: string
          org_id?: string | null
          period_start?: string
          quantity?: number
          unit?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_task_id?: string | null
          id?: string
          metadata?: Json
          metric?: string
          occurred_at?: string
          org_id?: string | null
          period_start?: string
          quantity?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_agent_task_id_fkey"
            columns: ["agent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          role: Database["public"]["Enums"]["app_role"]
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
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          duration_ms: number | null
          error: string | null
          event: string
          id: string
          org_id: string | null
          payload: Json
          response_status: number | null
          status: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event: string
          id?: string
          org_id?: string | null
          payload?: Json
          response_status?: number | null
          status?: string
          user_id: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event?: string
          id?: string
          org_id?: string | null
          payload?: Json
          response_status?: number | null
          status?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          delivery_count: number
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_delivery_at: string | null
          name: string | null
          org_id: string | null
          secret_hash: string | null
          secret_prefix: string | null
          signing_secret: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_count?: number
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          name?: string | null
          org_id?: string | null
          secret_hash?: string | null
          secret_prefix?: string | null
          signing_secret?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_count?: number
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          name?: string | null
          org_id?: string | null
          secret_hash?: string | null
          secret_prefix?: string | null
          signing_secret?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          attempt: number
          completed_at: string | null
          cost_pence: number
          created_at: string
          error: string | null
          id: string
          input: string | null
          org_id: string | null
          output: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["exec_status"]
          step_results: Json
          tokens_in: number
          tokens_out: number
          trigger: string
          updated_at: string
          user_id: string
          workflow_id: string
          workforce_id: string | null
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          error?: string | null
          id?: string
          input?: string | null
          org_id?: string | null
          output?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_results?: Json
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          updated_at?: string
          user_id: string
          workflow_id: string
          workforce_id?: string | null
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          error?: string | null
          id?: string
          input?: string | null
          org_id?: string | null
          output?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_results?: Json
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          updated_at?: string
          user_id?: string
          workflow_id?: string
          workforce_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "workforces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_runs: {
        Row: {
          agent_id: string | null
          attempt: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: string | null
          kind: string
          name: string | null
          org_id: string | null
          output: string | null
          position: number
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["exec_status"]
          step_id: string | null
          task_id: string | null
          tokens_in: number
          tokens_out: number
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          agent_id?: string | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: string | null
          kind?: string
          name?: string | null
          org_id?: string | null
          output?: string | null
          position?: number
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_id?: string | null
          task_id?: string | null
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          agent_id?: string | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: string | null
          kind?: string
          name?: string | null
          org_id?: string | null
          output?: string | null
          position?: number
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_id?: string | null
          task_id?: string | null
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          agent_id: string | null
          condition: Json
          config: Json
          continue_on_error: boolean
          created_at: string
          depends_on: string[]
          id: string
          input_template: string | null
          kind: string
          max_retries: number
          mode: string
          name: string | null
          position: number
          requires_approval: boolean
          retry_delay_ms: number
          timeout_ms: number
          tool: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          agent_id?: string | null
          condition?: Json
          config?: Json
          continue_on_error?: boolean
          created_at?: string
          depends_on?: string[]
          id?: string
          input_template?: string | null
          kind?: string
          max_retries?: number
          mode?: string
          name?: string | null
          position?: number
          requires_approval?: boolean
          retry_delay_ms?: number
          timeout_ms?: number
          tool?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          agent_id?: string | null
          condition?: Json
          config?: Json
          continue_on_error?: boolean
          created_at?: string
          depends_on?: string[]
          id?: string
          input_template?: string | null
          kind?: string
          max_retries?: number
          mode?: string
          name?: string | null
          position?: number
          requires_approval?: boolean
          retry_delay_ms?: number
          timeout_ms?: number
          tool?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string | null
          schedule: string | null
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
          workforce_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id?: string | null
          schedule?: string | null
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id: string
          workforce_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string | null
          schedule?: string | null
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
          workforce_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "workforces"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_agents: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          role: string
          workforce_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          role?: string
          workforce_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          role?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_agents_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "workforces"
            referencedColumns: ["id"]
          },
        ]
      }
      workforces: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          name: string
          org_id: string | null
          purpose: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name: string
          org_id?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_is_visible: { Args: { _agent: string }; Returns: boolean }
      can_access: { Args: { _org: string; _user: string }; Returns: boolean }
      effective_plan: {
        Args: { _org?: string; _user: string }
        Returns: string
      }
      has_active_subscription: {
        Args: { _env?: string; _user: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      org_admin: { Args: { _org: string }; Returns: boolean }
      reap_stale_agent_tasks: { Args: { _user?: string }; Returns: number }
      record_usage: {
        Args: {
          _metadata?: Json
          _metric: string
          _org?: string
          _quantity: number
          _unit?: string
          _user: string
        }
        Returns: string
      }
      search_agent_memories: {
        Args: {
          _agent?: string
          _embedding: string
          _match_count?: number
          _min_similarity?: number
          _types?: string[]
        }
        Returns: {
          agent_id: string
          category: string
          content: string
          id: string
          importance: string
          memory_type: string
          pinned: boolean
          scope: string
          similarity: number
          source: string
          title: string
        }[]
      }
      search_memory_chunks: {
        Args: {
          _agent?: string
          _embedding: string
          _match_count?: number
          _min_similarity?: number
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      team_org: { Args: { _team: string }; Returns: string }
      workflow_is_visible: { Args: { _wf: string }; Returns: boolean }
      workflow_run_is_visible: { Args: { _run: string }; Returns: boolean }
      workforce_is_visible: { Args: { _wf: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      autonomy_level: "assist" | "prepare" | "execute" | "approval_required"
      exec_status:
        | "pending"
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "waiting_for_tool"
        | "waiting_for_approval"
        | "completed"
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "rejected"
        | "unlisted"
      mc_approval_status: "pending" | "approved" | "rejected" | "expired"
      mc_risk_level: "low" | "medium" | "high"
      mc_task_status:
        | "pending"
        | "queued"
        | "running"
        | "awaiting_approval"
        | "completed"
        | "failed"
        | "cancelled"
      org_role: "owner" | "admin" | "member"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "unpaid"
        | "paused"
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
      autonomy_level: ["assist", "prepare", "execute", "approval_required"],
      exec_status: [
        "pending",
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
        "waiting_for_tool",
        "waiting_for_approval",
        "completed",
      ],
      listing_status: [
        "draft",
        "pending_review",
        "published",
        "rejected",
        "unlisted",
      ],
      mc_approval_status: ["pending", "approved", "rejected", "expired"],
      mc_risk_level: ["low", "medium", "high"],
      mc_task_status: [
        "pending",
        "queued",
        "running",
        "awaiting_approval",
        "completed",
        "failed",
        "cancelled",
      ],
      org_role: ["owner", "admin", "member"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "unpaid",
        "paused",
      ],
    },
  },
} as const

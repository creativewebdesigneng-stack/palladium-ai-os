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
      agent_skill_script_executions: {
        Row: {
          agent_id: string | null
          approval_request_id: string
          completed_at: string | null
          error: string | null
          fingerprint: string
          id: string
          org_id: string | null
          result: Json | null
          script_name: string
          skill_id: string
          started_at: string
          status: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          approval_request_id: string
          completed_at?: string | null
          error?: string | null
          fingerprint: string
          id?: string
          org_id?: string | null
          result?: Json | null
          script_name: string
          skill_id: string
          started_at?: string
          status?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          approval_request_id?: string
          completed_at?: string | null
          error?: string | null
          fingerprint?: string
          id?: string
          org_id?: string | null
          result?: Json | null
          script_name?: string
          skill_id?: string
          started_at?: string
          status?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skill_script_executions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "agent_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          body: string
          created_at: string
          dangerous: boolean
          description: string
          enabled: boolean
          files: Json
          id: string
          name: string
          org_id: string | null
          requires_scripts: string[]
          requires_tools: string[]
          scan_findings: Json
          scan_verdict: string
          source_kind: string
          source_ref: string | null
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          body?: string
          created_at?: string
          dangerous?: boolean
          description?: string
          enabled?: boolean
          files?: Json
          id?: string
          name: string
          org_id?: string | null
          requires_scripts?: string[]
          requires_tools?: string[]
          scan_findings?: Json
          scan_verdict?: string
          source_kind?: string
          source_ref?: string | null
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          body?: string
          created_at?: string
          dangerous?: boolean
          description?: string
          enabled?: boolean
          files?: Json
          id?: string
          name?: string
          org_id?: string | null
          requires_scripts?: string[]
          requires_tools?: string[]
          scan_findings?: Json
          scan_verdict?: string
          source_kind?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          agent_id: string | null
          approval_resume_state: Json | null
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
          planner_state: Json
          provider: string | null
          replan_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["exec_status"]
          task_id: string | null
          title: string | null
          tokens_in: number
          tokens_out: number
          tool_calls: number
          updated_at: string
          user_id: string
          verification_state: Json
          waiting_approval_request_id: string | null
        }
        Insert: {
          agent_id?: string | null
          approval_resume_state?: Json | null
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
          planner_state?: Json
          provider?: string | null
          replan_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          task_id?: string | null
          title?: string | null
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id: string
          verification_state?: Json
          waiting_approval_request_id?: string | null
        }
        Update: {
          agent_id?: string | null
          approval_resume_state?: Json | null
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
          planner_state?: Json
          provider?: string | null
          replan_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          task_id?: string | null
          title?: string | null
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id?: string
          verification_state?: Json
          waiting_approval_request_id?: string | null
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
      agent_workspaces: {
        Row: {
          agent_id: string | null
          branch_name: string | null
          created_at: string
          id: string
          isolation_mode: string
          metadata: Json
          objective: string
          org_id: string | null
          project_id: string | null
          runtime_task_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          isolation_mode?: string
          metadata?: Json
          objective?: string
          org_id?: string | null
          project_id?: string | null
          runtime_task_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_id?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          isolation_mode?: string
          metadata?: Json
          objective?: string
          org_id?: string | null
          project_id?: string | null
          runtime_task_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      app_studio_apps: {
        Row: {
          application_type: string
          created_at: string
          description: string
          id: string
          name: string
          org_id: string | null
          published_release_id: string | null
          settings: Json
          slug: string
          status: string
          theme: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          application_type?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          org_id?: string | null
          published_release_id?: string | null
          settings?: Json
          slug: string
          status?: string
          theme?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          application_type?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          org_id?: string | null
          published_release_id?: string | null
          settings?: Json
          slug?: string
          status?: string
          theme?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_apps_published_release_id_fkey"
            columns: ["published_release_id"]
            isOneToOne: false
            referencedRelation: "app_studio_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      app_studio_datasources: {
        Row: {
          app_id: string
          config: Json
          connection_ref: string | null
          created_at: string
          enabled: boolean
          environment: string
          id: string
          name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          config?: Json
          connection_ref?: string | null
          created_at?: string
          enabled?: boolean
          environment?: string
          id?: string
          name: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          config?: Json
          connection_ref?: string | null
          created_at?: string
          enabled?: boolean
          environment?: string
          id?: string
          name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_datasources_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_studio_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_studio_pages: {
        Row: {
          app_id: string
          created_at: string
          id: string
          is_home: boolean
          layout: Json
          name: string
          position: number
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          is_home?: boolean
          layout?: Json
          name: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          is_home?: boolean
          layout?: Json
          name?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_pages_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_studio_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_studio_queries: {
        Row: {
          app_id: string
          configuration: Json
          created_at: string
          datasource_id: string
          id: string
          name: string
          operation: string
          page_id: string | null
          requires_approval: boolean
          run_on_load: boolean
          timeout_ms: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          configuration?: Json
          created_at?: string
          datasource_id: string
          id?: string
          name: string
          operation: string
          page_id?: string | null
          requires_approval?: boolean
          run_on_load?: boolean
          timeout_ms?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          configuration?: Json
          created_at?: string
          datasource_id?: string
          id?: string
          name?: string
          operation?: string
          page_id?: string | null
          requires_approval?: boolean
          run_on_load?: boolean
          timeout_ms?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_queries_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_studio_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_studio_queries_datasource_id_fkey"
            columns: ["datasource_id"]
            isOneToOne: false
            referencedRelation: "app_studio_datasources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_studio_queries_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "app_studio_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_studio_releases: {
        Row: {
          app_id: string
          created_at: string
          id: string
          notes: string
          published_at: string | null
          snapshot: Json
          status: string
          user_id: string
          version: number
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          notes?: string
          published_at?: string | null
          snapshot: Json
          status?: string
          user_id: string
          version: number
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          notes?: string
          published_at?: string | null
          snapshot?: Json
          status?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_releases_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_studio_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_studio_widgets: {
        Row: {
          app_id: string
          bindings: Json
          created_at: string
          events: Json
          id: string
          name: string
          page_id: string
          parent_id: string | null
          position: Json
          properties: Json
          updated_at: string
          user_id: string
          widget_type: string
        }
        Insert: {
          app_id: string
          bindings?: Json
          created_at?: string
          events?: Json
          id?: string
          name: string
          page_id: string
          parent_id?: string | null
          position?: Json
          properties?: Json
          updated_at?: string
          user_id: string
          widget_type: string
        }
        Update: {
          app_id?: string
          bindings?: Json
          created_at?: string
          events?: Json
          id?: string
          name?: string
          page_id?: string
          parent_id?: string | null
          position?: Json
          properties?: Json
          updated_at?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_studio_widgets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "app_studio_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_studio_widgets_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "app_studio_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_studio_widgets_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "app_studio_widgets"
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
          executed_at: string | null
          execution_error: string | null
          execution_result: Json | null
          execution_status: string | null
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
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: Json | null
          execution_status?: string | null
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
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: Json | null
          execution_status?: string | null
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
      browser_artifacts: {
        Row: {
          agent_id: string | null
          created_at: string
          filename: string
          id: string
          kind: string
          mime_type: string | null
          org_id: string | null
          sha256: string
          size_bytes: number
          source_url: string | null
          storage_path: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          filename: string
          id?: string
          kind?: string
          mime_type?: string | null
          org_id?: string | null
          sha256: string
          size_bytes: number
          source_url?: string | null
          storage_path: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          kind?: string
          mime_type?: string | null
          org_id?: string | null
          sha256?: string
          size_bytes?: number
          source_url?: string | null
          storage_path?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      browser_credentials: {
        Row: {
          created_at: string
          domain: string
          id: string
          last_used_at: string | null
          name: string
          org_id: string | null
          password_ciphertext: string | null
          totp_identifier: string | null
          totp_secret_ciphertext: string | null
          updated_at: string
          user_id: string
          username_ciphertext: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          last_used_at?: string | null
          name: string
          org_id?: string | null
          password_ciphertext?: string | null
          totp_identifier?: string | null
          totp_secret_ciphertext?: string | null
          updated_at?: string
          user_id: string
          username_ciphertext?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          last_used_at?: string | null
          name?: string
          org_id?: string | null
          password_ciphertext?: string | null
          totp_identifier?: string | null
          totp_secret_ciphertext?: string | null
          updated_at?: string
          user_id?: string
          username_ciphertext?: string | null
        }
        Relationships: []
      }
      browser_profiles: {
        Row: {
          agent_id: string
          created_at: string
          domain_scope: string[]
          id: string
          last_used_at: string | null
          org_id: string | null
          scope_key: string
          state_ciphertext: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          domain_scope?: string[]
          id?: string
          last_used_at?: string | null
          org_id?: string | null
          scope_key: string
          state_ciphertext: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          domain_scope?: string[]
          id?: string
          last_used_at?: string | null
          org_id?: string | null
          scope_key?: string
          state_ciphertext?: string
          updated_at?: string
          user_id?: string
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
          provider: string
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
      builder_deployments: {
        Row: {
          builder_job_id: string
          created_at: string
          id: string
          last_error: string | null
          production_aliases: Json
          production_approval_id: string | null
          production_last_error: string | null
          production_promoted_at: string | null
          production_status: string
          provider: string
          provider_deployment_id: string | null
          provider_project_id: string | null
          status: string
          target: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          builder_job_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          production_aliases?: Json
          production_approval_id?: string | null
          production_last_error?: string | null
          production_promoted_at?: string | null
          production_status?: string
          provider?: string
          provider_deployment_id?: string | null
          provider_project_id?: string | null
          status?: string
          target?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          builder_job_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          production_aliases?: Json
          production_approval_id?: string | null
          production_last_error?: string | null
          production_promoted_at?: string | null
          production_status?: string
          provider?: string
          provider_deployment_id?: string | null
          provider_project_id?: string | null
          status?: string
          target?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_deployments_builder_job_id_fkey"
            columns: ["builder_job_id"]
            isOneToOne: false
            referencedRelation: "builder_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_jobs: {
        Row: {
          branch_approval_id: string | null
          branch_name: string | null
          created_at: string
          file_approval_ids: Json
          id: string
          last_error: string | null
          plan: Json | null
          prompt: string
          repair_attempt: number
          repair_last_error: string | null
          repair_manifest: Json | null
          repair_status: string
          repository_full_name: string | null
          repository_last_error: string | null
          repository_status: string
          sandbox_finished_at: string | null
          sandbox_id: string | null
          sandbox_last_error: string | null
          sandbox_provider: string | null
          sandbox_results: Json | null
          sandbox_started_at: string | null
          sandbox_status: string
          source_last_error: string | null
          source_manifest: Json | null
          source_status: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_approval_id?: string | null
          branch_name?: string | null
          created_at?: string
          file_approval_ids?: Json
          id?: string
          last_error?: string | null
          plan?: Json | null
          prompt: string
          repair_attempt?: number
          repair_last_error?: string | null
          repair_manifest?: Json | null
          repair_status?: string
          repository_full_name?: string | null
          repository_last_error?: string | null
          repository_status?: string
          sandbox_finished_at?: string | null
          sandbox_id?: string | null
          sandbox_last_error?: string | null
          sandbox_provider?: string | null
          sandbox_results?: Json | null
          sandbox_started_at?: string | null
          sandbox_status?: string
          source_last_error?: string | null
          source_manifest?: Json | null
          source_status?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_approval_id?: string | null
          branch_name?: string | null
          created_at?: string
          file_approval_ids?: Json
          id?: string
          last_error?: string | null
          plan?: Json | null
          prompt?: string
          repair_attempt?: number
          repair_last_error?: string | null
          repair_manifest?: Json | null
          repair_status?: string
          repository_full_name?: string | null
          repository_last_error?: string | null
          repository_status?: string
          sandbox_finished_at?: string | null
          sandbox_id?: string | null
          sandbox_last_error?: string | null
          sandbox_provider?: string | null
          sandbox_results?: Json | null
          sandbox_started_at?: string | null
          sandbox_status?: string
          source_last_error?: string | null
          source_manifest?: Json | null
          source_status?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commerce_workspaces: {
        Row: {
          connection_ref: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          name: string
          org_id: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          name: string
          org_id?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          connection_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          name?: string
          org_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      context_timeline_cards: {
        Row: {
          body: string
          card_kind: string
          created_at: string
          id: string
          knowledge_document_id: string | null
          metadata: Json
          occurred_at: string
          org_id: string | null
          pinned: boolean
          source_id: string | null
          source_kind: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body?: string
          card_kind?: string
          created_at?: string
          id?: string
          knowledge_document_id?: string | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          pinned?: boolean
          source_id?: string | null
          source_kind?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          card_kind?: string
          created_at?: string
          id?: string
          knowledge_document_id?: string | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          pinned?: boolean
          source_id?: string | null
          source_kind?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_timeline_cards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
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
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          kind: string
          sort_order: number
          target_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          sort_order?: number
          target_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          sort_order?: number
          target_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployment_targets: {
        Row: {
          created_at: string
          id: string
          name: string
          provider: string
          resource_kind: string
          resource_uuid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          provider?: string
          resource_kind?: string
          resource_uuid: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          provider?: string
          resource_kind?: string
          resource_uuid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_mcp_servers: {
        Row: {
          allowed_tool_names: string[]
          auth_header_ciphertext: string | null
          auth_header_name: string | null
          cached_tools: Json
          created_at: string
          enabled: boolean
          endpoint_url: string
          id: string
          last_discovered_at: string | null
          name: string
          org_id: string | null
          requires_approval: boolean
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_tool_names?: string[]
          auth_header_ciphertext?: string | null
          auth_header_name?: string | null
          cached_tools?: Json
          created_at?: string
          enabled?: boolean
          endpoint_url: string
          id?: string
          last_discovered_at?: string | null
          name: string
          org_id?: string | null
          requires_approval?: boolean
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_tool_names?: string[]
          auth_header_ciphertext?: string | null
          auth_header_name?: string | null
          cached_tools?: Json
          created_at?: string
          enabled?: boolean
          endpoint_url?: string
          id?: string
          last_discovered_at?: string | null
          name?: string
          org_id?: string | null
          requires_approval?: boolean
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      fitness_profiles: {
        Row: {
          created_at: string
          goal: string | null
          units: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          units?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          units?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_weight_entries: {
        Row: {
          created_at: string
          id: string
          recorded_on: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_on?: string
          user_id?: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          recorded_on?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      fitness_workouts: {
        Row: {
          completed_at: string | null
          created_at: string
          exercises: Json
          id: string
          name: string
          notes: string | null
          scheduled_for: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercises?: Json
          id?: string
          name: string
          notes?: string | null
          scheduled_for?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercises?: Json
          id?: string
          name?: string
          notes?: string | null
          scheduled_for?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      html_studio_documents: {
        Row: {
          created_at: string
          html: string
          id: string
          org_id: string | null
          source_kind: string
          source_note_id: string | null
          source_text: string
          status: string
          surface: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html?: string
          id?: string
          org_id?: string | null
          source_kind?: string
          source_note_id?: string | null
          source_text?: string
          status?: string
          surface?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          org_id?: string | null
          source_kind?: string
          source_note_id?: string | null
          source_text?: string
          status?: string
          surface?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "html_studio_documents_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "zen_notes"
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
      media_edit_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_name: string
          margin_after_ms: number
          margin_before_ms: number
          metadata: Json
          mode: string
          output_format: string
          output_url: string | null
          source_url: string
          status: string
          threshold: number
          updated_at: string
          user_id: string
          worker_job_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_name: string
          margin_after_ms?: number
          margin_before_ms?: number
          metadata?: Json
          mode: string
          output_format?: string
          output_url?: string | null
          source_url: string
          status?: string
          threshold?: number
          updated_at?: string
          user_id: string
          worker_job_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_name?: string
          margin_after_ms?: number
          margin_before_ms?: number
          metadata?: Json
          mode?: string
          output_format?: string
          output_url?: string | null
          source_url?: string
          status?: string
          threshold?: number
          updated_at?: string
          user_id?: string
          worker_job_id?: string | null
        }
        Relationships: []
      }
      media_generation_jobs: {
        Row: {
          aspect_ratio: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          kind: string
          metadata: Json
          output_url: string | null
          prompt: string
          provider: string
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
          worker_job_id: string | null
        }
        Insert: {
          aspect_ratio: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          kind: string
          metadata?: Json
          output_url?: string | null
          prompt: string
          provider: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          worker_job_id?: string | null
        }
        Update: {
          aspect_ratio?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          kind?: string
          metadata?: Json
          output_url?: string | null
          prompt?: string
          provider?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          worker_job_id?: string | null
        }
        Relationships: []
      }
      media_timeline_keyframes: {
        Row: {
          created_at: string
          id: string
          interpolation: string
          org_id: string | null
          time_ms: number
          track_id: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          interpolation?: string
          org_id?: string | null
          time_ms: number
          track_id: string
          user_id?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          interpolation?: string
          org_id?: string | null
          time_ms?: number
          track_id?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "media_timeline_keyframes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "media_timeline_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_timeline_tracks: {
        Row: {
          created_at: string
          id: string
          kind: string
          media_job_id: string | null
          name: string
          org_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          media_job_id?: string | null
          name: string
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          media_job_id?: string | null
          name?: string
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      model_eval_responses: {
        Row: {
          created_at: string
          id: string
          input_tokens: number | null
          label: string | null
          latency_ms: number | null
          metadata: Json
          model: string
          output_tokens: number | null
          provider: string
          response_text: string
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number | null
          label?: string | null
          latency_ms?: number | null
          metadata?: Json
          model: string
          output_tokens?: number | null
          provider: string
          response_text: string
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number | null
          label?: string | null
          latency_ms?: number | null
          metadata?: Json
          model?: string
          output_tokens?: number | null
          provider?: string
          response_text?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_eval_responses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "model_eval_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      model_eval_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          evaluation_mode: string
          id: string
          judge_model: string | null
          judge_provider: string | null
          metadata: Json
          name: string
          org_id: string | null
          prompt: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          evaluation_mode?: string
          id?: string
          judge_model?: string | null
          judge_provider?: string | null
          metadata?: Json
          name: string
          org_id?: string | null
          prompt: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          evaluation_mode?: string
          id?: string
          judge_model?: string | null
          judge_provider?: string | null
          metadata?: Json
          name?: string
          org_id?: string | null
          prompt?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_eval_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_eval_scores: {
        Row: {
          created_at: string
          criteria: Json
          evaluator_type: string
          id: string
          reasoning: string | null
          response_id: string
          run_id: string
          score: number
          verdict: string | null
        }
        Insert: {
          created_at?: string
          criteria?: Json
          evaluator_type: string
          id?: string
          reasoning?: string | null
          response_id: string
          run_id: string
          score: number
          verdict?: string | null
        }
        Update: {
          created_at?: string
          criteria?: Json
          evaluator_type?: string
          id?: string
          reasoning?: string | null
          response_id?: string
          run_id?: string
          score?: number
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_eval_scores_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "model_eval_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_eval_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "model_eval_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_endpoints: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          provider: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          provider?: string
          topic: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          provider?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          allowed_providers: string[]
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
          operating_profile: Json
          org_id: string | null
          org_id_fk: string | null
          personality: string | null
          preferences: Json
          purpose: string | null
          requires_approval: boolean
          schedule: string | null
          scope: string
          slug: string | null
          spec_version: number
          status: string
          system_prompt: string | null
          team_id: string | null
          temperature: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          allowed_providers?: string[]
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
          operating_profile?: Json
          org_id?: string | null
          org_id_fk?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          slug?: string | null
          spec_version?: number
          status?: string
          system_prompt?: string | null
          team_id?: string | null
          temperature?: number
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          allowed_providers?: string[]
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
          operating_profile?: Json
          org_id?: string | null
          org_id_fk?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          slug?: string | null
          spec_version?: number
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
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          occurred_at: string
          path: string | null
          project_id: string
          properties: Json
          referrer: string | null
          revenue_cents: number
          session_id: string | null
          user_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          occurred_at?: string
          path?: string | null
          project_id: string
          properties?: Json
          referrer?: string | null
          revenue_cents?: number
          session_id?: string | null
          user_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          occurred_at?: string
          path?: string | null
          project_id?: string
          properties?: Json
          referrer?: string | null
          revenue_cents?: number
          session_id?: string | null
          user_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics_experiments: {
        Row: {
          completed_at: string | null
          created_at: string
          goal_event: string
          id: string
          name: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          variants: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          goal_event: string
          id?: string
          name: string
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          variants?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          goal_event?: string
          id?: string
          name?: string
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics_funnels: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_funnels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics_projects: {
        Row: {
          created_at: string
          currency: string
          domain: string | null
          id: string
          metadata: Json
          name: string
          org_id: string | null
          updated_at: string
          user_id: string
          write_key: string
        }
        Insert: {
          created_at?: string
          currency?: string
          domain?: string | null
          id?: string
          metadata?: Json
          name: string
          org_id?: string | null
          updated_at?: string
          user_id: string
          write_key?: string
        }
        Update: {
          created_at?: string
          currency?: string
          domain?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_id?: string | null
          updated_at?: string
          user_id?: string
          write_key?: string
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
      project_activity: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          metadata: Json
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          metadata?: Json
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          metadata?: Json
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cycles: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          goal: string | null
          id: string
          metadata: Json
          name: string
          project_id: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          goal?: string | null
          id?: string
          metadata?: Json
          name: string
          project_id: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          goal?: string | null
          id?: string
          metadata?: Json
          name?: string
          project_id?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cycles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_modules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json
          name: string
          project_id: string
          status: string
          target_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          project_id: string
          status?: string
          target_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          project_id?: string
          status?: string
          target_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resources: {
        Row: {
          added_by: string
          created_at: string
          id: string
          project_id: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          project_id: string
          resource_id: string
          resource_type: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          project_id?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_work_items: {
        Row: {
          assignee_id: string | null
          assignee_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          cycle_id: string | null
          description: string | null
          due_at: string | null
          estimate: number | null
          id: string
          labels: string[]
          metadata: Json
          module_id: string | null
          parent_id: string | null
          priority: string
          project_id: string
          sort_order: number
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_type?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          cycle_id?: string | null
          description?: string | null
          due_at?: string | null
          estimate?: number | null
          id?: string
          labels?: string[]
          metadata?: Json
          module_id?: string | null
          parent_id?: string | null
          priority?: string
          project_id: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          cycle_id?: string | null
          description?: string | null
          due_at?: string | null
          estimate?: number | null
          id?: string
          labels?: string[]
          metadata?: Json
          module_id?: string | null
          parent_id?: string | null
          priority?: string
          project_id?: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_work_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "project_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_work_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "project_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          name: string
          org_id: string | null
          priority: string
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          name: string
          org_id?: string | null
          priority?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_id?: string | null
          priority?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
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
      quant_backtest_runs: {
        Row: {
          created_at: string
          equity_curve: Json
          error: string | null
          id: string
          metrics: Json
          org_id: string | null
          period_end: string
          period_start: string
          starting_capital: number
          status: string
          strategy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equity_curve?: Json
          error?: string | null
          id?: string
          metrics?: Json
          org_id?: string | null
          period_end: string
          period_start: string
          starting_capital: number
          status?: string
          strategy_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          equity_curve?: Json
          error?: string | null
          id?: string
          metrics?: Json
          org_id?: string | null
          period_end?: string
          period_start?: string
          starting_capital?: number
          status?: string
          strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quant_backtest_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "quant_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_strategies: {
        Row: {
          asset_class: string
          base_currency: string
          config: Json
          created_at: string
          id: string
          name: string
          org_id: string | null
          risk_target: number
          universe: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          base_currency?: string
          config?: Json
          created_at?: string
          id?: string
          name: string
          org_id?: string | null
          risk_target?: number
          universe?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          asset_class?: string
          base_currency?: string
          config?: Json
          created_at?: string
          id?: string
          name?: string
          org_id?: string | null
          risk_target?: number
          universe?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      remote_developer_sessions: {
        Row: {
          connection_ref: string | null
          created_at: string
          id: string
          label: string
          last_seen_at: string | null
          metadata: Json
          org_id: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_ref?: string | null
          created_at?: string
          id?: string
          label: string
          last_seen_at?: string | null
          metadata?: Json
          org_id?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          connection_ref?: string | null
          created_at?: string
          id?: string
          label?: string
          last_seen_at?: string | null
          metadata?: Json
          org_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      runtime_worker_credentials: {
        Row: {
          created_at: string
          enabled: boolean
          name: string
          token_sha256: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          name: string
          token_sha256: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          name?: string
          token_sha256?: string
          updated_at?: string
        }
        Relationships: []
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
      smart_table_records: {
        Row: {
          created_at: string
          id: string
          table_id: string
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          created_at?: string
          id?: string
          table_id: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Update: {
          created_at?: string
          id?: string
          table_id?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "smart_table_records_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "smart_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_table_views: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: string
          name: string
          table_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          name: string
          table_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          name?: string
          table_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_table_views_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "smart_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_tables: {
        Row: {
          created_at: string
          default_view: string
          description: string | null
          fields: Json
          id: string
          name: string
          org_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_view?: string
          description?: string | null
          fields?: Json
          id?: string
          name: string
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          default_view?: string
          description?: string | null
          fields?: Json
          id?: string
          name?: string
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_post_targets: {
        Row: {
          action: string
          action_input: Json
          approval_request_id: string | null
          created_at: string
          id: string
          last_error: string | null
          metrics: Json
          post_id: string
          provider: string
          provider_post_id: string | null
          published_at: string | null
          published_url: string | null
          status: string
          transport: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          action_input?: Json
          approval_request_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          metrics?: Json
          post_id: string
          provider: string
          provider_post_id?: string | null
          published_at?: string | null
          published_url?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          action?: string
          action_input?: Json
          approval_request_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          metrics?: Json
          post_id?: string
          provider?: string
          provider_post_id?: string | null
          published_at?: string | null
          published_url?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_targets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          campaign: string | null
          content: string
          created_at: string
          created_by_agent_id: string | null
          id: string
          labels: string[]
          media: Json
          metadata: Json
          org_id: string | null
          published_at: string | null
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign?: string | null
          content: string
          created_at?: string
          created_by_agent_id?: string | null
          id?: string
          labels?: string[]
          media?: Json
          metadata?: Json
          org_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign?: string | null
          content?: string
          created_at?: string
          created_by_agent_id?: string | null
          id?: string
          labels?: string[]
          media?: Json
          metadata?: Json
          org_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      support_canned_responses: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          shortcut: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          shortcut: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          shortcut?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_help_articles: {
        Row: {
          body_markdown: string
          created_at: string
          id: string
          locale: string
          slug: string
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_markdown?: string
          created_at?: string
          id?: string
          locale?: string
          slug: string
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          id?: string
          locale?: string
          slug?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_inboxes: {
        Row: {
          auto_assignment: boolean
          business_hours: Json
          channel: string
          created_at: string
          id: string
          integration_connection_id: string | null
          integration_provider: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_assignment?: boolean
          business_hours?: Json
          channel: string
          created_at?: string
          id?: string
          integration_connection_id?: string | null
          integration_provider?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          auto_assignment?: boolean
          business_hours?: Json
          channel?: string
          created_at?: string
          id?: string
          integration_connection_id?: string | null
          integration_provider?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_role: string
          body: string
          created_at: string
          delivery_status: string | null
          external_message_id: string | null
          id: string
          metadata: Json
          private_note: boolean
          ticket_id: string
          user_id: string
        }
        Insert: {
          author_role?: string
          body: string
          created_at?: string
          delivery_status?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json
          private_note?: boolean
          ticket_id: string
          user_id: string
        }
        Update: {
          author_role?: string
          body?: string
          created_at?: string
          delivery_status?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json
          private_note?: boolean
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
          assigned_team: string | null
          assignee: string | null
          body: string | null
          channel: string
          created_at: string
          crm_contact_id: string | null
          external_thread_id: string | null
          first_response_at: string | null
          id: string
          inbox_id: string | null
          labels: string[]
          metadata: Json
          org_id: string | null
          priority: string
          requester_email: string | null
          requester_name: string | null
          resolved_at: string | null
          satisfaction: number | null
          status: string
          subject: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_team?: string | null
          assignee?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          crm_contact_id?: string | null
          external_thread_id?: string | null
          first_response_at?: string | null
          id?: string
          inbox_id?: string | null
          labels?: string[]
          metadata?: Json
          org_id?: string | null
          priority?: string
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          status?: string
          subject: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_team?: string | null
          assignee?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          crm_contact_id?: string | null
          external_thread_id?: string | null
          first_response_at?: string | null
          id?: string
          inbox_id?: string | null
          labels?: string[]
          metadata?: Json
          org_id?: string | null
          priority?: string
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          status?: string
          subject?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "support_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_connections: {
        Row: {
          connection_ref: string | null
          created_at: string
          direction: string
          id: string
          last_synced_at: string | null
          local_root: string
          metadata: Json
          name: string
          org_id: string | null
          provider: string
          remote_root: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_ref?: string | null
          created_at?: string
          direction?: string
          id?: string
          last_synced_at?: string | null
          local_root: string
          metadata?: Json
          name: string
          org_id?: string | null
          provider: string
          remote_root: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          connection_ref?: string | null
          created_at?: string
          direction?: string
          id?: string
          last_synced_at?: string | null
          local_root?: string
          metadata?: Json
          name?: string
          org_id?: string | null
          provider?: string
          remote_root?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      three_d_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_name: string
          metadata: Json
          output_url: string | null
          preview_url: string | null
          requested_format: string
          source_url: string
          status: string
          updated_at: string
          user_id: string
          worker_job_id: string | null
          workflow: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_name: string
          metadata?: Json
          output_url?: string | null
          preview_url?: string | null
          requested_format?: string
          source_url: string
          status?: string
          updated_at?: string
          user_id?: string
          worker_job_id?: string | null
          workflow?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_name?: string
          metadata?: Json
          output_url?: string | null
          preview_url?: string | null
          requested_format?: string
          source_url?: string
          status?: string
          updated_at?: string
          user_id?: string
          worker_job_id?: string | null
          workflow?: string
        }
        Relationships: []
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
      user_ai_preferences: {
        Row: {
          created_at: string
          default_model: string
          default_provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_model: string
          default_provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_model?: string
          default_provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          body: string
          created_at: string
          doc_type: string
          format: string
          id: string
          input_tokens: number
          model: string | null
          origin_document_id: string | null
          output_tokens: number
          provider: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          doc_type?: string
          format?: string
          id?: string
          input_tokens?: number
          model?: string | null
          origin_document_id?: string | null
          output_tokens?: number
          provider?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          doc_type?: string
          format?: string
          id?: string
          input_tokens?: number
          model?: string | null
          origin_document_id?: string | null
          output_tokens?: number
          provider?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_origin_document_id_fkey"
            columns: ["origin_document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
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
      voice_assistant_preferences: {
        Row: {
          announce_notifications: boolean
          created_at: string
          enabled: boolean
          muted: boolean
          pitch: number
          rate: number
          updated_at: string
          user_id: string
          voice_name: string | null
          wake_word_enabled: boolean
        }
        Insert: {
          announce_notifications?: boolean
          created_at?: string
          enabled?: boolean
          muted?: boolean
          pitch?: number
          rate?: number
          updated_at?: string
          user_id: string
          voice_name?: string | null
          wake_word_enabled?: boolean
        }
        Update: {
          announce_notifications?: boolean
          created_at?: string
          enabled?: boolean
          muted?: boolean
          pitch?: number
          rate?: number
          updated_at?: string
          user_id?: string
          voice_name?: string | null
          wake_word_enabled?: boolean
        }
        Relationships: []
      }
      voice_clone_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          output_bytes: number | null
          provider: string
          reference_filename: string
          reference_mime_type: string
          speed: number
          status: string
          steps: number
          text: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          output_bytes?: number | null
          provider?: string
          reference_filename: string
          reference_mime_type: string
          speed?: number
          status?: string
          steps?: number
          text: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          output_bytes?: number | null
          provider?: string
          reference_filename?: string
          reference_mime_type?: string
          speed?: number
          status?: string
          steps?: number
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      web_crawl_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          operation: string
          provider: string
          provider_job_id: string | null
          result: Json
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          operation: string
          provider: string
          provider_job_id?: string | null
          result?: Json
          source: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          operation?: string
          provider?: string
          provider_job_id?: string | null
          result?: Json
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      web_intelligence_snapshots: {
        Row: {
          content_hash: string
          created_at: string
          excerpt: string | null
          id: string
          org_id: string | null
          selectors: Json
          source_url: string
          user_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          excerpt?: string | null
          id?: string
          org_id?: string | null
          selectors?: Json
          source_url: string
          user_id?: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          org_id?: string | null
          selectors?: Json
          source_url?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          dead_lettered_at: string | null
          delivered_at: string | null
          duration_ms: number | null
          error: string | null
          event: string
          id: string
          last_attempt_at: string | null
          next_attempt_at: string | null
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
          dead_lettered_at?: string | null
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event: string
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
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
          dead_lettered_at?: string | null
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event?: string
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
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
      whatsapp_broadcast_recipients: {
        Row: {
          broadcast_id: string
          contact_id: string
          created_at: string
          external_message_id: string | null
          id: string
          last_error: string | null
          params: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          contact_id: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          last_error?: string | null
          params?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          broadcast_id?: string
          contact_id?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          last_error?: string | null
          params?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcasts: {
        Row: {
          body_preview: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          scheduled_for: string | null
          status: string
          template_language: string | null
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          scheduled_for?: string | null
          status?: string
          template_language?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          scheduled_for?: string | null
          status?: string
          template_language?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_agent_id: string | null
          contact_id: string
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          metadata: Json
          provider: string
          status: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          contact_id: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json
          provider?: string
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          assigned_agent_id?: string | null
          contact_id?: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json
          provider?: string
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content_type: string
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          external_message_id: string | null
          id: string
          media: Json
          metadata: Json
          reply_to_message_id: string | null
          status: string
          text_content: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type?: string
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          external_message_id?: string | null
          id?: string
          media?: Json
          metadata?: Json
          reply_to_message_id?: string | null
          status?: string
          text_content?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          content_type?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          external_message_id?: string | null
          id?: string
          media?: Json
          metadata?: Json
          reply_to_message_id?: string | null
          status?: string
          text_content?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          attempt: number
          cancel_requested: boolean
          claimed_at: string | null
          completed_at: string | null
          cost_pence: number
          created_at: string
          error: string | null
          id: string
          input: string | null
          org_id: string | null
          output: string | null
          queued_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["exec_status"]
          step_results: Json
          tokens_in: number
          tokens_out: number
          trigger: string
          updated_at: string
          user_id: string
          waiting_approval_request_id: string | null
          waiting_step_id: string | null
          worker_attempts: number
          worker_error: string | null
          worker_heartbeat_at: string | null
          workflow_id: string
          workforce_id: string | null
        }
        Insert: {
          attempt?: number
          cancel_requested?: boolean
          claimed_at?: string | null
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          error?: string | null
          id?: string
          input?: string | null
          org_id?: string | null
          output?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_results?: Json
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          updated_at?: string
          user_id: string
          waiting_approval_request_id?: string | null
          waiting_step_id?: string | null
          worker_attempts?: number
          worker_error?: string | null
          worker_heartbeat_at?: string | null
          workflow_id: string
          workforce_id?: string | null
        }
        Update: {
          attempt?: number
          cancel_requested?: boolean
          claimed_at?: string | null
          completed_at?: string | null
          cost_pence?: number
          created_at?: string
          error?: string | null
          id?: string
          input?: string | null
          org_id?: string | null
          output?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exec_status"]
          step_results?: Json
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          updated_at?: string
          user_id?: string
          waiting_approval_request_id?: string | null
          waiting_step_id?: string | null
          worker_attempts?: number
          worker_error?: string | null
          worker_heartbeat_at?: string | null
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
      zen_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          knowledge_document_id: string | null
          lifecycle: string
          note_kind: string
          org_id: string | null
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          knowledge_document_id?: string | null
          lifecycle?: string
          note_kind?: string
          org_id?: string | null
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          knowledge_document_id?: string | null
          lifecycle?: string
          note_kind?: string
          org_id?: string | null
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      get_published_app_studio_release: {
        Args: { p_app_id: string }
        Returns: Json
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

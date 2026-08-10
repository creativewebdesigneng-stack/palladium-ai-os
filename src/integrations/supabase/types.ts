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
            foreignKeyName: "agent_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
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
          id: string
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
          id?: string
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
          id?: string
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
            foreignKeyName: "approval_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "personal_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      mission_audit_logs: {
        Row: {
          action: string
          agent_id: string | null
          created_at: string
          id: string
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
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
        ]
      }
      personal_agents: {
        Row: {
          allowed_tools: string[]
          autonomy: Database["public"]["Enums"]["autonomy_level"]
          budget_limit: number | null
          category: string
          created_at: string
          currency: string
          icon: string | null
          id: string
          instructions: string | null
          name: string
          org_id: string | null
          personality: string | null
          preferences: Json
          purpose: string | null
          requires_approval: boolean
          schedule: string | null
          scope: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_tools?: string[]
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          budget_limit?: number | null
          category?: string
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          name: string
          org_id?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_tools?: string[]
          autonomy?: Database["public"]["Enums"]["autonomy_level"]
          budget_limit?: number | null
          category?: string
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          name?: string
          org_id?: string | null
          personality?: string | null
          preferences?: Json
          purpose?: string | null
          requires_approval?: boolean
          schedule?: string | null
          scope?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_memories: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          metadata: Json
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          key: string
          metadata?: Json
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          metadata?: Json
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
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
        }
        Insert: {
          agent_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          involves_money?: boolean
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
        }
        Update: {
          agent_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          involves_money?: boolean
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
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "personal_agents"
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
      tool_permissions: {
        Row: {
          agent_id: string | null
          allowed_domains: string[]
          created_at: string
          enabled: boolean
          id: string
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
    }
    Views: {
      [_ in never]: never
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
      app_role: "admin" | "moderator" | "user"
      autonomy_level: "assist" | "prepare" | "execute" | "approval_required"
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
    },
  },
} as const

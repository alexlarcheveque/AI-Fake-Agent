export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string;
          description: string | null;
          end_time_at: string | null;
          id: number;
          lead_id: number | null;
          location: string | null;
          start_time_at: string | null;
          status: string | null;
          title: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_time_at?: string | null;
          id?: number;
          lead_id?: number | null;
          location?: string | null;
          start_time_at?: string | null;
          status?: string | null;
          title?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_time_at?: string | null;
          id?: number;
          lead_id?: number | null;
          location?: string | null;
          start_time_at?: string | null;
          status?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      calls: {
        Row: {
          id: number;
          lead_id: number | null;
          twilio_call_sid: string | null;
          direction: string | null;
          status: string | null;
          duration: number | null;
          from_number: string | null;
          to_number: string | null;
          started_at: string | null;
          ended_at: string | null;
          ai_summary: string | null;
          sentiment_score: number | null;
          call_type: string | null;
          attempt_number: number | null;
          is_voicemail: boolean | null;
          action_items: Json | null;
          customer_interest_level: string | null;
          commitment_details: string | null;
          call_mode: string | null;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          lead_id?: number | null;
          twilio_call_sid?: string | null;
          direction?: string | null;
          status?: string | null;
          duration?: number | null;
          from_number?: string | null;
          to_number?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          ai_summary?: string | null;
          sentiment_score?: number | null;
          call_type?: string | null;
          attempt_number?: number | null;
          is_voicemail?: boolean | null;
          action_items?: Json | null;
          customer_interest_level?: string | null;
          commitment_details?: string | null;
          call_mode?: string | null;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          lead_id?: number | null;
          twilio_call_sid?: string | null;
          direction?: string | null;
          status?: string | null;
          duration?: number | null;
          from_number?: string | null;
          to_number?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          ai_summary?: string | null;
          sentiment_score?: number | null;
          call_type?: string | null;
          attempt_number?: number | null;
          is_voicemail?: boolean | null;
          action_items?: Json | null;
          customer_interest_level?: string | null;
          commitment_details?: string | null;
          call_mode?: string | null;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      call_recordings: {
        Row: {
          id: number;
          call_id: number | null;
          recording_url: string | null;
          recording_sid: string | null;
          duration: number | null;
          file_size: number | null;
          storage_path: string | null;
          transcription: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          call_id?: number | null;
          recording_url?: string | null;
          recording_sid?: string | null;
          duration?: number | null;
          file_size?: number | null;
          storage_path?: string | null;
          transcription?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          call_id?: number | null;
          recording_url?: string | null;
          recording_sid?: string | null;
          duration?: number | null;
          file_size?: number | null;
          storage_path?: string | null;
          transcription?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          context: string | null;
          created_at: string;
          email: string | null;
          first_message: string | null;
          id: number;
          is_ai_enabled: boolean | null;
          is_archived: boolean | null;
          lead_type: string | null;
          name: string;
          phone_number: number;
          status: string | null;
          user_uuid: string | null;
          last_call_attempt: string | null;
          voice_calling_enabled: boolean | null;
          interest_score: number | null;
          sentiment_score: number | null;
          overall_score: number | null;
          last_score_update: string | null;
          archived_reason: string | null;
          archived_at: string | null;
        };
        Insert: {
          context?: string | null;
          created_at?: string;
          email?: string | null;
          first_message?: string | null;
          id?: number;
          is_ai_enabled?: boolean | null;
          is_archived?: boolean | null;
          lead_type?: string | null;
          name: string;
          phone_number: number;
          status?: string | null;
          user_uuid?: string | null;
          last_call_attempt?: string | null;
          voice_calling_enabled?: boolean | null;
          interest_score?: number | null;
          sentiment_score?: number | null;
          overall_score?: number | null;
          last_score_update?: string | null;
          archived_reason?: string | null;
          archived_at?: string | null;
        };
        Update: {
          context?: string | null;
          created_at?: string;
          email?: string | null;
          first_message?: string | null;
          id?: number;
          is_ai_enabled?: boolean | null;
          is_archived?: boolean | null;
          lead_type?: string | null;
          name?: string;
          phone_number?: number;
          status?: string | null;
          user_uuid?: string | null;
          last_call_attempt?: string | null;
          voice_calling_enabled?: boolean | null;
          interest_score?: number | null;
          sentiment_score?: number | null;
          overall_score?: number | null;
          last_score_update?: string | null;
          archived_reason?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          created_at: string | null;
          delivery_status: string | null;
          error_code: string | null;
          error_message: string | null;
          id: number;
          is_ai_generated: boolean | null;
          lead_id: number | null;
          scheduled_at: string | null;
          sender: string | null;
          text: string | null;
          twilio_sid: string | null;
          updated_at: string | null;
          call_fallback_type: string | null;
        };
        Insert: {
          created_at?: string | null;
          delivery_status?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          id?: number;
          is_ai_generated?: boolean | null;
          lead_id?: number | null;
          scheduled_at?: string | null;
          sender?: string | null;
          text?: string | null;
          twilio_sid?: string | null;
          updated_at?: string | null;
          call_fallback_type?: string | null;
        };
        Update: {
          created_at?: string | null;
          delivery_status?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          id?: number;
          is_ai_generated?: boolean | null;
          lead_id?: number | null;
          scheduled_at?: string | null;
          sender?: string | null;
          text?: string | null;
          twilio_sid?: string | null;
          updated_at?: string | null;
          call_fallback_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: number;
          is_read: boolean | null;
          lead_id: number | null;
          message: string | null;
          title: string | null;
          type: string | null;
          upated_at: string | null;
          user_uuid: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_read?: boolean | null;
          lead_id?: number | null;
          message?: string | null;
          title?: string | null;
          type?: string | null;
          upated_at?: string | null;
          user_uuid?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_read?: boolean | null;
          lead_id?: number | null;
          message?: string | null;
          title?: string | null;
          type?: string | null;
          upated_at?: string | null;
          user_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      search_criterias: {
        Row: {
          created_at: string;
          id: number;
          lead_id: number | null;
          locations: string[] | null;
          max_bathrooms: number | null;
          max_bedroom: number | null;
          max_price: number | null;
          max_square_feet: number | null;
          min_bathrooms: number | null;
          min_bedrooms: number | null;
          min_price: number | null;
          min_square_feet: number | null;
          property_types: string[] | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          lead_id?: number | null;
          locations?: string[] | null;
          max_bathrooms?: number | null;
          max_bedroom?: number | null;
          max_price?: number | null;
          max_square_feet?: number | null;
          min_bathrooms?: number | null;
          min_bedrooms?: number | null;
          min_price?: number | null;
          min_square_feet?: number | null;
          property_types?: string[] | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          lead_id?: number | null;
          locations?: string[] | null;
          max_bathrooms?: number | null;
          max_bedroom?: number | null;
          max_price?: number | null;
          max_square_feet?: number | null;
          min_bathrooms?: number | null;
          min_bedrooms?: number | null;
          min_price?: number | null;
          min_square_feet?: number | null;
          property_types?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "search_criteria_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          agent_name: string | null;
          agent_state: string | null;
          company_name: string | null;
          created_at: string;
          follow_up_interval_in_converesation: number | null;
          follow_up_interval_inactive: number | null;
          follow_up_interval_new: number | null;
          id: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_plan: string | null;
          subscription_status: string | null;
          uuid: string | null;
          voice_calling_enabled: boolean | null;
          voice_calling_hours_start: number | null;
          voice_calling_hours_end: number | null;
          voice_calling_days: string[] | null;
          elevenlabs_voice_id: string | null;
          call_retry_attempts: number | null;
          quarterly_call_limit: number | null;
          voice_follow_up_interval_new: number | null;
          voice_follow_up_interval_inactive: number | null;
          downgrade_grace_period_until: string | null;
        };
        Insert: {
          agent_name?: string | null;
          agent_state?: string | null;
          company_name?: string | null;
          created_at?: string;
          follow_up_interval_in_converesation?: number | null;
          follow_up_interval_inactive?: number | null;
          follow_up_interval_new?: number | null;
          id?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          uuid?: string | null;
          voice_calling_enabled?: boolean | null;
          voice_calling_hours_start?: number | null;
          voice_calling_hours_end?: number | null;
          voice_calling_days?: string[] | null;
          elevenlabs_voice_id?: string | null;
          call_retry_attempts?: number | null;
          quarterly_call_limit?: number | null;
          voice_follow_up_interval_new?: number | null;
          voice_follow_up_interval_inactive?: number | null;
          downgrade_grace_period_until?: string | null;
        };
        Update: {
          agent_name?: string | null;
          agent_state?: string | null;
          company_name?: string | null;
          created_at?: string;
          follow_up_interval_in_converesation?: number | null;
          follow_up_interval_inactive?: number | null;
          follow_up_interval_new?: number | null;
          id?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          uuid?: string | null;
          voice_calling_enabled?: boolean | null;
          voice_calling_hours_start?: number | null;
          voice_calling_hours_end?: number | null;
          voice_calling_days?: string[] | null;
          elevenlabs_voice_id?: string | null;
          call_retry_attempts?: number | null;
          quarterly_call_limit?: number | null;
          voice_follow_up_interval_new?: number | null;
          voice_follow_up_interval_inactive?: number | null;
          downgrade_grace_period_until?: string | null;
        };
        Relationships: [];
      };
      scheduled_tasks: {
        Row: {
          id: number;
          user_id: string;
          task_type: string;
          scheduled_for: string;
          parameters: Json | null;
          status: string;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          task_type: string;
          scheduled_for: string;
          parameters?: Json | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          task_type?: string;
          scheduled_for?: string;
          parameters?: Json | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

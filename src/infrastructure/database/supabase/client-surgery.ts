// src/infrastructure/repositories/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { serverSupabaseKey } from './server-key';

// Cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const supabase = createClient(supabaseUrl, serverSupabaseKey());

// Tipos para la base de datos (opcional pero recomendado)
export type Database = {
  public: {
    Tables: {
      pet_surgeries: {
        Row: {
          id: string;
          pet_id: string;
          veterinary_visit_id: string;
          title: string;
          description: string;
          surgery_date: string;
          duration_minutes: number;
          anesthesia_used: string | null;
          complications: string | null;
          post_op_instructions: string | null;
          outcome: string | null;
          status: string;
          next_checkup_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          veterinary_visit_id: string;
          title: string;
          description: string;
          surgery_date: string;
          duration_minutes: number;
          anesthesia_used?: string | null;
          complications?: string | null;
          post_op_instructions?: string | null;
          outcome?: string | null;
          status: string;
          next_checkup_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          veterinary_visit_id?: string;
          title?: string;
          description?: string;
          surgery_date?: string;
          duration_minutes?: number;
          anesthesia_used?: string | null;
          complications?: string | null;
          post_op_instructions?: string | null;
          outcome?: string | null;
          status?: string;
          next_checkup_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
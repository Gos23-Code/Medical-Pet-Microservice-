import { createBrowserClient } from '@supabase/ssr';
import { serverSupabaseKey } from './server-key';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverSupabaseKey();

  console.log("🔍 URL existe:", !!url);
  console.log("🔍 KEY existe:", !!key);

  if (!url) {
    throw new Error('Faltan variables de entorno de Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }

  return createBrowserClient(url, key);
};


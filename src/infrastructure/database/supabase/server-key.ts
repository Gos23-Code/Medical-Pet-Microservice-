// Clave de Supabase para escribir desde el servidor.
// El backend no tiene sesión de usuario en Supabase (la autorización vive en el JWT y en Pets/Veterinary),
// así que la anon key queda sujeta a RLS y los inserts fallan. La service role key salta RLS.
// Nunca debe llevar NEXT_PUBLIC_: solo se lee en runtime del servidor.
export const serverSupabaseKey = (): string => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY como respaldo)');
  }
  return key;
};

import { createClient } from '@supabase/supabase-js';

// 1. Acá le decimos a la app: "Buscá las llaves en las variables de entorno"
// Vite usa 'import.meta.env' para leer lo que configuraste en Vercel.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Un pequeño chequeo de seguridad para que no explote si faltan las llaves
if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ ¡Atención! Faltan las variables de entorno de Supabase.');
}

// 3. Creamos y exportamos la conexión
export const supabase = createClient(supabaseUrl, supabaseKey);

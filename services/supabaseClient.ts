import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://qezvababaaytdjxzitab.supabase.co';
// Nota: Esta key es pública (anon), es seguro tenerla aquí para el cliente web.
const supabaseKey = 'sb_publishable_6Ebc_-zz3QcmrlTPzZW4Kw_QtZ4-ya2';

// Exportamos el cliente para usarlo en toda la app.
export const supabase = createClient(supabaseUrl, supabaseKey);

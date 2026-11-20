
// AGROLINK - CONEXIÓN CON SUPABASE

// URL del proyecto
const SUPABASE_URL = 'https://ojifysnjmewcnmybqlsg.supabase.co';

// Clave pública del proyecto
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_v7KGxc6NY6fe8WOiDxxh9Q_Mlh4LTAa';

// Crear cliente de Supabase
window.agrolinkSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log('AGROLINK: cliente de Supabase inicializado');

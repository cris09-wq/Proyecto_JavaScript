import { request } from './apiConfig.js';

/**
 * Login académico: consulta /admins y compara las credenciales.
 * Devuelve el admin (sin password) o null si no coinciden.
 * OJO: guardar contraseñas en db.json NO es seguridad real.
 */
export async function loginAdmin(username, password) {
  const admins = await request('/admins');
  const admin = admins.find(
    (a) => a.username === username.trim() && a.password === password
  );
  if (!admin) return null;
  const { password: _omit, ...safe } = admin;
  return safe;
}

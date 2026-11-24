import { byId, request, withoutId } from './apiConfig.js';

/**
 * Login académico: consulta /admins y compara las credenciales.
 * Devuelve el admin (sin password) o null si no coinciden.
 * OJO: guardar contraseñas en db.json NO es seguridad real.
 */
export async function getAdmins() {
  return request('/admins');
}

export async function postAdmin(admin) {
  return request('/admins', {
    method: 'POST',
    body: JSON.stringify(withoutId(admin)),
  });
}

export async function deleteAdmin(id) {
  return request(byId('admins', id), { method: 'DELETE' });
}

export async function loginAdmin(username, password) {
  const admins = await getAdmins();
  const admin = admins.find(
    (a) => a.username === username.trim() && a.password === password
  );
  if (!admin) return null;
  const { password: _omit, ...safe } = admin;
  return safe;
}

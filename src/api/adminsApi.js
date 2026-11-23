// =============================================================================
// adminsApi.js — Funciones para trabajar con los administradores (/admins)
// =============================================================================
// Importamos (traemos) dos funciones del archivo apiConfig.js.
// Las llaves { } indican que importamos exportaciones "con nombre".
import { request, withoutId } from './apiConfig.js';

/**
 * Login académico: consulta /admins y compara las credenciales.
 * Devuelve el admin (sin password) o null si no coinciden.
 * OJO: guardar contraseñas en db.json NO es seguridad real.
 */

// GET /admins → devuelve la lista (arreglo) de todos los administradores.
export async function getAdmins() {
  return request('/admins');
}

// POST /admins → crea un nuevo administrador.
// JSON.stringify convierte el objeto de JavaScript en texto JSON para enviarlo.
export async function postAdmin(admin) {
  return request('/admins', {
    method: 'POST',
    body: JSON.stringify(withoutId(admin)),
  });
}

// DELETE /admins/:id → borra el administrador con ese id.
export async function deleteAdmin(id) {
  return request(`/admins/${id}`, { method: 'DELETE' });
}

// Inicia sesión: busca un admin cuyo usuario y contraseña coincidan.
export async function loginAdmin(username, password) {
  // Esperamos (await) la lista de admins desde el servidor.
  const admins = await getAdmins();

  // `.find()` recorre el arreglo y devuelve el PRIMER elemento que cumpla la
  // condición, o `undefined` si ninguno la cumple.
  // `(a) => ...` es una "función flecha": una forma corta de escribir funciones.
  // `.trim()` quita espacios al inicio y al final del texto.
  const admin = admins.find(
    (a) => a.username === username.trim() && a.password === password
  );

  // Si no encontramos a nadie, el login falla y devolvemos null.
  if (!admin) return null;

  // Desestructuración: separamos la contraseña (y la ignoramos, por eso el
  // nombre `_omit`) y guardamos el resto de datos en `safe`.
  // Así nunca devolvemos la contraseña al resto de la aplicación.
  const { password: _omit, ...safe } = admin;
  return safe;
}

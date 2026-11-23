// Configuración de Vite: la herramienta que levanta el servidor de desarrollo
// (npm run dev) y empaqueta el proyecto para publicarlo (npm run build).
import { defineConfig } from 'vite';

// base './' hace que los assets funcionen en GitHub Pages (https://usuario.github.io/repo/)
export default defineConfig({
  base: './',
});

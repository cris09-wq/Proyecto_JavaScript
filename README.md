
=======
# 🍲 Card Battle Arena — Sabores de Colombia

Parcial.

- **Integrantes:** Diana Milena Chaparro Macias
- **Temática:** comida típica colombiana
- **Enlace publicado:** 

## Descripción

Juego web de cartas de combate: el jugador se registra con un nickname único, elige 5 de las 20 cartas de platos típicos, define el orden de su mazo y pelea contra 5 cartas elegidas por la máquina. Los resultados se acumulan en un leaderboard y las cartas se gestionan desde un panel de administración con CRUD completo.

**Toque creativo:** cada carta pertenece a una **región** de Colombia y trae un **dato curioso** (botón ℹ️ para voltearla). Si en tu mazo hay 2 o más cartas de la misma región se activa el **combo regional**: esas cartas hacen +10 % de daño.

## Tecnologías

HTML5 · CSS3 · JavaScript Vanilla (ES Modules) · Web Components · Fetch API · Vite · JSON Server (desarrollo) · MockAPI (producción) · Git y GitHub Pages.
No se usa ningún framework (React, Vue, Angular…) ni Axios: todas las peticiones son `fetch()` aisladas en `src/api/`.

## Instalación y uso

```bash
npm install
```

Necesitas **dos terminales**:

| Comando | Qué hace |
| --- | --- |
| `npm run server` | Inicia JSON Server en http://localhost:3000 (`/cards`, `/players`, `/admins`, `/battles`) |
| `npm run dev` | Inicia Vite (el juego en http://localhost:5173) |

Otros: `npm run build` (compila a `dist/`), `npm run preview`, `npm run deploy` (publica `dist/` en GitHub Pages).

## Variables de entorno (`.env`)

Copia `.env.example` como `.env`. No guardes secretos: solo URLs públicas.

```
VITE_API_MODE=development
VITE_API_DEV_URL=http://localhost:3000
VITE_API_PROD_URL=https://TU_PROJECT_ID.mockapi.io/api/v1
```

`src/api/apiConfig.js` elige la URL con un `switch` según `VITE_API_MODE`. En `npm run build` Vite usa `.env.production` (modo `production`).

### API pública para producción

GitHub Pages no puede llamar a `localhost`, por eso en producción se usa una API pública (MockAPI). Con los recursos `cards`, `players`, `admins` y `battles` creados, carga los datos iniciales con:

```bash
npm run seed:prod
```

## Credenciales de administrador (evaluación)

| Usuario | Contraseña |
| --- | --- |
| `admin` | `cards2026` |

Login académico: las credenciales están en `db.json` y no representan seguridad real.

## Reglas del juego

1. **Registro:** nickname obligatorio y único (se consulta la API; si existe, no se crea).
2. **Mazo:** 5 cartas distintas, luego se define el orden de entrada. Se necesitan al menos 10 cartas activas.
3. **Combate:** cada carta tiene 250 HP. Si pierde toda la vida es derrotada y entra la siguiente; la carta vencedora **no** recupera vida. Pierde quien se quede sin sus 5 cartas.
4. **Inicio:** se sortea al azar quién empieza (`Math.random() < 0.5`).
5. **Ataques:** 4 ataques por carta. `daño = base × factor(0.85–1.15)`, redondeado.
6. **Defensa:** consume el turno; el siguiente golpe recibido se reduce 50 % y la defensa se gasta.
7. **Especial:** se habilita desde el 2.º turno de esa carta, causa más daño y queda en cooldown de 3 turnos propios (la interfaz muestra el bloqueo y los turnos que faltan).
8. **Máquina:** una función elige una acción válida al azar con pesos (nunca un especial bloqueado).
9. **Puntos:** victoria +50, derrota +10. Se acumulan junto con victorias, derrotas y partidas jugadas.
10. **Historial:** al terminar se guarda un registro en `/battles`.

## CRUD de cartas (Administración)

| Método | Dónde |
| --- | --- |
| **GET** | Listar el pool de cartas |
| **POST** | ➕ Nueva carta |
| **PUT** | ✏️ Editar → "Guardar todo (PUT)": reemplaza la carta completa |
| **PATCH** | Interruptor "Activa" (solo `active`) y ✏️ Editar → "Guardar solo cambios (PATCH)" |
| **DELETE** | 🗑️ Eliminar (con confirmación) |

Después de cada operación el panel muestra qué método se usó y cuántos campos se enviaron, para evidenciar la diferencia entre PUT y PATCH.

## Estructura principal

```
cardBattle/
├── public/               imágenes (images/cards), sonidos (sounds), favicon
├── src/
│   ├── api/              apiConfig.js + cardsApi, playersApi, adminsApi, battlesApi (único lugar con fetch)
│   ├── assets/           ilustración del hero
│   ├── components/
│   │   ├── app/          gameApp.js  (<card-game-app>: navegación y vistas)
│   │   ├── auth/         playerRegister.js, adminLogin.js
│   │   ├── cards/        cards.js (lista GET) · createCards.js · editCards.js · deleteCards.js · cardForm.js · cardView.js
│   │   ├── deck/         deckSelector.js (elegir y ordenar)
│   │   ├── battle/       battle.js · battleCard.js · battleControls.js
│   │   └── leaderboard/  leaderboard.js (podio Top 3)
│   ├── data/db.json      20 cartas + admin
│   ├── utils/            battleEngine.js · random.js · validators.js · audio.js · …
│   └── app.js            punto de entrada
├── .env · .env.example
└── index.html            solo <card-game-app>
```

Los componentes se comunican con eventos personalizados (`player-registered`, `deck-ready`, `battle-finished`, …) que escucha `gameApp.js`.

## Animaciones y sonido

Las animaciones CSS (ataque, daño, defensa, poder especial, carta derrotada, entrada de carta, victoria y derrota) se activan agregando clases desde JavaScript. Los sonidos (ataque, defensa, especial y derrotada por carta; victoria y derrota generales) se reproducen con `new Audio()` usando las rutas de `card.sounds`.

---

## 📝 Examen individual — Modo automático, golpe crítico y esquive

**Estudiante:** Diana Chaparro · **Rama:** `exam/ChaparroDiana`

### Funcionalidades agregadas

| Mecánica | Regla | Dónde está |
|---|---|---|
| **Golpe crítico** | 12 % de probabilidad, daño ×1.5 | `CRIT_CHANCE`, `CRIT_MULTIPLIER` y `resolveAction()` en `src/utils/battleEngine.js` |
| **Esquivar ataque** | 8 % de probabilidad, daño 0 | `DODGE_CHANCE` y `resolveAction()` en `src/utils/battleEngine.js` |
| **Estrategia automática** | Acciones válidas + pesos | `chooseAutoAction()` en `src/utils/battleEngine.js` |
| **Modo automático** | Botón MANUAL / AUTOMÁTICO | `beginTurn()`, `programarTurnoAutomatico()`, `cambiarModo()` en `src/components/battle/battle.js` |
| **Historial** | Se guarda `"mode": "manual" \| "automatic"` | `postBattle()` en `src/api/battlesApi.js` |

### Orden de resolución de un ataque (`resolveAction`)
1. Seleccionar el ataque o el especial.
2. Calcular el daño crudo (factor 0.85–1.15 + combo regional, **sin redondear**).
3. ¿Esquiva? (`rng() < DODGE_CHANCE`) → daño 0 y termina la resolución del daño.
4. Si no esquiva: ¿crítico? (`rng() < CRIT_CHANCE`) → daño × 1.5.
5. Si el defensor estaba defendiendo → reducción del 50 %.
6. Redondear y restar HP con `Math.max(0, hp - daño)`.
7. El turno (`turnsTaken`) y el cooldown del especial se aplican **siempre**, incluso si el ataque es esquivado.

El poder especial pasa por la misma función, así que también puede ser crítico o esquivado.
Si un ataque se esquiva, la defensa del rival **no se gasta**, porque no recibió el golpe.

### Estrategia automática (`chooseAutoAction`)
- Parte de `getAvailableActions()`, que nunca incluye el especial bloqueado o en cooldown.
- No se defiende dos veces seguidas (`cs.lastAction`).
- Pesos: especial 6 · defender 4 si la vida es menor al 35 % (1 si no) · atacar 2.

### Control de turnos y temporizador
- No se usa `setInterval`. El ciclo es `beginTurn → setTimeout → perform → beginTurn`.
- Hay **un solo** temporizador (`this.autoTimer`), y se cancela el anterior antes de crear otro.
- `B.lock` y `B.acting` impiden clics y acciones simultáneas.
- La batalla se detiene con `B.over = true` + `detenerTemporizador()` en `finish()`, al abandonar y en `disconnectedCallback()`.
  Los `await sleep()` en curso se cortan con la verificación `vivo()`.
- Si el modo se cambia a mitad de partida, se guarda el **modo con el que terminó**.

### Archivos modificados
- `src/utils/battleEngine.js`
- `src/components/battle/battle.js`
- `src/components/battle/battleStyles.css`
- `src/api/battlesApi.js`
- `README.md`

✏️ Antes del commit, revisa

- El hash de partida (fb406ed): confírmalo con tu docente.
- Los pesos de la estrategia: si cambiaste algún número en chooseAutoAction, corrígelo en el texto.

Commit


✏️ Antes del commit, revisa

- El hash de partida (fb406ed): confírmalo con tu docente.
- Los pesos de la estrategia: si cambiaste algún número en chooseAutoAction, corrígelo en el texto.

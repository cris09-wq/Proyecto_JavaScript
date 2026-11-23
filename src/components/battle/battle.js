// =============================================================================
// battle.js — Pantalla de combate <battle-arena>
// =============================================================================
// Coordina toda la partida: sorteo de quién empieza, turnos del jugador y de la
// máquina, animaciones, sonidos, historial y guardado del resultado en la API.
//
// Abreviaturas que se usan mucho en este archivo:
//   'p' = player (jugador)      'm' = machine (máquina)
//   B   = estado de la Batalla  cs  = card state (estado de una carta)
import './battleStyles.css';
import './battleCard.js';     // registra <battle-card>
import './battleControls.js'; // registra <battle-controls>
import { addBattleResult } from '../../api/playersApi.js';
import { postBattle } from '../../api/battlesApi.js';
import { shuffle, playerStarts } from '../../utils/random.js';
import { esc, sleep, emit } from '../../utils/dom.js';
import { AVATAR_IDS, getAvatar, faceImg, bodyImg } from '../../assets/avatars.js';
import { playSound, GAME_SOUNDS } from '../../utils/audio.js';
import { createDeckStates, startOwnTurn, chooseMachineAction, resolveAction } from '../../utils/battleEngine.js';

// Puntos que se ganan al terminar una partida.
const POINTS = { win: 50, loss: 10 };

/**
 * Orquestador del combate: sorteo, turnos, animaciones, sonidos y guardado del resultado.
 * Las reglas (daño, defensa, especial, máquina) viven en utils/battleEngine.js.
 */
export class BattleArena extends HTMLElement {
  constructor() {
    super();
    this.B = null; // estado de la partida
    this.player = null;
    this.dead = false; // true si el componente se retira del DOM a mitad de combate
    this.render();
    this.configurarEventos();
  }

  // disconnectedCallback es un método especial de los Web Components: el navegador
  // lo llama solo cuando el componente se quita de la página (por ejemplo, al
  // cambiar de vista). Marcamos `dead` para detener las esperas pendientes.
  disconnectedCallback() {
    this.dead = true;
  }

  // Estructura de la pantalla: barra de turno, tablero con las dos cartas,
  // controles del jugador, historial, botón de abandonar y capa (overlay) para
  // los mensajes de sorteo y final.
  render() {
    this.innerHTML = /* html */ `
      <div class="turnbar" id="turnbar"></div>
      <div class="blayout">
        <div class="bmain">
          <div class="board"><div class="arena">
            <battle-card class="fighter fp" id="f-p"></battle-card>
            <div class="vs">VS</div>
            <battle-card class="fighter fm" id="f-m"></battle-card>
          </div></div>
          <battle-controls id="controls"></battle-controls>
        </div>
        <aside class="logbox">
          <h3>📜 Historial</h3>
          <div class="log" id="log"></div>
        </aside>
      </div>
      <div class="row end" id="quitRow"></div>
      <div id="overlay"></div>`;
  }

  configurarEventos() {
    // <battle-controls> envía 'battle-action' cuando el jugador pulsa un botón.
    this.addEventListener('battle-action', (e) => {
      const B = this.B;
      // Ignoramos la acción si: no hay partida, está bloqueada, terminó o no es el turno del jugador.
      if (!B || B.lock || B.over || B.turn !== 'p') return;
      this.perform('p', e.detail.action);
    });
    // Botones de abandonar / jugar otra vez / ver ranking.
    this.addEventListener('click', (e) => {
      // `?.id` → si no se clicó un botón, `id` queda undefined en vez de dar error.
      const id = e.target.closest('button')?.id;
      if (id === 'quit') this.preguntarAbandono(true);
      else if (id === 'quitNo') this.preguntarAbandono(false);
      else if (id === 'quitYes') {
        this.dead = true;
        emit(this, 'battle-abandoned');
      } else if (id === 'playAgain') emit(this, 'play-again');
      else if (id === 'toRank') emit(this, 'go-ranking');
    });
  }

  // ---------- Inicio ----------
  /** gameApp llama a start() con el mazo ordenado del jugador y todas las cartas activas. */
  start({ player, deck, pool }) {
    this.player = player;
    // Ids de las cartas del jugador, para que la máquina no use las mismas.
    const ids = deck.map((c) => c.id);
    // Barajamos las cartas restantes y tomamos las 5 primeras (.slice(0, 5)).
    const rivales = shuffle(pool.filter((c) => !ids.includes(c.id))).slice(0, 5); // la máquina elige 5 distintas
    const iniciaJugador = playerStarts();
    // La máquina toma un avatar de otra región distinta a la del jugador
    const otros = AVATAR_IDS.filter((id) => getAvatar(id) !== getAvatar(player.avatar));
    this.avatars = { p: getAvatar(player.avatar), m: getAvatar(shuffle(otros)[0]) };
    // Creamos el estado de la batalla. `const B = (this.B = {...})` asigna el
    // mismo objeto a la variable local B y a this.B al mismo tiempo.
    const B = (this.B = {
      p: { deck: createDeckStates(deck), idx: 0 },     // mazo del jugador e índice de la carta actual
      m: { deck: createDeckStates(rivales), idx: 0 },  // mazo de la máquina
      turn: iniciaJugador ? 'p' : 'm', // de quién es el turno
      turnCount: 0,   // cuántos turnos se han jugado
      log: [],        // mensajes del historial
      lock: true,     // true = no se aceptan acciones (animando o turno de la máquina)
      intro: true,    // true mientras se muestra el sorteo
      over: false,    // true cuando termina la partida
      ask: false,     // true si se está preguntando "¿Abandonar?"
      startedAt: new Date().toISOString(),
    });
    this.log(`Sorteo: inicia ${iniciaJugador ? player.nickname : 'la máquina'}.`);
    // Contamos cuántas cartas tienen combo en cada mazo.
    const pc = B.p.deck.filter((d) => d.hasCombo).length;
    const mc = B.m.deck.filter((d) => d.hasCombo).length;
    // `if (pc)` es verdadero si pc es distinto de 0.
    if (pc) this.log(`🔗 Tu mazo tiene combo regional: +10 % de daño en ${pc} cartas.`);
    if (mc) this.log(`🔗 La máquina tiene combo regional en ${mc} cartas.`);
    this.log(`📖 ${deck[0].name} (${deck[0].region}): ${deck[0].fact}`);
    emit(this, 'battle-state', { active: true });
    this.refresh();
    // Función asíncrona que se ejecuta de inmediato: (async () => { ... })();
    // Espera 1.9 s mostrando el sorteo y luego arranca el primer turno.
    (async () => {
      await sleep(1900);
      // Si el componente se cerró o empezó otra partida, no seguimos.
      if (this.dead || this.B !== B) return;
      B.intro = false;
      this.beginTurn();
    })();
  }

  // Devuelve el estado de la carta que está peleando ahora en el lado indicado ('p' o 'm').
  cur(side) {
    return this.B[side].deck[this.B[side].idx];
  }

  // Agrega un mensaje al historial. Si hay más de 40, borra el más viejo (.shift()).
  log(texto) {
    this.B.log.push(texto);
    if (this.B.log.length > 40) this.B.log.shift();
  }

  // ---------- Turnos ----------
  beginTurn() {
    const B = this.B;
    if (this.dead || B.over) return;
    startOwnTurn(this.cur(B.turn)); // el cooldown baja 1 al iniciar cada turno propio
    // Si es el turno de la máquina bloqueamos los botones del jugador.
    B.lock = B.turn === 'm';
    this.refresh();
    if (B.turn === 'm') {
      // La máquina "piensa" 1.1 s y luego elige su acción.
      (async () => {
        await sleep(1100);
        if (this.dead || this.B !== B) return;
        this.perform('m', chooseMachineAction(this.cur('m')));
      })();
    }
  }

  /**
   * Ejecuta una acción (atacar, defender o especial) con sus animaciones.
   * @param side   'p' o 'm' (quién actúa).
   * @param action La acción elegida.
   */
  async perform(side, action) {
    const B = this.B;
    const foeSide = side === 'p' ? 'm' : 'p'; // el lado contrario ("foe" = enemigo)
    // Función para comprobar, después de cada espera, que la partida sigue activa.
    const vivo = () => !this.dead && this.B === B;
    const me = this.cur(side);
    const foe = this.cur(foeSide);
    const c = me.card;
    const quien = side === 'p' ? this.player.nickname : 'La máquina';
    // Elementos <battle-card> de cada lado (#f-p o #f-m).
    const fMe = this.querySelector(`#f-${side}`);
    const fFoe = this.querySelector(`#f-${foeSide}`);
    B.lock = true;

    if (action.type === 'defend') {
      // --- DEFENSA ---
      resolveAction(me, foe, action);
      this.log(`🛡️ ${quien}: ${c.name} usa ${c.defense.name}.`);
      playSound(c.sounds?.defense);
      this.refresh();
      fMe.animar('anim-defend', 700);
      await sleep(1000);
      if (!vivo()) return;
    } else {
      // --- ATAQUE o ESPECIAL ---
      const esEspecial = action.type === 'special';
      playSound(esEspecial ? c.sounds?.special : c.sounds?.attack);
      this.refresh();
      // Primero se anima el atacante...
      fMe.animar(esEspecial ? 'anim-special' : 'anim-attack', esEspecial ? 900 : 500);
      await sleep(esEspecial ? 650 : 320);
      if (!vivo()) return;

      // ...luego se calcula el daño y se anima el golpe en el rival.
      const r = resolveAction(me, foe, action);
      this.log(`${esEspecial ? '⚡' : '⚔️'} ${quien}: ${c.name} usa ${r.name} → ${r.damage} de daño${r.blocked ? ' (bloqueado 50 %)' : ''}.`);
      this.refresh();
      fFoe.animar('anim-hit', 500);
      fFoe.mostrarDanio(`-${r.damage}`, `${esEspecial ? 'sp ' : ''}${r.blocked ? 'blk' : ''}`);
      await sleep(900);
      if (!vivo()) return;

      // Si la carta rival quedó sin vida, pasa la siguiente de su mazo.
      if (r.defeated) {
        this.log(`💀 ${foe.card.name} fue derrotada.`);
        playSound(foe.card.sounds?.defeated);
        fFoe.animar('anim-defeated', 900);
        await sleep(950);
        if (!vivo()) return;
        B[foeSide].idx++;
        // Si ya no quedan cartas (se derrotaron las 5), ¡fin de la partida!
        if (B[foeSide].idx >= 5) {
          B[foeSide].idx = 4; // se queda mostrando la última carta derrotada
          return this.finish(side);
        }
        const nueva = this.cur(foeSide).card;
        this.log(`➡️ Entra ${nueva.name} (${nueva.region}). 📖 ${nueva.fact}`);
        this.refresh();
        this.querySelector(`#f-${foeSide}`).animar('anim-enter', 600);
        await sleep(700);
        if (!vivo()) return;
      }
    }
    // Cambiamos el turno al otro lado y empezamos su turno.
    B.turnCount++;
    B.turn = foeSide;
    this.beginTurn();
  }

  // ---------- Final y guardado ----------
  async finish(winnerSide) {
    const B = this.B;
    const gano = winnerSide === 'p';
    B.over = true;
    B.lock = true;
    B.result = gano ? 'win' : 'loss';
    B.points = gano ? POINTS.win : POINTS.loss;
    B.saving = true; // muestra "Guardando resultado…"
    this.refresh();
    try {
      // Puntos, victorias, derrotas y partidas se acumulan (PATCH al jugador)
      const player = await addBattleResult(this.player.id, gano);
      // Historial de la partida (POST)
      await postBattle({
        player: this.player,
        didWin: gano,
        playerDeck: B.p.deck.map((d) => d.card.id),
        machineDeck: B.m.deck.map((d) => d.card.id),
        startedAt: B.startedAt,
      });
      this.player = player;
      B.saveErr = false;
      // Avisamos a gameApp para que actualice los puntos del encabezado.
      emit(this, 'battle-finished', { player });
    } catch (error) {
      console.error(error);
      B.saveErr = true;
    }
    B.saving = false;
    if (this.dead) return;
    emit(this, 'battle-state', { active: false });
    this.refresh();
    playSound(gano ? GAME_SOUNDS.victory : GAME_SOUNDS.defeat);
  }

  // Muestra (true) u oculta (false) la pregunta "¿Abandonar?".
  preguntarAbandono(valor) {
    this.B.ask = valor;
    this.refresh();
  }

  // HTML de la barra de vida de la carta actual de un lado.
  hpHTML(side) {
    const cs = this.cur(side);
    const total = cs.card.hp;
    // Porcentaje de vida restante (0 a 100) para el ancho de la barra.
    const pct = Math.max(0, Math.round((cs.hp / total) * 100));
    // Si queda menos del 30 % se agrega la clase "low" (barra roja).
    return `<div class="hpwrap" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${cs.hp}"><div class="hpbar ${pct < 30 ? 'low' : ''}" style="width:${pct}%"></div></div><span class="hptxt">${cs.hp} / ${total} HP</span>`;
  }

  // ---------- Dibujo ----------
  // refresh() actualiza TODA la pantalla a partir del estado B.
  // Se llama cada vez que algo cambia (un ataque, un cambio de turno, etc.).
  refresh() {
    const B = this.B;
    if (!B) return;
    // Una ronda = 2 turnos (uno de cada lado).
    const round = Math.floor(B.turnCount / 2) + 1;
    const texto = B.intro ? 'Sorteando quién inicia…' : B.over ? 'Combate terminado' : B.turn === 'p' ? '🟢 Tu turno' : '🔴 Turno de la máquina…';
    const bar = this.querySelector('#turnbar');
    bar.className = `turnbar ${B.over || B.intro ? '' : B.turn}`;
    // Avatar de quien tiene el turno: jugador a la izquierda, máquina a la derecha
    const activo = B.over || B.intro ? null : B.turn;
    // La estructura de la barra se crea solo la primera vez.
    if (!bar.querySelector('.tb-text')) {
      bar.innerHTML = `<div class="tb-side p"><span class="tb-avatar p"></span><div class="tb-hp p"></div></div><div class="tb-text"></div><div class="tb-side m"><div class="tb-hp m"></div><span class="tb-avatar m"></span></div>`;
    }
    bar.querySelector('.tb-hp.p').innerHTML = this.hpHTML('p');
    bar.querySelector('.tb-hp.m').innerHTML = this.hpHTML('m');
    bar.querySelector('.tb-text').innerHTML = `${texto}<small>Ronda ${round} · Turno ${B.turnCount + 1}</small>`;
    // ¿Cambió de quién es el turno desde el último refresh?
    const cambio = bar.dataset.activo !== String(activo);
    if (cambio) {
      // Solo se redibuja al cambiar de turno, así la animación no se repite en cada refresh
      bar.dataset.activo = String(activo);
      // for...of recorre los elementos de un arreglo: primero 'p' y luego 'm'.
      for (const side of ['p', 'm']) {
        const slot = bar.querySelector(`.tb-avatar.${side}`);
        const on = activo === side;
        slot.classList.toggle('on', on);
        slot.title = on ? `${side === 'p' ? this.player.nickname : 'Máquina'} · ${this.avatars[side].region}` : '';
        slot.innerHTML = on ? faceImg(this.avatars[side]) : '';
      }
    }

    // Actualizamos las dos cartas en combate y los botones del jugador.
    this.querySelector('#f-p').update({ cs: this.cur('p'), deck: B.p.deck, idx: B.p.idx, who: this.player.nickname });
    this.querySelector('#f-m').update({ cs: this.cur('m'), deck: B.m.deck, idx: B.m.idx, who: '🤖 Máquina' });
    if (cambio && activo) this.querySelector(activo === 'p' ? '#f-p' : '#f-m').anunciar(3000);
    // Los botones solo se habilitan si es el turno del jugador y nada lo bloquea.
    this.querySelector('#controls').update({ cs: this.cur('p'), enabled: B.turn === 'p' && !B.lock && !B.over && !B.intro });

    // Historial completo con la jugada más reciente arriba
    // [...B.log] copia el arreglo para que .reverse() no altere el original.
    const log = this.querySelector('#log');
    log.innerHTML = [...B.log].reverse().map((l) => `<div>${esc(l)}</div>`).join('');
    log.scrollTop = 0;
    // Zona de abandonar: nada si terminó, la pregunta si se pidió, o el botón.
    this.querySelector('#quitRow').innerHTML = B.over
      ? ''
      : B.ask
        ? `<span class="muted">¿Abandonar? No suma puntos.</span><button class="btn" id="quitYes">Sí, abandonar</button><button class="btn" id="quitNo">Seguir</button>`
        : `<button class="btn" id="quit">Abandonar</button>`;
    this.querySelector('#overlay').innerHTML = this.overlayHTML();
  }

  // HTML de la capa que cubre la pantalla: sorteo al inicio, "guardando" y resultado final.
  overlayHTML() {
    const B = this.B;
    // 1) Pantalla de sorteo
    if (B.intro) {
      const primero = B.turn === 'p' ? esc(this.player.nickname) : 'La máquina';
      return `<div class="ov toss"><div class="ovbox"><div class="coin">🪙</div><h2>Sorteo</h2>
        <div class="ov-avatars">
          <figure>${bodyImg(this.avatars.p)}<figcaption>${esc(this.player.nickname)}</figcaption></figure>
          <span class="ov-vs">VS</span>
          <figure>${bodyImg(this.avatars.m)}<figcaption>🤖 Máquina</figcaption></figure>
        </div>
        <p class="pts">Inicia: ${primero}</p></div></div>`;
    }
    // 2) Durante la partida no hay capa.
    if (!B.over) return '';
    // 3) Guardando el resultado en la API.
    if (B.saving) return `<div class="ov"><div class="ovbox"><span class="spin"></span>Guardando resultado…</div></div>`;
    // 4) Resultado final (victoria o derrota).
    const gano = B.result === 'win';
    // Si ganó, creamos 26 emojis de confeti con posición, duración y tamaño al azar.
    // Array.from({ length: 26 }, fn) crea un arreglo de 26 elementos usando fn.
    // `i % 6` (módulo) da 0,1,2,3,4,5,0,1... para repetir los 6 emojis.
    const confeti = gano
      ? `<div class="confetti">${Array.from({ length: 26 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-duration:${1.6 + Math.random() * 1.8}s;animation-delay:${Math.random() * 0.8}s;font-size:${14 + Math.random() * 16}px">${['🎉', '⭐', '🍋', '🥑', '☕', '✨'][i % 6]}</i>`).join('')}</div>`
      : '';
    return `<div class="ov ${gano ? 'win' : 'lose'}"><div class="ovbox">${confeti}
      <div class="ov-hero">${bodyImg(gano ? this.avatars.p : this.avatars.m)}<span class="em">${gano ? '🏆' : '😵'}</span></div>
      <h2>${gano ? '¡Victoria!' : 'Derrota'}</h2>
      <p class="muted">${gano ? 'Tu mazo dejó sin platos a la máquina.' : 'La máquina te dejó sin cartas esta vez.'}</p>
      <div class="pts">+${B.points} puntos</div>
      ${B.saveErr ? '<p class="msg err">No se pudo guardar el resultado.</p>' : ''}
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="playAgain">Jugar otra vez</button>
        <button class="btn" id="toRank">Ver ranking</button>
      </div></div></div>`;
  }
}

customElements.define('battle-arena', BattleArena);

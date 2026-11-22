import './battleStyles.css';
import './battleCard.js';
import './battleControls.js';
import { addBattleResult } from '../../api/playersApi.js';
import { postBattle } from '../../api/battlesApi.js';
import { shuffle, playerStarts } from '../../utils/random.js';
import { esc, sleep, emit } from '../../utils/dom.js';
import { AVATAR_IDS, getAvatar, faceImg, bodyImg } from '../../assets/avatars.js';
import { playSound, GAME_SOUNDS } from '../../utils/audio.js';
import { createDeckStates, startOwnTurn, chooseMachineAction, resolveAction } from '../../utils/battleEngine.js';

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

  disconnectedCallback() {
    this.dead = true;
  }

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
    this.addEventListener('battle-action', (e) => {
      const B = this.B;
      if (!B || B.lock || B.over || B.turn !== 'p') return;
      this.perform('p', e.detail.action);
    });
    this.addEventListener('click', (e) => {
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
    const ids = deck.map((c) => c.id);
    const rivales = shuffle(pool.filter((c) => !ids.includes(c.id))).slice(0, 5); // la máquina elige 5 distintas
    const iniciaJugador = playerStarts();
    // La máquina toma un avatar de otra región distinta a la del jugador
    const otros = AVATAR_IDS.filter((id) => getAvatar(id) !== getAvatar(player.avatar));
    this.avatars = { p: getAvatar(player.avatar), m: getAvatar(shuffle(otros)[0]) };
    const B = (this.B = {
      p: { deck: createDeckStates(deck), idx: 0 },
      m: { deck: createDeckStates(rivales), idx: 0 },
      turn: iniciaJugador ? 'p' : 'm',
      turnCount: 0,
      log: [],
      lock: true,
      intro: true,
      over: false,
      ask: false,
      startedAt: new Date().toISOString(),
    });
    this.log(`Sorteo: inicia ${iniciaJugador ? player.nickname : 'la máquina'}.`);
    const pc = B.p.deck.filter((d) => d.hasCombo).length;
    const mc = B.m.deck.filter((d) => d.hasCombo).length;
    if (pc) this.log(`🔗 Tu mazo tiene combo regional: +10 % de daño en ${pc} cartas.`);
    if (mc) this.log(`🔗 La máquina tiene combo regional en ${mc} cartas.`);
    this.log(`📖 ${deck[0].name} (${deck[0].region}): ${deck[0].fact}`);
    emit(this, 'battle-state', { active: true });
    this.refresh();
    (async () => {
      await sleep(1900);
      if (this.dead || this.B !== B) return;
      B.intro = false;
      this.beginTurn();
    })();
  }

  cur(side) {
    return this.B[side].deck[this.B[side].idx];
  }

  log(texto) {
    this.B.log.push(texto);
    if (this.B.log.length > 40) this.B.log.shift();
  }

  // ---------- Turnos ----------
  beginTurn() {
    const B = this.B;
    if (this.dead || B.over) return;
    startOwnTurn(this.cur(B.turn)); // el cooldown baja 1 al iniciar cada turno propio
    B.lock = B.turn === 'm';
    this.refresh();
    if (B.turn === 'm') {
      (async () => {
        await sleep(1100);
        if (this.dead || this.B !== B) return;
        this.perform('m', chooseMachineAction(this.cur('m')));
      })();
    }
  }

  async perform(side, action) {
    const B = this.B;
    const foeSide = side === 'p' ? 'm' : 'p';
    const vivo = () => !this.dead && this.B === B;
    const me = this.cur(side);
    const foe = this.cur(foeSide);
    const c = me.card;
    const quien = side === 'p' ? this.player.nickname : 'La máquina';
    const fMe = this.querySelector(`#f-${side}`);
    const fFoe = this.querySelector(`#f-${foeSide}`);
    B.lock = true;

    if (action.type === 'defend') {
      resolveAction(me, foe, action);
      this.log(`🛡️ ${quien}: ${c.name} usa ${c.defense.name}.`);
      playSound(c.sounds?.defense);
      this.refresh();
      fMe.animar('anim-defend', 700);
      await sleep(1000);
      if (!vivo()) return;
    } else {
      const esEspecial = action.type === 'special';
      playSound(esEspecial ? c.sounds?.special : c.sounds?.attack);
      this.refresh();
      fMe.animar(esEspecial ? 'anim-special' : 'anim-attack', esEspecial ? 900 : 500);
      await sleep(esEspecial ? 650 : 320);
      if (!vivo()) return;

      const r = resolveAction(me, foe, action);
      this.log(`${esEspecial ? '⚡' : '⚔️'} ${quien}: ${c.name} usa ${r.name} → ${r.damage} de daño${r.blocked ? ' (bloqueado 50 %)' : ''}.`);
      this.refresh();
      fFoe.animar('anim-hit', 500);
      fFoe.mostrarDanio(`-${r.damage}`, `${esEspecial ? 'sp ' : ''}${r.blocked ? 'blk' : ''}`);
      await sleep(900);
      if (!vivo()) return;

      if (r.defeated) {
        this.log(`💀 ${foe.card.name} fue derrotada.`);
        playSound(foe.card.sounds?.defeated);
        fFoe.animar('anim-defeated', 900);
        await sleep(950);
        if (!vivo()) return;
        B[foeSide].idx++;
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
    B.saving = true;
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

  preguntarAbandono(valor) {
    this.B.ask = valor;
    this.refresh();
  }

  hpHTML(side) {
    const cs = this.cur(side);
    const total = cs.card.hp;
    const pct = Math.max(0, Math.round((cs.hp / total) * 100));
    return `<div class="hpwrap" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${cs.hp}"><div class="hpbar ${pct < 30 ? 'low' : ''}" style="width:${pct}%"></div></div><span class="hptxt">${cs.hp} / ${total} HP</span>`;
  }

  // ---------- Dibujo ----------
  refresh() {
    const B = this.B;
    if (!B) return;
    const round = Math.floor(B.turnCount / 2) + 1;
    const texto = B.intro ? 'Sorteando quién inicia…' : B.over ? 'Combate terminado' : B.turn === 'p' ? '🟢 Tu turno' : '🔴 Turno de la máquina…';
    const bar = this.querySelector('#turnbar');
    bar.className = `turnbar ${B.over || B.intro ? '' : B.turn}`;
    // Avatar de quien tiene el turno: jugador a la izquierda, máquina a la derecha
    const activo = B.over || B.intro ? null : B.turn;
    if (!bar.querySelector('.tb-text')) {
      bar.innerHTML = `<div class="tb-side p"><span class="tb-avatar p"></span><div class="tb-hp p"></div></div><div class="tb-text"></div><div class="tb-side m"><div class="tb-hp m"></div><span class="tb-avatar m"></span></div>`;
    }
    bar.querySelector('.tb-hp.p').innerHTML = this.hpHTML('p');
    bar.querySelector('.tb-hp.m').innerHTML = this.hpHTML('m');
    bar.querySelector('.tb-text').innerHTML = `${texto}<small>Ronda ${round} · Turno ${B.turnCount + 1}</small>`;
    const cambio = bar.dataset.activo !== String(activo);
    if (cambio) {
      // Solo se redibuja al cambiar de turno, así la animación no se repite en cada refresh
      bar.dataset.activo = String(activo);
      for (const side of ['p', 'm']) {
        const slot = bar.querySelector(`.tb-avatar.${side}`);
        const on = activo === side;
        slot.classList.toggle('on', on);
        slot.title = on ? `${side === 'p' ? this.player.nickname : 'Máquina'} · ${this.avatars[side].region}` : '';
        slot.innerHTML = on ? faceImg(this.avatars[side]) : '';
      }
    }

    this.querySelector('#f-p').update({ cs: this.cur('p'), deck: B.p.deck, idx: B.p.idx, who: this.player.nickname });
    this.querySelector('#f-m').update({ cs: this.cur('m'), deck: B.m.deck, idx: B.m.idx, who: '🤖 Máquina' });
    if (cambio && activo) this.querySelector(activo === 'p' ? '#f-p' : '#f-m').anunciar(3000);
    this.querySelector('#controls').update({ cs: this.cur('p'), enabled: B.turn === 'p' && !B.lock && !B.over && !B.intro });

    // Historial completo con la jugada más reciente arriba
    const log = this.querySelector('#log');
    log.innerHTML = [...B.log].reverse().map((l) => `<div>${esc(l)}</div>`).join('');
    log.scrollTop = 0;
    this.querySelector('#quitRow').innerHTML = B.over
      ? ''
      : B.ask
        ? `<span class="muted">¿Abandonar? No suma puntos.</span><button class="btn" id="quitYes">Sí, abandonar</button><button class="btn" id="quitNo">Seguir</button>`
        : `<button class="btn" id="quit">Abandonar</button>`;
    this.querySelector('#overlay').innerHTML = this.overlayHTML();
  }

  overlayHTML() {
    const B = this.B;
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
    if (!B.over) return '';
    if (B.saving) return `<div class="ov"><div class="ovbox"><span class="spin"></span>Guardando resultado…</div></div>`;
    const gano = B.result === 'win';
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

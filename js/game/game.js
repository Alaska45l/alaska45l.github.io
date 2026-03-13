// js/game/game.js
// Clase principal del juego. Orquesta entidades, renderizado e input.

// ── Utilidad de colisión ─────────────────────

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Clase principal ──────────────────────────

class Game {
  constructor(canvas) {
    this.canvas   = canvas;
    this.renderer = new Renderer(canvas);

    // Estado: 'idle' | 'playing' | 'paused' | 'gameover' | 'win'
    this.state = 'idle';

    this.score      = 0;
    this.wave       = 0;
    this.keys       = {};
    this.projectiles = [];
    this.powerups    = [];
    this.particles   = [];
    this.player      = null;
    this.grid        = null;
    this.boss        = null;
    this.lastTime    = 0;
    this.btnBounds   = null;
    this.announcement = null;  // { text, alpha, timer }

    this._bindEvents();
    requestAnimationFrame(t => this._loop(t));
  }

  // ── Binding de eventos ───────────────────────

  _bindEvents() {
    this._onKeyDown = e => {
      this.keys[e.key] = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        // Evitar scroll de página cuando el juego está activo
        if (this.state === 'playing') e.preventDefault();
      }
      if ((e.key === 'p' || e.key === 'P') && (this.state === 'playing' || this.state === 'paused')) {
        this.state = this.state === 'playing' ? 'paused' : 'playing';
      }
    };
    this._onKeyUp = e => { delete this.keys[e.key]; };

    this._onClick = e => {
      if (!this.btnBounds) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top)  * scaleY;
      const { bx, by, bw, bh } = this.btnBounds;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        this._startGame();
      }
    };

    this._onTouchStart = e => {
      e.preventDefault();
      if (this.state === 'playing') this._firePlayer(performance.now());
      // tap en overlay
      if (this.state !== 'playing') this._onClick(e.touches[0]);
    };

    this._onTouchMove = e => {
      e.preventDefault();
      if (!this.player || this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const tx = (e.touches[0].clientX - rect.left) * scaleX;
      this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.w, tx - this.player.w / 2));
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
    this.canvas.addEventListener('click',      this._onClick);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this.canvas.removeEventListener('click',      this._onClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove',  this._onTouchMove);
    this._destroyed = true;
  }

  // ── Inicialización ───────────────────────────

  _startGame() {
    this.score       = 0;
    this.wave        = 0;
    this.projectiles = [];
    this.powerups    = [];
    this.particles   = [];
    this.boss        = null;
    this.grid        = null;
    this.announcement = null;

    const cfg = GAME_CONFIG.player;
    this.player = new Player(
      this.canvas.width / 2 - cfg.size / 2,
      this.canvas.height - cfg.size - 14
    );

    this._nextWave();
    this.state = 'playing';
  }

  _nextWave() {
    this.wave++;
    // Conservar sólo proyectiles del jugador al cambiar ola
    this.projectiles = this.projectiles.filter(p => p.owner === 'player');
    this.powerups    = [];

    const bossCfg = GAME_CONFIG.bosses.find(b => b.wave === this.wave);

    if (bossCfg) {
      this.boss = new Boss(bossCfg, this.canvas.width);
      this.grid = null;
      this._announce(`⚠️ JEFE: ${bossCfg.name}`, 2800);
    } else {
      this.boss = null;
      this.grid = new EnemyGrid(this.wave);
      this._announce(`⚛️ Ola ${this.wave}`, 1800);
    }
  }

  _announce(text, duration) {
    this.announcement = { text, alpha: 1, timer: duration };
  }

  // ── Disparo del jugador ──────────────────────

  _firePlayer(timestamp) {
    if (!this.player || this.state !== 'playing') return;
    const shots = this.player.shoot(timestamp);
    for (const s of shots) {
      s.pierce = this.player.hasPowerup('tunnel');
    }
    this.projectiles.push(...shots);
  }

  // ── Loop principal ───────────────────────────

  _loop(timestamp) {
    // Detener si el canvas fue removido del DOM (navegación SPA)
    if (this._destroyed || !document.body.contains(this.canvas)) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this._update(dt, timestamp);
    this._draw(timestamp);

    requestAnimationFrame(t => this._loop(t));
  }

  // ── Actualización ────────────────────────────

  _update(dt, timestamp) {
    if (this.state !== 'playing') return;

    // Anuncio
    if (this.announcement) {
      this.announcement.timer -= dt * 1000;
      this.announcement.alpha  = Math.min(1, this.announcement.timer / 400);
      if (this.announcement.timer <= 0) this.announcement = null;
    }

    const p = this.player;
    p.update(dt, this.keys, this.canvas.width);

    // Disparo continuo con tecla
    if (this.keys[' '] || this.keys['ArrowUp']) this._firePlayer(timestamp);

    // ── Grid de enemigos ──
    if (this.grid) {
      this.grid.setTimeDilation(p.hasPowerup('timedilation'));
      this.grid.update(dt, this.canvas.width);
      this.projectiles.push(...this.grid.tryFire());

      // Enemigos llegan al jugador
      for (const e of this.grid.alive()) {
        if (e.y + e.size >= p.y) { this.state = 'gameover'; return; }
      }

      if (this.grid.alive().length === 0) {
        if (this.wave >= GAME_CONFIG.maxWaves) { this.state = 'win'; return; }
        this._nextWave();
        return;
      }
    }

    // ── Jefe ──
    if (this.boss && !this.boss.dead) {
      this.boss.setTimeDilation(p.hasPowerup('timedilation'));
      this.boss.update(dt, this.canvas.width, timestamp);
      this.projectiles.push(...this.boss.tryFire(timestamp, this.canvas.width));

      if (this.boss.dead) {
        this._spawnBurst(this.boss.x + this.boss.size / 2, this.boss.y + this.boss.size / 2, '💥', 14);
        this.score += this.boss.scoreValue;
        if (this.wave >= GAME_CONFIG.maxWaves) {
          setTimeout(() => { this.state = 'win'; }, 1000);
        } else {
          setTimeout(() => this._nextWave(), 1200);
        }
      }
    }

    // ── Proyectiles ──
    this._updateProjectiles(dt);

    // ── Power-ups ──
    this.powerups = this.powerups.filter(pu => {
      pu.update(dt);
      if (pu.dead || pu.y > this.canvas.height) return false;
      if (rectsOverlap(pu.bounds(), p.bounds())) {
        this._applyPowerup(pu.type);
        return false;
      }
      return true;
    });

    // ── Partículas ──
    for (const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter(pt => pt.alive());
  }

  _updateProjectiles(dt) {
    const p   = this.player;
    const cw  = this.canvas.width;
    const ch  = this.canvas.height;
    const toKeep = [];

    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      pr.update(dt);
      if (pr.outOfBounds(cw, ch)) continue;

      if (pr.owner === 'player') {
        // vs grid
        if (this.grid) {
          for (const e of this.grid.alive()) {
            if (rectsOverlap(pr.bounds(), e.bounds())) {
              e.dead = true;
              this.score += e.points;
              this._spawnBurst(e.x + e.size / 2, e.y + e.size / 2, '✨', 4);
              this._tryDropPowerup(e.x + e.size / 2, e.y);
              this.grid.onKill();
              if (!pr.pierce) { pr.dead = true; break; }
            }
          }
        }
        // vs boss
        if (!pr.dead && this.boss && !this.boss.dead) {
          if (rectsOverlap(pr.bounds(), this.boss.bounds())) {
            if (this.boss.hit(pr.pierce)) {
              this.score += 5;
              if (!pr.pierce) pr.dead = true;
              if (this.boss.hp <= 0) this.boss.dead = true;
            }
          }
        }

      } else {
        // vs jugador
        if (rectsOverlap(pr.bounds(), p.bounds())) {
          if (p.hit()) {
            pr.dead = true;
            this._spawnBurst(p.x + p.w / 2, p.y + p.h / 2, '💫', 5);
            if (p.lives <= 0) { this.state = 'gameover'; return; }
          }
        }
      }

      if (!pr.dead) toKeep.push(pr);
    }

    this.projectiles = toKeep;
  }

  // ── Power-ups ────────────────────────────────

  _tryDropPowerup(x, y) {
    if (Math.random() > GAME_CONFIG.powerup.dropChance) return;
    const types = GAME_CONFIG.powerup.types;
    const type  = types[Math.floor(Math.random() * types.length)];
    this.powerups.push(new PowerUp(x, y, type));
  }

  _applyPowerup(type) {
    this._announce(`${type.emoji} ${type.label}!`, 1600);

    if (type.id === 'antimatter') {
      let pts = 0;
      if (this.grid)  this.grid.enemies.forEach(e => { if (!e.dead) { e.dead = true; pts += e.points; } });
      this.score += pts;
      this._spawnBurst(this.canvas.width / 2, this.canvas.height / 2, '💥', 20);
      return;
    }

    this.player.applyPowerup(type.id, GAME_CONFIG.powerup.duration);
  }

  // ── Partículas ───────────────────────────────

  _spawnBurst(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, emoji));
    }
  }

  // ── Renderizado ──────────────────────────────

  _draw(timestamp) {
    const r = this.renderer;
    r.readColors();
    r.clear();

    const playing = this.state === 'playing' || this.state === 'paused';
    const hasScene = this.player !== null;

    if (hasScene) {
      r.drawPlayer(this.player, timestamp);
      if (this.grid) r.drawEnemies(this.grid);
      if (this.boss && !this.boss.dead) r.drawBoss(this.boss, timestamp);
      r.drawProjectiles(this.projectiles);
      r.drawPowerUps(this.powerups);
      r.drawParticles(this.particles);
      r.drawHUD(this.score, this.wave, this.player.powerups);

      if (this.announcement && playing) {
        r.drawAnnouncement(this.announcement.text, this.announcement.alpha);
      }
    }

    // Pantallas de estado
    switch (this.state) {
      case 'idle':
        this.btnBounds = r.drawOverlay(
          '🐱 Quantum Cat Invaders',
          'WASD / ← →  mover  ·  Espacio  disparar  ·  P  pausa',
          'Jugar'
        );
        break;
      case 'paused':
        this.btnBounds = r.drawOverlay('⏸ Pausado', 'Presioná P para continuar', 'Continuar');
        break;
      case 'gameover':
        this.btnBounds = r.drawOverlay('☠️ Game Over', `${this.score} pts — Ola ${this.wave}`, 'Reintentar');
        break;
      case 'win':
        this.btnBounds = r.drawOverlay('🏆 ¡Victoria!', `Puntuación final: ${this.score} pts`, 'Jugar de nuevo');
        break;
    }
  }
}

// ── Inicialización automática ────────────────
// Usa MutationObserver para detectar cuando el SPA router inyecta home.html.

(function initGameObserver() {
  function tryInit() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return false;
    // Destruir instancia anterior si existe
    if (window._quantumCatGame) {
      window._quantumCatGame.destroy();
      window._quantumCatGame = null;
    }
    window._quantumCatGame = new Game(canvas);
    return true;
  }

  // Primer intento (por si home.html ya está en el DOM)
  if (!tryInit()) {
    const target   = document.getElementById('app') || document.body;
    const observer = new MutationObserver(() => {
      if (tryInit()) observer.disconnect();
    });
    observer.observe(target, { childList: true, subtree: true });
  }
})();
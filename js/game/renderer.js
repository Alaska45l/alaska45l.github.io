// js/game/renderer.js
// Responsabilidad única: dibujar en el canvas. Sin lógica de juego.

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._colors = {};
    this.readColors();
  }

  // Lee las CSS variables del tema actual (claro u oscuro)
  readColors() {
    const s = getComputedStyle(document.body);
    const get = v => s.getPropertyValue(v).trim();
    this._colors = {
      bg:       get('--card-bg')      || '#ffffff',
      text:     get('--text-primary') || '#333333',
      muted:    get('--text-muted')   || '#888888',
      primary:  get('--primary-color')|| '#f3a9c4',
      secondary:get('--secondary-color') || '#cce5ff',
      accent:   get('--accent-color') || '#e6e0ff',
      border:   get('--border-light') || 'rgba(0,0,0,0.06)',
    };
  }

  get c() { return this._colors; }

  // ── Helpers ─────────────────────────────────

  _emoji(emoji, x, y, size) {
    const ctx = this.ctx;
    ctx.font          = `${size}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText(emoji, x, y);
  }

  _roundRect(x, y, w, h, r, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill)   { ctx.fillStyle   = fill;   ctx.fill();   }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  // ── Escenas ─────────────────────────────────

  clear() {
    const { ctx, canvas, c } = this;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // cuadrícula decorativa sutil
    ctx.strokeStyle = c.border;
    ctx.lineWidth   = 0.5;
    const step = 40;
    for (let x = 0; x < canvas.width;  x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);  ctx.stroke(); }
  }

  // ── Entidades ────────────────────────────────

  drawPlayer(player, timestamp) {
    const { ctx, c } = this;

    // parpadeo durante invencibilidad
    if (player.invincible && Math.floor(timestamp / 90) % 2 === 0) return;

    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;

    if (Object.keys(player.powerups).length > 0) {
      ctx.shadowColor = c.primary;
      ctx.shadowBlur  = 16;
    }

    this._emoji(player.emoji, cx, cy, player.w);
    ctx.shadowBlur = 0;

    // vidas (patas)
    ctx.font         = '13px serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < player.lives; i++) {
      ctx.fillText('🐾', 8 + i * 20, this.canvas.height - 15);
    }
  }

  drawEnemies(grid) {
    for (const e of grid.enemies) {
      if (e.dead) continue;
      this._emoji(e.emoji, e.x + e.size / 2, e.y + e.size / 2, e.size);
    }
  }

  drawBoss(boss, timestamp) {
    const { ctx, canvas, c } = this;
    const cx = boss.x + boss.size / 2;
    const cy = boss.y + boss.size / 2;

    // Efecto de fase cuántica: parpadeo con opacidad baja
    if (boss.phased) {
      ctx.globalAlpha = Math.floor(timestamp / 130) % 2 === 0 ? 0.2 : 0.65;
    }

    ctx.shadowColor = '#f87171';
    ctx.shadowBlur  = 22;
    this._emoji(boss.emoji, cx, cy, boss.size);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;

    // Barra de HP
    const bw = 164, bh = 10, bx = canvas.width / 2 - bw / 2, by = 13;
    this._roundRect(bx, by, bw, bh, 4, c.border);

    const frac = Math.max(0, boss.hp / boss.maxHp);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0,   '#f87171');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1,   '#34d399');
    this._roundRect(bx, by, bw * frac, bh, 4, grad);

    ctx.fillStyle    = c.text;
    ctx.font         = 'bold 11px Poppins, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(boss.name, canvas.width / 2, by + bh + 3);

    if (boss.phased) {
      ctx.fillStyle = c.muted;
      ctx.font      = '10px Poppins, sans-serif';
      ctx.fillText('⚛️ Superposición cuántica — invencible', canvas.width / 2, by + bh + 16);
    }
  }

  drawProjectiles(projectiles) {
    for (const p of projectiles) {
      if (p.dead) continue;
      this._emoji(p.emoji, p.x, p.y, p.size);
    }
  }

  drawPowerUps(powerups) {
    const { ctx } = this;
    for (const pu of powerups) {
      if (pu.dead) continue;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur  = 12;
      this._emoji(pu.emoji, pu.x, pu.y, pu.size);
      ctx.shadowBlur  = 0;
    }
  }

  drawParticles(particles) {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      this._emoji(p.emoji, p.x, p.y, p.size * p.life);
    }
    ctx.globalAlpha = 1;
  }

  // ── HUD ─────────────────────────────────────

  drawHUD(score, wave, powerups) {
    const { ctx, canvas, c } = this;

    ctx.fillStyle    = c.text;
    ctx.font         = 'bold 13px Poppins, sans-serif';
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillText(`Ola: ${wave}`, 8, 10);

    ctx.textAlign = 'right';
    ctx.fillText(`${score} pts`, canvas.width - 8, 10);

    // Power-ups activos
    const now = performance.now();
    let py = 30;
    for (const [id, expiry] of Object.entries(powerups)) {
      const rem  = Math.ceil((expiry - now) / 1000);
      const type = GAME_CONFIG.powerup.types.find(t => t.id === id);
      if (!type || rem <= 0) continue;
      this._roundRect(8, py, 168, 18, 4, c.accent);
      ctx.fillStyle    = c.text;
      ctx.font         = '10px Poppins, sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${type.emoji} ${type.label} (${rem}s)`, 13, py + 9);
      py += 22;
    }
  }

  // ── Pantallas de estado ─────────────────────

  /**
   * Dibuja una pantalla superpuesta y devuelve los límites del botón.
   * @returns {{ bx, by, bw, bh }}
   */
  drawOverlay(title, subtitle, btnLabel) {
    const { ctx, canvas, c } = this;

    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 26px Poppins, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 44);

    ctx.font      = '15px Poppins, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 - 12);

    const bw = 164, bh = 40;
    const bx = canvas.width / 2 - bw / 2;
    const by = canvas.height / 2 + 16;
    this._roundRect(bx, by, bw, bh, 8, c.primary);
    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 14px Poppins, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabel, canvas.width / 2, by + bh / 2);

    return { bx, by, bw, bh };
  }

  // ── Anuncio de ola / power-up ────────────────

  drawAnnouncement(text, alpha) {
    const { ctx, canvas, c } = this;
    ctx.globalAlpha  = alpha;
    ctx.fillStyle    = c.primary;
    ctx.font         = 'bold 21px Poppins, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    // sombra de texto para legibilidad
    ctx.shadowColor  = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur   = 8;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
  }
}
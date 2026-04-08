// js/game/entities.js
// Clases de entidades del juego. Sin dependencias de DOM ni canvas.

class Player {
  constructor(x, y) {
    const cfg = GAME_CONFIG.player;
    this.x     = x;
    this.y     = y;
    this.w     = cfg.size;
    this.h     = cfg.size;
    this.speed = cfg.speed;
    this.emoji = cfg.emoji;
    this.lives = cfg.startLives;

    this.lastShot    = 0;
    this.fireRate    = cfg.fireRate;
    this.invincible  = false;
    this.invTimer    = 0;  // ms restantes de invencibilidad

    // id → timestamp de expiración
    this.powerups = {};
  }

  // Devuelve array de Projectile disparados; vacío si aún no es tiempo
  shoot(timestamp) {
    if (timestamp - this.lastShot < this.fireRate) return [];
    this.lastShot = timestamp;

    const { playerSpeed, playerEmoji } = GAME_CONFIG.projectile;
    const cx = this.x + this.w / 2;
    const cy = this.y;
    const shots = [new Projectile(cx, cy, 0, -playerSpeed, playerEmoji, 'player')];

    if (this.hasPowerup('superposition')) {
      const diag = playerSpeed * 0.38;
      shots.push(new Projectile(cx, cy, -diag, -playerSpeed, playerEmoji, 'player'));
      shots.push(new Projectile(cx, cy,  diag, -playerSpeed, playerEmoji, 'player'));
    }

    return shots;
  }

  update(dt, keys, canvasW) {
    if (keys['ArrowLeft']  || keys['a']) this.x -= this.speed * dt;
    if (keys['ArrowRight'] || keys['d']) this.x += this.speed * dt;
    this.x = Math.max(0, Math.min(canvasW - this.w, this.x));

    if (this.invincible) {
      this.invTimer -= dt * 1000;
      if (this.invTimer <= 0) this.invincible = false;
    }

    const now = performance.now();
    for (const id of Object.keys(this.powerups)) {
      if (this.powerups[id] < now) delete this.powerups[id];
    }
  }

  applyPowerup(id, duration) {
    if (id === 'schrodinger') {
      this.invincible = true;
      this.invTimer   = duration;
      return;
    }
    // 'antimatter' se gestiona en Game directamente
    this.powerups[id] = performance.now() + duration;
  }

  hasPowerup(id) {
    return !!this.powerups[id] && this.powerups[id] > performance.now();
  }

  // Devuelve true si el golpe fue efectivo
  hit() {
    if (this.invincible) return false;
    this.lives--;
    this.invincible = true;
    this.invTimer   = GAME_CONFIG.player.invincibleDuration;
    return true;
  }

  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// ─────────────────────────────────────────────

class Projectile {
  constructor(x, y, vx, vy, emoji, owner) {
    this.x      = x;
    this.y      = y;
    this.vx     = vx;
    this.vy     = vy;
    this.emoji  = emoji;
    this.owner  = owner;  // 'player' | 'enemy' | 'boss'
    this.size   = GAME_CONFIG.projectile.size;
    this.dead   = false;
    this.pierce = false;  // si true, no muere al impactar
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  outOfBounds(cw, ch) {
    const s = this.size;
    return this.y < -s || this.y > ch + s || this.x < -s || this.x > cw + s;
  }

  bounds() {
    const h = this.size;
    const w = this.size * 0.6;
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }
}

// ─────────────────────────────────────────────

class Enemy {
  constructor(col, row, x, y) {
    const cfg  = GAME_CONFIG.enemies;
    this.x     = x;
    this.y     = y;
    this.size  = cfg.size;
    this.emoji = cfg.emojis[row % cfg.emojis.length];
    this.points = cfg.points[row % cfg.points.length];
    this.dead  = false;
  }

  bounds() { return { x: this.x, y: this.y, w: this.size, h: this.size }; }
}

// ─────────────────────────────────────────────

class EnemyGrid {
  constructor(wave) {
    const cfg        = GAME_CONFIG.enemies;
    this.baseSpeed   = cfg.baseSpeed + wave * cfg.speedPerWave;
    this.currentSpeed = this.baseSpeed;
    this.direction   = 1;
    this.enemies     = [];
    this._build();
  }

  _build() {
    const { rows, cols, colSpacing, rowSpacing, leftPad, topPad } = GAME_CONFIG.enemies;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.enemies.push(new Enemy(c, r,
          leftPad + c * colSpacing,
          topPad  + r * rowSpacing
        ));
      }
    }
  }

  alive() { return this.enemies.filter(e => !e.dead); }

  update(dt, canvasW) {
    const live = this.alive();
    if (!live.length) return;

    let minX = Infinity, maxX = -Infinity;
    for (const e of live) {
      if (e.x < minX) minX = e.x;
      if (e.x + e.size > maxX) maxX = e.x + e.size;
    }

    const next = this.currentSpeed * this.direction * dt;
    if (maxX + next >= canvasW - 8) {
      this.direction = -1;
      this._drop();
    } else if (minX + next <= 8) {
      this.direction = 1;
      this._drop();
    }

    for (const e of live) e.x += this.currentSpeed * this.direction * dt;
  }

  _drop() {
    for (const e of this.alive()) e.y += GAME_CONFIG.enemies.dropAmount;
  }

  tryFire() {
    const shots = [];
    const { enemySpeed, enemyEmoji } = GAME_CONFIG.projectile;
    const chance = GAME_CONFIG.enemies.fireChancePerFrame;

    for (const e of this.alive()) {
      if (Math.random() < chance) {
        shots.push(new Projectile(
          e.x + e.size / 2,
          e.y + e.size,
          0, enemySpeed, enemyEmoji, 'enemy'
        ));
      }
    }
    return shots;
  }

  // Acelera levemente al matar un enemigo
  onKill() {
    this.currentSpeed = Math.min(this.baseSpeed * 2.8, this.currentSpeed + 7);
  }

  setTimeDilation(active) {
    this.currentSpeed = active ? this.baseSpeed * 0.28 : this.baseSpeed;
  }
}

// ─────────────────────────────────────────────

class Boss {
  constructor(cfg, canvasW) {
    this.cfg       = cfg;
    this.name      = cfg.name;
    this.emoji     = cfg.emoji;
    this.size      = cfg.size;
    this.hp        = cfg.hp;
    this.maxHp     = cfg.hp;
    this.scoreValue = cfg.scoreValue;
    this.baseSpeed = cfg.speed;
    this.speed     = cfg.speed;
    this.fireRate  = cfg.fireRate;
    this.attacks   = cfg.attacks;
    this.x         = canvasW / 2 - cfg.size / 2;
    this.y         = 58;
    this.dir       = 1;
    this.dead      = false;
    this.lastFire  = 0;
    this.sweepAngle = 0;

    // Mecánica de fase (Schrödinger / Dirac): boss invisible e invencible
    this.phaseInterval = cfg.phaseInterval || null;
    this.phased        = false;
    this.lastPhase     = performance.now();
  }

  update(dt, canvasW, timestamp) {
    this.x += this.speed * this.dir * dt;
    if (this.x <= 8)                   this.dir =  1;
    if (this.x + this.size >= canvasW - 8) this.dir = -1;

    if (this.phaseInterval && timestamp - this.lastPhase > this.phaseInterval) {
      this.phased    = !this.phased;
      this.lastPhase = timestamp;
    }
  }

  tryFire(timestamp, canvasW) {
    if (timestamp - this.lastFire < this.fireRate) return [];
    this.lastFire = timestamp;

    const { enemySpeed, bossSpeedMult, bossEmoji, bombEmoji, sweepEmoji } = GAME_CONFIG.projectile;
    const spd = enemySpeed * bossSpeedMult;
    const cx  = this.x + this.size / 2;
    const cy  = this.y + this.size;
    const type = this.attacks[Math.floor(Math.random() * this.attacks.length)];
    const shots = [];

    switch (type) {
      case 'single':
        shots.push(new Projectile(cx, cy, 0, spd, bossEmoji, 'boss'));
        break;

      case 'spread':
        for (let i = -2; i <= 2; i++) {
          const a = (i * 16) * Math.PI / 180;
          shots.push(new Projectile(cx, cy, Math.sin(a) * spd, Math.cos(a) * spd, bossEmoji, 'boss'));
        }
        break;

      case 'bomb':
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          shots.push(new Projectile(cx, cy, Math.cos(a) * spd * 0.9, Math.sin(a) * spd * 0.9, bombEmoji, 'boss'));
        }
        break;

      case 'sweep':
        this.sweepAngle += 0.28;
        shots.push(new Projectile(
          cx, cy,
          Math.cos(this.sweepAngle) * spd,
          Math.abs(Math.sin(this.sweepAngle)) * spd + enemySpeed,
          sweepEmoji, 'boss'
        ));
        break;
    }
    return shots;
  }

  hit(pierce) {
    if (this.phased && !pierce) return false;
    this.hp--;
    return true;
  }

  setTimeDilation(active) {
    this.speed = active ? this.baseSpeed * 0.28 : this.baseSpeed;
  }

  bounds() { return { x: this.x, y: this.y, w: this.size, h: this.size }; }
}

// ─────────────────────────────────────────────

class PowerUp {
  constructor(x, y, type) {
    this.x     = x;
    this.y     = y;
    this.type  = type;
    this.emoji = type.emoji;
    this.size  = GAME_CONFIG.powerup.size;
    this.speed = GAME_CONFIG.powerup.speed;
    this.dead  = false;
  }

  update(dt) { this.y += this.speed * dt; }

  bounds() {
    const s = this.size;
    return { x: this.x - s / 2, y: this.y - s / 2, w: s, h: s };
  }
}

// ─────────────────────────────────────────────

class Particle {
  constructor(x, y, emoji) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 80 + Math.random() * 70;
    this.x     = x;
    this.y     = y;
    this.vx    = Math.cos(angle) * spd;
    this.vy    = Math.sin(angle) * spd;
    this.emoji = emoji;
    this.size  = 13;
    this.life  = 1;   // 0..1, se decae con dt
  }

  update(dt) {
    this.x    += this.vx * dt;
    this.y    += this.vy * dt;
    this.life -= dt * 1.8;
  }

  alive() { return this.life > 0; }
}
// js/game/config.js
// Toda la configuración del juego. Modificar aquí sin tocar la lógica.

const GAME_CONFIG = Object.freeze({

  canvas: {
    width:  600,
    height: 520,
  },

  player: {
    startLives:          3,
    speed:               265,   // px/s
    fireRate:            280,   // ms mínimo entre disparos
    size:                34,
    invincibleDuration:  2200,  // ms de invencibilidad tras recibir daño
    emoji:               '🐱',
  },

  projectile: {
    playerSpeed:   440,   // px/s hacia arriba
    enemySpeed:    185,   // px/s hacia abajo
    bossSpeedMult: 1.4,
    size:          15,
    playerEmoji:   '⚛️',
    enemyEmoji:    '💊',
    bossEmoji:     '☢️',
    bombEmoji:     '🔴',
    sweepEmoji:    '🌀',
  },

  enemies: {
    rows:               3,
    cols:               8,
    colSpacing:         56,
    rowSpacing:         44,
    leftPad:            44,
    topPad:             90,
    baseSpeed:          38,     // px/s horizontal (ola 1)
    speedPerWave:       9,      // incremento por ola
    dropAmount:         20,     // px al cambiar dirección
    fireChancePerFrame: 0.00062, // probabilidad por enemigo por frame
    emojis:  ['🐭', '🐀', '🦠'],
    points:  [10,    20,   30  ],
    size:    28,
  },

  powerup: {
    speed:      72,     // px/s hacia abajo
    dropChance: 0.18,
    duration:   7000,   // ms activo
    size:       22,
    types: [
      { id: 'superposition', emoji: '🌊', label: 'Superposición',       desc: 'Triple disparo diagonal' },
      { id: 'tunnel',        emoji: '🕳️',  label: 'Efecto Túnel',         desc: 'Proyectiles atraviesan' },
      { id: 'antimatter',    emoji: '💥', label: 'Antimateria',          desc: 'Elimina todos los enemigos' },
      { id: 'timedilation',  emoji: '⏳', label: 'Dilatación Temporal',  desc: 'Ralentiza enemigos' },
      { id: 'schrodinger',   emoji: '📦', label: 'Caja de Schrödinger',  desc: 'Invencibilidad temporal' },
    ],
  },

  bosses: [
    {
      wave:          3,
      name:          'Caja de Schrödinger',
      emoji:         '📦',
      hp:            50,
      speed:         78,
      fireRate:      960,
      size:          54,
      attacks:       ['single', 'spread'],
      phaseInterval: 2800,  // ms entre cambios de fase (invencible mientras está en fase)
      scoreValue:    500,
    },
    {
      wave:          6,
      name:          'Proyecto Manhattan',
      emoji:         '☢️',
      hp:            100,
      speed:         98,
      fireRate:      720,
      size:          58,
      attacks:       ['spread', 'bomb'],
      phaseInterval: null,
      scoreValue:    1000,
    },
    {
      wave:          9,
      name:          'Gato de Dirac',
      emoji:         '😼',
      hp:            160,
      speed:         118,
      fireRate:      490,
      size:          62,
      attacks:       ['spread', 'bomb', 'sweep'],
      phaseInterval: 2000,
      scoreValue:    2000,
    },
  ],

  maxWaves: 10,  // superar ola maxWaves tras el último jefe = victoria

});
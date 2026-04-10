// @ts-check
'use strict';

/**
 * @typedef {{ text: string, cls?: string }} TermLine
 *
 * @typedef {{
 *   cancelled:         boolean,
 *   activeDragCleanup: (() => void) | null
 * }} MountCtx
 */

/** @type {MountCtx | null} */
let _mountCtx = null;

/**
 * Monta el terminal interactivo en el #about-terminal del DOM actual.
 * Seguro para llamar múltiples veces — el guard de dataset.termInit dentro
 * de init() previene la doble inicialización.
 * @returns {void}
 */
export function mountTerminal() {
  _mountCtx = { cancelled: false, activeDragCleanup: null };
  tryMount();
}

/**
 * Desmonta el terminal: cancela animaciones en vuelo, limpia timers y
 * elimina event listeners inyectados al document.
 * @returns {void}
 */
export function unmountTerminal() {
  if (_mountCtx) {
    _mountCtx.cancelled = true;
    _mountCtx.activeDragCleanup?.();
    _mountCtx = null;
  }

  pingTimers.forEach(id => clearTimeout(id));
  pingTimers = [];

  state.animating = false;
  const inp = getInput();
  if (inp) inp.disabled = false;

  const win = getWindow();
  if (win) {
    delete win.dataset['windowInit'];
    delete win.dataset['termInit'];
  }

  currentPromptLine = null;
}

/* ─────────────────────────────────────────────────────────────
 * CONFIGURATION
 * ───────────────────────────────────────────────────────────── */
const CONFIG = {
  promptHtml:
    '<span class="tp-user">guest</span>'  +
    '<span class="tp-at">@</span>'         +
    '<span class="tp-host">alaska</span>'  +
    '<span class="tp-sep">:</span>'        +
    '<span class="tp-path">~</span>'       +
    '<span class="tp-dollar">$</span>',

  cvUrl: 'assets/alaskaGonzalez_cv.pdf',

  files: {
    'about.txt':   'about',
    'studies.txt': 'studies',
    'coffee.txt':  'coffee',
    'public.txt':  'public',
    'life.txt':    'life',
    'cv.pdf':      '__cv__',
  },

  sections: {
    about: [
      { text: 'about.txt', cls: 'header' },
      { text: '' },
      { text: 'Soy Alaska Elaina González, nacida en 2002, Mar del Plata.', cls: 'output' },
      { text: 'Agnóstica tirando a atea, criada en una familia estricta de', cls: 'output' },
      { text: 'testigos de Jehová. Sí… exactamente eso.', cls: 'output' },
      { text: '' },
      { text: 'Soy trans (no especialmente orgullosa, solo factual), curiosa por', cls: 'output' },
      { text: 'naturaleza y con una obsesión bastante constante por entender', cls: 'output' },
      { text: 'cómo funciona el mundo.', cls: 'output' },
      { text: '' },
      { text: 'Actualmente estudio Física en la UNMDP.', cls: 'output' },
      { text: 'Pasé por medicina, pero me cansó el ambiente cargado de', cls: 'output' },
      { text: 'ideología disfrazada de academia, culto acrítico a "intelectuales" franceses', cls: 'output' },
      { text: 'y una alergia bastante fuerte al pensamiento crítico real (sí, Freud incluido).', cls: 'output' },
      { text: '' },
      { text: 'Tengo formación por gusto en IT, experiencia como barista y en', cls: 'output' },
      { text: 'gestión administrativa.', cls: 'output' },
      { text: '' },
      { text: 'En lo ideológico, me muevo cerca de un libertarismo minarquista', cls: 'output' },
      { text: 'con una mirada tecnocrática (pro-ciencia, pro-nuclear, anti-hippies).', cls: 'output' },
      { text: '' },
    ],
    studies: [
      { text: 'studies.txt', cls: 'header' },
      { text: '' },
      { text: '[2025 - presente]  Licenciatura en Física — UNMDP', cls: 'success' },
      { text: '  Rigor, precisión y un entorno donde equivocarse', cls: 'output' },
      { text: '  de forma exacta también cuenta como avanzar.', cls: 'output' },
      { text: '  No soy fan de las matemáticas, pero sí que exigen.', cls: 'output' },
      { text: '' },
      { text: '[2024 - 2025]  Medicina — Ciclo Básico — UNMDP', cls: 'muted' },
      { text: '  Empecé por la biología; me fui por el exceso de dogma.', cls: 'output' },
      { text: '  Mucha narrativa, poca tolerancia al cuestionamiento.', cls: 'output' },
      { text: '  Aun así, aprendí lo que valía la pena.', cls: 'output' },
      { text: '' },
      { text: '[2022 - 2024]  Tecnicatura en Desarrollo — UNICEN', cls: 'muted' },
      { text: '  JS · TS · PHP · Python · estructuras.', cls: 'output' },
      { text: '  Buenas bases en programación y sistemas,', cls: 'output' },
      { text: '  incluso con una pedagogía… mejorable.', cls: 'output' },
      { text: '' },
      { text: '[2015 - 2021]  Bachiller Ciencias Naturales — E.S. N°2', cls: 'muted' },
      { text: '  Donde empezó todo, aunque el sistema no siempre acompañara.', cls: 'output' },
      { text: '' },
    ],
    coffee: [
      { text: 'coffee.txt', cls: 'header' },
      { text: '' },
      { text: 'Nunca supe bien por qué me gusta tanto el café ni de dónde', cls: 'output' },
      { text: 'aprendí lo que sé, pero por alguna razón se me dio bien.', cls: 'output' },
      { text: '' },
      { text: 'El latte art no cuenta... Eso no sigue siendo mi fuerte.', cls: 'muted' },
      { text: '' },
      { text: 'No tengo un curso formal de barista (aunque mi CV diga que sí).', cls: 'output' },
      { text: 'A veces mentir un poco también es parte de sobrevivir.', cls: 'output' },
      { text: '' },
    ],
    public: [
      { text: 'public.txt', cls: 'header' },
      { text: '' },
      { text: 'Trabajo en atención al público porque, siendo realistas,', cls: 'output' },
      { text: 'es donde cae el 90% de los trabajos sin algo técnico fuerte.', cls: 'output' },
      { text: 'No es algo que se me dé naturalmente, ni algo que disfrute.', cls: 'output' },
      { text: 'Pero aprendí a hacerlo bien igual.', cls: 'output' },
      { text: '' },
      { text: 'Empecé como commis, pasé a camarera y después a barista.', cls: 'output' },
      { text: 'Aprendí rápido porque no había mucho margen para no hacerlo.', cls: 'output' },
      { text: '' },
      { text: 'Ahora estoy intentando moverme a algo administrativo.', cls: 'output' },
      { text: 'Menos desgaste, más fines de semana libres.', cls: 'output' },
      { text: '' },
      { text: 'Sigo tratando con personas, aunque no prefiera.', cls: 'success' },
      { text: '' },
    ],
    life: [
      { text: 'life.txt', cls: 'header' },
      { text: '' },
      { text: 'Me gusta el anime (mis tops por ahora son Mushoku Tensei,', cls: 'output' },
      { text: 'Made in Abyss, Frieren, Violet Evergarden, JoJo\u2019s y alguno', cls: 'output' },
      { text: 'más que seguro me estoy olvidando).', cls: 'output' },
      { text: '' },
      { text: 'Estoy en pareja con un chico llamado Lauti, que por alguna', cls: 'output' },
      { text: 'razón cada vez lo amo más.', cls: 'success' },
      { text: '' },
      { text: 'A la fecha de este push no me sigo tratando con mis padres.', cls: 'output' },
      { text: 'Actualmente mis suegros pasaron a ocupar ese lugar.', cls: 'output' },
      { text: '' },
      { text: 'No soy de muchos amigos. Por mi forma de ser termino', cls: 'output' },
      { text: 'desconectándome y perdiendo vínculos bastante rápido.', cls: 'output' },
      { text: 'Bastante solitaria, aunque no necesariamente por elección.', cls: 'output' },
      { text: '' },
      { text: 'No tengo TEA ni TDAH, aunque el ritalin gratis no vendría mal.', cls: 'muted' },
      { text: 'Quizás algo de depresión y disforia, que por suerte cada vez es menor.', cls: 'muted' },
      { text: '' },
      { text: 'No uso mucho redes sociales, aunque las tenga.', cls: 'output' },
      { text: 'Quitando Twitter, no gasto tiempo en ellas.', cls: 'output' },
      { text: '' },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────
 * MODULE-LEVEL STATE
 * ───────────────────────────────────────────────────────────── */
const state = {
  history: (function () {
    try {
      const saved = localStorage.getItem('terminal_history');
      return saved ? /** @type {string[]} */ (JSON.parse(saved)) : /** @type {string[]} */ ([]);
    } catch { return /** @type {string[]} */ ([]); }
  }()),
  historyIdx: -1,
  draft:      '',
  animating:  false,
};

/** @type {number[]} */
let pingTimers = [];

/** @type {HTMLElement|null} */
let currentPromptLine = null;

let pos = { x: 0, y: 0 };
let zIndexCounter = 100;

/* ─────────────────────────────────────────────────────────────
 * Z-INDEX STACK MANAGER
 * ───────────────────────────────────────────────────────────── */
/** @param {HTMLElement} win */
function bringToFront(win) {
  zIndexCounter++;
  win.style.zIndex = String(zIndexCounter);
}

/* ─────────────────────────────────────────────────────────────
 * DOM HELPERS
 * ───────────────────────────────────────────────────────────── */
/** @returns {HTMLElement|null} */
const getOutput = () => document.getElementById('terminal-output');
/** @returns {HTMLInputElement|null} */
const getInput  = () => /** @type {HTMLInputElement|null} */ (document.getElementById('terminal-input'));
/** @returns {HTMLElement|null} */
const getWindow = () => document.getElementById('about-terminal');

/**
 * @param {string}  text
 * @param {string=} cls
 * @returns {HTMLElement}
 */
function makeLine(text, cls) {
  const el = document.createElement('div');
  el.className = 'tl' + (cls ? ' tl--' + cls : ' tl--output');
  el.textContent = text === '' ? '\u00a0' : text;
  return el;
}

function scrollBottom() {
  const out = getOutput();
  if (out) out.scrollTop = out.scrollHeight;
}

/* ─────────────────────────────────────────────────────────────
 * QUOTE-AWARE ARGUMENT PARSER
 * ───────────────────────────────────────────────────────────── */
/** @param {string} input @returns {string[]} */
function parseCommandArgs(input) {
  /** @type {string[]} */
  const args   = [];
  let current  = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (c === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (c === ' ' && !inSingle && !inDouble) {
      if (current.length) { args.push(current); current = ''; }
      continue;
    }
    current += c;
  }
  if (current.length) args.push(current);
  return args.length ? args : [input];
}

/* ─────────────────────────────────────────────────────────────
 * LIVE PROMPT LINE
 * ───────────────────────────────────────────────────────────── */
function createPromptLine() {
  const out = getOutput();
  const inp = getInput();
  if (!out) return;

  const el = document.createElement('div');
  el.className = 'tl tl--cmd active-prompt';
  el.innerHTML =
    '<span class="t-prompt-echo">' + CONFIG.promptHtml + '</span>' +
    ' <span class="cmd-text"></span>' +
    '<span class="terminal-cursor" aria-hidden="true"></span>';

  out.appendChild(el);
  currentPromptLine = el;
  scrollBottom();

  if (inp && !inp.disabled) inp.focus();
}

/** @param {string} val */
function updatePromptLine(val) {
  if (!currentPromptLine) return;
  const cmdText = currentPromptLine.querySelector('.cmd-text');
  if (cmdText) cmdText.textContent = val;
  scrollBottom();
}

function finalizePromptLine() {
  if (!currentPromptLine) return;
  currentPromptLine.querySelector('.terminal-cursor')?.remove();
  currentPromptLine.classList.remove('active-prompt');
  currentPromptLine = null;
}

const LINE_DELAY_MS = 36;

/**
 * @param {TermLine[]}    lines
 * @param {(() => void)=} onDone 
 */
function printLines(lines, onDone) {
  const ctx = _mountCtx;
  const out = getOutput();
  const inp = getInput();

  if (!out || !ctx) {
    onDone?.();
    return;
  }

  state.animating = true;
  if (inp) inp.disabled = true;

  let i = 0;
  function next() {
  if (!ctx || ctx.cancelled) return;

    if (i >= lines.length) {
      state.animating = false;
      if (inp) inp.disabled = false;
      if (typeof onDone === 'function') onDone();
      return;
    }
    const line = lines[i++];
    const text = line.text !== undefined ? line.text : '';
    const el   = makeLine(text, line.cls ?? 'output');

    el.style.opacity   = '0';
    el.style.transform = 'translateY(5px)';
    out?.appendChild(el);

    requestAnimationFrame(() => {
      if (ctx.cancelled) return; // Guard también dentro del rAF
      el.style.transition = 'opacity 0.20s ease, transform 0.20s ease';
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    });

    scrollBottom();
    setTimeout(next, LINE_DELAY_MS);
  }
  next();
}

/* ─────────────────────────────────────────────────────────────
 * COMMAND HANDLERS (sin cambios funcionales)
 * ───────────────────────────────────────────────────────────── */

/** @returns {TermLine[]} */
function cmdHelp() {
  return [
    { text: 'Comandos disponibles:', cls: 'header' },
    { text: '' },
    { text: '  whoami                    \u2014  Usuario actual',                         cls: 'output' },
    { text: '  whoami --full             \u2014  Nombre completo',                        cls: 'output' },
    { text: '  ls                        \u2014  Lista archivos',                         cls: 'output' },
    { text: '  ls -l                     \u2014  Listado detallado',                      cls: 'output' },
    { text: '  ls -la                    \u2014  Incluye archivos ocultos',               cls: 'output' },
    { text: '  cat <archivo>             \u2014  Muestra contenido de un archivo',        cls: 'output' },
    { text: '  grep <t\u00e9rmino> <archivo>  \u2014  Busca texto en un archivo',         cls: 'output' },
    { text: '  head <archivo>            \u2014  Primeras 5 l\u00edneas',                 cls: 'output' },
    { text: '  tail <archivo>            \u2014  \u00DAltimas 5 l\u00edneas',             cls: 'output' },
    { text: '  uname -a                  \u2014  Info del sistema',                       cls: 'output' },
    { text: '  pwd                       \u2014  Directorio actual',                      cls: 'output' },
    { text: '  date                      \u2014  Fecha y hora',                           cls: 'output' },
    { text: '  echo <texto|$VAR>         \u2014  Imprime texto o variables de entorno',   cls: 'output' },
    { text: '  neofetch                  \u2014  Info del sistema al estilo neofetch',    cls: 'output' },
    { text: '  ping <host>               \u2014  Simula ICMP hacia un host',              cls: 'output' },
    { text: '  top / htop                \u2014  Procesos en ejecuci\u00f3n (est\u00e1tico)',  cls: 'output' },
    { text: '  history                   \u2014  Historial de comandos',                  cls: 'output' },
    { text: '  sudo <cmd>                \u2014  Intent\u00e1 ser root',                  cls: 'output' },
    { text: '  xdg-open cv.pdf           \u2014  Abre el CV en nueva pesta\u00f1a',       cls: 'output' },
    { text: '  clear                     \u2014  Limpia el terminal  (o Ctrl+L)',          cls: 'output' },
    { text: '  help                      \u2014  Muestra este mensaje',                   cls: 'output' },
    { text: '' },
    { text: 'Navegaci\u00f3n:', cls: 'header' },
    { text: '' },
    { text: '  cd <ruta>           \u2014  Navega a una ruta  (ej: cd experience)', cls: 'output' },
    { text: '  go <ruta>           \u2014  Alias de cd',                            cls: 'output' },
    { text: '  open <ruta>         \u2014  Alias de cd',                            cls: 'output' },
    { text: '  home                \u2014  Navega al inicio  (/)',                  cls: 'output' },
    { text: '  back                \u2014  Vuelve a la p\u00e1gina anterior',        cls: 'output' },
    { text: '' },
    { text: 'Atajos de teclado:', cls: 'header' },
    { text: '' },
    { text: '  Ctrl+L              \u2014  Limpia la pantalla',                     cls: 'output' },
    { text: '  Ctrl+C              \u2014  Cancela el comando / l\u00ednea actual',  cls: 'output' },
    { text: '  Ctrl+U              \u2014  Borra la l\u00ednea actual',              cls: 'output' },
    { text: '  Tab                 \u2014  Autocompletar  (rutas con cd/go/open)',   cls: 'output' },
    { text: '  \u2191 / \u2193            \u2014  Navegar historial',                cls: 'output' },
    { text: '' },
    { text: 'Tip: los archivos visibles con ls son legibles con cat, grep, head y tail.', cls: 'muted' },
    { text: '' },
  ];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdWhoami(args) {
  if (args.indexOf('--full') !== -1 || args.indexOf('-f') !== -1) {
    return [
      { text: 'Alaska Elaina Gonz\u00e1lez', cls: 'success' },
      { text: '23 a\u00f1os \u00b7 Mar del Plata, Argentina', cls: 'output' },
      { text: '' },
    ];
  }
  return [{ text: 'alaska', cls: 'success' }, { text: '' }];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdLs(args) {
  const hasL = args.some(a => /^-[la]{1,2}$/.test(a));
  const hasA = args.some(a => /^-[la]*a[la]*$/.test(a) || a === '-A' || a === '-lA');

  if (hasL) {
    /** @type {TermLine[]} */
    let lines = [{ text: 'total 48', cls: 'muted' }];
    if (hasA) {
      lines.push({ text: 'drwxr-x--- 2 alaska alaska 4096 Jan 26 2026 ./',       cls: 'muted' });
      lines.push({ text: 'drwxr-xr-x 4 root   root   4096 Jan 26 2026 ../',      cls: 'muted' });
      lines.push({ text: '-rw-r--r-- 1 alaska alaska   42 Jan 26 2026 .bashrc',  cls: 'muted' });
      lines.push({ text: '-rw-r--r-- 1 alaska alaska   24 Jan 26 2026 .profile', cls: 'muted' });
    }
    lines = lines.concat([
      { text: '-rw-r--r-- 1 alaska alaska   512 Mar 19 2025 about.txt',   cls: 'output' },
      { text: '-rw-r--r-- 1 alaska alaska   843 Jan 12 2025 coffee.txt',  cls: 'output' },
      { text: '-rw-r--r-- 1 alaska alaska   621 Nov  3 2024 life.txt',    cls: 'output' },
      { text: '-rw-r--r-- 1 alaska alaska   730 Oct 15 2024 public.txt',  cls: 'output' },
      { text: '-rw-r--r-- 1 alaska alaska  1024 Mar 19 2025 studies.txt', cls: 'output' },
      { text: '-rw-r--r-- 1 alaska alaska 98304 Jan 26 2026 cv.pdf',      cls: 'success' },
    ]);
    lines.push({ text: '' });
    return lines;
  }

  let files = ['about.txt', 'coffee.txt', 'life.txt', 'public.txt', 'studies.txt', 'cv.pdf'];
  if (hasA) files = ['.bashrc', '.profile', ...files];
  return [{ text: files.join('    '), cls: 'output' }, { text: '' }];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdCat(args) {
  if (!args.length || args[0] === '') {
    return [
      { text: 'cat: falta un nombre de archivo', cls: 'error' },
      { text: 'Uso: cat <archivo>    (ej: cat about.txt)', cls: 'muted' },
      { text: '' },
    ];
  }
  const filename   = args[0].toLowerCase();
  const files      = /** @type {Record<string,string>} */ (CONFIG.files);
  const sectionKey = files[filename];

  if (!sectionKey) {
    return [
      { text: 'cat: ' + filename + ': No such file or directory', cls: 'error' },
      { text: "Escrib\u00ed 'ls' para ver los archivos disponibles.", cls: 'muted' },
      { text: '' },
    ];
  }
  if (sectionKey === '__cv__') {
    return [
      { text: 'cat: cv.pdf: es un archivo binario, no texto.', cls: 'error' },
      { text: 'Prob\u00e1 con:  xdg-open cv.pdf', cls: 'muted' },
      { text: '' },
    ];
  }
  const sections = /** @type {Record<string,TermLine[]>} */ (CONFIG.sections);
  return sections[sectionKey];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdUname(args) {
  if (!args.length) return [{ text: 'Linux', cls: 'output' }, { text: '' }];
  if (args.indexOf('-a') !== -1) {
    return [
      { text: 'Linux plasma 6.8.0-alaska #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux', cls: 'output' },
      { text: '' },
      { text: 'Kernel   6.8.0-human',   cls: 'muted' },
      { text: 'Distro   Arch Linux',     cls: 'muted' },
      { text: 'Desktop  KDE Plasma 6.8', cls: 'muted' },
      { text: 'Shell    bash 5.2.37',    cls: 'muted' },
      { text: 'Uptime   23 years',       cls: 'success' },
      { text: 'Status   Live',           cls: 'success' },
      { text: '' },
    ];
  }
  if (args.indexOf('-r') !== -1) return [{ text: '6.8.0-alaska', cls: 'output' }, { text: '' }];
  if (args.indexOf('-m') !== -1) return [{ text: 'x86_64',       cls: 'output' }, { text: '' }];
  if (args.indexOf('-n') !== -1) return [{ text: 'plasma',       cls: 'output' }, { text: '' }];
  if (args.indexOf('-s') !== -1) return [{ text: 'Linux',        cls: 'output' }, { text: '' }];
  return [
    { text: 'uname: opci\u00f3n no reconocida \u2014 prob\u00e1 con uname -a', cls: 'error' },
    { text: '' },
  ];
}

/** @returns {TermLine[]} */
function cmdPwd() {
  return [{ text: '/home/alaska', cls: 'output' }, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdDate() {
  const now    = new Date();
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  /** @param {number} n @returns {string} */
  const pad    = n => n < 10 ? '0' + n : '' + n;
  const str    =
    days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' +
    pad(now.getDate()) + ' ' +
    pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
    ' ART ' + now.getFullYear();
  return [{ text: str, cls: 'output' }, { text: '' }];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdEcho(args) {
  if (!args.length) return [{ text: '', cls: 'output' }, { text: '' }];
  /** @type {Record<string,string>} */
  const env = {
    '$USER':   'alaska',
    '$HOME':   '/home/alaska',
    '$SHELL':  '/bin/bash',
    '$LANG':   'es_AR.UTF-8',
    '$TERM':   'konsole',
    '$EDITOR': 'nvim',
    '$PAGER':  'less',
    '$PATH':   '/usr/local/bin:/usr/bin:/bin:/home/alaska/.local/bin',
  };
  let expanded = args.join(' ');
  Object.keys(env).forEach(v => {
    const re = new RegExp('\\$\\{?' + v.slice(1) + '\\}?', 'gi');
    expanded = expanded.replace(re, env[v]);
  });
  return [{ text: expanded, cls: 'output' }, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdNeofetch() {
  return [
    { text: '                   -`                    guest@Alaska', cls: 'success' },
    { text: '                  .o+`                   -------------', cls: 'success' },
    { text: '                 `ooo/                   OS: Arch Linux x86_64', cls: 'output' },
    { text: '                `+oooo:                  Host: ASUSTeK COMPUTER INC. E1504FA', cls: 'output' },
    { text: '               `+oooooo:                 Kernel: 6.19.10-1-cachyos', cls: 'output' },
    { text: '               -+oooooo+:                Uptime: 23 years,1 day, 5 hours, 43 mins', cls: 'output' },
    { text: '             `/:-:++oooo+:               Packages: 1151 (pacman), 14 (flatpak)', cls: 'output' },
    { text: '            `/++++/+++++++:              Shell: zsh 5.9', cls: 'output' },
    { text: '           `/++++++++++++++:             Resolution: 1920x1080', cls: 'output' },
    { text: '          `/+++ooooooooooooo/`           DE: Plasma 6.6.4 (Wayland)', cls: 'output' },
    { text: '         ./ooosssso++osssssso+`          WM: kwin_wayland_wr', cls: 'output' },
    { text: '        .oossssso-````/ossssss+`         Theme: Breeze-Dark [GTK2], Breeze [GTK3]', cls: 'output' },
    { text: '       -osssssso.      :ssssssso.        Icons: Tela-nord-dark [GTK2/3]', cls: 'output' },
    { text: '      :osssssss/        osssso+++.       Terminal: kitty', cls: 'output' },
    { text: '     /ossssssss/        +ssssooo/-       Terminal Font: FiraCode Nerd Font 12.0', cls: 'output' },
    { text: '   `/ossssso+/:-        -:/+osssso+-     CPU: AMD Ryzen 3 7320U with Radeon Graphics (8) @ 4.151GHz', cls: 'output' },
    { text: '  `+sso+:-`              `.-/+oso:       GPU: AMD ATI Radeon 610M', cls: 'output' },
    { text: ' `++:.                         `-/+/     Memory: 5508MiB / 7204MiB', cls: 'output' },
    { text: ' .`                              `/' },
    { text: '' },
    { text: '  ███ ███ ███ ███ ███ ███ ███ ███', cls: 'success' },
    { text: '' },
  ];
}

/** @returns {TermLine[]} */
  function cmdLauti() {
    return [
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⠶⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⠉⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡾⠉⠀⢻⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⠏⡠⡀⠹⣶⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⠟⠀⠄⡀⠈⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡿⠆⡇⠰⠀⠈⠻⠦⠶⠶⠶⠶⠾⠶⠞⠋⠀⡌⠀⡇⠀⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡾⠃⠀⠂⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⠁⠀⢻⣅⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⣠⣀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣂⠀⠀⠀⠀⠀⠀⡿⣝⣺⣯⡏⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣏⡀⠀⠀⠀⠀⠀⠘⠫⣷⠟⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣶⠄⠀⠀⠀⠀⠀⣯⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡆⣀⡀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡧⠀⠀⠀⠀⠀⠀⠀⢠⣶⡄⠀⠀⠀⠀⠀⠀⠘⠛⠀⠀⠀⠀⠀⠀⣿⡀⠀⠀⠀⠠⠼⡦⠄⠀⠀⠋⢿⠉⠀', cls: 'lauti' },
      { text: '⠀⣨⣧⠄⠀⠀⠀⠀⠀⠘⣿⠀⠀⠀⠀⠀⠀⠀⠈⠛⠀⠀⠀⠀⠀⠀⠀⠀⠠⠐⠀⠂⠠⠀⢠⠟⠁⠀⠀⠀⠀⠀⠃⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠘⠂⠀⠀⠀⠀⠀⠀⠹⣧⣄⠀⠀⡒⠉⠉⠈⡃⠀⢰⣆⢠⣶⣄⣼⠀⠐⠠⠀⠒⢁⣴⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⢠⣄⣿⡆⠀⠀⠀⠀⠀⠘⢿⣇⠀⠈⠀⠂⠐⠁⠀⠀⠛⠛⠁⠈⠀⠀⣀⣤⡴⣷⡛⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠘⢞⣷⠃⠀⠀⠀⠀⠀⠀⠀⠙⢿⡷⠴⢴⡤⢦⠤⡤⠤⠤⠶⠶⠚⠛⠉⠀⠀⢨⣿⣦⣀⢀⣠⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⡀⡀⠀⠀⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠴⢖⡶⡿⡈⡹⡑⢢⠌⣪⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⢻⡉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⡿⠀⠀⠀⠀⠀⠀⠀⠀⠐⢼⣦⣷⠱⢌⡒⡌⡝⣜⠣⣑⠅⠎⠇⣳⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⣾⠛⠻⢷⣤⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠘⢷⣄⠀⠀⠉⣿⡐⠢⡔⡘⡡⢇⡡⢅⢡⡙⣬⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⢹⣆⡀⠀⢻⣧⠀⠀⠀⠀⢿⡄⠀⠀⠀⠀⠀⠀⠙⠻⣶⣤⡿⠙⢧⣆⠵⡁⠦⠇⡪⢠⣜⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠙⢿⣦⠀⠹⢾⣀⡀⠀⢹⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠳⡾⣅⡎⢆⣇⡞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠹⣷⠀⠀⠉⠛⠛⢾⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠛⠻⠞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠛⢲⣶⣶⣤⣼⡗⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⢸⡧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⣿⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⡴⢾⣿⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠄⠀⠀⠀⣤⠶⠓⠋⠉⠁⠀⢈⣿⠀⠀⢼⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⡆⠀⠀⠸⣿⠁⠀⠀⠀⠀⠀⠨⢿⣀⣀⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣄⣀⣰⠟⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀', cls: 'lauti' },
      { text: 'Te quiero musho <3' },
    ];
  }

/** @param {string[]} args @returns {TermLine[]} */
function cmdSudo(args) {
  if (!args.length) return [{ text: 'uso: sudo <comando>', cls: 'error' }, { text: '' }];
  return [
    { text: 'alaska is not in the sudoers file. This incident will be reported.', cls: 'error' },
    { text: '' },
  ];
}

/** @returns {TermLine[]} */
function cmdHistory() {
  if (!state.history.length) return [{ text: '(no hay historial)', cls: 'muted' }, { text: '' }];
  return [
    ...state.history.slice().reverse().map(
      /** @param {string} entry @param {number} i @returns {TermLine} */
      (entry, i) => ({ text: '  ' + String(i + 1).padStart(4, ' ') + '  ' + entry, cls: 'output' })
    ),
    { text: '' },
  ];
}

/** @param {string} cmd @returns {TermLine[]} */
function cmdFileOps(cmd) {
  return [
    { text: cmd + ': Permission denied. Read-only file system.', cls: 'error' },
    { text: '' },
  ];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdGrep(args) {
  if (args.length < 2) {
    return [
      { text: 'grep: uso: grep <t\u00e9rmino> <archivo>', cls: 'error' },
      { text: 'Ejemplo: grep f\u00edsica about.txt', cls: 'muted' },
      { text: '' },
    ];
  }
  const term       = args[0].toLowerCase();
  const filename   = args[1].toLowerCase();
  const files      = /** @type {Record<string,string>} */ (CONFIG.files);
  const sectionKey = files[filename];

  if (!sectionKey || sectionKey === '__cv__') {
    return [{ text: 'grep: ' + filename + ': No such file or directory', cls: 'error' }, { text: '' }];
  }

  const sections = /** @type {Record<string,TermLine[]>} */ (CONFIG.sections);
  const matches  = sections[sectionKey].filter(l => l.text?.toLowerCase().includes(term));
  if (!matches.length) return [{ text: '', cls: 'muted' }];
  return [...matches.map(l => ({ text: l.text, cls: /** @type {string} */ ('success') })), { text: '' }];
}

/**
 * @param {string}   cmd
 * @param {string[]} args
 * @returns {TermLine[]}
 */
function cmdTailHead(cmd, args) {
  if (!args.length) {
    return [{ text: cmd + ': uso: ' + cmd + ' <archivo>', cls: 'error' }, { text: '' }];
  }
  const filename   = args[0].toLowerCase();
  const files      = /** @type {Record<string,string>} */ (CONFIG.files);
  const sectionKey = files[filename];

  if (!sectionKey || sectionKey === '__cv__') {
    return [{ text: cmd + ': ' + filename + ': No such file or directory', cls: 'error' }, { text: '' }];
  }

  const sections = /** @type {Record<string,TermLine[]>} */ (CONFIG.sections);
  const all      = sections[sectionKey].filter(l => l.text !== undefined);
  const slice    = cmd === 'tail' ? all.slice(-5) : all.slice(0, 5);
  return [...slice, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdTop() {
  const timeStr = new Date().toTimeString().slice(0, 8);
  return [
    { text: 'top - ' + timeStr + '  up 23 years,  1 user,  load average: 0.01, 0.05, 0.00', cls: 'muted' },
    { text: 'Tasks:  42 total,   1 running,  41 sleeping,   0 stopped,   0 zombie',           cls: 'muted' },
    { text: '%Cpu(s):  2.1 us,  0.8 sy,  0.0 ni, 96.9 id,  0.2 wa,  0.0 hi,  0.0 si',       cls: 'muted' },
    { text: 'MiB Mem:  15934.4 total,  8241.2 free,  4821.6 used,  2871.6 buff/cache',       cls: 'muted' },
    { text: 'MiB Swp:   2048.0 total,  2048.0 free,     0.0 used.  9842.1 avail Mem',        cls: 'muted' },
    { text: '' },
    { text: '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',    cls: 'header' },
    { text: ' 1337 alaska    20   0  512004  42316  18224 R   2.1   0.3   0:01.33 nvim',       cls: 'output' },
    { text: ' 1984 alaska    20   0  261240  31808  12440 S   0.7   0.2   0:00.87 python3',    cls: 'output' },
    { text: ' 2048 alaska    20   0  128860  21604   9112 S   0.3   0.1   0:00.44 node',       cls: 'output' },
    { text: ' 3141 alaska    20   0   67328  15112   7332 S   0.1   0.1   0:00.21 bash',       cls: 'output' },
    { text: '' },
    { text: "Presion\u00e1 'q' para salir. (es output est\u00e1tico, igual no funcionar\u00eda)", cls: 'muted' },
    { text: '' },
  ];
}

/** @param {string} cmd @returns {TermLine[]} */
function cmdEditor(cmd) {
  const name = cmd === 'vim' ? 'Vim' : 'Nano';
  return [
    { text: "Did you really think I'd build " + name + " in JS? Use 'cat'.", cls: 'muted' },
    { text: '' },
  ];
}

/* ─────────────────────────────────────────────────────────────
 * PING — async, cancelable vía pingTimers
 * ───────────────────────────────────────────────────────────── */
/** @param {string} host */
function startPing(host) {
  const out = getOutput();
  const inp = getInput();
  if (!out) return;

  const outputEl = /** @type {HTMLElement} */ (out);
  state.animating = true;
  if (inp) inp.disabled = true;

  const times = Array.from({ length: 4 }, () => Math.floor(Math.random() * 15) + 5);
  const ip    = '93.184.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);

  /** @param {string} text @param {string=} cls */
  function addLine(text, cls) {
    const el = makeLine(text, cls);
    el.style.opacity = '0';
    outputEl.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.15s ease';
      el.style.opacity    = '1';
    });
    scrollBottom();
  }

  addLine('PING ' + host + ' (' + ip + '): 56 data bytes', 'muted');

  times.forEach((ms, i) => {
    const t = setTimeout(() => {
      addLine('64 bytes from ' + ip + ': icmp_seq=' + i + ' ttl=54 time=' + ms + '.0 ms');
    }, (i + 1) * 900);
    pingTimers.push(t);
  });

  const doneId = setTimeout(() => {
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    addLine('');
    addLine('--- ' + host + ' ping statistics ---', 'muted');
    addLine(times.length + ' packets transmitted, ' + times.length + ' received, 0.0% packet loss', 'success');
    addLine('round-trip min/avg/max = ' + min + '.0/' + avg + '.0/' + max + '.0 ms', 'muted');
    addLine('');
    pingTimers = [];
    state.animating = false;
    if (inp) inp.disabled = false;
    createPromptLine();
  }, (times.length + 1) * 900 + 200);

  pingTimers.push(doneId);
}

/* ─────────────────────────────────────────────────────────────
 * ROUTER COMMANDS
 * ───────────────────────────────────────────────────────────── */
/**
 * @param {string}   cmd
 * @param {string[]} args
 * @returns {boolean}
 */
function handleRouterCommand(cmd, args) {
  if (cmd === 'back') {
    history.back();
    printLines([{ text: 'Going back\u2026', cls: 'success' }, { text: '' }], createPromptLine);
    return true;
  }

  if (cmd === 'home') {
    if (!window.router) {
      printLines([{ text: 'router: not available', cls: 'error' }, { text: '' }], createPromptLine);
      return true;
    }
    window.router.navigate('/');
    printLines([{ text: 'Navigating to /\u2026', cls: 'success' }, { text: '' }], createPromptLine);
    return true;
  }

  if (cmd !== 'cd' && cmd !== 'go' && cmd !== 'open') return false;

  if (!window.router) {
    printLines([{ text: 'router: not available', cls: 'error' }, { text: '' }], createPromptLine);
    return true;
  }

  if (!args.length || args[0] === '') {
    printLines([
      { text: cmd + ': missing route argument', cls: 'error' },
      { text: 'Uso: ' + cmd + ' <ruta>    (ej: ' + cmd + ' experience)', cls: 'muted' },
      { text: '' },
    ], createPromptLine);
    return true;
  }

  const raw        = args[0].replace(/^\/+/, '');
  const path       = (raw === '' || raw === 'home' || raw === '~') ? '/' : '/' + raw;
  const normalized = window.router.normalizeRoute(path);

  if (normalized !== path && path !== '/') {
    printLines([
      { text: cmd + ': no such route: ' + path, cls: 'error' },
      { text: 'Rutas disponibles: ' + Object.keys(window.router.routes).join('  '), cls: 'muted' },
      { text: '' },
    ], createPromptLine);
    return true;
  }

  window.router.navigate(normalized);
  printLines([{ text: 'Navigating to ' + normalized + '\u2026', cls: 'success' }, { text: '' }], createPromptLine);
  return true;
}

/* ─────────────────────────────────────────────────────────────
 * AUTOCOMPLETE
 * ───────────────────────────────────────────────────────────── */
const ALL_CMDS = [
  'whoami', 'ls', 'cat', 'uname', 'pwd', 'date',
  'echo', 'neofetch', 'xdg-open', 'clear', 'help',
  'sudo', 'history', 'rm', 'mkdir', 'touch', 'mv',
  'grep', 'tail', 'head', 'ping', 'top', 'htop',
  'vim', 'nano', 'cd', 'go', 'open', 'home', 'back',
];

/** @param {HTMLInputElement} inp */
function autocomplete(inp) {
  const raw   = inp.value;
  const lower = raw.toLowerCase();
  if (!lower.trim()) return;

  if (/^(cd|go|open)\s+\S*$/.test(lower)) {
    const spaceIdx    = raw.indexOf(' ');
    const cmdPart     = raw.slice(0, spaceIdx);
    const partial     = raw.slice(spaceIdx + 1);
    const partialClean = partial.replace(/^\/+/, '').toLowerCase();
    const routes       = window.router ? Object.keys(window.router.routes) : [];
    const unique       = [...new Set(routes)];
    const rMatches     = unique.filter(r => {
      const rClean = r.replace(/^\//, '');
      return partialClean === '' ? true : r.startsWith('/' + partialClean) || rClean.startsWith(partialClean);
    });
    if (!rMatches.length) return;
    if (rMatches.length === 1) { inp.value = cmdPart + ' ' + rMatches[0]; updatePromptLine(inp.value); return; }
    const savedRaw = raw;
    finalizePromptLine();
    inp.value = '';
    printLines([{ text: rMatches.join('    '), cls: 'muted' }, { text: '' }], () => {
      createPromptLine();
      inp.value = savedRaw;
      updatePromptLine(savedRaw);
    });
    return;
  }

  if (/^cat\s+\S*$/.test(lower)) {
    const partial2 = raw.slice(raw.indexOf(' ') + 1).toLowerCase();
    const fMatches = Object.keys(CONFIG.files).filter(f => f.startsWith(partial2));
    if (fMatches.length === 1) { inp.value = 'cat ' + fMatches[0]; updatePromptLine(inp.value); }
    else if (fMatches.length > 1) {
      const saved = inp.value;
      finalizePromptLine();
      inp.value = '';
      printLines([{ text: fMatches.join('    '), cls: 'muted' }, { text: '' }], () => {
        createPromptLine();
        inp.value = saved;
        updatePromptLine(saved);
      });
    }
    return;
  }

  const cMatches = ALL_CMDS.filter(c => c.startsWith(lower.trim()));
  if (cMatches.length === 1) { inp.value = cMatches[0]; updatePromptLine(inp.value); }
  else if (cMatches.length > 1) {
    const savedRaw2 = inp.value;
    finalizePromptLine();
    inp.value = '';
    printLines([{ text: cMatches.join('    '), cls: 'muted' }, { text: '' }], () => {
      createPromptLine();
      inp.value = savedRaw2;
      updatePromptLine(savedRaw2);
    });
  }
}

/* ─────────────────────────────────────────────────────────────
 * COMMAND EXECUTION
 * ───────────────────────────────────────────────────────────── */
/** @param {string} raw */
function execute(raw) {
  const trimmed = raw.trim();
  finalizePromptLine();

  if (!trimmed) { createPromptLine(); return; }

  const parts = parseCommandArgs(trimmed);
  const cmd   = parts[0] ? parts[0].toLowerCase() : '';
  const args  = parts.slice(1);

  if (state.history.length === 0 || state.history[0] !== trimmed) {
    state.history.unshift(trimmed);
  }
  state.historyIdx = -1;
  state.draft      = '';

  try {
    localStorage.setItem('terminal_history', JSON.stringify(state.history.slice(0, 50)));
  } catch { /* quota / incognito */ }

  if (cmd === 'clear') {
    const out = getOutput();
    if (out) out.innerHTML = '';
    createPromptLine();
    return;
  }

  if (cmd === 'ping') {
    if (!args.length || !args[0]) {
      printLines([{ text: 'ping: uso: ping <host>', cls: 'error' }, { text: '' }], createPromptLine);
      return;
    }
    startPing(args[0]);
    return;
  }

  if (cmd === 'xdg-open') {
    if (!args.length || args[0].toLowerCase() !== 'cv.pdf') {
      printLines([{ text: 'xdg-open: archivo no encontrado', cls: 'error' }, { text: 'Uso: xdg-open cv.pdf', cls: 'muted' }, { text: '' }], createPromptLine);
      return;
    }
    printLines([{ text: 'Abriendo cv.pdf\u2026', cls: 'success' }, { text: '' }], () => {
      window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
      createPromptLine();
    });
    return;
  }

  if (cmd === 'cv') {
    printLines([{ text: 'Sugerencia: us\u00e1 xdg-open cv.pdf', cls: 'muted' }, { text: 'Abriendo CV\u2026', cls: 'success' }, { text: '' }], () => {
      window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
      createPromptLine();
    });
    return;
  }

  /** @type {TermLine[] | undefined} */
  let lines;
  switch (cmd) {
    case 'help':     lines = cmdHelp();              break;
    case 'whoami':   lines = cmdWhoami(args);         break;
    case 'ls':       lines = cmdLs(args);             break;
    case 'cat':      lines = cmdCat(args);            break;
    case 'uname':    lines = cmdUname(args);          break;
    case 'pwd':      lines = cmdPwd();                break;
    case 'date':     lines = cmdDate();               break;
    case 'echo':     lines = cmdEcho(args);           break;
    case 'neofetch': lines = cmdNeofetch();           break;
    case 'lauti':
    case 'lautaro':  lines = cmdLauti();              break;
    case 'sudo':     lines = cmdSudo(args);           break;
    case 'history':  lines = cmdHistory();            break;
    case 'rm':
    case 'mkdir':
    case 'touch':
    case 'mv':       lines = cmdFileOps(cmd);         break;
    case 'grep':     lines = cmdGrep(args);           break;
    case 'tail':
    case 'head':     lines = cmdTailHead(cmd, args);  break;
    case 'top':
    case 'htop':     lines = cmdTop();                break;
    case 'vim':
    case 'nano':     lines = cmdEditor(cmd);          break;
  }

  if (lines) { printLines(lines, createPromptLine); return; }
  if (handleRouterCommand(cmd, args)) return;

  printLines([
    { text: cmd + ': command not found', cls: 'error' },
    { text: "Escrib\u00ed 'help' para ver los comandos disponibles.", cls: 'muted' },
    { text: '' },
  ], createPromptLine);
}

/* ─────────────────────────────────────────────────────────────
 * KEYBOARD HANDLING
 * ───────────────────────────────────────────────────────────── */
/** @param {KeyboardEvent} e */
function onKeyDown(e) {
  const inp = /** @type {HTMLInputElement} */ (e.currentTarget);

  if (e.ctrlKey) {
    const k = e.key.toLowerCase();

    if (k === 'l') {
      e.preventDefault();
      const savedInput = inp.value;
      inp.value = '';
      currentPromptLine = null;
      const out = getOutput();
      if (out) out.innerHTML = '';
      createPromptLine();
      if (savedInput) { inp.value = savedInput; updatePromptLine(savedInput); }
      return;
    }

    if (k === 'u') { e.preventDefault(); inp.value = ''; updatePromptLine(''); return; }

    if (k === 'c') {
      e.preventDefault();
      inp.value = '';
      updatePromptLine('');
      finalizePromptLine();
      const out = getOutput();
      if (out) { out.appendChild(makeLine('^C', 'muted')); scrollBottom(); }
      createPromptLine();
      return;
    }
  }

  switch (e.key) {
    case 'Enter':
      e.preventDefault();
      if (state.animating) return;
      { const val = inp.value; inp.value = ''; execute(val); }
      break;

    case 'Tab':
      e.preventDefault();
      if (state.animating) return;
      autocomplete(inp);
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (state.animating) return;
      if (state.historyIdx === -1) state.draft = inp.value;
      if (state.historyIdx < state.history.length - 1) {
        state.historyIdx++;
        inp.value = state.history[state.historyIdx];
        updatePromptLine(inp.value);
        setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length), 0);
      }
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (state.animating) return;
      if (state.historyIdx > 0) { state.historyIdx--; inp.value = state.history[state.historyIdx]; }
      else if (state.historyIdx === 0) { state.historyIdx = -1; inp.value = state.draft; }
      updatePromptLine(inp.value);
      break;
  }
}

/* ─────────────────────────────────────────────────────────────
 * WINDOW STATE
 * ───────────────────────────────────────────────────────────── */
/** @param {HTMLElement} win @param {string|null} newState */
function setState(win, newState) {
  win.classList.remove('is-fullscreen');
  if (newState) {
    win.classList.add(newState);
  } else {
    win.style.transform = (pos.x !== 0 || pos.y !== 0) ? `translate(${pos.x}px, ${pos.y}px)` : '';
  }
}

/** @param {HTMLElement} win @param {HTMLElement} restoreBtn */
function closeTerminal(win, restoreBtn) {
  win.style.transform = '';
  win.classList.add('is-closed');
  restoreBtn.classList.add('visible');
}

/** @param {HTMLElement} win @param {HTMLElement} restoreBtn */
function restoreTerminal(win, restoreBtn) {
  win.classList.remove('is-closed');
  restoreBtn.classList.remove('visible');
  bringToFront(win);
  if (pos.x !== 0 || pos.y !== 0) {
    requestAnimationFrame(() => { win.style.transform = `translate(${pos.x}px, ${pos.y}px)`; });
  }
}

/* ─────────────────────────────────────────────────────────────
 * INITIALIZATION
 * ───────────────────────────────────────────────────────────── */
function init() {
  const inp = getInput();
  const win = /** @type {HTMLElement|null} */ (getWindow());

  if (!inp || !win) return;
  if (win.dataset['windowInit']) return;
  win.dataset['windowInit'] = 'true';

  const safeInp = /** @type {HTMLInputElement} */ (inp);
  const safeWin = /** @type {HTMLElement}      */ (win);

  pos.x = 0; pos.y = 0;
  bringToFront(safeWin);

  /* ── Boot sequence ──────────────────────────────────────────
   * Las tres etapas (boot, login, motd) están encadenadas con
   * printLines → setTimeout → innerHTML = ''. Antes de cada
   * limpieza del DOM se anula currentPromptLine explícitamente
   * para evitar que finalizePromptLine opere sobre nodos detached.
   * ─────────────────────────────────────────────────────────── */
  function bootSequence() {
    const out = getOutput();
    if (!out) { createPromptLine(); return; }
    const outputEl = /** @type {HTMLElement} */ (out);

    const bootLines = [
      { text: '[    0.000000] Linux version 6.8.0-alaska (gcc 13.2.0) #1 SMP PREEMPT_DYNAMIC', cls: 'muted' },
      { text: '[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-linux root=/dev/sda1 quiet', cls: 'muted' },
      { text: '[    0.183441] PCI: Using configuration type 1 for base access', cls: 'muted' },
      { text: '' },
      { text: '\u001b[0;32m[  OK  ]\u001b[0m Started systemd-journald.service.', cls: 'success' },
      { text: '\u001b[0;32m[  OK  ]\u001b[0m Started NetworkManager.service.', cls: 'success' },
      { text: '\u001b[0;32m[  OK  ]\u001b[0m Reached target multi-user.target.', cls: 'success' },
      { text: '' },
      { text: 'Arch Linux 6.8.0-alaska (tty1)', cls: 'output' },
      { text: '' },
    ];

    const loginLines = [
      { text: 'Connecting to plasma.local (192.168.1.42)...', cls: 'output' },
      { text: 'Connection established.', cls: 'success' },
      { text: '' },
      { text: 'plasma.local login: alaska', cls: 'output' },
      { text: 'Password: \u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', cls: 'muted' },
      { text: '' },
      { text: 'Authentication successful.', cls: 'success' },
      { text: '' },
    ];

    const now      = new Date();
    const days     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    /** @param {number} n @returns {string} */
    const pad      = n => n < 10 ? '0' + n : '' + n;
    const lastLogin =
      days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' +
      pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' +
      pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + ' ' + now.getFullYear();

    const motdLines = [
      { text: 'Welcome to Arch Linux on plasma!', cls: 'header' },
      { text: '' },
      { text: '  OS:       Arch Linux x86_64', cls: 'output' },
      { text: '  Kernel:   6.8.0-alaska', cls: 'output' },
      { text: '  Uptime:   23 years, 0 days', cls: 'output' },
      { text: '' },
      { text: 'Last login: ' + lastLogin + ' from 192.168.1.1', cls: 'muted' },
      { text: '' },
    ];

    printLines(bootLines, () => {
      setTimeout(() => {
        currentPromptLine = null;
        outputEl.innerHTML = '';
        printLines(loginLines, () => {
          setTimeout(() => {
            currentPromptLine = null; // mismo guard antes del segundo clear
            outputEl.innerHTML = '';
            printLines(motdLines, createPromptLine);
          }, 600);
        });
      }, 400);
    });
  }

  bootSequence();

  safeInp.addEventListener('input',   () => updatePromptLine(safeInp.value));
  safeInp.addEventListener('keydown', onKeyDown);
  safeWin.addEventListener('mousedown', () => bringToFront(safeWin));
  safeWin.addEventListener('click', e => {
    const t = /** @type {Element} */ (e.target);
    if (t.closest('.kwm-btn')) return;
    if (!state.animating) safeInp.focus();
  });

  // ── Restore button ─────────────────────────────────────────
  let rawRestore = document.getElementById('terminal-restore');
  if (!rawRestore) {
    rawRestore = document.createElement('button');
    rawRestore.id        = 'terminal-restore';
    rawRestore.className = 'terminal-restore-btn';
    rawRestore.setAttribute('aria-label', 'Abrir terminal');
    rawRestore.textContent = '>_';
    document.body.appendChild(rawRestore);
  }
  const rb = /** @type {HTMLElement} */ (rawRestore);
  rb.classList.remove('visible');

  if (!rb.dataset['listenerBound']) {
    rb.dataset['listenerBound'] = 'true';
    rb.addEventListener('click', () => {
      const w = /** @type {HTMLElement|null} */ (document.querySelector('.konsole-window'));
      if (!w) return;
      restoreTerminal(w, rb);
      getInput()?.focus();
    });
  }

  // ── Fullscreen button ──────────────────────────────────────
  const controls = safeWin.querySelector('.kwm-controls');
  if (controls && !controls.querySelector('#kwm-fullscreen')) {
    const btnFs = document.createElement('button');
    btnFs.id        = 'kwm-fullscreen';
    btnFs.type      = 'button';
    btnFs.className = 'kwm-btn kwm-btn--fullscreen';
    btnFs.title     = 'Pantalla completa';
    btnFs.setAttribute('aria-label',   'Pantalla completa');
    btnFs.setAttribute('aria-pressed', 'false');
    btnFs.textContent = '⛶';
    controls.appendChild(btnFs);
  }

  // ── Drag — con limpieza registrada en _mountCtx ────────────
  const titlebar = /** @type {HTMLElement|null} */ (safeWin.querySelector('.konsole-titlebar'));
  if (titlebar) {
    titlebar.addEventListener('mousedown', /** @param {MouseEvent} e */ e => {
      const target = /** @type {Element} */ (e.target);
      if (target.closest('.kwm-btn')) return;
      if (safeWin.classList.contains('is-fullscreen')) return;

      bringToFront(safeWin);
      safeWin.classList.add('is-dragging');

      const startX = e.clientX - pos.x;
      const startY = e.clientY - pos.y;
      titlebar.style.cursor          = 'grabbing';
      document.body.style.userSelect = 'none';

      /** @param {MouseEvent} mv */
      function onMouseMove(mv) {
        const ww = safeWin.offsetWidth || 400;
        pos.x = Math.max(-(ww - 60), Math.min(window.innerWidth  - 60, mv.clientX - startX));
        pos.y = Math.max(0,           Math.min(window.innerHeight - 30, mv.clientY - startY));
        safeWin.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }

      // Extrae la lógica de limpieza para que tanto el mouseup normal
      // como unmountTerminal() la puedan invocar de forma idéntica.
      function dragCleanup() {
        if (titlebar) titlebar.style.cursor = '';
        document.body.style.userSelect = '';
        safeWin.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        // Deregistrar del contexto: el drag completó normalmente.
        if (_mountCtx) _mountCtx.activeDragCleanup = null;
      }

      function onMouseUp() { dragCleanup(); bringToFront(safeWin); }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
      if (_mountCtx) _mountCtx.activeDragCleanup = dragCleanup;
    });
  }

  // ── Control buttons ────────────────────────────────────────
  const btnClose      = document.getElementById('kwm-close');
  const btnMinimize   = document.getElementById('kwm-minimize');
  const btnMaximize   = document.getElementById('kwm-maximize');
  const btnFullscreen = /** @type {HTMLElement|null} */ (safeWin.querySelector('#kwm-fullscreen'));

  btnClose?.addEventListener('click',    () => closeTerminal(safeWin, rb));
  btnMinimize?.addEventListener('click', () => closeTerminal(safeWin, rb));

  btnMaximize?.addEventListener('click', () => {
    if (safeWin.classList.contains('is-fullscreen')) {
      setState(safeWin, null);
      btnMaximize.setAttribute('aria-pressed', 'false');
      bringToFront(safeWin);
    } else {
      setState(safeWin, 'is-fullscreen');
      btnMaximize.setAttribute('aria-pressed', 'true');
      scrollBottom();
    }
  });

  btnFullscreen?.addEventListener('click', () => {
    if (safeWin.classList.contains('is-fullscreen')) {
      setState(safeWin, null);
      btnFullscreen.setAttribute('aria-pressed', 'false');
      bringToFront(safeWin);
    } else {
      setState(safeWin, 'is-fullscreen');
      btnFullscreen.setAttribute('aria-pressed', 'true');
      scrollBottom();
    }
  });

  if (!document.body.dataset['terminalRestoreBound']) {
    document.body.dataset['terminalRestoreBound'] = 'true';
    document.addEventListener('keydown', e => {
      if (e.key !== '`') return;
      const w   = /** @type {HTMLElement|null} */ (document.querySelector('.konsole-window'));
      const rbk = /** @type {HTMLElement|null} */ (document.getElementById('terminal-restore'));
      if (!w || !rbk || !w.classList.contains('is-closed')) return;
      restoreTerminal(w, rbk);
      getInput()?.focus();
    });
  }

  if (!document.body.dataset['terminalCtrlBound']) {
    document.body.dataset['terminalCtrlBound'] = 'true';
    document.addEventListener('keydown', e => {
      if (!e.ctrlKey || (e.key !== 'c' && e.key !== 'C')) return;
      if (!pingTimers.length) return;
      e.preventDefault();
      pingTimers.forEach(t => clearTimeout(t));
      pingTimers = [];
      state.animating = false;
      const i = getInput();
      if (i) i.disabled = false;
      const o = getOutput();
      if (o) { o.appendChild(makeLine('^C', 'muted')); scrollBottom(); }
      createPromptLine();
    });
  }
}

/* ─────────────────────────────────────────────────────────────
 * SPA-AWARE MOUNT (MutationObserver)
 * ───────────────────────────────────────────────────────────── */
function tryMount() {
  const el = document.getElementById('about-terminal');
  if (el && !el.dataset['termInit']) {
    el.dataset['termInit'] = '1';
    init();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  tryMount();
  const app = document.getElementById('app') ?? document.body;
  new MutationObserver(tryMount).observe(app, { childList: true, subtree: true });
});
/**
 * terminal.js — Terminal interactivo KDE Konsole edition
 * v2: comandos estilo bash (whoami, ls, cat, uname, date, echo, neofetch…)
 *     + prompt vivo renderizado dentro de .terminal-output.
 *
 * IIFE autocontenido, sin dependencias externas.
 * Compatible con el router SPA (MutationObserver sobre #app).
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * WALKING CAT
   * ───────────────────────────────────────────────────────────── */
  const CAT_RIGHT = 'ᓚ\u208D ^. .^\u208E';
  const CAT_LEFT  = '\u208D^. .^ \u208Eᓘ';
  const CAT_W     = 10;

  function termCols() {
    var out = document.getElementById('terminal-output');
    if (!out) return 36;
    return Math.max(CAT_W + 2, Math.floor(out.offsetWidth / 8.8));
  }

  var catPos      = 0;
  var catDir      = 1;
  var catInterval = null;

  /* ─────────────────────────────────────────────────────────────
   * CONFIGURATION
   * ───────────────────────────────────────────────────────────── */
  const CONFIG = {
    promptHtml:
      '<span class="tp-user">alaska</span>'  +
      '<span class="tp-at">@</span>'          +
      '<span class="tp-host">plasma</span>'   +
      '<span class="tp-sep">:</span>'         +
      '<span class="tp-path">~</span>'        +
      '<span class="tp-dollar">$</span>',

    cvUrl: 'assets/alaskaGonzalez_cv.pdf',

    welcome: [
      { text: CAT_RIGHT, cls: 'success', id: 'ascii-cat' },
      { text: '' },
      { text: 'Terminal interactivo', cls: 'header' },
      { text: '' },
      { text: "  Escrib\u00ed 'help' para ver los comandos.", cls: 'muted' },
      { text: '' },
    ],

    /* Filesystem virtual — filename → section key (o token especial) */
    files: {
      'about.txt':   'about',
      'studies.txt': 'studies',
      'coffee.txt':  'coffee',
      'public.txt':  'public',
      'life.txt':    'life',
      'cv.pdf':      '__cv__',
    },

    /* Contenido de cada archivo */
    sections: {
      about: [
        { text: 'about.txt', cls: 'header' },
        { text: '' },
        { text: 'Soy Alaska Elaina Gonz\u00e1lez, 23 a\u00f1os, Mar del Plata.',  cls: 'output' },
        { text: 'Estudio F\u00edsica en la UNMDP. T\u00e9cnica en soporte IT,',   cls: 'output' },
        { text: 'barista, y con experiencia en gesti\u00f3n administrativa',      cls: 'output' },
        { text: 'y atenci\u00f3n al cliente en entornos de alta demanda.',        cls: 'output' },
        { text: '' },
        { text: 'Me mueve la curiosidad. Me cuesta la superficie.',              cls: 'success' },
        { text: '' },
      ],
      studies: [
        { text: 'studies.txt', cls: 'header' },
        { text: '' },
        { text: '[2025 - presente]  Licenciatura en F\u00edsica \u2014 UNMDP',        cls: 'success' },
        { text: '  Rigor, precisi\u00f3n y un ambiente donde equivocarse',            cls: 'output' },
        { text: '  de forma exacta ya es avanzar. Era lo que buscaba.',              cls: 'output' },
        { text: '' },
        { text: '[2024 - 2025]  Medicina \u2014 Ciclo B\u00e1sico \u2014 UNMDP',     cls: 'muted'  },
        { text: '  Empec\u00e9 por la biolog\u00eda; lo dej\u00e9 por el enfoque.',  cls: 'output' },
        { text: '  Aprend\u00ed igual.',                                              cls: 'output' },
        { text: '' },
        { text: '[2022 - 2024]  Tecnicatura en Desarrollo \u2014 UNICEN',             cls: 'muted'  },
        { text: '  JS \u00b7 TS \u00b7 PHP \u00b7 Python \u00b7 estructuras.',       cls: 'output' },
        { text: '  Bases s\u00f3lidas en programaci\u00f3n y sistemas.',               cls: 'output' },
        { text: '' },
        { text: '[2015 - 2021]  Bachiller Ciencias Naturales \u2014 E.S. N\u00b02',  cls: 'muted'  },
        { text: '' },
      ],
      coffee: [
        { text: 'coffee.txt', cls: 'header' },
        { text: '' },
        { text: 'El caf\u00e9 me atrae por su complejidad medible:',                  cls: 'output' },
        { text: '' },
        { text: '  molienda \u2192 proporci\u00f3n \u2192 temperatura \u2192 tiempo', cls: 'success' },
        { text: '' },
        { text: 'Cada variable tiene un efecto real en la taza.',                    cls: 'output' },
        { text: 'Pod\u00e9s equivocarte, identificar qu\u00e9 fall\u00f3, corregirlo.', cls: 'output' },
        { text: 'Es el mismo loop que la f\u00edsica.',                               cls: 'output' },
        { text: '' },
        { text: 'Todav\u00eda soy torpe con el latte art,',                           cls: 'muted'  },
        { text: 'pero es de las pocas cosas en que disfruto el error.',               cls: 'muted'  },
        { text: '' },
      ],
      public: [
        { text: 'public.txt', cls: 'header' },
        { text: '' },
        { text: 'Trabajar de cara al p\u00fablico ense\u00f1a sin manual:',          cls: 'output' },
        { text: '' },
        { text: '  \u2192 Leer una mesa en dos segundos.',                           cls: 'output' },
        { text: '  \u2192 Mantener la calma cuando todo se apila.',                  cls: 'output' },
        { text: '  \u2192 Resolver en el momento, sin tiempo para dudar.',           cls: 'output' },
        { text: '  \u2192 Aprender de las personas, sobre todo las mayores.',        cls: 'output' },
        { text: '' },
        { text: 'Me adapto r\u00e1pido. C\u00f3moda abriendo sola o en rotaci\u00f3n.', cls: 'output' },
        { text: 'La gente me resulta interesante. Creo que eso se nota.',            cls: 'success' },
        { text: '' },
      ],
      life: [
        { text: 'life.txt', cls: 'header' },
        { text: '' },
        { text: '23 a\u00f1os. Lista de intereses que no para de crecer.',           cls: 'output' },
        { text: 'Curiosa por naturaleza \u2014 me cuesta la superficie.',             cls: 'output' },
        { text: '' },
        { text: '  f\u00edsica \u00b7 programaci\u00f3n \u00b7 caf\u00e9 \u00b7 dise\u00f1o \u00b7 personas', cls: 'success' },
        { text: '' },
        { text: 'Estoy en pareja, construyendo algo estable:',                       cls: 'output' },
        { text: 'tiempo para estudiar, trabajo que valga la pena,',                  cls: 'output' },
        { text: 'y seguir aprendiendo sin apuro.',                                   cls: 'output' },
        { text: '' },
      ],
    },
  };

  /* ─────────────────────────────────────────────────────────────
   * STATE
   * ───────────────────────────────────────────────────────────── */
  const state = {
    history:    [],
    historyIdx: -1,
    draft:      '',
    animating:  false,
  };

  /** La línea de prompt activa que se actualiza mientras el usuario escribe. */
  var currentPromptLine = null;

  /* ─────────────────────────────────────────────────────────────
   * DOM HELPERS
   * ───────────────────────────────────────────────────────────── */
  const getOutput = () => document.getElementById('terminal-output');
  const getInput  = () => document.getElementById('terminal-input');
  const getWindow = () => document.getElementById('about-terminal');

  function makeLine(text, cls, id) {
    var el = document.createElement('div');
    el.className = 'tl' + (cls ? ' tl--' + cls : ' tl--output');
    if (id) el.id = id;
    el.textContent = text === '' ? '\u00a0' : text;
    return el;
  }

  function scrollBottom() {
    var out = getOutput();
    if (out) out.scrollTop = out.scrollHeight;
  }

  /* ─────────────────────────────────────────────────────────────
   * LIVE PROMPT LINE
   *
   * createPromptLine()   — inserta prompt activo con cursor parpadeante.
   * updatePromptLine()   — sincroniza el texto visible con inp.value.
   * finalizePromptLine() — congela la línea (quita cursor y clase activa).
   * ───────────────────────────────────────────────────────────── */
  function createPromptLine() {
    var out = getOutput();
    var inp = getInput();
    if (!out) return;

    var el = document.createElement('div');
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

  function updatePromptLine(val) {
    if (!currentPromptLine) return;
    var cmdText = currentPromptLine.querySelector('.cmd-text');
    if (cmdText) cmdText.textContent = val;
    scrollBottom();
  }

  function finalizePromptLine() {
    if (!currentPromptLine) return;
    var cursor = currentPromptLine.querySelector('.terminal-cursor');
    if (cursor) cursor.remove();
    currentPromptLine.classList.remove('active-prompt');
    currentPromptLine = null;
  }

  /* ─────────────────────────────────────────────────────────────
   * LINE ANIMATION
   * ───────────────────────────────────────────────────────────── */
  const LINE_DELAY_MS = 36;

  function printLines(lines, onDone) {
    var out = getOutput();
    var inp = getInput();

    state.animating = true;
    if (inp) inp.disabled = true;

    var i = 0;
    function next() {
      if (i >= lines.length) {
        state.animating = false;
        if (inp) inp.disabled = false;
        if (typeof onDone === 'function') onDone();
        return;
      }
      var line = lines[i++];
      var text = line.text !== undefined ? line.text : '';
      var el   = makeLine(text, line.cls || 'output', line.id);

      el.style.opacity   = '0';
      el.style.transform = 'translateY(5px)';
      out.appendChild(el);

      requestAnimationFrame(function () {
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
   * COMMAND HANDLERS
   * Cada handler recibe args[] y devuelve lines[].
   * ───────────────────────────────────────────────────────────── */
  function cmdHelp() {
    return [
      { text: 'Comandos disponibles:', cls: 'header' },
      { text: '' },
      { text: '  whoami              \u2014  Usuario actual',                        cls: 'output' },
      { text: '  whoami --full       \u2014  Nombre completo',                       cls: 'output' },
      { text: '  ls                  \u2014  Lista archivos',                        cls: 'output' },
      { text: '  ls -l               \u2014  Listado detallado',                     cls: 'output' },
      { text: '  ls -la              \u2014  Incluye archivos ocultos',              cls: 'output' },
      { text: '  cat <archivo>       \u2014  Muestra contenido de un archivo',       cls: 'output' },
      { text: '  uname -a            \u2014  Info del sistema',                      cls: 'output' },
      { text: '  pwd                 \u2014  Directorio actual',                     cls: 'output' },
      { text: '  date                \u2014  Fecha y hora',                          cls: 'output' },
      { text: '  echo <texto|$VAR>   \u2014  Imprime texto o variables de entorno',  cls: 'output' },
      { text: '  neofetch            \u2014  Info del sistema al estilo neofetch',   cls: 'output' },
      { text: '  xdg-open cv.pdf     \u2014  Abre el CV en nueva pesta\u00f1a',      cls: 'output' },
      { text: '  clear               \u2014  Limpia el terminal',                    cls: 'output' },
      { text: '  help                \u2014  Muestra este mensaje',                  cls: 'output' },
      { text: '' },
      { text: 'Tip: Tab para autocompletar \u00b7 \u2191\u2193 para navegar historial.', cls: 'muted' },
      { text: '' },
    ];
  }

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

  function cmdLs(args) {
    var hasL = args.some(function (a) { return /^-[la]{1,2}$/.test(a); });
    var hasA = args.some(function (a) { return /^-[la]*a[la]*$/.test(a) || a === '-A' || a === '-lA'; });

    if (hasL) {
      var lines = [{ text: 'total 48', cls: 'muted' }];
      if (hasA) {
        lines.push({ text: 'drwxr-x--- 2 alaska alaska 4096 Jan 26 2026 ./',      cls: 'muted' });
        lines.push({ text: 'drwxr-xr-x 4 root   root   4096 Jan 26 2026 ../',     cls: 'muted' });
        lines.push({ text: '-rw-r--r-- 1 alaska alaska   42 Jan 26 2026 .bashrc', cls: 'muted' });
        lines.push({ text: '-rw-r--r-- 1 alaska alaska   24 Jan 26 2026 .profile',cls: 'muted' });
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

    var files = ['about.txt', 'coffee.txt', 'life.txt', 'public.txt', 'studies.txt', 'cv.pdf'];
    if (hasA) files = ['.bashrc', '.profile'].concat(files);
    return [{ text: files.join('    '), cls: 'output' }, { text: '' }];
  }

  function cmdCat(args) {
    if (!args.length || args[0] === '') {
      return [
        { text: 'cat: falta un nombre de archivo', cls: 'error' },
        { text: 'Uso: cat <archivo>    (ej: cat about.txt)', cls: 'muted' },
        { text: '' },
      ];
    }
    var filename = args[0].toLowerCase();
    var section  = CONFIG.files[filename];

    if (!section) {
      return [
        { text: 'cat: ' + filename + ': No such file or directory', cls: 'error' },
        { text: "Escrib\u00ed 'ls' para ver los archivos disponibles.", cls: 'muted' },
        { text: '' },
      ];
    }
    if (section === '__cv__') {
      return [
        { text: 'cat: cv.pdf: es un archivo binario, no texto.', cls: 'error' },
        { text: 'Prob\u00e1 con:  xdg-open cv.pdf', cls: 'muted' },
        { text: '' },
      ];
    }
    return CONFIG.sections[section];
  }

  function cmdUname(args) {
    if (!args.length) return [{ text: 'Linux', cls: 'output' }, { text: '' }];
    if (args.indexOf('-a') !== -1) {
      return [
        { text: 'Linux plasma 6.8.0-alaska #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux', cls: 'output' },
        { text: '' },
        { text: 'Kernel   6.8.0-human',  cls: 'muted' },
        { text: 'Distro   Arch Linux',     cls: 'muted' },
        { text: 'Desktop  KDE Plasma 6.8', cls: 'muted' },
        { text: 'Shell    bash 5.2.37',    cls: 'muted' },
        { text: 'Uptime   23 years',       cls: 'success' },
        { text: 'Status   Live',       cls: 'success' },
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

  function cmdPwd() {
    return [{ text: '/home/alaska', cls: 'output' }, { text: '' }];
  }

  function cmdDate() {
    var now    = new Date();
    var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var pad    = function (n) { return n < 10 ? '0' + n : '' + n; };
    var str    =
      days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' +
      pad(now.getDate()) + ' ' +
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
      ' ART ' + now.getFullYear();
    return [{ text: str, cls: 'output' }, { text: '' }];
  }

  function cmdEcho(args) {
    if (!args.length) return [{ text: '', cls: 'output' }, { text: '' }];
    var env = {
      '$USER':   'alaska',
      '$HOME':   '/home/alaska',
      '$SHELL':  '/bin/bash',
      '$LANG':   'es_AR.UTF-8',
      '$TERM':   'konsole',
      '$EDITOR': 'nvim',
      '$PAGER':  'less',
      '$PATH':   '/usr/local/bin:/usr/bin:/bin:/home/alaska/.local/bin',
    };
    var expanded = args.join(' ');
    Object.keys(env).forEach(function (v) {
      var re = new RegExp('\\$\\{?' + v.slice(1) + '\\}?', 'gi');
      expanded = expanded.replace(re, env[v]);
    });
    return [{ text: expanded, cls: 'output' }, { text: '' }];
  }

  function cmdNeofetch() {
    return [
      { text: ' ⠀⠀⠀⠀⠀⠀⢀⡴⢾⣶⣴⠚⣫⠏⠉⠉⠛⠛⢭⡓⢶⣶⠶⣦⡀⠀⠀⠀⠀⠀    alaska@plasma',               cls: 'success' },
      { text: ' ⠀⠀⠀⠀⠀⣰⠋⡀⣠⠟⢁⣾⠇⠀⣀⣷⠀⠀⠓⣝⠂⠙⣆⢄⢻⡞⢢⠀⠀    \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', cls: 'success' },
      { text: ' ⠀⠀⠀⠀⢠⡇⢸⢡⠃⢠⡞⠁⠀⣰⡟⠉⢦⣄⠀⠈⢆⠀⢻⣾⡄⢧⢸⠀⠀⠀    OS:     Arch Linux x86_64',   cls: 'output'  },
      { text: ' ⠀⠀⠀⠀⢸⠀⡇⡌⠀⡞⠀⢀⣴⡋⠀⠀⠀⣙⣷⡀⠘⡄⠘⣿⣧⢸⣼⣥⠀⠀    Kernel: 6.8.0-human',       cls: 'output'  },
      { text: ' ⣀⣀⣀⣀⣞⣰⠁⡇⠀⣧⠴⠛⠛⠁⠀⠀⠀⠉⠉⠙⠦⡇⠀⣿⣸⣼⣿⣇⣀⣀   DE:     KDE Plasma 6.8',      cls: 'output'  },
      { text: ' ⠳⢽⣷⠺⡟⡿⣯⡇⠰⣧⠠⣿⡷⠂⠀⠀⠀⠐⣾⠷⠀⡀⠀⣿⡟⣴⠶⢁⡨⠊   Shell:  bash 5.2.37',         cls: 'output'  },
      { text: ' ⠀⠀⠉⢳⢦⣅⠘⣿⣄⢿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡇⢀⣏⣳⣿⣴⡞⠈⠀    Editor: nvim',               cls: 'output'  },
      { text: ' ⠀⠀⠀⣼⢸⡅⢹⣿⣿⣾⣟⠀⠀⢠⣀⣄⣠⠀⠀⢠⣾⣿⡿⣿⢻⠁⢹⣷⡀⠀ ' },
      { text: ' ⠀⠀⠸⡏⠸⡇⢼⣿⡿⠟⠛⠓⣦⣄⣀⣀⣀⣀⡤⠴⠿⢿⡟⠛⠺⣦⣬⣗⠀⠀  Edad     23 a\u00f1os',                                        cls: 'muted' },
      { text: ' ⠀⠀⢰⡇⠀⡇⠸⡏⠀⠀⢰⠋⠙⠛⠛⠉⠉⢹⠀⠀⠀⠀⡇⠀⠀⣿⣿⣿⣿⡇   Ciudad   Mar del Plata, AR',                                   cls: 'muted' },
      { text: ' ⠀⡐⣾⠀⡀⢹⠀⣿⣄⠀⢸⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⢠⣇⠀⠀⣿⣿⣿⣿⣿    Estudio  F\u00edsica \u2014 UNMDP',                           cls: 'muted' },
      { text: ' ⣰⣿⣿⠀⡇⠘⡄⢸⣿⠆⠈⡇⠀⠀⠀⠀⠈⢉⠃⠀⣰⡾⠻⠃⢰⣿⣿⣿⣿⡇  Skills   IT \u00b7 Barismo \u00b7 Gesti\u00f3n',              cls: 'muted' },
      { text: ' ⣿⣿⣿⡆⢷⠀⢧⠈⣿⠤⠤⣇⠀⠀⠀⠀⢀⣸⣠⢾⠟⠓⡶⢤⣾⣿⣿⣿⣿⣷  Idiomas  Espa\u00f1ol (nativo) \u00b7 Ingl\u00e9s (B2)',      cls: 'muted' },
      { text: '' },
      { text: '  \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588\u2588', cls: 'success' },
      { text: '' },
    ];
  }

  /* ─────────────────────────────────────────────────────────────
   * AUTOCOMPLETE (Tab)
   * Completa comandos; si el input empieza con "cat ", completa
   * nombres de archivo del filesystem virtual.
   * Usa el ciclo finalizePromptLine → printLines → createPromptLine
   * cuando hay múltiples coincidencias (igual que el v2 original).
   * ───────────────────────────────────────────────────────────── */
  var ALL_CMDS = [
    'whoami', 'ls', 'cat', 'uname', 'pwd', 'date',
    'echo', 'neofetch', 'xdg-open', 'clear', 'help',
  ];

  function autocomplete(inp) {
    var raw   = inp.value;
    var lower = raw.toLowerCase();
    if (!lower.trim()) return;

    /* "cat " + nombre parcial → completa archivos */
    if (/^cat\s+\S*$/.test(lower)) {
      var partial  = raw.slice(raw.indexOf(' ') + 1).toLowerCase();
      var fMatches = Object.keys(CONFIG.files).filter(function (f) {
        return f.startsWith(partial);
      });
      if (fMatches.length === 1) {
        inp.value = 'cat ' + fMatches[0];
        updatePromptLine(inp.value);
      } else if (fMatches.length > 1) {
        var saved = inp.value;
        finalizePromptLine();
        inp.value = '';
        printLines(
          [{ text: fMatches.join('    '), cls: 'muted' }, { text: '' }],
          function () {
            createPromptLine();
            inp.value = saved;
            updatePromptLine(saved);
          }
        );
      }
      return;
    }

    /* Completar nombre de comando */
    var cMatches = ALL_CMDS.filter(function (c) { return c.startsWith(lower.trim()); });
    if (cMatches.length === 1) {
      inp.value = cMatches[0];
      updatePromptLine(inp.value);
    } else if (cMatches.length > 1) {
      var savedRaw = inp.value;
      finalizePromptLine();
      inp.value = '';
      printLines(
        [{ text: cMatches.join('    '), cls: 'muted' }, { text: '' }],
        function () {
          createPromptLine();
          inp.value = savedRaw;
          updatePromptLine(savedRaw);
        }
      );
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * COMMAND EXECUTION
   * Parsea "cmd arg1 arg2 …", congela el prompt vivo, despacha.
   * ───────────────────────────────────────────────────────────── */
  function execute(raw) {
    var trimmed = raw.trim();

    /* La línea activa ya muestra el comando escrito → solo congela. */
    finalizePromptLine();

    if (!trimmed) {
      createPromptLine();
      return;
    }

    var parts = trimmed.split(/\s+/);
    var cmd   = parts[0].toLowerCase();
    var args  = parts.slice(1);

    if (state.history[0] !== trimmed) state.history.unshift(trimmed);
    state.historyIdx = -1;
    state.draft      = '';

    /* ── Comandos con efectos secundarios ── */
    if (cmd === 'clear') {
      getOutput().innerHTML = '';
      createPromptLine();
      return;
    }

    if (cmd === 'xdg-open') {
      if (!args.length || args[0].toLowerCase() !== 'cv.pdf') {
        printLines([
          { text: 'xdg-open: archivo no encontrado', cls: 'error' },
          { text: 'Uso: xdg-open cv.pdf', cls: 'muted' },
          { text: '' },
        ], createPromptLine);
        return;
      }
      printLines(
        [{ text: 'Abriendo cv.pdf\u2026', cls: 'success' }, { text: '' }],
        function () {
          window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
          createPromptLine();
        }
      );
      return;
    }

    /* Legacy alias */
    if (cmd === 'cv') {
      printLines(
        [
          { text: 'Sugerencia: us\u00e1 xdg-open cv.pdf', cls: 'muted' },
          { text: 'Abriendo CV\u2026', cls: 'success' },
          { text: '' },
        ],
        function () {
          window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
          createPromptLine();
        }
      );
      return;
    }

    /* ── Despachador principal ── */
    var lines;
    switch (cmd) {
      case 'help':     lines = cmdHelp();          break;
      case 'whoami':   lines = cmdWhoami(args);    break;
      case 'ls':       lines = cmdLs(args);        break;
      case 'cat':      lines = cmdCat(args);       break;
      case 'uname':    lines = cmdUname(args);     break;
      case 'pwd':      lines = cmdPwd();           break;
      case 'date':     lines = cmdDate();          break;
      case 'echo':     lines = cmdEcho(args);      break;
      case 'neofetch': lines = cmdNeofetch();      break;
      default:
        lines = [
          { text: cmd + ': command not found', cls: 'error' },
          { text: "Escrib\u00ed 'help' para ver los comandos disponibles.", cls: 'muted' },
          { text: '' },
        ];
    }
    printLines(lines, createPromptLine);
  }

  /* ─────────────────────────────────────────────────────────────
   * KEYBOARD HANDLING
   * ───────────────────────────────────────────────────────────── */
  function onKeyDown(e) {
    var inp = e.currentTarget;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (state.animating) return;
        var val = inp.value;
        inp.value = '';
        execute(val);
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
          setTimeout(function () {
            inp.setSelectionRange(inp.value.length, inp.value.length);
          }, 0);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (state.animating) return;
        if (state.historyIdx > 0) {
          state.historyIdx--;
          inp.value = state.history[state.historyIdx];
        } else if (state.historyIdx === 0) {
          state.historyIdx = -1;
          inp.value = state.draft;
        }
        updatePromptLine(inp.value);
        break;
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * WINDOW BUTTONS
   * ───────────────────────────────────────────────────────────── */
  function handleMinimize(btn) {
    var win = getWindow();
    if (!win) return;
    var isMin = win.classList.toggle('is-minimized');
    btn.setAttribute('aria-pressed', String(isMin));
    if (!isMin) {
      var inp = getInput();
      if (inp && !state.animating) inp.focus();
    }
  }

  function handleMaximize(btn) {
    var win = getWindow();
    if (!win) return;
    var isMax = win.classList.toggle('is-maximized');
    btn.setAttribute('aria-pressed', String(isMax));
    if (isMax) scrollBottom();
  }

  /* ─────────────────────────────────────────────────────────────
   * WALKING CAT ANIMATION
   * ───────────────────────────────────────────────────────────── */
  function startCatAnimation() {
    if (catInterval) clearInterval(catInterval);
    catPos = 0;
    catDir = 1;

    catInterval = setInterval(function () {
      var el = document.getElementById('ascii-cat');
      if (!el) { clearInterval(catInterval); catInterval = null; return; }

      var maxPos = Math.max(0, termCols() - CAT_W);
      var cat    = catDir === 1 ? CAT_RIGHT : CAT_LEFT;
      el.textContent = ' '.repeat(catPos) + cat;
      catPos += catDir;
      if (catPos >= maxPos) { catPos = maxPos; catDir = -1; }
      else if (catPos <= 0) { catPos = 0;      catDir =  1; }
    }, 90);
  }

  /* ─────────────────────────────────────────────────────────────
   * INITIALIZATION
   * ───────────────────────────────────────────────────────────── */
  function init() {
    var inp = getInput();
    var win = getWindow();
    if (!inp || !win) return;

    /* Bienvenida → animación del gato → primer prompt vivo. */
    printLines(CONFIG.welcome, function () {
      startCatAnimation();
      createPromptLine();
    });

    /* Sincroniza escritura con la línea activa en el output. */
    inp.addEventListener('input', function () {
      updatePromptLine(inp.value);
    });

    inp.addEventListener('keydown', onKeyDown);

    /* Clic en la ventana → foco al input (capturador invisible). */
    win.addEventListener('click', function (e) {
      if (e.target.closest('.kwm-btn')) return;
      if (!state.animating) inp.focus();
    });

    var btnMinimize = document.getElementById('kwm-minimize');
    var btnMaximize = document.getElementById('kwm-maximize');
    if (btnMinimize) btnMinimize.addEventListener('click', function () { handleMinimize(btnMinimize); });
    if (btnMaximize) btnMaximize.addEventListener('click', function () { handleMaximize(btnMaximize); });
  }

  /* ─────────────────────────────────────────────────────────────
   * SPA-AWARE BOOT (MutationObserver)
   * ───────────────────────────────────────────────────────────── */
  function tryMount() {
    var el = document.getElementById('about-terminal');
    if (el && !el.dataset.termInit) {
      el.dataset.termInit = '1';
      init();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    tryMount();
    var app = document.getElementById('app') || document.body;
    new MutationObserver(tryMount).observe(app, { childList: true, subtree: true });
  });

}());
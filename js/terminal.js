/**
 * terminal.js — Interactive terminal emulator, Bash/Konsole style
 *
 * Boot behaviour: renders a single live prompt on mount, immediately focused.
 * No welcome message, no ASCII art, no intro animation, no artificial delay.
 *
 * IIFE — zero global pollution.
 * SPA-aware via MutationObserver on #app.
 */
(function () {
  'use strict';

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

    /* Filesystem virtual — filename → section key (or special token) */
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
   * STATE
   * ───────────────────────────────────────────────────────────── */
  const state = {
    history:    [],
    historyIdx: -1,
    draft:      '',
    animating:  false,
  };

  /** The active prompt line updated as the user types. */
  var currentPromptLine = null;

  /* ─────────────────────────────────────────────────────────────
   * DOM HELPERS
   * ───────────────────────────────────────────────────────────── */
  const getOutput = () => document.getElementById('terminal-output');
  const getInput  = () => document.getElementById('terminal-input');
  const getWindow = () => document.getElementById('about-terminal');

  function makeLine(text, cls) {
    var el = document.createElement('div');
    el.className = 'tl' + (cls ? ' tl--' + cls : ' tl--output');
    el.textContent = text === '' ? '\u00a0' : text;
    return el;
  }

  function scrollBottom() {
    var out = getOutput();
    if (out) out.scrollTop = out.scrollHeight;
  }

  /* ─────────────────────────────────────────────────────────────
   * LIVE PROMPT LINE
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
   * LINE ANIMATION (used by command output only)
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
      var el   = makeLine(text, line.cls || 'output');

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
        { text: 'Distro   Arch Linux',    cls: 'muted' },
        { text: 'Desktop  KDE Plasma 6.8', cls: 'muted' },
        { text: 'Shell    bash 5.2.37',   cls: 'muted' },
        { text: 'Uptime   23 years',      cls: 'success' },
        { text: 'Status   Live',          cls: 'success' },
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
      { text: ' ⠀⠀⠀⠀⠀⠀⢀⡴⢾⣶⣴⠚⣫⠏⠉⠉⠛⠛⢭⡓⢶⣶⠶⣦⡀⠀⠀⠀⠀⠀   alaska@plasma',               cls: 'success' },
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
   * ───────────────────────────────────────────────────────────── */
  var ALL_CMDS = [
    'whoami', 'ls', 'cat', 'uname', 'pwd', 'date',
    'echo', 'neofetch', 'xdg-open', 'clear', 'help',
  ];

  function autocomplete(inp) {
    var raw   = inp.value;
    var lower = raw.toLowerCase();
    if (!lower.trim()) return;

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
   * ───────────────────────────────────────────────────────────── */
  function execute(raw) {
    var trimmed = raw.trim();

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

    var lines;
    switch (cmd) {
      case 'help':     lines = cmdHelp();       break;
      case 'whoami':   lines = cmdWhoami(args);  break;
      case 'ls':       lines = cmdLs(args);      break;
      case 'cat':      lines = cmdCat(args);     break;
      case 'uname':    lines = cmdUname(args);   break;
      case 'pwd':      lines = cmdPwd();         break;
      case 'date':     lines = cmdDate();        break;
      case 'echo':     lines = cmdEcho(args);    break;
      case 'neofetch': lines = cmdNeofetch();    break;
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
   * INITIALIZATION
   * Renders a single live prompt — nothing else.
   * ───────────────────────────────────────────────────────────── */
  function init() {
    var inp = getInput();
    var win = getWindow();
    if (!inp || !win) return;

    createPromptLine();

    inp.addEventListener('input', function () {
      updatePromptLine(inp.value);
    });

    inp.addEventListener('keydown', onKeyDown);

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
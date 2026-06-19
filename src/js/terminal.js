// @ts-check
'use strict';

import { i18n } from './i18n.js';

/**
 * @typedef {{ text: string, cls?: string }} TermLine
 * @typedef {{ name: string, type: 'file' | 'dir', size: number, mtime: string, hidden?: boolean, section?: string, binary?: boolean, lines?: string[], route?: string }} FsEntry
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
  if (_mountCtx && getWindow()?.dataset['windowInit']) return;
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
  hideTabMenu();

  state.animating = false;
  const inp = getInput();
  if (inp) inp.disabled = false;
  returnInputToRow();

  const win = getWindow();
  if (win) {
    delete win.dataset['windowInit'];
    delete win.dataset['termInit'];
  }

  _boundListeners.forEach(({ el, event, fn }) => el.removeEventListener(event, /** @type {EventListenerOrEventListenerObject} */ (fn)));
  _boundListeners = [];

  _termObserver?.disconnect();
  _termObserver = null;

  document.getElementById('terminal-restore')?.remove();
  delete document.body.dataset['terminalRestoreBound'];
  delete document.body.dataset['terminalCtrlBound'];

  currentPromptLine = null;
}

/* ─────────────────────────────────────────────────────────────
 * CONFIGURATION
 * ───────────────────────────────────────────────────────────── */
const CONFIG = {
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

const HOME_DIR = '/home/alaska';

/** @type {Record<string, Record<string, TermLine[]>>} */
const SECTION_TRANSLATIONS = {
  es: CONFIG.sections,
  en: {
    about: [
      { text: 'about.txt', cls: 'header' },
      { text: '' },
      { text: 'I am Alaska Elaina González, born in 2002 in Mar del Plata.', cls: 'output' },
      { text: 'Agnostic leaning atheist, raised in a strict Jehovah’s Witness', cls: 'output' },
      { text: 'family. Yes... exactly that.', cls: 'output' },
      { text: '' },
      { text: 'I am trans (not especially proud, just factual), naturally', cls: 'output' },
      { text: 'curious, and fairly obsessed with understanding how the world', cls: 'output' },
      { text: 'works.', cls: 'output' },
      { text: '' },
      { text: 'I currently study Physics at UNMDP.', cls: 'output' },
      { text: 'I spent time in medicine, but got tired of the atmosphere:', cls: 'output' },
      { text: 'ideology dressed as academia, uncritical worship of French', cls: 'output' },
      { text: '“intellectuals”, and a strong allergy to real critical thinking', cls: 'output' },
      { text: '(yes, Freud included).', cls: 'output' },
      { text: '' },
      { text: 'I have self-driven IT training, experience as a barista, and', cls: 'output' },
      { text: 'administrative management experience.', cls: 'output' },
      { text: '' },
      { text: 'Ideologically, I sit close to minarchist libertarianism with a', cls: 'output' },
      { text: 'technocratic bias: pro-science, pro-nuclear, anti-hippie.', cls: 'output' },
      { text: '' },
    ],
    studies: [
      { text: 'studies.txt', cls: 'header' },
      { text: '' },
      { text: '[2025 - present]  Physics degree — UNMDP', cls: 'success' },
      { text: '  Rigor, precision, and a place where being wrong', cls: 'output' },
      { text: '  exactly still counts as progress.', cls: 'output' },
      { text: '  I am not a fan of mathematics, but I do like that it demands things.', cls: 'output' },
      { text: '' },
      { text: '[2024 - 2025]  Medicine — Basic cycle — UNMDP', cls: 'muted' },
      { text: '  I started because of biology; I left because of the dogma.', cls: 'output' },
      { text: '  A lot of narrative, little tolerance for questioning.', cls: 'output' },
      { text: '  Still, I learned what was worth learning.', cls: 'output' },
      { text: '' },
      { text: '[2022 - 2024]  Software Development technician track — UNICEN', cls: 'muted' },
      { text: '  JS · TS · PHP · Python · data structures.', cls: 'output' },
      { text: '  Solid foundations in programming and systems,', cls: 'output' },
      { text: '  even with pedagogy that could have been better.', cls: 'output' },
      { text: '' },
      { text: '[2015 - 2021]  Natural sciences high school — E.S. N°2', cls: 'muted' },
      { text: '  Where everything started, even if the system did not always help.', cls: 'output' },
      { text: '' },
    ],
    coffee: [
      { text: 'coffee.txt', cls: 'header' },
      { text: '' },
      { text: 'I never quite knew why I like coffee so much, or where I learned', cls: 'output' },
      { text: 'what I know, but for some reason it came naturally.', cls: 'output' },
      { text: '' },
      { text: 'Latte art does not count... That is still not my strong suit.', cls: 'muted' },
      { text: '' },
      { text: 'I do not have formal barista training (even if my CV says I do).', cls: 'output' },
      { text: 'Sometimes bending the truth a little is part of surviving.', cls: 'output' },
      { text: '' },
    ],
    public: [
      { text: 'public.txt', cls: 'header' },
      { text: '' },
      { text: 'I work in customer-facing jobs because, realistically,', cls: 'output' },
      { text: 'that is where 90% of non-technical jobs tend to land.', cls: 'output' },
      { text: 'It is not something that comes naturally to me, or something I enjoy.', cls: 'output' },
      { text: 'But I learned to do it well anyway.', cls: 'output' },
      { text: '' },
      { text: 'I started as commis, moved to waitress, then to barista.', cls: 'output' },
      { text: 'I learned fast because there was not much room not to.', cls: 'output' },
      { text: '' },
      { text: 'Now I am trying to move toward administrative work.', cls: 'output' },
      { text: 'Less wear, more free weekends.', cls: 'output' },
      { text: '' },
      { text: 'I still deal with people, even if I would rather not.', cls: 'success' },
      { text: '' },
    ],
    life: [
      { text: 'life.txt', cls: 'header' },
      { text: '' },
      { text: 'I like anime (my current top picks are Mushoku Tensei,', cls: 'output' },
      { text: 'Made in Abyss, Frieren, Violet Evergarden, JoJo’s, and', cls: 'output' },
      { text: 'probably something else I am forgetting).', cls: 'output' },
      { text: '' },
      { text: 'I am in a relationship with a guy named Lauti, whom for some', cls: 'output' },
      { text: 'reason I keep loving more.', cls: 'success' },
      { text: '' },
      { text: 'As of this push, I am still not in contact with my parents.', cls: 'output' },
      { text: 'My in-laws have effectively taken that place for now.', cls: 'output' },
      { text: '' },
      { text: 'I do not have many friends. Because of how I am, I tend to', cls: 'output' },
      { text: 'disconnect and lose bonds fairly quickly.', cls: 'output' },
      { text: 'Pretty solitary, though not necessarily by choice.', cls: 'output' },
      { text: '' },
      { text: 'I do not have ASD or ADHD, although free Ritalin would not hurt.', cls: 'muted' },
      { text: 'Maybe some depression and dysphoria, which luckily keep getting smaller.', cls: 'muted' },
      { text: '' },
      { text: 'I do not use social media much, even if I have accounts.', cls: 'output' },
      { text: 'Aside from Twitter, I do not spend time on them.', cls: 'output' },
      { text: '' },
    ],
  },
};

/** @type {Record<string, { help: TermLine[], messages: Record<string, string> }>} */
const TERMINAL_COPY = {
  es: {
    help: [
      { text: 'Comandos disponibles:', cls: 'header' },
      { text: '' },
      { text: '  whoami                    —  Usuario actual', cls: 'output' },
      { text: '  whoami --full             —  Nombre completo', cls: 'output' },
      { text: '  id / hostname             —  Identidad de sesión', cls: 'output' },
      { text: '  pwd                       —  Directorio actual', cls: 'output' },
      { text: '  cd <dir>                  —  Cambia de directorio', cls: 'output' },
      { text: '  ls [-laAh] [ruta]         —  Lista archivos', cls: 'output' },
      { text: '  cat <archivo>             —  Muestra contenido de un archivo', cls: 'output' },
      { text: '  grep <término> <archivo>  —  Busca texto en un archivo', cls: 'output' },
      { text: '  head/tail <archivo>       —  Primeras/últimas 5 líneas', cls: 'output' },
      { text: '  date / uname -a           —  Fecha e info del sistema', cls: 'output' },
      { text: '  echo <texto|$VAR>         —  Imprime texto o variables de entorno', cls: 'output' },
      { text: '  env                       —  Variables de entorno simuladas', cls: 'output' },
      { text: '  neofetch                  —  Info del sistema al estilo neofetch', cls: 'output' },
      { text: '  ping <host>               —  Simula ICMP hacia un host', cls: 'output' },
      { text: '  top / htop                —  Procesos en ejecución (estático)', cls: 'output' },
      { text: '  history                   —  Historial de comandos', cls: 'output' },
      { text: '  man <comando>             —  Ayuda breve del comando', cls: 'output' },
      { text: '  sudo <cmd>                —  Intentá ser root', cls: 'output' },
      { text: '  xdg-open cv.pdf           —  Abre el CV en nueva pestaña', cls: 'output' },
      { text: '  clear                     —  Limpia el terminal  (o Ctrl+L)', cls: 'output' },
      { text: '' },
      { text: 'Navegación del sitio:', cls: 'header' },
      { text: '' },
      { text: '  go <ruta>                 —  Navega a una ruta del portfolio', cls: 'output' },
      { text: '  open <ruta|cv.pdf>        —  Navega o abre el CV', cls: 'output' },
      { text: '  home / back               —  Inicio o página anterior', cls: 'output' },
      { text: '' },
      { text: 'Atajos de teclado:', cls: 'header' },
      { text: '' },
      { text: '  Ctrl+L              —  Limpia la pantalla y conserva la línea actual', cls: 'output' },
      { text: '  Ctrl+C              —  Cancela el comando / línea actual', cls: 'output' },
      { text: '  Ctrl+U              —  Borra la línea actual', cls: 'output' },
      { text: '  Tab                 —  Autocompleta comandos, rutas y archivos', cls: 'output' },
      { text: '  →                  —  Acepta la autosugerencia', cls: 'output' },
      { text: '  ↑ / ↓              —  Navega el historial', cls: 'output' },
      { text: '' },
      { text: 'Tip: probá `ls projects`, `cd projects`, `cat about.txt` o `go /proyectos/jobbot`.', cls: 'muted' },
      { text: '' },
    ],
    messages: {
      catMissing: 'cat: falta un nombre de archivo',
      catUsage: 'Uso: cat <archivo>    (ej: cat about.txt)',
      commandNotFoundHelp: "Escribí 'help' para ver los comandos disponibles.",
      cvHint: 'Sugerencia: usá xdg-open cv.pdf',
      grepExample: 'Ejemplo: grep física about.txt',
      grepUsage: 'grep: uso: grep <término> <archivo>',
      historyEmpty: '(no hay historial)',
      invalidFlag: '{{cmd}}: opción inválida -- {{flag}}',
      manMissing: 'Qué página de manual querés?',
      manMissingEntry: 'No hay entrada de manual para {{cmd}}',
      noSuchFile: '{{cmd}}: {{path}}: No such file or directory',
      noSuchDir: 'cd: {{path}}: No such file or directory',
      notDir: 'cd: {{path}}: Not a directory',
      openCv: 'Abriendo cv.pdf...',
      openMissing: 'open: falta una ruta o archivo',
      pingUsage: 'ping: uso: ping <host>',
      readOnly: '{{cmd}}: Permission denied. Read-only file system.',
      routerMissing: 'router: no disponible',
      routesAvailable: 'Rutas disponibles: {{routes}}',
      routeMissing: '{{cmd}}: falta una ruta',
      routeNoSuch: '{{cmd}}: no existe la ruta {{route}}',
      routeUsage: 'Uso: {{cmd}} <ruta>    (ej: {{cmd}} /proyectos/jobbot)',
      sudoUsage: 'uso: sudo <comando>',
      tailHeadUsage: '{{cmd}}: uso: {{cmd}} <archivo>',
      tryLs: "Escribí 'ls' para ver los archivos disponibles.",
      tryXdg: 'Probá con: xdg-open cv.pdf',
      xdgNotFound: 'xdg-open: archivo no encontrado',
      xdgUsage: 'Uso: xdg-open cv.pdf',
    },
  },
  en: {
    help: [
      { text: 'Available commands:', cls: 'header' },
      { text: '' },
      { text: '  whoami                    —  Current user', cls: 'output' },
      { text: '  whoami --full             —  Full name', cls: 'output' },
      { text: '  id / hostname             —  Session identity', cls: 'output' },
      { text: '  pwd                       —  Current directory', cls: 'output' },
      { text: '  cd <dir>                  —  Change directory', cls: 'output' },
      { text: '  ls [-laAh] [path]         —  List files', cls: 'output' },
      { text: '  cat <file>                —  Print a file', cls: 'output' },
      { text: '  grep <term> <file>        —  Search inside a file', cls: 'output' },
      { text: '  head/tail <file>          —  First/last 5 lines', cls: 'output' },
      { text: '  date / uname -a           —  Date and system info', cls: 'output' },
      { text: '  echo <text|$VAR>          —  Print text or environment variables', cls: 'output' },
      { text: '  env                       —  Simulated environment', cls: 'output' },
      { text: '  neofetch                  —  Neofetch-style system info', cls: 'output' },
      { text: '  ping <host>               —  Simulated ICMP packets', cls: 'output' },
      { text: '  top / htop                —  Running processes (static)', cls: 'output' },
      { text: '  history                   —  Command history', cls: 'output' },
      { text: '  man <command>             —  Short command help', cls: 'output' },
      { text: '  sudo <cmd>                —  Try to become root', cls: 'output' },
      { text: '  xdg-open cv.pdf           —  Open the CV in a new tab', cls: 'output' },
      { text: '  clear                     —  Clear the terminal  (or Ctrl+L)', cls: 'output' },
      { text: '' },
      { text: 'Site navigation:', cls: 'header' },
      { text: '' },
      { text: '  go <route>                —  Navigate to a portfolio route', cls: 'output' },
      { text: '  open <route|cv.pdf>       —  Navigate or open the CV', cls: 'output' },
      { text: '  home / back               —  Home or previous page', cls: 'output' },
      { text: '' },
      { text: 'Keyboard shortcuts:', cls: 'header' },
      { text: '' },
      { text: '  Ctrl+L              —  Clear the screen and keep the current line', cls: 'output' },
      { text: '  Ctrl+C              —  Cancel the command / current line', cls: 'output' },
      { text: '  Ctrl+U              —  Clear the current line', cls: 'output' },
      { text: '  Tab                 —  Complete commands, routes, and files', cls: 'output' },
      { text: '  →                  —  Accept the autosuggestion', cls: 'output' },
      { text: '  ↑ / ↓              —  Navigate history', cls: 'output' },
      { text: '' },
      { text: 'Tip: try `ls projects`, `cd projects`, `cat about.txt`, or `go /proyectos/jobbot`.', cls: 'muted' },
      { text: '' },
    ],
    messages: {
      catMissing: 'cat: missing file operand',
      catUsage: 'Usage: cat <file>    (example: cat about.txt)',
      commandNotFoundHelp: "Type 'help' to see the available commands.",
      cvHint: 'Hint: use xdg-open cv.pdf',
      grepExample: 'Example: grep physics about.txt',
      grepUsage: 'grep: usage: grep <term> <file>',
      historyEmpty: '(no history)',
      invalidFlag: '{{cmd}}: invalid option -- {{flag}}',
      manMissing: 'What manual page do you want?',
      manMissingEntry: 'No manual entry for {{cmd}}',
      noSuchFile: '{{cmd}}: {{path}}: No such file or directory',
      noSuchDir: 'cd: {{path}}: No such file or directory',
      notDir: 'cd: {{path}}: Not a directory',
      openCv: 'Opening cv.pdf...',
      openMissing: 'open: missing route or file operand',
      pingUsage: 'ping: usage: ping <host>',
      readOnly: '{{cmd}}: Permission denied. Read-only file system.',
      routerMissing: 'router: not available',
      routesAvailable: 'Available routes: {{routes}}',
      routeMissing: '{{cmd}}: missing route argument',
      routeNoSuch: '{{cmd}}: no such route: {{route}}',
      routeUsage: 'Usage: {{cmd}} <route>    (example: {{cmd}} /proyectos/jobbot)',
      sudoUsage: 'usage: sudo <command>',
      tailHeadUsage: '{{cmd}}: usage: {{cmd}} <file>',
      tryLs: "Type 'ls' to see available files.",
      tryXdg: 'Try: xdg-open cv.pdf',
      xdgNotFound: 'xdg-open: file not found',
      xdgUsage: 'Usage: xdg-open cv.pdf',
    },
  },
};

/** @type {Record<string, FsEntry[]>} */
const VFS = {
  [HOME_DIR]: [
    { name: '.zshrc', type: 'file', size: 312, mtime: 'Jun 18 18:42', hidden: true, lines: [
      '# ~/.zshrc',
      'export EDITOR=nvim',
      'export PAGER=less',
      'alias ll="ls -lah"',
      'PROMPT="%F{208}%n%f@%F{108}%m%f %F{139}%~%f ❯ "',
    ] },
    { name: '.profile', type: 'file', size: 126, mtime: 'Jun 18 18:42', hidden: true, lines: [
      '# ~/.profile',
      'export LANG=' + getLangEnv(),
      'export PATH="$HOME/.local/bin:$PATH"',
    ] },
    { name: 'about.txt', type: 'file', size: 512, mtime: 'Mar 19 2025', section: 'about' },
    { name: 'coffee.txt', type: 'file', size: 843, mtime: 'Jan 12 2025', section: 'coffee' },
    { name: 'life.txt', type: 'file', size: 621, mtime: 'Nov  3 2024', section: 'life' },
    { name: 'public.txt', type: 'file', size: 730, mtime: 'Oct 15 2024', section: 'public' },
    { name: 'studies.txt', type: 'file', size: 1024, mtime: 'Mar 19 2025', section: 'studies' },
    { name: 'cv.pdf', type: 'file', size: 98304, mtime: 'Jan 26 2026', binary: true },
    { name: 'projects', type: 'dir', size: 4096, mtime: 'Jun 18 2026' },
  ],
  [HOME_DIR + '/projects']: [
    { name: 'auditoria-contratacion', type: 'dir', size: 4096, mtime: 'Jun 15 2026', route: '/proyectos/auditoria-contratacion' },
    { name: 'invariant', type: 'dir', size: 4096, mtime: 'Jun 14 2026', route: '/proyectos/invariant' },
    { name: 'jobbot', type: 'dir', size: 4096, mtime: 'Jun 10 2026', route: '/proyectos/jobbot' },
    { name: 'README.md', type: 'file', size: 284, mtime: 'Jun 18 2026', lines: [
      '# projects',
      '',
      'jobbot/                  -> /proyectos/jobbot',
      'invariant/               -> /proyectos/invariant',
      'auditoria-contratacion/  -> /proyectos/auditoria-contratacion',
      '',
      'Use: go /proyectos/jobbot',
    ] },
  ],
  [HOME_DIR + '/projects/jobbot']: [
    { name: 'README.md', type: 'file', size: 214, mtime: 'Jun 10 2026', route: '/proyectos/jobbot', lines: [
      '# jobbot',
      '',
      'Terminal-oriented job automation project.',
      'Portfolio route: /proyectos/jobbot',
    ] },
  ],
  [HOME_DIR + '/projects/invariant']: [
    { name: 'README.md', type: 'file', size: 208, mtime: 'Jun 14 2026', route: '/proyectos/invariant', lines: [
      '# invariant',
      '',
      'Project page for formal reasoning / invariant work.',
      'Portfolio route: /proyectos/invariant',
    ] },
  ],
  [HOME_DIR + '/projects/auditoria-contratacion']: [
    { name: 'README.md', type: 'file', size: 244, mtime: 'Jun 15 2026', route: '/proyectos/auditoria-contratacion', lines: [
      '# auditoria-contratacion',
      '',
      'Security audit write-up for a hiring flow.',
      'Portfolio route: /proyectos/auditoria-contratacion',
    ] },
  ],
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
  cwd:        HOME_DIR,
  previousCwd: HOME_DIR,
};

/** @type {number[]} */
let pingTimers = [];

/** @type {HTMLElement|null} */
let currentPromptLine = null;

let pos = { x: 0, y: 0 };
let zIndexCounter = 100;

/** @type {Array<{ el: EventTarget, event: string, fn: Function }>} */
let _boundListeners = [];

/**
 * @param {EventTarget} el
 * @param {string} event
 * @param {Function} fn
 * @param {AddEventListenerOptions=} opts
 */
function trackListener(el, event, fn, opts) {
  _boundListeners.push({ el, event, fn });
  el.addEventListener(event, /** @type {EventListenerOrEventListenerObject} */ (fn), opts);
}

/* ─────────────────────────────────────────────────────────────
 * TERMINAL SESSION HELPERS
 * ───────────────────────────────────────────────────────────── */

/** @returns {'es' | 'en'} */
function terminalLocale() {
  return i18n.getLocale() === 'en' ? 'en' : 'es';
}

/**
 * @param {string} key
 * @param {Record<string, string|number>=} params
 * @returns {string}
 */
function msg(key, params) {
  const copy = TERMINAL_COPY[terminalLocale()] ?? TERMINAL_COPY.es;
  const fallback = TERMINAL_COPY.es.messages[key] ?? key;
  let text = copy.messages[key] ?? fallback;
  if (!params) return text;
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), String(v));
  });
  return text;
}

/** @returns {string} */
function getLangEnv() {
  return terminalLocale() === 'en' ? 'en_US.UTF-8' : 'es_AR.UTF-8';
}

/** @returns {Record<string, string>} */
function getEnv() {
  return {
    USER:            'alaska',
    LOGNAME:         'alaska',
    HOME:            HOME_DIR,
    SHELL:           '/usr/bin/zsh',
    LANG:            getLangEnv(),
    TERM:            'xterm-256color',
    COLORTERM:       'truecolor',
    EDITOR:          'nvim',
    PAGER:           'less',
    PATH:            HOME_DIR + '/.local/bin:/usr/local/bin:/usr/bin:/bin',
    PWD:             state.cwd,
    OLDPWD:          state.previousCwd,
    KONSOLE_VERSION: '240502',
  };
}

/** @param {string} value @returns {string} */
function formatCwd(value) {
  if (value === HOME_DIR) return '~';
  if (value.startsWith(HOME_DIR + '/')) return '~' + value.slice(HOME_DIR.length);
  return value;
}

/** @returns {string} */
function getPromptHtml() {
  return '<span class="tp-user">alaska</span>'  +
    '<span class="tp-at">@</span>'              +
    '<span class="tp-host">plasma</span>'       +
    '<span class="tp-space"> </span>'           +
    '<span class="tp-path">' + escapeHtml(formatCwd(state.cwd)) + '</span>' +
    '<span class="tp-space"> </span>'           +
    '<span class="tp-prompt">❯</span>';
}

function syncTerminalTitle() {
  const title = document.querySelector('.konsole-title');
  if (title) title.textContent = 'alaska@plasma: ' + formatCwd(state.cwd) + ' — zsh — Konsole';
}

/** @param {string} path @returns {string} */
function cleanPath(path) {
  if (!path) return '/';
  const parts = path.split('/');
  /** @type {string[]} */
  const out = [];
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

/**
 * @param {string=} input
 * @param {string=} base
 * @returns {string}
 */
function resolvePath(input = '.', base = state.cwd) {
  const raw = input.trim();
  if (!raw || raw === '~') return HOME_DIR;
  const expanded = raw.startsWith('~/') ? HOME_DIR + raw.slice(1) : raw;
  if (expanded.startsWith('/')) return cleanPath(expanded);
  return cleanPath(base + '/' + expanded);
}

/** @param {string} path @returns {FsEntry[]|null} */
function getDirEntries(path) {
  return VFS[cleanPath(path)] ?? null;
}

/**
 * @param {string} path
 * @returns {{ parent: string, entry: FsEntry } | null}
 */
function getEntry(path) {
  const normalized = cleanPath(path);
  if (normalized === HOME_DIR) {
    return { parent: cleanPath(HOME_DIR + '/..'), entry: { name: 'alaska', type: 'dir', size: 4096, mtime: 'Jun 18 2026' } };
  }
  const idx = normalized.lastIndexOf('/');
  const parent = idx <= 0 ? '/' : normalized.slice(0, idx);
  const name = normalized.slice(idx + 1);
  const entries = getDirEntries(parent);
  const entry = entries?.find(e => e.name === name) ?? null;
  return entry ? { parent, entry } : null;
}

/** @param {string} path @returns {boolean} */
function isDirectory(path) {
  return Boolean(getDirEntries(path));
}

/** @param {FsEntry} entry @returns {string} */
function entryMode(entry) {
  return entry.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
}

/** @param {number} bytes @returns {string} */
function humanSize(bytes) {
  if (bytes < 1024) return String(bytes);
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes % 1024 === 0 ? 0 : 1) + 'K';
  return (bytes / 1024 / 1024).toFixed(1) + 'M';
}

/**
 * @param {FsEntry} entry
 * @param {{ human: boolean }} opts
 * @returns {string}
 */
function formatLongEntry(entry, opts) {
  const size = opts.human ? humanSize(entry.size).padStart(5, ' ') : String(entry.size).padStart(6, ' ');
  return entryMode(entry) + ' 1 alaska alaska ' + size + ' ' + entry.mtime + ' ' + entry.name + (entry.type === 'dir' ? '/' : '');
}

/** @param {string} key @returns {TermLine[]} */
function getSectionLines(key) {
  const sections = SECTION_TRANSLATIONS[terminalLocale()] ?? CONFIG.sections;
  const fallbackSections = /** @type {Record<string, TermLine[]>} */ (CONFIG.sections);
  return (sections[key] ?? fallbackSections[key] ?? []).map(line => ({ ...line }));
}

/**
 * @param {FsEntry} entry
 * @returns {TermLine[]}
 */
function getFileLines(entry) {
  if (entry.section) return getSectionLines(entry.section);
  if (entry.name === '.profile') {
    return [
      { text: '# ~/.profile', cls: 'output' },
      { text: 'export LANG=' + getLangEnv(), cls: 'output' },
      { text: 'export PATH="$HOME/.local/bin:$PATH"', cls: 'output' },
      { text: '' },
    ];
  }
  return [...(entry.lines ?? []).map(text => ({ text, cls: /** @type {string} */ ('output') })), { text: '' }];
}

/** @returns {string[]} */
function getRouteList() {
  return window.router ? Object.keys(window.router.routes) : ['/', '/proyectos/jobbot', '/proyectos/invariant', '/proyectos/auditoria-contratacion'];
}

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

/** @returns {HTMLElement|null} */
const getInputRow = () => document.querySelector('.terminal-input-row');

/** Moves the #terminal-input back to its original row so it survives output clears. */
function returnInputToRow() {
  const inp = getInput();
  const row = getInputRow();
  if (inp && row && inp.parentElement !== row) row.appendChild(inp);
}

/**
 * Clears the terminal output, first rescuing the input if it lives inside
 * the output area so it is not destroyed.
 */
function safeClearOutput() {
  const out = getOutput();
  const inp = getInput();
  if (inp && out && out.contains(inp)) returnInputToRow();
  if (out) out.replaceChildren();
}

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
  const args = [];
  let current = '';
  /** @type {"'" | '"' | null} */
  let quote = null;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (escaped) {
      current += c;
      escaped = false;
      continue;
    }

    if (c === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }

    if ((c === '"' || c === "'") && (!quote || quote === c)) {
      quote = quote ? null : /** @type {"'" | '"'} */ (c);
      continue;
    }

    if (/\s/.test(c) && !quote) {
      if (current.length) { args.push(current); current = ''; }
      continue;
    }
    current += c;
  }
  if (escaped) current += '\\';
  if (current.length) args.push(current);
  return args.length ? args : [input];
}

/* ─────────────────────────────────────────────────────────────
 * SYNTAX HIGHLIGHTING & AUTOSUGGESTION
 * ───────────────────────────────────────────────────────────── */

/** @param {string} str @returns {string} */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** @param {string} input @returns {Array<{type:string,text:string}>} */
function lexInput(input) {
  /** @type {Array<{type:string,text:string}>} */
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < input.length) {
    const c = input[i];
    if (!inSingle && !inDouble) {
      if (c === ' ') {
        if (current) { tokens.push({ type: 'word', text: current }); current = ''; }
        tokens.push({ type: 'space', text: ' ' });
        i++;
        continue;
      }
      if (c === '"') { inDouble = true; if (current) { tokens.push({ type: 'word', text: current }); current = ''; } current = '"'; i++; continue; }
      if (c === "'") { inSingle = true; if (current) { tokens.push({ type: 'word', text: current }); current = ''; } current = "'"; i++; continue; }
    } else {
      if (inDouble && c === '"') { current += '"'; tokens.push({ type: 'string', text: current }); current = ''; inDouble = false; i++; continue; }
      if (inSingle && c === "'") { current += "'"; tokens.push({ type: 'string', text: current }); current = ''; inSingle = false; i++; continue; }
    }
    current += c;
    i++;
  }
  if (current) tokens.push({ type: inSingle || inDouble ? 'string' : 'word', text: current });
  return tokens;
}

/**
 * @param {{type:string,text:string}} tok
 * @param {boolean} isCommandPosition
 * @returns {string}
 */
function tokenClass(tok, isCommandPosition) {
  if (tok.type === 'space') return 'tok-spc';
  if (tok.type === 'string') return 'tok-str';
  if (isCommandPosition) return ALL_CMDS.includes(tok.text.toLowerCase()) ? 'tok-cmd' : 'tok-unk';
  if (tok.text.startsWith('-')) return 'tok-flag';
  return 'tok-arg';
}

/**
 * @param {string} cls
 * @param {string} text
 * @returns {string}
 */
function renderTokenSpan(cls, text) {
  return '<span class="' + cls + '">' + escapeHtml(text) + '</span>';
}

/**
 * @param {Array<{type:string,text:string}>} tokens
 * @param {number} caret
 * @returns {string}
 */
function renderTokens(tokens, caret) {
  let isCommandPosition = true;
  let cursorInserted = false;
  let offset = 0;
  let html = '';

  const cursor = '<span class="terminal-cursor" aria-hidden="true"></span>';

  for (const tok of tokens) {
    const cls = tokenClass(tok, isCommandPosition);
    const start = offset;
    const end = offset + tok.text.length;

    if (tok.type !== 'space') isCommandPosition = false;

    if (!cursorInserted && caret <= start) {
      html += cursor;
      cursorInserted = true;
    }

    if (!cursorInserted && caret > start && caret < end) {
      html += renderTokenSpan(cls, tok.text.slice(0, caret - start));
      html += cursor;
      html += renderTokenSpan(cls, tok.text.slice(caret - start));
      cursorInserted = true;
    } else {
      html += renderTokenSpan(cls, tok.text);
    }

    offset = end;
  }

  if (!cursorInserted) html += cursor;
  return html;
}

/** @param {string} input @returns {string|null} */
function getSuggestion(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (!lower) return null;

  // History first (most recent match)
  for (const h of state.history) {
    if (h.toLowerCase().startsWith(lower) && h.length > lower.length) return h;
  }

  // Known commands
  for (const cmd of ALL_CMDS) {
    if (cmd.startsWith(lower) && cmd.length > lower.length) return cmd;
  }

  return null;
}

/**
 * @param {string} val
 * @param {number=} caret
 * @returns {string}
 */
function renderInputDisplay(val, caret = val.length) {
  const tokens = lexInput(val);
  let html = renderTokens(tokens, caret);
  const suggestion = getSuggestion(val);
  if (caret === val.length && suggestion && suggestion.length > val.length) {
    html += '<span class="tok-ghost">' + escapeHtml(suggestion.slice(val.length)) + '</span>';
  }
  return html;
}

/* ─────────────────────────────────────────────────────────────
 * TAB COMPLETION MENU
 * ───────────────────────────────────────────────────────────── */

/** @type {string[]} */
let tabMenuMatches = [];
let tabMenuSelectedIndex = -1;
/** @type {{el:EventTarget,event:string,fn:Function}|null} */
let _tabMenuClickListener = null;

function hideTabMenu() {
  const menu = document.getElementById('terminal-tab-menu');
  if (menu) {
    const tml = _tabMenuClickListener;
    if (tml) {
      menu.removeEventListener('click', /** @type {EventListenerOrEventListenerObject} */ (tml.fn));
      _boundListeners = _boundListeners.filter(
        l => !(l.el === tml.el && l.event === tml.event && l.fn === tml.fn)
      );
      _tabMenuClickListener = null;
    }
    menu.remove();
  }
  tabMenuMatches = [];
  tabMenuSelectedIndex = -1;
}

function updateTabMenuSelection() {
  const menu = document.getElementById('terminal-tab-menu');
  if (!menu) return;
  const items = menu.querySelectorAll('.terminal-tab-menu__item');
  items.forEach((item, idx) => {
    item.classList.toggle('selected', idx === tabMenuSelectedIndex);
  });
}

/** @param {string} completion */
function commitTabMenu(completion) {
  const inp = getInput();
  if (inp) {
    inp.value = completion;
    updatePromptLine(completion);
    inp.focus({ preventScroll: true });
    inp.setSelectionRange(completion.length, completion.length);
  }
  hideTabMenu();
}

/** @param {string[]} completions */
function showTabMenu(completions) {
  hideTabMenu();
  if (!completions.length) return;

  tabMenuMatches = completions;
  tabMenuSelectedIndex = 0;

  const menu = document.createElement('div');
  menu.id = 'terminal-tab-menu';
  menu.className = 'terminal-tab-menu';

  completions.forEach((c, i) => {
    const item = document.createElement('div');
    item.className = 'terminal-tab-menu__item' + (i === 0 ? ' selected' : '');
    item.textContent = c;
    menu.appendChild(item);
  });

  const onMenuClick = (/** @type {MouseEvent} */ e) => {
    const t = /** @type {Element} */ (e.target);
    const item = t.closest('.terminal-tab-menu__item');
    if (!item) return;
    const idx = Array.from(menu.children).indexOf(item);
    if (idx >= 0) commitTabMenu(tabMenuMatches[idx]);
  };

  trackListener(menu, 'click', onMenuClick);
  _tabMenuClickListener = { el: menu, event: 'click', fn: onMenuClick };

  if (currentPromptLine) currentPromptLine.appendChild(menu);
}

/** @returns {string} */
function getRpromptText() {
  return 'plasma';
}

/* ─────────────────────────────────────────────────────────────
 * LIVE PROMPT LINE
 * ───────────────────────────────────────────────────────────── */
function createPromptLine() {
  const out = getOutput();
  const inp = getInput();
  if (!out) return;
  syncTerminalTitle();

  const el = document.createElement('div');
  el.className = 'tl tl--cmd active-prompt';
  el.style.position = 'relative';

  const echo = document.createElement('span');
  echo.className = 't-prompt-echo';
  const parser = new DOMParser();
  const parsed = parser.parseFromString(getPromptHtml(), 'text/html');
  echo.append(...Array.from(parsed.body.childNodes));

  const wrapper = document.createElement('div');
  wrapper.className = 'terminal-input-wrapper';

  // Move the real input into the wrapper so it overlaps the display area.
  if (inp && inp.parentElement !== wrapper) wrapper.appendChild(inp);

  const display = document.createElement('div');
  display.id = 'terminal-input-display';
  wrapper.appendChild(display);

  const rprompt = document.createElement('span');
  rprompt.className = 'terminal-rprompt';
  const trpIcon = document.createElement('span');
  trpIcon.className = 'trp-icon';
  trpIcon.textContent = '●';
  const trpText = document.createElement('span');
  trpText.className = 'trp-text';
  trpText.textContent = getRpromptText();
  rprompt.append(trpIcon, ' ', trpText);

  el.append(echo, wrapper, rprompt);

  out.appendChild(el);
  currentPromptLine = el;
  updatePromptLine(inp?.value ?? '');
  scrollBottom();

  if (inp && !inp.disabled) inp.focus({ preventScroll: true });
}

/**
 * Measures text width using an off-screen canvas for fast overlap checks.
 * @param {string} text
 * @param {string} font
 * @returns {number}
 */
function measureTextWidth(text, font) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Hides the RPROMPT when the typed command would visually overlap it. */
function updateRpromptVisibility() {
  if (!currentPromptLine) return;
  const rprompt = currentPromptLine.querySelector('.terminal-rprompt');
  const display = currentPromptLine.querySelector('#terminal-input-display');
  if (!rprompt || !display) return;

  const lineRect = currentPromptLine.getBoundingClientRect();
  const echo = currentPromptLine.querySelector('.t-prompt-echo');
  const echoWidth = echo ? echo.getBoundingClientRect().width : 0;
  const rpromptWidth = rprompt.getBoundingClientRect().width;
  const available = lineRect.width - echoWidth - rpromptWidth - 12; // 12px safety gap

  const font = getComputedStyle(display).font;
  const val = getInput()?.value ?? '';
  const textWidth = measureTextWidth(val, font);

  (/** @type {HTMLElement} */ (rprompt)).style.visibility = (textWidth > available && available > 0) ? 'hidden' : 'visible';
}

/** @param {string} val */
function updatePromptLine(val) {
  hideTabMenu();
  if (!currentPromptLine) return;
  const display = currentPromptLine.querySelector('#terminal-input-display');
  const input = getInput();
  const caret = input && document.activeElement === input ? (input.selectionStart ?? val.length) : val.length;
  if (display) {
    const _p = new DOMParser();
    const _doc = _p.parseFromString(renderInputDisplay(val, caret), 'text/html');
    display.replaceChildren(...Array.from(_doc.body.childNodes));
  }
  updateRpromptVisibility();
  scrollBottom();
}

function finalizePromptLine() {
  if (!currentPromptLine) return;
  currentPromptLine.querySelector('.terminal-cursor')?.remove();
  currentPromptLine.classList.remove('active-prompt');
  returnInputToRow();
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
 * COMMAND HANDLERS
 * ───────────────────────────────────────────────────────────── */

/** @returns {TermLine[]} */
function cmdHelp() {
  const copy = TERMINAL_COPY[terminalLocale()] ?? TERMINAL_COPY.es;
  return copy.help.map(line => ({ ...line }));
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdWhoami(args) {
  if (args.indexOf('--full') !== -1 || args.indexOf('-f') !== -1) {
    return [
      { text: 'Alaska Elaina Gonz\u00e1lez', cls: 'success' },
      { text: getBirthUptime().years + (terminalLocale() === 'en' ? ' years old · Mar del Plata, Argentina' : ' años · Mar del Plata, Argentina'), cls: 'output' },
      { text: '' },
    ];
  }
  return [{ text: 'alaska', cls: 'success' }, { text: '' }];
}

/**
 * @param {string[]} args
 * @returns {{ opts: { long: boolean, all: boolean, almostAll: boolean, human: boolean }, paths: string[], error?: string }}
 */
function parseLsArgs(args) {
  const opts = { long: false, all: false, almostAll: false, human: false };
  /** @type {string[]} */
  const paths = [];
  let endOfFlags = false;

  for (const arg of args) {
    if (!endOfFlags && arg === '--') { endOfFlags = true; continue; }

    if (!endOfFlags && arg.startsWith('--')) {
      if (arg === '--all') opts.all = true;
      else if (arg === '--almost-all') opts.almostAll = true;
      else if (arg === '--human-readable') opts.human = true;
      else if (arg === '--long') opts.long = true;
      else return { opts, paths, error: arg };
      continue;
    }

    if (!endOfFlags && /^-[A-Za-z]+$/.test(arg)) {
      for (const flag of arg.slice(1)) {
        if (flag === 'l') opts.long = true;
        else if (flag === 'a') opts.all = true;
        else if (flag === 'A') opts.almostAll = true;
        else if (flag === 'h') opts.human = true;
        else return { opts, paths, error: '-' + flag };
      }
      continue;
    }

    paths.push(arg);
  }

  return { opts, paths: paths.length ? paths : ['.'] };
}

/**
 * @param {string} rawPath
 * @param {{ long: boolean, all: boolean, almostAll: boolean, human: boolean }} opts
 * @param {boolean} showHeader
 * @returns {TermLine[]}
 */
function listPath(rawPath, opts, showHeader) {
  const path = resolvePath(rawPath);
  const dirEntries = getDirEntries(path);

  if (!dirEntries) {
    const found = getEntry(path);
    if (!found) return [{ text: msg('noSuchFile', { cmd: 'ls', path: rawPath }), cls: 'error' }];
    const name = found.entry.name + (found.entry.type === 'dir' ? '/' : '');
    return [{ text: opts.long ? formatLongEntry(found.entry, opts) : name, cls: found.entry.type === 'dir' ? 'success' : 'output' }];
  }

  /** @type {FsEntry[]} */
  let entries = dirEntries.filter(entry => opts.all || opts.almostAll || !entry.hidden);

  if (opts.all) {
    entries = [
      { name: '.', type: 'dir', size: 4096, mtime: 'Jun 18 2026' },
      { name: '..', type: 'dir', size: 4096, mtime: 'Jun 18 2026' },
      ...entries,
    ];
  }

  /** @type {TermLine[]} */
  const lines = [];
  if (showHeader) lines.push({ text: formatCwd(path) + ':', cls: 'header' });

  if (opts.long) {
    const total = Math.max(4, Math.ceil(entries.reduce((sum, entry) => sum + entry.size, 0) / 1024));
    lines.push({ text: 'total ' + total, cls: 'muted' });
    entries.forEach(entry => lines.push({
      text: formatLongEntry(entry, opts),
      cls: entry.type === 'dir' ? 'success' : entry.hidden ? 'muted' : 'output',
    }));
  } else {
    lines.push({ text: entries.map(entry => entry.name + (entry.type === 'dir' ? '/' : '')).join('    '), cls: 'output' });
  }
  return lines;
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdLs(args) {
  const parsed = parseLsArgs(args);
  if (parsed.error) return [{ text: msg('invalidFlag', { cmd: 'ls', flag: parsed.error.replace(/^-+/, '') }), cls: 'error' }, { text: '' }];

  /** @type {TermLine[]} */
  const lines = [];
  parsed.paths.forEach((path, idx) => {
    if (idx > 0) lines.push({ text: '' });
    lines.push(...listPath(path, parsed.opts, parsed.paths.length > 1));
  });
  lines.push({ text: '' });
  return lines;
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdCat(args) {
  if (!args.length || args[0] === '') {
    return [
      { text: msg('catMissing'), cls: 'error' },
      { text: msg('catUsage'), cls: 'muted' },
      { text: '' },
    ];
  }
  const rawPath = args[0];
  const found = getEntry(resolvePath(rawPath));

  if (!found) {
    return [
      { text: msg('noSuchFile', { cmd: 'cat', path: rawPath }), cls: 'error' },
      { text: msg('tryLs'), cls: 'muted' },
      { text: '' },
    ];
  }
  if (found.entry.type === 'dir') {
    return [{ text: 'cat: ' + rawPath + ': Is a directory', cls: 'error' }, { text: '' }];
  }
  if (found.entry.binary) {
    return [
      { text: 'cat: ' + rawPath + ': ' + (terminalLocale() === 'en' ? 'binary file, not text.' : 'es un archivo binario, no texto.'), cls: 'error' },
      { text: msg('tryXdg'), cls: 'muted' },
      { text: '' },
    ];
  }
  return getFileLines(found.entry);
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdUname(args) {
  if (!args.length) return [{ text: 'Linux', cls: 'output' }, { text: '' }];
  if (args.indexOf('-a') !== -1) {
    return [
      { text: 'Linux plasma 6.8.0-alaska #1 SMP PREEMPT_DYNAMIC Thu Jun 18 12:00:00 ART 2026 x86_64 GNU/Linux', cls: 'output' },
      { text: '' },
      { text: 'Kernel   6.8.0-alaska',  cls: 'muted' },
      { text: 'Distro   Arch Linux',     cls: 'muted' },
      { text: 'Desktop  KDE Plasma 6.8', cls: 'muted' },
      { text: 'Shell    zsh 5.9',        cls: 'muted' },
      (function() {
        const u = getBirthUptime();
        return { text: 'Uptime   ' + u.years + ' years, ' + u.days + ' days', cls: 'success' };
      })(),
      { text: 'Status   Live',           cls: 'success' },
      { text: '' },
    ];
  }
  if (args.indexOf('-r') !== -1) return [{ text: '6.8.0-alaska', cls: 'output' }, { text: '' }];
  if (args.indexOf('-m') !== -1) return [{ text: 'x86_64',       cls: 'output' }, { text: '' }];
  if (args.indexOf('-n') !== -1) return [{ text: 'plasma',       cls: 'output' }, { text: '' }];
  if (args.indexOf('-s') !== -1) return [{ text: 'Linux',        cls: 'output' }, { text: '' }];
  return [{ text: terminalLocale() === 'en' ? 'uname: invalid option — try uname -a' : 'uname: opción no reconocida — probá con uname -a', cls: 'error' }, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdPwd() {
  return [{ text: state.cwd, cls: 'output' }, { text: '' }];
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

/**
 * Calcula el tiempo transcurrido desde el nacimiento de Alaska.
 * @returns {{ years: number, days: number, hours: number, minutes: number }}
 */
function getBirthUptime() {
  const birth = new Date(2002, 8, 2, 21, 3, 0); // mes 8 = septiembre (0-indexed)
  const now   = new Date();
  const diffMs = now.getTime() - birth.getTime();

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours   = Math.floor(totalMinutes / 60);
  const totalDays    = Math.floor(totalHours / 24);
  const years        = Math.floor(totalDays / 365.25);
  const days         = Math.floor(totalDays - years * 365.25);
  const hours        = totalHours % 24;
  const minutes      = totalMinutes % 60;

  return { years, days, hours, minutes };
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdEcho(args) {
  if (!args.length) return [{ text: '', cls: 'output' }, { text: '' }];
  const env = getEnv();
  let expanded = args.join(' ');
  Object.keys(env).forEach(v => {
    const re = new RegExp('\\$\\{?' + v + '\\}?', 'g');
    expanded = expanded.replace(re, env[v]);
  });
  return [{ text: expanded, cls: 'output' }, { text: '' }];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdCd(args) {
  const target = args[0] ?? '~';
  let path = target === '-' ? state.previousCwd : resolvePath(target);

  if (!isDirectory(path)) {
    const found = getEntry(path);
    if (!found) return [{ text: msg('noSuchDir', { path: target }), cls: 'error' }, { text: '' }];
    return [{ text: msg('notDir', { path: target }), cls: 'error' }, { text: '' }];
  }

  const old = state.cwd;
  state.cwd = path;
  state.previousCwd = old;

  if (target === '-') return [{ text: state.cwd, cls: 'output' }, { text: '' }];
  return [{ text: '' }];
}

/** @returns {TermLine[]} */
function cmdId() {
  return [{ text: 'uid=1000(alaska) gid=1000(alaska) groups=1000(alaska),998(wheel),991(lp),985(video)', cls: 'output' }, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdHostname() {
  return [{ text: 'plasma', cls: 'output' }, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdEnv() {
  return [
    ...Object.entries(getEnv())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ text: key + '=' + value, cls: /** @type {string} */ ('output') })),
    { text: '' },
  ];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdMan(args) {
  const name = (args[0] ?? '').toLowerCase();
  if (!name) return [{ text: msg('manMissing'), cls: 'error' }, { text: 'usage: man <command>', cls: 'muted' }, { text: '' }];

  /** @type {Record<string, string[]>} */
  const pages = terminalLocale() === 'en' ? {
    ls: ['LS(1)', 'NAME', '       ls - list directory contents', 'SYNOPSIS', '       ls [-laAh] [FILE]...', 'NOTES', '       This portfolio shell supports a small virtual filesystem.'],
    cd: ['CD(1)', 'NAME', '       cd - change the current directory', 'SYNOPSIS', '       cd [DIR]', '       cd -'],
    grep: ['GREP(1)', 'NAME', '       grep - print lines that match a pattern', 'SYNOPSIS', '       grep <term> <file>'],
    open: ['OPEN(1)', 'NAME', '       open - navigate portfolio routes or open cv.pdf', 'SYNOPSIS', '       open <route|cv.pdf>'],
    go: ['GO(1)', 'NAME', '       go - navigate to a portfolio route', 'SYNOPSIS', '       go /proyectos/jobbot'],
    help: ['HELP(1)', 'NAME', '       help - show available commands'],
  } : {
    ls: ['LS(1)', 'NOMBRE', '       ls - lista contenido de directorios', 'SINOPSIS', '       ls [-laAh] [ARCHIVO]...', 'NOTAS', '       Este shell del portfolio usa un sistema de archivos virtual pequeño.'],
    cd: ['CD(1)', 'NOMBRE', '       cd - cambia el directorio actual', 'SINOPSIS', '       cd [DIR]', '       cd -'],
    grep: ['GREP(1)', 'NOMBRE', '       grep - imprime líneas que coinciden con un patrón', 'SINOPSIS', '       grep <término> <archivo>'],
    open: ['OPEN(1)', 'NOMBRE', '       open - navega rutas del portfolio o abre cv.pdf', 'SINOPSIS', '       open <ruta|cv.pdf>'],
    go: ['GO(1)', 'NOMBRE', '       go - navega a una ruta del portfolio', 'SINOPSIS', '       go /proyectos/jobbot'],
    help: ['HELP(1)', 'NOMBRE', '       help - muestra comandos disponibles'],
  };

  const page = pages[name];
  if (!page) return [{ text: msg('manMissingEntry', { cmd: name }), cls: 'error' }, { text: '' }];
  return [...page.map((text, i) => ({ text, cls: i === 0 ? 'header' : 'output' })), { text: '' }];
}

/** @returns {TermLine[]} */
function cmdNeofetch() {
  return [
    { text: '                   -`                    alaska@plasma', cls: 'success' },
    { text: '                  .o+`                   -------------', cls: 'success' },
    { text: '                 `ooo/                   OS: Arch Linux x86_64', cls: 'output' },
    { text: '                `+oooo:                  Host: ASUSTeK COMPUTER INC. E1504FA', cls: 'output' },
    { text: '               `+oooooo:                 Kernel: 6.8.0-alaska', cls: 'output' },
    (function() {
      const u = getBirthUptime();
      return { text: '               -+oooooo+:                Uptime: ' + u.years + ' years, ' + u.days + ' days, ' + u.hours + ' hours, ' + u.minutes + ' mins', cls: 'output' };
    })(),
    { text: '             `/:-:++oooo+:               Packages: 1151 (pacman), 14 (flatpak)', cls: 'output' },
    { text: '            `/++++/+++++++:              Shell: zsh 5.9', cls: 'output' },
    { text: '           `/++++++++++++++:             Resolution: 1920x1080', cls: 'output' },
    { text: '          `/+++ooooooooooooo/`           DE: Plasma 6.8 (Wayland)', cls: 'output' },
    { text: '         ./ooosssso++osssssso+`          WM: kwin_wayland_wr', cls: 'output' },
    { text: '        .oossssso-````/ossssss+`         Theme: Breeze-Dark [GTK2], Breeze [GTK3]', cls: 'output' },
    { text: '       -osssssso.      :ssssssso.        Icons: Tela-nord-dark [GTK2/3]', cls: 'output' },
    { text: '      :osssssss/        osssso+++.       Terminal: Konsole', cls: 'output' },
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
  if (!args.length) return [{ text: msg('sudoUsage'), cls: 'error' }, { text: '' }];
  return [
    { text: 'alaska is not in the sudoers file. This incident will be reported.', cls: 'error' },
    { text: '' },
  ];
}

/** @returns {TermLine[]} */
function cmdHistory() {
  if (!state.history.length) return [{ text: msg('historyEmpty'), cls: 'muted' }, { text: '' }];
  const chronological = state.history.slice().reverse();
  return [
    ...chronological.map(
      /** @param {string} entry @param {number} i @returns {TermLine} */
      (entry, i) => ({ text: String(i + 1).padStart(5, ' ') + '  ' + entry, cls: 'output' })
    ),
    { text: '' },
  ];
}

/** @param {string} cmd @returns {TermLine[]} */
function cmdFileOps(cmd) {
  return [
    { text: msg('readOnly', { cmd }), cls: 'error' },
    { text: '' },
  ];
}

/** @param {string[]} args @returns {TermLine[]} */
function cmdGrep(args) {
  if (args.length < 2) {
    return [
      { text: msg('grepUsage'), cls: 'error' },
      { text: msg('grepExample'), cls: 'muted' },
      { text: '' },
    ];
  }
  const term       = args[0].toLowerCase();
  const rawPath    = args[1];
  const found      = getEntry(resolvePath(rawPath));

  if (!found || found.entry.type === 'dir' || found.entry.binary) {
    return [{ text: msg('noSuchFile', { cmd: 'grep', path: rawPath }), cls: 'error' }, { text: '' }];
  }

  const matches = getFileLines(found.entry).filter(l => l.text?.toLowerCase().includes(term));
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
    return [{ text: msg('tailHeadUsage', { cmd }), cls: 'error' }, { text: '' }];
  }
  const rawPath    = args[0];
  const found      = getEntry(resolvePath(rawPath));

  if (!found || found.entry.type === 'dir' || found.entry.binary) {
    return [{ text: msg('noSuchFile', { cmd, path: rawPath }), cls: 'error' }, { text: '' }];
  }

  const all      = getFileLines(found.entry).filter(l => l.text !== undefined);
  const slice    = cmd === 'tail' ? all.slice(-5) : all.slice(0, 5);
  return [...slice, { text: '' }];
}

/** @returns {TermLine[]} */
function cmdTop() {
  const timeStr = new Date().toTimeString().slice(0, 8);
  const u = getBirthUptime();
  return [
    { text: 'top - ' + timeStr + '  up ' + u.years + ' years, ' + u.days + ' days,  1 user,  load average: 0.01, 0.05, 0.00', cls: 'muted' },
    { text: 'Tasks:  42 total,   1 running,  41 sleeping,   0 stopped,   0 zombie',           cls: 'muted' },
    { text: '%Cpu(s):  2.1 us,  0.8 sy,  0.0 ni, 96.9 id,  0.2 wa,  0.0 hi,  0.0 si',       cls: 'muted' },
    { text: 'MiB Mem:  15934.4 total,  8241.2 free,  4821.6 used,  2871.6 buff/cache',       cls: 'muted' },
    { text: 'MiB Swp:   2048.0 total,  2048.0 free,     0.0 used.  9842.1 avail Mem',        cls: 'muted' },
    { text: '' },
    { text: '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',    cls: 'header' },
    { text: ' 1337 alaska    20   0  512004  42316  18224 R   2.1   0.3   0:01.33 nvim',       cls: 'output' },
    { text: ' 1984 alaska    20   0  261240  31808  12440 S   0.7   0.2   0:00.87 python3',    cls: 'output' },
    { text: ' 2048 alaska    20   0  128860  21604   9112 S   0.3   0.1   0:00.44 node',       cls: 'output' },
    { text: ' 3141 alaska    20   0   67328  15112   7332 S   0.1   0.1   0:00.21 zsh',        cls: 'output' },
    { text: '' },
    { text: terminalLocale() === 'en' ? "Press 'q' to quit. (Static output; q is decorative here.)" : "Presioná 'q' para salir. (Salida estática; q es decorativo acá.)", cls: 'muted' },
    { text: '' },
  ];
}

/** @param {string} cmd @returns {TermLine[]} */
function cmdEditor(cmd) {
  const name = cmd === 'vim' ? 'Vim' : 'Nano';
  return [
    { text: terminalLocale() === 'en' ? "Did you really think I'd build " + name + " in JS? Use 'cat'." : '¿De verdad esperabas ' + name + ' completo en JS? Usá cat.', cls: 'muted' },
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

  addLine('PING ' + host + ' (' + ip + ') 56(84) bytes of data.', 'muted');

  times.forEach((ms, i) => {
    const t = setTimeout(() => {
      addLine('64 bytes from ' + ip + ': icmp_seq=' + (i + 1) + ' ttl=54 time=' + ms + '.0 ms');
    }, (i + 1) * 900);
    pingTimers.push(t);
  });

  const doneId = setTimeout(() => {
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    addLine('');
    addLine('--- ' + host + ' ping statistics ---', 'muted');
    addLine(times.length + ' packets transmitted, ' + times.length + ' received, 0% packet loss, time ' + (times.length * 900) + 'ms', 'success');
    addLine('rtt min/avg/max/mdev = ' + min + '.000/' + avg + '.000/' + max + '.000/1.500 ms', 'muted');
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
    printLines([{ text: terminalLocale() === 'en' ? 'Going back...' : 'Volviendo...', cls: 'success' }, { text: '' }], createPromptLine);
    return true;
  }

  if (cmd === 'home') {
    if (!window.router) {
      printLines([{ text: msg('routerMissing'), cls: 'error' }, { text: '' }], createPromptLine);
      return true;
    }
    window.router.navigate('/');
    printLines([{ text: terminalLocale() === 'en' ? 'Navigating to /...' : 'Navegando a /...', cls: 'success' }, { text: '' }], createPromptLine);
    return true;
  }

  if (cmd !== 'go' && cmd !== 'open') return false;

  if (cmd === 'open' && args[0]) {
    const maybeFile = getEntry(resolvePath(args[0]));
    if (maybeFile?.entry.name === 'cv.pdf') {
      printLines([{ text: msg('openCv'), cls: 'success' }, { text: '' }], () => {
        window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
        createPromptLine();
      });
      return true;
    }
  }

  if (!window.router) {
    printLines([{ text: msg('routerMissing'), cls: 'error' }, { text: '' }], createPromptLine);
    return true;
  }

  if (!args.length || args[0] === '') {
    printLines([
      { text: cmd === 'open' ? msg('openMissing') : msg('routeMissing', { cmd }), cls: 'error' },
      { text: msg('routeUsage', { cmd }), cls: 'muted' },
      { text: '' },
    ], createPromptLine);
    return true;
  }

  const raw        = args[0].replace(/^\/+/, '');
  const path       = (raw === '' || raw === 'home' || raw === '~') ? '/' : '/' + raw;
  const normalized = window.router.normalizeRoute(path);
  const routes     = getRouteList();
  const isKnown    = routes.includes(normalized) && (normalized !== '/' || path === '/');

  if (!isKnown) {
    printLines([
      { text: msg('routeNoSuch', { cmd, route: path }), cls: 'error' },
      { text: msg('routesAvailable', { routes: routes.join('  ') }), cls: 'muted' },
      { text: '' },
    ], createPromptLine);
    return true;
  }

  window.router.navigate(normalized);
  printLines([{ text: (terminalLocale() === 'en' ? 'Navigating to ' : 'Navegando a ') + normalized + '...', cls: 'success' }, { text: '' }], createPromptLine);
  return true;
}

/* ─────────────────────────────────────────────────────────────
 * AUTOCOMPLETE
 * ───────────────────────────────────────────────────────────── */
const ALL_CMDS = [
  'whoami', 'ls', 'cat', 'uname', 'pwd', 'date',
  'echo', 'env', 'id', 'hostname', 'man', 'neofetch', 'xdg-open', 'cv', 'clear', 'help',
  'sudo', 'history', 'rm', 'mkdir', 'touch', 'mv',
  'grep', 'tail', 'head', 'ping', 'top', 'htop',
  'vim', 'nano', 'cd', 'go', 'open', 'home', 'back',
];

/**
 * @param {string} partial
 * @param {{ dirsOnly?: boolean }=} options
 * @returns {string[]}
 */
function getPathCompletions(partial, options = {}) {
  const slashIdx = partial.lastIndexOf('/');
  const hasDirPrefix = slashIdx !== -1;
  const dirPrefix = hasDirPrefix ? partial.slice(0, slashIdx + 1) : '';
  const namePrefix = (hasDirPrefix ? partial.slice(slashIdx + 1) : partial).toLowerCase();
  const dirPath = hasDirPrefix ? resolvePath(dirPrefix || '/') : state.cwd;
  const entries = getDirEntries(dirPath);
  if (!entries) return [];

  return entries
    .filter(entry => !options.dirsOnly || entry.type === 'dir')
    .filter(entry => namePrefix.startsWith('.') || !entry.hidden)
    .filter(entry => entry.name.toLowerCase().startsWith(namePrefix))
    .map(entry => dirPrefix + entry.name + (entry.type === 'dir' ? '/' : ''));
}

/** @param {string} partial @returns {string[]} */
function getRouteCompletions(partial) {
  const clean = partial.replace(/^\/+/, '').toLowerCase();
  return getRouteList().filter(route => {
    const routeClean = route.replace(/^\/+/, '').toLowerCase();
    return clean === '' || routeClean.startsWith(clean) || route.toLowerCase().startsWith(partial.toLowerCase());
  });
}

/** @param {HTMLInputElement} inp */
function autocomplete(inp) {
  const raw   = inp.value;
  const lower = raw.toLowerCase();
  if (!lower.trim()) return;

  if (/^(go)\s+\S*$/.test(lower)) {
    const spaceIdx     = raw.indexOf(' ');
    const cmdPart      = raw.slice(0, spaceIdx);
    const partial      = raw.slice(spaceIdx + 1);
    const rMatches     = getRouteCompletions(partial);
    if (!rMatches.length) return;
    if (rMatches.length === 1) { inp.value = cmdPart + ' ' + rMatches[0]; updatePromptLine(inp.value); return; }
    showTabMenu(rMatches.map(r => cmdPart + ' ' + r));
    return;
  }

  if (/^(cd|cat|grep|head|tail|xdg-open|open)\s+\S*$/.test(lower)) {
    const spaceIdx = raw.indexOf(' ');
    const cmdPart  = raw.slice(0, spaceIdx);
    const partial  = raw.slice(spaceIdx + 1);
    const pMatches = getPathCompletions(partial, { dirsOnly: cmdPart.toLowerCase() === 'cd' });
    const rMatches = cmdPart.toLowerCase() === 'open' ? getRouteCompletions(partial) : [];
    const matches  = [...new Set([...pMatches, ...rMatches])];
    if (!matches.length) return;
    if (matches.length === 1) { inp.value = cmdPart + ' ' + matches[0]; updatePromptLine(inp.value); }
    else { showTabMenu(matches.map(match => cmdPart + ' ' + match)); }
    return;
  }

  const cMatches = ALL_CMDS.filter(c => c.startsWith(lower.trim()));
  if (cMatches.length === 1) { inp.value = cMatches[0]; updatePromptLine(inp.value); }
  else if (cMatches.length > 1) { showTabMenu(cMatches); }
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
    safeClearOutput();
    createPromptLine();
    return;
  }

  if (cmd === 'ping') {
    if (!args.length || !args[0]) {
      printLines([{ text: msg('pingUsage'), cls: 'error' }, { text: '' }], createPromptLine);
      return;
    }
    startPing(args[0]);
    return;
  }

  if (cmd === 'xdg-open') {
    const found = args[0] ? getEntry(resolvePath(args[0])) : null;
    if (!found || found.entry.name !== 'cv.pdf') {
      printLines([{ text: msg('xdgNotFound'), cls: 'error' }, { text: msg('xdgUsage'), cls: 'muted' }, { text: '' }], createPromptLine);
      return;
    }
    printLines([{ text: msg('openCv'), cls: 'success' }, { text: '' }], () => {
      window.open(CONFIG.cvUrl, '_blank', 'noopener,noreferrer');
      createPromptLine();
    });
    return;
  }

  if (cmd === 'cv') {
    printLines([{ text: msg('cvHint'), cls: 'muted' }, { text: msg('openCv'), cls: 'success' }, { text: '' }], () => {
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
    case 'cd':       lines = cmdCd(args);             break;
    case 'uname':    lines = cmdUname(args);          break;
    case 'pwd':      lines = cmdPwd();                break;
    case 'date':     lines = cmdDate();               break;
    case 'echo':     lines = cmdEcho(args);           break;
    case 'env':      lines = cmdEnv();                break;
    case 'id':       lines = cmdId();                 break;
    case 'hostname': lines = cmdHostname();           break;
    case 'man':      lines = cmdMan(args);            break;
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
    { text: msg('commandNotFoundHelp'), cls: 'muted' },
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
      safeClearOutput();
      createPromptLine();
      if (savedInput) { inp.value = savedInput; updatePromptLine(savedInput); }
      return;
    }

    if (k === 'u') { e.preventDefault(); inp.value = ''; updatePromptLine(''); return; }

    if (k === 'c') {
      e.preventDefault();
      const aborted = inp.value;
      inp.value = aborted ? aborted + '^C' : '^C';
      inp.setSelectionRange(inp.value.length, inp.value.length);
      updatePromptLine(inp.value);
      finalizePromptLine();
      inp.value = '';
      createPromptLine();
      return;
    }
  }

  /* ── Tab menu navigation overrides ── */
  if (tabMenuMatches.length) {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        tabMenuSelectedIndex = (tabMenuSelectedIndex - 1 + tabMenuMatches.length) % tabMenuMatches.length;
        updateTabMenuSelection();
        return;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        tabMenuSelectedIndex = (tabMenuSelectedIndex + 1) % tabMenuMatches.length;
        updateTabMenuSelection();
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (tabMenuSelectedIndex >= 0) commitTabMenu(tabMenuMatches[tabMenuSelectedIndex]);
        return;
      case 'Escape':
        e.preventDefault();
        hideTabMenu();
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

    case 'ArrowRight':
      if (!state.animating) {
        const suggestion = getSuggestion(inp.value);
        const caret = inp.selectionStart ?? inp.value.length;
        if (caret === inp.value.length && suggestion && suggestion.length > inp.value.length) {
          e.preventDefault();
          inp.value = suggestion;
          updatePromptLine(suggestion);
        }
      }
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
  state.cwd = HOME_DIR;
  state.previousCwd = HOME_DIR;
  bringToFront(safeWin);

  /* ── SSH boot sequence ─────────────────────────────────────
   * Simulates an SSH handshake into plasma.local, prints a
   * stylised MOTD, and lands on the first ZSH prompt.
   * ─────────────────────────────────────────────────────────── */
  function bootSequence() {
    const out = getOutput();
    if (!out) { createPromptLine(); return; }

    const sshLines = [
      { text: '$ ssh alaska@plasma.local', cls: 'output' },
      { text: '' },
      { text: 'The authenticity of host \'plasma.local (192.168.1.42)\' can\'t be established.', cls: 'muted' },
      { text: 'ED25519 key fingerprint is SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8.', cls: 'muted' },
      { text: 'Are you sure you want to continue connecting (yes/no/[fingerprint])? yes', cls: 'output' },
      { text: 'Warning: Permanently added \'plasma.local\' (ED25519) to the list of known hosts.', cls: 'muted' },
      { text: '' },
      { text: 'alaska@plasma.local\'s password:', cls: 'output' },
      { text: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', cls: 'muted' },
      { text: '' },
      { text: 'Authentication successful.', cls: 'success' },
      { text: '' },
    ];

    const now    = new Date();
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    /** @param {number} n @returns {string} */
    const pad    = n => n < 10 ? '0' + n : '' + n;
    const lastLogin =
      days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' +
      pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' +
      pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + ' ' + now.getFullYear();

    const motdLines = [
      { text: '    ___    ____  __    __    ____ ', cls: 'muted' },
      { text: '   /   |  / __ / /   / /   / __ \\', cls: 'muted' },
      { text: '  / /| | / /_/ / /   / /   / / / /', cls: 'muted' },
      { text: ' / ___ |/ ____/ /___/ /___/ /_/ / ', cls: 'muted' },
      { text: '/_/  |_/_/   /_____/_____/_____/  ', cls: 'muted' },
      { text: '' },
      { text: 'Welcome to Arch Linux on plasma!', cls: 'header' },
      { text: '' },
      { text: '  OS:       Arch Linux x86_64', cls: 'output' },
      { text: '  Kernel:   6.8.0-alaska', cls: 'output' },
      (function() {
        const u = getBirthUptime();
        return { text: '  Uptime:   ' + u.years + ' years, ' + u.days + ' days, ' + u.hours + ' hours', cls: 'output' };
      })(),
      { text: '' },
      { text: 'Last login: ' + lastLogin + ' from 192.168.1.1', cls: 'muted' },
      { text: '' },
    ];

    printLines(sshLines, () => {
      const ctx = _mountCtx;
      setTimeout(() => {
        if (!ctx || ctx.cancelled) return;
        currentPromptLine = null;
        safeClearOutput();
        printLines(motdLines, createPromptLine);
      }, 400);
    });
  }

  bootSequence();

  const onInput    = () => updatePromptLine(safeInp.value);
  const onCaretMove = () => {
    if (tabMenuMatches.length) return;
    requestAnimationFrame(() => updatePromptLine(safeInp.value));
  };
  const onWinClick = (/** @type {MouseEvent} */ e) => {
    const t = /** @type {Element} */ (e.target);
    if (t.closest('.kwm-btn')) return;
    if (!state.animating) safeInp.focus();
  };
  trackListener(safeInp, 'input',     onInput);
  trackListener(safeInp, 'keydown',   onKeyDown);
  trackListener(safeInp, 'keyup',     onCaretMove);
  trackListener(safeInp, 'click',     onCaretMove);
  trackListener(safeInp, 'select',    onCaretMove);
  trackListener(safeWin, 'mousedown', () => bringToFront(safeWin));
  trackListener(safeWin, 'click',     onWinClick);
  trackListener(window,   'resize',    updateRpromptVisibility);

  // ── Restore button ─────────────────────────────────────────
  let rawRestore = document.getElementById('terminal-restore');
  if (!rawRestore) {
    rawRestore = document.createElement('button');
    rawRestore.id        = 'terminal-restore';
    rawRestore.className = 'terminal-restore-btn';
    rawRestore.setAttribute('aria-label', terminalLocale() === 'en' ? 'Open terminal' : 'Abrir terminal');
    rawRestore.textContent = '>_';
    document.body.appendChild(rawRestore);
  }
  const rb = /** @type {HTMLElement} */ (rawRestore);
  rb.classList.remove('visible');

  trackListener(rb, 'click', () => {
    const w = /** @type {HTMLElement|null} */ (document.querySelector('.konsole-window'));
    if (!w) return;
    restoreTerminal(w, rb);
    getInput()?.focus();
  });

  // ── Fullscreen button ──────────────────────────────────────
  const controls = safeWin.querySelector('.kwm-controls');
  if (controls && !controls.querySelector('#kwm-fullscreen')) {
    const btnFs = document.createElement('button');
    btnFs.id        = 'kwm-fullscreen';
    btnFs.type      = 'button';
    btnFs.className = 'kwm-btn kwm-btn--fullscreen';
    btnFs.title     = terminalLocale() === 'en' ? 'Fullscreen' : 'Pantalla completa';
    btnFs.setAttribute('aria-label',   btnFs.title);
    btnFs.setAttribute('aria-pressed', 'false');
    btnFs.textContent = '⛶';
    controls.appendChild(btnFs);
  }

  // ── Drag — con limpieza registrada en _mountCtx ────────────
  const titlebar = /** @type {HTMLElement|null} */ (safeWin.querySelector('.konsole-titlebar'));
  if (titlebar) {
    trackListener(titlebar, 'mousedown', /** @param {MouseEvent} e */ e => {
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

  if (btnClose) trackListener(btnClose, 'click', () => closeTerminal(safeWin, rb));
  if (btnMinimize) trackListener(btnMinimize, 'click', () => closeTerminal(safeWin, rb));

  if (btnMaximize) trackListener(btnMaximize, 'click', () => {
    if (safeWin.classList.contains('is-fullscreen')) {
      setState(safeWin, null);
      btnMaximize?.setAttribute('aria-pressed', 'false');
      bringToFront(safeWin);
    } else {
      setState(safeWin, 'is-fullscreen');
      btnMaximize?.setAttribute('aria-pressed', 'true');
      scrollBottom();
    }
  });

  if (btnFullscreen) trackListener(btnFullscreen, 'click', () => {
    if (safeWin.classList.contains('is-fullscreen')) {
      setState(safeWin, null);
      btnFullscreen?.setAttribute('aria-pressed', 'false');
      bringToFront(safeWin);
    } else {
      setState(safeWin, 'is-fullscreen');
      btnFullscreen?.setAttribute('aria-pressed', 'true');
      scrollBottom();
    }
  });

  trackListener(document, 'keydown', /** @param {Event} e */ e => {
    if (/** @type {KeyboardEvent} */ (e).key !== '`') return;
    const w   = /** @type {HTMLElement|null} */ (document.querySelector('.konsole-window'));
    const rbk = /** @type {HTMLElement|null} */ (document.getElementById('terminal-restore'));
    if (!w || !rbk || !w.classList.contains('is-closed')) return;
    restoreTerminal(w, rbk);
    getInput()?.focus();
  });

  trackListener(document, 'keydown', /** @param {Event} e */ e => {
    const keyEvent = /** @type {KeyboardEvent} */ (e);
    if (!keyEvent.ctrlKey || (keyEvent.key !== 'c' && keyEvent.key !== 'C')) return;
    if (!pingTimers.length) return;
    keyEvent.preventDefault();
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

/** @type {MutationObserver | null} */
let _termObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  tryMount();
  const app = document.getElementById('app') ?? document.body;
  _termObserver = new MutationObserver(tryMount);
  _termObserver.observe(app, { childList: true, subtree: true });
});

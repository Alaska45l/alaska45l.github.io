/**
 * easterEgg.js — Avatar click easter egg
 *
 * Accepts the avatar element and a navigation callback explicitly,
 * removing any dependency on window.navigateTo or the router class.
 *
 * @param {HTMLElement} avatarEl   - The avatar element to attach clicks to.
 * @param {Function}    navigateFn - Called with '/game' when the egg triggers.
 */
function initEasterEgg(avatarEl, navigateFn) {
  if (!avatarEl || typeof navigateFn !== 'function') return;

  const CLICKS_NEEDED = 5;
  const WINDOW_MS     = 4000;
  const rotations     = [3, -5, 8, -10, 360];

  let count   = 0;
  let timeout = null;

  const reset = () => {
    count = 0;
    clearTimeout(timeout);
    avatarEl.style.transition = 'transform 0.4s ease';
    avatarEl.style.transform  = '';
  };

  avatarEl.style.cursor = 'pointer';

  avatarEl.addEventListener('click', () => {
    count++;
    clearTimeout(timeout);

    const rot = rotations[Math.min(count - 1, rotations.length - 1)];
    avatarEl.style.transition = 'transform 0.15s ease';
    avatarEl.style.transform  = `rotate(${rot}deg)`;

    if (count >= CLICKS_NEEDED) {
      avatarEl.style.transition = 'transform 0.5s ease';
      avatarEl.style.transform  = 'rotate(360deg) scale(1.12)';
      setTimeout(() => {
        reset();
        navigateFn('/game');
      }, 520);
      return;
    }

    timeout = setTimeout(reset, WINDOW_MS);
  });
}
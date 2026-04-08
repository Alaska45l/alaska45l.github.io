// @ts-check
'use strict';

/**
 * game.js self-initialises via MutationObserver on #game-canvas.
 * This controller handles teardown so the Game instance is destroyed
 * when the user navigates away, preventing input listeners from leaking.
 *
 * @returns {{ unmount: () => void }}
 */
export function mount() {
  return {
    unmount() {
      if (window._quantumCatGame) {
        window._quantumCatGame.destroy();
        window._quantumCatGame = null;
      }
    },
  };
}

export default { mount };
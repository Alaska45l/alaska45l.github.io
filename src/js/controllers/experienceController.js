// @ts-check
'use strict';

/**
 * Experience page has no JS beyond the experienceAccordion MutationObserver
 * (already self-initialising). Controller stub satisfies the router contract.
 *
 * @returns {{ unmount: () => void }}
 */
export function mount() {
  return { unmount() {} };
}

export default { mount };
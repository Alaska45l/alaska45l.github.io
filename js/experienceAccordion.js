(function () {
  'use strict';

  /* ── Configuration ──────────────────────────────────────────────────── */

  const SEL = Object.freeze({
    APP:      '#app',
    TIMELINE: '.experience-timeline',
    ITEM:     '.timeline-item',
    CONTENT:  '.timeline-content',
    HEADER:   '.timeline-header',
    ROLE:     '.timeline-role',
    BODY:     '.timeline-body',
    TRIGGER:  '.timeline-accordion-trigger',
  });

  const CLS = Object.freeze({
    TRIGGER: 'timeline-accordion-trigger',
    CHEVRON: 'timeline-accordion-chevron',
    IS_OPEN: 'is-open',
  });

  const DATA_INIT = 'accordionInit';

  /* ── DOM helpers ────────────────────────────────────────────────────── */

  /**
   * Sets aria-expanded to a boolean value on a trigger element.
   * @param {HTMLButtonElement} trigger
   * @param {boolean}           expanded
   */
  const setExpanded = (trigger, expanded) =>
    trigger.setAttribute('aria-expanded', String(expanded));

  /**
   * Creates the decorative chevron icon injected into each header.
   * @returns {HTMLElement}
   */
  function createChevron() {
    const icon = document.createElement('i');
    icon.className = `fas fa-chevron-down ${CLS.CHEVRON}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  /* ── Item enhancement ───────────────────────────────────────────────── */

  /**
   * Wraps a single timeline item's visible header elements inside an
   * accessible <button>, wires ARIA attributes, and appends the chevron.
   *
   * Before enhancement:
   *   .timeline-content
   *     .timeline-header   ← h3 + period span
   *     .timeline-role     ← role badge
   *     .timeline-body     ← collapsible content
   *
   * After enhancement:
   *   .timeline-content
   *     button.timeline-accordion-trigger[aria-expanded][aria-controls]
   *       .timeline-header (+ chevron appended)
   *       .timeline-role
   *     .timeline-body#exp-body-{idx}
   *
   * @param {HTMLElement} item - A .timeline-item element.
   * @param {number}      idx  - Zero-based index for unique IDs.
   */
  function enhanceItem(item, idx) {
    const content = item.querySelector(SEL.CONTENT);
    const header  = item.querySelector(SEL.HEADER);
    const role    = item.querySelector(SEL.ROLE);
    const body    = item.querySelector(SEL.BODY);

    // Skip malformed items rather than throwing
    if (!content || !header || !body) return;

    // Stable, unique ID for ARIA association
    const bodyId = `exp-body-${idx}`;
    body.id = bodyId;

    // Build the trigger button
    const trigger = document.createElement('button');
    trigger.className = CLS.TRIGGER;
    trigger.type      = 'button';
    trigger.setAttribute('aria-controls', bodyId);
    setExpanded(trigger, false);

    // Chevron appended inside header (last flex child, floats right via CSS)
    header.appendChild(createChevron());

    // Inject trigger before header, then adopt header and role as children
    content.insertBefore(trigger, header);
    trigger.appendChild(header);
    if (role) trigger.appendChild(role);
  }

  /* ── Accordion state management ─────────────────────────────────────── */

  /**
   * Collapses every open item in the given timeline container.
   * @param {HTMLElement} timeline
   */
  function closeAll(timeline) {
    timeline.querySelectorAll(SEL.ITEM).forEach(item => {
      item.classList.remove(CLS.IS_OPEN);
      const t = item.querySelector(SEL.TRIGGER);
      if (t) setExpanded(t, false);
    });
  }

  /**
   * Handles click events delegated from the timeline container.
   * Toggles the clicked item; collapses any other open item first.
   *
   * @param {MouseEvent}  e
   * @param {HTMLElement} timeline
   */
  function onTimelineClick(e, timeline) {
    const trigger = e.target.closest(SEL.TRIGGER);
    if (!trigger) return;

    const item   = trigger.closest(SEL.ITEM);
    const isOpen = item.classList.contains(CLS.IS_OPEN);

    closeAll(timeline);

    if (!isOpen) {
      item.classList.add(CLS.IS_OPEN);
      setExpanded(trigger, true);
    }
  }

  /* ── Initialization ─────────────────────────────────────────────────── */

  /**
   * Finds the experience timeline, enhances each item, and attaches the
   * single delegated click listener. The DATA_INIT flag prevents double
   * processing when the observer fires multiple times on the same element.
   */
  function init() {
    const timeline = document.querySelector(SEL.TIMELINE);
    if (!timeline || timeline.dataset[DATA_INIT]) return;

    timeline.dataset[DATA_INIT] = 'true';

    timeline.querySelectorAll(SEL.ITEM)
      .forEach((item, idx) => enhanceItem(item, idx));

    timeline.addEventListener('click', e => onTimelineClick(e, timeline));
  }

  /* ── SPA-aware boot (MutationObserver) ──────────────────────────────── */

  /**
   * Observes #app (the SPA outlet) for DOM changes. Calls init() whenever
   * new content is injected — matching the pattern used by game.js.
   * The observer intentionally stays active for the lifetime of the page
   * so that navigating away and back to /experience re-initialises cleanly.
   */
  function observeSPANavigation() {
    const root = document.querySelector(SEL.APP) ?? document.body;

    new MutationObserver(() => {
      if (document.querySelector(SEL.TIMELINE)) init();
    }).observe(root, { childList: true, subtree: true });
  }

  /* ── Entry point ────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    init();                  // handles direct URL access to /experience
    observeSPANavigation();  // handles client-side navigation via the router
  });

}());
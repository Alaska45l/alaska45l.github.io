// @ts-check
'use strict';

(function () {

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

  /**
   * @param {HTMLButtonElement} trigger
   * @param {boolean}           expanded
   */
  const setExpanded = (trigger, expanded) =>
    trigger.setAttribute('aria-expanded', String(expanded));

  /** @returns {HTMLElement} */
  function createChevron() {
    const icon = document.createElement('i');
    icon.className = `fas fa-chevron-down ${CLS.CHEVRON}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  /**
   * @param {HTMLElement} item
   * @param {number}      idx
   */
  function enhanceItem(item, idx) {
    const content = /** @type {HTMLElement|null} */ (item.querySelector(SEL.CONTENT));
    const header  = /** @type {HTMLElement|null} */ (item.querySelector(SEL.HEADER));
    const role    = /** @type {HTMLElement|null} */ (item.querySelector(SEL.ROLE));
    const body    = /** @type {HTMLElement|null} */ (item.querySelector(SEL.BODY));

    if (!content || !header || !body) return;

    const bodyId = `exp-body-${idx}`;
    body.id = bodyId;

    const trigger = document.createElement('button');
    trigger.className = CLS.TRIGGER;
    trigger.type      = 'button';
    trigger.setAttribute('aria-controls', bodyId);
    setExpanded(trigger, false);

    header.appendChild(createChevron());
    content.insertBefore(trigger, header);
    trigger.appendChild(header);
    if (role) trigger.appendChild(role);
  }

  /** @param {HTMLElement} timeline */
  function closeAll(timeline) {
    timeline.querySelectorAll(SEL.ITEM).forEach(item => {
      item.classList.remove(CLS.IS_OPEN);
      const t = /** @type {HTMLButtonElement|null} */ (item.querySelector(SEL.TRIGGER));
      if (t) setExpanded(t, false);
    });
  }

  /**
   * @param {MouseEvent}  e
   * @param {HTMLElement} timeline
   */
  function onTimelineClick(e, timeline) {
    const target  = /** @type {Element} */ (e.target);
    const trigger = /** @type {HTMLButtonElement|null} */ (target.closest(SEL.TRIGGER));
    if (!trigger) return;

    const item   = /** @type {HTMLElement|null} */ (trigger.closest(SEL.ITEM));
    if (!item) return;
    const isOpen = item.classList.contains(CLS.IS_OPEN);

    closeAll(timeline);

    if (!isOpen) {
      item.classList.add(CLS.IS_OPEN);
      setExpanded(trigger, true);
    }
  }

  function init() {
    const timeline = /** @type {HTMLElement|null} */ (document.querySelector(SEL.TIMELINE));
    if (!timeline || timeline.dataset[DATA_INIT]) return;

    timeline.dataset[DATA_INIT] = 'true';

    timeline.querySelectorAll(SEL.ITEM).forEach((item, idx) =>
      enhanceItem(/** @type {HTMLElement} */ (item), idx)
    );

    timeline.addEventListener('click', e =>
      onTimelineClick(/** @type {MouseEvent} */ (e), timeline)
    );
  }

  function observeSPANavigation() {
    const root = document.querySelector(SEL.APP) ?? document.body;
    new MutationObserver(() => {
      if (document.querySelector(SEL.TIMELINE)) init();
    }).observe(root, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    observeSPANavigation();
  });

}());
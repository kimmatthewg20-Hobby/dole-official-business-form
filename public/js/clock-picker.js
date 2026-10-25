// One shared round clock popover: tap the hour, then the minute, then choose AM or PM.
(function (root) {
  var math = root.ClockMath;
  var face = root.ClockFace;
  var el = face.el;
  var svgEl = face.svgEl;
  var polar = face.polar;
  var VIEW_SIZE = face.VIEW_SIZE;
  var CENTER = face.CENTER;
  var NUMBER_RADIUS = face.NUMBER_RADIUS;
  var HAND_RADIUS = 66;
  var BUBBLE_RADIUS = 15;
  var BIG_MINUTE_STEP = 5;
  var HOURS = 12;
  var MINUTES = 60;
  var MODE_HOUR = 'hour';
  var MODE_MINUTE = 'minute';
  var POPOVER_GAP = 4;
  var DEFAULT_PICK = { hour12: 8, minute: 0, isPm: false };

  var popover, svg, hand, bubble, hourButton, minuteButton, amButton, pmButton, labelLayer;
  var state = null;

  function currentValue() {
    return state.mode === MODE_HOUR ? state.pick.hour12 : state.pick.minute;
  }

  function currentAngle() {
    return state.mode === MODE_HOUR ? math.hourToAngle(state.pick.hour12) : math.minuteToAngle(state.pick.minute);
  }

  function drawLabels() {
    face.drawLabels(labelLayer, state.mode === MODE_HOUR);
  }

  function render() {
    var tip = polar(currentAngle(), HAND_RADIUS);
    hand.setAttribute('x2', tip.x);
    hand.setAttribute('y2', tip.y);
    var bubbleAt = polar(currentAngle(), NUMBER_RADIUS);
    bubble.setAttribute('cx', bubbleAt.x);
    bubble.setAttribute('cy', bubbleAt.y);
    hourButton.textContent = state.pick.hour12;
    minuteButton.textContent = String(state.pick.minute).padStart(2, '0');
    hourButton.setAttribute('aria-pressed', state.mode === MODE_HOUR);
    minuteButton.setAttribute('aria-pressed', state.mode === MODE_MINUTE);
    amButton.setAttribute('aria-pressed', !state.pick.isPm);
    pmButton.setAttribute('aria-pressed', state.pick.isPm);
    svg.setAttribute('aria-valuenow', currentValue());
    svg.setAttribute('aria-label', state.mode === MODE_HOUR ? 'Hour' : 'Minute');
    svg.setAttribute('aria-valuemin', state.mode === MODE_HOUR ? 1 : 0);
    svg.setAttribute('aria-valuemax', state.mode === MODE_HOUR ? HOURS : MINUTES - 1);
  }

  function setMode(mode) {
    state.mode = mode;
    drawLabels();
    render();
  }

  function change(pick) {
    state.pick = pick;
    render();
    state.onChange(pick);
  }

  function withPart(part, value) {
    return Object.assign({}, state.pick, part === MODE_HOUR ? { hour12: value } : { minute: value });
  }

  function pickAt(event) {
    var box = svg.getBoundingClientRect();
    var dx = event.clientX - (box.left + box.width / 2);
    var dy = event.clientY - (box.top + box.height / 2);
    var angle = math.pointToAngle(dx, dy);
    if (state.mode === MODE_HOUR) change(withPart(MODE_HOUR, math.angleToHour(angle)));
    else change(withPart(MODE_MINUTE, math.angleToMinute(angle)));
  }

  function onPointerDown(event) {
    event.preventDefault();
    svg.setPointerCapture(event.pointerId);
    state.dragging = true;
    pickAt(event);
  }

  function onPointerMove(event) {
    if (state.dragging) pickAt(event);
  }

  function onPointerUp(event) {
    if (!state.dragging) return;
    state.dragging = false;
    pickAt(event);
    if (state.mode === MODE_HOUR) setMode(MODE_MINUTE);
  }

  function step(delta) {
    if (state.mode === MODE_HOUR) change(withPart(MODE_HOUR, math.stepHour(state.pick.hour12, delta)));
    else change(withPart(MODE_MINUTE, math.stepMinute(state.pick.minute, delta)));
  }

  var KEY_STEPS = {
    ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1,
    PageUp: BIG_MINUTE_STEP, PageDown: -BIG_MINUTE_STEP,
  };

  function onKeyDown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') { event.preventDefault(); confirmTime(); return; }
    if (event.target.tagName === 'BUTTON' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (!(event.key in KEY_STEPS)) return;
    event.preventDefault();
    step(KEY_STEPS[event.key]);
  }

  function choosePeriod(isPm) {
    change(Object.assign({}, state.pick, { isPm: isPm }));
  }

  function build() {
    popover = el('div', 'clock-picker ui-card');
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Choose a time');
    popover.hidden = true;
    var header = el('div', 'clock-picker__header', popover);
    hourButton = el('button', 'clock-picker__unit', header);
    el('span', 'clock-picker__colon', header).textContent = ':';
    minuteButton = el('button', 'clock-picker__unit', header);
    var period = el('div', 'clock-picker__period', header);
    amButton = el('button', 'clock-picker__unit clock-picker__unit--small', period);
    pmButton = el('button', 'clock-picker__unit clock-picker__unit--small', period);
    [hourButton, minuteButton, amButton, pmButton].forEach(function (button) { button.type = 'button'; });
    amButton.textContent = 'AM';
    pmButton.textContent = 'PM';
    hourButton.addEventListener('click', function () { setMode(MODE_HOUR); });
    minuteButton.addEventListener('click', function () { setMode(MODE_MINUTE); });
    amButton.addEventListener('click', function () { choosePeriod(false); });
    pmButton.addEventListener('click', function () { choosePeriod(true); });

    svg = svgEl('svg', { viewBox: '0 0 ' + VIEW_SIZE + ' ' + VIEW_SIZE, class: 'clock-picker__face',
      role: 'slider', tabindex: '0' }, popover);
    svgEl('circle', { cx: CENTER, cy: CENTER, r: CENTER, class: 'clock-picker__dial' }, svg);
    hand = svgEl('line', { x1: CENTER, y1: CENTER, class: 'clock-picker__hand' }, svg);
    bubble = svgEl('circle', { r: BUBBLE_RADIUS, class: 'clock-picker__bubble' }, svg);
    labelLayer = svgEl('g', {}, svg);
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    var done = el('button', 'ui-btn clock-picker__done', popover);
    done.type = 'button';
    done.textContent = 'OK';
    done.addEventListener('click', confirmTime);
    popover.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', function (event) {
      if (state && !popover.contains(event.target) && !state.anchor.contains(event.target)) close();
    });
    document.body.appendChild(popover);
  }

  function place(anchor) {
    var box = anchor.getBoundingClientRect();
    popover.style.setProperty('--clock-top', box.bottom + POPOVER_GAP + 'px');
    popover.style.setProperty('--clock-left', Math.max(0, Math.min(box.left, window.innerWidth - popover.offsetWidth)) + 'px');
  }

  // OK keeps the time the clock shows, even when it was never touched: an empty field opens on
  // its suggested time, and pressing OK on it must fill the field.
  function confirmTime() {
    if (!state) return;
    state.onChange(state.pick);
    close();
  }

  function close() {
    if (!state) return;
    var finished = state;
    state = null;
    popover.hidden = true;
    finished.onClose();
  }

  // options: anchor (element the popover sits under), pick ({hour12, minute, isPm}; the clock
  // opens on it, or on 8:00 AM without one), onChange(pick), onClose().
  function open(options) {
    if (!popover) build();
    close();
    state = { anchor: options.anchor, pick: options.pick || DEFAULT_PICK, mode: MODE_HOUR,
      onChange: options.onChange, onClose: options.onClose, dragging: false };
    popover.hidden = false;
    drawLabels();
    render();
    place(options.anchor);
    svg.focus();
  }

  root.ClockPicker = { open: open, close: close };
})(window);

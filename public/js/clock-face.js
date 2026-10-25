// Drawing helpers for the clock popover: DOM and SVG creation, and the number ring.
(function (root) {
  var math = root.ClockMath;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var VIEW_SIZE = 200;
  var CENTER = VIEW_SIZE / 2;
  var NUMBER_RADIUS = 78;
  var HOURS = 12;
  var MINUTES = 60;
  var MINUTE_LABEL_STEP = 5;

  function el(tag, className, parent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgEl(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    parent.appendChild(node);
    return node;
  }

  function polar(angle, radius) {
    var radians = (angle * Math.PI) / 180;
    return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) };
  }

  function drawLabels(layer, isHour) {
    layer.textContent = '';
    var count = isHour ? HOURS : MINUTES / MINUTE_LABEL_STEP;
    for (var index = 1; index <= count; index++) {
      var value = isHour ? index : (index % count) * MINUTE_LABEL_STEP;
      var at = polar(isHour ? math.hourToAngle(index) : math.minuteToAngle(value), NUMBER_RADIUS);
      var text = svgEl('text', { x: at.x, y: at.y, class: 'clock-picker__number' }, layer);
      text.textContent = isHour ? value : String(value).padStart(2, '0');
    }
  }

  root.ClockFace = {
    el: el, svgEl: svgEl, polar: polar, drawLabels: drawLabels,
    VIEW_SIZE: VIEW_SIZE, CENTER: CENTER, NUMBER_RADIUS: NUMBER_RADIUS,
  };
})(window);

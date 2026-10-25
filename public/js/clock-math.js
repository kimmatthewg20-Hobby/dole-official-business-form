// Pure clock geometry and 12h/24h conversion, shared by the browser clock picker and Node checks.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ClockMath = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const FULL_TURN_DEGREES = 360;
  const HALF_TURN_DEGREES = 180;
  const HOURS_ON_FACE = 12;
  const MINUTES_ON_FACE = 60;
  const DEGREES_PER_HOUR = FULL_TURN_DEGREES / HOURS_ON_FACE;
  const DEGREES_PER_MINUTE = FULL_TURN_DEGREES / MINUTES_ON_FACE;
  const HOURS_PER_DAY = 24;
  const NOON_HOUR = 12;
  const STORED_TIME = /^(\d{2}):(\d{2})$/;

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  // Degrees clockwise from twelve o'clock; screen y grows downwards, hence -dy.
  function pointToAngle(dx, dy) {
    const degrees = (Math.atan2(dx, -dy) * HALF_TURN_DEGREES) / Math.PI;
    return (degrees + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
  }

  function angleToHour(angle) {
    return Math.round(angle / DEGREES_PER_HOUR) % HOURS_ON_FACE || HOURS_ON_FACE;
  }

  function angleToMinute(angle) {
    return Math.round(angle / DEGREES_PER_MINUTE) % MINUTES_ON_FACE;
  }

  function hourToAngle(hour12) {
    return (hour12 % HOURS_ON_FACE) * DEGREES_PER_HOUR;
  }

  function minuteToAngle(minute) {
    return minute * DEGREES_PER_MINUTE;
  }

  function to24Hour(hour12, isPm) {
    return (hour12 % NOON_HOUR) + (isPm ? NOON_HOUR : 0);
  }

  function toStoredTime(hour12, minute, isPm) {
    return `${pad(to24Hour(hour12, isPm))}:${pad(minute)}`;
  }

  // Returns { hour12, minute, isPm } for "HH:MM", or null.
  function fromStoredTime(stored) {
    const match = STORED_TIME.exec(String(stored ?? ''));
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= HOURS_PER_DAY || minute >= MINUTES_ON_FACE) return null;
    return { hour12: hour % NOON_HOUR || NOON_HOUR, minute, isPm: hour >= NOON_HOUR };
  }

  function formatTwelveHour(stored) {
    const parts = fromStoredTime(stored);
    if (!parts) return '';
    return `${parts.hour12}:${pad(parts.minute)} ${parts.isPm ? 'PM' : 'AM'}`;
  }

  // Wraps within 1..12 (hours) or 0..59 (minutes) when arrow keys step past the ends.
  function stepHour(hour12, delta) {
    return ((((hour12 - 1 + delta) % HOURS_ON_FACE) + HOURS_ON_FACE) % HOURS_ON_FACE) + 1;
  }

  function stepMinute(minute, delta) {
    return (((minute + delta) % MINUTES_ON_FACE) + MINUTES_ON_FACE) % MINUTES_ON_FACE;
  }

  return {
    pointToAngle, angleToHour, angleToMinute, hourToAngle, minuteToAngle,
    to24Hour, toStoredTime, fromStoredTime, formatTwelveHour, stepHour, stepMinute,
  };
});

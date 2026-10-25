// Shared by the browser form and Node: turns a typed time into the stored HH:MM value.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TimeInput = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const TWELVE_HOUR = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;
  const TWENTY_FOUR_HOUR = /^(\d{1,2}):(\d{2})$/;
  const MAX_MINUTE = 59;
  const MAX_HOUR_24 = 23;
  const MIN_HOUR_12 = 1;
  const MAX_HOUR_12 = 12;
  const NOON_HOUR = 12;
  const PM = 'pm';

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  // Returns "HH:MM" (24-hour) or null when the text is not a valid time.
  function parseTimeInput(text) {
    const value = String(text ?? '').trim();
    const twelve = TWELVE_HOUR.exec(value);
    if (twelve) {
      const hour = Number(twelve[1]);
      const minute = Number(twelve[2]);
      if (hour < MIN_HOUR_12 || hour > MAX_HOUR_12 || minute > MAX_MINUTE) return null;
      const isPm = twelve[3].toLowerCase() === PM;
      return `${pad((hour % NOON_HOUR) + (isPm ? NOON_HOUR : 0))}:${pad(minute)}`;
    }
    const twentyFour = TWENTY_FOUR_HOUR.exec(value);
    if (!twentyFour) return null;
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour > MAX_HOUR_24 || minute > MAX_MINUTE) return null;
    return `${pad(hour)}:${pad(minute)}`;
  }

  return { parseTimeInput };
});

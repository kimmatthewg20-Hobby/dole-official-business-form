// Shared by the browser pages and Node (print, tracker), so one wording rule serves all three.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DateWording = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const RANGE_SEPARATOR = '-';
  const LIST_SEPARATOR = ', ';
  const LAST_ITEM_JOINER = ' and ';

  function parseIsoDates(isoDates) {
    const seen = new Set();
    for (const text of isoDates || []) {
      const match = ISO_DATE.exec(String(text).slice(0, 10));
      if (match) seen.add(match.slice(1, 4).join('-'));
    }
    return [...seen].sort().map((text) => {
      const [year, month, day] = text.split('-').map(Number);
      return { year, month, day };
    });
  }

  // A run is consecutive days within one month, so it never spans a month label.
  function groupIntoRuns(dates) {
    const runs = [];
    for (const date of dates) {
      const last = runs[runs.length - 1];
      const continues = last && last.year === date.year && last.month === date.month
        && last.endDay + 1 === date.day;
      if (continues) last.endDay = date.day;
      else runs.push({ year: date.year, month: date.month, startDay: date.day, endDay: date.day });
    }
    return runs;
  }

  function runText(run) {
    return run.startDay === run.endDay
      ? String(run.startDay)
      : `${run.startDay}${RANGE_SEPARATOR}${run.endDay}`;
  }

  function buildItems(runs) {
    return runs.map((run, index) => {
      const previous = runs[index - 1];
      const next = runs[index + 1];
      const startsMonth = !previous || previous.year !== run.year || previous.month !== run.month;
      const endsYear = !next || next.year !== run.year;
      let text = (startsMonth ? `${MONTH_NAMES[run.month - 1]} ` : '') + runText(run);
      if (endsYear) text += `${LIST_SEPARATOR}${run.year}`;
      return text;
    });
  }

  function formatDateWording(isoDates) {
    const items = buildItems(groupIntoRuns(parseIsoDates(isoDates)));
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(LIST_SEPARATOR) + LAST_ITEM_JOINER + items[items.length - 1];
  }

  return { formatDateWording };
});

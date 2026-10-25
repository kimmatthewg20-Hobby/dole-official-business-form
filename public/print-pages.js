const DateMode = require('./js/date-mode');

// The forms one stored form prints as, in print order. Every employee prints on their own
// form. Separated Dates prints each employee once per date, keeping one employee's dates
// together; dates is null for All Dates, and for forms from before the mode was stored (no
// mode), so those print every date on one form as they always did.
function printedForms(formData, employees) {
  const dates = Array.isArray(formData.datesOfOB) ? [...formData.datesOfOB].sort() : [];
  if (formData.date_mode !== DateMode.MULTIPLE_SEPARATE_DAYS || dates.length === 0) {
    return employees.map((employee) => ({ employee, dates: null }));
  }
  return employees.flatMap((employee) => dates.map((date) => ({ employee, dates: [date] })));
}

module.exports = { printedForms };

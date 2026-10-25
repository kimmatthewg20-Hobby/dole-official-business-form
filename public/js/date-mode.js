// Shared by the form page and the server, so both count printed forms and apply the cap the
// same way. A submission always stores one form; the mode only changes how it prints.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DateMode = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const MULTIPLE_SEPARATE_DAYS = 'multiple-separate-days';
  const MORE_THAN_ONE_DAY = 'more-than-one-day';
  // Listed in the order the form shows them.
  const DATE_MODES = [MORE_THAN_ONE_DAY, MULTIPLE_SEPARATE_DAYS];
  const DEFAULT_DATE_MODE = MORE_THAN_ONE_DAY;
  const MAX_FORMS_PER_SUBMISSION = 60;

  function isDateMode(value) {
    return DATE_MODES.includes(value);
  }

  // Every employee prints on their own form: All Dates once, Separated Dates once per date.
  function countForms(dateMode, dateCount, employeeCount) {
    if (dateCount === 0 || employeeCount === 0) return 0;
    return dateMode === MORE_THAN_ONE_DAY ? employeeCount : dateCount * employeeCount;
  }

  function exceedsFormLimit(dateMode, dateCount, employeeCount) {
    return countForms(dateMode, dateCount, employeeCount) > MAX_FORMS_PER_SUBMISSION;
  }

  function formLimitMessage(formCount) {
    return `This would print ${formCount} forms, but one submission can print at most ${MAX_FORMS_PER_SUBMISSION}. Remove some dates or employees.`;
  }

  return {
    MULTIPLE_SEPARATE_DAYS, MORE_THAN_ONE_DAY, DATE_MODES, DEFAULT_DATE_MODE,
    MAX_FORMS_PER_SUBMISSION, isDateMode, countForms, exceedsFormLimit, formLimitMessage,
  };
});

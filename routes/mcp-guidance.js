'use strict';

// The plain-text guidance an assistant reads in the tool descriptions, so any client behaves
// well without special support. Words follow GLOSSARY.md.

const DEFAULT_FROM_TEXT = 'Official Station';

const LIST_DIVISIONS_DESCRIPTION =
  'Lists every Division (name and code) in the order the admin set. A form must be filed ' +
  'under one of these. Take the Division from the employees when their assigned units all ' +
  'match one Division exactly, ignoring capitals; otherwise ask the staff member, offering ' +
  'these names in this order as a numbered question.';

const LIST_APPROVERS_DESCRIPTION =
  'Lists every Approver (name and position) in the order the admin set. A form must name ' +
  'one of these. Pick the Approver whose position is Provincial Head (ignoring capitals), or ' +
  'the Regional Director when the Provincial Head is among the employees on the form. An ' +
  'Approver the staff member names wins. With no match or several, ask, offering these in ' +
  'this order as a numbered question.';

const FIND_EMPLOYEE_DESCRIPTION =
  'Finds Employees in the Employee directory whose name starts with the given part of a ' +
  'name, ignoring capitals, with name, position and assigned unit. Use it for each ' +
  'employee named. If several fit, ask which one. An employee it does not find needs the ' +
  'full name, position and assigned unit from the staff member; pass the unit in ' +
  'submit_official_business. "Me" is the staff member as you remember them; if you do not ' +
  'know, ask for the full name.';

const SUBMIT_DESCRIPTION =
  'Assistant filing: files one Official Business form and returns its id, print link, ' +
  'Reference code and summary. Ask only for what is missing, one question at a time; offer ' +
  'options from list_divisions and list_approvers as a numbered or multiple-choice question; ' +
  'never guess. File as soon as nothing is unclear, with no extra confirmation, then give ' +
  'the print link, the Reference code and the summary. "Me" is the staff member as you ' +
  'remember them; if you do not know, ask for the full name. From stays ' +
  `"${DEFAULT_FROM_TEXT}" and Date mode All Dates unless told otherwise (Separated Dates ` +
  'when each day is separate). Division: the one all employees\' assigned units match ' +
  'exactly, ignoring capitals; otherwise ask. Approver: the one whose position is ' +
  'Provincial Head, or the Regional Director when the Provincial Head is on the form; a ' +
  'named Approver wins; no match or several means ask. Summarise an uploaded memo or ' +
  'invitation into a one or two short sentence purpose; dates, place and time may come from ' +
  'it when left out. Only the staff member should get the Reference code, which lets ' +
  'anyone holding it edit the form.';

module.exports = {
  LIST_DIVISIONS_DESCRIPTION,
  LIST_APPROVERS_DESCRIPTION,
  FIND_EMPLOYEE_DESCRIPTION,
  SUBMIT_DESCRIPTION,
};

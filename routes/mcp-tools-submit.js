'use strict';

// The Assistant filing tool that files one Official Business form. It goes through the
// website's own submit path (routes/form-submit.js) and answers only about the form it made.

const { z } = require('zod');
const { submitForm } = require('./form-submit');
const { filingToWebsiteBody, DATE_MODE_CHOICES, DATE_MODE_LABELS, DEFAULT_FROM } = require('./mcp-filing-body');
const { jsonToolResult } = require('./mcp-tool-result');
const { filingLimitRefusal } = require('./mcp-filing-limit');

const SUBMIT_OFFICIAL_BUSINESS = 'submit_official_business';
const PRINT_ROUTE = '/print/';
const TEXT_CONTENT = 'text';

const inputSchema = {
  employees: z
    .array(z.object({
        name: z.string().trim(),
        position: z.string().trim().optional(),
        unit: z.string().trim().optional().describe('assigned unit, only for an employee find_employee did not find'),
      }))
    .describe('Every employee on the form, each with name and position.'),
  dates: z.array(z.string().trim()).describe('Dates of the Official Business as yyyy-mm-dd.'),
  destination: z.string().trim().describe('Where the employees go.'),
  departureTime: z.string().trim().describe('Departure time, such as 08:00 or 8:00 AM.'),
  returnTime: z.string().trim().describe('Return time, such as 17:30 or 5:30 PM.'),
  purpose: z.string().trim().describe('One or two short sentences.'),
  division: z.string().trim().describe('A Division name exactly as list_divisions gives it.'),
  approver: z.string().trim().describe('An Approver name exactly as list_approvers gives it.'),
  approverPosition: z
    .string()
    .trim()
    .optional()
    .describe('Only when several listed Approvers share the name: the position of the one meant.'),
  from: z.string().trim().optional().describe(`Where the employees leave from; "${DEFAULT_FROM}" when omitted.`),
  dateMode: z
    .enum(Object.keys(DATE_MODE_CHOICES))
    .optional()
    .describe('All Dates (the default) or Separated Dates when each day is separate.'),
};

function toolRefusal(message) {
  return { content: [{ type: TEXT_CONTENT, text: message }], isError: true };
}

function summaryText(body, form) {
  const names = body.employees.map((employee) => employee.name).join(', ');
  return (
    `${names} on ${form.datesOfOB.join(', ')} (${DATE_MODE_LABELS[body.dateMode]}), ` +
    `from ${body.locationFrom} to ${body.locationTo}, ${body.departureTime} to ${body.returnTime}. ` +
    `Purpose: ${body.purpose}. Division: ${body.division}. ` +
    `Approved by: ${body.approvedBy}, ${body.approvedByPosition}.`
  );
}

// Every filing counts towards the limit, refused or not, so bad input cannot be sent endlessly.
async function submitOfficialBusiness(filing, { sourceAddress }) {
  const limitRefusal = await filingLimitRefusal(sourceAddress);
  if (limitRefusal) return toolRefusal(limitRefusal);
  const { body, units, error } = await filingToWebsiteBody(filing);
  if (error) return toolRefusal(error);
  const { form, refusal } = await submitForm(body, units);
  if (refusal) return toolRefusal(refusal.message);
  return jsonToolResult({
    id: form.id,
    printLink: `${PRINT_ROUTE}${form.id}`,
    referenceCode: form.referenceCode,
    summary: summaryText(body, form),
  });
}

const tools = [
  {
    name: SUBMIT_OFFICIAL_BUSINESS,
    description:
      'Files one Official Business form for the given employees, dates, destination, times, ' +
      'purpose, Division and Approver, and returns its id, print link, Reference code and a ' +
      'summary. The Division and Approver must be on list_divisions and list_approvers. Ask ' +
      `only for what is missing; use "${DEFAULT_FROM}" and All Dates unless told otherwise. ` +
      'Give the staff member the print link, the Reference code and the summary. The ' +
      'Reference code lets anyone holding it edit the form, so share it only with them.',
    inputSchema,
    handler: submitOfficialBusiness,
  },
];

module.exports = { tools };

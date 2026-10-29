'use strict';

// The Assistant filing tool that files one Official Business form. It goes through the
// website's own submit path (routes/form-submit.js) and answers only about the form it made.

const { z } = require('zod');
const { submitForm } = require('./form-submit');
const { filingToWebsiteBody, DATE_MODE_CHOICES, DEFAULT_FROM } = require('./mcp-filing-body');
const { filingSummary } = require('./mcp-filing-summary');
const { jsonToolResult } = require('./mcp-tool-result');
const { filingLimitRefusal } = require('./mcp-filing-limit');
const { SUBMIT_DESCRIPTION } = require('./mcp-guidance');

const SUBMIT_OFFICIAL_BUSINESS = 'submit_official_business';
const PRINT_ROUTE = '/print/';
const TEXT_CONTENT = 'text';

const inputSchema = {
  employees: z
    .array(z.object({
        name: z.string().trim(),
        position: z.string().trim().optional(),
        unit: z.string().trim().optional().describe('assigned unit the staff member gave, only for an employee find_employee did not find; never assume one'),
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

// Every filing counts towards the limit, refused or not, so bad input cannot be sent endlessly.
async function submitOfficialBusiness(filing, { sourceAddress, siteAddress }) {
  const limitRefusal = await filingLimitRefusal(sourceAddress);
  if (limitRefusal) return toolRefusal(limitRefusal);
  const { body, units, error } = await filingToWebsiteBody(filing);
  if (error) return toolRefusal(error);
  const { form, refusal } = await submitForm(body, units);
  if (refusal) return toolRefusal(refusal.message);
  return jsonToolResult({
    id: form.id,
    printLink: `${siteAddress}${PRINT_ROUTE}${form.id}`,
    referenceCode: form.referenceCode,
    summary: filingSummary(body, form.datesOfOB),
  });
}

const tools = [
  {
    name: SUBMIT_OFFICIAL_BUSINESS,
    description: SUBMIT_DESCRIPTION,
    inputSchema,
    handler: submitOfficialBusiness,
  },
];

module.exports = { tools };

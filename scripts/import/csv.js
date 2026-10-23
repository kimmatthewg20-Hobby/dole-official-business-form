'use strict';

// A small RFC 4180 reader for Supabase dashboard exports: comma separated, a header
// row, fields quoted with " when they hold commas, quotes or line breaks, and "" for a
// quote inside a quoted field. Each field remembers whether it was quoted, because only
// an unquoted empty field or an unquoted NULL means a database NULL.

const QUOTE = '"';
const COMMA = ',';
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';
const BYTE_ORDER_MARK = '﻿';
const NULL_WORD = 'NULL';

function parseRecords(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let inQuotes = false;
  let fieldStarted = false;
  const fail = (problem) => {
    throw new Error(`CSV record ${records.length + 1}: ${problem}`);
  };
  const endField = () => {
    record.push({ value: field, quoted });
    field = '';
    quoted = false;
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char !== QUOTE) field += char;
      else if (text[i + 1] === QUOTE) {
        field += QUOTE;
        i += 1;
      } else {
        inQuotes = false;
        const next = text[i + 1];
        if (next !== undefined && next !== COMMA && next !== LINE_FEED && next !== CARRIAGE_RETURN) {
          fail('text after a closing quote');
        }
      }
    } else if (char === QUOTE) {
      if (fieldStarted) fail('a quote inside an unquoted field');
      inQuotes = true;
      quoted = true;
      fieldStarted = true;
    } else if (char === COMMA) {
      endField();
    } else if (char === LINE_FEED || char === CARRIAGE_RETURN) {
      if (char === CARRIAGE_RETURN && text[i + 1] === LINE_FEED) i += 1;
      endRecord();
    } else {
      field += char;
      fieldStarted = true;
    }
  }
  if (inQuotes) fail('a quoted field is never closed');
  // A final line break ends the last record rather than starting an empty one.
  if (fieldStarted || quoted || record.length > 0) endRecord();
  return records;
}

function fieldToValue({ value, quoted }) {
  if (!quoted && (value === '' || value === NULL_WORD)) return null;
  return value;
}

// Returns one object per data row, keyed by the header's column names.
function parseCsvRows(text) {
  const withoutMark = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  const [header, ...dataRecords] = parseRecords(withoutMark);
  if (!header) return [];
  const columns = header.map((field) => field.value);
  const duplicate = columns.find((column, index) => columns.indexOf(column) !== index);
  if (duplicate !== undefined) throw new Error(`CSV header repeats the column "${duplicate}"`);

  return dataRecords.map((record, index) => {
    if (record.length !== columns.length) {
      throw new Error(
        `CSV row ${index + 1} has ${record.length} fields but the header has ${columns.length}`
      );
    }
    return Object.fromEntries(columns.map((column, i) => [column, fieldToValue(record[i])]));
  });
}

module.exports = { parseCsvRows };

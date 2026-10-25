'use strict';

// One place decides when two typed names mean the same Employee directory entry:
// "ana reyes" and "ANA  REYES" do. Migration 0006 made the same key for the entries
// that existed before it.

const SPACE_RUNS = /\s+/g;
const SINGLE_SPACE = ' ';

function cleanName(name) {
  return String(name).trim().replace(SPACE_RUNS, SINGLE_SPACE);
}

function nameKey(name) {
  return cleanName(name).toLowerCase();
}

module.exports = { cleanName, nameKey };

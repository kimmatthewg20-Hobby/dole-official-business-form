'use strict';

// Finds one form by its whole Reference code for the tracker (ADR 0003). POST, not GET, so the
// code travels in the body and stays out of URLs, server logs and browser history.

const express = require('express');
const db = require('../db');
const { normaliseReferenceCode } = require('./reference-code');
const { refuseLockedOutCodeAttempt, recordWrongCode } = require('./reference-code-lockout');
const { publicFormWithEmployees } = require('./public-form');

const CODE_LOOKUP_ROUTE = '/api/lookup/code';
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CODE_REQUIRED_MESSAGE = 'Enter a Reference code.';
// One answer for every code that finds nothing, so a guesser learns nothing from it.
const NOT_FOUND_MESSAGE = 'Form not found';

async function lookUpByCode(req, res) {
  const typed = (req.body || {}).code;
  const code = typeof typed === 'string' ? normaliseReferenceCode(typed) : '';
  // Nothing was guessed, so nothing is counted.
  if (!code) return res.status(BAD_REQUEST).json({ error: CODE_REQUIRED_MESSAGE });
  try {
    const row = await db.get('SELECT * FROM official_business WHERE reference_code = ?', [code]);
    const form = await publicFormWithEmployees(row);
    if (form) return res.json(form);
    await recordWrongCode(req);
    res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
  } catch (err) {
    // The typed code is the secret, so neither the log nor the answer carries it.
    console.error('Error looking up a Reference code:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

const router = express.Router();
router.post(CODE_LOOKUP_ROUTE, refuseLockedOutCodeAttempt, lookUpByCode);

module.exports = { router, NOT_FOUND, NOT_FOUND_MESSAGE };

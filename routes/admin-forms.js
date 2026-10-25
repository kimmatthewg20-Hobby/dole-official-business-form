'use strict';

// The admin's list of forms with their Reference codes (spec story 53). The code is the edit
// secret (ADR 0003), so this is the only listing that carries it and it needs an admin session.

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { serverError } = require('./list-route-helpers');

const ADMIN_FORMS_ROUTE = '/api/admin/forms';
const ADMIN_FORMS_PAGE_SIZE = 20;
const FIRST_PAGE = 1;
const DIGITS_ONLY = /^\d+$/;

function pageNumber(raw) {
  const page = DIGITS_ONLY.test(String(raw)) ? Number(raw) : FIRST_PAGE;
  return Math.max(page, FIRST_PAGE);
}

function storedDates(form) {
  try {
    const dates = JSON.parse(form.dates_of_ob);
    if (Array.isArray(dates)) return dates;
  } catch (err) {
    // Older forms may hold no list; their single date stands in for it.
  }
  return form.date_of_ob ? [form.date_of_ob] : [];
}

async function employeeNamesByForm(formIds) {
  if (formIds.length === 0) return new Map();
  const placeholders = formIds.map(() => '?').join(', ');
  const rows = await db.all(
    `SELECT ob_id, name FROM employees WHERE ob_id IN (${placeholders}) ORDER BY id`,
    formIds,
  );
  const names = new Map(formIds.map((id) => [id, []]));
  for (const row of rows) names.get(row.ob_id).push(row.name);
  return names;
}

async function listForms(req, res) {
  try {
    const page = pageNumber(req.query.page);
    const { total } = await db.get('SELECT COUNT(*) AS total FROM official_business', []);
    const forms = await db.all(
      `SELECT id, date_created, division, date_of_ob, dates_of_ob, reference_code
       FROM official_business ORDER BY date_created DESC, id DESC LIMIT ? OFFSET ?`,
      [ADMIN_FORMS_PAGE_SIZE, (page - 1) * ADMIN_FORMS_PAGE_SIZE],
    );
    const names = await employeeNamesByForm(forms.map((form) => form.id));
    res.json({
      forms: forms.map((form) => ({
        id: form.id,
        dateCreated: form.date_created,
        division: form.division || '',
        datesOfOB: storedDates(form),
        employees: names.get(form.id),
        referenceCode: form.reference_code || null,
      })),
      pagination: { page, totalPages: Math.ceil(total / ADMIN_FORMS_PAGE_SIZE), total },
    });
  } catch (err) {
    serverError(res, 'Error listing forms for the admin', err);
  }
}

const router = express.Router();
router.get(ADMIN_FORMS_ROUTE, adminApiOnly, listForms);

module.exports = { router, ADMIN_FORMS_ROUTE, ADMIN_FORMS_PAGE_SIZE };

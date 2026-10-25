'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADMIN_PAGE = path.join(__dirname, '..', 'public', 'admin.html');
const CATEGORY_NAMES = ['Form options', 'Security', 'Data'];
const CATEGORY_PANELS = {
  'form-options': 'divisionList',
  security: 'changePasswordForm',
  data: 'runCleanupBtn',
};

module.exports = [
  {
    name: 'admin page has three categories, each holding its controls',
    run() {
      const html = fs.readFileSync(ADMIN_PAGE, 'utf8');
      for (const name of CATEGORY_NAMES) assert.ok(html.includes(`>${name}</button>`), name);
      assert.ok(html.includes('/js/admin-tabs.js'));
      assert.ok(html.includes('/js/admin-divisions.js'));
      assert.ok(html.includes('id="divisionModal"'));
      assert.ok(!html.includes('id="divisionOptions"'), 'the comma-separated text box is gone');
      for (const [tab, controlId] of Object.entries(CATEGORY_PANELS)) {
        const start = html.indexOf(`data-tab-panel="${tab}"`);
        const end = html.indexOf('data-tab-panel=', start + 1);
        const panel = html.slice(start, end === -1 ? undefined : end);
        assert.ok(panel.includes(`id="${controlId}"`), `${tab} holds ${controlId}`);
      }
    },
  },
];

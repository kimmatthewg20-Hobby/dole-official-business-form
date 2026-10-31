'use strict';

// The "File with AI" button and modal on the form page: the deployed address, the page wiring
// and the code rules. The page is static, so these read the files rather than run a browser.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const EXPECTED_ADDRESS = 'https://dole-official-business-form.vercel.app/mcp';
const EXPECTED_CONNECTOR_NAME = 'DOLE Official Business';
const MAX_LINES_PER_FILE = 200;
const NEW_FILES = ['js/connect-assistant-config.js', 'js/connect-assistant.js', 'css/connect-assistant.css'];
const OTHER_PAGES = ['tracker.html', 'admin.html'];
const INTERPOLATED_MARKUP = /innerHTML|insertAdjacentHTML|outerHTML|document\.write/;
const LOCATION_USE = /location|window\.origin|document\.URL/;

const read = (relative) => fs.readFileSync(path.join(PUBLIC_DIR, relative), 'utf8');

module.exports = [
  {
    name: 'the address comes from one constant and is the deployed site, not the current page',
    run() {
      const config = require(path.join(PUBLIC_DIR, 'js', 'connect-assistant-config.js'));
      assert.equal(config.MCP_ADDRESS, EXPECTED_ADDRESS);
      assert.equal(config.SITE_ORIGIN + config.MCP_PATH, EXPECTED_ADDRESS);
      assert.equal(config.CONNECTOR_NAME, EXPECTED_CONNECTOR_NAME);
      for (const file of NEW_FILES.filter((name) => name.endsWith('.js'))) {
        assert.doesNotMatch(read(file), LOCATION_USE, `${file} must not read the page address`);
      }
      assert.ok(!read('js/connect-assistant.js').includes('vercel.app'), 'address typed twice');
    },
  },
  {
    name: 'the new files stay under the size limit and never build markup from text',
    run() {
      for (const file of NEW_FILES) {
        const lines = read(file).split('\n').length;
        assert.ok(lines <= MAX_LINES_PER_FILE, `${file} has ${lines} lines`);
      }
      assert.doesNotMatch(read('js/connect-assistant.js'), INTERPOLATED_MARKUP);
    },
  },
  {
    name: 'the form page has the button in the header band, a mount point and the includes',
    run() {
      const html = read('index.html');
      const header = html.match(/<div class="header-section">[\s\S]*?<\/button>/);
      assert.ok(header && header[0].includes('id="connectAssistantBtn"'), 'button not in header');
      assert.ok(html.includes('id="connectAssistantMount"'));
      assert.ok(html.includes('href="css/connect-assistant.css"'));
      const config = html.indexOf('src="js/connect-assistant-config.js"');
      const modal = html.indexOf('src="js/connect-assistant.js"');
      assert.ok(config !== -1 && modal > config, 'config must load before the modal module');
    },
  },
  {
    name: 'the tracker and admin pages do not include the button',
    run() {
      for (const page of OTHER_PAGES) {
        assert.ok(!read(page).includes('connect-assistant'), `${page} was changed`);
      }
    },
  },
  {
    name: 'the modal uses the shared dialog pattern, three tabs and keyboard handling',
    run() {
      const source = read('js/connect-assistant.js');
      for (const needle of ['ui-modal', 'ui-modal__dialog', "'role', 'dialog'", "'aria-modal'",
        "'aria-labelledby'", "'tablist'", "'tab'", "'tabpanel'", 'ArrowRight', 'ArrowLeft',
        'Escape', "'Tab'"]) {
        assert.ok(source.includes(needle), `missing ${needle}`);
      }
      for (const label of ["'Claude'", "'ChatGPT'", "'Other'"]) assert.ok(source.includes(label));
      assert.ok(source.includes('navigator.clipboard.writeText'));
      assert.ok(source.includes('execCommand'));
      assert.ok(source.includes("'Copied'"));
    },
  },
];

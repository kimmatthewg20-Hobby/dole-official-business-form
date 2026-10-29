'use strict';

// The Claude tab and the shared tab pieces of the "File with AI" modal. The page is static, so
// these read the module sources and the constants rather than run a browser.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_LINES_PER_FILE = 200;
const SCRIPT_FILES = ['js/connect-assistant-shared.js', 'js/connect-assistant-claude.js'];
const INTERPOLATED_MARKUP = /innerHTML|insertAdjacentHTML|outerHTML|document\.write/;

const read = (relative) => fs.readFileSync(path.join(PUBLIC_DIR, relative), 'utf8');

module.exports = [
  {
    name: 'the Claude tab has the button, claude.ai in a new tab without opener, and no auto-add claim',
    run() {
      const claude = read('js/connect-assistant-claude.js');
      const shared = read('js/connect-assistant-shared.js');
      assert.ok(claude.includes("'Copy address & open Claude'"));
      assert.ok(claude.includes("'https://claude.ai'"));
      assert.ok(shared.includes("link.target = '_blank'"));
      assert.ok(shared.includes("link.rel = 'noopener noreferrer'"));
      assert.doesNotMatch(shared, /window\.open/);
      assert.ok(shared.includes('Address copied. Now follow the steps below.'));
      assert.doesNotMatch(claude + shared, /automatically|has been added|connector added/i);
    },
  },
  {
    name: 'the Claude steps use the on-screen labels in order, with the values beside copy buttons',
    run() {
      const claude = read('js/connect-assistant-claude.js');
      const labels = ["'Settings'", "'Connectors'", "'Add'", "'Add custom connector'", 'NAME_FIELD',
        'ADDRESS_FIELD', "'Continue'"];
      let at = claude.indexOf('const STEPS');
      for (const label of labels) {
        const found = claude.indexOf(`{ bold: ${label} }`, at);
        assert.ok(found > at, `label ${label} missing or out of order`);
        at = found;
      }
      assert.ok(claude.includes("NAME_FIELD = 'Name'"));
      assert.ok(claude.includes("ADDRESS_FIELD = 'MCP server URL'"));
      assert.ok(claude.includes('copyRow(NAME_FIELD, config.CONNECTOR_NAME)'));
      assert.ok(claude.includes('copyRow(ADDRESS_FIELD, config.MCP_ADDRESS)'));
      const config = require(path.join(PUBLIC_DIR, 'js', 'connect-assistant-config.js'));
      assert.equal(config.MCP_ADDRESS, 'https://dole-official-business-form.vercel.app/mcp');
      assert.ok(!claude.includes('vercel.app'), 'address typed twice');
    },
  },
  {
    name: 'the shared pieces are the open link and the steps, with no example card, safety note or guide link',
    run() {
      const shared = read('js/connect-assistant-shared.js');
      const claude = read('js/connect-assistant-claude.js');
      assert.ok(shared.includes('window.ConnectAssistantShared = { el, openButton, steps, tip }'));
      for (const name of ['openButton', 'steps', 'tip']) {
        assert.ok(new RegExp(`function ${name}\\(`).test(shared), `${name} missing`);
      }
      assert.ok(shared.includes('start a chat with "File an OB for…"'));
      assert.ok(shared.includes('upload an invitation or memo'));
      assert.ok(claude.includes('shared.tip()'));
      assert.doesNotMatch(shared + claude, /exampleCard|safetyNote|guideNote|Then say|Reference code appears|Menu names|Official guide/);
    },
  },
  {
    name: 'the new scripts stay under the size limit and never build markup from text',
    run() {
      for (const file of [...SCRIPT_FILES, 'js/connect-assistant.js', 'css/connect-assistant.css']) {
        const lines = read(file).split('\n').length;
        assert.ok(lines <= MAX_LINES_PER_FILE, `${file} has ${lines} lines`);
      }
      for (const file of SCRIPT_FILES) assert.doesNotMatch(read(file), INTERPOLATED_MARKUP, file);
    },
  },
  {
    name: 'the form page loads config, shell, shared, then the Claude tab',
    run() {
      const html = read('index.html');
      const order = ['config', 'connect-assistant', 'shared', 'claude'].map((part) => {
        const name = part === 'connect-assistant' ? 'connect-assistant.js' : `connect-assistant-${part}.js`;
        return html.indexOf(`src="js/${name}"`);
      });
      assert.ok(order[0] !== -1, 'config missing');
      assert.ok(order.every((at, i) => i === 0 || at > order[i - 1]), `wrong order ${order}`);
    },
  },
];

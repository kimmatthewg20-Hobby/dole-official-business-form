'use strict';

// The ChatGPT tab of the "File with AI" modal. The page is static, so these read the module
// source rather than run a browser.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_LINES_PER_FILE = 200;
const TAB_FILES = ['js/connect-assistant-chatgpt.js', 'css/connect-assistant-chatgpt.css'];
const CHATGPT_GUIDE = 'https://developers.openai.com/api/docs/guides/custom-mcp-server';
const INTERPOLATED_MARKUP = /innerHTML|insertAdjacentHTML|outerHTML|document\.write/;

const read = (relative) => fs.readFileSync(path.join(PUBLIC_DIR, relative), 'utf8');

module.exports = [
  {
    name: 'the ChatGPT tab has the button, chatgpt.com, and no auto-add claim',
    run() {
      const chatgpt = read('js/connect-assistant-chatgpt.js');
      assert.ok(chatgpt.includes("'Copy address & open ChatGPT'"));
      assert.ok(chatgpt.includes("'https://chatgpt.com'"));
      assert.ok(chatgpt.includes('shared.openButton(OPEN_LABEL, CHATGPT_URL, config.MCP_ADDRESS)'));
      assert.doesNotMatch(chatgpt, /window\.open|automatically|has been added|connector added/i);
    },
  },
  {
    name: 'the ChatGPT steps use the on-screen labels in order, with the values beside copy buttons',
    run() {
      const chatgpt = read('js/connect-assistant-chatgpt.js');
      const labels = ["'Plugins'", "'Add'", "'Add custom MCP server'", 'NAME_FIELD', "'Connection'",
        'ADDRESS_FIELD', 'AUTH_FIELD', 'NO_AUTH', "'I understand and want to continue'", "'Create as a plugin'"];
      let at = chatgpt.indexOf('const STEPS');
      for (const label of labels) {
        const found = chatgpt.indexOf(`{ bold: ${label} }`, at);
        assert.ok(found > at, `label ${label} missing or out of order`);
        at = found;
      }
      assert.ok(chatgpt.includes("NAME_FIELD = 'Name'"));
      assert.ok(chatgpt.includes("ADDRESS_FIELD = 'Server URL'"));
      assert.ok(chatgpt.includes("AUTH_FIELD = 'Authentication'"));
      assert.ok(chatgpt.includes("NO_AUTH = 'No authentication'"));
      assert.ok(chatgpt.includes('copyRow(NAME_FIELD, config.CONNECTOR_NAME)'));
      assert.ok(chatgpt.includes('copyRow(ADDRESS_FIELD, config.MCP_ADDRESS)'));
      assert.ok(!chatgpt.includes('vercel.app'), 'address typed twice');
      assert.ok(chatgpt.includes('If it asks, enable it for your chat.'));
    },
  },
  {
    name: 'the No authentication warning says what happens with OAuth and is styled to stand out',
    run() {
      const chatgpt = read('js/connect-assistant-chatgpt.js');
      const css = read('css/connect-assistant-chatgpt.css');
      assert.ok(chatgpt.includes("'Authentication starts on OAuth.'"));
      assert.ok(chatgpt.includes('Change it to ${NO_AUTH}, or the connection will fail.'));
      assert.ok(chatgpt.includes('list.children[AUTH_STEP].append(authWarning())'));
      assert.match(css, /\.connect-assistant__warning\s*\{[^}]*var\(--ui-color-danger\)/);
      assert.doesNotMatch(css, /#[0-9a-f]{3,6}\b/i, 'use design tokens, not hardcoded colours');
    },
  },
  {
    name: 'the ChatGPT tab reuses the shared pieces and links the official guide',
    run() {
      const chatgpt = read('js/connect-assistant-chatgpt.js');
      for (const piece of ['shared.exampleCard()', 'shared.safetyNote()', 'shared.guideNote(GUIDE_URL)']) {
        assert.ok(chatgpt.includes(piece), `${piece} missing`);
      }
      assert.ok(chatgpt.includes(`'${CHATGPT_GUIDE}'`));
    },
  },
  {
    name: 'the ChatGPT files stay under the size limit and never build markup from text',
    run() {
      for (const file of TAB_FILES) {
        assert.ok(read(file).split('\n').length <= MAX_LINES_PER_FILE, `${file} too long`);
      }
      assert.doesNotMatch(read('js/connect-assistant-chatgpt.js'), INTERPOLATED_MARKUP);
    },
  },
  {
    name: 'the form page loads the ChatGPT script after the Claude one and its stylesheet',
    run() {
      const html = read('index.html');
      const claude = html.indexOf('src="js/connect-assistant-claude.js"');
      const chatgpt = html.indexOf('src="js/connect-assistant-chatgpt.js"');
      assert.ok(claude !== -1 && chatgpt > claude, 'ChatGPT script must follow the Claude one');
      assert.ok(html.includes('href="css/connect-assistant-chatgpt.css"'));
    },
  },
];

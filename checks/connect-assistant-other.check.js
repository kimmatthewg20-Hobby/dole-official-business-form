'use strict';

// The Other tab of the "File with AI" modal: the Cursor link is decoded in Node, the rest reads
// the module source.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../public/js/connect-assistant-config.js');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_LINES_PER_FILE = 200;
const TAB_FILES = ['js/connect-assistant-other.js', 'js/connect-assistant-config.js', 'css/connect-assistant-other.css'];
const INTERPOLATED_MARKUP = /innerHTML|insertAdjacentHTML|outerHTML|document\.write/;

const read = (relative) => fs.readFileSync(path.join(PUBLIC_DIR, relative), 'utf8');

module.exports = [
  {
    name: 'the Claude Code command carries the server name and the deployed address',
    run() {
      assert.equal(
        config.claudeCodeCommand(config.MCP_ADDRESS),
        `claude mcp add --transport http dole-official-business ${config.MCP_ADDRESS}`,
      );
      const other = read('js/connect-assistant-other.js');
      assert.ok(other.includes('shell.copyRow(COMMAND_LABEL, config.claudeCodeCommand(config.MCP_ADDRESS))'));
    },
  },
  {
    name: 'the Cursor link decodes to the server config and URL-encodes the name',
    run() {
      const link = config.cursorInstallLink(config.MCP_ADDRESS);
      const url = new URL(link);
      assert.equal(url.protocol, 'cursor:');
      assert.ok(link.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?'));
      assert.equal(url.searchParams.get('name'), 'dole-official-business');
      const decoded = Buffer.from(url.searchParams.get('config'), 'base64').toString('utf8');
      assert.deepEqual(JSON.parse(decoded), { url: config.MCP_ADDRESS });
      const spaced = config.cursorInstallLink('https://x.test/mcp', 'name with/odd chars');
      assert.ok(spaced.includes('name=name%20with%2Fodd%20chars&'));
      assert.deepEqual(
        JSON.parse(Buffer.from(new URL(spaced).searchParams.get('config'), 'base64').toString('utf8')),
        { url: 'https://x.test/mcp' },
      );
    },
  },
  {
    name: 'the Cursor button is a plain link with no new-tab target, and says it opens Cursor',
    run() {
      const other = read('js/connect-assistant-other.js');
      assert.ok(other.includes("'Add to Cursor'"));
      assert.ok(other.includes('config.cursorInstallLink(config.MCP_ADDRESS)'));
      assert.ok(other.includes('This opens Cursor'));
      assert.doesNotMatch(other, /target/);
    },
  },
  {
    name: 'no VS Code or other assistant entries appear, and shared pieces are reused',
    run() {
      const other = read('js/connect-assistant-other.js');
      assert.doesNotMatch(other, /vs ?code|vscode|windsurf|gemini|copilot/i);
      assert.ok(other.includes('shared.exampleCard()') && other.includes('shared.safetyNote()'));
    },
  },
  {
    name: 'the Other files stay under the size limit and never build markup from text',
    run() {
      for (const file of TAB_FILES) {
        assert.ok(read(file).split('\n').length <= MAX_LINES_PER_FILE, `${file} too long`);
      }
      assert.doesNotMatch(read('js/connect-assistant-other.js'), INTERPOLATED_MARKUP);
    },
  },
  {
    name: 'the form page loads the Other script after the ChatGPT one and its stylesheet',
    run() {
      const html = read('index.html');
      const chatgpt = html.indexOf('src="js/connect-assistant-chatgpt.js"');
      const other = html.indexOf('src="js/connect-assistant-other.js"');
      assert.ok(chatgpt !== -1 && other > chatgpt, 'Other script must follow the ChatGPT one');
      assert.ok(html.includes('href="css/connect-assistant-other.css"'));
    },
  },
];

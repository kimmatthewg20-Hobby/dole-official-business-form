'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS_DIR = path.join(__dirname, '..', 'public', 'css');
const STYLESHEETS = ['tokens.css', 'components.css'];
const TOKEN_PREFIXES = ['--ui-color-', '--ui-space-', '--ui-font-', '--ui-radius-'];
const BUILDING_BLOCKS = ['ui-btn', 'ui-input', 'ui-card', 'ui-modal', 'ui-dropdown', 'ui-toast'];
const FOCUS_BLOCKS = ['ui-modal', 'ui-dropdown'];
const PHONE_MEDIA_QUERY = /@media\s*\(\s*max-width/;
const MAX_LINES_PER_FILE = 200;

function readStylesheet(name) {
  return fs.readFileSync(path.join(CSS_DIR, name), 'utf8');
}

function allCss() {
  return STYLESHEETS.map(readStylesheet).join('\n');
}

// A rule's focus state must be keyed on the block's own class, so the outline
// shows on modal and dropdown elements rather than on unrelated page elements.
function hasFocusRuleFor(css, blockClass) {
  const pattern = new RegExp(`\\.${blockClass}[^{]*:focus-visible[^{]*\\{`);
  return pattern.test(css);
}

module.exports = [
  {
    name: 'shared stylesheets exist and stay under the file size limit',
    run() {
      for (const name of STYLESHEETS) {
        const lines = readStylesheet(name).split('\n').length;
        assert.ok(lines <= MAX_LINES_PER_FILE, `${name} has ${lines} lines`);
      }
    },
  },
  {
    name: 'design tokens cover colour, spacing, type and radius',
    run() {
      const css = readStylesheet('tokens.css');
      assert.match(css, /:root\s*\{/);
      for (const prefix of TOKEN_PREFIXES) {
        assert.ok(css.includes(prefix), `missing token prefix ${prefix}`);
      }
    },
  },
  {
    name: 'building blocks are defined with prefixed class names',
    run() {
      const css = allCss();
      for (const block of BUILDING_BLOCKS) {
        assert.ok(new RegExp(`\\.${block}\\b`).test(css), `missing .${block}`);
      }
    },
  },
  {
    name: 'modal and dropdown have visible keyboard focus states',
    run() {
      const css = allCss();
      for (const block of FOCUS_BLOCKS) {
        assert.ok(hasFocusRuleFor(css, block), `no :focus-visible rule for .${block}`);
      }
    },
  },
  {
    name: 'components adapt to phone width',
    run() {
      assert.match(readStylesheet('components.css'), PHONE_MEDIA_QUERY);
    },
  },
];

'use strict';

// Staff see the Divisions and Approvers in the order the admin set (GLOSSARY.md), so the
// form's pick-lists must show the server's order and never sort it. combobox.js runs here
// against a stand-in for the few page parts it uses.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS_DIR = path.join(__dirname, '..', 'public', 'js');
const SERVER_ORDER = ['Zeta Unit', 'Camarines Norte Provincial Office', 'Alpha Unit'];
const SORTING = /\.sort\s*\(/;

function script(name) {
  return fs.readFileSync(path.join(JS_DIR, name), 'utf8');
}

class StandInElement {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.classList = { add() {} };
    this.value = '';
    this.hidden = false;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  // The combobox empties its list by setting textContent to ''.
  set textContent(text) {
    this.text = text;
    this.children = [];
  }

  get textContent() {
    return this.text;
  }

  setAttribute() {}
  removeAttribute() {}
  scrollIntoView() {}

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  fire(type) {
    this.listeners[type]({ key: '', preventDefault() {} });
  }
}

function loadCombobox() {
  const document = {
    createElement: () => new StandInElement(),
    activeElement: null,
  };
  const window = {};
  vm.runInNewContext(script('combobox.js'), { window, document });
  const host = new StandInElement();
  const input = host.appendChild(new StandInElement());
  const picker = window.Combobox.create({ input });
  const list = host.children.find((child) => child.listeners.mousedown);
  const shownLabels = () => list.children.map((option) => option.textContent);
  return { input, picker, shownLabels };
}

module.exports = [
  {
    name: "the form pick-list shows every choice in the server's order",
    run() {
      const { input, picker, shownLabels } = loadCombobox();
      picker.setItems(SERVER_ORDER.map((label) => ({ label })));
      input.fire('focus');
      assert.deepEqual(shownLabels(), SERVER_ORDER);
    },
  },
  {
    name: "typing narrows the pick-list but keeps the server's order",
    run() {
      const { input, picker, shownLabels } = loadCombobox();
      picker.setItems(SERVER_ORDER.map((label) => ({ label })));
      input.value = 'unit';
      input.fire('input');
      assert.deepEqual(shownLabels(), ['Zeta Unit', 'Alpha Unit']);
    },
  },
  {
    name: 'the form fills its pick-lists from the server without sorting them',
    run() {
      for (const name of ['form-pickers.js', 'combobox.js']) {
        assert.doesNotMatch(script(name), SORTING, `${name} keeps the server's order`);
      }
    },
  },
];

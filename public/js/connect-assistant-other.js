// The Other tab of the "File with AI" modal: Claude Code (terminal) and Cursor (one-click link).
(function () {
  const shell = window.ConnectAssistant;
  const shared = window.ConnectAssistantShared;
  const config = window.ConnectAssistantConfig;
  if (!shell || !shared || !config) return;
  const panel = shell.panelFor('other');
  const COMMAND_LABEL = 'Command';
  const CLAUDE_CODE_TITLE = 'Claude Code';
  const CLAUDE_CODE_HINT = 'Run this in your terminal.';
  const CURSOR_TITLE = 'Cursor';
  const CURSOR_LABEL = 'Add to Cursor';
  const CURSOR_HINT = 'This opens Cursor and asks you to confirm.';

  function section(title, hint) {
    const box = shared.el('section', 'connect-assistant__section');
    box.append(shared.el('h3', 'connect-assistant__section-title', title), shared.el('p', 'connect-assistant__note', hint));
    return box;
  }

  function claudeCodeSection() {
    const box = section(CLAUDE_CODE_TITLE, CLAUDE_CODE_HINT);
    box.append(shell.copyRow(COMMAND_LABEL, config.claudeCodeCommand(config.MCP_ADDRESS)));
    return box;
  }

  // A cursor:// link is not a web page, so it is a plain link that the browser hands to the Cursor app.
  function cursorSection() {
    const box = section(CURSOR_TITLE, CURSOR_HINT);
    const link = shared.el('a', 'ui-btn connect-assistant__open-btn', CURSOR_LABEL);
    link.href = config.cursorInstallLink(config.MCP_ADDRESS);
    box.append(link);
    return box;
  }

  panel.append(claudeCodeSection(), cursorSection(), shared.exampleCard(), shared.safetyNote());
})();

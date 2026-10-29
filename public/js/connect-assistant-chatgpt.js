// The ChatGPT tab of the "File with AI" modal. The labels are the ones ChatGPT shows on screen.
(function () {
  const shell = window.ConnectAssistant;
  const shared = window.ConnectAssistantShared;
  const config = window.ConnectAssistantConfig;
  if (!shell || !shared) return;
  const panel = shell.panelFor('chatgpt');
  const OPEN_LABEL = 'Copy address & open ChatGPT';
  const CHATGPT_URL = 'https://chatgpt.com';
  const GUIDE_URL = 'https://developers.openai.com/api/docs/guides/custom-mcp-server';
  const NAME_FIELD = 'Name';
  const ADDRESS_FIELD = 'Server URL';
  const AUTH_FIELD = 'Authentication';
  const NO_AUTH = 'No authentication';
  const WARNING_HEADLINE = 'Authentication starts on OAuth.';
  const WARNING_DETAIL = `Change it to ${NO_AUTH}, or the connection will fail.`;
  const STEPS = [
    ['In ChatGPT open ', { bold: 'Plugins' }, ' in the left sidebar.'],
    ['Click ', { bold: 'Add' }, ', then ', { bold: 'Add custom MCP server' }, '.'],
    ['In ', { bold: NAME_FIELD }, ' type the name:'],
    ['Under ', { bold: 'Connection' }, ' keep ', { bold: ADDRESS_FIELD }, ' selected and paste the address:'],
    ['Set ', { bold: AUTH_FIELD }, ' to ', { bold: NO_AUTH }, '.'],
    ['Tick ', { bold: 'I understand and want to continue' }, '.'],
    ['Click ', { bold: 'Create as a plugin' }, '. If it asks, enable it for your chat.'],
  ];
  const NAME_STEP = 2;
  const ADDRESS_STEP = 3;
  const AUTH_STEP = 4;

  function authWarning() {
    const box = shared.el('div', 'connect-assistant__warning');
    box.setAttribute('role', 'note');
    box.append(
      shared.el('strong', 'connect-assistant__warning-title', WARNING_HEADLINE),
      shared.el('span', '', WARNING_DETAIL),
    );
    return box;
  }

  const list = shared.steps(STEPS);
  list.children[NAME_STEP].append(shell.copyRow(NAME_FIELD, config.CONNECTOR_NAME));
  list.children[ADDRESS_STEP].append(shell.copyRow(ADDRESS_FIELD, config.MCP_ADDRESS));
  list.children[AUTH_STEP].append(authWarning());
  panel.append(
    shared.openButton(OPEN_LABEL, CHATGPT_URL, config.MCP_ADDRESS),
    list,
    shared.exampleCard(),
    shared.safetyNote(),
    shared.guideNote(GUIDE_URL),
  );
})();

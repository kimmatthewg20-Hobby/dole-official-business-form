// The Claude tab of the "File with AI" modal. The labels are the ones Claude shows on screen.
(function () {
  const shell = window.ConnectAssistant;
  const shared = window.ConnectAssistantShared;
  const config = window.ConnectAssistantConfig;
  if (!shell || !shared) return;
  const panel = shell.panelFor('claude');
  const OPEN_LABEL = 'Copy address & open Claude';
  const CLAUDE_URL = 'https://claude.ai';
  const NAME_FIELD = 'Name';
  const ADDRESS_FIELD = 'MCP server URL';
  const STEPS = [
    ['In Claude open ', { bold: 'Settings' }, ' and choose ', { bold: 'Connectors' }, '.'],
    ['Click ', { bold: 'Add' }, ', then ', { bold: 'Add custom connector' }, '.'],
    ['In ', { bold: NAME_FIELD }, ' type the name and in ', { bold: ADDRESS_FIELD }, ' paste the address:'],
    ['Click ', { bold: 'Continue' }, ' (then ', { bold: 'Add' }, ' if Claude asks).'],
  ];
  const VALUES_AFTER_STEP = 2;

  const list = shared.steps(STEPS);
  const valuesStep = list.children[VALUES_AFTER_STEP];
  valuesStep.append(
    shell.copyRow(NAME_FIELD, config.CONNECTOR_NAME),
    shell.copyRow(ADDRESS_FIELD, config.MCP_ADDRESS),
  );
  panel.append(
    shared.openButton(OPEN_LABEL, CLAUDE_URL, config.MCP_ADDRESS),
    list,
    shared.tip(),
  );
})();

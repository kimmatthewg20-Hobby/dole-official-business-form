// The address people paste into their AI assistant. It is fixed to the deployed site on purpose:
// the page may be opened on localhost, but an assistant can only reach the deployed address.
// Shared by the browser and the Node checks.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConnectAssistantConfig = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const SITE_ORIGIN = 'https://dole-official-business-form.vercel.app';
  const MCP_PATH = '/mcp';
  const MCP_ADDRESS = SITE_ORIGIN + MCP_PATH;
  const CONNECTOR_NAME = 'DOLE Official Business';

  return { SITE_ORIGIN, MCP_PATH, MCP_ADDRESS, CONNECTOR_NAME };
});

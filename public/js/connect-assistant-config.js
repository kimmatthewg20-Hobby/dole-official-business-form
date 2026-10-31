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

  const SERVER_NAME = 'dole-official-business';
  const CURSOR_INSTALL_URL = 'cursor://anysphere.cursor-deeplink/mcp/install';

  function toBase64(text) {
    return typeof btoa === 'function' ? btoa(text) : Buffer.from(text, 'utf8').toString('base64');
  }

  function claudeCodeCommand(address, name = SERVER_NAME) {
    return `claude mcp add --transport http ${name} ${address}`;
  }

  // Cursor reads the server config from the link itself, so one click installs it.
  function cursorInstallLink(address, name = SERVER_NAME) {
    const config = toBase64(JSON.stringify({ url: address }));
    return `${CURSOR_INSTALL_URL}?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
  }

  return { SITE_ORIGIN, MCP_PATH, MCP_ADDRESS, CONNECTOR_NAME, SERVER_NAME, claudeCodeCommand, cursorInstallLink };
});

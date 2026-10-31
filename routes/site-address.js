'use strict';

// The address this site was reached at, so the Assistant filing can hand staff a link that
// opens from their chat. Vercel sets the forwarded headers itself; anywhere else the caller
// writes them, so only a plain host name and a web scheme are accepted, never other text.

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;
const FORWARDED_HOST_HEADER = 'x-forwarded-host';
const FORWARDED_PROTO_HEADER = 'x-forwarded-proto';
const WEB_SCHEMES = ['http', 'https'];

function firstValue(header) {
  return typeof header === 'string' ? header.split(',')[0].trim() : '';
}

// Returns e.g. "https://example.vercel.app", or '' when the request names no usable host.
function siteAddress(req) {
  const host = firstValue(req.headers[FORWARDED_HOST_HEADER]) || firstValue(req.headers.host);
  if (!HOST_PATTERN.test(host)) return '';
  const forwardedScheme = firstValue(req.headers[FORWARDED_PROTO_HEADER]).toLowerCase();
  const scheme = WEB_SCHEMES.includes(forwardedScheme) ? forwardedScheme : req.protocol;
  return `${scheme}://${host}`;
}

module.exports = { siteAddress };

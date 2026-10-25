// The requests of the Employees tab. Each carries the admin session; the server refuses them
// without one, so a refusal is told to the admin as an ended session.
(function () {
  const ROUTE = '/api/employees';
  const UNAUTHORIZED = 401;
  const SESSION_ENDED = 'Your admin session has ended. Please log in again.';
  const UNREACHABLE = 'Could not reach the server. Please try again.';

  async function request(url, { method = 'GET', body, failure }) {
    let response;
    try {
      response = await fetch(url, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error(UNREACHABLE);
    }
    if (response.status === UNAUTHORIZED) throw new Error(SESSION_ENDED);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || failure);
    return data;
  }

  const entryUrl = (id) => `${ROUTE}/${encodeURIComponent(id)}`;

  window.AdminEmployeesApi = {
    list: (search) => request(`${ROUTE}?search=${encodeURIComponent(search)}`, { failure: 'Failed to load employees' }),
    save: (id, entry) => request(id ? entryUrl(id) : ROUTE, {
      method: id ? 'PUT' : 'POST',
      body: entry,
      failure: 'Failed to save employee',
    }),
    remove: (id) => request(entryUrl(id), { method: 'DELETE', failure: 'Failed to delete employee' }),
    history: (id, page) => request(`${entryUrl(id)}/history?page=${encodeURIComponent(page)}`, { failure: 'Failed to load travel history' }),
    form: (id) => request(`/api/entries/${encodeURIComponent(id)}`, { failure: 'Failed to load travel details' }),
    initialize: () => request(`${ROUTE}/initialize`, { method: 'POST', failure: 'Failed to load the starting list' }),
  };
})();

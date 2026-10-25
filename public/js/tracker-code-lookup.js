// The tracker's Reference code box: a pasted code finds that one form (ADR 0003). The code is
// sent in a POST body and never put in a query string, the page or the console, because it is
// the edit secret. Every value shown comes from staff, so it is escaped or set as text only.
(function (root) {
  const LOOKUP_ROUTE = '/api/lookup/code';
  const PRINT_ROUTE = '/print/';
  const CODE_REQUIRED_MESSAGE = 'Enter a Reference code.';
  const SEARCHING_MESSAGE = 'Looking up the form...';
  const UNREACHABLE_MESSAGE = 'Could not reach the server. Check your connection and try again.';
  const PRINT_LABEL = 'Print';
  const EDIT_LABEL = 'Edit this form';

  // The code goes to the form page in the address fragment only, which is never sent to the
  // server; the form page wipes it from the address as soon as it reads it.
  function editButton(code) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ui-btn';
    edit.textContent = EDIT_LABEL;
    edit.addEventListener('click', () => {
      window.location.assign(root.EditFragment.editLink(code));
    });
    return edit;
  }

  // Whoever typed the code holds it already, so the print page may show it in its header.
  function printLink(form, code) {
    const print = document.createElement('a');
    print.className = 'ui-btn ui-btn--secondary';
    print.href = `${PRINT_ROUTE}${encodeURIComponent(form.formData.id)}#code=${encodeURIComponent(code)}`;
    print.target = '_blank';
    print.rel = 'noopener';
    print.textContent = PRINT_LABEL;
    return print;
  }

  // The card markup escapes every value staff typed (tracker-details.js).
  function renderForm(result, form, code) {
    const card = document.createElement('div');
    card.innerHTML = root.TrackerDetails.cardHtml(form);
    const actions = document.createElement('div');
    actions.className = 'code-lookup-actions';
    actions.append(editButton(code), printLink(form, code));
    card.firstElementChild.appendChild(actions);
    result.replaceChildren(...card.childNodes);
  }

  function messageElement(message) {
    const text = document.createElement('p');
    text.className = 'code-lookup-message';
    text.textContent = message;
    return text;
  }

  function renderMessage(result, message) {
    result.replaceChildren(messageElement(message));
  }

  async function lookUp(code, result, button) {
    button.disabled = true;
    renderMessage(result, SEARCHING_MESSAGE);
    try {
      const response = await fetch(LOOKUP_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await response.json();
      if (response.ok) renderForm(result, body, code);
      else renderMessage(result, body.error || UNREACHABLE_MESSAGE);
    } catch (err) {
      renderMessage(result, UNREACHABLE_MESSAGE);
    } finally {
      button.disabled = false;
    }
  }

  function attach({ form, input, result, button }) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.value.trim()) return renderMessage(result, CODE_REQUIRED_MESSAGE);
      lookUp(root.EditFragment.normaliseCode(input.value), result, button);
    });
  }

  root.TrackerCodeLookup = { attach };
})(window);

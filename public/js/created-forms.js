// The success screen's line for the created form, with its Reference code and a Copy button.
// The code is shown only here (ADR 0003), so staff are told to keep it.
(function (root) {
  const CODES_NOT_SHOWN_AGAIN =
    'Keep each Reference code. You need it to find or edit that form. The tracker never lists it ' +
    'and the printed form never carries it; the print page shows it once, for a form made just now.';
  const NO_CODE_TEXT = 'No Reference code';
  const COPY_LABEL = 'Copy';
  const COPIED_LABEL = 'Copied';
  const COPY_FAILED_LABEL = 'Select and copy';
  const PRINT_LABEL = 'Print';
  const LABEL_RESET_MS = 2000;

  // Older browsers and pages served without HTTPS have no async clipboard, so a hidden
  // text field and the older copy command stand in.
  function copyWithTextField(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      copied = false;
    }
    field.remove();
    return copied;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        return copyWithTextField(text);
      }
    }
    return copyWithTextField(text);
  }

  // When copying is refused, the code is selected so staff can copy it by hand.
  function selectText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function copyButton(code, codeElement) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-btn ui-btn--secondary created-form-copy';
    button.textContent = COPY_LABEL;
    button.setAttribute('aria-label', `Copy Reference code ${code}`);
    button.addEventListener('click', async () => {
      const copied = await copyText(code);
      if (!copied) selectText(codeElement);
      button.textContent = copied ? COPIED_LABEL : COPY_FAILED_LABEL;
      setTimeout(() => { button.textContent = COPY_LABEL; }, LABEL_RESET_MS);
    });
    return button;
  }

  // The code rides in the address fragment, so it reaches the print page's header without
  // the server ever seeing it.
  function printLink(form) {
    const link = document.createElement('a');
    link.className = 'ui-btn ui-btn--secondary created-form-copy';
    link.href = `/print/${form.id}#code=${encodeURIComponent(form.referenceCode)}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = PRINT_LABEL;
    link.setAttribute('aria-label', `Print form ${form.id}`);
    return link;
  }

  function formLine(form) {
    const line = document.createElement('div');
    line.className = 'created-form';
    const dates = document.createElement('div');
    dates.textContent = `Form No. ${form.id}: ` + root.DateWording.formatDateWording(form.datesOfOB);
    line.appendChild(dates);
    if (!form.referenceCode) {
      const none = document.createElement('div');
      none.textContent = NO_CODE_TEXT;
      line.appendChild(none);
      return line;
    }
    const codeRow = document.createElement('div');
    codeRow.className = 'created-form-code-row';
    const code = document.createElement('code');
    code.className = 'created-form-code';
    code.textContent = form.referenceCode;
    codeRow.append(code, copyButton(form.referenceCode, code), printLink(form));
    line.appendChild(codeRow);
    return line;
  }

  function render(container, forms) {
    const notice = document.createElement('p');
    notice.className = 'created-forms-notice';
    notice.textContent = CODES_NOT_SHOWN_AGAIN;
    container.replaceChildren(notice, ...forms.map(formLine));
  }

  root.CreatedForms = { render };
})(window);

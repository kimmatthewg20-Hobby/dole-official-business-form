// Page buttons shared by the lists of the admin page (« 1 2 3 4 5 »). The caller keeps the page
// number and the count; this only draws the buttons and tells which page was chosen.
(function () {
  const FIRST_PAGE = 1;
  const PAGE_BUTTONS = 5;
  const PAGES_BEFORE_CURRENT = 2;

  function pageButton(text, label, target, onChange, { disabled = false, current = false } = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = current ? 'pagination-btn active' : 'pagination-btn';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    if (current) button.setAttribute('aria-current', 'page');
    button.disabled = disabled;
    button.addEventListener('click', () => onChange(target));
    return button;
  }

  // Draws nothing for a single page, so short lists carry no controls.
  function render(nav, { page, totalPages, onChange }) {
    if (totalPages <= FIRST_PAGE) return nav.replaceChildren();
    const start = Math.max(FIRST_PAGE, page - PAGES_BEFORE_CURRENT);
    const end = Math.min(totalPages, start + PAGE_BUTTONS - 1);
    const buttons = [pageButton('«', 'Previous page', page - 1, onChange, { disabled: page === FIRST_PAGE })];
    for (let number = start; number <= end; number += 1) {
      buttons.push(pageButton(String(number), `Page ${number}`, number, onChange, { current: number === page }));
    }
    buttons.push(pageButton('»', 'Next page', page + 1, onChange, { disabled: page === totalPages }));
    nav.replaceChildren(...buttons);
  }

  window.AdminPagination = { render };
})();

// Lets the admin put the rows of a Form options list (Divisions, Approvers) in order: drag a
// row by its handle, or focus the handle and press ArrowUp or ArrowDown. Pointer Events are
// used rather than HTML drag and drop, which does not work with touch. The server keeps the
// order and checks the admin session; a move it refuses is undone.
(function () {
  const HANDLE_CLASS = 'list-sort-handle';
  const HANDLE_CELL_CLASS = 'list-sort-cell';
  const DRAGGING_ROW_CLASS = 'list-sort-row--dragging';
  const SORTING_PAGE_CLASS = 'list-sorting';
  const HANDLE_ICON = 'drag_indicator';
  const HANDLE_HINT = 'Drag to move, or press the Up and Down arrow keys';
  const PRIMARY_BUTTON = 0;
  const KEY_STEPS = { ArrowUp: -1, ArrowDown: 1 };
  const FEWEST_TO_ORDER = 2;
  const HALF = 2;

  const rowsOf = (list) => Array.from(list.children);
  const idsOf = (list) => rowsOf(list).map((row) => Number(row.dataset.id));
  const sameOrder = (first, second) =>
    first.length === second.length && first.every((id, index) => id === second[index]);
  const middleOf = (row) => {
    const box = row.getBoundingClientRect();
    return box.top + box.height / HALF;
  };

  // Text is set with textContent, so a stored name can never become page markup.
  function handleCell(name) {
    const cell = document.createElement('td');
    cell.className = HANDLE_CELL_CLASS;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = HANDLE_CLASS;
    handle.title = HANDLE_HINT;
    handle.setAttribute('aria-label', `Move ${name}`);
    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = HANDLE_ICON;
    handle.appendChild(icon);
    cell.appendChild(handle);
    return cell;
  }

  // config: { list (the tbody), status (an aria-live element), save(ids) -> Promise<boolean> }.
  // Rows carry data-id and data-name. Only the neighbours of the moving row are moved in the
  // page, so the row keeps its pointer capture and its handle keeps the keyboard focus.
  function attach({ list, status, save }) {
    let savedIds = [];
    let saving = false;
    let moreToSave = false;
    let drag = null;

    function putInOrder(ids) {
      const focused = document.activeElement;
      const byId = new Map(rowsOf(list).map((row) => [Number(row.dataset.id), row]));
      list.append(...ids.map((id) => byId.get(id)).filter(Boolean));
      if (focused && list.contains(focused)) focused.focus();
    }

    function announce(row) {
      const rows = rowsOf(list);
      status.textContent = `${row.dataset.name} moved to position ${rows.indexOf(row) + 1} of ${rows.length}`;
    }

    // One save at a time, so answers cannot arrive out of order; moves made meanwhile are
    // sent together once it ends.
    async function saveCurrentOrder() {
      if (saving) {
        moreToSave = true;
        return;
      }
      const ids = idsOf(list);
      if (sameOrder(ids, savedIds)) return;
      saving = true;
      const saved = await save(ids);
      saving = false;
      if (saved) savedIds = ids;
      else {
        moreToSave = false;
        putInOrder(savedIds);
      }
      if (moreToSave) {
        moreToSave = false;
        saveCurrentOrder();
      }
    }

    function moveUp(row) {
      list.insertBefore(row.previousElementSibling, row.nextElementSibling);
    }

    function moveDown(row) {
      list.insertBefore(row.nextElementSibling, row);
    }

    function startDrag(event) {
      const handle = event.target.closest(`.${HANDLE_CLASS}`);
      if (!handle || handle.disabled || event.button !== PRIMARY_BUTTON || drag) return;
      event.preventDefault();
      const row = handle.closest('tr');
      handle.setPointerCapture(event.pointerId);
      drag = { row, pointerId: event.pointerId, startIds: idsOf(list) };
      row.classList.add(DRAGGING_ROW_CLASS);
      document.body.classList.add(SORTING_PAGE_CLASS);
    }

    function followPointer(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { row } = drag;
      while (row.previousElementSibling && event.clientY < middleOf(row.previousElementSibling)) {
        moveUp(row);
      }
      while (row.nextElementSibling && event.clientY > middleOf(row.nextElementSibling)) {
        moveDown(row);
      }
    }

    function endDrag(event, dropped) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { row, startIds } = drag;
      drag = null;
      row.classList.remove(DRAGGING_ROW_CLASS);
      document.body.classList.remove(SORTING_PAGE_CLASS);
      if (!dropped) return putInOrder(startIds);
      if (sameOrder(idsOf(list), startIds)) return;
      announce(row);
      saveCurrentOrder();
    }

    function moveByKey(event) {
      const step = KEY_STEPS[event.key];
      const handle = event.target.closest(`.${HANDLE_CLASS}`);
      if (!step || !handle || handle.disabled || drag) return;
      event.preventDefault();
      const row = handle.closest('tr');
      const neighbour = step < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (neighbour) {
        if (step < 0) moveUp(row);
        else moveDown(row);
      }
      announce(row);
      if (neighbour) saveCurrentOrder();
    }

    list.addEventListener('pointerdown', startDrag);
    list.addEventListener('pointermove', followPointer);
    list.addEventListener('pointerup', (event) => endDrag(event, true));
    list.addEventListener('pointercancel', (event) => endDrag(event, false));
    list.addEventListener('lostpointercapture', (event) => endDrag(event, false));
    list.addEventListener('keydown', moveByKey);

    return {
      handleCell,
      // Called after the rows are drawn from the server: that order is the saved one.
      rendered() {
        savedIds = idsOf(list);
        const tooFew = savedIds.length < FEWEST_TO_ORDER;
        for (const handle of list.querySelectorAll(`.${HANDLE_CLASS}`)) handle.disabled = tooFew;
      },
    };
  }

  window.AdminListSort = { attach };
})();

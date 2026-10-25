// The Divisions manager under Form options, built on the shared list modal.
(function () {
  const fields = window.AdminListModal.create({
    route: '/api/divisions',
    listKey: 'divisions',
    prefix: 'division',
    noun: 'Division',
    fieldKeys: ['name', 'code'],
    removeQuestion: (name) => `Remove the Division "${name}"? Forms already made keep it.`,
  });

  fields.code.addEventListener('input', () => {
    fields.code.value = fields.code.value.toUpperCase();
  });
})();

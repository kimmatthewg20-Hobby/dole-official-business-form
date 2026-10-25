// The Approvers manager under Form options, built on the shared list modal.
(function () {
  window.AdminListModal.create({
    route: '/api/approvers',
    listKey: 'approvers',
    prefix: 'approver',
    noun: 'Approver',
    fieldKeys: ['name', 'position'],
    removeQuestion: (name) => `Remove the Approver "${name}"? Forms already made keep them.`,
  });
})();

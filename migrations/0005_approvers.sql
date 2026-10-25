-- The Approver list the admin keeps (GLOSSARY.md): who may be named as "Approved by".
-- Forms keep the approver's name and position as plain text, without a link to this table,
-- so editing or removing an Approver never changes a stored form.

CREATE TABLE approvers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position TEXT NOT NULL
);

-- The list is sorted by name. One person may hold two positions (an officer in charge, say),
-- but the same name and position, whatever the capitals, appear only once.
CREATE UNIQUE INDEX idx_approvers_name ON approvers (name COLLATE NOCASE, position COLLATE NOCASE);

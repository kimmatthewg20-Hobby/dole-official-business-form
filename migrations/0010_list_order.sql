-- The admin sets the order of the Divisions and the Approvers, and staff see them in it
-- (GLOSSARY.md). Existing rows start in the order they were listed until now, so nothing
-- moves for staff on the day this is applied.

ALTER TABLE divisions ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE approvers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE divisions SET sort_order = (
  SELECT ranked.place FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name COLLATE NOCASE, id) AS place FROM divisions
  ) AS ranked
  WHERE ranked.id = divisions.id
);

UPDATE approvers SET sort_order = (
  SELECT ranked.place FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name COLLATE NOCASE, position, id) AS place
    FROM approvers
  ) AS ranked
  WHERE ranked.id = approvers.id
);

CREATE INDEX idx_divisions_sort_order ON divisions (sort_order);
CREATE INDEX idx_approvers_sort_order ON approvers (sort_order);

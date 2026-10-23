// project-setup: give each installed skill its model and effort (re-run after `npx skills update`).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const map = {
  'grill-with-docs': ['opus', 'medium'], grilling: ['opus', 'medium'], 'domain-modeling': ['opus', 'medium'],
  wayfinder: ['opus', 'medium'], 'improve-codebase-architecture': ['opus', 'medium'], 'codebase-design': ['opus', 'medium'],
  'diagnosing-bugs': ['opus', 'high'],
  'to-spec': ['sonnet', 'medium'], 'to-tickets': ['sonnet', 'medium'], implement: ['sonnet', 'medium'],
  tdd: ['sonnet', 'medium'], 'code-review': ['sonnet', 'medium'], 'setup-matt-pocock-skills': ['sonnet', 'medium'],
  research: ['sonnet', 'low'], prototype: ['sonnet', 'low'], ship: ['sonnet', 'medium'],
};
let done = 0;
for (const [name, [model, effort]] of Object.entries(map)) {
  const f = `.claude/skills/${name}/SKILL.md`;
  if (!existsSync(f)) { console.log(`missing: ${name}`); continue; }
  const text = readFileSync(f, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { console.log(`no frontmatter: ${name}`); continue; }
  const lines = m[1].split('\n').filter(l => !/^(model|effort):/.test(l));
  lines.push(`model: ${model}`, `effort: ${effort}`);
  writeFileSync(f, `---\n${lines.join('\n')}\n---\n` + text.slice(m[0].length));
  done++;
}
console.log(`models set on ${done} skills`);

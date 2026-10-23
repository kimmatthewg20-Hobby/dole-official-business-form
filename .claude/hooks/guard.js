#!/usr/bin/env node
// PreToolUse guard (project-setup). Exit 2 = block (stderr goes to Claude). Exit 0 = allow.
let raw = '';
process.stdin.on('data', d => (raw += d)).on('end', () => {
  let cmd = '';
  try { cmd = (JSON.parse(raw).tool_input || {}).command || ''; } catch { process.exit(0); }
  // Ignore quoted text (commit messages, echo strings) so words inside them never trigger a rule.
  const bare = cmd.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const rules = [
    [/\bgit\b[^;&|]*\bpush\b/, 'git push (Kim pushes)'],
    [/\breset\s+--hard\b/, 'git reset --hard'],
    [/\bgit\b[^;&|]*\bclean\b[^;&|]*\s-\w*f/, 'git clean -f'],
    [/\bbranch\s+-D\b/, 'git branch -D'],
    [/\bgit\b[^;&|]*\b(checkout|restore)\s+(--\s+)?\.(\s|$)/, 'discarding all changes'],
    [/--no-verify\b|\bcommit\b(\s+-[a-zA-Z]*n[a-zA-Z]*)\b/, 'skipping the pre-commit checks'],
    [/\bvercel\b[^;&|]*(--prod\b|\bdeploy\b|\bpromote\b|\brollback\b|\b(rm|remove)\b)/, 'Vercel deploys or deletes'],
    [/\bsupabase\b[^;&|]*(\bdb\s+push\b|--linked\b|\bprojects\s+delete\b)/, 'changing the live Supabase database'],
    [/\brm\s+-\w*r\w*\s+(\/|~\/?|\$HOME\/?)(\s|$)/, 'deleting the root or home folder'],
    [/\b(cat|less|more|head|tail|grep|sed|awk|source|bat|cp|mv)\b[^;&|]*\.env(?!\.example)(\.[\w-]+)?(\s|$|")/, 'reading secrets (.env)'],
    [/^\s*(printenv|env)\s*$/, 'dumping environment secrets'],
  ];
  for (const [re, what] of rules) {
    if (re.test(bare) || (/\.env/.test(cmd) && re.test(cmd) && /secrets/.test(what))) { console.error(`BLOCKED by project guard: ${what}. Kim does this himself.`); process.exit(2); }
  }
  process.exit(0);
});

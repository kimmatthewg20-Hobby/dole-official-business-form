---
status: accepted
---

# Assistant filing: an open, stateless MCP endpoint that files directly

Staff may file an Official Business form through their own AI assistant (Claude, ChatGPT, a local model) over a remote MCP endpoint on the same Vercel app. The server never calls an LLM and holds no AI keys, so it costs nothing extra. The endpoint needs no login, like the form itself, and is held back only by a per-source limit. The assistant files as soon as nothing is unclear, with no person reviewing a draft first, and hands back the print link and the Reference code.

## Considered Options

- **A draft link the staff member reviews and submits.** Rejected: the staff asked for filing with no extra step. A wrong filing is corrected through the Reference code.
- **A local MCP package run over stdio.** Rejected: every office PC would need Node and setup.
- **An office key pasted into each AI connector.** Rejected for now: more setup, and the website has no such key. Add it if abuse shows up.
- **Elicitation (client-side choice forms).** Rejected: client support is uneven and it needs a connection held open, which a stateless endpoint on Vercel cannot do. Choices come from tool results instead.

## Consequences

- Anyone with the URL can file, exactly as with the website, so the per-source limit (the Lockout idea, kept in the database) is required.
- The Reference code now sits in a chat with a third-party AI provider. Anyone who can read that chat can edit the form (see ADR 0003). We accept this because staff asked for it.
- The tools return the print link, which opens by sequential id. That exposure already exists on the website and is left for a separate change.
- A file the staff member uploads (memo, invitation) is read by their assistant only. The assistant writes the purpose in one or two short sentences and nothing is stored.
- Adds the `@modelcontextprotocol/sdk` dependency, agreed for this feature.

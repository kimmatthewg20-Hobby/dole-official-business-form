# Assistant filing: connecting your AI assistant

## How staff connect their assistant

You can ask your own AI assistant to file an Official Business form for you. You do not log in and you install nothing. You only paste one web address into your assistant.

The address is the website's address followed by `/mcp`:

`https://<the site address>/mcp`

Kim gives you the real site address. Use exactly that, ending in `/mcp`.

Where to paste it (menu names may differ by version, so look for the same idea):

- **Claude:** Settings, then Connectors, then add a custom connector. Paste the address.
- **ChatGPT:** Settings, then Connectors (or developer mode, if your account shows it). Add the address.
- **Another program:** add it as a remote server that uses "streamable HTTP". If you are not sure, ask the person who set it up.

If you cannot find these menus, check your assistant's help page for "custom connector" or "MCP server".

Then ask it in plain words, for example:

> File an OB for me and Juan Dela Cruz on November 8, 2026 to Brgy. 8, Mercedes, 7am to 6pm, to attend the MCDC meeting.

The assistant asks you only for what is missing, such as a Division or the Approver. It does not ask you to confirm again once it has what it needs. When the form is filed, it tells you:

- the **print link**, which opens the form to print (two forms per page),
- the **Reference code**, and a short summary of what it filed.

The Reference code appears in your chat. Anyone who can read that chat can edit the form with the code. Do not share the chat.

To correct a form, go to the website and use the **Reference code** to find it. The assistant cannot edit, delete or list forms.

You can upload a memo or invitation to the assistant. It reads the memo, writes the purpose in one or two short sentences, and takes the dates, place and time from it if you leave them out. The memo is read only by your own assistant. The site does not store the memo. Only the purpose text is kept.

There is a limit: about 30 filings in 15 minutes from one internet address. If you go over it, the assistant tells you to wait and try again later.

## TEST IT YOURSELF

Do this on the staging preview after the cutover steps, or locally first. Connect the assistant you use at the office, then work through the list.
Locally: `npm start` (then open http://localhost:3000), and connect a local client to http://localhost:3000/mcp as a remote streamable-HTTP server.

Check what your client supports before you rely on it. If a menu is missing, note the client version and look for its MCP or custom connector help page; do not assume it works.

- [ ] **"Me" plus a colleague.** Ask: "File an OB for me and <colleague's name> on <a date> to <place>, <time>, for <purpose>." The assistant knows your name, finds the colleague in the Employee directory, files the form, and gives you a print link and a Reference code. Open the print link: the form shows both names. Then open the Reference code lookup on the website and edit the form there.
- [ ] **Employee not in the directory.** Ask for an employee who is not in the directory. The assistant asks for the full name, position and assigned unit. After filing, open `/admin`, the **Employees** tab: the new entry is there with that unit.
- [ ] **Uploaded memo or invitation.** Upload a memo or invitation and leave out the purpose, dates, place and time. The purpose is one or two short sentences. The dates, place and time are taken from the memo.
- [ ] **Provincial Head among the employees.** Name a Provincial Head from the directory. The form's Approver is the Regional Director. Then file with no Provincial Head among the employees: the Approver is the Provincial Head. Name a different Approver: that Approver wins.
- [ ] **Refused filings.** Ask for a Division that does not exist: the assistant shows the plain message and files nothing. Then file about 30 forms from one address within 15 minutes: the next one is refused with "Too many forms filed from this address. Try again in N minutes."
- [ ] **Separated Dates.** Ask: "Nov 3 in Legazpi, Nov 5 in Daet." Open the print link: one form per day, each with its own date.
- [ ] **No edit, delete or list.** Ask the assistant to change, delete or list an existing form. It says it cannot, because it has no such tool. Make the change on the website with the Reference code instead.

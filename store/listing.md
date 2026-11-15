# Chrome Web Store listing

Copy these into the Developer Dashboard.

## Store listing tab

**Category:** Developer Tools (or Education)

**Language:** English

**Summary** (from manifest):
Finds problems marked as solved on NeetCode but not actually solved on LeetCode.

**Description:**

Practising with NeetCode's problem lists but submitting on LeetCode? The two can drift apart: it's easy to tick a problem off on NeetCode without ever getting an accepted submission on LeetCode.

This extension compares the two for you:

- Reads your completed problems from NeetCode
- Reads your accepted submissions from LeetCode
- Lists every problem that's marked solved on NeetCode but not solved on LeetCode, with a link to each one
- Highlights those problems in red on the NeetCode page

How to use:
1. Log in to both neetcode.io and leetcode.com
2. Open a NeetCode problem list (e.g. neetcode.io/practice)
3. Click the extension icon, then "Find Missing Problems"

Everything runs locally in your browser. No account, no server, no tracking.

Not affiliated with NeetCode or LeetCode.

**Images:**
- Icon: icons/icon128.png
- Screenshot: store/screenshot-1280x800.png
- Small promo tile: store/promo-440x280.png

## Privacy practices tab

**Single purpose:**
Compare a user's completed problems on NeetCode with their accepted submissions on LeetCode and show which ones are missing on LeetCode.

**activeTab justification:**
Used to access the neetcode.io tab the user is viewing when they click the extension button, so it can read their NeetCode progress and highlight mismatched problems on that page.

**scripting justification:**
Injects a script into the active neetcode.io tab, only when the user clicks the button, to read their completed problems and highlight the problems that aren't solved on LeetCode.

**Host permission (leetcode.com) justification:**
Needed to fetch the user's list of accepted problems from leetcode.com using their existing login, so it can be compared with their NeetCode progress.

**Remote code:** No, I am not using remote code.

**Data usage**, tick:
- Authentication information (the NeetCode login token saved in the browser, sent only to NeetCode's own API)
- Website content (the user's problem progress on NeetCode and LeetCode)

Then tick all three certifications (not sold, not used for unrelated purposes, not used for creditworthiness).

**Privacy policy URL:**
https://github.com/colin-110/neetcode_leetcode_syncer/blob/main/PRIVACY.md

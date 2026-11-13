// runs in the neetcode tab, returns solved problems as leetcode slugs
// order: neetcode api -> localStorage cache -> scrape the page
async function collectNeetcodeSolved() {
  const log = [];
  const strip = (s) => (s || '').replace(/\/+$/, '');

  // --- Problem table from NeetCode's main bundle:
  // {problem:"Contains Duplicate",...,link:"contains-duplicate/",...,ncLink:"duplicate-integer/"}
  const lcToNc = {}, ncToLc = {}, lcTitle = {};
  try {
    const script = [...document.scripts].find(s => /\/main\.[^/]*\.js/.test(s.src) || /^main\./.test(s.getAttribute('src') || ''));
    if (!script) throw new Error('main bundle <script> not found');
    const js = await (await fetch(script.src)).text();
    (js.match(/\{problem:"[^"]*"[^{}]*\}/g) || []).forEach(o => {
      const title = o.match(/^\{problem:"([^"]*)"/)[1];
      const lc = o.match(/\blink:"([^"]*)"/);
      const nc = o.match(/\bncLink:"([^"]*)"/);
      if (!lc) return;
      const lcSlug = strip(lc[1]).split('/').pop();
      lcTitle[lcSlug] = title;
      if (nc) { lcToNc[lcSlug] = strip(nc[1]); ncToLc[strip(nc[1])] = lcSlug; }
    });
    log.push(`problem table: ${Object.keys(lcTitle).length} problems`);
  } catch (e) {
    log.push(`problem table: FAILED (${e.message})`);
  }

  // Turn NeetCode's {pattern: [link, ...]} progress object into LeetCode slugs
  const fromProgressObject = (completed) => {
    const out = new Map();
    Object.values(completed || {}).flat().forEach(entry => {
      if (typeof entry !== 'string') return;
      const m = entry.match(/leetcode\.com\/problems\/([^/?#]+)/);
      const lcSlug = m ? m[1] : strip(entry).split('/').pop();
      if (!m && Object.keys(lcTitle).length && !(lcSlug in lcTitle)) return; // non-LeetCode item
      if (!out.has(lcSlug)) out.set(lcSlug, { lcSlug, ncSlug: lcToNc[lcSlug] || lcSlug, title: lcTitle[lcSlug] || lcSlug });
    });
    return out;
  };

  // --- Source 1: NeetCode API
  try {
    const token = await getFirebaseIdToken();
    if (!token) throw new Error('not signed in to NeetCode (no Firebase session found)');
    const res = await fetch('/api/callableFunctionHttp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ data: { functionId: 'getCompletedProblems' } })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const completed = body?.data ?? body?.result ?? body;
    const solved = fromProgressObject(completed);
    log.push(`NeetCode API: ${solved.size} solved`);
    if (solved.size) return { solved: [...solved.values()], source: 'NeetCode API', log };
  } catch (e) {
    log.push(`NeetCode API: FAILED (${e.message})`);
  }

  // --- Source 2: localStorage caches
  for (const key of ['synced-progress-cache', 'completed-problem-list']) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      const completed = key === 'synced-progress-cache' ? raw?.completed : raw;
      const solved = fromProgressObject(completed);
      log.push(`localStorage "${key}": ${raw ? solved.size + ' solved' : 'missing'}`);
      if (solved.size) return { solved: [...solved.values()], source: `localStorage (${key})`, log };
    } catch (e) {
      log.push(`localStorage "${key}": FAILED (${e.message})`);
    }
  }

  // --- Source 3: scrape visible solved rows
  const solved = new Map();
  let rows = 0;
  document.querySelectorAll('a[href*="/problems/"]').forEach(link => {
    if (link.href.includes('leetcode.com')) return;
    const row = link.closest('tr');
    if (!row) return;
    const isSolved = row.classList.contains('completed') ||
      row.querySelector('[data-tooltip="Solved"], .is-completed');
    if (!isSolved) return;
    rows++;
    const m = link.href.match(/\/problems\/([^/?#]+)/);
    if (!m) return;
    const ncSlug = m[1];
    const lcSlug = ncToLc[ncSlug] || (Object.keys(ncToLc).length ? null : ncSlug);
    if (!lcSlug) return; // not a LeetCode problem (e.g. course lessons)
    if (!solved.has(lcSlug)) solved.set(lcSlug, { lcSlug, ncSlug, title: lcTitle[lcSlug] || link.textContent.replace(/[⚠️]/g, '').trim() });
  });
  log.push(`page scrape: ${rows} solved rows, ${solved.size} LeetCode problems`);
  return { solved: [...solved.values()], source: 'page', log };

  // Reads the Firebase ID token the NeetCode site stores for the signed-in user,
  // refreshing it if expired.
  async function getFirebaseIdToken() {
    let user = null;
    try {
      user = await new Promise((resolve, reject) => {
        const req = indexedDB.open('firebaseLocalStorageDb');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return resolve(null); }
          const getAll = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
          getAll.onerror = () => reject(getAll.error);
          getAll.onsuccess = () => {
            db.close();
            const item = (getAll.result || []).find(r => String(r.fbase_key || '').startsWith('firebase:authUser:'));
            resolve(item ? item.value : null);
          };
        };
      });
    } catch (e) { /* try localStorage below */ }
    if (!user) {
      const k = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'));
      if (k) user = JSON.parse(localStorage.getItem(k));
    }
    if (!user || !user.stsTokenManager) return null;

    const { accessToken, refreshToken, expirationTime } = user.stsTokenManager;
    if (accessToken && expirationTime && expirationTime > Date.now() + 60000) return accessToken;
    if (!refreshToken || !user.apiKey) return accessToken || null;

    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(user.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
    });
    if (!res.ok) throw new Error(`token refresh HTTP ${res.status}`);
    return (await res.json()).id_token;
  }
}

document.getElementById('checkBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  const resultList = document.getElementById('resultList');
  const debugEl = document.getElementById('debug');

  statusEl.innerText = "Loading...";
  resultList.innerHTML = "";
  debugEl.innerText = "";
  const debug = [];
  const showDebug = () => { debugEl.innerText = debug.join('\n'); };

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes("neetcode.io")) {
      statusEl.innerText = "Error: Please open this extension while viewing neetcode.io.";
      return;
    }

    // 1. Get solved problems from NeetCode
    statusEl.innerText = "Reading NeetCode progress...";
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectNeetcodeSolved
    });
    const { solved = [], source, log = [] } = injection?.result || {};
    debug.push(...log);
    showDebug();

    if (solved.length === 0) {
      statusEl.innerText = "No solved problems found on NeetCode. Make sure you're signed in to NeetCode. Details below.";
      return;
    }

    // 2. Grab LeetCode progress
    statusEl.innerText = "Fetching LeetCode data...";
    const leetcodeRes = await fetch("https://leetcode.com/api/problems/algorithms/", {
      method: "GET",
      credentials: "include"
    });

    if (!leetcodeRes.ok) {
      debug.push(`LeetCode API: HTTP ${leetcodeRes.status}`);
      showDebug();
      statusEl.innerText = "Error fetching from LeetCode. Open leetcode.com in a tab, make sure you're logged in, then try again.";
      return;
    }

    const leetcodeJson = await leetcodeRes.json();
    const normTitle = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const leetcodeSolvedSlugs = new Set();
    const leetcodeSolvedTitles = new Set();
    (leetcodeJson.stat_status_pairs || []).forEach(pair => {
      if (pair.status === "ac") {
        leetcodeSolvedSlugs.add(pair.stat.question__title_slug);
        leetcodeSolvedTitles.add(normTitle(pair.stat.question__title));
      }
    });
    debug.push(`LeetCode API: user "${leetcodeJson.user_name || ''}", ${leetcodeSolvedSlugs.size} solved`);
    showDebug();

    if (!leetcodeJson.user_name) {
      statusEl.innerText = "LeetCode says you're not logged in. Log in at leetcode.com and try again.";
      return;
    }

    // 3. Compare (by slug, with title match as fallback)
    const missing = solved.filter(p =>
      !leetcodeSolvedSlugs.has(p.lcSlug) && !leetcodeSolvedTitles.has(normTitle(p.title))
    );

    if (missing.length === 0) {
      statusEl.innerText = `Found ${solved.length} solved problems on NeetCode (via ${source}). All of them are solved on LeetCode!`;
      return;
    }

    // 4. Highlight missing problems on the page (only visible/expanded rows can be highlighted)
    const [highlight] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [missing.map(p => p.ncSlug)],
      func: (slugsToHighlight) => {
        const targets = new Set(slugsToHighlight);
        let count = 0;
        document.querySelectorAll('a[href*="/problems/"]').forEach(link => {
          const m = link.href.match(/\/problems\/([^/?#]+)/);
          if (!m || !targets.has(m[1]) || link.href.includes('leetcode.com')) return;
          Object.assign(link.style, {
            backgroundColor: '#ffcccc', border: '2px dashed red', padding: '2px 6px',
            borderRadius: '4px', color: '#cc0000', fontWeight: 'bold'
          });
          if (!link.textContent.includes('⚠')) link.prepend('⚠️ ');
          count++;
        });
        return count;
      }
    });
    const highlighted = highlight?.result || 0;

    missing.forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `https://leetcode.com/problems/${p.lcSlug}/`;
      a.target = '_blank';
      a.textContent = p.title || p.lcSlug;
      li.appendChild(a);
      resultList.appendChild(li);
    });

    statusEl.innerText = `${solved.length} solved on NeetCode (via ${source}). ${missing.length} not solved on LeetCode:` +
      (highlighted ? ` (${highlighted} highlighted on the page)` : '');

  } catch (error) {
    statusEl.innerText = `Error: ${error.message}`;
    debug.push(`exception: ${error.stack || error.message}`);
    showDebug();
    console.error(error);
  }
});

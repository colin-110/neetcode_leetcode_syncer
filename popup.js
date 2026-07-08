document.getElementById('checkBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  const resultList = document.getElementById('resultList');
  
  statusEl.innerText = "Loading...";
  resultList.innerHTML = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes("neetcode.io")) {
      statusEl.innerText = "Error: Please open this extension while viewing neetcode.io.";
      return;
    }

    // 1. Scrape the page for visible green checkmarks
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const solved = [];
        const links = document.querySelectorAll('a[href*="/problems/"]');
        
        links.forEach(link => {
          // Find the row container for this problem link
          const row = link.closest('tr') || link.parentElement.parentElement;
          
          if (row) {
            // Look for green text classes or checkmark icons in the row's HTML
            const html = row.innerHTML.toLowerCase();
            if (html.includes('text-green') || html.includes('text-emerald') || html.includes('check')) {
              const parts = link.href.split('/').filter(Boolean);
              const slug = parts[parts.length - 1];
              if (slug && slug !== 'problems') solved.push(slug);
            }
          }
        });
        return solved;
      }
    });

    const neetcodeData = injectionResults[0].result;
    if (!neetcodeData || neetcodeData.length === 0) {
       statusEl.innerText = "No solved problems found. Please make sure your categories are EXPANDED on the page so the checkmarks are visible!";
       return;
    }
    
    const neetcodeSlugs = new Set(neetcodeData);

    // 2. Grab LeetCode progress
    statusEl.innerText = "Fetching LeetCode data...";
    const leetcodeRes = await fetch("https://leetcode.com/api/problems/algorithms/", {
      method: "GET",
      credentials: "include" 
    });

    if (!leetcodeRes.ok) {
      statusEl.innerText = "Error fetching from LeetCode. Are you logged in?";
      return;
    }

    const leetcodeJson = await leetcodeRes.json();
    const leetcodeSolvedSlugs = new Set();
    
    if (leetcodeJson.stat_status_pairs) {
      leetcodeJson.stat_status_pairs.forEach(pair => {
        if (pair.status === "ac") {
          leetcodeSolvedSlugs.add(pair.stat.question__title_slug);
        }
      });
    }

    // 3. Compare the two lists
    const missingSlugs = [];
    neetcodeSlugs.forEach(slug => {
      if (!leetcodeSolvedSlugs.has(slug)) {
        missingSlugs.push(slug);
      }
    });

    // 4. Inject script to highlight missing problems
    if (missingSlugs.length === 0) {
      statusEl.innerText = `Found ${neetcodeSlugs.size} solved problems. All of them are successfully solved on LeetCode!`;
    } else {
      statusEl.innerText = `Highlighting problems...`;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [missingSlugs],
        func: (slugsToHighlight) => {
          const links = document.querySelectorAll('a[href*="leetcode.com/problems/"]');
          let highlightedCount = 0;

          links.forEach(link => {
            const urlParts = link.href.split('/').filter(Boolean);
            const slug = urlParts[urlParts.length - 1];

            if (slugsToHighlight.includes(slug)) {
              link.style.backgroundColor = '#ffcccc';
              link.style.border = '2px dashed red';
              link.style.padding = '2px 6px';
              link.style.borderRadius = '4px';
              link.style.color = '#cc0000';
              link.style.fontWeight = 'bold';

              if (!link.innerHTML.includes('\u26A0')) {
                link.innerHTML = `\u26A0\uFE0F ${link.innerHTML}`;
              }
              highlightedCount++;
            }
          });
          
          return highlightedCount;
        }
      });

      statusEl.innerText = `Checked ${neetcodeSlugs.size} problems. Highlighted ${missingSlugs.length} missing problem(s) in red on the page!`;
    }

  } catch (error) {
    statusEl.innerText = `Error: ${error.message}`;
    console.error(error);
  }
});
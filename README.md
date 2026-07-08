# NeetCode ↔ LeetCode Sync Checker

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A lightweight developer tool that synchronizes your algorithm practice progress by comparing visually completed problems on [NeetCode](https://neetcode.io/) against your actual accepted submissions via the [LeetCode](https://leetcode.com/) API.

##  Overview

It is common for developers to track their study progress on NeetCode while submitting their actual code on LeetCode. Over time, these two platforms can fall out of sync. This Chrome Extension acts as a localized bridge, fetching your true solved state directly from LeetCode and visually highlighting any discrepancies on the NeetCode UI.

### Key Features
***Seamless UI Integration:** Injects visual indicators (red dashed borders and ⚠️ icons) directly into the NeetCode DOM for missing problems.
 **Direct API Validation:** Bypasses manual entry by securely querying LeetCode's internal `/api/problems/algorithms/` endpoint using your active session authenticated cookies.
 **Privacy First:** All data processing happens entirely locally within the browser. No data is sent to external servers or third-party databases.

---

##  Installation

This extension is designed for local installation via Chrome's Developer Mode.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/colin-110/neetcode-sync-checker.git](https://github.com/colin-110/neetcode_leetcode_syncer.git)
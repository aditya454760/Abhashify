# Abhyashify study timer (Chrome / Edge extension)

A web page cannot see which other sites you use. This small extension does that part on a laptop or desktop: it counts the time you spend on the study sites you choose (YouTube, NPTEL, GATE Overflow and any you add) and hands the totals to Abhyashify, which logs them against the matching study tool. You are not asked each time.

## Install (unpacked, for now)

1. Open `chrome://extensions` (or `edge://extensions`) and turn on Developer mode.
2. Choose **Load unpacked** and pick this `extension` folder.
3. Open Abhyashify in the same browser, then Plan → Study tools and permissions → turn on automatic tracking. The sites you added there are sent to the extension on their own; you can also add sites from the extension's popup.

It is not in the Chrome Web Store, so Chrome may remind you at start-up that it is an unpacked developer extension.

## What it keeps

- Only the site name (for example `youtube.com`) and the minutes per day, for the last 60 days, in the extension's own storage.
- Never page addresses, page titles, search text or page content. Sites that are not on your list are not recorded at all.
- Nothing is sent over the network. The only place the totals go is the Abhyashify page you have open (`https://aditya454760.github.io/Abhyashify/`), and only when that page asks, and only after you turned tracking on there.
- The `tabs` permission is needed to see the address of the tab you are looking at, so it can tell whether it is on one of your sites. Nothing else is read from tabs.

## What counts as study time

The tab is the active tab in the browser window you are using, and you are not idle. A lecture that is playing sound still counts when you stop touching the keyboard; a locked screen does not. A single check never adds more than three minutes, so a sleeping laptop cannot inflate a day.

## Limits (honest list)

- Chrome and Edge only (Manifest V3). Firefox and Safari are not covered.
- It sees browser tabs only, not desktop apps (a PDF reader, VS Code).
- Totals are per day and are imported as one entry per site per day, so they have no start time; the report's time-of-day chart leaves them out, like the phone totals.
- If the same minutes are also timed with Abhyashify's own timer, they may be counted twice. Use one or the other for a given session.
- The page connection is set up for the live site. To use a different address (for example your own copy), add it to `content_scripts.matches` in `manifest.json`.
- Tested in real Chromium with the extension loaded (`python3 extension/test/ext.test.py`): hand-over of the site list, counting only chosen sites, nothing stored about other sites, pause, import into the app, no duplicates, consent off. Not tested: Edge, a long real study day, and the live GitHub Pages address (the test uses a local copy).

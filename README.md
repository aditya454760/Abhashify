# Abhyashify

I'm preparing for GATE DA 2027 (exam on 6 February 2027, aiming for IISc or a top IIT, which means a score around 850 or more). Abhyashify is the study planner I built to keep myself honest. It plans my study blocks, rings an alarm when one is due, asks me to log what I actually did, and at the end of the week shows how the week went compared to the plan.

You can try it here: **https://aditya454760.github.io/Abhyashify/**

## What it does

- Builds a day-by-day schedule from my subjects and the exam date, and keeps a revision buffer at the end.
- Rings an alarm shortly before each block (while the page is open).
- Lets me log a session by hand or run a timer, and gives me a weekly report.
- Tracks study material (books, lecture playlists, problem sets) and how much of each I've finished.
- Syncs through Google sign-in, so the phone, tablet and laptop all show the same data. If I study on my phone and my laptop at the same time for the same course, that overlap is counted once, not twice.

## Installing it like a normal app

Open the link above in Chrome or Edge. On a computer there's an install icon in the address bar. On Android, open the browser menu and tap **Install app** (or use the Install button inside Abhyashify's Account sheet). On iPhone, open it in Safari, tap Share, then **Add to Home Screen**. After that it opens in its own window, has its own icon, and still loads when you're offline. Your data catches up once you're back online.

## What's in the repo

| Folder | What it holds |
| --- | --- |
| `docs/` | The live website. GitHub Pages serves this folder. `index.html` is generated, so don't edit it by hand. |
| `app/` | The source for the website (`app/src`), the build script (`build.py`) and the tests. Run `python3 app/build.py` to regenerate `docs/index.html`. |
| `sync/` | The part that decides how study time from several devices is merged (`core/overlap.js`), plus the Firestore security rules and their tests. |
| `android/` | An Android Studio project that measures how long I spend in the study apps I choose (PDF reader, notes, lecture app). Kotlin and Jetpack Compose. |
| `web/` | The first version of the app, a single file that ran inside Claude. Kept for reference. |
| `docs/ARCHITECTURE.md` | How syncing, merging and security are designed, in plain words. |

## What's tested and what isn't

I'd rather say this up front than have you find out later.

- The merging of overlapping study time has its own tests, and they pass.
- The website's sync code passes 22 tests against a stand-in for Firestore, using two simulated devices. That is not the same as the real thing, so the real Google sign-in and real database still need to be tried by hand.
- The Firestore security rules have tests (`npm run test:rules` inside `sync/`), but I haven't been able to run them yet. They need Node and Java and the Firebase emulator.
- The Android project builds in Android Studio. I haven't run it on a phone yet.

## The Android usage tracker

A web page can't see what other apps you use, so this small Android app does that part. It reads the Usage Access data on the phone, adds up how long each study app was open on each of the last 7 days, and gives the result as JSON.

To run it:

1. In Android Studio choose Open and pick the `android` folder. Wait for the Gradle sync.
2. Plug in your phone with USB debugging on, or start an emulator, and press Run.
3. Tap **Open usage access settings**, pick *Abhyashify Usage* and switch it on. Then come back to the app.
4. Tap **Choose study apps** and tick the apps you study with. Leave out anything you also use for fun, because a chosen app counts fully as study time.
5. The app shows time per day and per app. **Share** or **Copy** gives you the JSON.

The JSON looks like this:

```json
{
  "source": "abhyashify-usage",
  "generated": "2026-10-05T14:30:00Z",
  "days": [
    {
      "date": "2026-10-05",
      "study_minutes": 135,
      "apps": [
        { "package": "com.example.reader", "label": "PDF Reader", "minutes": 95 },
        { "package": "com.example.notes", "label": "Notes", "minutes": 40 }
      ]
    }
  ]
}
```

### How the usage time is counted

- An app counts as open from the first screen you see until the last one pauses.
- Turning the screen off or shutting the phone down ends any open session.
- A session that runs past midnight is split between the two days, using the phone's time zone.
- Only the apps you picked count. The app can't tell what you did inside them, so a YouTube lecture and a YouTube Short look the same to it.

## Still to do

- Wrap the site as a proper Android app, with native alarms that ring even when the page is closed.
- Send the phone's usage numbers into the weekly report.
- Course invitations by email, so a friend can study the same course with their own login.
- A browser extension to count time on study sites on the laptop.

## A few notes to self

- `AndroidStudioProjects\Tracker` on my laptop is a different project (a Firebase and Maps location tracker cloned from another GitHub account). I haven't touched it.
- This project lives on the D: drive under `Gate 2027\Abhyashify`.

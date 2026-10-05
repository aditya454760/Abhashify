# Prep Ledger

Study planner for GATE DA 2027 (exam: 6 Feb 2027, target 65+ marks / score 850+ for IISc and top IITs).

## What is in this folder

| Path | What it is |
| --- | --- |
| `web/prep-ledger.html` | The web app (single file). Schedule, alarms, daily log, weekly report, materials tracker, auto-ordered study plan. Published as a private Claude artifact; data saves to your account. |
| `android/` | Android Studio project: the phone app-usage tracker (Kotlin, Jetpack Compose). |
| `README.md` | This file. |

## The two parts

1. **Web app (done).** Runs in any browser or phone. It can only count what you log or time inside it. A web page cannot see other apps.
2. **Android usage tracker (written, not yet built on a phone).** Reads how long each study app you choose was open, per day for the last 7 days, using the Usage Access permission. Shares the result as JSON.

## Run the Android app

1. Android Studio > Open > choose the `android` folder. Let Gradle sync (it uses Gradle 8.13 and AGP 8.13.0, the same as your other projects).
2. Connect your phone with USB debugging on, or use an emulator, and press Run.
3. In the app tap **Open usage access settings**, pick *Prep Ledger Usage* and switch usage access on. Come back to the app.
4. Tap **Choose study apps** and tick the apps you study with (PDF reader, notes, lecture app). An app counts fully as study time, so leave out apps you also use for fun.
5. The app shows study time per day and per app. **Share** or **Copy** gives you the JSON below.

Run the logic tests with `gradlew test` (6 tests on the time-counting code).

## Status and what was checked

- The time-counting logic (`UsageMath.kt`) was compiled and its 6 unit tests passed outside Android.
- The Android and Compose files (`UsageTracker.kt`, `MainActivity.kt`, `Theme.kt`, `StudyAppStore.kt`) have not been built against the Android SDK yet. The first Gradle sync and build is the real test. Expect to fix small things.
- Not built yet: importing the JSON into the web app's weekly report (for now the JSON is for reading and pasting).

## JSON format

```json
{
  "source": "prep-ledger-usage",
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

## How usage time is counted

- An app is in the foreground from its first resumed screen until its last resumed screen pauses.
- Screen off and device shutdown close every open session.
- A session across midnight is split between the two days, in the phone's time zone.
- Only the apps you choose count as study. Time inside an app is not understood, so YouTube lectures and YouTube Shorts count the same.

## Decisions so far

- The existing `AndroidStudioProjects\Tracker` project is a different app (Firebase and Maps location tracker, cloned from another GitHub account). It is not touched.
- This project lives on the D: drive under `Gate 2027\Prep Ledger`.
- GitHub: push under the `aditya454760` account (repo name and visibility to be confirmed).

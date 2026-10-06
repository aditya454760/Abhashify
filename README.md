# Abhyashify

I'm preparing for GATE DA 2027 (exam on 6 February 2027, aiming for IISc or a top IIT, which means a score around 850 or more). Abhyashify is the study planner I built to keep myself honest. It plans my study blocks, rings an alarm when one is due, asks me to log what I actually did, and at the end of the week shows how the week went compared to the plan.

You can try it here: **https://aditya454760.github.io/Abhyashify/**

## What it does

- Builds a day-by-day schedule from my subjects and the exam date, and keeps a revision buffer at the end.
- Rings an alarm shortly before each block (while the page is open).
- Lets me log a session by hand or run a timer, and gives me a weekly report.
- Tracks study material (books, lecture playlists, problem sets) and how much of each I've finished.
- Has a built-in assistant (the chat button at the bottom right). I can type or talk to it. It answers questions about how the app works, sets alarms and reminders, schedules tests and mock tests and records my scores, builds a new weekly schedule, adds subjects and study material, starts the timer, and changes the theme, accent colour and background. Everything it changes can be undone with one tap. It can talk back in a female or male voice.
- Works in English and Hindi. The language switch is in Settings (and on the sign-in screen). It changes the whole app, the assistant's replies and the voice chat. The assistant is called **Anu** with the female voice and **Adi** with the male voice, and it understands Hindi (देवनागरी) and Hinglish commands as well as English.
- Syncs through Google sign-in, so the phone, tablet and laptop all show the same data. If I study on my phone and my laptop at the same time for the same course, that overlap is counted once, not twice.

## Installing it like a normal app

Open the link above in Chrome or Edge. On a computer there's an install icon in the address bar. On Android, open the browser menu and tap **Install app** (or use the Install button inside Abhyashify's Account sheet). On iPhone, open it in Safari, tap Share, then **Add to Home Screen**. After that it opens in its own window, has its own icon, and still loads when you're offline. Your data catches up once you're back online.

## The assistant

It works out of the box with no account and no cost. Without a key it uses a built-in understanding of everyday requests ("remind me to revise ML at 8 pm", "schedule a mock test on Sunday at 10", "make accent teal and background aurora", "how do I log a session?"). For free-form requests there is an optional Smart mode: in the assistant's settings I paste my own Gemini (free) or Anthropic key, and the assistant then uses that model to understand me. The model can only ask the app to do things from a fixed list, and the app checks each one. It can't delete courses or data, and replacing the whole schedule needs a yes first.

Things worth knowing:

- Language: switch in Settings, in the assistant's settings, or just say "हिन्दी में बोलो" or "switch to English". Hindi text, speech recognition and speech output all follow it. The Hindi in the app comes from a built-in dictionary plus the assistant's own Hindi answers. It is good for everyday use, but a few odd phrasings may still show in English, and your own names (subjects, books, test titles) are never translated. The Android usage-tracker app is not translated. The CSV export keeps English column headings so Google Calendar can read it.
- Hindi voices depend on the device. Chrome on Android usually has one; many laptops don't, and then the assistant can't speak Hindi aloud even though the text works. Smart mode (your own key) understands free-form Hindi better than the built-in understanding does.
- Alarms and reminders ring only while the page is open and the bell is on. A web page can't wake a closed phone. The Android wrapper (on the to-do list) is how that gets fixed.
- A mock test is scheduled, timed with the study timer, and its score is saved and shown in the Report tab. There's no built-in question bank. In Smart mode I can ask it to quiz me in the chat.
- Voice needs a browser with speech support (Chrome, Edge and Safari have it). Listening needs the internet and microphone permission, and Chrome sends the audio to Google to turn it into text. The male and female voices are the ones installed on the device. If the device has only one kind, the assistant shifts the pitch.
- My key is stored only on this device and is sent only to the provider I chose. In Smart mode my messages and a short summary of my schedule go to that provider.

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
- The assistant passes 45 tests, and 33 more cover Hindi: switching the whole app and back, the names Adi and Anu, Hindi and Hinglish commands, Hindi replies, and the Hindi voice settings. A scan of the app in Hindi finds no English left over except names and brands. The Hindi was written by an AI, so someone fluent should still read through the app and fix any phrase that sounds wrong. (The English tests cover understanding of requests, actions, undo, the chat window, colours, reminders ringing, and Smart mode against a stand-in network.) The real microphone, real voices and real calls to Gemini or Anthropic haven't been tried yet, so those need a hand test.
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

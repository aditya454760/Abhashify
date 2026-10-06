# How syncing works in Abhyashify

The aim is simple: if I study on my phone in the morning and on my laptop in the evening, both should land in one set of numbers. Each person signs in with their own Google account. Someone else can study the same course, but they get their own login and their own data; nothing is shared by sharing a password.

## Who you are

You sign in with Google through Firebase Authentication. Only accounts with a verified email get in. The app never sees your Google password.

## Where the data lives

Everything is stored in Firestore, grouped by course:

```
users/{uid}                                     email, createdAt, lastSeen
courses/{courseId}                              name, ownerUid, members[], invited[], plan{subjects[], blocks[], tests[], reminders[]}
courses/{courseId}/people/{uid}/sessions/{id}   uid, s, e (epoch ms), subj, block, planStart, sheets, device, source
courses/{courseId}/people/{uid}/usage/{id}      uid, device, day, intervals [[s,e],...]   (study-app time, no app names)
courses/{courseId}/people/{uid}/materials/{id}  title, subj, kind, unit, total, done      (private to that person)
```

A few choices behind that layout:

- Every study session is its own small document with a unique id. Two devices adding sessions at the same time can't overwrite each other.
- Only the course owner edits the plan. If the owner changes it on two devices at once, the last save wins.
- Reading progress belongs to each person alone.
- Times are saved as exact moments (milliseconds since 1970) along with the device's time zone, so a phone and a laptop in different settings still line up.

The language (English or Hindi) is a local setting too. The app's text is written in English in the code and turned into Hindi at display time by `app/src/i18n.js` (a dictionary in `i18n-hi.js` plus pattern rules for sentences with numbers, and a watcher that translates what is drawn on screen). The assistant's Hindi and Hinglish understanding is in `asst-hi.js`: it rewrites a Hindi request into the English form the existing parser already handles, so alarms, tests and schedules behave the same in both languages.

Tests, mock tests and reminders live inside the course plan, so they sync with it and only the course owner edits them. The assistant's chat history, voice settings, theme and any AI key stay on the device (local storage) and never go to Firestore.

## Counting overlapping time once

The code for this is in `sync/core/overlap.js`. It works in three steps:

1. Take one person's sessions in one course. Sessions from different courses are never mixed, because studying two subjects at once isn't a thing I want to blur together.
2. Merge any sessions that overlap or touch, whichever device or source they came from (hand-logged, timer, phone usage, laptop usage).
3. Cut the result at midnight in the person's time zone and add up the minutes for each day.

For example, if the phone says 07:00 to 07:30 and the laptop says 07:00 to 07:30 for the same course, that's 30 minutes, not 60. The weekly report mentions it ("12 min counted once") so the drop in the total isn't a surprise.

When a course has more than one person, each person is merged on their own first, and then their totals are added together. If two people are really studying at the same time, that is real study and it should count for both.

## Keeping the data safe

- **The rules run on Google's servers.** The file `sync/firestore.rules` checks every request: you must be signed in with a verified email, you can only write your own data, field names and sizes must look right, and anything not listed is refused.
- **Course members can see each other's study minutes, but not their reading progress.** That is enforced in the rules, not just hidden in the screen.
- **Joining needs an invitation.** The owner invites an email address. The invited person can read that course and add their own user id to its member list, and nothing else.
- **Phone usage is minimal.** Only time ranges for the apps you picked are uploaded. App names and your list of installed apps never leave the phone.
- **The Firebase web config isn't a secret.** It's in the page source for every Firebase site. The rules are what protect the data. App Check will be added later so that only the real app, not a copy of it, can talk to the database.
- **Encryption.** Data is encrypted in transit and at rest by Google. It is not end-to-end encrypted, which means whoever owns the Firebase project (me) could technically read it. I'd rather say that plainly.
- **Your controls.** There's an export button, a delete button, and signing out clears the local copy.

## Where things stand

Working and tested:
- The assistant (45 tests) and its Hindi support (33 tests), apart from the real microphone, real voices and real AI calls.
- The overlap code (12 tests passing).
- The website's sign-in and sync, tested against a stand-in for Firestore (22 tests passing).
- The site is live on GitHub Pages and can be installed like an app. It loads offline too.

Written but not run yet:
- The Firestore rules tests (`npm run test:rules` in `sync/`). They need Node, Java and the Firebase emulator, which I couldn't download where I built this.

Next:
- Try real Google sign-in and real sync across two devices.
- Wrap the site as an Android app with native alarms and the phone usage upload.
- Invitation screens for sharing a course.

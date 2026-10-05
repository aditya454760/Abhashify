# Prep Ledger sync: design

Goal: one person, many devices (phone, tablet, laptop), many courses, one set of numbers. Separate logins per person; a course can be shared with other people by invitation.

## Identity
Google sign-in through Firebase Authentication. Only email-verified accounts are accepted. Each person has their own login; nobody shares one.

## Data (Firestore)
```
users/{uid}                                   email, createdAt, lastSeen
courses/{courseId}                            name, ownerUid, members[], invited[], plan{subjects[], blocks[]}
courses/{courseId}/people/{uid}/sessions/{id} uid, s, e (epoch ms), subj, block, planStart, sheets, device, source
courses/{courseId}/people/{uid}/usage/{id}    uid, device, day, intervals [[s,e],...]   (study-app time, no app names)
courses/{courseId}/people/{uid}/materials/{id} title, subj, kind, unit, total, done      (private to that person)
```
- Sessions are append-only with unique ids, so two devices never overwrite each other.
- Plan edits are by the owner only (last write wins). Material progress is per person.
- Time is stored as absolute epoch milliseconds plus the device time zone, so phone and laptop line up.

## Overlap rule (sync/core/overlap.js)
1. Group by person and course. Different courses are never merged.
2. Merge overlapping or touching intervals from every device and source (manual log, timer, phone usage, laptop usage).
3. Cut at local midnight and count minutes per day.
Example: phone 07:00-07:30 and laptop 07:00-07:30, same course, count as 30 minutes. The report can show "12 min counted once".
In a shared course, each person is merged on their own; the combined view adds the people together because two people studying at the same time is real study.

## Security
- Firestore rules (sync/firestore.rules) run on Google's servers: sign-in and verified email required, own data only, field names, sizes and value ranges checked, everything else denied.
- A member of a course can read the others' sessions and usage minutes for that course, but not their material progress.
- Joining needs an invitation to your email. A joiner can only add themselves to `members`.
- Phone usage uploads only time ranges for the study apps the person chooses. Never app names, never the full app list.
- The Firebase web config is not a secret; the rules are the protection. App Check (Play Integrity on Android, reCAPTCHA on web) is added to block clients that are not the real app.
- Encrypted in transit and at rest by Google. Not end-to-end encrypted: the Firebase project owner can read the data.
- Export-all and delete-all buttons; sign-out clears the local cache.

## Status
- Done and tested: overlap module (10 tests passing).
- Written, not yet run: Firestore rules and their emulator tests (`npm run test:rules`; needs Java and Node). The emulator could not be downloaded in the build environment.
- Next: Firebase sign-in and sync in the web app, Capacitor Android wrapper, usage plugin, native alarms.

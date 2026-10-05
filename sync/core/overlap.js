// Merge overlapping study time. Times are epoch milliseconds.
// Rule: overlap is merged only inside one (person, course). Different courses are never merged.

const MIN = 60000;

// Sort and merge touching or overlapping intervals. Input: [{s,e}], returns new merged [{s,e}].
function mergeIntervals(list) {
  const a = list.filter(x => x && x.e > x.s).map(x => ({ s: x.s, e: x.e })).sort((p, q) => p.s - q.s);
  const out = [];
  for (const x of a) {
    const last = out[out.length - 1];
    if (last && x.s <= last.e) { if (x.e > last.e) last.e = x.e; } else out.push(x);
  }
  return out;
}

// Local calendar day key (YYYY-MM-DD) for a timestamp, given the viewer's UTC offset in minutes (IST = 330).
function dayKey(t, tzOffsetMin) {
  const d = new Date(t + tzOffsetMin * MIN);
  return d.toISOString().slice(0, 10);
}
function dayStart(key, tzOffsetMin) {
  return Date.parse(key + 'T00:00:00Z') - tzOffsetMin * MIN;
}

// Cut merged intervals at local midnights so each piece belongs to one day.
function splitByDay(intervals, tzOffsetMin) {
  const out = [];
  for (const iv of intervals) {
    let s = iv.s;
    while (s < iv.e) {
      const next = dayStart(dayKey(s, tzOffsetMin), tzOffsetMin) + 24 * 60 * MIN;
      const e = Math.min(iv.e, next);
      out.push({ s, e, day: dayKey(s, tzOffsetMin) });
      s = e;
    }
  }
  return out;
}

// sessions: [{s,e,course,source,device}]  (manual logs, timer sessions and phone/laptop usage all use this shape)
// Returns { [course]: { [day]: minutes } } with overlaps inside a course counted once.
function unionMinutes(sessions, tzOffsetMin) {
  const byCourse = {};
  for (const x of sessions) (byCourse[x.course] = byCourse[x.course] || []).push(x);
  const res = {};
  for (const [course, list] of Object.entries(byCourse)) {
    const days = {};
    for (const p of splitByDay(mergeIntervals(list), tzOffsetMin)) days[p.day] = (days[p.day] || 0) + (p.e - p.s) / MIN;
    res[course] = days;
  }
  return res;
}

// How much time the overlap rule removed, for showing "12 min counted once" in the report.
function overlapSaved(sessions) {
  const byCourse = {};
  for (const x of sessions) (byCourse[x.course] = byCourse[x.course] || []).push(x);
  const res = {};
  for (const [course, list] of Object.entries(byCourse)) {
    const raw = list.filter(x => x.e > x.s).reduce((t, x) => t + (x.e - x.s), 0);
    const merged = mergeIntervals(list).reduce((t, x) => t + (x.e - x.s), 0);
    res[course] = (raw - merged) / MIN;
  }
  return res;
}

const api = { mergeIntervals, splitByDay, unionMinutes, overlapSaved, dayKey, MIN };
if (typeof module !== 'undefined') module.exports = api;

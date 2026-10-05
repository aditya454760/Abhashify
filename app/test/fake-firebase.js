// A small in-memory stand-in for Firebase so the app's sync logic can be tested without Google.
// It also checks writes against the same field lists and ownership rules as sync/firestore.rules (a port, not the real engine).
function makeBackend() { return { docs: new Map(), subs: new Set(), seq: 0 }; }

function makeFake(be, label) {
  const auth = { currentUser: null }; let authCb = null;
  const denied = m => Object.assign(new Error(m), { code: 'permission-denied' });
  const uid = () => auth.currentUser && auth.currentUser.uid;
  const stamp = d => JSON.parse(JSON.stringify(d, (k, v) => (v && v.__ts ? Date.now() : v)));
  const segs = p => p.split('/');
  const ONLY = {
    session: ['uid', 's', 'e', 'subj', 'block', 'planStart', 'sheets', 'device', 'source', 'mid', 'mu', 'tz'],
    material: ['title', 'subj', 'kind', 'unit', 'total', 'done', 'file', 'updatedAt'],
    course: ['name', 'ownerUid', 'members', 'invited', 'plan', 'updatedAt'],
    usage: ['uid', 'device', 'day', 'intervals', 'updatedAt'],
    user: ['email', 'createdAt', 'lastSeen']
  };
  function check(path, data, existing) {
    const p = segs(path), me = uid();
    if (!me) throw denied('not signed in');
    const only = (kind) => { for (const k of Object.keys(data)) if (!ONLY[kind].includes(k)) throw denied('unknown field ' + k + ' in ' + kind); };
    if (p[0] === 'users' && p.length === 2) { if (p[1] !== me) throw denied('other user'); only('user'); return; }
    if (p[0] === 'courses' && p.length === 2) {
      only('course');
      if (!existing && data.ownerUid !== me) throw denied('create as other owner');
      if (existing && existing.ownerUid !== me) throw denied('not owner');
      if (!data.name || !Array.isArray(data.members) || !data.plan || !Array.isArray(data.plan.subjects) || !Array.isArray(data.plan.blocks)) throw denied('invalid course');
      return;
    }
    if (p[0] === 'courses' && p[2] === 'people' && p.length === 6) {
      if (p[3] !== me) throw denied('other person');
      const kind = { sessions: 'session', materials: 'material', usage: 'usage' }[p[4]];
      if (!kind) throw denied('unknown collection');
      only(kind);
      if (kind === 'session') {
        if (data.uid !== me || typeof data.s !== 'number' || typeof data.e !== 'number' || data.e <= data.s || data.e - data.s > 43200000) throw denied('invalid session');
        if (!['manual', 'timer', 'phone', 'laptop', 'tablet'].includes(data.source)) throw denied('bad source');
      }
      if (kind === 'material' && (!data.title || data.done < 0 || data.total < 0)) throw denied('invalid material');
      return;
    }
    throw denied('path closed ' + path);
  }
  function readCheck(path) {
    const p = segs(path), me = uid();
    if (!me) throw denied('not signed in');
    if (p[0] === 'courses' && p[2] === 'people' && p[3] !== me && p[4] === 'materials') throw denied('private');
  }
  const colDocs = path => [...be.docs.entries()].filter(([k]) => k.startsWith(path + '/') && segs(k).length === segs(path).length + 1);
  const snapOfCol = path => ({ docs: colDocs(path).map(([k, v]) => ({ id: segs(k).pop(), data: () => JSON.parse(JSON.stringify(v)), ref: { path: k } })) });
  const snapOfDoc = path => ({ exists: () => be.docs.has(path), data: () => JSON.parse(JSON.stringify(be.docs.get(path))), id: segs(path).pop() });
  const notify = () => { for (const s of [...be.subs]) setTimeout(() => s.fire(), 0); };
  const api = {
    auth, db: { label },
    GoogleAuthProvider: class {},
    async signInWithPopup() { auth.currentUser = { uid: api._user.uid, email: api._user.email }; authCb && authCb(auth.currentUser); },
    signInWithRedirect: async () => {},
    onAuthStateChanged(a, cb) { authCb = cb; setTimeout(() => cb(auth.currentUser), 0); return () => {}; },
    async signOut() { auth.currentUser = null; authCb && authCb(null); },
    doc: (a, ...r) => (a && a.isCol ? { path: a.path + '/' + r[0] } : { path: r.join('/') }),
    collection: (db, ...r) => ({ isCol: true, path: r.join('/') }),
    query: (col, ...w) => ({ col, w }),
    where: (f, op, v) => ({ f, op, v }),
    serverTimestamp: () => ({ __ts: true }),
    async setDoc(ref, data, opts) {
      const ex = be.docs.get(ref.path);
      const next = opts && opts.merge && ex ? Object.assign({}, ex, stamp(data)) : stamp(data);
      check(ref.path, next, ex); be.docs.set(ref.path, next); notify();
    },
    async updateDoc(ref, data) {
      const ex = be.docs.get(ref.path); if (!ex) throw Object.assign(new Error('not found'), { code: 'not-found' });
      const next = Object.assign({}, ex, stamp(data)); check(ref.path, next, ex); be.docs.set(ref.path, next); notify();
    },
    async deleteDoc(ref) { readCheck(ref.path); be.docs.delete(ref.path); notify(); },
    async getDocs(q) {
      if (q.col) { const all = snapOfCol(q.col.path); all.docs = all.docs.filter(d => q.w.every(w => d.data()[w.f] === w.v)); return all; }
      return snapOfCol(q.path);
    },
    onSnapshot(ref, cb, err) {
      const isCol = !!ref.isCol;
      const fire = () => { try { readCheck(ref.path); cb(isCol ? snapOfCol(ref.path) : snapOfDoc(ref.path)); } catch (e) { err && err(e); } };
      const s = { fire }; be.subs.add(s); setTimeout(fire, 0); return () => be.subs.delete(s);
    },
    writeBatch() { const ops = []; return { delete: r => ops.push(r.path), async commit() { ops.forEach(p => be.docs.delete(p)); notify(); } }; },
    terminate: async () => {}, clearIndexedDbPersistence: async () => {},
    _user: { uid: 'u-aditya', email: 'aditya@example.com' }
  };
  return api;
}
module.exports = { makeBackend, makeFake };

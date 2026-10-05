// Loads Firebase from Google's CDN. If it cannot load (offline, blocked), the app falls back to this-device-only mode.
const V = '12.19.0';
const CONFIG = {
  apiKey: "AIzaSyD-U9BW2L_y4f3CoB9_ChCUc5aX-eQ3bys",
  authDomain: "prep-ledger.firebaseapp.com",
  projectId: "prep-ledger",
  storageBucket: "prep-ledger.firebasestorage.app",
  messagingSenderId: "943703788428",
  appId: "1:943703788428:web:6c0277fba0a07e80f7e4a9"
};
try {
  const base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = appM.initializeApp(CONFIG);
  const auth = authM.getAuth(app);
  const db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) });
  window.__fbResolve({
    auth, db,
    GoogleAuthProvider: authM.GoogleAuthProvider, signInWithPopup: authM.signInWithPopup, signInWithRedirect: authM.signInWithRedirect,
    onAuthStateChanged: authM.onAuthStateChanged, signOut: authM.signOut,
    doc: fsM.doc, collection: fsM.collection, query: fsM.query, where: fsM.where, setDoc: fsM.setDoc, updateDoc: fsM.updateDoc, deleteDoc: fsM.deleteDoc,
    getDocs: fsM.getDocs, onSnapshot: fsM.onSnapshot, writeBatch: fsM.writeBatch, serverTimestamp: fsM.serverTimestamp,
    terminate: fsM.terminate, clearIndexedDbPersistence: fsM.clearIndexedDbPersistence
  });
} catch (e) {
  console.error('Firebase did not load', e);
  window.__fbResolve(null);
}

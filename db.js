/* db.js — saves all your data on this phone using IndexedDB (the phone's built-in
   database for web apps). Nothing is ever sent to a server.

   Stores:
     kv        settings, your weekly plan, the workout in progress, last backup date
     workouts  finished workouts (history)
     meals     food log entries
     foods     saved favorite foods */

const DB = (() => {
  const NAME = 'dugout';
  const VERSION = 1;
  const STORES = ['kv', 'workouts', 'meals', 'foods'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) { reject(new Error('This browser cannot save data (no IndexedDB).')); return; }
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        for (const s of ['workouts', 'meals', 'foods']) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        db.onclose = () => { dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
  }

  const done = r => new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

  // Runs `work` inside a transaction. iPhones sometimes drop the database connection
  // when the app sits in the background, so we reconnect and retry once.
  async function tx(stores, mode, work) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const db = await open();
        const t = db.transaction(stores, mode);
        const finished = new Promise((resolve, reject) => {
          t.oncomplete = resolve;
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error('Save was cancelled'));
        });
        const result = work(t);
        await finished;
        return await result;
      } catch (err) {
        const lost = err && (err.name === 'InvalidStateError' || /connection|closing|closed/i.test(err.message || ''));
        if (attempt === 0 && lost) { dbPromise = null; continue; }
        throw err;
      }
    }
  }

  return {
    get: key => tx('kv', 'readonly', t => done(t.objectStore('kv').get(key))),
    set: (key, value) => tx('kv', 'readwrite', t => { t.objectStore('kv').put(value, key); }),
    del: key => tx('kv', 'readwrite', t => { t.objectStore('kv').delete(key); }),
    all: store => tx(store, 'readonly', t => done(t.objectStore(store).getAll())),
    put: (store, obj) => tx(store, 'readwrite', t => { t.objectStore(store).put(obj); }),
    putMany: (store, list) => tx(store, 'readwrite', t => { const s = t.objectStore(store); list.forEach(o => s.put(o)); }),
    remove: (store, id) => tx(store, 'readwrite', t => { t.objectStore(store).delete(id); }),

    // Replaces everything on this phone with the contents of a backup file.
    async importAll(data) {
      if (!data || data.app !== 'dugout' || typeof data.kv !== 'object') {
        throw new Error('That file is not a Dugout backup.');
      }
      await tx(STORES, 'readwrite', t => {
        STORES.forEach(s => t.objectStore(s).clear());
        Object.entries(data.kv).forEach(([k, v]) => t.objectStore('kv').put(v, k));
        for (const s of ['workouts', 'meals', 'foods']) {
          (Array.isArray(data[s]) ? data[s] : []).forEach(o => { if (o && o.id) t.objectStore(s).put(o); });
        }
      });
    },

    eraseAll: () => tx(STORES, 'readwrite', t => { STORES.forEach(s => t.objectStore(s).clear()); })
  };
})();

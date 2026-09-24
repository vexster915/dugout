/* db.js — saves all your data on this phone using IndexedDB (the phone's built-in
   database for web apps), ENCRYPTED. Nothing is ever sent to a server.

   How the lock works
   - When you create your login, the app makes a random 256-bit key that encrypts all
     your data (AES-256-GCM).
   - That key is itself locked with your username + password, stretched with
     PBKDF2-SHA256 (600,000 rounds) so guessing is slow. Only the locked copy is saved.
   - Signing in unlocks the key into memory; locking the app forgets it again.
   - No password (or anything that reveals it) is stored in the app's code or sent anywhere.

   Stores:
     kv        settings, your weekly plan, the workout in progress (encrypted)
               + "vault" (the locked key) and "lockout" (wrong-password counter)
     workouts  finished workouts (encrypted)
     meals     food log entries (encrypted)
     foods     saved favorite foods (encrypted)
     logs      everything else you track by date (encrypted): body weight, water, test results,
               throwing sessions… each record has a "kind" */

const DB = (() => {
  const NAME = 'dugout';
  const VERSION = 2;                              // 2 = added the "logs" store
  const STORES = ['kv', 'workouts', 'meals', 'foods', 'logs'];
  const DATA_STORES = ['workouts', 'meals', 'foods', 'logs'];
  const RAW_KEYS = ['vault', 'lockout'];          // kv entries that are not encrypted (no personal data)
  const ITERATIONS = 600000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  let dbPromise = null;
  let key = null;           // the data key — only in memory while you're signed in
  let vaultCache = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) { reject(new Error('This browser cannot save data (no IndexedDB).')); return; }
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        for (const s of DATA_STORES) {
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
  // (Encryption always happens before or after a transaction, never inside one.)
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

  /* ---------- encryption helpers ---------- */
  const b64 = bytes => {
    const u8 = new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = str => {
    const bin = atob(str), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  };
  const isSealed = r => !!(r && r.iv && r.ct);
  const locked = () => new Error('Dugout is locked');

  // Each record is encrypted separately with a fresh random IV, and tied to its slot
  // (e.g. "meals:<id>") so encrypted records can't be swapped around.
  async function seal(value, label, k = key) {
    if (!k) throw locked();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(label) }, k, enc.encode(JSON.stringify(value)));
    return { iv, ct };
  }
  async function unseal(rec, label, k = key) {
    if (!k) throw locked();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv, additionalData: enc.encode(label) }, k, rec.ct);
    return JSON.parse(dec.decode(pt));
  }

  // Username + password → key-encryption key (slow on purpose).
  async function keyFromLogin(user, pass, salt, iterations) {
    const secret = enc.encode(String(user).trim().toLowerCase().normalize('NFC') + '\u0000' + String(pass).normalize('NFC'));
    const base = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function lockDataKey(rawKey, user, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const kek = await keyFromLogin(user, pass, salt, ITERATIONS);
    const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('dugout-vault') }, kek, rawKey);
    return { v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped), created: Date.now() };
  }
  // Throws an "OperationError" when the username or password is wrong.
  async function unlockDataKey(vault, user, pass) {
    const kek = await keyFromLogin(user, pass, unb64(vault.salt), vault.iterations);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv), additionalData: enc.encode('dugout-vault') }, kek, unb64(vault.wrapped)));
  }
  const importDataKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

  const getRaw = k => tx('kv', 'readonly', t => done(t.objectStore('kv').get(k)));
  const setRaw = (k, v) => tx('kv', 'readwrite', t => { t.objectStore('kv').put(v, k); });
  const sealRecord = async (store, o) => ({ id: o.id, ...(await seal(o, store + ':' + o.id)) });

  return {
    /* ---------- login ---------- */
    getRaw,
    setRaw,
    delRaw: k => tx('kv', 'readwrite', t => { t.objectStore('kv').delete(k); }),
    isUnlocked: () => !!key,

    async createVault(user, pass) {
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const vault = await lockDataKey(raw, user, pass);
      key = await importDataKey(raw);
      raw.fill(0);
      await setRaw('vault', vault);
      vaultCache = vault;
      return vault;
    },
    async unlock(user, pass) {
      const vault = await getRaw('vault');
      if (!vault) throw new Error('No login has been created on this phone yet');
      const raw = await unlockDataKey(vault, user, pass);
      key = await importDataKey(raw);
      raw.fill(0);
      vaultCache = vault;
    },
    async changeLogin(user, pass, newUser, newPass) {
      const vault = await getRaw('vault');
      const raw = await unlockDataKey(vault, user, pass);     // proves the current password
      const next = await lockDataKey(raw, newUser, newPass);   // same data key, new lock
      raw.fill(0);
      await setRaw('vault', next);
      vaultCache = next;
      return next;
    },
    lock() { key = null; vaultCache = null; },

    /* ---------- encrypted data ---------- */
    async get(k) {
      const rec = await getRaw(k);
      if (!rec) return undefined;
      try { return await unseal(rec, 'kv:' + k); } catch (e) { console.warn('Could not read', k, e); return undefined; }
    },
    async set(k, v) {
      const rec = await seal(v, 'kv:' + k);
      await setRaw(k, rec);
    },
    del: k => tx('kv', 'readwrite', t => { t.objectStore('kv').delete(k); }),
    async all(store) {
      const recs = await tx(store, 'readonly', t => done(t.objectStore(store).getAll()));
      const out = [];
      for (const r of recs) {
        try { out.push(await unseal(r, store + ':' + r.id)); } catch (e) { console.warn('Skipped unreadable record', store, r && r.id); }
      }
      return out;
    },
    async put(store, obj) {
      const rec = await sealRecord(store, obj);
      await tx(store, 'readwrite', t => { t.objectStore(store).put(rec); });
    },
    async putMany(store, list) {
      const recs = await Promise.all(list.map(o => sealRecord(store, o)));
      await tx(store, 'readwrite', t => { const s = t.objectStore(store); recs.forEach(r => s.put(r)); });
    },
    remove: (store, id) => tx(store, 'readwrite', t => { t.objectStore(store).delete(id); }),

    // Data saved by version 1.0 wasn't encrypted — encrypt anything still in plain form.
    async encryptOldData() {
      if (!key) throw locked();
      const [keys, vals, ...lists] = await tx(STORES, 'readonly', t => Promise.all([
        done(t.objectStore('kv').getAllKeys()), done(t.objectStore('kv').getAll()),
        ...DATA_STORES.map(s => done(t.objectStore(s).getAll()))
      ]));
      const kvOut = [];
      for (let i = 0; i < keys.length; i++) {
        if (!RAW_KEYS.includes(keys[i]) && !isSealed(vals[i])) kvOut.push([keys[i], await seal(vals[i], 'kv:' + keys[i])]);
      }
      const out = {};
      for (let s = 0; s < DATA_STORES.length; s++) {
        out[DATA_STORES[s]] = await Promise.all(lists[s].filter(o => o && o.id && !isSealed(o)).map(o => sealRecord(DATA_STORES[s], o)));
      }
      const count = kvOut.length + DATA_STORES.reduce((n, s) => n + out[s].length, 0);
      if (count) {
        await tx(STORES, 'readwrite', t => {
          kvOut.forEach(([k, r]) => t.objectStore('kv').put(r, k));
          DATA_STORES.forEach(s => out[s].forEach(r => t.objectStore(s).put(r)));
        });
      }
      return count;
    },

    // Replaces all workouts, food, favorites, settings and plan (your login stays).
    async replaceAll(data) {
      const kvOut = [];
      for (const [k, v] of Object.entries(data.kv || {})) {
        if (!RAW_KEYS.includes(k) && v !== undefined && v !== null) kvOut.push([k, await seal(v, 'kv:' + k)]);
      }
      const out = {};
      for (const s of DATA_STORES) {
        out[s] = await Promise.all((Array.isArray(data[s]) ? data[s] : []).filter(o => o && o.id).map(o => sealRecord(s, o)));
      }
      await tx(STORES, 'readwrite', t => {
        const kv = t.objectStore('kv');
        ['settings', 'plan', 'active'].forEach(k => kv.delete(k));
        kvOut.forEach(([k, r]) => kv.put(r, k));
        DATA_STORES.forEach(s => { const st = t.objectStore(s); st.clear(); out[s].forEach(r => st.put(r)); });
      });
    },

    // Deletes your data but keeps your login.
    eraseData: () => tx(STORES, 'readwrite', t => {
      ['settings', 'plan', 'active'].forEach(k => t.objectStore('kv').delete(k));
      DATA_STORES.forEach(s => t.objectStore(s).clear());
    }),
    // Deletes everything, including the login (for a forgotten password).
    eraseEverything: () => tx(STORES, 'readwrite', t => { STORES.forEach(s => t.objectStore(s).clear()); }),

    /* ---------- encrypted backup files ---------- */
    async sealBackup(plain) {
      const vault = vaultCache || await getRaw('vault');
      const { iv, ct } = await seal(plain, 'dugout-backup');
      return { app: 'dugout', format: 2, encrypted: true, exportedAt: plain.exportedAt, vault, iv: b64(iv), ct: b64(ct) };
    },
    // Opens an encrypted backup. Without a username/password it tries this phone's key
    // (works for backups made on this phone); otherwise it unlocks the backup's own lock.
    async openBackup(file, user, pass) {
      let k = key;
      if (user !== undefined) {
        const raw = await unlockDataKey(file.vault, user, pass);
        k = await importDataKey(raw);
        raw.fill(0);
      }
      return unseal({ iv: unb64(file.iv), ct: unb64(file.ct) }, 'dugout-backup', k);
    }
  };
})();

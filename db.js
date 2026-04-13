// ============================================================
//  DB.JS  —  IndexedDB wrapper for Pixel Dungeon Survivors
//  · Single database, single object store (key-value)
//  · Synchronous cache — all reads are instant after init
//  · Auto-migrates from localStorage on first run
// ============================================================

const DB = (() => {

  const DB_NAME    = 'PixelDungeonSurvivors';
  const DB_VERSION = 1;
  const STORE      = 'saves';

  // In-memory cache — populated once at init, kept in sync on every save
  const _cache = {};
  let _db = null;

  // ── LOW-LEVEL IDB HELPERS ────────────────────────────────

  function _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function _getAll(db) {
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const keys  = store.getAllKeys();
      const vals  = store.getAll();
      const result = {};
      let done = 0;
      let ks, vs;
      keys.onsuccess = e => { ks = e.target.result; if(++done===2) finish(); };
      vals.onsuccess = e => { vs = e.target.result; if(++done===2) finish(); };
      keys.onerror = vals.onerror = e => reject(e.target.error);
      function finish(){
        ks.forEach((k,i) => result[k] = vs[i]);
        resolve(result);
      }
    });
  }

  function _put(db, key, value) {
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req   = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e  => reject(e.target.error);
    });
  }

  // ── MIGRATION FROM LOCALSTORAGE ──────────────────────────

  const LS_KEYS = ['ds_meta_v1', 'ds_profile_v1', 'ds_leaderboard'];

  function _migrate(existingKeys) {
    const migrations = [];
    LS_KEYS.forEach(key => {
      // Only migrate if not already in IndexedDB
      if(existingKeys.includes(key)) return;
      try {
        const raw = localStorage.getItem(key);
        if(raw !== null){
          const val = JSON.parse(raw);
          migrations.push({ key, val });
          console.log(`[DB] Migrating '${key}' from localStorage`);
        }
      } catch(e) {}
    });
    return migrations;
  }

  // ── PUBLIC API ───────────────────────────────────────────

  return {

    // Call once at startup — awaited in main.js before game loads
    async init() {
      try {
        _db = await _open();

        // Load everything from IDB into cache
        const stored = await _getAll(_db);
        Object.assign(_cache, stored);

        // Migrate any localStorage data not yet in IDB
        const existingKeys = Object.keys(stored);
        const migrations   = _migrate(existingKeys);

        for(const { key, val } of migrations){
          _cache[key] = val;
          await _put(_db, key, val);
          // Clean up old localStorage key after successful migration
          try { localStorage.removeItem(key); } catch(e) {}
        }

        if(migrations.length > 0){
          console.log(`[DB] Migration complete — ${migrations.length} key(s) moved to IndexedDB`);
        } else {
          console.log('[DB] IndexedDB ready');
        }

      } catch(err) {
        console.warn('[DB] IndexedDB failed, falling back to localStorage:', err);
        // Fallback: load localStorage into cache so game still works
        LS_KEYS.forEach(key => {
          try {
            const raw = localStorage.getItem(key);
            if(raw) _cache[key] = JSON.parse(raw);
          } catch(e) {}
        });
      }
    },

    // Synchronous read from cache — always instant
    get(key) {
      return _cache[key] ?? null;
    },

    // Write to cache immediately, persist to IDB async
    set(key, value) {
      _cache[key] = value;
      if(_db){
        _put(_db, key, value).catch(err => {
          console.warn('[DB] Save failed for key:', key, err);
          // Fallback write to localStorage
          try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
        });
      } else {
        // No IDB — write to localStorage as fallback
        try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
      }
    },

  };

})();
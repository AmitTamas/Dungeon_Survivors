// ============================================================
//  SFX.JS  v7  —  SFX + Dynamic Music  (race-condition safe)
// ============================================================

const SFX = {

  _ctx: null, _muted: false, _masterGain: null,
  _buffers: {}, _loading: {}, _lastPlayed: {},

  // Music state — one active track at a time
  _music: { track:null, srcNode:null, gainNode:null, fadeTimer:null },

  _files: {
    // ── COMBAT ───────────────────────────────────────────────
    bulletFire:        { src:'sounds/mixkit-game-gun-shot-1662.mp3',                              vol:0.28, pitch:2.0,  trim:0.12 },
    playerHit:         { src:'sounds/mixkit-player-losing-or-failing-2042.wav',                  vol:0.55, pitch:1.2,  trim:0.4  },
    playerDie:         { src:'sounds/mixkit-arcade-retro-game-over-213.wav',                     vol:0.65, pitch:1.0,  trim:1.2  },
    enemyHit:          { src:'sounds/kenney_interface-sounds (2)/Audio/click_001.ogg',           vol:0.22, pitch:1.1,  trim:0.08 },
    enemyDieNormal:    { src:'sounds/kenney_interface-sounds (2)/Audio/drop_001.ogg',            vol:0.28, pitch:1.0,  trim:0.10 },
    enemyDieElite:     { src:'sounds/kenney_interface-sounds (2)/Audio/glass_001.ogg',           vol:0.32, pitch:0.9,  trim:0.15 },
    enemyDieChampion:  { src:'sounds/kenney_interface-sounds (2)/Audio/scratch_001.ogg',         vol:0.38, pitch:0.7,  trim:0.20 },
    bossDie:           { src:'sounds/mixkit-long-game-over-notification-276.wav',                vol:0.50, pitch:0.8,  trim:0.8  },
    // ── ABILITIES ────────────────────────────────────────────
    novaBlast:         { src:'sounds/kenney_interface-sounds (2)/Audio/maximize_001.ogg',        vol:0.65, pitch:0.5,  trim:0.6  },
    bossAlert:         { src:'sounds/mixkit-simple-game-countdown-921.wav',                      vol:0.55, pitch:0.8,  trim:1.0  },
    lastStandActivate: { src:'sounds/kenney_interface-sounds (2)/Audio/glitch_001.ogg',          vol:0.60, pitch:0.6,  trim:0.5  },
    boneThrow:         { src:'sounds/kenney_interface-sounds (2)/Audio/switch_001.ogg',          vol:0.22, pitch:2.0,  trim:0.07 },
    knightTarget:      { src:'sounds/kenney_interface-sounds (2)/Audio/tick_001.ogg',            vol:0.28, pitch:1.5,  trim:0.06 },
    knightCharge:      { src:'sounds/kenney_interface-sounds (2)/Audio/scroll_001.ogg',          vol:0.38, pitch:1.2,  trim:0.12 },
    // ── PICKUPS ──────────────────────────────────────────────
    gemPickup:         { src:'sounds/mixkit-arcade-game-jump-coin-216.wav',                      vol:0.22, pitch:2.0,  trim:0.07 },
    orbPickup:         { src:'sounds/mixkit-retro-game-notification-212.wav',                    vol:0.30, pitch:1.3,  trim:0.15 },
    powerupPickup:     { src:'sounds/mixkit-video-game-win-2016.wav',                            vol:0.42, pitch:1.2,  trim:0.35 },
    levelUp:           { src:'sounds/mixkit-bonus-earned-in-video-game-2058.wav',                vol:0.50, pitch:1.0,  trim:0.9  },
    // ── UI ───────────────────────────────────────────────────
    uiClick:           { src:'sounds/kenney_interface-sounds (2)/Audio/switch_001.ogg',          vol:0.20, pitch:1.8,  trim:0.08 },
    // ── MUSIC ────────────────────────────────────────────────
    musicPush:  { src:'sounds/Push-Long-Versio.mp3', vol:0.22 },
    musicDrive: { src:'sounds/DRIVE.mp3',            vol:0.24 },
    musicGlory: { src:'sounds/Glory.mp3',            vol:0.22 },
  },

  // ── AUDIOCONTEXT UNLOCK ──────────────────────────────────
  // Call once on page load. Resumes the AudioContext on the very
  // first user gesture (click / keydown / touch) so Chrome stops
  // blocking it.  Safe to call before _ctx exists — the listeners
  // will still be in place when _init() creates it later.
  _unlockRegistered: false,
  _registerUnlock() {
    if(this._unlockRegistered) return;
    this._unlockRegistered = true;
    const resume = () => {
      if(this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(()=>{});
      }
      document.removeEventListener('click',      resume);
      document.removeEventListener('keydown',    resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click',      resume);
    document.addEventListener('keydown',    resume);
    document.addEventListener('touchstart', resume);
  },

  _init() {
    this._registerUnlock(); // always ensure unlock listeners are live
    if(this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 1.0;
      this._masterGain.connect(this._ctx.destination);
      // If context was already allowed (e.g. gesture happened before _init),
      // nothing to do. If suspended, the unlock listener above will resume it.
    } catch(e) { console.warn('[SFX] Web Audio unavailable'); }
  },

  preload() {
    this._init();
    if(!this._ctx) return;
    // Preload SFX only — music loads on demand
    const sfxKeys = Object.keys(this._files).filter(k => !k.startsWith('music'));
    sfxKeys.forEach(n => this._load(n));
  },

  _load(name) {
    if(this._buffers[name]) return Promise.resolve(this._buffers[name]);
    if(this._loading[name]) return this._loading[name];
    const def = this._files[name];
    if(!def) return Promise.reject('no def');
    this._loading[name] = new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', def.src, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if(xhr.status === 0 || xhr.status === 200) {
          this._ctx.decodeAudioData(xhr.response)
            .then(buf => { this._buffers[name]=buf; delete this._loading[name]; resolve(buf); })
            .catch(e => { console.warn(`[SFX] decode failed "${name}":`,e); delete this._loading[name]; resolve(null); });
        } else {
          console.warn(`[SFX] load failed "${name}": HTTP ${xhr.status}`);
          delete this._loading[name]; resolve(null);
        }
      };
      xhr.onerror = () => { console.warn(`[SFX] network error "${name}"`); delete this._loading[name]; resolve(null); };
      xhr.send();
    });
    return this._loading[name];
  },

  // ── SFX ──────────────────────────────────────────────────
  _throttle: { bulletFire:90, gemPickup:80, enemyHit:50, boneThrow:120, knightTarget:200 },

  play(name) {
    if(this._muted || !name) return;
    this._init();
    if(!this._ctx) return;

    if(this._throttle[name]) {
      const now = performance.now();
      if(now - (this._lastPlayed[name]||0) < this._throttle[name]) return;
      this._lastPlayed[name] = now;
    }

    const doPlay = () => {
      if(this._buffers[name]){ this._playSFX(this._buffers[name], this._files[name]); return; }
      this._load(name).then(buf => { if(buf) this._playSFX(buf, this._files[name]); });
    };

    if(this._ctx.state === 'suspended'){
      this._ctx.resume().then(doPlay).catch(()=>{});
    } else {
      doPlay();
    }
  },

  _playSFX(buf, def) {
    if(!this._ctx || !this._masterGain) return;
    try {
      const c=this._ctx, now=c.currentTime;
      const src=c.createBufferSource(), gain=c.createGain();
      src.buffer=buf; src.playbackRate.value=def.pitch||1.0;
      gain.gain.setValueAtTime(def.vol||0.4, now);
      if(def.trim){
        gain.gain.setValueAtTime(def.vol||0.4, now+def.trim-0.02);
        gain.gain.linearRampToValueAtTime(0.0001, now+def.trim);
      }
      src.connect(gain); gain.connect(this._masterGain);
      src.start(now);
      if(def.trim) src.stop(now+def.trim+0.02);
    } catch(e) { console.warn('[SFX] _playSFX error:', e); }
  },

  // ── MUSIC ────────────────────────────────────────────────
  _hardStop() {
    if(this._music.fadeTimer){ clearTimeout(this._music.fadeTimer); this._music.fadeTimer=null; }
    if(this._music.srcNode){ try{ this._music.srcNode.stop(); }catch(e){} }
    this._music.srcNode  = null;
    this._music.gainNode = null;
    this._music.track    = null;
  },

  updateMusic(wave, hasBoss) {
    if(!GAME.state?.running) return;
    const track = (hasBoss || wave>=15) ? 'musicGlory'
                : wave>=10              ? 'musicDrive'
                :                        'musicPush';
    if(track === this._music.track) return;
    this._crossfadeTo(track, 2.0);
  },

  startMusic() {
    this._hardStop();
    this._crossfadeTo('musicPush', 1.5);
  },

  stopMusic() {
    if(!this._music.gainNode){ this._hardStop(); return; }
    const c=this._ctx;
    if(!c){ this._hardStop(); return; }
    const gain=this._music.gainNode, src=this._music.srcNode;
    try{
      gain.gain.setValueAtTime(gain.gain.value, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, c.currentTime+1.5);
    }catch(e){}
    this._music.srcNode  = null;
    this._music.gainNode = null;
    this._music.track    = null;
    this._music.fadeTimer = setTimeout(()=>{
      try{ src.stop(); }catch(e){}
      this._music.fadeTimer=null;
    }, 1600);
  },

  _crossfadeTo(trackName, fadeDuration=2.0) {
    this._init();
    if(!this._ctx) return;
    const c=this._ctx, def=this._files[trackName];
    if(!def) return;

    const doFade = () => {
      if(this._music.gainNode){
        const oldGain=this._music.gainNode, oldSrc=this._music.srcNode;
        try{
          oldGain.gain.setValueAtTime(oldGain.gain.value, c.currentTime);
          oldGain.gain.linearRampToValueAtTime(0.0001, c.currentTime+fadeDuration);
        }catch(e){}
        setTimeout(()=>{ try{ oldSrc.stop(); }catch(e){} }, fadeDuration*1000+100);
      }
      this._music.track    = trackName;
      this._music.srcNode  = null;
      this._music.gainNode = null;

      const startNew = (buf) => {
        if(this._music.track !== trackName) return;
        if(this._muted) return;
        const src=c.createBufferSource(), gain=c.createGain();
        src.buffer=buf; src.loop=true;
        if(trackName==='musicPush') src.loopEnd=Math.max(0, buf.duration-5);
        gain.gain.setValueAtTime(0.0001, c.currentTime);
        gain.gain.linearRampToValueAtTime(def.vol||0.3, c.currentTime+fadeDuration);
        src.connect(gain); gain.connect(this._masterGain);
        src.start(0);
        this._music.srcNode=src; this._music.gainNode=gain;
      };

      if(this._buffers[trackName]) startNew(this._buffers[trackName]);
      else this._load(trackName).then(buf=>{ if(buf) startNew(buf); });
    };

    if(c.state === 'suspended'){
      c.resume().then(doFade).catch(()=>{});
    } else {
      doFade();
    }
  },

  // ── MUTE ─────────────────────────────────────────────────
  mute()   { this._muted=true;  if(this._masterGain) this._masterGain.gain.value=0; },
  unmute() { this._muted=false; if(this._masterGain) this._masterGain.gain.value=1.0; },
  toggle() { this._muted ? this.unmute() : this.mute(); return this._muted; },
};

// Register unlock listeners immediately on script load — before any gesture happens
SFX._registerUnlock();
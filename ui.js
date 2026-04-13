// ============================================================
//  UI.JS  —  ALL UI: MENUS, HUD, JOYSTICK, SCREENS
//  + Nova Pillar bar (vertical, fills upward, glows when ready)
// ============================================================

const UI = {

  keys: { _jx:0, _jy:0 },
  joystick: { active:false, id:null, cx:0, cy:0, dx:0, dy:0 },

  init() {
    this.hpBar     = document.getElementById('hpBar');
    this.xpBar     = document.getElementById('xpBar');
    this.scoreEl   = document.getElementById('scoreVal');
    this.waveEl    = document.getElementById('waveVal');
    this.killsEl   = document.getElementById('killsVal');
    this.levelEl   = document.getElementById('levelVal');
    this.pwupEl    = document.getElementById('pwupVal');
    this.waveBarEl = document.getElementById('waveBar');
    this.aimEl        = document.getElementById('aimIndicator');
    this.pwupBarRow   = document.getElementById('pwupBarRow');
    this.pwupBarFill  = document.getElementById('pwupBarFill');
    this.pwupBarIcon  = document.getElementById('pwupBarIcon');
    this.pwupBarLabel = document.getElementById('pwupBarLabel');
    this.pwupBarRow2   = document.getElementById('pwupBarRow2');
    this.pwupBarFill2  = document.getElementById('pwupBarFill2');
    this.pwupBarIcon2  = document.getElementById('pwupBarIcon2');
    this.pwupBarLabel2 = document.getElementById('pwupBarLabel2');
    // Nova pillar elements
    this.novaFill1   = document.getElementById('novaFill1');
    this.novaFill2   = document.getElementById('novaFill2');
    this.novaFill3   = document.getElementById('novaFill3');
    this.novaCounter = document.getElementById('novaCounter');
    this.novaLabel   = document.getElementById('novaLabel');
    this.novaPillar  = document.getElementById('novaPillar');
    this.novaParticleContainer = document.getElementById('novaParticleContainer');
    this._novaPrevStored = 0;
    this._novaParticleTimer = 0;

    document.getElementById('startBtn').onclick   = () => this.startGame();
    document.getElementById('restartBtn').onclick = () => this.startGame();
    document.getElementById('resumeBtn').onclick  = () => this.resume();
    document.getElementById('pauseBtn').onclick   = () => this.pause();

    // ── PAUSE: RESTART / QUIT ─────────────────────────────────
    document.getElementById('pauseRestartBtn').onclick = () => {
      SFX.play('uiClick');
      this._showConfirm(
        '↺ RESTART RUN',
        'Your current run will be lost.\nAll progress this run is gone.',
        () => { this.resume(); this.startGame(); }
      );
    };
    document.getElementById('pauseQuitBtn').onclick = () => {
      SFX.play('uiClick');
      this._showConfirm(
        '✕ QUIT TO MENU',
        'Your current run will be lost.\nYou will return to the main menu.',
        () => { GAME.state.running=false; GAME.state.paused=false; SFX.stopMusic(); this.goMainMenu(); }
      );
    };
    document.getElementById('confirmYes').onclick = () => {
      SFX.play('uiClick');
      this._confirmAction && this._confirmAction();
      this._hideConfirm();
    };
    document.getElementById('confirmNo').onclick = () => {
      SFX.play('uiClick');
      this._hideConfirm();
    };

    window.addEventListener('keydown', e => {
      this.keys[e.key]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.key]=false; });
    window.addEventListener('keydown', e => { if(e.key==='Escape'||e.key==='p'||e.key==='P') this.togglePause(); });

    // ── Fix stuck keys ─────────────────────────────────────────
    // When the window loses focus (tab switch, alt+tab, overlay click, etc.)
    // keyup events are never fired, so keys stay permanently "held".
    // Clear all movement keys on any focus loss to prevent the stuck-key bug.
    const MOVE_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' '];
    const clearMoveKeys = () => { MOVE_KEYS.forEach(k => { this.keys[k] = false; }); };
    window.addEventListener('blur', clearMoveKeys);
    document.addEventListener('visibilitychange', () => { if(document.hidden) clearMoveKeys(); });

    // ── Mouse aim ──────────────────────────────────────────
    const canvas = document.getElementById('c');
    canvas.addEventListener('mousedown', e => {
      if(e.button===0) this._setAim(e, true);
    });
    canvas.addEventListener('mouseup', e => {
      if(e.button===0) this._clearAim();
    });
    canvas.addEventListener('mousemove', e => {
      if(this._aimHeld) this._setAim(e, true);
    });
    canvas.addEventListener('mouseleave', () => this._clearAim());
    // Prevent context menu on canvas
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ── Mobile aim (second touch on right half) ────────────
    canvas.addEventListener('touchstart', e => {
      [...e.changedTouches].forEach(t => {
        const rect=canvas.getBoundingClientRect();
        const tx=(t.clientX-rect.left)*(800/rect.width);
        if(tx > 400) this._setAimTouch(t, canvas);
      });
    }, {passive:true});
    canvas.addEventListener('touchmove', e => {
      [...e.changedTouches].forEach(t => {
        if(t.identifier===this._aimTouchId) this._setAimTouch(t, canvas);
      });
    }, {passive:true});
    canvas.addEventListener('touchend', e => {
      [...e.changedTouches].forEach(t => {
        if(t.identifier===this._aimTouchId) this._clearAim();
      });
    }, {passive:true});

    this.setupJoystick();
    this.setupAimJoystick();

    // Nova button
    const novaBtn = document.getElementById('novaBtn');
    if (novaBtn) {
      novaBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        const G = GAME.state;
        if (!G?.running || G.paused) return;
        // Trigger space key equivalent
        this.keys[' '] = true;
        setTimeout(() => { this.keys[' '] = false; }, 100);
      }, { passive: false });
    }
    this.novaBtnEl = novaBtn;
  },

  startGame() {
    this.hideAll();
    ['hud','novaPillar','waveProgress','pauseBtn','muteBtn',
    'joystick','aimJoystick','novaBtn','miniMap'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.visibility = 'visible';
    });
    this.keys = { _jx:0, _jy:0, _spacePrev:false };
    GAME._skillTutorialShown = false;
    SFX.stopMusic();
    DRAW._torches = null;
    DRAW._floorDetails = null;
    GAME.init();
    GAME.state.running = true;
    setTimeout(()=>SFX.startMusic(), 400);
  },

  // ── CONFIRMATION MODAL ───────────────────────────────────
  _showConfirm(title, msg, onYes) {
    this._confirmAction = onYes;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent   = msg;
    document.getElementById('confirmModal').classList.remove('hidden');
  },
  _hideConfirm() {
    document.getElementById('confirmModal').classList.add('hidden');
    this._confirmAction = null;
  },

  pause() {
    if(!GAME.state?.running) return;
    GAME.state.paused=true;
    // Clear movement keys so nothing stays "held" while paused
    ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' '].forEach(k=>{ this.keys[k]=false; });
    document.getElementById('pauseScreen').classList.remove('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
  },

  resume() {
    GAME.state.paused=false;
    // Clear movement keys again on resume so nothing carries over from before the pause
    ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' '].forEach(k=>{ this.keys[k]=false; });
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('pauseBtn').classList.remove('hidden');
  },

  togglePause() {
    if(!GAME.state?.running) return;
    // If confirm modal is open, ESC closes it instead of unpausing
    const confirmOpen = !document.getElementById('confirmModal').classList.contains('hidden');
    if(confirmOpen){ this._hideConfirm(); return; }
    // Don't toggle pause if level-up or skill-tut screen is open
    const levelUpOpen = !document.getElementById('levelUpScreen').classList.contains('hidden');
    const skillTutOpen = !document.getElementById('skillTutScreen').classList.contains('hidden');
    if(levelUpOpen || skillTutOpen) return;
    if(GAME.state.paused) this.resume(); else this.pause();
  },

  hideAll() {
    ['startScreen','pauseScreen','levelUpScreen','gameOverScreen',
     'skillTutScreen','shopScreen','guideScreen','profileScreen','chapterScreen'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.add('hidden');
    });
    document.getElementById('pauseBtn').classList.remove('hidden');
  },

  // ── CHAPTER TRANSITION SCREEN ─────────────────────────────
  showChapterTransition() {
    // Hide game HUD
    ['hud','novaPillar','waveProgress','pauseBtn','muteBtn',
     'joystick','aimJoystick','novaBtn','miniMap'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.visibility='hidden';
    });

    const screen = document.getElementById('chapterScreen');
    if(!screen) return;
    screen.classList.remove('hidden');

    // Build weapon cards
    screen.innerHTML = `
      <div id="chapterInner">
        <div id="chapterBadge">CHAPTER I COMPLETE</div>
        <h1 id="chapterTitle">⚡ THE ABYSS DEEPENS</h1>
        <p id="chapterLore">You have survived 25 waves of darkness.<br>
        Beyond the rift, enemies grow stronger — faster, deadlier, relentless.<br>
        Choose your weapon. Only one path forward.</p>

        <div id="chapterSubtitle">— CHOOSE YOUR WEAPON —</div>

        <div id="weaponCards">
          ${CFG.WEAPONS.map(w=>`
            <div class="weapon-card" id="wcard-${w.id}" onclick="UI._selectWeapon('${w.id}')">
              <div class="wcard-icon" style="color:${w.color}">${w.icon}</div>
              <div class="wcard-name" style="color:${w.color}">${w.name}</div>
              <div class="wcard-sub">${w.subtitle}</div>
              <div class="wcard-desc">${w.desc}</div>
              <div class="wcard-mastery">
                <div class="wcard-mastery-title">MASTERY PATH</div>
                ${w.mastery.map((m,i)=>`
                  <div class="wcard-mastery-row">
                    <span class="wcard-mastery-kills">${m.kills} kills</span>
                    <span class="wcard-mastery-bonus">${m.bonus}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div id="chapterWeaponConfirm" style="display:none;">
          <div id="chapterSelectedName"></div>
          <button class="btn" id="chapterEnterBtn" style="border-color:#e74c3c;color:#e74c3c;font-size:11px;padding:12px 24px;margin-top:12px;"
            onclick="UI._confirmWeapon()">
            ⚔ ENTER THE ABYSS
          </button>
        </div>
      </div>
    `;
    this._selectedWeapon = null;
  },

  _selectWeapon(weaponId) {
    SFX.play('uiClick');
    this._selectedWeapon = weaponId;
    // Highlight selected card
    document.querySelectorAll('.weapon-card').forEach(c=>{
      c.classList.remove('weapon-card-selected');
    });
    const card = document.getElementById('wcard-'+weaponId);
    if(card) card.classList.add('weapon-card-selected');
    // Show confirm
    const wDef = CFG.WEAPONS.find(w=>w.id===weaponId);
    const confirmEl = document.getElementById('chapterWeaponConfirm');
    const nameEl    = document.getElementById('chapterSelectedName');
    if(confirmEl) confirmEl.style.display='block';
    if(nameEl && wDef) nameEl.innerHTML =
      `<span style="color:${wDef.color};font-size:8px">${wDef.icon} ${wDef.name} selected</span>`;
  },

  _confirmWeapon() {
    if(!this._selectedWeapon) return;
    SFX.play('uiClick');
    document.getElementById('chapterScreen').classList.add('hidden');
    // Restore HUD
    ['hud','novaPillar','waveProgress','pauseBtn','muteBtn','miniMap'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.visibility='visible';
    });
    // Start Chapter II
    GAME.enterChapter2(this._selectedWeapon);
  },

  // ── HUD UPDATE ────────────────────────────────────────────
  updateHUD(G) {
    const p=G.player;
    this.hpBar.style.width=(p.hp/p.maxHp*100)+'%';
    this.xpBar.style.width=(p.xp/p.xpNeeded*100)+'%';
    this.scoreEl.textContent = 'SCORE: '+G.score;
    this.waveEl.textContent  = G.chapter >= 2 ? `CH.II WAVE ${G.wave}` : 'WAVE '+G.wave;
    this.killsEl.textContent = 'KILLS: '+G.kills;
    this.levelEl.textContent = 'LVL '+p.level;
    this.waveBarEl.style.width=(G.waveTimer/CFG.WAVE.DURATION*100)+'%';

    const pwupMeta = {
      rage:   { icon:'🔥', color:'#e74c3c', glow:'#e74c3c88' },
      time:   { icon:'⏱', color:'#3498db', glow:'#3498db88' },
      nuke:   { icon:'💣', color:'#e67e22', glow:'#e67e2288' },
      magnet: { icon:'🧲', color:'#9b59b6', glow:'#9b59b688' },
      ghost:  { icon:'👻', color:'#1abc9c', glow:'#1abc9c88' },
    };
    const DUR = CFG.POWERUP_DURATION * 60;
    const _applyBar = (row, fill, icon, label, kind, timer) => {
      if(!row) return;
      if(kind){
        const meta  = pwupMeta[kind] || { icon:'⚡', color:'#f1c40f', glow:'#f1c40f88' };
        const pct   = (timer / DUR) * 100;
        const isLow = pct < 25;
        row.style.display     = 'flex';
        icon.textContent      = meta.icon;
        icon.style.color      = meta.color;
        icon.style.borderColor= meta.color;
        icon.style.boxShadow  = `0 0 6px ${meta.color}, inset 0 0 4px rgba(255,255,255,0.1)`;
        fill.style.width      = Math.min(100, pct) + '%';
        fill.style.background = `linear-gradient(90deg,${meta.color}aa,${meta.color})`;
        fill.style.boxShadow  = `0 0 6px ${meta.glow},inset 0 0 4px rgba(255,255,255,0.15)`;
        label.textContent     = Math.ceil(timer/60) + 'S';
        label.style.color     = meta.color;
        row.classList.toggle('pwup-low', isLow);
      } else {
        row.style.display = 'none';
        row.classList.remove('pwup-low');
      }
    };

    // Old pill — shows both active powerup names
    if(p.activePowerup || p.activePowerup2){
      const name = [p.activePowerup, p.activePowerup2]
        .filter(Boolean).map(k=>k.toUpperCase()).join(' + ');
      this.pwupEl.textContent   = name;
      this.pwupEl.style.display = 'block';
    } else {
      this.pwupEl.style.display = 'none';
    }

    _applyBar(this.pwupBarRow,  this.pwupBarFill,  this.pwupBarIcon,  this.pwupBarLabel,  p.activePowerup,  p.powerupTimer);
    _applyBar(this.pwupBarRow2, this.pwupBarFill2, this.pwupBarIcon2, this.pwupBarLabel2, p.activePowerup2, p.powerupTimer2);

    // Aim mode indicator
    if(this.aimEl){
      this.aimEl.style.display = p.aimActive ? 'block' : 'none';
      this.aimEl.textContent   = p.aimTarget ? '🎯 LOCKED' : '🎯 AIM';
      this.aimEl.style.color   = p.aimTarget ? '#2ecc71' : '#e74c3c';
      this.aimEl.style.borderColor = p.aimTarget ? '#2ecc71' : '#e74c3c';
      this.aimEl.style.background  = p.aimTarget ? '#2ecc7122' : '#e74c3c22';
    }

    // ── Nova Pillar update ─────────────────────────────────
    this._updateNovaPillar(p);
  },

  _updateNovaPillar(p) {
    if(!this.novaFill1) return;
    const NOVA_MAX  = 3;
    const stored    = p.novaStored || 0;
    const needed    = p.novaKillsNeeded || 5;
    const kills     = Math.min(p.skillKills, needed);
    const progress  = p.skillCharge || 0; // 0.0 → 1.0 fill toward next charge

    // ── Layer heights ────────────────────────────────────────
    // Layer 1 (blue): full once charge 1 is stored, stays full until consumed
    // Layer 2 (green): starts filling once layer 1 is full (stored>=1)
    // Layer 3 (red): starts filling once layer 2 is full (stored>=2)
    // Drain: when stored drops, topmost layer transitions 100%→0% (CSS handles smoothly)

    const l1 = stored >= 1 ? 100
             : stored === 0 ? progress * 100
             : 0;

    const l2 = stored >= 2 ? 100
             : stored === 1 ? progress * 100
             : 0;

    const l3 = stored >= 3 ? 100
             : stored === 2 ? progress * 100
             : 0;

    this.novaFill1.style.height = l1 + '%';
    this.novaFill2.style.height = l2 + '%';
    this.novaFill3.style.height = l3 + '%';

    // ── Dot states (color-coded per layer) ───────────────────
    for(let i = 0; i < NOVA_MAX; i++){
      const dot = document.getElementById(`novaDot${i}`);
      if(dot) dot.className = 'nova-dot' + (i < stored ? ' filled' : '');
    }

    // ── Counter: "X LEFT" ────────────────────────────────────
    const hasCharge = stored > 0;
    if(stored >= NOVA_MAX){
      this.novaCounter.textContent = 'MAX';
    } else {
      this.novaCounter.textContent = stored > 0 ? stored + ' LEFT' : kills + '/' + needed;
    }

    // ── Ready glow ───────────────────────────────────────────
    if(hasCharge){
      this.novaPillar.classList.add('nova-ready');
    } else {
      this.novaPillar.classList.remove('nova-ready');
    }

    // ── Nova button sync (mobile) ────────────────────────────
    if(this.novaBtnEl){
      this.novaBtnEl.classList.toggle('nova-ready', hasCharge);
    }
    this.novaLabel.textContent = 'NOVA';

    // ── Rising particles ─────────────────────────────────────
    // Determine active layer color for particles
    const activeColor = stored >= 2 ? ['#ff9999','#ffcccc']   // red tint
                      : stored >= 1 ? ['#99ffcc','#ccffe8']   // green tint
                      :               ['#99eeff','#ccf7ff'];  // blue tint

    this._novaParticleTimer = (this._novaParticleTimer || 0) + 1;

    // Spawn rate: faster when nearly full or at max
    const spawnEvery = stored >= NOVA_MAX ? 6 : progress > 0.7 ? 9 : 14;

    if(this._novaParticleTimer % spawnEvery === 0 && this.novaParticleContainer){
      const p2   = document.createElement('div');
      const size = 2 + Math.random() * 2.5;
      const col  = activeColor[Math.random() < 0.6 ? 0 : 1];
      const dur  = 0.9 + Math.random() * 0.7;   // 0.9s – 1.6s
      const left = 10 + Math.random() * 80;     // % across pillar width

      p2.className = 'nova-particle';
      p2.style.cssText = `
        width:${size}px; height:${size}px;
        background:${col};
        box-shadow:0 0 ${size+1}px ${col};
        left:${left}%;
        bottom:${2 + Math.random() * 10}px;
        animation-duration:${dur}s;
      `;
      this.novaParticleContainer.appendChild(p2);

      // Clean up finished particles to avoid DOM bloat
      setTimeout(() => { p2.remove(); }, dur * 1000 + 100);
    }

    // ── Drain detection ──────────────────────────────────────
    // When stored drops we need to:
    //   • Let the TOP-MOST losing layer animate DOWN (keep transition)
    //   • Hard-snap any layers FURTHER above it (already empty, just slivers)
    if(stored < this._novaPrevStored){
      const layers = [this.novaFill1, this.novaFill2, this.novaFill3];
      const drainingLayer = this._novaPrevStored - 1; // index of layer draining out

      for(let i = stored; i < NOVA_MAX; i++){
        const el = layers[i];
        if(!el) continue;

        if(i === drainingLayer){
          // This is the layer that just lost its charge — animate it down smoothly
          // Ensure transition is active then let CSS do the work
          el.style.transition = '';
          el.style.height = '0%';
        } else {
          // Layer was already empty or is a leftover sliver — snap instantly
          el.style.transition = 'none';
          el.style.height = '0%';
          void el.offsetHeight; // force reflow
          // Restore transition after a frame so future fills animate normally
          requestAnimationFrame(() => { el.style.transition = ''; });
        }
      }
    }
    this._novaPrevStored = stored;
  },

  // ── SKILL TUTORIAL ────────────────────────────────────────
  showSkillTutorial() {
    document.getElementById('skillTutScreen').classList.remove('hidden');
  },

  hideSkillTutorial() {
    document.getElementById('skillTutScreen').classList.add('hidden');
    GAME.state.paused=false;
    GAME.announce('⚡ NOVA BLAST READY  [SPACE]','#00d4ff',240,7,'top');
  },

  // ── LEVEL UP ──────────────────────────────────────────────
  showLevelUp() {
    const screen=document.getElementById('levelUpScreen');
    const grid  =document.getElementById('upgradeCards');
    screen.classList.remove('hidden');
    grid.innerHTML='';
    const picks=[...CFG.UPGRADES].sort(()=>Math.random()-.5).slice(0,3);
    picks.forEach(u=>{
      const card=document.createElement('div');
      card.className='upgrade-card';
      card.innerHTML=`<span class="u-icon">${u.icon}</span><div class="u-name">${u.name}</div><div class="u-desc">${u.desc}</div>`;
      card.onclick=()=>{ SFX.play('uiClick'); u.apply(GAME.state.player); screen.classList.add('hidden'); GAME.state.paused=false; };
      grid.appendChild(card);
    });
  },

  // ── GAME OVER ─────────────────────────────────────────────
  goMainMenu() {
    SFX.stopMusic();
    this.hideAll();
    ['hud','novaPillar','waveProgress','pauseBtn','muteBtn',
    'joystick','aimJoystick','novaBtn','miniMap'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.visibility = 'hidden';
    });
    document.getElementById('startScreen').classList.remove('hidden');
    PROFILE.init();
  },
_saveRun(score, wave, kills) {
    const board = DB.get('ds_leaderboard') || [];
    const prevBest = board.length > 0 ? board[0].score : -1;
    const isNewBest = score > prevBest;
    board.push({ score, wave, kills, date: new Date().toLocaleDateString() });
    board.sort((a,b)=>b.score-a.score);
    board.splice(5);
    DB.set('ds_leaderboard', board);
    return isNewBest;
  },

  _getLeaderboard() {
    return DB.get('ds_leaderboard') || [];
  },

  _renderLeaderboard(containerId) {
    const el = document.getElementById(containerId);
    if(!el) return;
    const board = this._getLeaderboard();
    if(board.length===0){ el.innerHTML='<div class="lb-empty">No runs yet</div>'; return; }
    el.innerHTML = board.map((r,i)=>`
      <div class="lb-row ${i===0?'lb-gold':i===1?'lb-silver':i===2?'lb-bronze':''}">
        <span class="lb-rank">#${i+1}</span>
        <span class="lb-score">${r.score.toLocaleString()}</span>
        <span class="lb-detail">W${r.wave} · ${r.kills}K</span>
        <span class="lb-date">${r.date}</span>
      </div>`).join('');
  },

  showGameOver(score, wave, kills, earned) {
    // Hide game UI
    ['hud','novaPillar','waveProgress','pauseBtn','muteBtn',
    'joystick','aimJoystick','novaBtn','miniMap'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.visibility = 'hidden';
    });
    const isNewBest = this._saveRun(score, wave, kills);
    document.getElementById('pauseBtn').classList.add('hidden');
    // Show player name + level on game over
    const nameEl = document.getElementById('goName');
    if(nameEl){
      const name = PROFILE.getName()||'ADVENTURER';
      const lv   = PROFILE.getLevel();
      const tier = PROFILE.getTier(lv);
      nameEl.textContent = `${name}  ·  LV.${lv} ${tier.icon} ${tier.label}`;
      nameEl.style.color = tier.col;
    }
    document.getElementById('goScore').textContent  = '★ SCORE: '+score.toLocaleString();
    document.getElementById('goWave').textContent   = '⚔  WAVE:  '+wave;
    document.getElementById('goKills').textContent  = '☠ KILLS: '+kills;
    const earnedEl=document.getElementById('goEarned');
    if(earnedEl) earnedEl.textContent = `💰 +${earned} GOLD EARNED`;
    const totalEl=document.getElementById('goTotal');
    if(totalEl) totalEl.textContent = `TOTAL: ${META.getGold()} GOLD`;
    const bestEl=document.getElementById('goBest');
    if(bestEl) bestEl.textContent = isNewBest ? '🏆 NEW BEST!' : '';
    this._renderLeaderboard('goLeaderboard');

    // ── CHAOS UNLOCK BANNER ──────────────────────────────
    const chaosEl = document.getElementById('goChaosUnlock');
    if(chaosEl) {
      if(this._pendingChaosUnlock) {
        chaosEl.style.display = 'block';
        this._pendingChaosUnlock = false;
        // Animate in
        setTimeout(()=>{ chaosEl.style.opacity='1'; chaosEl.style.transform='scale(1)'; },100);
      } else {
        chaosEl.style.display = 'none';
      }
    }

    document.getElementById('gameOverScreen').classList.remove('hidden');
  },

  // ── SHOP ──────────────────────────────────────────────────
  showShop(fromScreen) {
    this._shopReturnTo = fromScreen || 'startScreen';
    this._shopTab = this._shopTab || 'upgrades';
    ['startScreen','gameOverScreen','pauseScreen'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.add('hidden');
    });
    this._renderShop();
    document.getElementById('shopScreen').classList.remove('hidden');
  },

  hideShop() {
    document.getElementById('shopScreen').classList.add('hidden');
    const ret = this._shopReturnTo || 'startScreen';
    const el = document.getElementById(ret);
    if(el) el.classList.remove('hidden');
    this._shopReturnTo = null;
  },

  shopTab(tab) {
    this._shopTab = tab;
    document.querySelectorAll('.shop-tab').forEach(t=>{
      t.classList.toggle('shop-tab-active', t.dataset.tab===tab);
    });
    this._renderShopGrid();
  },

  _renderShop() {
    const data  = META.load();
    const goldEl= document.getElementById('shopGold');
    if(goldEl) goldEl.textContent = `💰 ${data.gold} GOLD`;

    // Inject tab bar if not present
    const tabBar = document.getElementById('shopTabBar');
    if(tabBar) {
      tabBar.innerHTML = [
        {id:'upgrades', label:'⬆ UPGRADES'},
        {id:'weapons',  label:'⚔ WEAPONS'},
        {id:'equipment',label:'🛡 EQUIPMENT'},
      ].map(t=>`<button class="shop-tab${this._shopTab===t.id?' shop-tab-active':''}" data-tab="${t.id}" onclick="UI.shopTab('${t.id}')">${t.label}</button>`).join('');
    }

    this._renderShopGrid();
  },

  _renderShopGrid() {
    const grid = document.getElementById('shopGrid');
    if(!grid) return;
    const data = META.load();
    const tab  = this._shopTab || 'upgrades';

    if(tab === 'upgrades') {
      grid.innerHTML = CFG.META_UPGRADES.map(upg => {
        const lvl    = data.levels[upg.id]||0;
        const maxed  = lvl>=upg.maxLevel;
        const cost   = maxed ? 0 : upg.costs[lvl];
        const canBuy = !maxed && data.gold>=cost;
        const pips   = Array.from({length:upg.maxLevel},(_,i)=>
          `<span class="pip ${i<lvl?'pip-on':''}">${i<lvl?'▪':'▫'}</span>`).join('');
        return `<div class="shop-card ${maxed?'shop-maxed':canBuy?'shop-buyable':'shop-poor'}"
                     onclick="UI._buyUpgrade('${upg.id}')">
          <div class="shop-icon">${upg.icon}</div>
          <div class="shop-name">${upg.name}</div>
          <div class="shop-desc">${upg.desc}</div>
          <div class="shop-pips">${pips}</div>
          <div class="shop-cost">${maxed?'MAXED':`${cost}💰`}</div>
        </div>`;
      }).join('');

    } else if(tab === 'weapons') {
      const owned = data.ownedWeapons || [];
      const weapons = (typeof CFG !== 'undefined' && CFG.SHOP_WEAPONS) || [];
      grid.style.gridTemplateColumns = 'repeat(3,1fr)';
      grid.innerHTML = weapons.map(w => {
        const isOwned = owned.includes(w.id);
        const canBuy  = !isOwned && data.gold >= w.cost;
        return `<div class="shop-card shop-weapon-card ${isOwned?'shop-maxed':canBuy?'shop-buyable':'shop-poor'}"
                     style="--wc:${w.color}" onclick="UI._buyWeapon('${w.id}')">
          <div class="shop-icon">${w.icon}</div>
          <div class="shop-name" style="color:${w.color}">${w.name}</div>
          <div class="shop-desc">${w.desc}</div>
          <div class="shop-desc" style="color:#888;font-size:5px;margin-top:4px">${w.statLine}</div>
          <div class="shop-cost">${isOwned?'✓ OWNED':`${w.cost}💰`}</div>
        </div>`;
      }).join('');

    } else if(tab === 'equipment') {
      const ownedEq = data.ownedEquipment || [];
      const equip   = (typeof CFG !== 'undefined' && CFG.EQUIPMENT) || [];
      grid.style.gridTemplateColumns = 'repeat(3,1fr)';
      grid.innerHTML = equip.map(eq => {
        const isOwned = ownedEq.includes(eq.id);
        const canBuy  = !isOwned && data.gold >= eq.cost;
        return `<div class="shop-card ${isOwned?'shop-maxed':canBuy?'shop-buyable':'shop-poor'}"
                     style="--wc:${eq.color}" onclick="UI._buyEquipment('${eq.id}')">
          <div class="shop-icon">${eq.icon}</div>
          <div class="shop-name" style="color:${eq.color}">${eq.name}</div>
          <div class="shop-desc">${eq.desc}</div>
          <div class="shop-cost">${isOwned?'✓ OWNED':`${eq.cost}💰`}</div>
        </div>`;
      }).join('');
    }
  },

  _buyWeapon(id) {
    const data = META.load();
    const owned = data.ownedWeapons || [];
    if(owned.includes(id)) return;
    const w = (CFG.SHOP_WEAPONS||[]).find(x=>x.id===id);
    if(!w) return;
    if(data.gold < w.cost) { this._shopStatus(`🔒 Need ${w.cost} 💰`,'#e74c3c'); return; }
    data.gold -= w.cost;
    data.ownedWeapons = [...owned, id];
    META.save(data);
    SFX.play('levelUp');
    this._shopStatus(`✓ ${w.name} UNLOCKED — available in Ch.II!`, w.color);
    this._renderShop();
  },

  _buyEquipment(id) {
    const data = META.load();
    const ownedEq = data.ownedEquipment || [];
    if(ownedEq.includes(id)) return;
    const eq = (CFG.EQUIPMENT||[]).find(x=>x.id===id);
    if(!eq) return;
    if(data.gold < eq.cost) { this._shopStatus(`🔒 Need ${eq.cost} 💰`,'#e74c3c'); return; }
    data.gold -= eq.cost;
    data.ownedEquipment = [...ownedEq, id];
    META.save(data);
    SFX.play('levelUp');
    this._shopStatus(`✓ ${eq.name} EQUIPPED — active next run!`, eq.color);
    this._renderShop();
  },

  _shopStatus(msg, color) {
    let el = document.getElementById('shopStatus');
    if(!el) return;
    el.textContent = msg; el.style.color = color||'#f1c40f'; el.style.opacity='1';
    clearTimeout(this._shopStatusTimer);
    this._shopStatusTimer = setTimeout(()=>{ el.style.opacity='0'; }, 2600);
  },


  //   if(!grid) return;
  //   grid.innerHTML = CFG.META_UPGRADES.map(upg => {
  //     const lvl     = data.levels[upg.id]||0;
  //     const maxed   = lvl>=upg.maxLevel;
  //     const cost    = maxed ? 0 : upg.costs[lvl];
  //     const canBuy  = !maxed && data.gold>=cost;
  //     const pips    = Array.from({length:upg.maxLevel},(_,i)=>
  //       `<span class="pip ${i<lvl?'pip-on':''}">${i<lvl?'▪':'▫'}</span>`).join('');

  //     return `<div class="shop-card ${maxed?'shop-maxed':canBuy?'shop-buyable':'shop-poor'}"
  //                  onclick="UI._buyUpgrade('${upg.id}')">
  //       <div class="shop-icon">${upg.icon}</div>
  //       <div class="shop-name">${upg.name}</div>
  //       <div class="shop-desc">${upg.desc}</div>
  //       <div class="shop-pips">${pips}</div>
  //       <div class="shop-cost">${maxed?'MAXED':canBuy?`${cost}💰`:`${cost}💰`}</div>
  //     </div>`;
  //   }).join('');
  // },

  _buyUpgrade(id) {
    const prevPts = PROFILE.getTotalPoints();
    if(META.purchase(id)){
      SFX.play('levelUp');
      this._renderShop();
      PROFILE.checkLevelUp(prevPts);
      PROFILE.renderCard();
    }
  },

  // ── CODEX ─────────────────────────────────────────────────
  showCodex(fromScreen) {
    this._codexReturn = fromScreen || 'startScreen';
    ['startScreen','gameOverScreen','pauseScreen'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.add('hidden');
    });
    document.getElementById('codexScreen').classList.remove('hidden');
    this.codexTab('controls');
  },

  hideCodex() {
    document.getElementById('codexScreen').classList.add('hidden');
    const ret = this._codexReturn || 'startScreen';
    const el  = document.getElementById(ret);
    if(el) el.classList.remove('hidden');
  },

  codexTab(tab) {
    // Update active tab
    document.querySelectorAll('.codex-tab').forEach(t=>{
      t.classList.toggle('active', t.dataset.tab===tab);
    });
    // Hide detail
    document.getElementById('codexDetail').classList.add('hidden');
    // Render content
    const content = document.getElementById('codexContent');
    content.innerHTML = this._codexSections[tab]?.() || '';
    this._activeCodexTab = tab;
  },

  codexSelectEnemy(idx) {
    document.querySelectorAll('.cx-enemy-card').forEach((c,i)=>{
      c.classList.toggle('selected', i===idx);
    });
    const e = this._codexEnemyData()[idx];
    if(!e) return;
    const detail = document.getElementById('codexDetail');
    detail.classList.remove('hidden');
    const tierLabel = {normal:'NORMAL',elite:'ELITE',champion:'CHAMPION',boss:'BOSS'}[e.tier];
    const tierCol   = {normal:'#e74c3c',elite:'#f1c40f',champion:'#9b59b6',boss:'#ff0055'}[e.tier];
    detail.innerHTML = `
      <div class="cx-detail-name">${e.icon} ${e.name}</div>
      <div class="cx-detail-tier" style="color:${tierCol}">◆ ${tierLabel} TIER</div>
      ${[
        ['HP',       e.hp],
        ['Speed',    e.speed],
        ['Damage',   e.dmg],
        ['XP Value', e.xp],
        ['Threat',   e.threat],
      ].map(([k,v])=>`
        <div class="cx-stat-row"><span>${k}</span><span class="cx-stat-val">${v}</span></div>
      `).join('')}
      <div class="cx-ability-list">
        ${e.abilities.map(a=>`<div class="cx-ability">⚡ ${a}</div>`).join('')}
      </div>
      <div class="cx-tip">💡 ${e.tip}</div>
    `;
  },

  codexSelectMod(idx) {
    document.querySelectorAll('.cx-mod-card').forEach((c,i)=>{
      c.classList.toggle('selected', i===idx);
    });
    const m = this._codexModData()[idx];
    if(!m) return;
    const detail = document.getElementById('codexDetail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <div class="cx-detail-name">${m.icon} ${m.name}</div>
      <div class="cx-info-body" style="margin-top:8px">${m.fullDesc}</div>
      <div class="cx-tip">💡 ${m.tip}</div>
    `;
  },

  // ── CODEX DATA ────────────────────────────────────────────
  _codexEnemyData() {
    return [
      { icon:'👺', name:'GOBLIN',      tier:'normal',   hp:'Low',    speed:'Fast',   dmg:'Low',    xp:'5',  threat:'⭐',     abilities:['Swarms in groups','Faster than knights'],             tip:'Easy kills early — use for Nova charge. Ignore in late waves.' },
      { icon:'💀', name:'SKELETON',    tier:'normal',   hp:'Low',    speed:'Medium', dmg:'Medium', xp:'6',  threat:'⭐⭐',   abilities:['Throws bones in 4 directions','Only cardinal angles'],  tip:'Bones only travel H/V — stay diagonal to avoid all projectiles.' },
      { icon:'🧙', name:'MAGE',        tier:'normal',   hp:'Low',    speed:'Slow',   dmg:'High',   xp:'8',  threat:'⭐⭐',   abilities:['Shields nearby allies','Ranged magic bolts'],           tip:'Priority target — kill mages first or your combo gets shielded.' },
      { icon:'🛡',  name:'KNIGHT',     tier:'normal',   hp:'Medium', speed:'Medium', dmg:'High',   xp:'8',  threat:'⭐⭐',   abilities:['Charges at locked position','Shows ⚠ warning 1.5s before'], tip:'Watch for the red X on the floor — it telegraphs exactly where he charges.' },
      { icon:'🐗', name:'ORC',         tier:'elite',    hp:'High',   speed:'Slow',   dmg:'High',   xp:'15', threat:'⭐⭐⭐', abilities:['Ground smash AoE in 100px radius','Bone throw'],         tip:'Dangerous up close. Stay outside 100px — use Ray Aim to snipe.' },
      { icon:'👻', name:'WRAITH',      tier:'elite',    hp:'Medium', speed:'Fast',   dmg:'Medium', xp:'14', threat:'⭐⭐⭐', abilities:['Teleports to 60px from you every 4s','Dodges bullets'],   tip:'Keep moving. It teleports behind you — pivot fast or use Nova.' },
      { icon:'🔮', name:'WARLOCK',     tier:'elite',    hp:'Medium', speed:'Medium', dmg:'High',   xp:'16', threat:'⭐⭐⭐', abilities:['3-orb spread attack','Shields ALL nearby allies'],        tip:'Shield aura is huge. Kill it before engaging clustered enemies.' },
      { icon:'😡', name:'BERSERKER',   tier:'elite',    hp:'High',   speed:'Medium', dmg:'Very High',xp:'18','threat':'⭐⭐⭐⭐',abilities:['Enrages at 50% HP — speed ×2','Charges with dual axes'], tip:'Burst it to 0 before 50% HP if possible. Once enraged it\'s terrifying.' },
      { icon:'👑', name:'WARLORD',     tier:'champion', hp:'Very High',speed:'Medium',dmg:'Extreme',xp:'30','threat':'⭐⭐⭐⭐⭐',abilities:['Ground slam every 5s — 15 dmg AoE','Spawns minions','Bone throw'], tip:'Never stand still near it. Spam Ray Aim from max range.' },
      { icon:'🌫', name:'SPECTER',     tier:'champion', hp:'High',   speed:'Fast',   dmg:'High',   xp:'28', threat:'⭐⭐⭐⭐', abilities:['Invisible until 120px','Burning red eyes are only tell'], tip:'Watch for faint red eye glow — use Nova when you suspect clusters.' },
      { icon:'🦴', name:'LICH',        tier:'champion', hp:'High',   speed:'Slow',   dmg:'High',   xp:'32', threat:'⭐⭐⭐⭐⭐',abilities:['Fire ring — 8 radial projectiles every 6s','Shields allies'],  tip:'When fire ring launches, run to the gap between two projectiles.' },
      { icon:'🖤', name:'DEATH KNIGHT',tier:'champion', hp:'Very High',speed:'Medium',dmg:'Extreme',xp:'35','threat':'⭐⭐⭐⭐⭐',abilities:['3-bone spread throw','Fast charge combo','Massive armor'],  tip:'Most dangerous champion. Save Nova for when it appears with others.' },
      { icon:'🔴', name:'BOSS',        tier:'boss',     hp:'Massive',speed:'Slow',   dmg:'Extreme',xp:'100','threat':'💀💀💀',abilities:['Appears every 5 waves','Immune to instant-kill','Takes 20% Nova dmg'], tip:'Nova deals only 20% HP. Kite in circles and burst with Ray Aim.' },
    ];
  },

  _codexModData() {
    return [
      { icon:'👁',  name:'CURSED WAVE',  danger:'high',  dangerTxt:'DANGEROUS',
        desc:'Enemies move 1.5× faster this wave.',
        fullDesc:'All enemies spawned this wave have their base speed multiplied by 1.5. Fast enemies like Goblins and Wraiths become extremely hard to kite.',
        tip:'Stay near the centre of the arena. Use Nova if surrounded — you can\'t outrun them.' },
      { icon:'🩸', name:'BLOOD PACT',    danger:'high',  dangerTxt:'HIGH RISK / REWARD',
        desc:'Deal 2× damage. Take 2× damage.',
        fullDesc:'A double-edged modifier. Your bullets hit twice as hard — but every hit you take also deals double damage. Last Stand triggers at 20% HP as usual.',
        tip:'Extremely good if you have piercing ammo or multi-shot. Avoid if your HP is already low.' },
      { icon:'💀', name:'ELITE RUSH',    danger:'high',  dangerTxt:'DANGEROUS',
        desc:'Only elite and champion enemies spawn.',
        fullDesc:'Normal enemies are completely replaced. Wave 6–12 spawns only elites. Wave 13+ mixes elites and champions. Expect heavy HP sponges.',
        tip:'Save your Nova for this wave. Kill Warlocks first — their shield aura makes everything harder.' },
      { icon:'⚡', name:'FRENZY',        danger:'med',   dangerTxt:'MEDIUM',
        desc:'2× spawn rate. All enemies at half HP.',
        fullDesc:'Enemies spawn twice as fast but arrive with 50% of their normal HP. Great for combos and XP farming — weak enemies die fast.',
        tip:'Best wave for building your Nova charge fast. Spam attacks and keep combos going.' },
      { icon:'🛡', name:'IRON WAVE',     danger:'med',   dangerTxt:'MEDIUM',
        desc:'All enemies spawn with 2 armor hits.',
        fullDesc:'Every enemy has a blue armor shield that must be broken before HP damage is dealt. Two hits break armor, then normal damage applies.',
        tip:'Piercing fire ammo cuts through armor fast. If you have multi-shot, each bullet counts.' },
      { icon:'💰', name:'BOUNTY WAVE',   danger:'low',   dangerTxt:'EASY — FARM IT',
        desc:'Score is multiplied ×3 this entire wave.',
        fullDesc:'Every enemy killed this wave gives triple score points, including combo bonuses. Best wave to chase high scores. No gameplay change.',
        tip:'Build up a combo streak early in the wave and hold it — ×10 combo on a bounty wave is massive.' },
      { icon:'🌑', name:'DARKNESS',      danger:'high',  dangerTxt:'DANGEROUS',
        desc:'Vision reduced to torch range only.',
        fullDesc:'A heavy vignette shrinks your visible area to roughly 220px around your player. Enemies approach from darkness — you won\'t see them until they\'re close.',
        tip:'Use the minimap in the corner constantly. Stay near the center so you have room to dodge.' },
    ];
  },

  _codexSections: {
    controls() {
      return `
        <div class="codex-title">🎮 CONTROLS</div>
        <div class="cx-ctrl-grid">
          ${[
            ['W A S D',        'Move player up / left / down / right'],
            ['ARROW KEYS',     'Alternative movement (same as WASD)'],
            ['HOLD LEFT MOUSE','Activate Ray Aim — sweep to target enemies on the line'],
            ['SPACE',          'Fire Nova Blast when the left pillar is fully charged'],
            ['ESC / P',        'Pause and resume the game'],
            ['🔊 ON / OFF',    'Mute button — top right corner of screen'],
            ['Mobile: Left thumb', 'Virtual joystick — drag to move'],
            ['Mobile: Right touch','Ray Aim — touch right side to aim and fire'],
          ].map(([k,v])=>`
            <div class="cx-ctrl">
              <div class="cx-ctrl-key">${k}</div>
              <div class="cx-ctrl-desc">${v}</div>
            </div>
          `).join('')}
        </div>
        <div class="cx-info-card" style="margin-top:12px">
          <div class="cx-info-header"><span class="cx-info-icon">🎯</span><span class="cx-info-name">RAY AIM EXPLAINED</span></div>
          <div class="cx-info-body">
            Hold left mouse to draw a ray from your player toward the cursor.<br><br>
            Bullets fire toward the <b>nearest enemy within 50px of that line</b> — not your exact cursor.<br><br>
            Crosshair turns <span style="color:#2ecc71">GREEN</span> when locked on a target, <span style="color:#e74c3c">RED</span> when no enemy is on the ray.<br><br>
            Release mouse to return to <b>auto-aim</b> (targets nearest enemy in range).
          </div>
        </div>`;
    },

    enemies() {
      const data = UI._codexEnemyData();
      return `
        <div class="codex-title">⚔ ENEMY CODEX — Click any enemy to see full stats</div>
        <div class="cx-enemy-grid">
          ${data.map((e,i)=>`
            <div class="cx-enemy-card tier-${e.tier}" onclick="UI.codexSelectEnemy(${i})">
              <div class="cx-enemy-icon">${e.icon}</div>
              <div class="cx-enemy-name">${e.name}</div>
              <div class="cx-tier-badge badge-${e.tier}">${e.tier.toUpperCase()}</div>
            </div>
          `).join('')}
        </div>
        <div class="cx-info-card" style="margin-top:12px">
          <div class="cx-info-body">
            <b style="color:#e74c3c">NORMAL</b> — Waves 1–5 · Basic enemies, no outlines<br>
            <b style="color:#f1c40f">ELITE</b> — Waves 6–12 · Gold glow, yellow eyes, abilities<br>
            <b style="color:#9b59b6">CHAMPION</b> — Waves 13+ · Dark aura, red eyes, deadly<br>
            <b style="color:#ff0055">BOSS</b> — Every 5 waves · Massive HP, Nova-resistant
          </div>
        </div>`;
    },

    waves() {
      const mods = UI._codexModData();
      const dangerColor = { low:'#2ecc71', med:'#f1c40f', high:'#e74c3c' };
      return `
        <div class="codex-title">🌊 WAVE MODIFIERS — Click a modifier to learn more</div>
        <div class="cx-mod-grid">
          ${mods.map((m,i)=>`
            <div class="cx-mod-card" onclick="UI.codexSelectMod(${i})">
              <div class="cx-mod-header">
                <span class="cx-mod-icon">${m.icon}</span>
                <span class="cx-mod-name">${m.name}</span>
              </div>
              <div class="cx-mod-desc">${m.desc}</div>
              <div class="cx-danger" style="color:${dangerColor[m.danger]}">
                ◆ ${m.dangerTxt}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="cx-info-card" style="margin-top:10px">
          <div class="cx-info-header"><span class="cx-info-icon">🎲</span><span class="cx-info-name">HOW MODIFIERS WORK</span></div>
          <div class="cx-info-body">
            One random modifier rolls every wave starting from <b>wave 3</b>.<br>
            The same modifier never repeats back-to-back.<br>
            Modifier is announced with a big banner at wave start — you have a moment to prepare.
          </div>
        </div>`;
    },

    shop() {
      return `
        <div class="codex-title">💰 SHOP & GOLD SYSTEM</div>
        <div class="cx-info-card">
          <div class="cx-info-header"><span class="cx-info-icon">🏅</span><span class="cx-info-name">HOW TO EARN GOLD</span></div>
          <div class="cx-info-body">
            Gold is earned at the end of every run — even if you die early.<br><br>
            <b>Formula:</b> kills × 2 + wave × 10 + score × 0.01<br><br>
            The <b>Gold Rush</b> upgrade multiplies all earnings by up to +100%.<br>
            Gold is permanent — it never resets between runs.
          </div>
        </div>
        <div class="cx-info-card">
          <div class="cx-info-header"><span class="cx-info-icon">🏪</span><span class="cx-info-name">10 PERMANENT UPGRADES (5 LEVELS EACH)</span></div>
          <div class="cx-info-body">
            ${[
              ['❤','Vitality',       '+15 max HP per level (up to +75 HP)'],
              ['⚔','Battle Hardened','+3 damage per level (up to +15 dmg)'],
              ['👟','Swift Feet',     '+0.2 speed per level (up to +1.0)'],
              ['🧲','Soul Magnet',    '+20 pickup range per level'],
              ['🛡','Iron Will',      'Start with extra shield charges'],
              ['⚡','Nova Mastery',   'Nova charges 1 kill faster per level'],
              ['🍀','Fortune',        '+15% all drop rates per level'],
              ['🏹','Marksman',       '+10 attack range per level'],
              ['💰','Gold Rush',      '+20% gold earned per run per level'],
              ['🔄','Second Wind',    'Last Stand triggers one extra time per level'],
            ].map(([icon,name,desc])=>`
              <b>${icon} ${name}</b> — ${desc}<br>
            `).join('')}
          </div>
        </div>
        <div class="cx-info-card">
          <div class="cx-info-header"><span class="cx-info-icon">💡</span><span class="cx-info-name">BEST FIRST UPGRADES</span></div>
          <div class="cx-info-body">
            <b>Nova Mastery</b> → charges faster = more blasts per run<br>
            <b>Gold Rush</b> → compounds every run, pays for itself<br>
            <b>Second Wind</b> → extra Last Stand = more survival<br>
            <b>Soul Magnet</b> → passive XP gain without moving
          </div>
        </div>`;
    },

    powerups() {
      return `
        <div class="codex-title">⚡ POWERUPS</div>
        <div class="cx-info-card">
          <div class="cx-info-header"><span></span><span class="cx-info-name">HOW POWERUPS WORK</span></div>
          <div class="cx-info-body">
            Powerups drop from killed enemies (chance increases with Fortune upgrade).<br>
            They glow on the ground and disappear after a few seconds — pick them up fast.<br>
            Only one powerup is active at a time. Duration: <b>8 seconds</b>.
          </div>
        </div>
        ${[
          ['🔥','RAGE',       'Damage ×2.5 for 8s','All bullets deal massive damage. Best combo with multi-shot or fire ammo.',                      'Save for Champion waves or Boss encounters.'],
          ['⏱','TIME WARP',  'Speed ×2 for 8s',   'Player moves at double speed. Great for kiting Cursed Wave enemies.',                           'Combine with Ray Aim — you can orbit enemies while shooting.'],
          ['💥','NUKE',       'AoE pulse every frame','Continuous 120px explosion around you. Walk through enemies to kill them.',                  'Walk into large groups. Best combined with Rage.'],
          ['🛡','GUARDIAN',   '+3 shield charges',  'Instantly adds 3 shield charges that block one hit each. Great emergency pickup.',             'Pick up immediately if low HP — shields block lethal hits too.'],
          ['⚡','CHAIN BOLT', '+2 bullets per shot', 'Temporarily gives multi-shot — fires extra bullets per attack.',                              'Great for Nova charging. Kill as many as possible in the 8 seconds.'],
        ].map(([icon,name,effect,desc,tip])=>`
          <div class="cx-info-card">
            <div class="cx-info-header">
              <span class="cx-info-icon">${icon}</span>
              <span class="cx-info-name">${name}</span>
            </div>
            <div class="cx-info-body">
              <b>Effect:</b> ${effect}<br><br>${desc}
              <div class="cx-tip" style="margin-top:8px">💡 ${tip}</div>
            </div>
          </div>
        `).join('')}`;
    },

    mechanics() {
      return `
        <div class="codex-title">🏆 CORE MECHANICS</div>
        ${[
          ['⚡','NOVA BLAST',
           'The pillar on the LEFT side of the screen charges with kills. When full — press SPACE.',
           ['Nova kills Normal enemies instantly (100% HP)','Deals 60% HP to Elite enemies','Deals 40% HP to Champion enemies','Deals 20% HP to Boss'],
           'Charge Nova during easy waves. Fire it the moment a Champion or Boss appears. Never sit on a full charge — use it.'],
          ['💥','COMBO MULTIPLIER',
           'Kill enemies within 2.5 seconds of each other to build a combo streak.',
           ['x2–x4 — small score bonus','x5+ — orange glow, screen edges pulse','x10+ — gold glow, big score multiplier','Combo resets if 2.5s pass without a kill'],
           'Stay mobile and rotate through enemies. Combo on a Bounty Wave is your highest scoring opportunity.'],
          ['🔥','LAST STAND (CARNAGE MODE)',
           'When your HP drops to 20% or below — Carnage Mode activates automatically.',
           ['Speed ×2 for 8 seconds','Damage ×3 for 8 seconds','Bullets become fire type (piercing)','Second Wind upgrade gives extra charges'],
           'Don\'t panic when low — Carnage Mode is your comeback mechanic. Run into groups during it.'],
          ['🎯','RAY AIM',
           'Hold left mouse button to draw a targeting ray from player toward cursor.',
           ['Bullets snap to nearest enemy within 50px of the ray','Unlimited range in aim mode','Auto-aim resumes on release','HUD shows 🎯 LOCKED when target acquired'],
           'Sweep the ray slowly through groups to pick off priority targets. Use it to snipe Warlocks before they shield.'],
          ['🩸','BLOOD PACT (WAVE MODIFIER)',
           'A wave modifier that dramatically changes risk/reward.',
           ['Your damage ×2 while active','Damage you take ×2 while active','Lasts the entire wave','Can combo with Carnage Mode for insane damage'],
           'If you have good HP and shields going in — Blood Pact is your best scoring wave. High risk, highest reward.'],
        ].map(([icon,name,desc,bullets,tip])=>`
          <div class="cx-info-card">
            <div class="cx-info-header">
              <span class="cx-info-icon">${icon}</span>
              <span class="cx-info-name">${name}</span>
            </div>
            <div class="cx-info-body">
              ${desc}<br><br>
              ${bullets.map(b=>`◆ ${b}<br>`).join('')}
              <div class="cx-tip" style="margin-top:8px">💡 ${tip}</div>
            </div>
          </div>
        `).join('')}`;
    },
  },
  _setAim(e, held) {
    const canvas=document.getElementById('c');
    const rect=canvas.getBoundingClientRect();
    const cx=(e.clientX-rect.left)*(800/rect.width);
    const cy=(e.clientY-rect.top)*(600/rect.height);
    this._aimHeld=held;
    const G=GAME.state;
    if(!G?.running||G.paused) return;
    const p=G.player;
    // Convert canvas coords → world coords
    p.aimX = cx + G.camera.x;
    p.aimY = cy + G.camera.y;
    p.aimActive = true;
  },

  _setAimTouch(t, canvas) {
    const rect=canvas.getBoundingClientRect();
    const cx=(t.clientX-rect.left)*(800/rect.width);
    const cy=(t.clientY-rect.top)*(600/rect.height);
    this._aimTouchId=t.identifier;
    const G=GAME.state;
    if(!G?.running||G.paused) return;
    const p=G.player;
    p.aimX = cx + G.camera.x;
    p.aimY = cy + G.camera.y;
    p.aimActive=true;
  },

  _clearAim() {
    this._aimHeld=false;
    this._aimTouchId=null;
    const G=GAME.state;
    if(G?.player){ G.player.aimActive=false; G.player.aimTarget=null; }
  },

  // ── JOYSTICK ──────────────────────────────────────────────
  setupJoystick() {
    const jBase =document.getElementById('jBase');
    const jThumb=document.getElementById('jThumb');
    if(!jBase) return;
    const onStart=(e)=>{
      e.preventDefault();
      const touch=e.changedTouches[0];
      const rect=jBase.getBoundingClientRect();
      this.joystick={active:true,id:touch.identifier,cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,dx:0,dy:0};
    };
    const onMove=(e)=>{
      e.preventDefault();
      if(!this.joystick.active) return;
      const touch=[...e.changedTouches].find(t=>t.identifier===this.joystick.id);
      if(!touch) return;
      const J=this.joystick;

      // Recalculate center every move in case layout shifted
      const rect=jBase.getBoundingClientRect();
      J.cx=rect.left+rect.width/2;
      J.cy=rect.top+rect.height/2;

      const dx=touch.clientX-J.cx, dy=touch.clientY-J.cy;
      const dist=Math.min(Math.sqrt(dx*dx+dy*dy),40);
      const angle=Math.atan2(dy,dx);
      J.dx=Math.cos(angle); J.dy=Math.sin(angle);
      jThumb.style.transform=`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
      this.keys._jx=J.dx; this.keys._jy=J.dy;
    };
    const onEnd=()=>{
      this.joystick.active=false;
      jThumb.style.transform='translate(0,0)';
      this.keys._jx=0; this.keys._jy=0;
    };
    jBase.addEventListener('touchstart',onStart,{passive:false});
    window.addEventListener('touchmove',onMove,{passive:false});
    window.addEventListener('touchend', onEnd, {passive:false});
  },

  // -- Aim Joystick ------------------------------------------
  setupAimJoystick() {
    const base  = document.getElementById('aimBase');
    const thumb = document.getElementById('aimThumb');
    if (!base) return;

    let activeTouchId = null;
    const MAX_DIST = 40;

    base.addEventListener('touchstart', e => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;
      this._updateAimJoystick(touch, base, thumb, MAX_DIST);
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      if (activeTouchId === null) return;
      const touch = [...e.changedTouches].find(t => t.identifier === activeTouchId);
      if (!touch) return;
      e.preventDefault();
      this._updateAimJoystick(touch, base, thumb, MAX_DIST);
    }, { passive: false });

    window.addEventListener('touchend', e => {
      const touch = [...e.changedTouches].find(t => t.identifier === activeTouchId);
      if (!touch) return;
      activeTouchId = null;
      thumb.style.transform = 'translate(0,0)';
      this._clearAim();
    }, { passive: false });
  },

  _updateAimJoystick(touch, base, thumb, MAX_DIST) {
    const rect  = base.getBoundingClientRect();
    const cx    = rect.left + rect.width / 2;
    const cy    = rect.top  + rect.height / 2;
    const dx    = touch.clientX - cx;
    const dy    = touch.clientY - cy;
    const dist  = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DIST);
    const angle = Math.atan2(dy, dx);

    thumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;

    const G = GAME.state;
    if (!G?.running || G.paused) return;
    const p = G.player;

    // Convert joystick direction to a world-space aim point ahead of the player
    const AIM_RANGE = 300;
    p.aimX      = p.x + Math.cos(angle) * AIM_RANGE;
    p.aimY      = p.y + Math.sin(angle) * AIM_RANGE;
    p.aimActive = true;
  },
};
// ============================================================
//  PROFILE.JS  v3
//  · Inline name editing (no modal, no bottom div)
//  · Upgrades show real stat values + link to shop
//  · Worlds: only 4, no icons, catchy names, locked = COMING SOON
// ============================================================

const PROFILE = {

  _key: 'ds_profile_v1',
  _returnTo: null,
  _editingName: false,

  TIERS: [
    { id:'novice',  label:'NOVICE',  icon:'🌱', col:'#888888', minLv:1,  maxLv:2  },
    { id:'warrior', label:'WARRIOR', icon:'⚔',  col:'#f1c40f', minLv:3,  maxLv:6  },
    { id:'legend',  label:'LEGEND',  icon:'🏆', col:'#9b59b6', minLv:7,  maxLv:14 },
  ],

  LEVEL_THRESHOLDS: [
    0, 3, 7, 12, 18, 25, 30, 34, 37, 40, 43, 45, 47, 50,
  ],

  // ── LOAD / SAVE ──────────────────────────────────────────
  load() {
    const stored = DB.get(this._key);
    if(!stored) return this._default();
    return Object.assign(this._default(), stored);
  },
  save(data) {
    DB.set(this._key, data);
  },
  _default() {
    return { name:null, createdAt:Date.now(), totalRuns:0, bestWave:0 };
  },

  recordRun(wave) {
    const data = this.load();
    data.totalRuns = (data.totalRuns||0)+1;
    data.bestWave  = Math.max(data.bestWave||0, wave);
    this.save(data);
  },

  // ── CALCULATIONS ─────────────────────────────────────────
  getTotalPoints() {
    return Object.values(META.load().levels||{}).reduce((a,b)=>a+b,0);
  },
  getLevel() {
    const pts=this.getTotalPoints(); let lv=1;
    for(let i=0;i<this.LEVEL_THRESHOLDS.length;i++)
      if(pts>=this.LEVEL_THRESHOLDS[i]) lv=i+1;
    return lv;
  },
  getTier(lv) {
    lv=lv||this.getLevel();
    for(let i=this.TIERS.length-1;i>=0;i--)
      if(lv>=this.TIERS[i].minLv) return this.TIERS[i];
    return this.TIERS[0];
  },
  getLevelProgress() {
    const pts=this.getTotalPoints(), lv=this.getLevel();
    if(lv>=14) return {current:50,needed:50,pct:100};
    const cur=pts-this.LEVEL_THRESHOLDS[lv-1];
    const need=this.LEVEL_THRESHOLDS[lv]-this.LEVEL_THRESHOLDS[lv-1];
    return {current:cur, needed:need, pct:Math.round((cur/need)*100)};
  },

  // ── NAME ─────────────────────────────────────────────────
  getName()  { return this.load().name; },
  needsName(){ return !this.getName(); },
  setName(n) {
    const data=this.load();
    data.name=n.trim().slice(0,16).toUpperCase()||'ADVENTURER';
    this.save(data); return data.name;
  },

  // ── INIT ─────────────────────────────────────────────────
  init() {
    this.renderCard();
    if(this.needsName()) setTimeout(()=>this._showFirstNamePopup(), 600);
  },

  // First-launch popup (only once, centered overlay)
  _showFirstNamePopup() {
    const existing = document.getElementById('namePopup');
    if(existing) { existing.classList.remove('hidden'); }
    const inp = document.getElementById('namePopupInput');
    if(inp) { inp.focus(); inp.select(); }
  },

  hideFirstLaunchPopup() {
    const inp = document.getElementById('namePopupInput');
    const val = (inp?.value||'').trim();
    if(!val) { if(inp) inp.style.borderColor='#e74c3c'; return; }
    this.setName(val);
    SFX.play('uiClick');
    document.getElementById('namePopup').classList.add('hidden');
    this.renderCard();
  },

  // ── MINI CARD (start screen) ─────────────────────────────
  renderCard() {
    const el = document.getElementById('profileCardSlot');
    if(!el) return;
    const lv=this.getLevel(), tier=this.getTier(lv);
    const prog=this.getLevelProgress(), pts=this.getTotalPoints();
    const data=this.load(), gold=META.getGold(), isMax=lv>=14;
    const filled=isMax?12:Math.round(prog.pct/100*12);
    const bar=`<span style="color:${tier.col}">${'█'.repeat(filled)}</span>`+
              `<span style="color:#1e1e2e">${'█'.repeat(12-filled)}</span>`;
    el.innerHTML=`
      <div onclick="PROFILE.showScreen('startScreen')"
        style="display:flex;align-items:center;gap:10px;
          background:#0a0a14;border:1px solid ${tier.col}33;
          border-left:3px solid ${tier.col};padding:8px 12px;
          max-width:400px;margin:6px auto;cursor:pointer;
          transition:background 0.15s"
        onmouseover="this.style.background='#0f0f1e'"
        onmouseout="this.style.background='#0a0a14'">
        <span style="font-size:20px;flex-shrink:0">${tier.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:9px;color:#fff;margin-bottom:2px">
            ${data.name||'ADVENTURER'}
          </div>
          <div style="font-size:6px;color:${tier.col};margin-bottom:3px;letter-spacing:1px">
            LV.${lv} &nbsp;·&nbsp; ${tier.label} TIER
          </div>
          <div style="font-size:9px;letter-spacing:-1px;line-height:1">${bar}&nbsp;<span style="font-size:5px;color:#333">${isMax?'MAX':pts+'/'+(this.LEVEL_THRESHOLDS[lv]??50)+' PTS'}</span></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:8px;color:#f1c40f">💰 ${gold.toLocaleString()}</div>
          <div style="font-size:4.5px;color:#666;margin-top:3px">VIEW PROFILE ›</div>
        </div>
      </div>`;
  },

  // ── PROFILE SCREEN ───────────────────────────────────────
  showScreen(fromScreen) {
    SFX.play('uiClick');
    this._returnTo=fromScreen||'startScreen';
    this._editingName=false;
    document.getElementById(this._returnTo).classList.add('hidden');
    this._renderScreen();
    document.getElementById('profileScreen').classList.remove('hidden');
  },

  hideScreen() {
    SFX.play('uiClick');
    document.getElementById('profileScreen').classList.add('hidden');
    const ret=document.getElementById(this._returnTo||'startScreen');
    if(ret) ret.classList.remove('hidden');
    this._returnTo=null;
  },

  _renderScreen() {
    const lv=this.getLevel(), tier=this.getTier(lv);
    const prog=this.getLevelProgress(), pts=this.getTotalPoints();
    const data=this.load(), gold=META.getGold();
    const metaD=META.load(), isMax=lv>=14;
    const board=(()=>{try{return JSON.parse(localStorage.getItem('ds_leaderboard')||'[]');}catch(e){return [];}})();
    const $ =id=>document.getElementById(id);

    // ── HERO ─────────────────────────────────────────────
    if($('profTierIcon'))  $('profTierIcon').textContent=tier.icon;
    if($('profTierIcon'))  $('profTierIcon').style.color=tier.col;
    this._renderNameArea(data.name||'ADVENTURER', tier);
    if($('profTierBadge')){
      $('profTierBadge').textContent=`LV.${lv}  ·  ${tier.label} TIER`;
      $('profTierBadge').style.color=tier.col;
    }
    const filled=isMax?20:Math.round(prog.pct/100*20);
    if($('profXpBar')){
      $('profXpBar').innerHTML=
        `<span style="color:${tier.col}">${'█'.repeat(filled)}</span>`+
        `<span style="color:#1a1a2e">${'█'.repeat(20-filled)}</span>`;
    }
    if($('profXpLabel')){
      $('profXpLabel').textContent=isMax
        ? '✦ MAXIMUM LEVEL — ALL MASTERED ✦'
        : `${pts} / ${this.LEVEL_THRESHOLDS[lv]??50} pts  →  LEVEL ${lv+1}`;
    }

    // ── STATS ────────────────────────────────────────────
    const bestScore=board[0]?.score||0;
    const totalKills=board.reduce((s,r)=>s+(r.kills||0),0);
    if($('profRuns'))       $('profRuns').textContent      =data.totalRuns||0;
    if($('profBestWave'))   $('profBestWave').textContent  =data.bestWave||0;
    if($('profBestScore'))  $('profBestScore').textContent =bestScore.toLocaleString();
    if($('profGold'))       $('profGold').textContent      =gold.toLocaleString();
    if($('profTotalKills')) $('profTotalKills').textContent=totalKills.toLocaleString();
    if($('profShopPts'))    $('profShopPts').textContent   =`${pts} / 50`;

    // ── UPGRADES (real values) ────────────────────────────
    const upgEl=$('profUpgGrid');
    if(upgEl){
      upgEl.innerHTML=CFG.META_UPGRADES.map(u=>{
        const lvl=metaD.levels[u.id]||0;
        const statVal=this._upgradeStatText(u.id, lvl);
        const pct=Math.round((lvl/u.maxLevel)*100);
        const barFilled=Math.round(lvl/u.maxLevel*8);
        const pipBar=`<span style="color:${tier.col}">${'▮'.repeat(barFilled)}</span>`+
                     `<span style="color:#1a1a2e">${'▮'.repeat(8-barFilled)}</span>`;
        return `
          <div class="prof-upg" style="border-color:${lvl>0?tier.col+'33':'#111'}">
            <div class="prof-upg-left">
              <div class="prof-upg-name">${u.name}</div>
              <div class="prof-upg-bar">${pipBar}</div>
            </div>
            <div class="prof-upg-right">
              <div class="prof-upg-val" style="color:${lvl>=u.maxLevel?'#2ecc71':lvl>0?'#fff':'#333'}">
                ${statVal}
              </div>
              <div class="prof-upg-sub">${lvl>=u.maxLevel?'MAXED':`${lvl}/${u.maxLevel}`}</div>
            </div>
          </div>`;
      }).join('');
    }

    // ── LEADERBOARD ──────────────────────────────────────
    const lbEl=$('profLeaderboard');
    if(lbEl){
      if(!board.length){
        lbEl.innerHTML='<div class="prof-empty">No runs yet — get out there, warrior.</div>';
      } else {
        const medal=['#f1c40f','#95a5a6','#cd7f32'];
        lbEl.innerHTML=board.map((r,i)=>`
          <div class="prof-lb-row">
            <span class="prof-lb-rank" style="color:${medal[i]||'#444'}">#${i+1}</span>
            <span class="prof-lb-score" style="color:${medal[i]||'#fff'}">${r.score.toLocaleString()}</span>
            <span class="prof-lb-detail">Wave ${r.wave}</span>
            <span class="prof-lb-detail">${r.kills} kills</span>
            <span class="prof-lb-date">${r.date}</span>
          </div>`).join('');
      }
    }

    // ── WORLDS ───────────────────────────────────────────
    const worldsEl=$('profWorlds');
    if(worldsEl){
      // World 1 (Dungeon) is always playable.
      // Worlds 2–4 are Coming Soon — eligible badge shows if level+gold req met.
      // Level gates: 8, 12, 16, 20. Gold gates scale up each world.
      const gold = META.getGold();
      const worlds=[
        { lv:1,  gold:0,      name:'THE DUNGEON',         sub:'Where it all begins',           playable:true  },
        { lv:8,  gold:3000,   name:'THE BLEEDING GROUNDS', sub:'Rivers of blood. No mercy.',   playable:false },
        { lv:12, gold:8000,   name:'THE VOID',             sub:'Reality unravels here',         playable:false },
        { lv:16, gold:20000,  name:'THE ABYSS',            sub:'No one returns unchanged',      playable:false },
      ];
      worldsEl.innerHTML=worlds.map((w,i)=>{
        const lvOk   = lv >= w.lv;
        const goldOk = gold >= w.gold;
        const eligible = !w.playable && lvOk && goldOk;
        const almostLv = !w.playable && !lvOk;
        const almostG  = !w.playable && lvOk && !goldOk;
        const numCol   = w.playable ? tier.col : eligible ? '#f1c40f88' : lvOk ? '#333' : '#222';
        const nameCol  = w.playable ? '#fff'   : eligible ? '#666'      : '#2a2a3a';
        let statusHtml;
        if(w.playable){
          statusHtml = '<span style="color:'+tier.col+';font-size:6px">UNLOCKED</span>';
        } else if(eligible){
          statusHtml = '<span style="font-size:5px;color:#f1c40f88;line-height:2;text-align:right;display:block">&#10022; ELIGIBLE<br><span style="color:#333;font-size:4px">COMING SOON</span></span>';
        } else if(almostG){
          statusHtml = '<span style="font-size:4px;color:#333;line-height:2;text-align:right;display:block">LV.'+w.lv+' ✓<br>💰 '+w.gold.toLocaleString()+' REQ</span>';
        } else {
          statusHtml = '<span style="font-size:4px;color:#2a2a3a;line-height:2;text-align:right;display:block">LV.'+w.lv+' REQ<br>💰 '+w.gold.toLocaleString()+'</span>';
        }
        return '<div class="prof-world '+(w.playable?'world-open':'world-locked')+'">'
          +'<div class="prof-world-num" style="color:'+numCol+'">'+String(i+1).padStart(2,'0')+'</div>'
          +'<div class="prof-world-info">'
            +'<div class="prof-world-name" style="color:'+nameCol+'">'+w.name+'</div>'
            +'<div class="prof-world-sub" style="color:'+(w.playable?'#555':'#1e1e2e')+'">'+( w.playable ? w.sub : '— COMING SOON —')+'</div>'
          +'</div>'
          +'<div class="prof-world-status">'+statusHtml+'</div>'
          +'</div>';
      }).join('');
    }
  },

  // ── INLINE NAME EDITING ──────────────────────────────────
  _renderNameArea(name, tier) {
    const el=document.getElementById('profNameArea');
    if(!el) return;
    if(this._editingName){
      el.innerHTML=`
        <div style="display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap">
          <input id="profNameInput" type="text" maxlength="16"
            value="${name}"
            autocomplete="off" spellcheck="false"
            style="background:#000;border:1px solid ${tier.col};
              color:${tier.col};font-family:'Press Start 2P',monospace;
              font-size:10px;padding:5px 10px;text-transform:uppercase;
              text-align:center;width:180px;outline:none"
            onkeydown="if(event.key==='Enter')PROFILE._saveName();
                       if(event.key==='Escape')PROFILE._cancelNameEdit()">
          <button class="btn" onclick="PROFILE._saveName()"
            style="border-color:#2ecc71;color:#2ecc71;font-size:6px;padding:5px 8px">SAVE</button>
          <button class="btn" onclick="PROFILE._cancelNameEdit()"
            style="border-color:#444;color:#444;font-size:6px;padding:5px 8px">CANCEL</button>
        </div>`;
      setTimeout(()=>{
        const inp=document.getElementById('profNameInput');
        if(inp){inp.focus();inp.select();}
      },30);
    } else {
      el.innerHTML=`
        <div style="display:flex;align-items:center;gap:8px;justify-content:center">
          <span id="profNameText" style="font-size:16px;color:#fff">${name}</span>
          <button onclick="PROFILE._startNameEdit()"
            style="background:none;border:1px solid #333;color:#444;
              font-family:'Press Start 2P',monospace;font-size:5px;
              padding:3px 7px;cursor:pointer;transition:all 0.15s"
            onmouseover="this.style.borderColor='${tier.col}';this.style.color='${tier.col}'"
            onmouseout="this.style.borderColor='#333';this.style.color='#444'">✏ EDIT</button>
        </div>`;
    }
  },

  _startNameEdit() {
    SFX.play('uiClick');
    this._editingName=true;
    const data=this.load(), tier=this.getTier();
    this._renderNameArea(data.name||'ADVENTURER', tier);
  },

  _saveName() {
    const inp=document.getElementById('profNameInput');
    const val=(inp?.value||'').trim();
    if(!val){if(inp)inp.style.borderColor='#e74c3c';return;}
    this.setName(val);
    SFX.play('uiClick');
    this._editingName=false;
    this._renderScreen();
    this.renderCard();
  },

  _cancelNameEdit() {
    SFX.play('uiClick');
    this._editingName=false;
    const data=this.load(), tier=this.getTier();
    this._renderNameArea(data.name||'ADVENTURER', tier);
  },

  // ── UPGRADE STAT TEXT ─────────────────────────────────────
  _upgradeStatText(id, lvl) {
    if(lvl===0) return '—';
    switch(id){
      case 'vitality':   return `+${lvl*15} HP`;
      case 'battle':     return `+${lvl*3} DMG`;
      case 'swift':      return `+${(lvl*0.2).toFixed(1)} SPD`;
      case 'magnet':     return `+${lvl*20} RNG`;
      case 'shield':     return `+${lvl} SHIELD`;
      case 'nova':       return `-${lvl} KILLS`;
      case 'fortune':    return `+${lvl*15}% DROP`;
      case 'marksman':   return `+${lvl*10} ATK RNG`;
      case 'goldrush':   return `+${lvl*20}% GOLD`;
      case 'secondwind': return `+${lvl} CHARGE`;
      default: return `LV.${lvl}`;
    }
  },

  // ── LEVEL UP BANNER ──────────────────────────────────────
  _showLevelUpBanner(lv) {
    const tier=this.getTier(lv);
    const banner=document.createElement('div');
    banner.className='levelup-banner';
    banner.style.cssText=`border-color:${tier.col};color:${tier.col}`;
    banner.innerHTML=`
      <div style="font-size:7px;margin-bottom:4px">LEVEL UP!</div>
      <div style="font-size:11px">${tier.icon} LV.${lv}</div>
      ${lv===tier.minLv?`<div style="font-size:6px;margin-top:3px">${tier.label} TIER UNLOCKED</div>`:''}`;
    document.body.appendChild(banner);
    setTimeout(()=>banner.classList.add('levelup-banner-show'),10);
    setTimeout(()=>{banner.classList.remove('levelup-banner-show');
      setTimeout(()=>banner.remove(),500);},2800);
    SFX.play('levelUp');
  },

  checkLevelUp(prevPts) {
    const newLv=this.getLevel(), prevLv=this._lvFromPts(prevPts);
    if(newLv>prevLv) this._showLevelUpBanner(newLv);
  },

  _lvFromPts(pts) {
    let lv=1;
    for(let i=0;i<this.LEVEL_THRESHOLDS.length;i++)
      if(pts>=this.LEVEL_THRESHOLDS[i]) lv=i+1;
    return lv;
  },
};


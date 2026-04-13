// ============================================================
//  GUIDE.JS  v2 — Tabbed guide with:
//  · Click sounds on all buttons/tabs
//  · Boss card with live render
//  · Click-to-expand enemy detail panel
// ============================================================

const GUIDE = {

  _tab: 'controls',
  _returnTo: null,
  _selectedEnemy: null,
  _animRaf: null,
  _animTick: 0,
  // currently expanded enemy card

  // ── CLICK SOUND ──────────────────────────────────────────
  _click() { SFX.play('uiClick'); },

  show() {
    this._tab='controls';
    this._selectedEnemy=null;
    this._render();
    document.getElementById('guideScreen').classList.remove('hidden');
  },

  
  hide() {
    this._click();
    this._stopAnim();
    document.getElementById('guideScreen').classList.add('hidden');
    const el=document.getElementById(this._returnTo||'startScreen');
    if(el) el.classList.remove('hidden');
    this._returnTo=null;
  },

  showFrom(screenId) {
    this._click();
    this._returnTo=screenId;
    const el=document.getElementById(screenId);
    if(el) el.classList.add('hidden');
    this.show();
  },

  _tabs: ['controls','enemies','waves','mechanics','shop','credits'],
  _tabLabel(t){ return {
    controls:'🎮 CONTROLS', enemies:'👾 ENEMIES', waves:'🌊 WAVES',
    mechanics:'⚡ MECHANICS', shop:'🏪 SHOP', credits:'🎵 CREDITS'
  }[t]; },

  _render() {
    const el=document.getElementById('guideScreen');
    if(!el) return;
    el.innerHTML=`
      <div id="guideInner">
        <div id="guideTabs">
          ${this._tabs.map(t=>`
            <button class="gtab ${t===this._tab?'gtab-active':''}"
              onclick="GUIDE._switch('${t}')">${this._tabLabel(t)}</button>
          `).join('')}
        </div>
        <div id="guideContent">${this._renderTab(this._tab)}</div>
        <button class="btn" onclick="GUIDE.hide()"
          style="margin-top:10px;border-color:#444;color:#555;font-size:7px">← BACK</button>
      </div>`;
    if(this._tab==='enemies') this._drawEnemyCanvases();
  },

  _switch(t){
    this._click();
    this._stopAnim();
    this._selectedEnemy=null;
    this._tab=t;
    this._render();
  },


  _renderTab(t){
    switch(t){
      case 'controls':  return this._tControls();
      case 'enemies':   return this._tEnemies();
      case 'waves':     return this._tWaves();
      case 'mechanics': return this._tMechanics();
      case 'shop':      return this._tShop();
      case 'credits':   return this._tCredits();
    }
    return '';
  },

  // ── CONTROLS ─────────────────────────────────────────────
  _tControls(){
    return `<h2 class="gt">🎮 CONTROLS</h2>
    <table class="guide-table">
      <tr><th>Input</th><th>Action</th></tr>
      <tr><td class="key">WASD / Arrows</td><td>Move character</td></tr>
      <tr><td class="key">Hold Left Mouse</td><td>Ray Aim — fires toward cursor, snaps to nearest enemy on the line</td></tr>
      <tr><td class="key">SPACE</td><td>Nova Blast — unleash when the left pillar is full</td></tr>
      <tr><td class="key">ESC / P</td><td>Pause / Resume</td></tr>
      <tr><td class="key">🔊 button (top right)</td><td>Mute / Unmute all audio</td></tr>
    </table>
    <h2 class="gt" style="margin-top:12px">📱 MOBILE</h2>
    <table class="guide-table">
      <tr><td class="key">Left joystick</td><td>Move character</td></tr>
      <tr><td class="key">Touch right half of screen</td><td>Ray Aim in that direction</td></tr>
    </table>
    <div class="guide-tip">💡 Ray Aim crosshair turns <b style="color:#2ecc71">green</b> when locked. Sweep the ray across groups to pick your target precisely.</div>`;
  },

  // ── ENEMIES ──────────────────────────────────────────────
  // Full enemy data with tips for the detail panel
  _enemyData: {
    goblin:      { name:'GOBLIN',      tier:'normal',   col:'#888',    threat:1,
      desc:'Fast swarmer with low HP. Dangerous in groups — they rush all at once.',
      tip:'Use Nova Blast to wipe swarms. Auto-aim handles them fine — save Ray Aim for bigger threats.' },
    skeleton:    { name:'SKELETON',    tier:'normal',   col:'#888',    threat:1,
      desc:'Throws bones in exactly 4 cardinal directions. Pattern is predictable.',
      tip:'Stand diagonally to avoid all projectiles. Easy to farm for combo streaks.' },
    mage:        { name:'MAGE',        tier:'normal',   col:'#888',    threat:2,
      desc:'Fragile alone but grants a blue shield to nearby allies — making them absorb one hit.',
      tip:'Prioritise the Mage first. Once it\'s dead, all allied shields drop instantly.' },
    knight:      { name:'KNIGHT',      tier:'normal',   col:'#888',    threat:2,
      desc:'Heavy armored charger. Telegraphs a charge attack with a red X on the floor.',
      tip:'When you see the red X, sidestep — do NOT back up in a straight line. The locked position is where it aims.' },
    orc:         { name:'ORC',         tier:'elite',    col:'#f1c40f', threat:3,
      desc:'Tanky brute that hurls boulders from range. High HP and melee damage.',
      tip:'Keep moving laterally. Its boulder is slow — easy to dodge once you learn the tell.' },
    wraith:      { name:'WRAITH',      tier:'elite',    col:'#f1c40f', threat:3,
      desc:'Teleports to within 60px of you every 4 seconds. Can\'t be kited conventionally.',
      tip:'Ray Aim is key — aim toward where it will appear and pre-fire. Combo-friendly if you stay calm.' },
    warlock:     { name:'WARLOCK',     tier:'elite',    col:'#f1c40f', threat:4,
      desc:'Fires a 3-orb spread shot AND grants magic shields to all nearby enemies.',
      tip:'Rush and kill it first before engaging any shielded allies. Blood Pact waves with Warlocks are brutal.' },
    berserker:   { name:'BERSERKER',   tier:'elite',    col:'#f1c40f', threat:4,
      desc:'When HP drops to 50%, it RAGES — doubling speed and attack rate.',
      tip:'Either burst it down fast before 50% or kite it at full health. Never let it linger at half HP.' },
    warlord:     { name:'WARLORD',     tier:'champion', col:'#9b59b6', threat:5,
      desc:'Ground slam AoE every 5 seconds + summons minion skeletons during the fight.',
      tip:'Nova Blast deals 40% HP damage. Burst it between slams and don\'t let minions pile up.' },
    specter:     { name:'SPECTER',     tier:'champion', col:'#9b59b6', threat:5,
      desc:'Completely invisible beyond 120px range. Ambushes from darkness without warning.',
      tip:'Darkness modifier makes this lethal. Keep moving in circles — it can\'t ambush a moving target well.' },
    lich:        { name:'LICH',        tier:'champion', col:'#9b59b6', threat:5,
      desc:'Fires an 8-direction fire ring every 6 seconds. Orbiting skulls block your bullets.',
      tip:'Time your Nova to hit between fire rings. Stand far back — the skull orbit forces melee.' },
    deathknight: { name:'DEATH KNIGHT',tier:'champion', col:'#9b59b6', threat:5,
      desc:'Combines a 3-bone spread shot with a charge dash — often back to back.',
      tip:'The most dangerous non-boss enemy. Use Ray Aim to eliminate it before it closes range.' },
    boss:        { name:'BOSS',        tier:'boss',     col:'#ff0055', threat:5,
      desc:'Massive dungeon guardian. Spawns every 5 waves — growing stronger each time it appears.',
      tip:'Nova only deals 20% of its HP. Activate Carnage Mode, use Blood Pact for 2× damage, then burst.' },
  },

  _tEnemies(){
    const sel = this._selectedEnemy;
    const tiers=[
      { label:'TIER 1 — NORMAL', col:'#888888', tag:'Waves 1–5',
        list:['goblin','skeleton','mage','knight'] },
      { label:'TIER 2 — ELITE',  col:'#f1c40f', tag:'Waves 6+',
        list:['orc','wraith','warlock','berserker'] },
      { label:'TIER 3 — CHAMPION', col:'#9b59b6', tag:'Waves 13+',
        list:['warlord','specter','lich','deathknight'] },
      { label:'BOSS', col:'#ff0055', tag:'Every 5 waves',
        list:['boss'] },
    ];

    const detailPanel = sel ? (() => {
      const d=this._enemyData[sel];
      if(!d) return '';
      const tierName={normal:'TIER 1 · NORMAL',elite:'TIER 2 · ELITE',
        champion:'TIER 3 · CHAMPION',boss:'BOSS'}[d.tier]||d.tier.toUpperCase();
      return `
        <div class="enemy-detail" style="border-color:${d.col}44">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
            <canvas id="ec_detail_${sel}" width="56" height="64"
                style="image-rendering:pixelated;image-rendering:crisp-edges;flex-shrink:0;width:56px;height:64px"></canvas>
            <div>
              <div style="font-size:9px;color:${d.col};margin-bottom:3px">${d.name}</div>
              <div style="font-size:5px;color:#555;margin-bottom:4px">${tierName}</div>
              <div style="font-size:7px;color:#e74c3c;letter-spacing:1px">
                ${'★'.repeat(d.threat)}${'☆'.repeat(5-d.threat)}</div>
            </div>
          </div>
          <div style="font-size:6px;color:#999;line-height:1.9;margin-bottom:6px">${d.desc}</div>
          <div style="font-size:6px;color:#f1c40f;border-left:2px solid #f1c40f44;
            padding-left:6px;line-height:1.9">💡 ${d.tip}</div>
        </div>`;
    })() : `<div class="enemy-detail-empty">← Click any enemy to see details & tips</div>`;

    const bossCard = `
      <div class="tier-label" style="color:#ff0055;border-left:3px solid #ff0055;background:#ff005511;padding-left:8px">
        BOSS &nbsp;<span style="color:#777;font-size:4px">Every 5 waves · Grows stronger</span>
      </div>
      <div class="enemy-grid" style="grid-template-columns:repeat(1,1fr);max-width:120px">
        <div class="enemy-card ${sel==='boss'?'enemy-card-sel':''}"
          onclick="GUIDE._selectEnemy('boss')" style="border-color:${sel==='boss'?'#ff0055':'#1a1a2e'}">
          <canvas id="ec_boss" width="32" height="36" class="enemy-canvas"></canvas>
          <div class="en-name" style="color:#ff0055">BOSS</div>
          <div class="en-desc">Dungeon guardian</div>
          <div class="en-threat" style="color:#ff0055">★★★★★</div>
        </div>
      </div>`;

    return `
      <h2 class="gt">👾 ENEMY CODEX — 13 TYPES</h2>
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="flex:1;min-width:0">
          ${tiers.slice(0,3).map(tier=>`
            <div class="tier-label" style="color:${tier.col};border-left:3px solid ${tier.col};background:${tier.col}0d;padding-left:8px">
              ${tier.label} &nbsp;<span style="color:#777;font-size:4px">${tier.tag}</span>
            </div>
            <div class="enemy-grid">
              ${tier.list.map(type=>{
                const d=this._enemyData[type];
                return `<div class="enemy-card ${sel===type?'enemy-card-sel':''}"
                  onclick="GUIDE._selectEnemy('${type}')"
                  style="border-color:${sel===type?tier.col:'#1a1a2e'};cursor:pointer">
                  <canvas id="ec_${type}" width="32" height="36" class="enemy-canvas"></canvas>
                  <div class="en-name" style="color:${tier.col}">${d?.name||type}</div>
                  <div class="en-desc">${d?.desc.split('.')[0]||''}</div>
                  <div class="en-threat">${'★'.repeat(d?.threat||1)}${'☆'.repeat(5-(d?.threat||1))}</div>
                </div>`;
              }).join('')}
            </div>`).join('')}
          ${bossCard}
        </div>

        <!-- Detail panel -->
        <div style="width:200px;flex-shrink:0">
          ${detailPanel}
        </div>
      </div>
      <div class="guide-tip" style="margin-top:6px">💡 Elite enemies have a gold glow. Champions pulse purple. Nova deals reduced damage to higher tiers — save it for crowds.</div>`;
  },

  _selectEnemy(type){
    this._click();
    this._selectedEnemy = (this._selectedEnemy===type) ? null : type;
    // Re-render enemies tab only
    document.getElementById('guideContent').innerHTML = this._renderTab('enemies');
    this._drawEnemyCanvases();
    // Also draw large detail canvas
    if(this._selectedEnemy) this._drawDetailCanvas(this._selectedEnemy);
  },

  // ── WAVES ────────────────────────────────────────────────
  _tWaves(){
    const mods=[
      {icon:'👁', name:'CURSED',     col:'#9b59b6', desc:'Enemies move 1.5× faster. Keep moving.'},
      {icon:'🩸', name:'BLOOD PACT', col:'#e74c3c', desc:'You deal 2× dmg but take 2× dmg. Risky but rewarding.'},
      {icon:'💀', name:'ELITE RUSH', col:'#f1c40f', desc:'Only Elite and Champion enemies. No easy kills.'},
      {icon:'⚡', name:'FRENZY',     col:'#00d4ff', desc:'2× spawn rate but enemies have half HP. Kill fast.'},
      {icon:'🛡', name:'IRON WAVE',  col:'#95a5a6', desc:'All enemies start armored — hit twice to break it.'},
      {icon:'💰', name:'BOUNTY',     col:'#f1c40f', desc:'3× score this wave. Stack combos for massive points.'},
      {icon:'🌑', name:'DARKNESS',   col:'#cccccc', desc:'Vision reduced to torch range. Enemies ambush from dark.'},
    ];
    return `<h2 class="gt">🌊 WAVE STRUCTURE</h2>
      <div class="guide-para">Each wave lasts <b>20 seconds</b>. Enemy tiers unlock gradually:<br>
        <span class="tag-normal">■ Normal</span> Waves 1–5 &emsp;
        <span class="tag-elite">■ Elite</span> Waves 6+ &emsp;
        <span class="tag-champ">■ Champion</span> Waves 13+
      </div>
      <div class="guide-para" style="color:#e74c3c">
        ⚠ <b>LATE WAVES:</b> Wave 25+ elites start spawning in groups of 3. Wave 30+: mostly Champions. Wave 40+: near-pure Champions. Enemies gain +8% extra HP for every wave past 20.
      </div>
      <h2 class="gt">⚠ WAVE MODIFIERS</h2>
      <div class="guide-para">From Wave 3 onwards, one random modifier activates each wave.</div>
      <div class="mod-grid">${mods.map(m=>`
        <div class="mod-card" style="border-color:${m.col}44">
          <span class="mod-icon">${m.icon}</span>
          <div><span class="mod-name" style="color:${m.col}">${m.name}</span><br>
          <span class="mod-desc">${m.desc}</span></div>
        </div>`).join('')}
      </div>
      <h2 class="gt" style="margin-top:12px">🎵 DYNAMIC MUSIC</h2>
      <div class="guide-para">
        <b style="color:#aaa">Waves 1–9</b> — Push (steady rhythm)<br>
        <b style="color:#e67e22">Waves 10–14</b> — DRIVE (intense battle)<br>
        <b style="color:#e74c3c">Wave 15+ / Boss</b> — Glory (epic climax)
      </div>`;
  },

  // ── MECHANICS ────────────────────────────────────────────
  _tMechanics(){
    return `<h2 class="gt">⚡ CORE MECHANICS</h2>
      <div class="mech-block">
        <div class="mech-title">⚡ NOVA BLAST <span class="mech-key">SPACE</span></div>
        <p>Fill the <b>cyan pillar</b> on the left by killing enemies. When full, press SPACE.</p>
        <p>Damage: <b>Normal</b>=instant kill · <b>Elite</b>=60% HP · <b>Champion</b>=40% HP · <b>Boss</b>=20% HP</p>
        <p>Kills needed scales with wave: 5 → 7 → 12 → 15 → 20 → 25 → 30</p>
      </div>
      <div class="mech-block">
        <div class="mech-title">💥 COMBO SYSTEM</div>
        <p>Kill within <b>2.5 seconds</b> of last kill to build a streak. Combos multiply your score bonus.</p>
        <p>Screen pulses <b style="color:#e67e22">orange</b> at ×5, <b style="color:#f1c40f">gold</b> at ×10+.</p>
      </div>
      <div class="mech-block">
        <div class="mech-title">🔥 CARNAGE MODE (Last Stand)</div>
        <p>Auto-triggers when HP ≤ 20%: <b>Speed ×2 · Damage ×3 · Pierce · 8 seconds</b></p>
        <p>Upgrade <b>Second Wind</b> in the Shop to trigger it multiple times per run.</p>
      </div>
      <div class="mech-block">
        <div class="mech-title">🎯 RAY AIM</div>
        <p>Hold <b>Left Mouse</b> to cast a ray toward cursor. Bullets snap to nearest enemy within 50px of the line.</p>
        <p>Crosshair turns <b style="color:#2ecc71">green</b> when locked. Great for targeting Mages and Warlocks first.</p>
      </div>
      <div class="mech-block">
        <div class="mech-title">⚙ PLAYER CAPS</div>
        <p><b>Multi-shot</b> maxes at <b>5 bullets</b>. <b>Attack speed</b> caps at <b>3.0</b>. These prevent runaway bullet spam.</p>
        <p>Focus upgrades on <b>piercing</b> and <b>range</b> once you hit the caps — they stay effective at any wave.</p>
      </div>`;
  },

  // ── SHOP ─────────────────────────────────────────────────
  _tShop(){
    return `<h2 class="gt">🏪 GOLD & UPGRADES</h2>
      <div class="guide-para">Gold earned after every run:<br>
        <code style="color:#f1c40f">(kills × 2  +  wave × 10  +  score × 0.01) ÷ 10</code><br>
        Gold is <b>permanent</b> across all runs. A solid run earns ~70–165 💰.
      </div>
      <div class="shop-guide-grid">${CFG.META_UPGRADES.map(u=>`
        <div class="sg-card">
          <span class="sg-icon">${u.icon}</span>
          <div><span class="sg-name">${u.name}</span><br>
          <span class="sg-desc">${u.desc}</span><br>
          <span class="sg-cost">Costs: ${u.costs.join(' → ')} 💰</span></div>
        </div>`).join('')}
      </div>
      <div class="guide-tip">💡 Prioritise <b>Vitality</b> and <b>Gold Rush</b> first — surviving longer earns more gold, compounding faster.</div>`;
  },

  // ── CREDITS ──────────────────────────────────────────────
  _tCredits(){
    return `<h2 class="gt">🎵 MUSIC CREDITS</h2>
      <div class="credit-card">
        <div class="credit-track">🎵 PUSH &nbsp;<span class="credit-when">Waves 1–9 · Default</span></div>
        <div class="credit-artist">by <b>Alex Productions</b></div>
        <a class="credit-link" href="https://www.chosic.com/download-audio/53334/" target="_blank" rel="noopener">chosic.com/download-audio/53334</a>
      </div>
      <div class="credit-card">
        <div class="credit-track">⚡ DRIVE &nbsp;<span class="credit-when">Waves 10–14</span></div>
        <div class="credit-artist">Sport Racing Car | DRIVE by <b>Alex Productions</b></div>
        <a class="credit-link" href="https://www.chosic.com/download-audio/53218/" target="_blank" rel="noopener">chosic.com/download-audio/53218</a>
      </div>
      <div class="credit-card">
        <div class="credit-track">🔥 GLORY &nbsp;<span class="credit-when">Wave 15+ &amp; Boss</span></div>
        <div class="credit-artist">Epic Cyberpunk | Glory by <b>Alex Productions</b></div>
        <a class="credit-link" href="https://www.chosic.com/download-audio/53216/" target="_blank" rel="noopener">chosic.com/download-audio/53216</a>
      </div>
      <h2 class="gt" style="margin-top:14px">🔊 SOUND EFFECTS</h2>
      <div class="guide-para">
        Interface sounds by <b>Kenney</b> · <a href="https://kenney.nl" target="_blank" rel="noopener">kenney.nl</a> (CC0)<br>
        Game SFX from <b>Mixkit</b> · <a href="https://mixkit.co" target="_blank" rel="noopener">mixkit.co</a> (Free License)
      </div>
      <div class="credit-card" style="margin-top:6px">
        <div class="credit-track">⚔ INTRO STING &nbsp;<span class="credit-when">Loading Screen · dragon-studio-sword-slice-2-393845.mp3</span></div>
        <div class="credit-artist">Sound Effect by <a href="https://pixabay.com/users/dragon-studio-38165424/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=393845" target="_blank" rel="noopener"><b>DRAGON-STUDIO</b></a> from <a href="https://pixabay.com/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=393845" target="_blank" rel="noopener">Pixabay</a></div>
      </div>
      <h2 class="gt" style="margin-top:14px">🛠 BUILT WITH</h2>
      <div class="guide-para">Pure HTML5 Canvas · Vanilla JS · Web Audio API · No frameworks</div>`;
  },

  // ── CANVAS RENDERING ─────────────────────────────────────
  _drawEnemyCanvases(){
    // Stop any existing loop first
    this._stopAnim();

    const allTypes=[...ENEMIES.normalPool,...ENEMIES.elitePool,...ENEMIES.championPool,'boss'];

    const loop = () => {
      // Stop if enemies tab is no longer active
      if(this._tab !== 'enemies'){ this._animRaf = null; return; }

      this._animTick++;
      allTypes.forEach(type => this._drawEnemyCanvas(type, `ec_${type}`, 32, 36, 16, 20));
      if(this._selectedEnemy) this._drawDetailCanvas(this._selectedEnemy);

      this._animRaf = requestAnimationFrame(loop);
    };

    this._animRaf = requestAnimationFrame(loop);
  },

  _stopAnim(){
    if(this._animRaf){ cancelAnimationFrame(this._animRaf); this._animRaf = null; }
  },

  _drawDetailCanvas(type){
    this._drawEnemyCanvas(type, `ec_detail_${type}`, 56, 64, 28, 36, true);
  },


_drawEnemyCanvas(type, canvasId, cw, ch, cx, cy, large=false){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const S=ENEMIES.stats[type];
  if(!S) return;
  ctx.clearRect(0,0,cw,ch);
  const fakeE={x:0,y:0,type,w:S.w,h:S.h,hp:S.hp,maxHp:S.hp,
    hitTimer:0,enraged:false,charging:false,mageShield:false,
    shielded:false,cloaked:false,chargeWarning:false,
    facing:1, speed:S.speed,
    _boneCount:2  // skeleton orbital bones
  };
  const fakeCam={x:-cx,y:-cy};
  let scale;
  if(large){ scale=S.tier==='champion'||S.tier==='boss'?1.2:S.tier==='elite'?1.5:1.8; }
  else     { scale=S.tier==='champion'||S.tier==='boss'?0.7:S.tier==='elite'?0.85:1.0; }
  ctx.save();
  ctx.translate(cx,cy); ctx.scale(scale,scale); ctx.translate(-cx,-cy);
  ENEMIES.draw(ctx, fakeE, fakeCam, this._animTick);
  ctx.restore();
},
};



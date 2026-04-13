// ============================================================
//  MODES.JS  v7
// ============================================================

const GEAR = {
  _open:false, _angle:0, _raf:null,

  init() {
    this._c = document.getElementById('gearCanvas');
    if(!this._c) return;
    this._ctx = this._c.getContext('2d');
    this._draw(0);
  },

  _draw(angle) {
    const ctx=this._ctx; if(!ctx) return;
    const cx=22,cy=22,r=13,teeth=8;
    ctx.clearRect(0,0,44,44);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    const col=this._open?'#f1c40f':'#666';
    ctx.fillStyle=col;
    for(let i=0;i<teeth;i++){
      ctx.save(); ctx.rotate((i/teeth)*Math.PI*2);
      ctx.fillRect(-3,-(r+5),6,7); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fillStyle='#0a0a0f'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2);
    ctx.strokeStyle=this._open?'#f1c40f66':'#2a2a2a';
    ctx.lineWidth=1.5; ctx.stroke();
  },

  toggle() {
    if(typeof SFX!=='undefined') SFX.play('uiClick');
    this._open = !this._open;
    const panel = document.getElementById('gearPanel');
    if(panel){
      if(this._open){
        panel.style.maxWidth = '400px';
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'all';
      } else {
        panel.style.maxWidth = '0';
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
      }
    }
    this._spinTo(this._open ? Math.PI*0.5 : 0);
  },

  close() {
    if(!this._open) return;
    this._open = false;
    const panel = document.getElementById('gearPanel');
    if(panel){
      panel.style.maxWidth = '0';
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
    }
    this._spinTo(0);
  },

  _spinTo(target) {
    if(this._raf) cancelAnimationFrame(this._raf);
    const start=this._angle,diff=target-start,dur=300,t0=performance.now();
    const tick=now=>{
      const p=Math.min(1,(now-t0)/dur),e=p<0.5?2*p*p:-1+(4-2*p)*p;
      this._angle=start+diff*e; this._draw(this._angle);
      if(p<1) this._raf=requestAnimationFrame(tick);
      else { this._angle=target; this._draw(target); }
    };
    this._raf=requestAnimationFrame(tick);
  },
};

const MODES = {
  list:[
    {id:'normal',    label:'NORMAL',         icon:'⚔️', color:'#f1c40f',glowColor:'#f1c40f44',
     desc:'Mixed enemies. Balanced difficulty.',       diffLabel:'★☆☆☆☆',diffColor:'#2ecc71',
     goldCost:0,   levelReq:0, free:true,  enemyFilter:null,                              forceElite:false,diffMult:1.0},
    {id:'skeleton',  label:'SKELETON HORDE', icon:'💀', color:'#00e5ff',glowColor:'#00e5ff44',
     desc:'Skeleton family only. Fast swarmers & bone throwers.',diffLabel:'★★☆☆☆',diffColor:'#3498db',
     goldCost:500, levelReq:3, free:false, enemyFilter:['skeleton','warlord','lich'],     forceElite:false,diffMult:1.15},
    {id:'knight',    label:'IRON LEGION',    icon:'🛡️', color:'#ff9800',glowColor:'#ff980044',
     desc:'Knights only. Heavy armour, brutal charges.',        diffLabel:'★★★☆☆',diffColor:'#e67e22',
     goldCost:500, levelReq:3, free:false, enemyFilter:['knight','deathknight','berserker'],forceElite:false,diffMult:1.2},
    {id:'chaos',     label:'CHAOS',          icon:'🔥', color:'#ff1744',glowColor:'#ff174444',
     desc:'Elites & Champions only. No warm-up, no mercy.',     diffLabel:'★★★★☆',diffColor:'#e74c3c',
     goldCost:1000,levelReq:8, free:false, enemyFilter:null,                              forceElite:true, diffMult:1.5},
    {id:'nightmare', label:'NIGHTMARE',      icon:'👁️', color:'#aa00ff',glowColor:'#aa00ff44',
     desc:'Double spawn. Boss every 3 waves. Max difficulty.',  diffLabel:'★★★★★',diffColor:'#aa00ff',
     goldCost:2500,levelReq:14,free:false, enemyFilter:null,                              forceElite:true,bossEvery:3,diffMult:2.0},
  ],

  // Slot definitions: x = offset from carousel center, others are visual props
  _slots: [
    { x: -310, scale: 0.88, opacity: 0.55, filter: 'brightness(0.5) saturate(0.5)', zIndex: 1 },
    { x:    0, scale: 1.00, opacity: 1.00, filter: '',                               zIndex: 3 },
    { x:  310, scale: 0.88, opacity: 0.55, filter: 'brightness(0.5) saturate(0.5)', zIndex: 1 },
  ],

  _cur:0, _returnTo:null, _saveKey:'ds_mode_unlocks', _shifting:false,
  _cards:[], // live DOM nodes [left, center, right]

  get selected(){ return this.list[this._cur].id; },

  getUnlocked(){ try{ return JSON.parse(localStorage.getItem(this._saveKey))||['normal']; }catch(e){ return['normal']; } },
  saveUnlocked(a){ try{ localStorage.setItem(this._saveKey,JSON.stringify(a)); }catch(e){} },
  isUnlocked(id){ return this.getUnlocked().includes(id); },

  tryUnlock(idx){
    const m=this.list[idx];
    const gold=(typeof PROFILE!=='undefined')?(PROFILE.data?.gold||0):0;
    const lv  =(typeof PROFILE!=='undefined')?(PROFILE.data?.level||1):1;
    if(!m||m.free||this.isUnlocked(m.id)) return true;
    if(lv  < m.levelReq){ this._status(`🔒 Reach Level ${m.levelReq} first`,'#e74c3c'); return false; }
    if(gold < m.goldCost){ this._status(`🔒 Need ${m.goldCost.toLocaleString()} gold`,'#e74c3c'); return false; }
    const a=this.getUnlocked(); a.push(m.id); this.saveUnlocked(a);
    if(typeof PROFILE!=='undefined'&&PROFILE.data){ PROFILE.data.gold=Math.max(0,(PROFILE.data.gold||0)-m.goldCost); if(typeof PROFILE.save==='function')PROFILE.save(); }
    if(typeof SFX!=='undefined') SFX.play('levelUp');
    this._status(`✓ ${m.label} UNLOCKED!`,m.color);
    return true;
  },

  getActive(){ return this.list[this._cur]; },

  show(from){
    this._returnTo=from||'startScreen';
    ['startScreen','gameOverScreen','pauseScreen'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
    GEAR.close();
    document.getElementById('modesScreen').classList.remove('hidden');
    this._render();
  },

  hide(){
    document.getElementById('modesScreen').classList.add('hidden');
    document.getElementById(this._returnTo||'startScreen')?.classList.remove('hidden');
    this._returnTo=null;
  },

  play(){
    if(!this.isUnlocked(this.list[this._cur].id)){ if(!this.tryUnlock(this._cur)) return; this._render(); return; }
    document.getElementById('modesScreen').classList.add('hidden');
    if(typeof UI!=='undefined') UI.startGame();
  },

  // ── Apply slot position/style to a card ───────────────
  _applySlot(card, slotIdx, animate){
    const s = this._slots[slotIdx];
    card.style.transition = animate
      ? 'transform 0.16s cubic-bezier(.22,1,.36,1), opacity 0.14s ease, filter 0.14s ease'
      : 'none';
    card.style.transform = `translateX(calc(-50% + ${s.x}px)) scale(${s.scale})`;
    card.style.opacity   = String(s.opacity);
    card.style.filter    = s.filter;
    card.style.zIndex    = String(s.zIndex);
  },

  // ── Carousel shift ─────────────────────────────────────
  shift(dir){
    const carousel = document.getElementById('modesCarousel');
    if(!carousel || this._shifting) return;
    this._shifting = true;
    if(typeof SFX!=='undefined') SFX.play('uiClick');

    const n = this.list.length;
    this._cur = (this._cur + dir + n) % n;

    // dir=1 (next →): slot0(left) exits, slot1→slot0, slot2→slot1, new→slot2
    // dir=-1(prev ←): slot2(right) exits, slot1→slot2, slot0→slot1, new→slot0
    const exitSlot    = dir > 0 ? 0 : 2;
    const exitCard    = this._cards[exitSlot];
    const shift1From  = 1;
    const shift1To    = dir > 0 ? 0 : 2;
    const shift2From  = dir > 0 ? 2 : 0;
    const shift2To    = 1; // becomes new center
    const incomingSlot= dir > 0 ? 2 : 0;
    const incomingIdx = dir > 0 ? (this._cur + 1) % n : (this._cur - 1 + n) % n;
    const incomingSide= dir > 0 ? 'right' : 'left';

    // 1. Exit card flies off screen
    const offX = dir > 0 ? -600 : 600;
    exitCard.style.transition = 'transform 0.15s ease, opacity 0.12s ease';
    exitCard.style.transform  = `translateX(calc(-50% + ${offX}px)) scale(0.75)`;
    exitCard.style.opacity    = '0';
    exitCard.style.zIndex     = '0';

    // 2. Shift the two staying cards to new slots
    const newCenterCard = this._cards[shift2From];
    const newSideCard   = this._cards[shift1From];

    this._applySlot(newSideCard,   shift1To, true);
    this._applySlot(newCenterCard, shift2To, true);

    // Update center card's content (cost label, colors) now it's the active card
    this._refreshCardContent(newCenterCard, this._cur);

    // 3. Build incoming card, place it off-screen, then animate to slot
    const incomingCard = this._makeCard(incomingIdx, incomingSide);
    const startX = dir > 0 ? 600 : -600;
    incomingCard.style.transition = 'none';
    incomingCard.style.transform  = `translateX(calc(-50% + ${startX}px)) scale(0.75)`;
    incomingCard.style.opacity    = '0';
    incomingCard.style.zIndex     = '1';
    carousel.appendChild(incomingCard);

    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
      this._applySlot(incomingCard, incomingSlot, true);
    }); });

    // 4. Cleanup after animation
    setTimeout(()=>{
      exitCard.remove();

      // Rebuild _cards[] in correct [left, center, right] order
      if(dir > 0){
        this._cards = [newSideCard, newCenterCard, incomingCard];
      } else {
        this._cards = [incomingCard, newCenterCard, newSideCard];
      }

      // Rebind side card click handlers
      this._rebindSideClicks();
      this._syncPlayBtn();
      this._shifting = false;
    }, 170);
  },

  // Rebuild just innerHTML + colors when a side card becomes center
  _refreshCardContent(card, idx){
    const gold     = (typeof PROFILE!=='undefined')?(PROFILE.data?.gold||0):0;
    const lv       = (typeof PROFILE!=='undefined')?(PROFILE.data?.level||1):1;
    const unlocked = this.getUnlocked();
    const m        = this.list[idx];
    const isUnlocked = unlocked.includes(m.id);
    const canAfford  = gold >= m.goldCost && lv >= m.levelReq;

    let costHtml = '';
    if(m.free)           costHtml=`<div class="mcard-cost unlocked">✓ FREE</div>`;
    else if(isUnlocked)  costHtml=`<div class="mcard-cost unlocked">✓ UNLOCKED</div>`;
    else if(canAfford)   costHtml=`<div class="mcard-cost affordable">🪙 ${m.goldCost.toLocaleString()}<br>CLICK PLAY TO UNLOCK</div>`;
    else { const why=lv<m.levelReq?`LV.${m.levelReq}+`:`🪙 ${m.goldCost.toLocaleString()}`; costHtml=`<div class="mcard-cost locked">🔒 ${why}</div>`; }

    card.className = 'mcard mc-center';
    card.style.setProperty('--mc', isUnlocked ? m.color : '#444');
    card.style.setProperty('--mg', isUnlocked ? m.glowColor : 'transparent');
    card.innerHTML = `
      <div class="mcard-icon">${m.icon}</div>
      <div class="mcard-label">${m.label}</div>
      <div class="mcard-desc">${m.desc}</div>
      <div class="mcard-diff" style="color:${m.diffColor}">${m.diffLabel}</div>
      ${costHtml}
    `;
  },

  // Rebind click handlers on side cards (needed after _cards[] reassignment)
  _rebindSideClicks(){
    [[0, -1], [2, 1]].forEach(([slotIdx, dir]) => {
      const card = this._cards[slotIdx];
      if(!card) return;
      // Clone to strip old listeners
      const clone = card.cloneNode(true);
      card.parentNode?.replaceChild(clone, card);
      this._cards[slotIdx] = clone;
      clone.style.cursor = 'pointer';
      clone.addEventListener('click', ()=>{
        if(typeof SFX!=='undefined') SFX.play('uiClick');
        this.shift(dir);
      });
    });
  },

  // Build a fresh card DOM node
  _makeCard(idx, side){
    const gold     = (typeof PROFILE!=='undefined')?(PROFILE.data?.gold||0):0;
    const lv       = (typeof PROFILE!=='undefined')?(PROFILE.data?.level||1):1;
    const unlocked = this.getUnlocked();
    const m        = this.list[idx];
    const isCenter = side === 'center';
    const isUnlocked = unlocked.includes(m.id);
    const canAfford  = gold >= m.goldCost && lv >= m.levelReq;

    let costHtml = '';
    if(isCenter){
      if(m.free)           costHtml=`<div class="mcard-cost unlocked">✓ FREE</div>`;
      else if(isUnlocked)  costHtml=`<div class="mcard-cost unlocked">✓ UNLOCKED</div>`;
      else if(canAfford)   costHtml=`<div class="mcard-cost affordable">🪙 ${m.goldCost.toLocaleString()}<br>CLICK PLAY TO UNLOCK</div>`;
      else { const why=lv<m.levelReq?`LV.${m.levelReq}+`:`🪙 ${m.goldCost.toLocaleString()}`; costHtml=`<div class="mcard-cost locked">🔒 ${why}</div>`; }
    }

    const card = document.createElement('div');
    card.className = `mcard mc-${isCenter?'center':'side'}`;
    card.style.position = 'absolute';
    card.style.left     = '50%';
    card.style.setProperty('--mc', isCenter&&isUnlocked ? m.color : '#444');
    card.style.setProperty('--mg', isCenter&&isUnlocked ? m.glowColor : 'transparent');

    card.innerHTML = `
      <div class="mcard-icon">${m.icon}</div>
      <div class="mcard-label">${m.label}</div>
      <div class="mcard-desc">${m.desc}</div>
      <div class="mcard-diff" style="color:${isCenter?m.diffColor:'#444'}">${m.diffLabel}</div>
      ${costHtml}
    `;

    if(!isCenter){
      card.style.cursor = 'pointer';
      card.addEventListener('click', ()=>{
        if(typeof SFX!=='undefined') SFX.play('uiClick');
        this.shift(side === 'left' ? -1 : 1);
      });
    }
    return card;
  },

  // Full rebuild on open
  _render(){
    const carousel = document.getElementById('modesCarousel');
    if(!carousel) return;

    carousel.style.position = 'relative';
    carousel.style.height   = '220px';
    carousel.style.overflow = 'visible';
    carousel.innerHTML = '';
    this._cards = [];

    const n = this.list.length;
    const defs = [
      { idx: (this._cur - 1 + n) % n, side: 'left',   slotIdx: 0 },
      { idx: this._cur,                side: 'center', slotIdx: 1 },
      { idx: (this._cur + 1) % n,      side: 'right',  slotIdx: 2 },
    ];

    defs.forEach(({ idx, side, slotIdx }) => {
      const s    = this._slots[slotIdx];
      const card = this._makeCard(idx, side);
      // Start position: correct X but shifted down + invisible
      card.style.transition = 'none';
      card.style.transform  = `translateX(calc(-50% + ${s.x}px)) scale(${s.scale}) translateY(20px)`;
      card.style.opacity    = '0';
      card.style.filter     = s.filter;
      card.style.zIndex     = String(s.zIndex);
      carousel.appendChild(card);
      this._cards.push(card);
    });

    // Staggered entrance: center first, then sides
    const delays = [60, 0, 120];
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
      this._cards.forEach((card, i) => {
        const s = this._slots[i];
        card.style.transition = `transform 0.45s cubic-bezier(.22,1,.36,1) ${delays[i]}ms, opacity 0.38s ease ${delays[i]}ms`;
        card.style.transform  = `translateX(calc(-50% + ${s.x}px)) scale(${s.scale})`;
        card.style.opacity    = String(s.opacity);
      });
    }); });

    this._syncPlayBtn();

    const gold = (typeof PROFILE!=='undefined')?(PROFILE.data?.gold||0):0;
    const lv   = (typeof PROFILE!=='undefined')?(PROFILE.data?.level||1):1;
    const goldEl = document.getElementById('modesGoldBar');
    if(goldEl) goldEl.textContent = `🪙 ${gold.toLocaleString()} GOLD  ·  LV.${lv}`;
  },

  _syncPlayBtn(){
    const btn = document.getElementById('modesPlayBtn');
    const m   = this.list[this._cur];
    if(!btn||!m) return;
    btn.style.borderColor = m.color;
    btn.style.color       = m.color;
    btn.style.boxShadow   = `0 0 16px ${m.glowColor}`;
  },

  _status(msg, color){
    const el = document.getElementById('modesStatus');
    if(!el) return;
    el.textContent = msg; el.style.color = color||'#f1c40f'; el.style.opacity = '1';
    clearTimeout(this._st); this._st = setTimeout(()=>{ el.style.opacity='0'; }, 2400);
  },
};

document.addEventListener('DOMContentLoaded',()=>{
  GEAR.init();

  // Queue-based scroll: each wheel tick enqueues a direction,
  // drainer fires shifts one-by-one as fast as the animation allows
  const scrollQueue = [];
  let draining = false;

  function drainQueue(){
    if(!scrollQueue.length){ draining = false; return; }
    draining = true;
    const dir = scrollQueue.shift();
    MODES.shift(dir);
    setTimeout(drainQueue, 180); // 180ms per step feels snappy but visible
  }

  // Listen on modesScreen so scroll works anywhere on the screen, not just over cards
  document.getElementById('modesScreen')?.addEventListener('wheel', (e)=>{
    e.preventDefault();
    if(scrollQueue.length < 5) scrollQueue.push(e.deltaY > 0 ? 1 : -1); // cap at 5
    if(!draining) drainQueue();
  }, { passive: false });
});
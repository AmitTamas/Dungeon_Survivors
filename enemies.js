// ============================================================
//  ENEMIES.JS  —  ALL ENEMY DEFINITIONS
//  Tier 1 Normal  : Goblin, Skeleton, Mage, Knight
//  Tier 2 Elite   : Orc, Wraith, Warlock, Berserker
//  Tier 3 Champion: Warlord, Specter, Lich, Death Knight
// ============================================================

const ENEMIES = {

  // ── STATS TABLE ──────────────────────────────────────────
  // hp/speed/dmg scale per wave on top of these bases
  stats: {
    // ── Tier 1 — Normal ────────────────────────────────────
    goblin:      { tier:'normal',   hp:20,  speed:1.3, dmg:8,  xp:1, score:10,  w:10, h:14 },
    skeleton:    { tier:'normal',   hp:35,  speed:0.9, dmg:12, xp:2, score:20,  w:10, h:16 },
    mage:        { tier:'normal',   hp:25,  speed:0.7, dmg:18, xp:3, score:30,  w:16, h:32 },
    knight:      { tier:'normal',   hp:80,  speed:0.8, dmg:20, xp:5, score:50,  w:12, h:18 },
    // ── Tier 2 — Elite ─────────────────────────────────────
    orc:         { tier:'elite',    hp:120, speed:1.0, dmg:22, xp:6, score:80,  w:16, h:20 },
    wraith:      { tier:'elite',    hp:80,  speed:1.4, dmg:25, xp:6, score:90,  w:14, h:18 },
    warlock:     { tier:'elite',    hp:100, speed:0.8, dmg:30, xp:7, score:100, w:14, h:20 },
    berserker:   { tier:'elite',    hp:150, speed:0.9, dmg:28, xp:8, score:110, w:16, h:22 },
    // ── Tier 3 — Champion ──────────────────────────────────
    warlord:     { tier:'champion', hp:400, speed:0.9, dmg:35, xp:15,score:300, w:24, h:30 },
    specter:     { tier:'champion', hp:250, speed:1.6, dmg:40, xp:15,score:320, w:18, h:24 },
    lich:        { tier:'champion', hp:300, speed:0.7, dmg:45, xp:18,score:350, w:20, h:28 },
    deathknight: { tier:'champion', hp:500, speed:0.8, dmg:50, xp:20,score:400, w:26, h:32 },
    // ── Boss ───────────────────────────────────────────────
    boss:        { tier:'boss',     hp:3000, speed:0.7, dmg:25, xp:20,score:500, w:28, h:36 },
    // ── Chaos Exclusives ───────────────────────────────────
    titan:       { tier:'chaos', hp:1200, speed:0.6,  dmg:60, xp:25, score:500, w:36, h:44 },
    shadearcher: { tier:'chaos', hp:400,  speed:2.2,  dmg:18, xp:20, score:400, w:18, h:24 },
    plasmawraith:{ tier:'chaos', hp:350,  speed:0.7,  dmg:15, xp:22, score:450, w:20, h:26 },
  },

  // ── SPAWN TABLE ──────────────────────────────────────────
  normalPool:   ['goblin','skeleton','mage','knight'],
  elitePool:    ['orc','wraith','warlock','berserker'],
  championPool: ['warlord','specter','lich','deathknight'],
  chaosPool:    ['titan','shadearcher','plasmawraith','orc','wraith','berserker','specter','deathknight'],

  getSpawnType(wave) {
    if(typeof MODES!=='undefined'){
      const mode=MODES.getActive();
      // Chaos mode: use chaos pool (chaos exclusives + elites + champions, no normals/boss)
      if(mode.id==='chaos'){
        return this.chaosPool[Math.floor(Math.random()*this.chaosPool.length)];
      }
      if(mode.forceElite){
        const pool=wave>=12?[...this.elitePool,...this.championPool]:this.elitePool;
        return pool[Math.floor(Math.random()*pool.length)];
      }
      if(mode.enemyFilter)
        return mode.enemyFilter[Math.floor(Math.random()*mode.enemyFilter.length)];
    }
    // Find current tier mix
    let mix = CFG.SPAWN_TIERS[0];
    for(const t of CFG.SPAWN_TIERS) { if(wave>=t.wave) mix=t; }
    const r = Math.random();
    let pool;
    if(r < mix.normal)                         pool = this.normalPool;
    else if(r < mix.normal + mix.elite)        pool = this.elitePool;
    else                                        pool = this.championPool;
    return pool[Math.floor(Math.random()*pool.length)];
  },

  getNovaKillsNeeded(wave) {
    let kills = CFG.NOVA_KILLS[0].kills;
    for(const n of CFG.NOVA_KILLS) { if(wave>=n.wave) kills=n.kills; }
    return Math.max(3, kills);
  },

  getNovaDamage(tier, maxHp) {
    const pct = CFG.NOVA_DAMAGE[tier] || 1.0;
    return maxHp * pct;
  },

  // ── DRAW DISPATCH ────────────────────────────────────────
  draw(ctx, e, cam, tick) {
    const sx=e.x-cam.x, sy=e.y-cam.y;
    if(sx<-60||sx>860||sy<-60||sy>660) return;
    const fl = e.hitTimer>0 && Math.floor(tick/2)%2===0;

    // Shadow
    // Shadow — drawn at feet level per enemy type
    const shadowY = e.type==='mage' ? sy : sy + e.h/2 - 1;
    const shadowW = e.type==='mage' ? 20 : e.w;
    ctx.fillStyle='#00000055';
    ctx.beginPath();
    ctx.ellipse(sx, shadowY, shadowW/2, 3, 0, 0, Math.PI*2);
    ctx.fill();

    switch(e.type) {
      case 'goblin':      this._goblin(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'skeleton':    this._skeleton(ctx,sx,sy,fl,tick,e,e.facing||1,e.speed||0.9); break;
      case 'mage':        this._mage(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'knight':      this._knight(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'orc':         this._orc(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'wraith':      this._wraith(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'warlock':     this._warlock(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'berserker':   this._berserker(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'warlord':     this._warlord(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'specter':     this._specter(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'lich':        this._lich(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'deathknight': this._deathknight(ctx,sx,sy,fl,tick,e.facing||1); break;
      case 'boss':        this._boss(ctx,sx,sy,fl,tick,e,e.facing||1); break;
      // ── Chaos exclusives ───────────────────────────────
      case 'titan':        this._titan(ctx,sx,sy,fl,tick,e,e.facing||1); break;
      case 'shadearcher':  this._shadearcher(ctx,sx,sy,fl,tick,e,e.facing||1); break;
      case 'plasmawraith': this._plasmawraith(ctx,sx,sy,fl,tick,e,e.facing||1); break;
    }

    // Ability FX overlay
    this._abilityFx(ctx,e,sx,sy,tick);

    // HP bar (not for boss — boss has its own)
    if(e.type!=='boss') this._hpBar(ctx,sx,sy,e);
  },

  // ── TIER 1 — NORMAL ──────────────────────────────────────
 
  // this is new goblin
  _goblin(ctx,sx,sy,fl,tick,facing=1) {
    const FRAME_COUNT = 12;
    const FRAME_SPEED = 10;
    const frameIndex = (Math.floor(tick / FRAME_SPEED) % FRAME_COUNT) + 1;
    const img     = SPRITES[`goblin${frameIndex}`];
    const hasBody = img && img.complete && img.naturalWidth;

    // Glow aura
    if(!fl){
      const pulse = Math.sin(tick * 0.1) * 0.3 + 0.7;
      const glow = ctx.createRadialGradient(sx, sy-12, 2, sx, sy-12, 18);
      glow.addColorStop(0, `rgba(80,200,80,${0.3*pulse})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy-12, 18, 0, Math.PI*2); ctx.fill();
    }

    // 1. Swinging legs — drawn first so body overlaps
    const legL = SPRITES.goblinLegL;
    const legR = SPRITES.goblinLegR;
    const hasLegs = legL&&legL.complete&&legL.naturalWidth&&legR&&legR.complete&&legR.naturalWidth;

    if(hasLegs){
      const swing = Math.sin(tick * 0.15) * 0.35;
      const flip  = facing < 0 ? -1 : 1;
      const lw = legL.naturalWidth, lh = legL.naturalHeight;
      const rw = legR.naturalWidth, rh = legR.naturalHeight;

      // Left leg
      ctx.save();
      ctx.translate(sx - lw/2 * flip, sy - 4);
      ctx.scale(flip, 1);
      ctx.rotate(-swing);
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.drawImage(legL, 0, 0, lw, lh);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.restore();

      // Right leg
      ctx.save();
      ctx.translate(sx + rw/2 * flip, sy - 4);
      ctx.scale(flip, 1);
      ctx.rotate(swing);
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.drawImage(legR, -rw, 0, rw, rh);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.restore();
    }

    // 2. Body on top
    if(hasBody){
      ctx.save();
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.translate(sx, sy);
      if(facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -16, -28, 32, 28);
      if(fl){ ctx.filter='none'; ctx.globalAlpha=1; }
      ctx.restore();
      return;
    }

    // Fallback canvas
    const c=fl?'#fff':'#e74c3c', d=fl?'#fff':'#922b21';
    ctx.fillStyle=c; ctx.fillRect(sx-5,sy-4,10,8);
    ctx.fillStyle=d; ctx.fillRect(sx-5,sy+2,10,2);
    ctx.fillStyle=c; ctx.fillRect(sx-4,sy-11,8,8);
    if(!fl){ctx.fillStyle='#fff';ctx.fillRect(sx-2,sy-9,2,2);ctx.fillRect(sx+1,sy-9,2,2);}
    ctx.fillStyle=d; ctx.fillRect(sx-6,sy-10,2,3); ctx.fillRect(sx+4,sy-10,2,3);
  },

  _skeleton(ctx,sx,sy,fl,tick,e={},facing=1,speed=0.9) {
    const body  = SPRITES.skeletonBody;
    const bone  = SPRITES.skeletonBone;
    const legL  = SPRITES.skeletonLegL;
    const legR  = SPRITES.skeletonLegR;
    const has = s => s && s.complete && s.naturalWidth;

    if(!has(body)){
      // fallback canvas draw
      const c=fl?'#fff':'#ecf0f1', d=fl?'#fff':'#bdc3c7';
      ctx.fillStyle=c; ctx.fillRect(sx-5,sy-4,10,10); ctx.fillRect(sx-4,sy-13,8,9);
      if(!fl){
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(sx-2,sy-11,2,2); ctx.fillRect(sx+1,sy-11,2,2);
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(sx-3,sy-5,6,2);
      }
      ctx.fillStyle=d; for(let i=0;i<3;i++) ctx.fillRect(sx-3,sy-1+i*3,6,1);
      return;
    }

    const SCALE = 1.2; // increase to make skeleton bigger
    const bw = body.naturalWidth  * SCALE;
    const bh = body.naturalHeight * SCALE;

    // ── 1. Swinging legs (drawn first so body overlaps them at hip) ──
    if(has(legL) && has(legR)){
      // leg swing speed matches enemy movement speed
      const swingSpeed = 0.08 + speed * 0.05;
      const swing = Math.sin(tick * swingSpeed) * 0.35;
      const hipY  = sy; // anchor legs at bottom of body
      const lw = legL.naturalWidth  * SCALE, lh = legL.naturalHeight * SCALE;
      const rw = legR.naturalWidth  * SCALE, rh = legR.naturalHeight * SCALE;

      // flip legs to match body facing
      const flipL = facing < 0 ? -1 : 1;

      ctx.save();
      ctx.translate(sx - lw/2 * flipL, hipY);
      ctx.scale(flipL, 1);
      ctx.rotate(-swing);
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.drawImage(legL, 0, 0, lw, lh);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.restore();

      ctx.save();
      ctx.translate(sx + rw/2 * flipL, hipY);
      ctx.scale(flipL, 1);
      ctx.rotate(swing);
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.drawImage(legR, -rw, 0, rw, rh);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.restore();
    }

    // ── 2. Body (static, drawn over hip of legs) ──────────────
    ctx.save();
    if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
    if(facing < 0){
      ctx.translate(sx + bw/2, sy - bh);
      ctx.scale(-1, 1);
      ctx.drawImage(body, 0, 0, bw, bh);
    } else {
      ctx.drawImage(body, sx - bw/2, sy - bh, bw, bh);
    }
    ctx.filter='none'; ctx.globalAlpha=1;
    ctx.restore();

    // ── 3. Orbital bones ──────────────────────────────────────
    if(has(bone) && !fl){
      const angle = tick * 0.05;
      const rx = 16, ry = 6;
      const boneW = bone.naturalWidth  * SCALE, boneH = bone.naturalHeight * SCALE;
      const orbitCY = sy - bh * 0.5;
      const orbCount = e._boneCount ?? 2; // drops to 1 or 0 when fired

      for(let i = 0; i < orbCount; i++){
        const a  = angle + i * Math.PI;
        const bx = sx + Math.cos(a) * rx;
        const by = orbitCY + Math.sin(a) * ry;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a * 0.6);
        ctx.drawImage(bone, -boneW/2, -boneH/2, boneW, boneH);
        ctx.restore();
      }
    }
  },

  _mage(ctx,sx,sy,fl,tick,facing=1) {
    const FRAME_COUNT = 12;
    const FRAME_SPEED = 10;
    const frameIndex = (Math.floor(tick / FRAME_SPEED) % FRAME_COUNT) + 1;
    const img = SPRITES[`mage${frameIndex}`];

    // Glow aura behind sprite
    if(!fl){
      const pulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
      const glow = ctx.createRadialGradient(sx, sy-16, 2, sx, sy-16, 22);
      glow.addColorStop(0, `rgba(180,0,255,${0.35*pulse})`);
      glow.addColorStop(0.5, `rgba(140,0,200,${0.15*pulse})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy-16, 22, 0, Math.PI*2); ctx.fill();

      // Outer ring flicker
      ctx.strokeStyle = `rgba(200,50,255,${0.4*pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy-16, 18 + Math.sin(tick*0.15)*2, 0, Math.PI*2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Sprite
    if(img && img.complete && img.naturalWidth){
      ctx.save();
      if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
      ctx.translate(sx, sy);
      if(facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -16, -32, 32, 32);
      if(fl){ ctx.filter='none'; ctx.globalAlpha=1; }
      ctx.restore();
    }

    // Sparkles on top of sprite
    if(!fl){
      const sparkCount = 3;
      for(let i = 0; i < sparkCount; i++){
        const angle = (tick * 0.04) + (i * Math.PI * 2 / sparkCount);
        const r = 14 + Math.sin(tick * 0.1 + i) * 4;
        const spx = sx + Math.cos(angle) * r;
        const spy = sy - 16 + Math.sin(angle) * r * 0.5;
        const size = Math.sin(tick * 0.1 + i * 2) * 1.5 + 2;
        ctx.fillStyle = i % 2 === 0 ? '#cc44ff' : '#ff88ff';
        ctx.beginPath(); ctx.arc(spx, spy, size, 0, Math.PI*2); ctx.fill();
      }
    }
    // Fallback canvas draw if sprites not loaded
    // const c=fl?'#fff':'#8e44ad', d=fl?'#fff':'#6c3483';
    // ctx.fillStyle=fl?'#fff':'#76448a'; ctx.fillRect(sx-4,sy-13,8,9);
    // ctx.fillStyle=c; ctx.fillRect(sx-5,sy-5,10,10);
    // if(!fl){ctx.fillStyle='#f39c12';ctx.fillRect(sx-1,sy-11,2,2);ctx.fillRect(sx+2,sy-11,2,2);}
    // ctx.fillStyle=fl?'#fff':'#5b2c6f'; ctx.fillRect(sx-3,sy-19,6,7); ctx.fillRect(sx-5,sy-13,10,2);
    // if(!fl){
    //   const p2=Math.sin(tick*0.1)*1+4;
    //   const ox=facing>0?10:-10;
    //   ctx.fillStyle='#9b59b6'; ctx.beginPath(); ctx.arc(sx+ox,sy-2,p2,0,Math.PI*2); ctx.fill();
    //   ctx.fillStyle='#d7bde2'; ctx.beginPath(); ctx.arc(sx+ox,sy-3,p2*0.4,0,Math.PI*2); ctx.fill();
    // }
  },

  _knight(ctx,sx,sy,fl,tick,facing=1) {
    if(drawSprite(ctx,SPRITES.knight,sx,sy,facing,32,32,fl)) return;
    ctx.fillStyle=fl?'#fff':'#2980b9'; ctx.fillRect(sx-6,sy-5,12,12); ctx.fillRect(sx-5,sy-14,10,10);
    if(!fl){
      ctx.fillStyle='#1a5276'; ctx.fillRect(sx-3,sy-11,6,3);
      ctx.fillStyle='#aed6f1'; ctx.fillRect(sx-5,sy-5,3,8); ctx.fillRect(sx-4,sy-14,2,5);
    }
    const sx2=facing>0?sx+7:sx-12;
    ctx.fillStyle=fl?'#fff':'#2471a3'; ctx.fillRect(sx2,sy-8,5,10);
    ctx.fillStyle=fl?'#fff':'#1a5276'; ctx.fillRect(sx2+1,sy-4,3,5);
    if(!fl){ctx.fillStyle='#7f8c8d';ctx.fillRect(facing>0?sx-12:sx+10,sy-10,2,14);}
  },

  // ── TIER 2 — ELITE ───────────────────────────────────────

  _orc(ctx,sx,sy,fl,tick,facing=1) {
    const c=fl?'#fff':'#27ae60', d=fl?'#fff':'#1e8449';
    if(!fl){ctx.fillStyle='#f1c40f22';ctx.fillRect(sx-10,sy-18,20,28);}
    ctx.fillStyle=c; ctx.fillRect(sx-8,sy-6,16,14);
    ctx.fillStyle=d; ctx.fillRect(sx-8,sy+4,16,4);
    ctx.fillStyle=c; ctx.fillRect(sx-7,sy-18,14,13);
    if(!fl){
      ctx.fillStyle='#f1c40f'; ctx.fillRect(sx-4,sy-15,3,3); ctx.fillRect(sx+2,sy-15,3,3);
      ctx.fillStyle='#111'; ctx.fillRect(sx-3,sy-14,2,2); ctx.fillRect(sx+3,sy-14,2,2);
      ctx.fillStyle='#fff'; ctx.fillRect(sx-3,sy-7,2,4); ctx.fillRect(sx+2,sy-7,2,4);
      const cx=facing>0?sx+9:sx-13;
      ctx.fillStyle='#5d4037'; ctx.fillRect(cx,sy-12,4,16);
      ctx.fillStyle='#8d6e63'; ctx.fillRect(cx-1,sy-14,6,6);
      ctx.fillStyle='#f1c40f'; ctx.fillRect(sx-10,sy-8,4,6); ctx.fillRect(sx+7,sy-8,4,6);
    }
  },

  _wraith(ctx,sx,sy,fl,tick,facing=1) {
    const phase=Math.sin(tick*0.08)*0.3+0.7;
    if(!fl) ctx.globalAlpha=phase;
    const c=fl?'#fff':'#9b59b6', d=fl?'#fff':'#7d3c98';
    ctx.fillStyle=c;
    ctx.fillRect(sx-6,sy-5,12,14);
    ctx.fillRect(sx-4,sy+9,8,4);
    ctx.fillRect(sx-2,sy+13,4,3);
    ctx.fillStyle=d; ctx.fillRect(sx-5,sy-16,10,12);
    ctx.fillRect(sx-7,sy-8,14,4);
    if(!fl){
      ctx.fillStyle='#e74c3c'; ctx.fillRect(sx-3,sy-13,2,2); ctx.fillRect(sx+2,sy-13,2,2);
      ctx.fillStyle='#f1c40f33'; ctx.fillRect(sx-8,sy-18,16,24);
      ctx.fillStyle=c+'88'; ctx.fillRect(sx-12,sy-4,6,2); ctx.fillRect(sx+6,sy-4,6,2);
    }
    ctx.globalAlpha=1;
  },

  _warlock(ctx,sx,sy,fl,tick,facing=1) {
    const c=fl?'#fff':'#2c3e50', d=fl?'#fff':'#1a252f';
    if(!fl){ctx.fillStyle='#f1c40f22';ctx.fillRect(sx-9,sy-22,18,30);}
    ctx.fillStyle=fl?'#fff':'#1a252f'; ctx.fillRect(sx-6,sy-6,12,16); ctx.fillRect(sx-4,sy+10,8,4);
    ctx.fillStyle=fl?'#fff':'#3d566e'; ctx.fillRect(sx-5,sy-17,10,12);
    ctx.fillStyle=fl?'#fff':'#1a252f'; ctx.fillRect(sx-4,sy-26,8,10); ctx.fillRect(sx-6,sy-17,12,3);
    if(!fl){
      ctx.fillStyle='#e74c3c'; ctx.fillRect(sx-2,sy-14,2,2); ctx.fillRect(sx+1,sy-14,2,2);
      const stx=facing>0?sx+7:sx-9;
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(stx,sy-20,2,24);
      const orb=Math.sin(tick*0.12)*0.5+3;
      ctx.fillStyle='#e74c3c'; ctx.beginPath(); ctx.arc(stx+1,sy-22,orb,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff8888'; ctx.beginPath(); ctx.arc(stx+1,sy-23,orb*0.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f1c40f'; ctx.fillRect(sx-6,sy-6,12,2); ctx.fillRect(sx-6,sy+8,12,2);
    }
  },

  _berserker(ctx,sx,sy,fl,tick,facing=1) {
    const c=fl?'#fff':'#c0392b', d=fl?'#fff':'#922b21';
    if(!fl){ctx.fillStyle='#f1c40f22';ctx.fillRect(sx-10,sy-20,20,30);}
    ctx.fillStyle=fl?'#fff':'#7f8c8d'; ctx.fillRect(sx-8,sy-6,16,14);
    ctx.fillStyle=c; ctx.fillRect(sx-6,sy-4,12,10);
    ctx.fillStyle=fl?'#fff':'#7f8c8d'; ctx.fillRect(sx-7,sy-18,14,13);
    ctx.fillStyle=c; ctx.fillRect(sx-5,sy-16,10,10);
    if(!fl){
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(sx-7,sy-18,14,4);
      ctx.fillRect(sx-7,sy-10,3,6); ctx.fillRect(sx+4,sy-10,3,6);
      ctx.fillStyle='#fff'; ctx.fillRect(sx-2,sy-14,4,3);
      // axes always on both sides — symmetric
      ctx.fillStyle='#95a5a6'; ctx.fillRect(sx-14,sy-8,4,10); ctx.fillRect(sx+10,sy-8,4,10);
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(sx-16,sy-10,4,6); ctx.fillRect(sx+12,sy-10,4,6);
      ctx.fillStyle='#f1c40f33'; ctx.fillRect(sx-10,sy-20,20,28);
    }
  },

  // ── TIER 3 — CHAMPION ────────────────────────────────────

  _warlord(ctx,sx,sy,fl,tick,facing=1) {
    const pulse=Math.sin(tick*0.07)*3;
    if(!fl){
      ctx.fillStyle='#00000066'; ctx.fillRect(sx-16,sy-30,32,44);
      ctx.fillStyle='#e74c3c22'; ctx.fillRect(sx-14,sy-28,28,40);
    }
    ctx.fillStyle=fl?'#fff':'#1e8449'; ctx.fillRect(sx-12,sy-8,24,20);
    ctx.fillStyle=fl?'#fff':'#145a32'; ctx.fillRect(sx-12,sy+8,24,4);
    if(!fl){ctx.fillStyle='#7f8c8d';ctx.fillRect(sx-12,sy-8,24,4);ctx.fillRect(sx-14,sy-4,4,12);ctx.fillRect(sx+10,sy-4,4,12);}
    ctx.fillStyle=fl?'#fff':'#27ae60'; ctx.fillRect(sx-10,sy-26,20,19);
    if(!fl){
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(sx-10,sy-26,20,5);
      ctx.fillStyle='#e74c3c'; ctx.fillRect(sx-12,sy-32+pulse,4,8); ctx.fillRect(sx+8,sy-32+pulse,4,8);
      ctx.fillStyle='#ff0000'; ctx.fillRect(sx-6,sy-22,4,4); ctx.fillRect(sx+3,sy-22,4,4);
      ctx.fillStyle='#ff6666'; ctx.fillRect(sx-5,sy-21,2,2); ctx.fillRect(sx+4,sy-21,2,2);
      const ax=facing>0?sx+14:sx-18;
      ctx.fillStyle='#5d4037'; ctx.fillRect(ax,sy-22,4,28);
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(ax-2,sy-26,8,10);
      ctx.fillStyle='#bdc3c7'; ctx.fillRect(ax-1,sy-25,6,2);
    }
  },

  _specter(ctx,sx,sy,fl,tick,facing=1) {
    const phase=Math.sin(tick*0.1)*0.25+0.6;
    if(!fl) ctx.globalAlpha=phase;
    const c=fl?'#fff':'#1a1a2e', d=fl?'#fff':'#0d0d0d';
    if(!fl){
      ctx.fillStyle='#00000088'; ctx.fillRect(sx-12,sy-28,24,36);
      ctx.fillStyle='#e74c3c11'; ctx.fillRect(sx-10,sy-26,20,32);
    }
    ctx.fillStyle=c; ctx.fillRect(sx-9,sy-6,18,18);
    ctx.fillRect(sx-7,sy+12,4,6); ctx.fillRect(sx-1,sy+12,4,6); ctx.fillRect(sx+5,sy+12,4,6);
    ctx.fillStyle=d; ctx.fillRect(sx-8,sy-22,16,17);
    if(!fl){
      ctx.fillStyle='#ff0000'; ctx.fillRect(sx-4,sy-18,4,3); ctx.fillRect(sx+1,sy-18,4,3);
      const gw=ctx.createRadialGradient(sx,sy,2,sx,sy,16);
      gw.addColorStop(0,'rgba(231,76,60,0.3)'); gw.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gw; ctx.beginPath(); ctx.arc(sx,sy,16,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#0d0d0d';
      ctx.fillRect(sx-14,sy+2,3,8); ctx.fillRect(sx-12,sy+8,2,4);
      ctx.fillRect(sx+11,sy+2,3,8); ctx.fillRect(sx+11,sy+8,2,4);
    }
    ctx.globalAlpha=1;
  },

  _lich(ctx,sx,sy,fl,tick,facing=1) {
    const float=Math.sin(tick*0.07)*3;
    if(!fl){ ctx.fillStyle='#8e44ad22'; ctx.fillRect(sx-13,sy-32+float,26,42); }
    ctx.fillStyle=fl?'#fff':'#1a1a2e'; ctx.fillRect(sx-9,sy-8+float,18,20);
    ctx.fillStyle=fl?'#fff':'#0d0d0d'; ctx.fillRect(sx-7,sy+10+float,14,6);
    ctx.fillStyle=fl?'#fff':'#ecf0f1'; ctx.fillRect(sx-8,sy-26+float,16,19);
    if(!fl){
      ctx.fillStyle='#1a1a2e'; ctx.fillRect(sx-6,sy-22+float,4,4); ctx.fillRect(sx+2,sy-22+float,4,4);
      ctx.fillStyle='#9b59b6'; ctx.fillRect(sx-5,sy-21+float,3,3); ctx.fillRect(sx+3,sy-21+float,3,3);
      ctx.fillStyle='#d7bde2'; ctx.fillRect(sx-4,sy-20+float,2,2); ctx.fillRect(sx+4,sy-20+float,2,2);
      ctx.fillStyle='#ecf0f1'; ctx.fillRect(sx-5,sy-10+float,10,4);
      ctx.fillStyle='#1a1a2e'; for(let i=0;i<4;i++) ctx.fillRect(sx-4+i*3,sy-9+float,2,3);
      const stx=facing>0?sx+10:sx-13;
      ctx.fillStyle='#1a1a2e'; ctx.fillRect(stx,sy-30+float,3,38);
      const orb=Math.sin(tick*0.1)*1.5+5;
      ctx.fillStyle='#9b59b6'; ctx.beginPath(); ctx.arc(stx+1,sy-33+float,orb,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#d7bde2'; ctx.beginPath(); ctx.arc(stx+1,sy-34+float,orb*0.4,0,Math.PI*2); ctx.fill();
      const ang=tick*0.03;
      ctx.fillStyle='#ecf0f1';
      ctx.fillRect(sx+Math.cos(ang)*14-2, sy+Math.sin(ang)*8-2+float, 4, 4);
      ctx.fillRect(sx+Math.cos(ang+Math.PI)*14-2, sy+Math.sin(ang+Math.PI)*8-2+float, 4, 4);
    }
  },

  _deathknight(ctx,sx,sy,fl,tick,facing=1) {
    const pulse=Math.sin(tick*0.08)*2;
    if(!fl){
      ctx.fillStyle='#00000077'; ctx.fillRect(sx-16,sy-36,32,48);
      ctx.fillStyle='#e74c3c22'; ctx.fillRect(sx-14,sy-34,28,44);
    }
    ctx.fillStyle=fl?'#fff':'#1a1a2e'; ctx.fillRect(sx-13,sy-8,26,22);
    ctx.fillStyle=fl?'#fff':'#0d0d0d'; ctx.fillRect(sx-13,sy+10,26,4);
    if(!fl){
      ctx.fillStyle='#eb3c28ff';
      for(let i=0;i<3;i++){ctx.fillRect(sx-16+i*4,sy-14,3,6+pulse);ctx.fillRect(sx+8+i*4,sy-14,3,6+pulse);}
    }
    ctx.fillStyle=fl?'#fff':'#1a1a2e'; ctx.fillRect(sx-11,sy-28,22,21);
    ctx.fillStyle=fl?'#fff':'#0d0d0d'; ctx.fillRect(sx-11,sy-28,22,5);
    if(!fl){
      ctx.fillStyle='#ff0000'; ctx.fillRect(sx-8,sy-22,6,3); ctx.fillRect(sx+2,sy-22,6,3);
      ctx.fillStyle='#ff6666'; ctx.fillRect(sx-7,sy-21,4,1); ctx.fillRect(sx+3,sy-21,4,1);
      const swx=facing>0?sx+14:sx-19;
      ctx.fillStyle='#2c3e50'; ctx.fillRect(swx,sy-30,5,40);
      ctx.fillStyle='#7f8c8d'; ctx.fillRect(swx-2,sy-34,9,8);
      ctx.fillStyle='#bdc3c7'; ctx.fillRect(swx-1,sy-33,7,2);
      const aura=ctx.createRadialGradient(sx,sy,4,sx,sy,22);
      aura.addColorStop(0,'rgba(0,0,0,0)'); aura.addColorStop(0.7,'rgba(0,0,0,0)'); aura.addColorStop(1,'rgba(243, 72, 53, 0.39)');
      ctx.fillStyle=aura; ctx.fillRect(sx-22,sy-22,44,44);
    }
  },

  _boss(ctx,sx,sy,fl,tick,e,facing=1) {
    const pulse=Math.sin(tick*0.06)*2;
    ctx.fillStyle=fl?'#fff':'#ff0055'; ctx.fillRect(sx-16,sy-12,32,22);
    ctx.fillStyle=fl?'#fff':'#8b0000'; ctx.fillRect(sx-16,sy+6,32,4);
    if(!fl){ctx.fillStyle='#8b0000';for(let i=0;i<4;i++) ctx.fillRect(sx-12+i*8,sy-18,4,6);}
    ctx.fillStyle=fl?'#fff':'#ff4466'; ctx.fillRect(sx-12,sy-26+pulse,24,16);
    if(!fl){
      ctx.fillStyle='#ff0'; ctx.fillRect(sx-8,sy-22+pulse,5,5); ctx.fillRect(sx+3,sy-22+pulse,5,5);
      ctx.fillStyle='#f00'; ctx.fillRect(sx-4,sy-19+pulse,3,3); ctx.fillRect(sx+5,sy-19+pulse,3,3);
      ctx.fillStyle='#111'; ctx.fillRect(sx-10,sy-32+pulse,5,8); ctx.fillRect(sx+5,sy-32+pulse,5,8);
      ctx.fillStyle='#fff'; ctx.fillRect(sx-5,sy-14+pulse,10,3);
      ctx.fillStyle='#ff000033';
      ctx.beginPath(); ctx.arc(sx-7,sy-36+pulse,6,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+7,sy-36+pulse,6,0,Math.PI*2); ctx.fill();
    }
    // Boss HP bar above
    ctx.fillStyle='#111'; ctx.fillRect(sx-40,sy-44,80,8);
    ctx.fillStyle='#ff0055'; ctx.fillRect(sx-40,sy-44,80*(e.hp/e.maxHp),8);
    ctx.fillStyle='#ff88aa'; ctx.fillRect(sx-40,sy-44,80*(e.hp/e.maxHp),2);
    ctx.fillStyle='#ff005511';
    ctx.beginPath(); ctx.arc(sx,sy,28+pulse,0,Math.PI*2); ctx.fill();
  },

  // ── CHAOS ENEMIES ────────────────────────────────────────

  _titan(ctx, sx, sy, fl, tick, e, facing=1) {
    const pulse = Math.sin(tick * 0.06) * 3;
    const c = fl ? '#fff' : '#b03010';
    const d = fl ? '#fff' : '#7a1f08';
    const arm = fl ? '#fff' : '#8b2500';

    // Ground impact glow when jumping
    if(e._jumpWarning) {
      const wp = (e._jumpWarningTimer||0) / 120;
      ctx.fillStyle = `rgba(255,80,0,${0.35 * wp})`;
      ctx.beginPath(); ctx.arc(sx, sy+20, 80 * wp, 0, Math.PI*2); ctx.fill();
    }

    // Body — massive torso
    ctx.fillStyle = c;
    ctx.fillRect(sx-18, sy-10, 36, 28);
    ctx.fillStyle = d;
    ctx.fillRect(sx-18, sy+14, 36, 4);

    // Chest plate
    if(!fl) {
      ctx.fillStyle = '#5a0a00';
      ctx.fillRect(sx-14, sy-8, 28, 18);
      ctx.fillStyle = '#ff3300';
      ctx.fillRect(sx-10, sy-4, 8, 10);
      ctx.fillRect(sx+2,  sy-4, 8, 10);
      // Glowing eye sockets
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(sx-6, sy-24+pulse, 5, 5);
      ctx.fillRect(sx+2, sy-24+pulse, 5, 5);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx-5, sy-23+pulse, 3, 3);
      ctx.fillRect(sx+3, sy-23+pulse, 3, 3);
    }

    // Head — big helmet
    ctx.fillStyle = c;
    ctx.fillRect(sx-14, sy-32+pulse, 28, 24);
    ctx.fillStyle = d;
    ctx.fillRect(sx-14, sy-32+pulse, 28, 5); // visor top
    // Horns
    if(!fl) {
      ctx.fillStyle = arm;
      ctx.fillRect(sx-18, sy-44+pulse, 6, 14);
      ctx.fillRect(sx+12, sy-44+pulse, 6, 14);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(sx-16, sy-46+pulse, 4, 4);
      ctx.fillRect(sx+14, sy-46+pulse, 4, 4);
    }

    // Arms — thick
    ctx.fillStyle = arm;
    ctx.fillRect(sx-26, sy-8,  10, 22); // left arm
    ctx.fillRect(sx+16, sy-8,  10, 22); // right arm
    if(!fl) {
      ctx.fillStyle = '#5a0a00';
      ctx.fillRect(sx-28, sy-10, 6, 8);
      ctx.fillRect(sx+22, sy-10, 6, 8);
      // Fist spikes
      ctx.fillStyle = '#888';
      for(let i=0;i<3;i++) {
        ctx.fillRect(sx-27+i*3, sy+14, 2, 6);
        ctx.fillRect(sx+20+i*3, sy+14, 2, 6);
      }
    }

    // HP bar
    this._hpBar(ctx, sx, sy, e);
  },

  _shadearcher(ctx, sx, sy, fl, tick, e, facing=1) {
    const c = fl ? '#fff' : '#1a3a5c';
    const d = fl ? '#fff' : '#0d2035';
    const accent = fl ? '#fff' : '#00d4ff';

    // Sprint afterimage when charging
    if(e._archerCharging) {
      for(let i=1;i<=3;i++) {
        ctx.globalAlpha = 0.15/i;
        ctx.fillStyle = accent;
        ctx.fillRect(sx - facing*i*8 - 9, sy-22, 18, 28);
      }
      ctx.globalAlpha = 1;
    }

    // Cloak / body
    ctx.fillStyle = c;
    ctx.fillRect(sx-9, sy-4, 18, 22);
    ctx.fillStyle = d;
    ctx.fillRect(sx-8, sy+14, 16, 4);

    // Hood/head
    ctx.fillStyle = c;
    ctx.fillRect(sx-7, sy-20, 14, 17);
    ctx.fillStyle = d;
    ctx.fillRect(sx-8, sy-22, 16, 6); // hood brim

    if(!fl) {
      // Glowing eyes — pulse faster during burst
      const eyePulse = e._archerBursting ? Math.floor(tick/3)%2 : 1;
      ctx.fillStyle = eyePulse ? accent : '#006688';
      ctx.fillRect(sx-4, sy-16, 3, 2);
      ctx.fillRect(sx+2, sy-16, 3, 2);

      // Bow — drawn on bow-hand side
      const bx = facing > 0 ? sx+10 : sx-14;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(bx, sy-20, 4, 32);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx+2, sy-20);
      ctx.quadraticCurveTo(bx + (facing>0?12:-12), sy-4, bx+2, sy+12);
      ctx.stroke();
      ctx.lineWidth = 1;

      // Quiver
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(facing>0?sx-14:sx+10, sy-18, 5, 16);
      ctx.fillStyle = accent;
      for(let i=0;i<3;i++) ctx.fillRect(facing>0?sx-12:sx+12, sy-18-i*2, 1, 4);
    }

    this._hpBar(ctx, sx, sy, e);
  },

  _plasmawraith(ctx, sx, sy, fl, tick, e, facing=1) {
    const float = Math.sin(tick * 0.08) * 4;
    const pulse = Math.sin(tick * 0.1) * 0.3 + 0.7;
    const c = fl ? '#fff' : '#4a0080';
    const glow = fl ? '#fff' : '#cc44ff';

    // Outer aura
    if(!fl) {
      const aura = ctx.createRadialGradient(sx, sy+float, 4, sx, sy+float, 28);
      aura.addColorStop(0, `rgba(180,0,255,${0.4*pulse})`);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(sx, sy+float, 28, 0, Math.PI*2); ctx.fill();
    }

    // Robe / body — tapered ghost shape
    ctx.fillStyle = c;
    ctx.fillRect(sx-10, sy-2+float, 20, 20);
    // Taper at bottom
    ctx.fillRect(sx-7, sy+18+float, 14, 6);
    ctx.fillRect(sx-4, sy+24+float, 8, 4);

    // Head
    ctx.fillStyle = c;
    ctx.fillRect(sx-8, sy-18+float, 16, 17);
    if(!fl) {
      ctx.fillStyle = glow;
      ctx.fillRect(sx-5, sy-14+float, 4, 4);
      ctx.fillRect(sx+2, sy-14+float, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx-4, sy-13+float, 2, 2);
      ctx.fillRect(sx+3, sy-13+float, 2, 2);
      // Orbiting plasma sparks
      for(let i=0;i<4;i++) {
        const a = tick * 0.06 + i * Math.PI/2;
        ctx.fillStyle = `rgba(200,80,255,${pulse})`;
        ctx.fillRect(sx+Math.cos(a)*14-2, sy+Math.sin(a)*10-2+float, 4, 4);
      }
      // Show charge indicator if about to fire
      if(e._plasmaCharging) {
        const cp = Math.min(1, (e._plasmaChargeTimer||0)/60);
        ctx.fillStyle = `rgba(255,0,255,${cp * 0.8})`;
        ctx.beginPath(); ctx.arc(sx, sy+float, 20*cp, 0, Math.PI*2); ctx.fill();
      }
    }

    this._hpBar(ctx, sx, sy, e);
  },

  // ── ABILITY FX OVERLAY ───────────────────────────────────
  _abilityFx(ctx,e,sx,sy,tick) {
    if(e.mageShield){
      // Center on body not feet — offset up by half sprite height
      const cx = sx;
      const cy = sy - e.h * 0.5;
      const pulse  = Math.sin(tick*0.15)*0.3+0.7;
      const pulse2 = Math.sin(tick*0.08)*0.5+0.5;
      const r      = 20; // fixed radius for all enemies — no more size difference

      // Outer glow
      const glow = ctx.createRadialGradient(cx,cy,r-4,cx,cy,r+8);
      glow.addColorStop(0, `rgba(155,89,182,${0.3*pulse})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle=glow;
      ctx.beginPath(); ctx.arc(cx,cy,r+8,0,Math.PI*2); ctx.fill();

      // Rotating hex segments
      for(let i=0;i<6;i++){
        const angle = (tick*0.04) + (i * Math.PI/3);
        const x1 = cx + Math.cos(angle) * r;
        const y1 = cy + Math.sin(angle) * r;
        const x2 = cx + Math.cos(angle + Math.PI/3) * r;
        const y2 = cy + Math.sin(angle + Math.PI/3) * r;
        ctx.strokeStyle = `rgba(200,100,255,${0.6*pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }

      // Inner fill pulse
      ctx.fillStyle=`rgba(155,89,182,${0.12*pulse2})`;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

      // Orbiting sparks
      for(let i=0;i<4;i++){
        const a = (tick*0.06) + (i * Math.PI/2);
        const spx = cx + Math.cos(a) * r;
        const spy = cy + Math.sin(a) * r;
        ctx.fillStyle=`rgba(220,150,255,${pulse})`;
        ctx.beginPath(); ctx.arc(spx,spy,2,0,Math.PI*2); ctx.fill();
      }

      ctx.lineWidth=1;
    }
    if(e.shielded&&e.shieldHits>0){
      const cx = sx;
      const cy = sy - e.h * 0.25;
      const r  = Math.max(e.w, 14) + 10;
      const pulse = Math.sin(tick*0.12)*0.3+0.7;

      // Soft outer glow — no hard edge
      const glow = ctx.createRadialGradient(cx,cy,r*0.4,cx,cy,r+6);
      glow.addColorStop(0, `rgba(255,0,180,${0.25*pulse})`);
      glow.addColorStop(0.5, `rgba(200,0,140,${0.15*pulse})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle=glow;
      ctx.beginPath(); ctx.arc(cx,cy,r+12,0,Math.PI*2); ctx.fill();

      // Soft inner fill
      ctx.fillStyle=`rgba(255,0,180,${0.1*pulse})`;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

      // Hit count
      ctx.font="6px 'Press Start 2P'";
      ctx.fillStyle=`rgba(255,150,220,${pulse})`;
      ctx.textAlign='center';
      ctx.fillText(e.shieldHits, cx, cy - r - 4);
      ctx.textAlign='left';
    }
    if(e.enraged){
      const pulse=Math.sin(tick*0.2)*0.4+0.6;
      ctx.fillStyle=`rgba(231,76,60,${0.25*pulse})`;
      ctx.beginPath(); ctx.arc(sx,sy,e.w+4,0,Math.PI*2); ctx.fill();
    }
    if(e.charging){
      ctx.fillStyle='rgba(10, 221, 204, 0.62)';
      ctx.fillRect(sx-e.w/2-4,sy-e.h/2-4,e.w+8,e.h+8);
    }
    // Specter cloaked
    if(e.cloaked){
      ctx.fillStyle='rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.arc(sx,sy,e.w+2,0,Math.PI*2); ctx.fill();
    }
  },

  // ── HP BAR ───────────────────────────────────────────────
  _hpBar(ctx,sx,sy,e) {
    if(e.hp>=e.maxHp) return;
    const bw=Math.max(e.w*2, 24);
    const barColors={normal:'#c0392b',elite:'#f1c40f',champion:'#9b59b6',chaos:'#ff1744'};
    const tier=this.stats[e.type]?.tier||'normal';
    const spriteH = (e.type==='skeleton')
      ? (SPRITES.skeletonBody?.naturalHeight || e.h) * 1.8
      : e.h;
    ctx.fillStyle='#111'; ctx.fillRect(sx-bw/2, sy-spriteH-4, bw, 3);
    ctx.fillStyle=barColors[tier]||'#c0392b';
    ctx.fillRect(sx-bw/2, sy-spriteH-4, bw*(e.hp/e.maxHp), 3);
  },
};
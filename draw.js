// ============================================================
//  DRAW.JS  —  RENDERING  v6
//  Enemy drawing delegated to ENEMIES.draw()
//  Nova pillar drawn as HTML HUD element (ui.js)
// ============================================================

// ── SPRITE LOADER ──────────────────────────────────────────
const SPRITES = {};
function loadSprites(cb){
  const files={
  player:'sprites/player.png',
  // goblin:'sprites/goblin.png',
  knight:'sprites/knight.png',
  // skeleton frames
  skeletonBody:'sprites/skeleton/skeleton-body.png',
  skeletonBone:'sprites/skeleton/skeleton-bone.png',
  skeletonLegL:'sprites/skeleton/skeleton-leg-left.png',
  skeletonLegR:'sprites/skeleton/skeleton-leg-rightt.png',
  // Mage frames
  mage1:'sprites/mage/mage1.png',
  mage2:'sprites/mage/mage2.png',
  mage3:'sprites/mage/mage3.png',
  mage4:'sprites/mage/mage4.png',
  mage5:'sprites/mage/mage5.png',
  mage6:'sprites/mage/mage6.png',
  mage7:'sprites/mage/mage7.png',
  mage8:'sprites/mage/mage8.png',
  mage9:'sprites/mage/mage9.png',
  mage10:'sprites/mage/mage10.png',
  mage11:'sprites/mage/mage11.png',
  mage12:'sprites/mage/mage12.png',
  // goblin frames
  goblin1:'sprites/goblin/goblin1.png',
  goblin2:'sprites/goblin/goblin2.png',
  goblin3:'sprites/goblin/goblin3.png',
  goblin4:'sprites/goblin/goblin4.png',
  goblin5:'sprites/goblin/goblin5.png',
  goblin6:'sprites/goblin/goblin6.png',
  goblin7:'sprites/goblin/goblin7.png',
  goblin8:'sprites/goblin/goblin8.png',
  goblin9:'sprites/goblin/goblin9.png',
  goblin10:'sprites/goblin/goblin10.png',
  goblin11:'sprites/goblin/goblin11.png',
  goblin12:'sprites/goblin/goblin12.png',
  goblinLegL:'sprites/goblin/goblin-legs-left.png',
  goblinLegR:'sprites/goblin/goblin-legs-right.png',
};
  let done=0,total=Object.keys(files).length;
  for(const [key,src] of Object.entries(files)){
    const img=new Image();
    img.onload =()=>{ if(++done===total) cb(); };
    img.onerror=()=>{ console.warn(`Sprite missing: ${src}`); if(++done===total) cb(); };
    img.src=src; SPRITES[key]=img;
  }
}

function drawSprite(ctx,img,sx,sy,facing,sw,sh,fl){
  if(!img||!img.complete||!img.naturalWidth) return false;
  ctx.save();
  if(fl){ ctx.filter='brightness(8) saturate(0)'; ctx.globalAlpha=0.9; }
  ctx.translate(sx,sy);
  if(facing<0) ctx.scale(-1,1);
  ctx.drawImage(img,-sw/2,-sh/2,sw,sh);
  ctx.restore();
  return true;
}

const DRAW = {

  _torches:null, _floorDetails:null,

  _buildWorld(worldW,worldH,T){
    if(this._torches) return;
    this._torches=[]; this._floorDetails=[];
    for(let tx=0;tx*T<worldW;tx++){
      for(let ty=0;ty*T<worldH;ty++){
        const wx=tx*T,wy=ty*T;
        const isWall=tx===0||ty===0||wx>=worldW-T||wy>=worldH-T;
        if(isWall&&(tx*3+ty*7)%5===0)
          this._torches.push({x:wx+T/2,y:wy+T/2,phase:Math.random()*Math.PI*2,radius:85+Math.random()*35});
        if(!isWall){
          const seed=(tx*13+ty*7)%100;
          if(seed<4) this._floorDetails.push({x:wx,y:wy,type:'crack',ox:(T*Math.random())|0,oy:(T*Math.random())|0});
          if(seed<2) this._floorDetails.push({x:wx,y:wy,type:'bones',ox:(T*Math.random())|0,oy:(T*Math.random())|0});
          if(seed<7) this._floorDetails.push({x:wx,y:wy,type:'dot',  ox:4+((tx*5)%20),oy:4+((ty*7)%20)});
        }
      }
    }
  },

  world(ctx,cam,G,tick){
    const T=CFG.TILE;
    this._buildWorld(G.worldW,G.worldH,T);
    const sx=Math.floor(cam.x/T)-1,sy=Math.floor(cam.y/T)-1;
    const ex=sx+Math.ceil(800/T)+2,ey=sy+Math.ceil(600/T)+2;

    for(let ty=sy;ty<ey;ty++){
      for(let tx=sx;tx<ex;tx++){
        const wx=tx*T,wy=ty*T,dx=wx-cam.x,dy=wy-cam.y;
        const wall=tx<0||ty<0||wx>=G.worldW-T||wy>=G.worldH-T;
        if(wall){
          ctx.fillStyle=CFG.COLORS.wall;ctx.fillRect(dx,dy,T,T);
          ctx.fillStyle='#122850';ctx.fillRect(dx,dy,T,5);
          ctx.fillStyle='#0a1f3a';
          ctx.fillRect(dx,dy+T*0.33,T,2);ctx.fillRect(dx,dy+T*0.66,T,2);
          const off=(ty%2===0)?0:T/2;
          ctx.fillRect(dx+off,dy,2,T);ctx.fillRect(dx+off+T/2,dy,2,T);
        } else {
          ctx.fillStyle=(tx+ty)%2===0?CFG.COLORS.floor1:CFG.COLORS.floor2;
          ctx.fillRect(dx,dy,T,T);
          ctx.fillStyle='#ffffff04';ctx.fillRect(dx,dy,T,1);ctx.fillRect(dx,dy,1,T);
        }
      }
    }

    this._floorDetails.forEach(d=>{
      const dx=d.x+d.ox-cam.x,dy=d.y+d.oy-cam.y;
      if(dx<-10||dx>810||dy<-10||dy>610) return;
      if(d.type==='crack'){ctx.fillStyle='#ffffff06';ctx.fillRect(dx,dy,6,1);ctx.fillRect(dx+2,dy+1,4,1);}
      else if(d.type==='bones'){ctx.fillStyle='#ecf0f118';ctx.fillRect(dx,dy,4,2);ctx.fillRect(dx+1,dy-1,2,4);}
      else{ctx.fillStyle='#ffffff05';ctx.fillRect(dx,dy,2,2);}
    });

    // Torch light pools
    this._torches.forEach(t=>{
      const tx=t.x-cam.x,ty=t.y-cam.y;
      if(tx<-t.radius||tx>800+t.radius||ty<-t.radius||ty>600+t.radius) return;
      const flk=Math.sin(tick*0.07+t.phase)*0.12+Math.sin(tick*0.13+t.phase*2)*0.06;
      const r=t.radius*(1+flk),alpha=0.12+flk*0.04;
      const g=ctx.createRadialGradient(tx,ty,0,tx,ty,r);
      g.addColorStop(0,`rgba(255,140,30,${alpha})`);
      g.addColorStop(0.4,`rgba(255,80,10,${alpha*0.5})`);
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(tx,ty,r,0,Math.PI*2);ctx.fill();
    });

    // Torch sprites
    this._torches.forEach(t=>{
      const tx=t.x-cam.x,ty=t.y-cam.y;
      if(tx<-20||tx>820||ty<-20||ty>620) return;
      const flk=Math.sin(tick*0.15+t.phase);
      ctx.fillStyle='#5d4037';ctx.fillRect(tx-3,ty-2,6,8);
      ctx.fillStyle='#e67e22';ctx.fillRect(tx-2,ty-8,4,6);
      ctx.fillStyle='#f1c40f';ctx.fillRect(tx-1,ty-10+(flk>0?1:0),2,4);
      if(Math.floor(tick+t.phase*10)%4===0){ctx.fillStyle='#fff';ctx.fillRect(tx+(flk>0?1:-1),ty-11,1,1);}
    });
  },

  splats(ctx,splats,cam){
    splats.forEach(s=>{
      const sx=s.x-cam.x,sy=s.y-cam.y;
      if(sx<-20||sx>820||sy<-20||sy>620) return;
      ctx.globalAlpha=Math.min(1,s.life/30)*0.55;
      ctx.fillStyle=s.color||'#c0392b';
      s.dots.forEach(d=>ctx.fillRect(sx+d.x,sy+d.y,d.s,d.s));
      ctx.globalAlpha=1;
    });
  },

  player(ctx,p,cam,tick){
    const sx=p.x-cam.x,sy=p.y-cam.y,hw=p.w/2;
    if(p.invulnTimer>0&&Math.floor(tick/3)%2===0) return;
    ctx.fillStyle='#00000055';ctx.fillRect(sx-hw-1,sy+6,p.w+2,3);
    if(p.shield>0){
      const pulse=Math.sin(tick*0.1)*0.3+0.7;
      ctx.fillStyle=`rgba(52,152,219,${0.12*pulse})`;
      ctx.beginPath();ctx.arc(sx,sy,20,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=`rgba(52,152,219,${0.5*pulse})`;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(sx,sy,20,0,Math.PI*2);ctx.stroke();
    }
    if(p.activePowerup){
      const pulse=Math.sin(tick*0.15)*0.4+0.6;
      const auras={rage:'255,106,0',ghost:'155,89,182',time:'0,212,255',magnet:'241,196,15',nuke:'231,76,60'};
      const rgb=auras[p.activePowerup]||'255,255,255';
      ctx.fillStyle=`rgba(${rgb},${0.15*pulse})`;
      ctx.beginPath();ctx.arc(sx,sy,24,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(sx,sy);ctx.rotate(tick*0.05);
      ctx.strokeStyle=`rgba(${rgb},${0.6*pulse})`;ctx.lineWidth=1;
      ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    const f=p.facing;
    if(!drawSprite(ctx,SPRITES.player,sx,sy,f,32,32,false)){
      const leg=Math.sin(p.walkFrame*0.4)*2;
      ctx.fillStyle='#2471a3';ctx.fillRect(sx-hw+1,sy+4,4,6+(leg>0?1:0));ctx.fillRect(sx+hw-5,sy+4,4,6+(leg<0?1:0));
      ctx.fillStyle='#1a3a5c';ctx.fillRect(sx-hw,sy+9,5,2);ctx.fillRect(sx+hw-5,sy+9,5,2);
      ctx.fillStyle=CFG.COLORS.player;ctx.fillRect(sx-hw,sy-3,p.w,9);
      ctx.fillStyle=CFG.COLORS.playerD;ctx.fillRect(sx-hw,sy-3,2,9);ctx.fillRect(sx-hw,sy+4,p.w,2);
      ctx.fillStyle='#c0392b';ctx.fillRect(sx-hw,sy+3,p.w,2);
      ctx.fillStyle='#fdebd0';ctx.fillRect(sx-hw+2,sy-10,p.w-4,7);
      ctx.fillStyle='#884400';ctx.fillRect(sx-hw+2,sy-10,p.w-4,2);ctx.fillRect(sx-hw+2,sy-10,2,5);
      ctx.fillStyle='#1a1a2e';ctx.fillRect(f>0?sx+2:sx-4,sy-8,2,2);
      ctx.fillStyle=CFG.COLORS.sword;
      if(f>0){ctx.fillRect(sx+hw,sy-2,8,2);ctx.fillStyle='#7f8c8d';ctx.fillRect(sx+hw+6,sy-3,2,4);ctx.fillStyle='#fff';ctx.fillRect(sx+hw+1,sy-2,2,1);}
      else   {ctx.fillRect(sx-hw-8,sy-2,8,2);ctx.fillStyle='#7f8c8d';ctx.fillRect(sx-hw-8,sy-3,2,4);ctx.fillStyle='#fff';ctx.fillRect(sx-hw-7,sy-2,2,1);}
    }
  },

  // ── ENEMY — delegates to enemies.js ──────────────────────
  enemy(ctx,e,cam,tick){ ENEMIES.draw(ctx,e,cam,tick); },

  _lootAlpha(item,tick){
    if(!item.maxLife) return 1;
    const prog=item.life/item.maxLife;
    const B=CFG.LOOT;
    if(prog<B.BLINK_FAST) return Math.floor(tick/3)%2===0?0.95:0.1;
    if(prog<B.BLINK_START) return 0.25+(prog/B.BLINK_START)*0.75;
    return 1;
  },

  gem(ctx,g,cam,tick){
    const sx=g.x-cam.x,sy=g.y-cam.y;
    if(sx<-16||sx>816||sy<-16||sy>616) return;
    const bob=Math.sin(tick*0.08+g.phase)*2;
    ctx.globalAlpha=this._lootAlpha(g,tick);
    ctx.fillStyle='#2ecc7120';ctx.fillRect(sx-7,sy-7+bob,14,14);
    ctx.fillStyle=CFG.COLORS.xpGem;ctx.fillRect(sx-4,sy-4+bob,8,8);
    ctx.fillStyle=CFG.COLORS.xpGemD;ctx.fillRect(sx-4,sy+1+bob,8,3);
    ctx.fillStyle='#afffcc';ctx.fillRect(sx-2,sy-3+bob,2,2);
    if(Math.floor(tick*0.2+g.phase*3)%6===0){ctx.fillStyle='#fff';ctx.fillRect(sx-1,sy-6+bob,2,2);ctx.fillRect(sx+4,sy-1+bob,2,2);}
    ctx.globalAlpha=1;
  },

  orb(ctx,o,cam,tick){
    const sx=o.x-cam.x,sy=o.y-cam.y;
    if(sx<-20||sx>820||sy<-20||sy>620) return;
    const bob=Math.sin(tick*0.1+o.phase)*2;
    const pulse=Math.sin(tick*0.12+o.phase)*0.3+0.7;
    ctx.globalAlpha=this._lootAlpha(o,tick);
    ctx.fillStyle=`rgba(231,76,60,${0.2*pulse})`;ctx.fillRect(sx-8,sy-8+bob,16,16);
    ctx.fillStyle=CFG.COLORS.healthOrb;ctx.fillRect(sx-5,sy-5+bob,10,10);
    ctx.fillStyle='#ff8888';ctx.fillRect(sx-3,sy-4+bob,3,3);
    ctx.fillStyle='#fff';ctx.fillRect(sx-1,sy-3+bob,2,6);ctx.fillRect(sx-3,sy-1+bob,6,2);
    ctx.globalAlpha=1;
  },

  powerupDrop(ctx,pw,cam,tick){
    const sx=pw.x-cam.x,sy=pw.y-cam.y;
    if(sx<-20||sx>820||sy<-20||sy>620) return;
    const bob=Math.sin(tick*0.1+pw.phase)*3;
    const pulse=Math.sin(tick*0.08+pw.phase)*0.3+0.7;
    const alpha=this._lootAlpha(pw,tick);
    const colors={rage:'255,106,0',ghost:'155,89,182',time:'0,212,255',magnet:'241,196,15',nuke:'231,76,60'};
    const icons={rage:'🔥',ghost:'👻',time:'⏱',magnet:'🧲',nuke:'💣'};
    const rgb=colors[pw.kind]||'255,255,255';
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=`rgba(${rgb},${0.6*pulse})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(sx,sy+bob,14,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=`rgba(${rgb},${0.15*pulse})`;ctx.beginPath();ctx.arc(sx,sy+bob,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(${rgb},0.8)`;ctx.beginPath();ctx.arc(sx,sy+bob,8,0,Math.PI*2);ctx.fill();
    ctx.font='10px serif';ctx.textAlign='center';ctx.fillText(icons[pw.kind],sx,sy+4+bob);ctx.textAlign='left';
    ctx.globalAlpha=1;
  },

  // ── RAGDOLL CORPSES ───────────────────────────────────────
  corpses(ctx, corpses, cam, tick) {
    corpses.forEach(c=>{
      const sx=c.x-cam.x, sy=c.y-cam.y;
      if(sx<-60||sx>860||sy<-60||sy>660) return;
      const alpha=(c.life/c.maxLife)*0.75;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.translate(sx,sy);
      ctx.rotate(c.rot);
      // Draw flattened/squished version of enemy
      ctx.scale(1, 0.4 + (c.life/c.maxLife)*0.3); // squish as it dies
      const tierCol={
        normal:'#c0392b', elite:'#e67e22',
        champion:'#8e44ad', boss:'#ff0055'
      }[c.tier]||'#c0392b';
      ctx.fillStyle=tierCol;
      ctx.fillRect(-c.w/2,-c.h/4,c.w,c.h/2);
      // Dark outline
      ctx.strokeStyle='#00000055';
      ctx.lineWidth=1;
      ctx.strokeRect(-c.w/2,-c.h/4,c.w,c.h/2);
      ctx.restore();
    });
  },

  // ── SCREEN FLASH ─────────────────────────────────────────
  screenFlash(ctx, flashVal) {
    if(flashVal<=0) return;
    const alpha=Math.min(0.6, flashVal/12)*0.5;
    ctx.fillStyle=`rgba(255,255,255,${alpha})`;
    ctx.fillRect(0,0,800,600);
  },

  // ── COMBO DISPLAY ─────────────────────────────────────────
  combo(ctx, combo, tick) {
    if(combo.count<2) return;
    const alpha=Math.min(1, combo.timer>100?(combo.maxTime-combo.timer)/50:1);
    const scale=combo.count>=10?1.4:combo.count>=5?1.2:1.0;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(400,60);
    ctx.scale(scale,scale);
    if(combo.count>=5){
      ctx.fillStyle=(combo.count>=10?'#f1c40f':'#e67e22')+'33';
      ctx.fillRect(-65,-22,130,30);
    }
    const col=combo.count>=10?'#f1c40f':combo.count>=5?'#e67e22':'#fff176';
    ctx.font=`${combo.count>=10?14:11}px 'Press Start 2P'`;
    ctx.textAlign='center';
    ctx.fillStyle='#000'; ctx.fillText(`x${combo.count} COMBO`,1,1);
    ctx.fillStyle=col;    ctx.fillText(`x${combo.count} COMBO`,0,0);
    ctx.textAlign='left';
    ctx.restore();
  },

  comboPulse(ctx, combo) {
    if(combo.flashTimer<=0||combo.count<5) return;
    const a=(combo.flashTimer/30)*0.35;
    const col=combo.count>=10?`rgba(241,196,15,${a})`:`rgba(230,126,34,${a})`;
    const bw=combo.count>=10?20:12;
    ctx.fillStyle=col;
    ctx.fillRect(0,0,800,bw); ctx.fillRect(0,600-bw,800,bw);
    ctx.fillRect(0,0,bw,600); ctx.fillRect(800-bw,0,bw,600);
  },

  modifierBadge(ctx, modifier, tick) {
    if(!modifier) return;
    const pulse=Math.sin(tick*0.08)*0.15+0.85;
    ctx.save();
    ctx.globalAlpha=pulse;
    ctx.font="6px 'Press Start 2P'";
    ctx.textAlign='center';
    const text=`${modifier.icon} ${modifier.name}`;
    const tw=ctx.measureText(text).width;
    ctx.fillStyle='#00000099'; ctx.fillRect(400-tw/2-6,10,tw+12,14);
    ctx.fillStyle=modifier.color||'#f1c40f'; ctx.fillText(text,400,21);
    ctx.textAlign='left';
    ctx.restore();
  },

  darknessOverlay(ctx, modifier, p, cam, tick) {
    if(!modifier?.darkness) return;
    const px=p.x-cam.x, py=p.y-cam.y;
    const flk=Math.sin(tick*0.07)*8;
    const dark=ctx.createRadialGradient(px,py,40+flk,px,py,220+flk);
    dark.addColorStop(0,'rgba(0,0,0,0)');
    dark.addColorStop(0.5,'rgba(0,0,0,0.5)');
    dark.addColorStop(1,'rgba(0,0,0,0.97)');
    ctx.fillStyle=dark; ctx.fillRect(0,0,800,600);
  },

  particle(ctx,p,cam){
    const sx=p.x-cam.x,sy=p.y-cam.y;
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color||CFG.COLORS.particle;
    ctx.fillRect(sx-p.size/2,sy-p.size/2,p.size,p.size);
    ctx.globalAlpha=1;
  },

  dmgNum(ctx,d,cam){
    const sx=d.x-cam.x,sy=d.y-cam.y;
    ctx.globalAlpha=d.life/d.maxLife;
    ctx.font=`${d.size||7}px 'Press Start 2P'`;
    ctx.fillStyle='#000';ctx.fillText(d.text,sx+1,sy+1);
    ctx.fillStyle=d.color||CFG.COLORS.dmg;ctx.fillText(d.text,sx,sy);
    ctx.globalAlpha=1;
  },

  vignette(ctx,p,cam,tick){
    const px=p.x-cam.x,py=p.y-cam.y;
    const vign=ctx.createRadialGradient(400,300,120,400,300,500);
    vign.addColorStop(0,'rgba(0,0,0,0)');
    vign.addColorStop(0.6,'rgba(0,0,0,0.08)');
    vign.addColorStop(1,'rgba(0,0,0,0.78)');
    ctx.fillStyle=vign;ctx.fillRect(0,0,800,600);
    const flk=Math.sin(tick*0.11)*0.04;
    const torch=ctx.createRadialGradient(px,py,0,px,py,190+flk*40);
    torch.addColorStop(0,'rgba(0,0,0,0)');
    torch.addColorStop(0.55,'rgba(0,0,0,0)');
    torch.addColorStop(1,'rgba(0,0,0,0.6)');
    ctx.fillStyle=torch;ctx.fillRect(0,0,800,600);
    const warm=ctx.createRadialGradient(px,py,0,px,py,110);
    warm.addColorStop(0,`rgba(255,120,20,${0.05+flk})`);
    warm.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=warm;ctx.fillRect(0,0,800,600);
  },

  lastStandOverlay(ctx,p,tick){
    if(!p.lastStandActive) return;
    const alpha=Math.sin(tick*0.15)*0.12+0.12;
    ctx.fillStyle=`rgba(255,0,0,${alpha})`;ctx.fillRect(0,0,800,600);
    const ba=Math.sin(tick*0.2)*0.3+0.5;
    ctx.strokeStyle=`rgba(255,60,0,${ba})`;ctx.lineWidth=6;ctx.strokeRect(3,3,794,594);ctx.lineWidth=1;
    const prog=p.lastStandTimer/(CFG.LAST_STAND_DURATION*60);
    ctx.fillStyle='#ff0000aa';ctx.fillRect(0,0,800*prog,4);
    ctx.fillStyle='#ff6a00';ctx.fillRect(0,0,800*prog,2);
  },

  applyShake(ctx,shake){
    if(shake.timer>0){ctx.translate((Math.random()-.5)*shake.intensity,(Math.random()-.5)*shake.intensity);}
  },

  // Draws the X landing target for Titan jump on the canvas
  titanJumpWarnings(ctx, enemies, cam, tick) {
    enemies.forEach(e => {
      if(e.type !== 'titan' || !e._jumpWarning || !e._jumpTargetX) return;
      const tx = e._jumpTargetX - cam.x;
      const ty = e._jumpTargetY - cam.y;
      const t  = e._jumpWarningTimer || 0;
      const maxT = (typeof CFG !== 'undefined' && CFG.CHAOS_ENEMIES?.titan?.jumpWarning) || 120;
      const progress = 1 - (t / maxT); // 0→1 as warning counts down
      const pulse = Math.sin(tick * 0.3) * 0.3 + 0.7;
      const alpha = Math.min(1, progress * 2) * pulse;
      const r = 60; // impact radius visual

      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = alpha;

      // X mark
      const xs = 18 + progress * 8;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 3;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(tx - xs, ty - xs); ctx.lineTo(tx + xs, ty + xs);
      ctx.moveTo(tx + xs, ty - xs); ctx.lineTo(tx - xs, ty + xs);
      ctx.stroke();
      // White inner
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx - xs, ty - xs); ctx.lineTo(tx + xs, ty + xs);
      ctx.moveTo(tx + xs, ty - xs); ctx.lineTo(tx - xs, ty + xs);
      ctx.stroke();

      // Countdown ring shrinking inward
      ctx.strokeStyle = `#ff4400`;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.8;
      ctx.beginPath();
      ctx.arc(tx, ty, r * (1 - progress * 0.4), 0, Math.PI*2);
      ctx.stroke();

      // "TITAN JUMP" label
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff4400';
      ctx.font = "bold 7px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('TITAN', tx, ty - r - 8);
      ctx.textAlign = 'left';
      ctx.restore();
    });
  },

  novaRings(ctx,rings,cam){
    rings.forEach(r=>{
      const sx=r.x-cam.x,sy=r.y-cam.y;
      ctx.globalAlpha=(r.life/r.maxLife)*0.9;
      ctx.strokeStyle=r.color;ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(sx,sy,r.radius,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=r.color+'88';ctx.lineWidth=8;
      ctx.beginPath();ctx.arc(sx,sy,r.radius,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;ctx.lineWidth=1;
    });
  },

  announcements(ctx,list){
    if(!list||list.length===0) return;

    // Split into top (wave/nova) and bottom-left (combat) zones
    const top    = list.filter(a=>a.zone==='top');
    const bottom = list.filter(a=>a.zone!=='top');

    // ── TOP CENTER — wave announcements, small, centered ──────
    top.forEach((a,i)=>{
      const fadeIn  = Math.min(1,(a.maxTimer-a.timer)/15);
      const fadeOut = Math.min(1,a.timer/30);
      ctx.globalAlpha = Math.min(fadeIn,fadeOut);
      const sz = a.size || 7;
      ctx.font = `${sz}px 'Press Start 2P'`;
      const tw = ctx.measureText(a.text).width;
      const x  = 400 - tw/2;
      const y  = 36 + i*16;
      // subtle dark pill behind text
      ctx.fillStyle='#00000066';
      ctx.fillRect(x-6, y-sz, tw+12, sz+5);
      ctx.fillStyle='#000'; ctx.fillText(a.text, x+1, y+1);
      ctx.fillStyle=a.color||'#f1c40f'; ctx.fillText(a.text, x, y);
      ctx.globalAlpha=1;
    });

    // ── BOTTOM LEFT — combat/ability messages ─────────────────
    const baseX=14, baseY=560, lineH=16;
    bottom.forEach((a,i)=>{
      const slot=bottom.length-1-i;
      const y=baseY-slot*lineH;
      const fadeIn  = Math.min(1,(a.maxTimer-a.timer)/20);
      const fadeOut = Math.min(1,a.timer/40);
      ctx.globalAlpha=Math.min(fadeIn,fadeOut);
      ctx.font=`${a.size||7}px 'Press Start 2P'`;
      ctx.fillStyle='#000'; ctx.fillText(a.text,baseX+1,y+1);
      ctx.fillStyle=a.color||'#f1c40f'; ctx.fillText(a.text,baseX,y);
      ctx.globalAlpha=1;
    });
  },

  // ── KNIGHT CHARGE WARNING ─────────────────────────────────
  chargeWarnings(ctx, enemies, cam, tick) {
    enemies.forEach(e=>{
      if(!e.chargeWarning||!e.chargeTargetX) return;
      const ex=e.x-cam.x, ey=e.y-cam.y;
      const tx=e.chargeTargetX-cam.x, ty=e.chargeTargetY-cam.y;
      const pulse=Math.sin(tick*0.25)*0.5+0.5;
      const alpha=0.4+pulse*0.5;
      ctx.save();
      // Dashed line from enemy → target
      ctx.setLineDash([6,4]);
      ctx.strokeStyle=`rgba(231,76,60,${alpha*0.7})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.setLineDash([]);
      // X marker at target
      const sz=10+pulse*4;
      ctx.strokeStyle=`rgba(231,76,60,${alpha})`;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(tx-sz,ty-sz); ctx.lineTo(tx+sz,ty+sz);
      ctx.moveTo(tx+sz,ty-sz); ctx.lineTo(tx-sz,ty+sz);
      ctx.stroke();
      // Pulsing ring at target
      ctx.strokeStyle=`rgba(255,100,0,${alpha*0.6})`;
      ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(tx,ty,sz*1.4,0,Math.PI*2); ctx.stroke();
      // ! above enemy
      ctx.fillStyle=`rgba(231,76,60,${alpha})`;
      ctx.font="bold 10px 'Press Start 2P'";
      ctx.textAlign='center';
      ctx.fillText('!',ex,ey-e.h/2-10);
      ctx.textAlign='left';
      ctx.restore();
    });
  },

  // ── RAY AIM VISUAL ────────────────────────────────────────
  aimRay(ctx, p, cam, tick) {
    if(!p.aimActive) return;
    const px=p.x-cam.x, py=p.y-cam.y;
    const ax=p.aimX-cam.x, ay=p.aimY-cam.y;
    const angle=Math.atan2(ay-py, ax-px);
    const pulse=Math.sin(tick*0.2)*0.3+0.7;

    ctx.save();

    // ── Ray line ──────────────────────────────────────────
    ctx.setLineDash([6,5]);
    ctx.strokeStyle=`rgba(255,255,255,${0.25*pulse})`;
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(px,py);
    // Extend ray to edge of screen in aim direction
    const extLen=1200;
    ctx.lineTo(px+Math.cos(angle)*extLen, py+Math.sin(angle)*extLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Crosshair at mouse position ───────────────────────
    const col=p.aimTarget?'#2ecc71':'#e74c3c';
    const sz=10, gap=4;
    ctx.strokeStyle=col;
    ctx.lineWidth=2;
    ctx.globalAlpha=0.85*pulse;
    // Horizontal bars
    ctx.beginPath();
    ctx.moveTo(ax-sz-gap,ay); ctx.lineTo(ax-gap,ay);
    ctx.moveTo(ax+gap,ay);    ctx.lineTo(ax+sz+gap,ay);
    // Vertical bars
    ctx.moveTo(ax,ay-sz-gap); ctx.lineTo(ax,ay-gap);
    ctx.moveTo(ax,ay+gap);    ctx.lineTo(ax,ay+sz+gap);
    ctx.stroke();
    // Center dot
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(ax,ay,2,0,Math.PI*2); ctx.fill();
    // Outer ring
    ctx.strokeStyle=col+'88';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ax,ay,sz+gap+2,0,Math.PI*2); ctx.stroke();

    // ── Target ring on snapped enemy ──────────────────────
    if(p.aimTarget){
    const tx=p.aimTarget.x-cam.x;
    const ty=p.aimTarget.y-cam.y - (p.aimTarget.type==='mage' ? 16 : 0);
      const tr=p.aimTarget.w+6+Math.sin(tick*0.2)*3;
      ctx.strokeStyle=`rgba(46,204,113,${0.9*pulse})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(tx,ty,tr,0,Math.PI*2); ctx.stroke();
      // Corner brackets
      ctx.lineWidth=2;
      const b=tr+4, blen=6;
      ctx.beginPath();
      // TL
      ctx.moveTo(tx-b,ty-b+blen); ctx.lineTo(tx-b,ty-b); ctx.lineTo(tx-b+blen,ty-b);
      // TR
      ctx.moveTo(tx+b-blen,ty-b); ctx.lineTo(tx+b,ty-b); ctx.lineTo(tx+b,ty-b+blen);
      // BL
      ctx.moveTo(tx-b,ty+b-blen); ctx.lineTo(tx-b,ty+b); ctx.lineTo(tx-b+blen,ty+b);
      // BR
      ctx.moveTo(tx+b-blen,ty+b); ctx.lineTo(tx+b,ty+b); ctx.lineTo(tx+b,ty+b-blen);
      ctx.stroke();
    }

    ctx.globalAlpha=1;
    ctx.lineWidth=1;
    ctx.restore();
  },

  rangeRing(ctx,p,cam){
    const sx=p.x-cam.x,sy=p.y-cam.y;
    ctx.strokeStyle='#ffffff07';ctx.lineWidth=1;
    ctx.setLineDash([4,8]);ctx.beginPath();ctx.arc(sx,sy,p.atkRange,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  },

  minimap(mctx,G){
    mctx.fillStyle='#050510ee';mctx.fillRect(0,0,80,60);
    mctx.strokeStyle='#00d4ff44';mctx.lineWidth=1;mctx.strokeRect(0,0,80,60);
    const mx=(G.player.x/G.worldW)*80,my=(G.player.y/G.worldH)*60;
    const mg=mctx.createRadialGradient(mx,my,0,mx,my,14);
    mg.addColorStop(0,'rgba(0,212,255,0.35)');mg.addColorStop(1,'rgba(0,0,0,0)');
    mctx.fillStyle=mg;mctx.fillRect(0,0,80,60);
    // Draw beacon on minimap
    if(G.beaconActive){
      const bx=(G.beaconX/G.worldW)*80,by=(G.beaconY/G.worldH)*60;
      mctx.fillStyle='#ffffffcc';
      mctx.fillRect(bx-2,by-2,4,4);
    }
    G.enemies.forEach(e=>{
      const ex=(e.x/G.worldW)*80,ey=(e.y/G.worldH)*60;
      const S=ENEMIES.stats[e.type];
      const dot=S?.tier==='champion'?3:S?.tier==='elite'?2:1;
      mctx.fillStyle=S?.tier==='boss'||e.type==='boss'?'#ff0055':S?.tier==='champion'?'#9b59b6':S?.tier==='elite'?'#f1c40f':'#e74c3c';
      mctx.fillRect(ex-dot/2,ey-dot/2,dot,dot);
    });
    mctx.fillStyle='#00d4ff';mctx.fillRect(mx-2,my-2,4,4);
    mctx.fillStyle='#fff';mctx.fillRect(mx-1,my-1,2,2);
  },

  // ── BEACON (Chapter I → II portal) ─────────────────────
  beacon(ctx, G, cam, tick) {
    if(!G.beaconActive) return;
    const sx = G.beaconX - cam.x;
    const sy = G.beaconY - cam.y;
    const phase = G.beaconPhase || 0;
    const pulse = Math.sin(phase * 3) * 0.18 + 0.82;

    // Ground glow
    const groundGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70*pulse);
    groundGlow.addColorStop(0, 'rgba(180,160,255,0.22)');
    groundGlow.addColorStop(0.5, 'rgba(100,80,255,0.10)');
    groundGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = groundGlow;
    ctx.fillRect(sx-80, sy-80, 160, 160);

    // Outer ring — pulsing
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(phase*4)*0.3;
    ctx.strokeStyle = '#b0aaff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.arc(sx, sy, 26*pulse, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Inner spinning runes (4 rotating diamonds)
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(phase * 0.8);
    ctx.globalAlpha = 0.7;
    for(let i=0;i<4;i++){
      const a = (i/4)*Math.PI*2;
      const rx = Math.cos(a)*18, ry = Math.sin(a)*18;
      ctx.fillStyle = i%2===0 ? '#c8c0ff' : '#ffffff';
      ctx.fillRect(rx-3, ry-3, 6, 6);
    }
    ctx.restore();

    // Core pillar of light — tall vertical beam
    const beamH = 500;
    const beam = ctx.createLinearGradient(sx, sy-beamH, sx, sy);
    beam.addColorStop(0, 'rgba(220,210,255,0)');
    beam.addColorStop(0.5, `rgba(200,190,255,${0.12*pulse})`);
    beam.addColorStop(1, `rgba(255,255,255,${0.55*pulse})`);
    ctx.fillStyle = beam;
    const bw = 12 * pulse;
    ctx.fillRect(sx - bw/2, sy - beamH, bw, beamH);

    // Bright core base
    ctx.save();
    ctx.globalAlpha = 0.9 * pulse;
    const coreGrad = ctx.createRadialGradient(sx,sy,0,sx,sy,14);
    coreGrad.addColorStop(0,'rgba(255,255,255,1)');
    coreGrad.addColorStop(0.4,'rgba(200,180,255,0.8)');
    coreGrad.addColorStop(1,'rgba(120,90,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // "ENTER" text label
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(phase*5)*0.3;
    ctx.fillStyle = '#ffffff';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER', sx, sy + 32);
    ctx.restore();
  },

  // ── CHAPTER FADE OVERLAY ───────────────────────────────
  chapterFade(ctx, G) {
    if(!G.chapterFade || G.chapterFade <= 0) return;
    ctx.fillStyle = `rgba(255,255,255,${G.chapterFade})`;
    ctx.fillRect(0, 0, 800, 600);
  },

  // ── ENEMY FADE ALPHA WRAPPER ───────────────────────────
  // Called inside enemy draw — applies fade alpha if set
  enemyWithFade(ctx, e, cam, tick) {
    const alpha = e._fadeAlpha !== undefined ? e._fadeAlpha : 1;
    if(alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ENEMIES.draw(ctx, e, cam, tick);
    ctx.restore();
  },

  // ── WEAPON BULLET VISUALS ──────────────────────────────
  bullet(ctx,b,cam,tick){
    const sx=b.x-cam.x, sy=b.y-cam.y;
    if(sx<-10||sx>810||sy<-10||sy>610) return;
    if(b.type==='bone'){
      b.spin=(b.spin||0)+0.18;
      const bimg=SPRITES.skeletonBone;
      if(bimg&&bimg.complete&&bimg.naturalWidth){
        ctx.save();
        ctx.translate(sx,sy);
        ctx.rotate(b.spin);
        ctx.drawImage(bimg,-5,-5,10,10);
        ctx.restore();
      } else {
        ctx.fillStyle='#ecf0f1';ctx.fillRect(sx-3,sy-2,6,4);
        ctx.fillStyle='#bdc3c7';ctx.fillRect(sx-3,sy-2,6,1);
      }
      return;
    }

    // ── CROSSBOW BOLT ────────────────────────────────────
    if(b.type==='crossbow'){
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      // Trail
      for(let i=1;i<=5;i++){
        ctx.globalAlpha=(0.5/i)*0.7;
        ctx.fillStyle='#f1c40f';
        ctx.fillRect(-i*2.5-3,-1,5,2);
      }
      ctx.globalAlpha=1;
      // Shaft
      ctx.fillStyle='#8B4513'; ctx.fillRect(-8,-1,16,2);
      // Head
      ctx.fillStyle='#f1c40f'; ctx.fillRect(6,-2,5,4);
      ctx.fillStyle='#fff';    ctx.fillRect(9,-1,2,2);
      // Fletching
      ctx.fillStyle='#e74c3c'; ctx.fillRect(-10,-3,4,2); ctx.fillRect(-10,1,4,2);
      ctx.restore();
      return;
    }

    // ── GRIMOIRE ORB ─────────────────────────────────────
    if(b.type==='orb'){
      const orbPhase = (tick * 0.15 + (b._phase||0));
      const ps = Math.sin(orbPhase)*0.25+0.85;
      ctx.save();
      // Outer aura
      ctx.globalAlpha=0.3;
      ctx.fillStyle='#9b59b6';
      ctx.beginPath(); ctx.arc(sx,sy,10*ps,0,Math.PI*2); ctx.fill();
      // Core
      ctx.globalAlpha=0.9;
      const og=ctx.createRadialGradient(sx,sy,0,sx,sy,7*ps);
      og.addColorStop(0,'#ffffff');
      og.addColorStop(0.4,'#d7aeff');
      og.addColorStop(1,'rgba(123,47,255,0)');
      ctx.fillStyle=og;
      ctx.beginPath(); ctx.arc(sx,sy,7*ps,0,Math.PI*2); ctx.fill();
      // Rune sparks
      ctx.globalAlpha=0.6;
      ctx.fillStyle='#ffffff';
      for(let i=0;i<3;i++){
        const sa=(orbPhase+i*2.1)*2;
        ctx.fillRect(sx+Math.cos(sa)*8-1,sy+Math.sin(sa)*8-1,2,2);
      }
      ctx.restore();
      return;
    }

    // ── BLADE DANCER ─────────────────────────────────────
    if(b.type==='blade'){
      b._spin = (b._spin||0) + 0.35;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(b._spin);
      // Trail glow
      ctx.globalAlpha=0.25;
      ctx.fillStyle='#e74c3c';
      ctx.fillRect(-9,-9,18,18);
      ctx.globalAlpha=1;
      // Blade shape — cross
      ctx.fillStyle='#c0c0c0';
      ctx.fillRect(-7,-2,14,4);
      ctx.fillRect(-2,-7,4,14);
      // Edge highlights
      ctx.fillStyle='#ffffff';
      ctx.fillRect(-7,-1,14,1);
      ctx.fillRect(-1,-7,1,14);
      // Blood glint
      ctx.fillStyle='#e74c3c';
      ctx.fillRect(-1,-1,2,2);
      ctx.restore();
      return;
    }

    // ── PLASMA BALL (enemy, homing) ──────────────────────
    if(b.type==='plasma' && b.isEnemyBullet){
      const phase = b._plasmaPhase||0;
      const pulse = Math.sin(phase*1.5)*0.3+0.7;
      const r = 12;
      ctx.save();
      // Outer glow
      const grd = ctx.createRadialGradient(sx,sy,0,sx,sy,r*2.5);
      grd.addColorStop(0,`rgba(220,80,255,${0.5*pulse})`);
      grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;
      ctx.beginPath(); ctx.arc(sx,sy,r*2.5,0,Math.PI*2); ctx.fill();
      // Core
      const core = ctx.createRadialGradient(sx,sy,0,sx,sy,r);
      core.addColorStop(0,'#ffffff');
      core.addColorStop(0.4,'#dd44ff');
      core.addColorStop(1,'rgba(100,0,200,0)');
      ctx.fillStyle=core;
      ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2); ctx.fill();
      // Orbiting sparks
      for(let i=0;i<6;i++){
        const a=phase*2+i*(Math.PI/3);
        const ox=Math.cos(a)*(r+4), oy=Math.sin(a)*(r+4);
        ctx.fillStyle=`rgba(255,160,255,${pulse})`;
        ctx.fillRect(sx+ox-1.5,sy+oy-1.5,3,3);
      }
      // HP indicator: small pips showing remaining hits
      if(b._plasmaHp!==undefined){
        for(let i=0;i<b._plasmaHp;i++){
          const a=(i/(b._plasmaHp||1))*Math.PI*2;
          ctx.fillStyle='#ff88ff';
          ctx.fillRect(sx+Math.cos(a)*(r+8)-1,sy+Math.sin(a)*(r+8)-1,2,2);
        }
      }
      ctx.restore();
      return;
    }

    // ── DEFAULT / FIRE / CHAIN ───────────────────────────
    const colors={fire:'#ff6a00',chain:'#00d4ff',normal:CFG.COLORS.bullet};
    const color=colors[b.type]||colors.normal;
    for(let i=1;i<=4;i++){
      ctx.globalAlpha=(0.5/i)*0.6;ctx.fillStyle=color;
      ctx.fillRect(sx-b.vx*i*0.7-2,sy-b.vy*i*0.7-2,4,4);
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=color;ctx.fillRect(sx-3,sy-3,6,6);
    ctx.fillStyle='#fff';ctx.fillRect(sx-1,sy-1,2,2);
    if(b.type==='fire'){ctx.fillStyle='#ff6a0055';ctx.fillRect(sx-5,sy-5,10,10);}
  },
};
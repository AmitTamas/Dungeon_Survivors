const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const miniCanvas=document.getElementById('miniMap');
const mctx=miniCanvas.getContext('2d');

DB.init().then(()=>{
  loadSprites(()=>{
    UI.init();
    GAME.init();
  });
  PROFILE.init();
});
// render profile card, show name popup if first launch
// Preload all sounds on first user interaction (browser requires this)
document.addEventListener('click', ()=>SFX.preload(), { once:true });
document.addEventListener('keydown', ()=>SFX.preload(), { once:true });

// Global UI click sound — fires on every button press
document.addEventListener('click', e=>{
  if(e.target.matches('button, .gtab, .shop-card.shop-buyable')){
    SFX.play('uiClick');
  }
});

// ── RESPONSIVE 16:9 CANVAS RESIZER ──────────────────────────────────────────
// The canvas pixel buffer stays at 800×600 so all game logic is untouched.
// We only change the CSS size of #wrap so the canvas stretches to fill it.
const ASPECT = 16 / 9;           // desired ratio
const MIN_W  = 600;              // px
const MAX_W  = 1800;             // px

function resizeCanvas(){
  // const vw = window.innerWidth  * 0.97;   // 97% of viewport width
  // const vh = window.innerHeight * 0.97;   // 97% of viewport height

  // To this (use full viewport)
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Fit inside viewport keeping 16:9
  let w = Math.min(vw, vh * ASPECT);
  let h = w / ASPECT;

  // Clamp width
  // w = Math.max(MIN_W, Math.min(MAX_W, w));
  // below is the changes one
  w = Math.min(MAX_W, w);
  h = w / ASPECT;

  // If height still overflows after clamping, constrain by height instead
  if(h > vh){ h = vh; w = h * ASPECT; }

  const wrap = document.getElementById('wrap');
  wrap.style.width  = w + 'px';
  wrap.style.height = h + 'px';
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  if(GAME.state) GAME.state.camera.zoom = Math.min(window.innerWidth/800, window.innerHeight/600) * 1.2;
});
// ─────────────────────────────────────────────────────────────────────────────

let lastTime=null;
function loop(ts){
  if(lastTime===null){ lastTime=ts; requestAnimationFrame(loop); return; }
  const dt=Math.min((ts-lastTime)/1000,0.05);
  lastTime=ts;
  const G=GAME.state;
  if(!G){ requestAnimationFrame(loop); return; }

  // Only update game logic when actually running
  if(G.running) GAME.update(dt,UI.keys);  

  ctx.clearRect(0,0,800,600);
  if(G.running){
    const cam=G.camera,p=G.player;
    ctx.save();
    DRAW.applyShake(ctx,G.shake);
    DRAW.world(ctx,cam,G,G.tick);
    DRAW.splats(ctx,G.splats,cam);
    DRAW.rangeRing(ctx,p,cam);
    if(G.corpses) DRAW.corpses(ctx,G.corpses,cam,G.tick);
    G.gems.forEach(g=>DRAW.gem(ctx,g,cam,G.tick));
    G.orbs.forEach(o=>DRAW.orb(ctx,o,cam,G.tick));
    G.powerups.forEach(pw=>DRAW.powerupDrop(ctx,pw,cam,G.tick));
    G.enemies.forEach(e=>DRAW.enemyWithFade(ctx,e,cam,G.tick));
    DRAW.chargeWarnings(ctx,G.enemies,cam,G.tick);
    DRAW.aimRay(ctx,p,cam,G.tick);
    DRAW.player(ctx,p,cam,G.tick);
    G.bullets.forEach(b=>DRAW.bullet(ctx,b,cam,G.tick));
    if(G.novaRings) DRAW.novaRings(ctx,G.novaRings,cam);
    DRAW.titanJumpWarnings(ctx,G.enemies,cam,G.tick);
    G.particles.forEach(pt=>DRAW.particle(ctx,pt,cam));
    G.dmgNums.forEach(d=>DRAW.dmgNum(ctx,d,cam));
    DRAW.vignette(ctx,p,cam,G.tick);
    if(G.modifier?.darkness) DRAW.darknessOverlay(ctx,G.modifier,p,cam,G.tick);
    DRAW.screenFlash(ctx,G.screenFlash||0);
    DRAW.lastStandOverlay(ctx,p,G.tick);
    if(G.beaconActive) DRAW.beacon(ctx,G,cam,G.tick);
    DRAW.chapterFade(ctx,G);
    DRAW.comboPulse(ctx,G.combo);
    DRAW.announcements(ctx,G.announcements);
    DRAW.combo(ctx,G.combo,G.tick);
    DRAW.modifierBadge(ctx,G.modifier,G.tick);
    ctx.restore();
    DRAW.minimap(mctx,G);
    UI.updateHUD(G);
    // Show system cursor only when aim is active so player can see where they're pointing
    document.getElementById('c').style.cursor = p.aimActive ? 'crosshair' : 'none';
    if(G.paused){
      document.getElementById('psScore').textContent=G.score;
      document.getElementById('psWave').textContent=G.wave;
      document.getElementById('psKills').textContent=G.kills;
      document.getElementById('psLevel').textContent=p.level;
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
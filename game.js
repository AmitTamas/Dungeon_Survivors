// ============================================================
//  GAME.JS  —  CORE LOGIC  v6
//  Clean enemy tier spawning · Tier-aware Nova
//  Vertical Nova pillar via HTML HUD
// ============================================================

const GAME = {

  state: null,
  _skillTutorialShown: false,

  init() {
    const p = CFG.PLAYER;
    this.state = {
      running:false, paused:false, tick:0,
      score:0, wave:1, kills:0,
      waveTimer:0, spawnTimer:0,
      spawnRate: CFG.WAVE.SPAWN_RATE,
      worldW: CFG.WORLD_W, worldH: CFG.WORLD_H,

      player: {
        x:800, y:600,
        hp:p.HP, maxHp:p.HP,
        xp:0, xpNeeded:10, level:1,
        speed:p.SPEED, dmg:p.DMG,
        atkSpeed:p.ATK_SPEED, atkRange:p.ATK_RANGE,
        multi:p.MULTI, magnet:p.MAGNET,
        piercing:false, deathMark:false, luckMod:1,
        shield:0, invulnTimer:0,
        w:14, h:16, facing:1,
        walkFrame:0, walkTimer:0,
        atkTimer:0, hitCount:0,
        activePowerup:null,  powerupTimer:0,
        activePowerup2:null, powerupTimer2:0,
        lastStandUsed:false, lastStandActive:false, lastStandTimer:0,
        lastStandCharges: 1,  // explicitly set — meta upgrades add more via applyToPlayer
        skillKills:0, skillCharge:0, skillCooldown:0,
        novaKillsNeeded: 5,
        novaStored: 0,       // stacked charges — max 3, each full bar adds 1

        // ── Aim ───────────────────────────────────────────
        aimActive:  false,   // true when left mouse held
        aimX:       0,       // mouse world X
        aimY:       0,       // mouse world Y
        aimTarget:  null,    // nearest enemy snapped to ray

        // ── Weapon (Chapter II) ───────────────────────────
        weapon: null,        // weapon id string, null = default
        weaponKills: 0,      // kills made with this weapon
        masteryLevel: 0,     // 0,1,2,3
        bladeCount: 2,       // for blade dancer
        _bladeAngle: 0,      // orbit angle tracker
      },

      enemies:[], bullets:[], gems:[], orbs:[],
      powerups:[], particles:[], dmgNums:[], splats:[],
      novaRings:[],
      _bossSpawnedThisWave: false,
      camera:{x:0,y:0}, shake:{timer:0,intensity:0},
      announcements:[],

      // ── Chapter system ────────────────────────────────────
      chapter: 1,              // current chapter (1 or 2+)
      beaconActive: false,     // beacon is on the field
      beaconX: 0, beaconY: 0, // world position of beacon
      beaconPhase: 0,          // animation phase
      enemyFadeOut: false,     // true = all enemies are fading/removing
      chapterFade: 0,          // 0→1 = white fade; drives cinematic
      chapterFadeDir: 0,       // 1=fading out, -1=fading in, 0=idle
      _chapterTransitioning: false, // lock during cinematic

      // ── Combo system ──────────────────────────────────────
      combo: {
        count:0, timer:0, maxTime:150, display:0, flashTimer:0,
      },

      // ── Wave modifier ─────────────────────────────────────
      modifier: null,
      scoreMultiplier: 1,
      corpses: [],        // ragdoll death animations
      screenFlash: 0,     // frames of white flash
    };
    // Set zoom once on init
    this.state.camera = { x: 0, y: 0, zoom: Math.min(window.innerWidth / 800, window.innerHeight / 600) * 1.2 };

    // Apply permanent meta upgrades to fresh player
    META.applyToPlayer(this.state.player);
    // Note: music is started by UI.startGame(), not here
  },

  announce(text, color='#f1c40f', duration=180, size=8, zone='bottom') {
    const G=this.state;
    G.announcements.push({text,color,size,zone,timer:duration,maxTimer:duration});
    if(G.announcements.length>6) G.announcements.shift();
  },

  update(dt, keys) {
    const G=this.state;
    if(!G.running||G.paused) return;
    G.tick++;
    const p=G.player;
    // God mode: keep player immortal each tick
    if(p._godMode){ p.hp=p.maxHp; p.invulnTimer=999; }

    // — Movement —
    let dx=0, dy=0;

    // Keyboard
    if(keys['ArrowLeft'] ||keys['a']||keys['A']) dx-=1;
    if(keys['ArrowRight']||keys['d']||keys['D']) dx+=1;
    if(keys['ArrowUp']   ||keys['w']||keys['W']) dy-=1;
    if(keys['ArrowDown'] ||keys['s']||keys['S']) dy+=1;
   
    // Joystick — snap to 8 directions
    if(!dx && !dy && (keys._jx || keys._jy)){
      const angle = Math.atan2(keys._jy, keys._jx);
      const snap  = Math.round(angle / (Math.PI/4)) * (Math.PI/4);
      dx = Math.round(Math.cos(snap));
      dy = Math.round(Math.sin(snap));
    }
    const hasTime = p.activePowerup==='time' || p.activePowerup2==='time';
    const spdMult=(p.lastStandActive?2:1)*(hasTime?2:1);
    p.x=Math.max(20,Math.min(G.worldW-20,p.x+dx*p.speed*spdMult));
    p.y=Math.max(20,Math.min(G.worldH-20,p.y+dy*p.speed*spdMult));
    if(dx!==0) p.facing=dx>0?1:-1;
    if(dx||dy){p.walkTimer++;if(p.walkTimer>4){p.walkFrame++;p.walkTimer=0;}}

    // — Camera —
    G.camera.x += (p.x - 400 - G.camera.x) * 0.1;
    G.camera.y += (p.y - 300 - G.camera.y) * 0.1;
    G.camera.x = Math.max(0, Math.min(G.worldW - 800, G.camera.x));
    G.camera.y = Math.max(0, Math.min(G.worldH - 600, G.camera.y));

    // — Timers —
    if(p.invulnTimer>0) p.invulnTimer--;
    if(p.powerupTimer>0){p.powerupTimer--;if(p.powerupTimer<=0)p.activePowerup=null;}
    if(p.powerupTimer2>0){p.powerupTimer2--;if(p.powerupTimer2<=0)p.activePowerup2=null;}
    if(p.skillCooldown>0) p.skillCooldown--;
    if(G.shake.timer>0) G.shake.timer--;

    // — Last Stand timer —
    if(p.lastStandActive){
      p.lastStandTimer--;
      if(p.lastStandTimer<=0){
        p.lastStandActive=false;
        this.announce('CARNAGE MODE ENDED','#ff323266',200,7);
      }
    }
    // Last Stand — trigger once per charge, never re-trigger while active
    if(!p.lastStandActive && p.lastStandCharges>0 && p.hp>0 && p.hp/p.maxHp<=0.20){
      p.lastStandCharges--;
      p.lastStandActive=true;
      p.lastStandTimer=CFG.LAST_STAND_DURATION*60;
      G.shake.timer=20; G.shake.intensity=8;
      this.spawnParticles(p.x,p.y,30,'#ff0000');
      SFX.play('lastStandActivate');
      this.announce('🔥 CARNAGE MODE ACTIVATED!','#ff6a00',220,9);
      this.announce('Speed x2 · Damage x3 · 8s','#ff4400',220,6);
    }

    // — Nova space key — fire one stored charge
    if(keys[' ']&&!keys._spacePrev&&p.novaStored>0&&p.skillCooldown===0){
      this._fireNova(keys);
    }
    keys._spacePrev=keys[' '];

    // — Footdust —
    if((p.walkFrame%6===0)&&(Math.abs(dx)>0.1||Math.abs(dy)>0.1)){
      this.spawnParticles(p.x+(Math.random()-.5)*6,p.y+8,1,'#ffffff15');
      const last=G.particles[G.particles.length-1];
      last.size=3;last.maxLife=12;last.life=12;
    }

    // ── BEACON TICK ────────────────────────────────────────
    if(G.beaconActive && !G._chapterTransitioning) {
      G.beaconPhase = (G.beaconPhase||0) + CFG.CHAPTER2.BEACON.PULSE_SPEED;
      // Spawn ambient particles around beacon
      if(G.tick % 6 === 0) {
        const ang = Math.random()*Math.PI*2;
        const r   = 8 + Math.random()*16;
        this.spawnParticles(
          G.beaconX + Math.cos(ang)*r,
          G.beaconY + Math.sin(ang)*r, 1, '#ffffff'
        );
        const lp = G.particles[G.particles.length-1];
        if(lp){ lp.vx*=0.3; lp.vy = -1.5 - Math.random(); lp.size=2; lp.maxLife=30; lp.life=30; }
      }
      // Check player entry
      const bdx = p.x - G.beaconX, bdy = p.y - G.beaconY;
      const bdist = Math.sqrt(bdx*bdx + bdy*bdy);
      if(bdist < CFG.CHAPTER2.BEACON.RADIUS) {
        this._beginChapterTransition();
      }
    }

    // ── CHAPTER FADE TICK ──────────────────────────────────
    if(G.chapterFadeDir !== 0) {
      G.chapterFade += G.chapterFadeDir * dt * 0.9; // ~1.1s for full fade
      if(G.chapterFadeDir > 0 && G.chapterFade >= 1) {
        G.chapterFade = 1;
        G.chapterFadeDir = 0;
        // White is full — show chapter screen
        this._onFadeComplete();
      } else if(G.chapterFadeDir < 0 && G.chapterFade <= 0) {
        G.chapterFade = 0;
        G.chapterFadeDir = 0;
        G._chapterTransitioning = false;
      }
    }

    // — Decay —
    G.splats   =G.splats.filter(s=>{s.life--;return s.life>0;});
    G.gems     =G.gems.filter(g=>{g.life--;return g.life>0;});
    G.orbs     =G.orbs.filter(o=>{o.life--;return o.life>0;});
    G.powerups =G.powerups.filter(pw=>{pw.life--;return pw.life>0;});
    G.novaRings=G.novaRings.filter(r=>{r.life--;r.radius+=r.speed;return r.life>0;});
    G.announcements=G.announcements.filter(a=>{a.timer--;return a.timer>0;});
    if(G.screenFlash>0) G.screenFlash--;
    // Ragdoll corpses
    G.corpses=G.corpses.filter(c=>{
      c.x+=c.vx; c.y+=c.vy; c.vx*=0.88; c.vy*=0.88;
      c.rot+=c.rotSpd; c.rotSpd*=0.92;
      c.life--; return c.life>0;
    });

    // — Combo tick —
    const C=G.combo;
    if(C.count>0){
      C.timer++;
      if(C.timer>C.maxTime){
        C.count=0; C.timer=0; C.display=0;
      }
    }
    if(C.flashTimer>0) C.flashTimer--;
    // Smooth display: snap up instantly on new kill, decay down slowly when combo expires
    if(C.display < C.count) C.display = C.count;
    else if(C.display > C.count) C.display = Math.max(C.count, C.display - 0.15);

    // — Wave —
    G.waveTimer+=dt;
    if(G.waveTimer>=CFG.WAVE.DURATION){
      G.waveTimer=0; G.wave++;
      G._bossSpawnedThisWave=false; // allow boss to spawn again on next wave-5
      G.spawnRate=Math.max(CFG.WAVE.SPAWN_RATE_MIN,G.spawnRate-0.08);
      p.novaKillsNeeded=ENEMIES.getNovaKillsNeeded(G.wave);
      G.scoreMultiplier=1;
      if(G.wave>=3) this._rollModifier();
      this.announce(`⚔ WAVE ${G.wave}`,'#f1c40f',140,7,'top');
      this.spawnParticles(p.x,p.y,12,'#f1c40f');
      // Update music track based on wave
      SFX.updateMusic(G.wave, !!G.enemies.find(e=>e.type==='boss'));

      // ── CHAPTER I END: wave 25 complete → beacon appears ──
      if(G.wave === 26 && G.chapter === 1 && !G.beaconActive) {
        this._triggerChapterBeacon();
      }
    }

    // Block all spawning during chapter transition
    if(G._chapterTransitioning) return;

    // — Spawn —
    const maxE=CFG.WAVE.MAX_ENEMIES+G.wave*CFG.WAVE.EXTRA_PER_WAVE;
    G.spawnTimer+=dt;
    if(G.spawnTimer>=G.spawnRate&&G.enemies.length<maxE){
      G.spawnTimer=0;
      this.spawnEnemy();
      if(G.wave>8) this.spawnEnemy();  // only double-spawn at later waves
    }
    // Boss: spawn once per wave-5 milestone, guaranteed on the first spawn tick of that wave
    // Elite group rush: wave 25+ chance to spawn a cluster of 3 elites
    if(G.wave >= 25 && G.tick % 400 === 0) {
      const slots = maxE - G.enemies.length;
      if(slots >= 3) {
        for(let i=0;i<3;i++) this.spawnEnemy('elite_forced');
      }
    }

    if(G.wave%5===0&&!G.enemies.find(e=>e.type==='boss')&&!G._bossSpawnedThisWave){
      G._bossSpawnedThisWave=true;
      this.spawnEnemy('boss');
    }
    // Reset boss-spawn flag at the start of each new wave (handled in wave tick below)

    // — Enemy AI —
    const ghostMode=p.activePowerup==='ghost' || p.activePowerup2==='ghost';
    // At the top of enemy filter in game.js
    G.enemies=G.enemies.filter(e=>{
      // ── Chapter transition: enemies fade and vanish ──────
      if(G.enemyFadeOut){
        e._fadeAlpha = Math.max(0, (e._fadeAlpha===undefined?1:e._fadeAlpha) - 0.035);
        return e._fadeAlpha > 0;
      }
      const offscreen = Math.abs(e.x-p.x)>600 || Math.abs(e.y-p.y)>500;
      if(offscreen){ 
        // still move toward player but skip abilities
        const edx=p.x-e.x, edy=p.y-e.y, dist=Math.sqrt(edx*edx+edy*edy)||1;
        e.x+=edx/dist*e.speed*0.5; e.y+=edy/dist*e.speed*0.5;
        return true;
      }
      // ... rest of existing AI
      const edx=p.x-e.x,edy=p.y-e.y;
      const dist=Math.sqrt(edx*edx+edy*edy)||1;
      const tSlow=(p.activePowerup==='time'||p.activePowerup2==='time')?0.2:1;

      // Specter: cloak until within 120px
      if(e.type==='specter'){
        e.cloaked=dist>120;
        if(e.cloaked){e.x+=edx/dist*e.speed*tSlow*0.5;e.y+=edy/dist*e.speed*tSlow*0.5;return true;}
      }

      // Wraith: teleport every 4s when far
      if(e.type==='wraith'){
        e.teleTimer=(e.teleTimer||0)+1;
        if(e.teleTimer>=240&&dist>200){
          e.teleTimer=0;
          const ang=Math.atan2(edy,edx);
          e.x=p.x-Math.cos(ang)*60; e.y=p.y-Math.sin(ang)*60;
          this.spawnParticles(e.x,e.y,8,'#9b59b6');
        }
      }

      // Normal movement (skip if charging)
      if(!e.charging){
        e.x+=edx/dist*e.speed*tSlow;
        e.y+=edy/dist*e.speed*tSlow;
      }
      e.facing = edx>=0 ? 1 : -1;
      if(e.hitTimer>0) e.hitTimer--;

      // Ability ticks
      this._tickAbility(e,G,p);
      if(!e.charging && G.enemies.length < 30){
         // Separation — push away from nearby enemies to avoid clumping
        if(!e.charging){
          G.enemies.forEach(other => {
            if(other === e) return;
            const sdx = e.x - other.x;
            const sdy = e.y - other.y;
            const sdist = Math.sqrt(sdx*sdx + sdy*sdy);
            if(sdist < 20 && sdist > 0){
              e.x += (sdx/sdist) * 0.8;
              e.y += (sdy/sdist) * 0.8;
            }
          });
        }

      }     
      // Melee damage
      const hitR=e.w+(e.type==='boss'?8:0);
      if(dist<hitR&&p.invulnTimer===0&&!ghostMode&&!e.cloaked){
        if(p.shield>0){
          p.shield--;
          this.spawnParticles(p.x,p.y,8,'#3498db');
          this.addDmg(p.x,p.y-20,'BLOCKED!','#3498db',8);
        } else {
          const dmgTaken = Math.floor(e.dmg * (p._bloodPact?2:1));
          p.hp=Math.max(0,p.hp-dmgTaken);
          p.invulnTimer=CFG.PLAYER.INVULN;
          G.shake.timer=12;G.shake.intensity=5;
          this.spawnParticles(p.x,p.y,8,'#e74c3c');
          this.addDmg(p.x,p.y-20,`-${dmgTaken}`,'#ff4444');
          SFX.play('playerHit');
          if(p.hp<=0){SFX.play('playerDie');this.gameOver();return true;}
        }
      }
      return true;
    });

    // — Attack (auto-aim OR ray-aim) —
    p.atkTimer+=dt;

    // ── BLADE DANCER: orbit blades update ─────────────────
    if(p.weapon==='bladedancer' && G.chapter>=2){
      p._bladeAngle=(p._bladeAngle||0)+0.045*(p.bladeTornado?1.7:1);
      // Blade dancer fires at orbit release points, handled below in attack tick
    }

    if(p.atkTimer>=1/p.atkSpeed){
      p.atkTimer=0;
      const hasRage = p.activePowerup==='rage' || p.activePowerup2==='rage';
      const dmgMult=(p.lastStandActive?3:1)*(hasRage?2.5:1)*(p._bloodPact?2:1);
      // Weapon bullet type
      const wid = p.weapon;
      const bType = wid==='crossbow' ? 'crossbow'
                  : wid==='grimoire' ? 'orb'
                  : wid==='bladedancer' ? 'blade'
                  : (p.piercing||p.lastStandActive?'fire':p.multi>3?'chain':'normal');

      if(p.aimActive && G.enemies.length>0){
        // ── RAY AIM MODE ──────────────────────────────────
        // Ray from player → aim point (world coords)
        const rDx=p.aimX-p.x, rDy=p.aimY-p.y;
        const rLen=Math.sqrt(rDx*rDx+rDy*rDy)||1;
        const rNx=rDx/rLen, rNy=rDy/rLen;  // normalized ray direction
        const RAY_WIDTH=50; // px snap radius to ray

        // Find enemy nearest to ray line
        let bestE=null, bestDist=Infinity;
        G.enemies.forEach(e=>{
          // Project enemy onto ray
          const ex=e.x-p.x, ey=e.y-p.y;
          const proj=ex*rNx+ey*rNy;  // distance along ray
          if(proj<0) return;          // behind player
          // Perpendicular distance from enemy to ray
          const perpX=ex-proj*rNx, perpY=ey-proj*rNy;
          const perp=Math.sqrt(perpX*perpX+perpY*perpY);
          if(perp<RAY_WIDTH && proj<bestDist){
            bestDist=proj; bestE=e;
          }
        });
        p.aimTarget=bestE;

        // Fire at snapped enemy or straight along ray
        const target=bestE||null;
        const angle=target
          ? Math.atan2(target.y-p.y, target.x-p.x)
          : Math.atan2(rDy,rDx);

        const bSpd = p._bulletSpeed || 6;
        for(let s=0;s<p.multi;s++){
          // Slight spread for multi-shot in ray mode
          const spread=p.multi>1?(s-(p.multi-1)/2)*0.12:0;
          // Blade dancer — blades orbit briefly, fire in spread ring
          const bAngle = bType==='blade' ? (p._bladeAngle + (s/p.multi)*Math.PI*2) : (angle+spread);
          G.bullets.push({x:p.x,y:p.y,
            vx:Math.cos(bAngle)*bSpd,
            vy:Math.sin(bAngle)*bSpd,
            dmg:p.dmg*dmgMult, life:90,  // longer life = more range
            piercing:p.piercing||p.lastStandActive,
            homing: p._homing||false,
            hit:[], type:bType});
        }
        p.facing=Math.cos(angle)>0?1:-1;
        SFX.play('bulletFire');

      } else {
        // ── AUTO AIM MODE ─────────────────────────────────
        p.aimTarget=null;
        const bSpd2 = p._bulletSpeed || 6;

        // GRIMOIRE / BLADEDANCER — no auto-aim needed (homing/orbit handles it)
        if(bType==='orb' || bType==='blade'){
          for(let s=0;s<p.multi;s++){
            const ang = bType==='blade'
              ? p._bladeAngle + (s/p.multi)*Math.PI*2
              : Math.random()*Math.PI*2;
            G.bullets.push({x:p.x,y:p.y,
              vx:Math.cos(ang)*bSpd2, vy:Math.sin(ang)*bSpd2,
              dmg:p.dmg*dmgMult, life:120,
              piercing:p.piercing||p.lastStandActive,
              homing:p._homing||false,
              hit:[], type:bType});
          }
          SFX.play('bulletFire');
        } else {
          const sorted=[...G.enemies].sort((a,b)=>
            ((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2));
          let fired=false;
          for(let s=0;s<p.multi&&s<sorted.length;s++){
            const t=sorted[s]; if(!t) break;
            const dist=Math.sqrt((t.x-p.x)**2+(t.y-p.y)**2);
            if(dist<=p.atkRange){
              const angle=Math.atan2(t.y-p.y,t.x-p.x);
              G.bullets.push({x:p.x,y:p.y,
                vx:Math.cos(angle)*bSpd2,vy:Math.sin(angle)*bSpd2,
                dmg:p.dmg*dmgMult, life:70,
                piercing:p.piercing||p.lastStandActive,
                homing:false,
                hit:[], type:bType});
              p.facing=Math.cos(angle)>0?1:-1;
              if(!fired){ SFX.play('bulletFire'); fired=true; }
            }
          }
        }
      }
    }

    // — Nuke AoE —
    if(p.activePowerup==='nuke' || p.activePowerup2==='nuke'){
      G.enemies=G.enemies.filter(e=>{
        if(Math.sqrt((e.x-p.x)**2+(e.y-p.y)**2)<120){
          e.hp-=5;
          if(Math.random()<0.3) this.spawnParticles(e.x,e.y,3,'#ff6a00');
          if(e.hp<=0){this._killEnemy(e);return false;}
        }
        return true;
      });
    }

    // — Bullets —
    G.bullets=G.bullets.filter(b=>{
      b.x+=b.vx;b.y+=b.vy;b.life--;
      // Grimoire homing: steer toward nearest enemy
      if(b.homing && b.type!=='plasma' && G.enemies.length>0){
        let nearest=null,nd=Infinity;
        G.enemies.forEach(e=>{const d=(e.x-b.x)**2+(e.y-b.y)**2;if(d<nd){nd=d;nearest=e;}});
        if(nearest){
          const ang=Math.atan2(nearest.y-b.y,nearest.x-b.x);
          b.vx+=(Math.cos(ang)*0.3);b.vy+=(Math.sin(ang)*0.3);
          // Cap speed
          const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
          if(spd>5){b.vx=b.vx/spd*5;b.vy=b.vy/spd*5;}
        }
      }
      // Plasma ball: slow homing toward player, can be shot down
      if(b.type==='plasma' && b.isEnemyBullet) {
        b._plasmaPhase = (b._plasmaPhase||0) + 0.08;
        const ang = Math.atan2(p.y-b.y, p.x-b.x);
        b.vx += Math.cos(ang)*0.08; b.vy += Math.sin(ang)*0.08;
        const spd = Math.sqrt(b.vx*b.vx+b.vy*b.vy);
        if(spd>2.5){b.vx=b.vx/spd*2.5;b.vy=b.vy/spd*2.5;}
        // Check if player bullets hit the plasma ball
        G.bullets.forEach(pb=>{
          if(pb.isEnemyBullet||pb._hitPlasma===b) return;
          const dd=Math.sqrt((pb.x-b.x)**2+(pb.y-b.y)**2);
          if(dd<16){
            b._plasmaHp=(b._plasmaHp||1)-1;
            pb._hitPlasma=b;
            GAME.spawnParticles(b.x,b.y,5,'#cc44ff');
          }
        });
        if(b._plasmaHp<=0) {
          // Detonate early
          for(let i=0;i<(b._burstCount||12);i++){
            const ba=(i/(b._burstCount||12))*Math.PI*2;
            G.bullets.push({x:b.x,y:b.y,vx:Math.cos(ba)*4,vy:Math.sin(ba)*4,
              dmg:b.dmg*0.3,life:50,piercing:false,hit:[],type:'fire',isEnemyBullet:true});
          }
          GAME.spawnParticles(b.x,b.y,25,'#cc44ff');
          G.shake.timer=10;G.shake.intensity=6;
          return false;
        }
      }
      // Enemy bullets
      if(b.isEnemyBullet){
        const dist=Math.sqrt((b.x-p.x)**2+(b.y-p.y)**2);
        if(dist<14&&p.invulnTimer===0&&p.activePowerup!=='ghost'){
          if(p.shield>0){p.shield--;this.spawnParticles(p.x,p.y,5,'#3498db');}
          else{
            const bDmg=Math.floor(b.dmg*(p._bloodPact?2:1));
            p.hp=Math.max(0,p.hp-bDmg);p.invulnTimer=CFG.PLAYER.INVULN;
            G.shake.timer=8;G.shake.intensity=4;
            this.addDmg(p.x,p.y-20,`-${bDmg}`,'#ff4444');
            SFX.play('playerHit');
            if(p.hp<=0){SFX.play('playerDie');this.gameOver();return false;}
          }
          return false;
        }
        return true;
      }
      // Player bullets
      let alive=true;
      G.enemies=G.enemies.filter(e=>{
        if(b.hit.includes(e)) return true;
        const dist=Math.sqrt((e.x-b.x)**2+(e.y-b.y)**2);
        if(dist<e.w+(e.type==='boss'?8:0)){
          if(e.mageShield){e.mageShield=false;b.hit.push(e);this.spawnParticles(e.x,e.y,5,'#9b59b6');return true;}
          p.hitCount++;
          let dmg=b.dmg;
          if(p.deathMark&&p.hitCount%10===0&&e.type!=='boss'){dmg=e.hp;this.addDmg(e.x,e.y-20,'DEATH!','#ff0055',9);}
          if(e.shielded&&e.shieldHits>0){
            e.shieldHits--;if(e.shieldHits<=0)e.shielded=false;
            this.spawnParticles(e.x,e.y,4,'#ecf0f1');
            if(b.piercing){b.hit.push(e);}else{alive=false;}
            return true;
          }
          e.hp-=dmg;e.hitTimer=6;
          this.addDmg(e.x,e.y-16,Math.floor(dmg),'#fff176',7);
          this.spawnParticles(e.x,e.y,4,'#ff6a00');
          SFX.play('enemyHit');
          // Soul drain (grimoire mastery 2)
          if(p.soulDrain){ p.hp=Math.min(p.maxHp,p.hp+1); }
          // Grimoire split (mastery 1): orb splits into 3 smaller orbs on hit
          if(p.grimoireSplit && b.type==='orb' && !b._isSplit){
            for(let s=0;s<3;s++){
              const ang=Math.atan2(b.vy,b.vx)+(s-1)*0.8;
              G.bullets.push({x:b.x,y:b.y,
                vx:Math.cos(ang)*3,vy:Math.sin(ang)*3,
                dmg:b.dmg*0.4,life:35,piercing:false,homing:false,
                hit:[e],type:'orb',_isSplit:true,_phase:Math.random()*Math.PI*2});
            }
          }
          // Blade bleed (mastery 2): slow enemy + apply DoT
          if(p.bladeBleed && b.type==='blade'){
            e._bleedTimer = (e._bleedTimer||0) + 120; // 2s bleed, stacks
            e._bleedDmg   = dmg * 0.08;              // 8% damage per tick (every 30f)
            e.speed       = Math.max(e.speed * 0.85, e.speed * 0.5); // slow, capped
          }
          // Phantom bolt (crossbow mastery 3): fire a ghost copy
          if(p.phantomBolt && b.type==='crossbow' && !b._isPhantom && Math.random()<0.5){
            const pa=Math.atan2(b.vy,b.vx)+(Math.random()-.5)*0.3;
            G.bullets.push({x:p.x,y:p.y,
              vx:Math.cos(pa)*9,vy:Math.sin(pa)*9,
              dmg:b.dmg*0.6,life:90,piercing:true,homing:false,
              hit:[],type:'crossbow',_isPhantom:true});
          }
          if(b.piercing){b.hit.push(e);}else{alive=false;}
          if(e.hp<=0){
            e._killAngle=Math.atan2(b.vy,b.vx); // store bullet dir for ragdoll
            // Crossbow explode (mastery 2): AoE burst on kill through pierce
            if(p.crossbowExplode && b.type==='crossbow'){
              G.enemies.forEach(ne=>{
                const ed=Math.sqrt((ne.x-e.x)**2+(ne.y-e.y)**2);
                if(ed<60&&ne!==e){ ne.hp-=dmg*0.5; ne.hitTimer=6; if(ne.hp<=0){this._killEnemy(ne);} }
              });
              this.spawnParticles(e.x,e.y,14,'#f1c40f');
              G.shake.timer=6; G.shake.intensity=4;
            }
            this._killEnemy(e);return false;
          }
          return true;
        }
        return true;
      });
      return alive;
    });

    // — Gems —
    const magR=(p.activePowerup==='magnet'||p.activePowerup2==='magnet')?p.magnet*4:p.magnet;
    G.gems=G.gems.filter(g=>{
      const dist=Math.sqrt((g.x-p.x)**2+(g.y-p.y)**2)||1;
      if(dist<magR){const spd=Math.min(6,80/dist);g.x+=(p.x-g.x)/dist*spd;g.y+=(p.y-g.y)/dist*spd;}
      if(dist<12){
        p.xp+=g.value;
        SFX.play('gemPickup');
        // while loop handles multiple level-ups from single gem burst
        while(p.xp>=p.xpNeeded){
          p.xp-=p.xpNeeded;
          p.level++;
          // Gentler curve: 1.18× per level, hard cap at 80 so boosts never stop
          p.xpNeeded=Math.min(80, Math.floor(p.xpNeeded*1.18));
          GAME.triggerLevelUp();
          break; // show one level-up screen at a time, leftover xp kept
        }
        return false;
      }
      return true;
    });

    // — Orbs —
    G.orbs=G.orbs.filter(o=>{
      const dist=Math.sqrt((o.x-p.x)**2+(o.y-p.y)**2)||1;
      if(dist<magR*0.5){o.x+=(p.x-o.x)/dist*4;o.y+=(p.y-o.y)/dist*4;}
      if(dist<14){p.hp=Math.min(p.maxHp,p.hp+20);this.addDmg(p.x,p.y-20,'+20','#2ecc71');SFX.play('orbPickup');return false;}
      return true;
    });

    // — Powerup pickups — dual slot with stack/cap logic —
    G.powerups=G.powerups.filter(pw=>{
      const dist=Math.sqrt((pw.x-p.x)**2+(pw.y-p.y)**2)||1;
      if(dist<18){
        const DUR = Math.floor(CFG.POWERUP_DURATION*60);
        const MAX = Math.floor(DUR*1.5); // hard cap at 1.5× duration

        if(!p.activePowerup){
          // Slot 1 empty — fill it
          p.activePowerup  = pw.kind;
          p.powerupTimer   = DUR;
        } else if(p.activePowerup === pw.kind){
          // Same as slot 1 — add time, cap at 1.5×
          p.powerupTimer = Math.min(MAX, p.powerupTimer + DUR);
        } else if(!p.activePowerup2){
          // Slot 2 empty — fill it
          p.activePowerup2 = pw.kind;
          p.powerupTimer2  = DUR;
        } else if(p.activePowerup2 === pw.kind){
          // Same as slot 2 — add time, cap at 1.5×
          p.powerupTimer2 = Math.min(MAX, p.powerupTimer2 + DUR);
        } else {
          // Both slots full, different types — replace whichever has less time
          if(p.powerupTimer <= p.powerupTimer2){
            p.activePowerup = pw.kind;
            p.powerupTimer  = DUR;
          } else {
            p.activePowerup2 = pw.kind;
            p.powerupTimer2  = DUR;
          }
        }

        this.addDmg(p.x,p.y-30,pw.kind.toUpperCase()+'!','#f1c40f',9,90);
        this.spawnParticles(p.x,p.y,20,'#f1c40f');
        SFX.play('powerupPickup');
        return false;
      }
      return true;
    });

    // — Particles — (capped at 300 to prevent memory growth in long runs)
    G.particles=G.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vx*=0.9;pt.vy*=0.9;pt.life--;return pt.life>0;});
    if(G.particles.length>80) G.particles.splice(0, G.particles.length-80);
    G.dmgNums  =G.dmgNums.filter(d=>{d.y-=0.6;d.life--;return d.life>0;});
  },

  // ── ENEMY ABILITY TICK ────────────────────────────────────
  _tickAbility(e,G,p) {
    if(!e.abilities||e.abilities.length===0) return;
    e.abilityTimer=(e.abilityTimer||0)+1;
    const dist=Math.sqrt((e.x-p.x)**2+(e.y-p.y)**2);

    // THROW (skeleton 4-dir only / death knight 3-spread / warlord 2-spread)
    // Bone throw: starts every 3s, scales to every 1.5s by wave 30
    const throwCd = Math.max(90, 180 - G.wave * 3);
    if(e.abilities.includes('throw')&&e.abilityTimer%throwCd===0&&dist<300){
      let angle=Math.atan2(p.y-e.y,p.x-e.x);

      // Skeleton: snap to nearest 90° (cardinal only — H or V, no diagonals)
      if(e.type==='skeleton'){
        angle=Math.round(angle/(Math.PI/2))*(Math.PI/2);
      }

      const count=e.type==='deathknight'?3:e.type==='warlord'?2:1;
      for(let i=0;i<count;i++){
        const spread=count>1?(i-(count-1)/2)*0.25:0;
        G.bullets.push({x:e.x,y:e.y,
          vx:Math.cos(angle+spread)*3.5,vy:Math.sin(angle+spread)*3.5,
          dmg:e.dmg*0.6,life:90,piercing:false,hit:[],
          type:'bone',isEnemyBullet:true,spin:0});
      }
      // Remove one orbital bone visually when skeleton fires
      if(e.type==='skeleton'){
        e._boneCount=Math.max(0,(e._boneCount??2)-1);
        setTimeout(()=>{ e._boneCount=Math.min(2,(e._boneCount??0)+1); }, 1500);
      }
      SFX.play('boneThrow');
    }

    // DODGE (wraith sidestep)
    if(e.abilities.includes('dodge')&&e.abilityTimer%20===0){
      const near=G.bullets.find(b=>!b.isEnemyBullet&&Math.sqrt((b.x-e.x)**2+(b.y-e.y)**2)<60);
      if(near){
        e.x+=(Math.random()-.5)*24; e.y+=(Math.random()-.5)*24;
        // Clamp back inside world so wraith can't escape through walls
        e.x=Math.max(40,Math.min(G.worldW-40,e.x));
        e.y=Math.max(40,Math.min(G.worldH-40,e.y));
        this.spawnParticles(e.x,e.y,3,'#9b59b6');
      }
    }

    // SHIELD_ALLIES (mage/warlock/lich)
    if(e.abilities.includes('shield_allies')&&e.abilityTimer%300===0){
      G.enemies.forEach(other=>{
        if(other===e) return;
        if(Math.sqrt((other.x-e.x)**2+(other.y-e.y)**2)<120){
          other.mageShield=true;other.mageShieldTimer=180;
          this.spawnParticles(other.x,other.y,6,'#9b59b6');
        }
      });
    }

    // CHARGE (knight/berserker/deathknight)
    // Warning phase: 90 frames before charge, lock target position + play tick sound
    // Charge: detection range and cooldown tighten with wave
    const chargeRange = Math.min(420, 280 + G.wave * 3.5);
    if(e.abilities.includes('charge')&&dist<chargeRange){
      e.chargeTimer=(e.chargeTimer||0)+1;
      const cd=Math.max(100, (e.type==='deathknight'?160:240) - G.wave*2);
      const warnAt=cd-90;  // start warning 1.5s before charge

      // Warning phase — lock target, show indicator
      if(e.chargeTimer===warnAt){
        e.chargeTargetX=p.x;  // lock where player IS right now
        e.chargeTargetY=p.y;
        e.chargeWarning=true;
        SFX.play('knightTarget');
      }
      // Repeat tick every 20 frames during warning
      if(e.chargeWarning&&(e.chargeTimer-warnAt)>0&&(e.chargeTimer-warnAt)%25===0){
        SFX.play('knightTarget');
      }

      if(e.chargeTimer>=cd){
        e.chargeTimer=0;
        e.chargeWarning=false;
        e.charging=true;
        e.chargeFrames=e.type==='deathknight'?30:20;
        // Charge toward the LOCKED target (fair — player saw it coming)
        const tx=e.chargeTargetX||p.x, ty=e.chargeTargetY||p.y;
        const ang=Math.atan2(ty-e.y,tx-e.x);
        const cspd = Math.min(14, 7 + G.wave * 0.12);
        e.chargeDx=Math.cos(ang)*cspd;e.chargeDy=Math.sin(ang)*cspd;
        this.spawnParticles(e.x,e.y,10,'#2980b9');
        SFX.play('knightCharge');
      }
    }
    if(e.charging){
      e.x+=e.chargeDx;e.y+=e.chargeDy;
      e.chargeFrames--;
      if(e.chargeFrames<=0) e.charging=false;
    }

    // ENRAGE (berserker at 50% HP)
    if(e.abilities.includes('enrage')&&!e.enraged&&e.hp/e.maxHp<0.5){
      e.enraged=true;e.speed*=2;this.spawnParticles(e.x,e.y,12,'#e74c3c');
      this.announce('👹 BERSERKER ENRAGED!','#e74c3c',120,7);
    }

    // MAGE SHIELD tick
    if(e.mageShield){e.mageShieldTimer--;if(e.mageShieldTimer<=0)e.mageShield=false;}

    // WARLORD ground slam every 5s (shockwave hurts player)
    if(e.type==='warlord'&&e.abilityTimer%300===0&&dist<180){
      G.shake.timer=12;G.shake.intensity=6;
      this.spawnParticles(e.x,e.y,20,'#27ae60');
      if(dist<100&&p.invulnTimer===0){
        p.hp=Math.max(0,p.hp-15);p.invulnTimer=30;
        this.addDmg(p.x,p.y-20,'-15 SLAM','#ff4444',7);
      }
    }

    // LICH fire ring every 6s
    if(e.type==='lich'&&e.abilityTimer%360===0){
      for(let i=0;i<8;i++){
        const ang=(i/8)*Math.PI*2;
        G.bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*2.5,vy:Math.sin(ang)*2.5,
          dmg:e.dmg*0.5,life:100,piercing:false,hit:[],type:'fire',isEnemyBullet:true});
      }
    }

    // ── TITAN: jump attack ──────────────────────────────────
    if(e.type==='titan') {
      e._jumpTimer = (e._jumpTimer||0) + 1;
      const cfg = CFG.CHAOS_ENEMIES.titan;
      const cd  = cfg.jumpCooldown;
      const warn= cd - cfg.jumpWarning;

      if(e._jumpTimer === warn && dist < cfg.jumpRange) {
        // Lock target
        e._jumpTargetX = p.x; e._jumpTargetY = p.y;
        e._jumpWarning = true;
        e._jumpWarningTimer = cfg.jumpWarning;
        GAME.announce('⚠ TITAN JUMP!', '#ff4400', 90, 7, 'top');
      }
      if(e._jumpWarning) {
        e._jumpWarningTimer = Math.max(0, (e._jumpWarningTimer||0) - 1);
      }
      if(e._jumpTimer >= cd && dist < cfg.jumpRange) {
        e._jumpTimer = 0;
        e._jumpWarning = false;
        // Instant teleport to target + AoE
        e.x = e._jumpTargetX||p.x;
        e.y = e._jumpTargetY||p.y;
        GAME.spawnParticles(e.x, e.y, 30, '#ff4400');
        G.shake.timer = 20; G.shake.intensity = 12;
        // AoE damage in impact radius
        const impR = cfg.impactRadius;
        if(Math.sqrt((p.x-e.x)**2+(p.y-e.y)**2) < impR && p.invulnTimer===0) {
          if(p.shield>0) { p.shield--; }
          else { p.hp=Math.max(0,p.hp-cfg.impactDmg); p.invulnTimer=CFG.PLAYER.INVULN; GAME.addDmg(p.x,p.y-20,`-${cfg.impactDmg} TITAN!`,'#ff4400',8); }
          if(p.hp<=0) { GAME.gameOver(); }
        }
        // Draw impact ring
        for(let i=0;i<3;i++) {
          G.novaRings.push({x:e.x,y:e.y,radius:10+i*30,speed:6+i*2,life:25,maxLife:25,color:'#ff4400'});
        }
      }
    }

    // ── SHADE ARCHER: burst + sprint ───────────────────────
    if(e.type==='shadearcher') {
      const cfg = CFG.CHAOS_ENEMIES.shadearcher;
      e._archerTimer = (e._archerTimer||0) + 1;
      e._archerBurstCount = e._archerBurstCount||0;
      e._archerCharging = false;

      // Burst phase
      if(e._archerBursting) {
        e._archerBurstTimer = (e._archerBurstTimer||0) + 1;
        if(e._archerBurstTimer % cfg.arrowDelay === 0) {
          const ang = Math.atan2(p.y-e.y, p.x-e.x) + (Math.random()-0.5)*0.15;
          G.bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*5.5,vy:Math.sin(ang)*5.5,
            dmg:e.dmg,life:80,piercing:false,hit:[],type:'bone',isEnemyBullet:true});
          e._archerBurstCount++;
          if(e._archerBurstCount >= cfg.arrowCount) {
            e._archerBursting = false;
            e._archerChargePhase = true;
            e._archerChargeTimer = 0;
            e._archerBurstCount = 0;
          }
        }
        return; // don't move while bursting
      }

      // Sprint phase after burst
      if(e._archerChargePhase) {
        e._archerCharging = true;
        e._archerChargeTimer = (e._archerChargeTimer||0) + 1;
        const ang = Math.atan2(p.y-e.y, p.x-e.x);
        e.x += Math.cos(ang)*cfg.speed*2.5;
        e.y += Math.sin(ang)*cfg.speed*2.5;
        if(e._archerChargeTimer >= cfg.chargeDuration) {
          e._archerChargePhase = false;
          e._archerTimer = 0;
        }
        return;
      }

      // Cooldown expired — start burst
      if(e._archerTimer >= cfg.arrowCooldown && dist < 400) {
        e._archerBursting = true;
        e._archerBurstTimer = 0;
        e._archerBurstCount = 0;
        GAME.announce('💀 SHADE ARCHER BURST!', '#00d4ff', 90, 7, 'top');
      }
    }

    // ── PLASMA WRAITH: homing plasma ball ──────────────────
    if(e.type==='plasmawraith') {
      const cfg = CFG.CHAOS_ENEMIES.plasmawraith;
      e._plasmaTimer = (e._plasmaTimer||0) + 1;
      // Charge wind-up
      if(e._plasmaTimer >= cfg.ballCooldown - 60) {
        e._plasmaCharging = true;
        e._plasmaChargeTimer = (e._plasmaChargeTimer||0) + 1;
      }
      if(e._plasmaTimer >= cfg.ballCooldown && dist < 500) {
        e._plasmaTimer = 0;
        e._plasmaCharging = false;
        e._plasmaChargeTimer = 0;
        // Spawn plasma ball as special bullet
        G.bullets.push({
          x:e.x, y:e.y, vx:0, vy:0,
          dmg: cfg.ballDmg, life: 600,
          piercing:false, homing:true, hit:[],
          type:'plasma', isEnemyBullet:true,
          _plasmaHp: cfg.ballHp,
          _burstCount: cfg.burstCount,
          _plasmaPhase: 0,
        });
        GAME.spawnParticles(e.x, e.y, 12, '#cc44ff');
        GAME.announce('☠ PLASMA BALL!', '#cc44ff', 120, 7, 'top');
      }
    }
  },  // end _tickAbility

  // ── KILL ENEMY ────────────────────────────────────────────
  _killEnemy(e) {
    const G=this.state,p=G.player;
    const S=ENEMIES.stats[e.type]||{tier:'normal',xp:1,score:10};
    const tierGold={normal:5,elite:12,champion:25,boss:60};
    G.player._goldEarned=(G.player._goldEarned||0)+(tierGold[S.tier]||2);
    const L=CFG.LOOT;
    const scoreMult = (G.scoreMultiplier||1) * (G.wave>10?2:1);
    G.score+=Math.floor(S.score*scoreMult);
    G.kills++;

    // ── WEAPON MASTERY (Chapter II) ──────────────────────
    if(G.chapter >= 2 && p.weapon) {
      p.weaponKills = (p.weaponKills||0) + 1;
      const wDef = CFG.WEAPONS.find(w=>w.id===p.weapon);
      if(wDef) {
        const ml = p.masteryLevel||0;
        const nextMastery = wDef.mastery[ml];
        if(nextMastery && p.weaponKills >= nextMastery.kills) {
          p.masteryLevel = ml+1;
          nextMastery.apply(p);
          this.announce(`🔥 MASTERY ${p.masteryLevel} — ${nextMastery.bonus.split('—')[0].trim()}`,
            wDef.color, 240, 7, 'bottom');
          this.spawnParticles(p.x, p.y, 20, wDef.color);
        }
      }
    }

    // — Combo —
    const C=G.combo;
    C.count++;
    C.timer=0; // reset window
    C.display=C.count;
    if(C.count>=5)  C.flashTimer=20;
    if(C.count>=10) C.flashTimer=30;
    // Combo score bonus
    if(C.count>=3){
      const bonus=Math.floor(S.score*(C.count*0.2));
      G.score+=bonus;
      if(C.count%5===0)
        this.addDmg(e.x,e.y-30,`x${C.count} COMBO!`,'#f1c40f',8,70);
    }

    // Skill meter — fill bar charges one nova at a time, stack up to 3
    // Nova-kill credits are skipped — no self-recharging feedback loop
    const NOVA_MAX_STORED = 3;
    if(p.novaStored < NOVA_MAX_STORED && !p._novaFiring){
      p.skillKills++;
      if(p.skillKills >= p.novaKillsNeeded){
        p.skillKills = 0;
        p.skillCharge = 0; // bar resets to 0 for next charge
        p.novaStored++;
        // Re-clamp after each charge in case meta upgrades pushed it below minimum
        p.novaKillsNeeded = Math.max(3, p.novaKillsNeeded);
        if(!GAME._skillTutorialShown){
          GAME._skillTutorialShown = true; G.paused = true; UI.showSkillTutorial();
        } else {
          this.announce(`⚡ NOVA x${p.novaStored}  [SPACE]`, '#00d4ff', 160, 7, 'top');
        }
      } else {
        p.skillCharge = p.skillKills / p.novaKillsNeeded; // 0→1 fractional fill
      }
    }
    // bar stays full-looking if at max stored (no point showing progress)

    // Gem drops — rate by wave
    let gemRate=1.0;
    for(const t of L.GEM_RATE){if(G.wave>=t.wave)gemRate=t.rate;}
    const gemCnt=e.type==='boss'?10:S.xp;
    for(let i=0;i<gemCnt;i++){
      if(Math.random()>gemRate) continue;
      if(G.gems.length>=L.MAX_GEMS) G.gems.shift();
      G.gems.push({x:e.x+(Math.random()-.5)*20,y:e.y+(Math.random()-.5)*20,
        value:e.type==='boss'?5:1,phase:Math.random()*Math.PI*2,
        life:L.GEM_LIFE*60,maxLife:L.GEM_LIFE*60});
    }

    // Orb drop
    const isHeavy = S.tier==='champion' || S.tier==='boss';
    let orbBonus=0;
    if(!isHeavy && L.ORB_WAVE_BONUS) for(const t of L.ORB_WAVE_BONUS){ if(G.wave>=t.wave) orbBonus=t.bonus; }
    const orbChance=Math.max(L.DROP_MIN, L.ORB_BASE*(p.luckMod||1) - G.wave*L.DROP_WAVE_SCALE + orbBonus + (e.type==='boss'?0.4:0));
    if(Math.random()<orbChance){
      if(G.orbs.length>=L.MAX_ORBS) G.orbs.shift();
      G.orbs.push({x:e.x,y:e.y,phase:Math.random()*Math.PI*2,life:L.ORB_LIFE*60,maxLife:L.ORB_LIFE*60});
    }

    // Powerup drop — luckMod now correctly applied (was missing before)
    let pwBonus=0;
    if(!isHeavy && L.POWERUP_WAVE_BONUS) for(const t of L.POWERUP_WAVE_BONUS){ if(G.wave>=t.wave) pwBonus=t.bonus; }
    const pwChance=Math.max(L.DROP_MIN, L.POWERUP_BASE*(p.luckMod||1) - G.wave*L.DROP_WAVE_SCALE*0.5 + pwBonus + (e.type==='boss'?0.5:0));
    if(Math.random()<pwChance){
      if(G.powerups.length>=L.MAX_POWERUPS) G.powerups.shift();
      this.spawnPowerupDrop(e.x,e.y);
    }

    // Splat
    const sc={mage:'#8e44ad',warlock:'#2c3e50',lich:'#9b59b6',specter:'#1a1a2e',
              skeleton:'#bdc3c7',boss:'#ff0055'}[e.type]||'#c0392b';
    const dots=[];
    for(let i=0;i<8;i++) dots.push({x:(Math.random()-.5)*e.w*2|0,y:(Math.random()-.5)*e.h|0,s:Math.ceil(Math.random()*4)});
    if(G.splats.length>30) G.splats.shift();
      G.splats.push({x:e.x,y:e.y,color:sc,dots,life:400});

    // Shake — bigger for higher tier
    const shakes={normal:4,elite:8,champion:14,boss:30};
    const intensities={normal:2,elite:4,champion:7,boss:10};
    const tier=S.tier||'normal';
    G.shake.timer=shakes[tier]; G.shake.intensity=intensities[tier];
    // Clear any pending charge warning so it doesn't linger on screen
    e.chargeWarning=false;

    // ── VISUAL JUICE ──────────────────────────────────────
    // Screen flash — brighter for higher tiers
    const flashAmt={normal:1,elite:3,champion:6,boss:12};
    G.screenFlash=Math.max(G.screenFlash, flashAmt[tier]||1);

    // Hit sparks — burst in bullet direction
    const sparkCol={normal:'#fff176',elite:'#f1c40f',champion:'#9b59b6',boss:'#ff0055'}[tier]||'#fff';
    for(let i=0;i<(tier==='champion'?12:tier==='elite'?8:5);i++){
      const ang=Math.random()*Math.PI*2;
      const spd=Math.random()*4+2;
      G.particles.push({
        x:e.x,y:e.y,
        vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        life:14+Math.random()*10, maxLife:24,
        size:Math.random()*3+1, color:sparkCol,
      });
    }

    // Ragdoll corpse — flies back from last bullet direction
    const corpseLife={normal:30,elite:40,champion:55,boss:70}[tier]||30;
    const corpseSpd={normal:3,elite:4.5,champion:6,boss:8}[tier]||3;
    const ang = e._killAngle !== undefined ? e._killAngle : Math.random()*Math.PI*2;
    if(G.corpses.length>20) G.corpses.shift();
    G.corpses.push({
      x:e.x, y:e.y,
      vx:Math.cos(ang)*corpseSpd*(Math.random()*0.5+0.75),
      vy:Math.sin(ang)*corpseSpd*(Math.random()*0.5+0.75),
      rot:Math.random()*Math.PI*2,
      rotSpd:(Math.random()-.5)*0.3,
      life:corpseLife, maxLife:corpseLife,
      w:e.w, h:e.h, type:e.type, tier,
    });

    // Die sound per tier
    if(tier==='boss')           SFX.play('bossDie');
    else if(tier==='champion')  SFX.play('enemyDieChampion');
    else if(tier==='elite')     SFX.play('enemyDieElite');
    else                        SFX.play('enemyDieNormal');

    // Shield recharge
    if(G.kills%5===0&&p.shield<3) p.shield++;
    this.spawnParticles(e.x,e.y,tier==='champion'?20:tier==='elite'?14:8,
      e.type==='boss'?'#ff0055':tier==='champion'?'#9b59b6':tier==='elite'?'#f1c40f':'#ff6a00');
  },

  // ── NOVA BLAST (tier-aware damage) ────────────────────────
  _fireNova(keys) {
    const G=this.state,p=G.player;
    const blastRange=p.atkRange*3;
    p.novaStored = Math.max(0, p.novaStored - 1); // consume 1 stored charge
    p.skillCooldown=60;
    p._novaBusy=true;
    setTimeout(()=>{ 
      p._novaBusy=false;
      if(GAME._pendingLevelUpAfterNova){
        GAME._pendingLevelUpAfterNova=false;
        GAME.triggerLevelUp();
      }
    }, 900);
    G.shake.timer=25;G.shake.intensity=9;
    SFX.play('novaBlast');

    for(let i=0;i<3;i++){
      G.novaRings.push({x:p.x,y:p.y,radius:10+i*20,speed:8+i*2,
        life:30-i*5,maxLife:30-i*5,
        color:i===0?'#ffffff':i===1?'#00d4ff':'#7b2fff'});
    }

    // Destroy enemies in range — queue level-ups to fire after blast
    let killed=0;
    G._pendingLevelUps = 0;
    const origLU=GAME.triggerLevelUp.bind(GAME);
    GAME.triggerLevelUp=()=>{ G._pendingLevelUps=(G._pendingLevelUps||0)+1; };

    p._novaFiring = true;
    try {
      G.enemies=G.enemies.filter(e=>{
        const dist=Math.sqrt((e.x-p.x)**2+(e.y-p.y)**2);
        if(dist<=blastRange){
          const S=ENEMIES.stats[e.type]||{tier:'normal'};
          const novaDmg=ENEMIES.getNovaDamage(S.tier,e.maxHp);
          e.hp-=novaDmg;
          this.spawnParticles(e.x,e.y,14,S.tier==='champion'?'#9b59b6':S.tier==='elite'?'#f1c40f':'#ff6a00');
          if(e.hp<=0){this._killEnemy(e);killed++;return false;}
          this.addDmg(e.x,e.y-20,Math.floor(novaDmg),'#00d4ff',8);
          e.hitTimer=12;
          return true;
        }
        return true;
      });
    } finally {
      // ALWAYS restore triggerLevelUp — even if an error occurred mid-blast
      GAME.triggerLevelUp=origLU;
      p._novaFiring = false;
    }

    // Restore and fire exactly one level-up screen (extras queued via xp)
    if(G._pendingLevelUps>0) GAME.triggerLevelUp();
    G._pendingLevelUps=0;
    if(keys) keys._spacePrev=true;

    this.spawnParticles(p.x,p.y,40,'#00d4ff');
    this.spawnParticles(p.x,p.y,20,'#ffffff');
    const suffix=killed>0?`${killed} KILLED`:'ENEMIES WEAKENED';
    this.announce(`⚡ NOVA BLAST — ${suffix}`,'#00d4ff',180,7,'top');
  },

  // ── WAVE MODIFIERS ────────────────────────────────────────
  _rollModifier() {
    const G=this.state, p=G.player;
    const mods = [
      {
        id:'cursed', icon:'👁', name:'CURSED WAVE',
        desc:'Enemies move 1.5x faster',
        color:'#9b59b6',
        apply: e=>{ e.speed*=1.5; },
      },
      {
        id:'bloodpact', icon:'🩸', name:'BLOOD PACT',
        desc:'Deal 2x dmg · Take 2x dmg',
        color:'#e74c3c',
        onStart: ()=>{ p._bloodPact=true; },
        onEnd:   ()=>{ p._bloodPact=false; },
      },
      {
        id:'eliterush', icon:'💀', name:'ELITE RUSH',
        desc:'Only elite & champion enemies',
        color:'#f1c40f',
        forceElite: true,
      },
      {
        id:'frenzy', icon:'⚡', name:'FRENZY',
        desc:'2x spawn rate · Enemies half HP',
        color:'#00d4ff',
        apply: e=>{ e.hp=Math.max(1,Math.floor(e.hp*0.5)); e.maxHp=e.hp; },
        spawnMult: 2,
      },
      {
        id:'armored', icon:'🛡', name:'IRON WAVE',
        desc:'All enemies start with armor',
        color:'#7f8c8d',
        apply: e=>{ e.shielded=true; e.shieldHits=2; },
      },
      {
        id:'bounty', icon:'💰', name:'BOUNTY WAVE',
        desc:'3x score this wave!',
        color:'#f1c40f',
        onStart: ()=>{ G.scoreMultiplier=3; },
      },
      {
        id:'darkness', icon:'🌑', name:'DARKNESS',
        desc:'Sight range greatly reduced',
        color:'#1a1a2e',
        darkness: true,
      },
    ];

    // Pick random — avoid repeating last modifier
    const choices = mods.filter(m=>m.id !== (G.modifier?.id));
    const mod = choices[Math.floor(Math.random()*choices.length)];

    // End previous modifier
    if(G.modifier?.onEnd) G.modifier.onEnd();

    G.modifier = mod;
    if(mod.onStart) mod.onStart();

    this.announce(`${mod.icon} ${mod.name}`, mod.color, 200, 7, 'top');
    this.announce(mod.desc, mod.color+'cc', 180, 6, 'top');
    G.shake.timer=15; G.shake.intensity=5;
  },

  // ── SPAWN ─────────────────────────────────────────────────
  spawnEnemy(forceType) {
    const G=this.state,p=G.player;
    const side=Math.floor(Math.random()*4);
    let x,y;
    if(side===0){x=p.x+(Math.random()*600-300);y=p.y-360;}
    else if(side===1){x=p.x+360;y=p.y+(Math.random()*600-300);}
    else if(side===2){x=p.x+(Math.random()*600-300);y=p.y+360;}
    else{x=p.x-360;y=p.y+(Math.random()*600-300);}
    x=Math.max(40,Math.min(G.worldW-40,x));
    y=Math.max(40,Math.min(G.worldH-40,y));

    // Elite rush modifier — force elite or champion type
    let type=forceType;
    // elite_forced = pick a random elite for the group rush
    if(type === 'elite_forced') type = ENEMIES.elitePool[Math.random()*ENEMIES.elitePool.length|0];
    if(!type){
      if(G.modifier?.forceElite && G.wave>=6){
        const r=Math.random();
        const pool=r<0.6?ENEMIES.elitePool:ENEMIES.championPool;
        type=pool[Math.floor(Math.random()*pool.length)];
      } else {
        type=ENEMIES.getSpawnType(G.wave);
      }
    }
    const S=ENEMIES.stats[type];
    if(!S) return;

    // ── SCALING DESIGN ─────────────────────────────────────────────────────
    // HP grows linearly per wave with no compound multiplier.
    // After wave 20 we add a small flat bonus (+4 HP per wave) instead of ×8% compound,
    // which was causing enemies to become unkillable walls past wave 25.
    // Damage is capped via Math.min so it never one-shots the player before wave 30+.
    const lateBonus = G.wave > 20 ? (G.wave - 20) * 4 : 0;
    const waveHp = (S.tier==='boss'     ? G.wave * 60  :
                    S.tier==='champion' ? G.wave * 14  :
                    S.tier==='elite'    ? G.wave * 7   :
                                         G.wave * 3.5 ) + lateBonus;
    const finalHp = S.hp + waveHp;

    // Enemy contact damage: grows slowly, hard-capped so even late-wave normals
    // can't one-shot the player (who has 100+ HP with upgrades).
    // Normal caps at 30, Elite at 45, Champion at 65, Boss at 80.
    const dmgCaps = { normal:30, elite:45, champion:65, boss:80 };
    const dmgCap  = dmgCaps[S.tier] || 30;
    const scaledDmg = Math.min(dmgCap, S.dmg + G.wave * 0.9);

    const abilityMap={
      skeleton:['throw'], knight:['charge'],
      orc:['throw'], wraith:['dodge'], warlock:['shield_allies'], berserker:['charge','enrage'],
      warlord:['throw','charge'], specter:['dodge'], lich:['shield_allies'], deathknight:['throw','charge'],
    };

    const enemy = {
      x,y,type,
      hp:finalHp, maxHp:finalHp,
      speed: S.speed + G.wave * 0.022 + (S.tier==='boss' ? G.wave*0.02 : 0),
      dmg:   scaledDmg,
      w:S.w, h:S.h,
      hitTimer:0,
      abilities:abilityMap[type]||[],
      abilityTimer:Math.random()*120|0,
      mageShield:false, mageShieldTimer:0,
      shielded:false, shieldHits:0,
      enraged:false, charging:false, chargeFrames:0,
      chargeTimer:0, teleTimer:0, cloaked:false,
    };

    // ── Chapter II stat multipliers ──────────────────────
    if(G.chapter >= 2) {
      const C2 = CFG.CHAPTER2;
      enemy.hp     = Math.floor(enemy.hp     * C2.HP_MULT);
      enemy.maxHp  = enemy.hp;
      enemy.speed *= C2.SPEED_MULT;
      enemy.dmg    = Math.floor(enemy.dmg    * C2.DMG_MULT);
    }

    // Apply current wave modifier to this enemy
    if(G.modifier?.apply) G.modifier.apply(enemy);

    G.enemies.push(enemy);
    if(type==='boss'){
      this.spawnParticles(x,y,20,'#ff0055');
      SFX.play('bossAlert');
      SFX.updateMusic(G.wave, true); // switch to glory on boss spawn
    }
  },

  spawnPowerupDrop(x,y){
    const L=CFG.LOOT;
    const kinds=['rage','ghost','time','magnet','nuke'];
    this.state.powerups.push({x,y,kind:kinds[Math.floor(Math.random()*kinds.length)],
      phase:Math.random()*Math.PI*2,life:L.POWERUP_LIFE*60,maxLife:L.POWERUP_LIFE*60});
  },

  spawnParticles(x,y,n,color){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,spd=Math.random()*3+1;
      this.state.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
        life:20+Math.random()*20,maxLife:40,size:Math.random()*4+2,color});
    }
  },

  addDmg(x,y,text,color,size=7,life=45){
    if(this.state.dmgNums.length>20) this.state.dmgNums.shift();
    this.state.dmgNums.push({x,y,text:String(text),color,size,life,maxLife:life});
  },

  triggerLevelUp(){
    const G=this.state;
    const p=G.player;
    // If nova is mid-blast, defer until it finishes
    if(p._novaBusy){
      GAME._pendingLevelUpAfterNova=true;
      return;
    }
    G.paused=true;
    this.spawnParticles(p.x,p.y,25,'#2ecc71');
    SFX.play('levelUp');
    UI.showLevelUp();
  },

  gameOver(){
    const G=this.state;
    if(!G.running) return; // already fired — prevent double-call
    G.running=false;
    // Clear aim state so the HUD indicator doesn't stay lit after death
    if(G.player){ G.player.aimActive=false; G.player.aimTarget=null; }
    SFX.stopMusic();
    PROFILE.recordRun(G.wave);
    const earned = META.addGold(G.player._goldEarned||0, G.wave, G.score);
    UI.showGameOver(G.score, G.wave, G.kills, earned);
  },

  // ============================================================
  //  CHAPTER TRANSITION SYSTEM
  // ============================================================

  // Called when wave 25 timer ends — fade enemies, spawn beacon
  _triggerChapterBeacon() {
    const G = this.state;
    G.enemyFadeOut = true;
    G._chapterTransitioning = true; // stop spawning
    G.paused = false; // keep running so fade animates

    // Announce
    this.announce('RIFT BEACON OPENING...', '#ffffff', 300, 8, 'top');
    this.announce('Find the light — enter it', '#aaaaff', 300, 6, 'bottom');

    // After 2s enemies are gone — spawn beacon at world center
    setTimeout(() => {
      G.enemies = [];
      G.enemyFadeOut = false;
      G._chapterTransitioning = false; // player can move, no spawns
      G.beaconX = G.worldW / 2;
      G.beaconY = G.worldH / 2;
      G.beaconActive = true;
      G.beaconPhase = 0;
      this.announce('⚡ ENTER THE RIFT', '#00d4ff', 400, 9, 'top');
    }, 2000);
  },

  // Called when player steps into beacon
  _beginChapterTransition() {
    const G = this.state;
    if(G._chapterTransitioning) return;
    G._chapterTransitioning = true;
    G.beaconActive = false;
    G.paused = false;
    // Start white fade-out
    G.chapterFadeDir = 1;
    G.chapterFade = 0;
    // Burst particles
    this.spawnParticles(G.beaconX, G.beaconY, 60, '#ffffff');
    G.shake.timer = 25; G.shake.intensity = 10;
  },

  // Called when chapterFade reaches 1.0 (screen is white)
  _onFadeComplete() {
    const G = this.state;
    G.running = false; // pause game loop drawing
    SFX.stopMusic();
    // Show chapter screen — weapon selection
    UI.showChapterTransition();
  },

  // Called by UI after weapon is chosen — starts Chapter II
  enterChapter2(weaponId) {
    const G = this.state;
    const p = G.player;
    const wDef = CFG.WEAPONS.find(w => w.id === weaponId);
    if(!wDef) return;

    // Apply weapon stats on top of current player stats
    p.weapon       = weaponId;
    p.weaponKills  = 0;
    p.masteryLevel = 0;
    p.dmg         *= wDef.stats.dmg;
    p.atkSpeed     = wDef.stats.atkSpeed * (p.atkSpeed / CFG.PLAYER.ATK_SPEED); // preserve meta bonuses proportionally
    p.multi        = Math.max(p.multi, wDef.stats.multi);
    p.piercing     = p.piercing || wDef.stats.piercing;
    p._bulletSpeed = wDef.stats.bulletSpeed || 6;
    p._homing      = wDef.stats.homing || false;
    p._orbiting    = wDef.stats.orbiting || false;
    p.bladeCount   = wDef.id === 'bladedancer' ? 2 : p.bladeCount;

    // Chapter II state
    G.chapter = 2;
    G.wave    = 1;
    G.waveTimer = 0;
    G._bossSpawnedThisWave = false;
    G.spawnRate = CFG.WAVE.SPAWN_RATE;
    G.modifier  = null;
    G.enemies   = [];
    G.bullets   = [];
    G.particles = [];
    G.dmgNums   = [];
    G.novaRings = [];
    G.beaconActive = false;
    G._chapterTransitioning = false;

    // Teleport player back to center
    p.x = G.worldW / 2;
    p.y = G.worldH / 2;

    // Restore camera
    G.camera.x = p.x - 400;
    G.camera.y = p.y - 300;

    // Start fade back IN (from white → gameplay)
    G.chapterFade = 1;
    G.chapterFadeDir = -1;
    G.running = true;

    SFX.updateMusic(1, false);
    this.announce('⚔ CHAPTER II — WAVE 1', '#e74c3c', 220, 10, 'top');
    this.announce(`${wDef.icon} ${wDef.name} EQUIPPED`, wDef.color, 200, 7, 'bottom');
    setTimeout(() => {
      this.announce('Enemies are stronger. Survive.', '#aaaaaa', 180, 6, 'bottom');
    }, 1800);
  },
};
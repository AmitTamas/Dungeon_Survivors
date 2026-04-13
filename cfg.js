// ============================================================
//  CONFIG.JS  —  EDIT THIS FILE TO TWEAK THE GAME
// ============================================================

const CFG = {

  WORLD_W: 1600,
  WORLD_H: 1200,
  TILE:     32,

  PLAYER: {
    HP:        100,
    SPEED:     2.5, 
    DMG:       12,
    ATK_SPEED: 0.9,
    ATK_RANGE: 90,
    MULTI:     1,
    MAGNET:    80,
    INVULN:    60,
  },

  WAVE: {
    DURATION:       20,
    SPAWN_RATE:     1.6,
    SPAWN_RATE_MIN: 0.5,   // never faster than this
    MAX_ENEMIES: window.innerWidth < 600 ? 15 : 25,    // base cap — scales up via EXTRA_PER_WAVE
    EXTRA_PER_WAVE: 2,     // ramp harder: wave 20 = 52, wave 40 = 92
  },

  // ── SPAWN MIX BY WAVE ────────────────────────────────────
  // Each tier replaces the previous gradually
  SPAWN_TIERS: [
    { wave:1,  normal:1.00, elite:0.00, champion:0.00 },
    { wave:6,  normal:0.60, elite:0.40, champion:0.00 },
    { wave:13, normal:0.20, elite:0.50, champion:0.30 },
    { wave:20, normal:0.05, elite:0.35, champion:0.60 },
    { wave:30, normal:0.00, elite:0.25, champion:0.75 }, // mostly champions
    { wave:40, normal:0.00, elite:0.10, champion:0.90 }, // near-pure champions
  ],

  // ── NOVA BLAST SCALING ────────────────────────────────────
  NOVA_KILLS: [
    { wave:1,  kills:5  },
    { wave:6,  kills:7  },
    { wave:13, kills:12 },
    { wave:20, kills:15 },
    { wave:26, kills:20 },
    { wave:32, kills:25 },
    { wave:40, kills:30 },
  ],
  // Nova damage as % of enemy max HP per tier
  NOVA_DAMAGE: {
    normal:    1.00,   // instant kill
    elite:     0.60,   // 60% HP burst
    champion:  0.40,   // 40% HP burst
    boss:      0.20,   // 20% HP burst
  },

  // ── LOOT ─────────────────────────────────────────────────
  LOOT: {
    GEM_LIFE:    7,    // was 12s — gems vanish in 7s, screen stays clean
    ORB_LIFE:    10,   // kept at 10s — health orbs are critical, players need time to reach them
    POWERUP_LIFE: 10,  // was 18s — powerups still give time to reach them
    BLINK_START: 0.35, // start fading sooner (35% life remaining)
    BLINK_FAST:  0.15, // fast blink at 15% — more visible warning
    MAX_GEMS:    40,
    MAX_ORBS:    3,
    MAX_POWERUPS:4,
    GEM_RATE: [
      { wave:1,  rate:1.0  },
      { wave:4,  rate:0.80 },
      { wave:9,  rate:0.65 },
      { wave:16, rate:0.50 },  // floor — gems never drop below 50% so level-ups keep coming
    ],
    ORB_BASE:        0.15,   // up from 0.10
    POWERUP_BASE:    0.22,   // up from 0.14 — noticeably more frequent
    DROP_WAVE_SCALE: 0.001,
    DROP_MIN:        0.09,   // up from 0.06 — late wave floor is higher
    // Wave bonus: extra drop chance added per wave tier to compensate
    // for enemies taking longer to kill at higher waves
    ORB_WAVE_BONUS: [
      { wave:10, bonus:0.02 },
      { wave:20, bonus:0.04 },
      { wave:30, bonus:0.06 },
    ],
    POWERUP_WAVE_BONUS: [
      { wave:10, bonus:0.02 },
      { wave:20, bonus:0.05 },
      { wave:30, bonus:0.08 },
    ],
  },

  POWERUP_DURATION: 8,
  LAST_STAND_DURATION: 8,

  UPGRADES: [
    { icon:'❤', name:'LIFE SURGE',   desc:'+30 Max HP · Full heal',        apply:p=>{p.maxHp+=30;p.hp=p.maxHp;} },
    { icon:'⚔', name:'SHARP BLADE',  desc:'Damage +5',                     apply:p=>{p.dmg+=5;} },
    { icon:'💨', name:'SWIFT BOOTS',  desc:'Speed +0.5',                    apply:p=>{p.speed+=0.5;} },
    { icon:'🏹', name:'RAPID FIRE',   desc:'Attack Speed x1.3 (max 3.0)',   apply:p=>{p.atkSpeed=Math.min(3.0,p.atkSpeed*1.3);} },
    { icon:'🎯', name:'EAGLE EYE',    desc:'Range +30',                     apply:p=>{p.atkRange+=30;} },
    { icon:'↔', name:'MULTI SHOT',   desc:'+1 Bullet per attack (max 5)',  apply:p=>{p.multi=Math.min(5,p.multi+1);} },
    { icon:'🧲', name:'GEM MAGNET',   desc:'Pickup range x2',               apply:p=>{p.magnet*=2;} },
    { icon:'🛡', name:'IRON SHIELD',  desc:'Block 1 hit (refills x5kills)', apply:p=>{p.shield+=1;} },
    { icon:'🔥', name:'FIRE AMMO',    desc:'Bullets pierce enemies',        apply:p=>{p.piercing=true;} },
    { icon:'⚡', name:'CHAIN BOLT',   desc:'+2 Bullets (cap 5), +15% spd', apply:p=>{p.multi=Math.min(5,p.multi+2);p.speed*=1.15;} },
    { icon:'🍀', name:'LUCKY DROP',   desc:'2x Health orb drop chance',     apply:p=>{p.luckMod=(p.luckMod||1)*2;} },
    { icon:'💀', name:'DEATH MARK',   desc:'Every 10th hit = instant kill', apply:p=>{p.deathMark=true;} },
  ],

  COLORS: {
    floor1:'#1a1a2e', floor2:'#16213e',
    wall:'#0f3460',   wallTop:'#0d2d50',
    bullet:'#fff176', 
    // xpGem:'#2ecc71', //rhis one is old color for gem
    xpGem:'#00d4ff', // <-- rhis one is new color for gem  
    xpGemD:'#1a8a4a',
    healthOrb:'#e74c3c', particle:'#ff6a00',
    player:'#00d4ff', playerD:'#0099bb',
    sword:'#f1c40f',  dmg:'#ff4444',    heal:'#2ecc71',
  },

  // ── META SHOP ─────────────────────────────────────────────
  // Each upgrade: maxLevel, costs per level, effect applied to player on run start
  META_UPGRADES: [
    { id:'vitality',    icon:'❤',  name:'VITALITY',      desc:'+15 Max HP per level',
      costs:[80,150,250,400,600],   maxLevel:5,
      apply:(p,lvl)=>{ p.maxHp+=lvl*15; p.hp=p.maxHp; } },
    { id:'battle',      icon:'⚔',  name:'BATTLE HARDENED',desc:'+3 Damage per level',
      costs:[60,120,200,320,500],   maxLevel:5,
      apply:(p,lvl)=>{ p.dmg+=lvl*3; } },
    { id:'swift',       icon:'👟', name:'SWIFT FEET',     desc:'+0.2 Speed per level',
      costs:[70,140,230,360,550],   maxLevel:5,
      apply:(p,lvl)=>{ p.speed+=lvl*0.2; } },
    { id:'magnet',      icon:'🧲', name:'SOUL MAGNET',    desc:'+20 Pickup range per level',
      costs:[50,100,170,270,420],   maxLevel:5,
      apply:(p,lvl)=>{ p.magnet+=lvl*20; } },
    { id:'shield',      icon:'🛡', name:'IRON WILL',      desc:'Start with +1 shield per level',
      costs:[100,200,350,550,800],  maxLevel:5,
      apply:(p,lvl)=>{ p.shield+=lvl; } },
    { id:'nova',        icon:'⚡', name:'NOVA MASTERY',   desc:'-1 kill for Nova per level',
      costs:[120,240,400,600,900],  maxLevel:5,
      apply:()=>{ /* handled in META.applyToPlayer — reads level directly */ } },
    { id:'fortune',     icon:'🍀', name:'FORTUNE',        desc:'+15% drop rates per level',
      costs:[80,160,270,420,640],   maxLevel:5,
      apply:(p,lvl)=>{ p.luckMod=(p.luckMod||1)+(lvl*0.15); } },
    { id:'marksman',    icon:'🏹', name:'MARKSMAN',       desc:'+10 Attack range per level',
      costs:[60,120,200,320,480],   maxLevel:5,
      apply:(p,lvl)=>{ p.atkRange+=lvl*10; } },
    { id:'goldrush',    icon:'💰', name:'GOLD RUSH',      desc:'+20% gold earned per level',
      costs:[90,180,300,470,700],   maxLevel:5,
      apply:()=>{ /* handled in _calcGold */ } },
    { id:'secondwind',  icon:'🔄', name:'SECOND WIND',    desc:'Last Stand triggers +1 more time',
      costs:[200,400,700,1100,1600],maxLevel:5,
      apply:()=>{ /* handled in META.applyToPlayer — lastStandCharges = 1 + lvl */ } },
  ],

  // Gold formula: (kills*2 + wave*10 + floor(score*0.01)) / 10
  // Divided by 10: good runs earn ~100-165 gold, avg ~70, short ~20
  calcGold(killGold, wave, score, goldRushLvl=0) {
    // killGold = pre-summed tier gold from _killEnemy
    const base = killGold + wave*15;
    return Math.max(1, Math.floor(base * (1 + goldRushLvl*0.2)));
  },

  // ── CHAPTER II ─────────────────────────────────────────
  CHAPTER2: {
    HP_MULT:    1.5,
    SPEED_MULT: 1.25,
    DMG_MULT:   1.3,
    BEACON: { RADIUS: 22, PULSE_SPEED: 0.05 },
  },

  // ── WEAPONS (Chapter II) ──────────────────────────────
  WEAPONS: [
    {
      id: 'crossbow', icon: '🏹', name: 'CROSSBOW',
      subtitle: 'PRECISION HUNTER',
      desc: 'Fires a powerful bolt that pierces all enemies. Slower fire rate, very high damage.',
      color: '#f1c40f',
      stats: { dmg: 1.8, atkSpeed: 0.65, multi: 1, piercing: true, bulletSpeed: 9 },
      mastery: [
        { kills:  50, bonus: 'Double bolt — fires 2 bolts per shot',   apply: function(p){ p.multi = Math.min(p.multi+1,3); } },
        { kills: 150, bonus: 'Exploding tip — AoE burst on kill',      apply: function(p){ p.crossbowExplode = true; } },
        { kills: 350, bonus: 'Phantom bolt — 1 extra ghost shot',      apply: function(p){ p.phantomBolt = true; } },
      ],
    },
    {
      id: 'grimoire', icon: '📖', name: 'GRIMOIRE',
      subtitle: 'DARK ARCANA',
      desc: 'Launches homing orbs that seek enemies automatically. Moderate damage, never misses.',
      color: '#9b59b6',
      stats: { dmg: 1.4, atkSpeed: 1.1, multi: 1, piercing: false, bulletSpeed: 3, homing: true },
      mastery: [
        { kills:  50, bonus: 'Split orb — orb splits into 3 on hit',   apply: function(p){ p.grimoireSplit = true; } },
        { kills: 150, bonus: 'Soul drain — each hit restores 1 HP',    apply: function(p){ p.soulDrain = true; } },
        { kills: 350, bonus: 'Chaos storm — +2 orbs per cast',         apply: function(p){ p.multi = Math.min(p.multi+2,5); } },
      ],
    },
    {
      id: 'bladedancer', icon: '⚔️', name: 'BLADE DANCER',
      subtitle: 'WHIRLING STEEL',
      desc: 'Throws spinning blades in all directions. Each blade pierces multiple enemies.',
      color: '#e74c3c',
      stats: { dmg: 1.1, atkSpeed: 1.4, multi: 2, piercing: true, bulletSpeed: 5, orbiting: true },
      mastery: [
        { kills:  50, bonus: '+2 blades per shot',                          apply: function(p){ p.multi = Math.min(p.multi+2,6); } },
        { kills: 150, bonus: 'Bleed — blades slow & damage over time', apply: function(p){ p.bladeBleed = true; } },
        { kills: 350, bonus: 'Tornado — blades spin faster & wider',   apply: function(p){ p.bladeTornado = true; } },
      ],
    },
  ],
};

// ============================================================
//  META.JS  —  PERSISTENT PROGRESSION
//  Gold · Shop levels · Apply bonuses to player on run start
// ============================================================

const META = {

  // ── LOAD / SAVE ───────────────────────────────────────────
  _key: 'ds_meta_v1',

load() {
    if(this._cache) return this._cache;
    const stored = DB.get(this._key);
    this._cache = stored ? Object.assign(this._default(), stored) : this._default();
    return this._cache;
  },

  save(data) {
    this._cache = data;
    DB.set(this._key, data);
    setTimeout(()=>{ this._cache=null; }, 0);
  },

  _default() {
    const levels = {};
    CFG.META_UPGRADES.forEach(u => levels[u.id]=0);
    return { gold:0, levels };
  },

  // ── GOLD ─────────────────────────────────────────────────
  addGold(kills, wave, score) {
    const data = this.load();
    const goldRushLvl = data.levels['goldrush']||0;
    const earned = CFG.calcGold(kills, wave, score, goldRushLvl);
    data.gold += earned;
    this.save(data);
    return earned;
  },

  getGold() { return this.load().gold; },

  // ── SHOP ─────────────────────────────────────────────────
  canAfford(upgradeId) {
    const data = this.load();
    const upg  = CFG.META_UPGRADES.find(u=>u.id===upgradeId);
    if(!upg) return false;
    const lvl  = data.levels[upgradeId]||0;
    if(lvl>=upg.maxLevel) return false;
    return data.gold >= upg.costs[lvl];
  },

  purchase(upgradeId) {
    const data = this.load();
    const upg  = CFG.META_UPGRADES.find(u=>u.id===upgradeId);
    if(!upg) return false;
    const lvl  = data.levels[upgradeId]||0;
    if(lvl>=upg.maxLevel) return false;
    const cost = upg.costs[lvl];
    if(data.gold < cost) return false;
    data.gold -= cost;
    data.levels[upgradeId] = lvl+1;
    this.save(data);
    return true;
  },

  // ── APPLY TO PLAYER (call after GAME.init()) ─────────────
  applyToPlayer(player) {
    const data = this.load();
    CFG.META_UPGRADES.forEach(upg => {
      const lvl = data.levels[upg.id]||0;
      if(lvl>0) upg.apply(player, lvl);
    });
    // Nova mastery: reduce kills needed directly from saved level (not from player.novaBonus)
    // This is safe across multiple restarts — always reads from storage, never accumulates.
    const novaLvl = data.levels['nova']||0;
    if(novaLvl > 0) {
      player.novaKillsNeeded = Math.max(1, player.novaKillsNeeded - novaLvl);
    }
    // Last stand charges set directly here — secondwind's apply() also sets it,
    // but we keep this as the single source of truth to avoid double-stacking.
    const secondWindLvl = data.levels['secondwind']||0;
    player.lastStandCharges = 1 + secondWindLvl;
  },

  // ── RESET (debug only) ───────────────────────────────────
  reset() { DB.set(this._key, this._default()); },
};


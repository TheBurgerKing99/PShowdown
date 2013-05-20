exports.BattleItems = {
        "nevermeltice": {
  	            id: "nevermeltice",
		            name: "NeverMeltIce",
		            spritenum: 305,
		            fling: {
			                  basePower: 30
		            },
		            onWeather: function(target, source, effect) {
			                  if (effect.id === 'hail') {
				                        this.heal(target.maxhp/16);
			                  }
		            },
		            onImmunity: function(type, pokemon) {
			                  if (type === 'hail') return false;
		            },
		            desc: "If Hail is active, this Pokemon heals 1/16 of its max HP each turn; immunity to Hail.",
	      },
        "quickpowder": {
  	            id: "quickpowder",
		            name: "Quick Powder",
		            spritenum: 374,
		            fling: {
			                  basePower: 10
		            },
		            onModifySpe: function(spe) {
			                  return spe * 1.1;
		            },
		            desc: "Boosts Speed by 10%."
	      }
};

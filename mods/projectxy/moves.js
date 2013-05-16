exports.BattleMovedex = {
    stealthrock: {
      		inherit: true,
      		effect: {
          	// this is a side condition
          	onStart: function(side) {
              		this.add('-sidestart',side,'move: Stealth Rock');
         	},
          	onSwitchIn: function(pokemon) {
              		var typeMod = this.getEffectiveness('Rock', pokemon);
              		var factor = 8;
              		if (typeMod == 1) factor = 4;
              		if (typeMod >= 2) factor = 4;
              		if (typeMod == -1) factor = 16;
              		if (typeMod <= -2) factor = 32;
                  	//below are the original Stealth Rock factors and such
  				   	  //if (typeMod == 1) factor = 4;
				          //if (typeMod >= 2) factor = 2;
				          //if (typeMod == -1) factor = 16;
				          //if (typeMod <= -2) factor = 32;
              		var damage = this.damage(pokemon.maxhp/factor);
          		}
      		}
  	},
  	"lockon": {
		num: 199,
		accuracy: true,
		basePower: 0,
		category: "Status",
		desc: "The user locks on to its target, boosting its Special Attack and accuracy by one stage.",
		shortDesc: "Boosts SpA and accuracy.",
		id: "lockon",
		name: "Lock-On",
		pp: 20,
		priority: 0,
		isSnatchable: true,
		boosts: {
			spa: 1,
			accuracy: 1
		},
		secondary: false,
		target: "self",
		type: "Normal"
	},
	"howl": {
		num: 336,
		accuracy: true,
		basePower: 0,
		category: "Status",
		desc: "Raises the user's Attack by 2 stages.",
		shortDesc: "Boosts the user's Atk by 2.",
		id: "howl",
		isViable: true,
		name: "Howl",
		pp: 20,
		priority: 0,
		isSnatchable: true,
		boosts: {
			atk: 2
		},
		secondary: false,
		target: "self",
		type: "Normal"
	},
	"lunardance": {
		num: 461,
		accuracy: true,
		basePower: 0,
		category: "Status",
		desc: "The user surrounds itself in lunar energy, boosting its Special Attack and Speed.",
		shortDesc: "Boosts SpA and Speed by one stage.",
		id: "lunardance",
		isViable: true,
		name: "Lunar Dance",
		pp: 20,
		priority: 0,
		isSnatchable: true,
		boosts: {
			spa: 1,
			spe: 1
		},
		secondary: false,
		target: "self",
		type: "Psychic"
	},
	"meditate": {
		num: 96,
		accuracy: true,
		basePower: 0,
		category: "Status",
		desc: "Raises the user's Attack and Special Defense by 1 stage.",
		shortDesc: "Boosts the user's Attack and Special Defense by 1.",
		id: "meditate",
		isViable: true,
		name: "Meditate",
		pp: 20,
		priority: 0,
		isSnatchable: true,
		boosts: {
			atk: 1,
			spd: 1
		},
		secondary: false,
		target: "self",
		type: "Psychic"
	},
	"heatwave": {
		num: 257,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		desc: "Deals damage to a foe while activating Sunny Day.",
		shortDesc: "Damages and activates Sunny Day.",
		id: "heatwave",
		isViable: true,
		name: "Heat Wave",
		pp: 10,
		priority: 0,
		onHit: function(source) {
			this.setWeather('sunnyday');
			this.weatherData.duration = 5;
		},
		secondary: false,
		target: "normal",
		type: "Fire"
	},
	"icywind": {
		num: 196,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		desc: "Deals damage to all adjacent foes with a 100% chance to lower their Speed by 1 stage each.",
		shortDesc: "100% chance to lower the foe(s) Speed by 1.",
		id: "icywind",
		name: "Icy Wind",
		pp: 10,
		priority: 0,
		onHit: function(source) {
			this.setWeather('hail');
			this.weatherData.duration = 5;
		},
		secondary: false,
		target: "normal",
		type: "Ice"
	},
	"sandattack": {
		num: 28,
		accuracy: 100,
		basePower: 80,
		category: "Physical",
		desc: "Lowers one adjacent target's accuracy by 1 stage. Pokemon protected by Magic Coat or the Ability Magic Bounce are unaffected and instead use this move themselves.",
		shortDesc: "Lowers the target's accuracy by 1.",
		id: "sandattack",
		name: "Sand-Attack",
		pp: 10,
		priority: 0,
		onHit: function(source) {
			this.setWeather('sandstorm');
			this.weatherData.duration = 5;
		},
		secondary: false,
		target: "normal",
		type: "Ground"
	},
	"soak": {
		num: 487,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		desc: "Causes one adjacent target to become a Water-type. Fails if the target is an Arceus. Pokemon protected by Magic Coat or the Ability Magic Bounce are unaffected and instead use this move themselves.",
		shortDesc: "Changes the target's type to Water.",
		id: "soak",
		name: "Soak",
		pp: 10,
		priority: 0,
		onHit: function(source) {
			this.setWeather('raindance');
			this.weatherData.duration = 5;
		},
		secondary: false,
		target: "normal",
		type: "Water"
	}
};

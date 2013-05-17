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
	//DEBUG NOTE: The following four moves do NOT summon weather if they hit a Substitute instead of the actual pokemon, I will fix this later, since it the big picture it is not a priority.
	"heatwave": {
		num: 257,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		desc: "Deals damage to one adjacent target and will activate Sunny Day if it hits.",
		shortDesc: "Activates sun if it hits.",
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
		desc: "Deals damage to one adjacent target and will activate Hail if it hits.",
		shortDesc: "Activates hail if it hits.",
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
		desc: "Deals damage to one adjacent target and will activate Sandstorm if it hits.",
		shortDesc: "Activates sand if it hits.",
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
		desc: "Deals damage to one adjacent target and will activate Rain Dance if it hits.",
		shortDesc: "Activates rain if it hits.",
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
	},
	magmastorm: {
		inherit: true,
		basePower: 100,
		accuracy: 100
	},
	"spikecannon": {
		num: 131,
		accuracy: 100,
		basePower: 20,
		category: "Physical",
		desc: "Deals damage to one adjacent target and scatters Spikes on the opposing side if it hits.",
		shortDesc: "Scatters Spikes on the opposing side of the field if it successfully hits.",
		id: "spikecannon",
		name: "Spike Cannon",
		pp: 15,
		priority: 0,
		sideCondition: 'spikes',
		secondary: false,
		target: "normal",
		type: "Ground"
	},
	"payday": {
		num: 6,
		accuracy: 100,
		basePower: 20,
		category: "Physical",
		desc: "Always crits and deals damage in two seperate hits to one adjacent target.",
		shortDesc: "Damages twice with a 100% crit rate.",
		id: "payday",
		name: "Pay Day",
		pp: 20,
		priority: 0,
		willCrit: true,
		multihit: 2,
		onHit: function() {
			this.add('-fieldactivate', 'move: Pay Day');
		},
		secondary: false,
		target: "normal",
		type: "Normal"
	},
};

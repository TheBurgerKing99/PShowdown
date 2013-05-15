exports.BattleAbilities = {  
  	"persistent": {
  	      	 desc: "Increases the duration of many field effects by two turns when used by this Pokémon.",
		 shortDesc: "The duration of certain field effects is increased by 2 turns if used by this Pokemon.",
		 id: "persistent",
		 isNonstandard: false,
		 name: "Persistent",
		 // implemented in the corresponding move
		 rating: 4,
		 num: -4
	},
  	"gravitation": {
  		desc: "Summons a 5-turn Gravity upon switch in.",
  		shortDesc: "Summons 5 turn Auto-Gravity.",
  		id: "gravitation",
  		name: "Gravitation",
		onStart: function(source) {
        		this.debug("Starting Gravity");
        		this.addPseudoWeather('gravity');
        		this.pseudoWeather['gravity'].duration = 5;
           	},
		rating: 4,
		num: 1000
  	},
  	"trickster": {
  		desc: "Summons a 5-turn Trick Room upon switch in.",
  		shortDesc: "Summons 5 turn Auto-Trick Room.",
  		id: "trickster",
  		name: "Trickster",
		onStart: function(source) {
        		this.debug("Starting Trick Room");
        		if (this.pseudoWeather['trickroom']) {
            			this.removePseudoWeather('trickroom', pokemon, pokemon);
        		}
        		this.addPseudoWeather('trickroom');
        		this.pseudoWeather['trickroom'].duration = 5;
           	},
		rating: 4,
		num: 1001
  	},
  	"chlorophyll": {
		desc: "If this Pokemon is active while Sunny Day is in effect, its speed is temporarily doubled.",
		shortDesc: "If Sunny Day is active, this Pokemon's Speed is doubled.",
		onModifySpe: function(spe) {
			if (this.isWeather('sunnyday')) {
				return spe * 1.5;
			}
		},
		id: "chlorophyll",
		name: "Chlorophyll",
		rating: 2,
		num: 34
 	},
 	"arcticrush": {
		desc: "If this Pokemon is active while Hail is in effect, its speed is temporarily increased and this Pokemon is not hurt by hail",
		shortDesc: "If Hail is active, this Pokemon's Speed is increased and hail does not damage this Pokemon",
		onModifySpe: function(spe) {
			if (this.isWeather('hail')) {
				return spe * 1.5;
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'hail') return false;
		},
		id: "arcticrush",
		name: "Arctic Rush",
		rating: 2,
		num: 1002
	},
	"sandrush": {
		desc: "Increases Speed in a Sandstorm, and makes the Pokemon immune to Sandstorm damage.",
		shortDesc: "If Sandstorm is active, this Pokemon's Speed is increased; immunity to Sandstorm.",
		onModifySpe: function(spe, pokemon) {
			if (this.isWeather('sandstorm')) {
				return spe * 1.5;
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		id: "sandrush",
		name: "Sand Rush",
		rating: 2,
		num: 146
	},
	"swiftswim": {
		desc: "If this Pokemon is active while Rain Dance is in effect, its speed is temporarily increased.",
		shortDesc: "If Rain Dance is active, this Pokemon's Speed is increased.",
		onModifySpe: function(spe, pokemon) {
			if (this.isWeather('raindance')) {
				return spe * 1.5;
			}
		},
		id: "swiftswim",
		name: "Swift Swim",
		rating: 2,
		num: 33
	},
	"solarpower": {
		desc: "If this Pokemon is active while Sunny Day is in effect, its Special Attack temporarily receives a 30% boost.",
		shortDesc: "If Sunny Day is active, this Pokemon's Sp. Atk is x1.3.",
		onModifySpA: function(spa, pokemon) {
			if (this.isWeather('sunnyday')) {
				return spa * 1.3;
			}
		},
		id: "solarpower",
		name: "Solar Power",
		rating: 2,
		num: 94
	},
	"waterveil": {
		desc: "If this Pokemon is active while Rain Dance is in effect, its Special Attack temporarily receives a 30% boost.",
		shortDesc: "If Rain Dance is active, this Pokemon's Sp. Atk is x1.3.",
		onModifySpA: function(spa, pokemon) {
			if (this.isWeather('raindance')) {
				return spa * 1.3;
			}
		},
		id: "waterveil",
		name: "Water Veil",
		rating: 2,
		num: 41
	},
	"sandforce": {
		desc: "If this Pokemon is active while Sandstorm is in effect, its Attack temporarily receives a 30% boost.",
		shortDesc: "If Sandstorm is active, this Pokemon's Atk is x1.3.",
		onModifyAtk: function(atk, pokemon) {
			if (this.isWeather('sandstorm')) {
				return atk * 1.3;
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		id: "sandforce",
		name: "Sand Force",
		rating: 2,
		num: 159
	},
	"snowcloak": {
		desc: "If this Pokemon is active while Hail is in effect, its Special Attack temporarily receives a 30% boost.",
		shortDesc: "If Hail is active, this Pokemon's Sp. Atk is x1.3.",
		onModifySpA: function(spa, pokemon) {
			if (this.isWeather('hail')) {
				return spa * 1.3;
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'hail') return false;
		},
		id: "snowcloak",
		name: "Snow Cloak",
		rating: 2,
		num: 81
	},
	"icebody": {
		desc: "If active while Hail is in effect, this Pokemon recovers one-twelfth of its max HP after each turn. If a non-Ice-type Pokemon receives this ability through Skill Swap, Role Play or the Trace ability, it will not take damage from Hail.",
		shortDesc: "If Hail is active, this Pokemon heals 1/12 of its max HP each turn; immunity to Hail.",
		onWeather: function(target, source, effect) {
			if (effect.id === 'hail') {
				this.heal(target.maxhp/12);
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'hail') return false;
		},
		id: "icebody",
		name: "Ice Body",
		rating: 3,
		num: 115
	},
	"sandveil": {
		desc: "If active while Sandstorm is in effect, this Pokemon recovers one-twelfth of its max HP after each turn. If a non-Ice-type Pokemon receives this ability through Skill Swap, Role Play or the Trace ability, it will not take damage from Sandstorm.",
		shortDesc: "If Sandstorm is active, this Pokemon heals 1/12 of its max HP each turn; immunity to Sandstorm.",
		onWeather: function(target, source, effect) {
			if (effect.id === 'sandstorm') {
				this.heal(target.maxhp/12);
			}
		},
		onImmunity: function(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		id: "sandveil",
		name: "Sand Veil",
		rating: 3,
		num: 8
	},
	"raindish": {
		desc: "If active while Hail is in effect, this Pokemon recovers one-twelfth of its max HP after each turn.",
		shortDesc: "If Hail is active, this Pokemon heals 1/12 of its max HP each turn.",
		onWeather: function(target, source, effect) {
			if (effect.id === 'raindance') {
				this.heal(target.maxhp/12);
			}
		},
		id: "raindish",
		name: "Rain Dish",
		rating: 3,
		num: 44
	}
};

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
  }
};

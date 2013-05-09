/* to reload chat commands:

>> for (var i in require.cache) delete require.cache[i];parseCommand = require('./chat-commands.js').parseCommand;''

*/

var crypto = require('crypto');

/**
 * `parseCommand`. This is the function most of you are interested in,
 * apparently.
 *
 * `message` is exactly what the user typed in.
 * If the user typed in a command, `cmd` and `target` are the command (with "/"
 * omitted) and command target. Otherwise, they're both the empty string.
 *
 * For instance, say a user types in "/foo":
 * cmd === "/foo", target === "", message === "/foo bar baz"
 *
 * Or, say a user types in "/foo bar baz":
 * cmd === "foo", target === "bar baz", message === "/foo bar baz"
 *
 * Or, say a user types in "!foo bar baz":
 * cmd === "!foo", target === "bar baz", message === "!foo bar baz"
 *
 * Or, say a user types in "foo bar baz":
 * cmd === "", target === "", message === "foo bar baz"
 *
 * `user` and `socket` are the user and socket that sent the message,
 * and `room` is the room that sent the message.
 *
 * Deal with the message however you wish:
 *   return; will output the message normally: "user: message"
 *   return false; will supress the message output.
 *   returning a string will replace the message with that string,
 *     then output it normally.
 *
 */

var modlog = modlog || fs.createWriteStream('logs/modlog.txt', {flags:'a+'});
var updateServerLock = false;
//Some test chat commands
var roulbets = [];
var roulon = false;
var roulprize = 50;

var triviabonus = 1;
var tourbonus = 1;


var tourActive = false;
var tourSigyn = false;
var tourBracket = [];
var tourSignup = [];
var tourTier = '';
var tourRound = 0;
var tourSize = 0;
var tourMoveOn = [];
var tourRoundSize = 0;

var tourTierList = ['OU','UU','RU','NU','Random Battle','Ubers','Tier Shift','Challenge Cup 1-vs-1','Hackmons','Balanced Hackmons','LC','Smogon Doubles','Doubles Random Battle','Doubles Challenge Cup','Glitchmons'];
var tourTierString = '';
for (var i = 0; i < tourTierList.length; i++) {
	if ((tourTierList.length - 1) > i) {
	tourTierString = tourTierString + tourTierList[i] + ', ';
	} else {
	tourTierString = tourTierString + tourTierList[i];
	}
}
	
var allMoney = new Array();
//NOTE: THE BELOW CODE WILL AUTOMATICALLY IMPORT CASHMONEYDATAS.  CHANGE TO FALSE
var importMoney = true;

if (importMoney = true) {
	restoreMoneySync();
}

function parseCommandLocal(user, cmd, target, room, socket, message) {
	if (!room) return;
	switch (cmd) {
	case 'cmd':
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex+1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {
			if (!room) return false;
			var targetUser = Users.get(target);
			if (!targetUser) {
				emit(socket, 'command', {
					command: 'userdetails',
					userid: toId(target),
					rooms: false
				});
				return false;
			}
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i==='global') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1?' '+battle.p1:'';
					roomData.p2 = battle.p2?' '+battle.p2:'';
				}
				roomList[i] = roomData;
			}
			if (!targetUser.roomCount['global']) roomList = false;
			var userdetails = {
				command: 'userdetails',
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList,
				room: room.id
			};
			if (user.can('ip', targetUser)) {
				var ips = Object.keys(targetUser.ips);
				if (ips.length === 1) {
					userdetails.ip = ips[0];
				} else {
					userdetails.ips = ips;
				}
			}
			emit(socket, 'command', userdetails);
		} else if (cmd === 'roomlist') {
			emit(socket, 'command', {
				command: 'roomlist',
				rooms: Rooms.global.getRoomList(true),
				room: 'lobby'
			});
		}
		return false;
		break;

/tour commands
	case 'tour':
	case 'starttour':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tourActive || tourSigyn) {
			emit(socket, 'console', 'There is already a tournament running, or there is one in a signup phase.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', 'Proper syntax for this command: /tour tier, size');
			return false;
		}
		var targets = splittyDiddles(target);
		var tierMatch = false;
		for (var i = 0; i < tourTierList.length; i++) {
			if ((targets[0]) == tourTierList[i]) {
			tierMatch = true;
			}
		}
		if (!tierMatch) {
			emit(socket, 'console', 'Please use one of the following tiers: ' + tourTierString);
			return false;
		}
		targets[1] = parseInt(targets[1]);
		if (isNaN(targets[1])) {
			emit(socket, 'console', 'Proper syntax for this command: /tour tier, size');
			return false;
		}
		if (targets[1] < 4) {
			emit(socket, 'console', 'Tournaments must contain 4 or more people.');
			return false;
		}
		
		tourTier = targets[0];
		tourSize = targets[1];
		tourSigyn = true;
		tourSignup = [];		
		
		room.addRaw('<h2><font color="green">' + sanitize(user.name) + ' has started a ' + tourTier + ' Tournament.</font> <font color="red">/j</font> <font color="green">to join!</font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + tourSize + '<br /><font color="blue"><b>TIER:</b></font> ' + tourTier + '<hr />');
		
		return false;
		break;
		/*
	case 'oriwinners':
		emit(socket, 'console', tourMoveOn + ' --- ' + tourBracket);
		return false;
		break;
		*/
	case 'toursize':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (!tourSigyn) {
			emit(socket, 'console', 'The tournament size cannot me changed now!');
			return false;
		}
		if (!target) {
			emit(socket, 'console', 'Proper syntax for this command: /toursize, size');
			return false;
		}
		target = parseInt(target);
		if (isNaN(target)) {
			emit(socket, 'console', 'Proper syntax for this command: /tour tier, size');
			return false;
		}
		if (target < 4) {
			emit(socket, 'console', 'A tournament must have at least 4 people in it.');
			return false;
		}
		if (target < tourSignup.length) {
			emit(socket, 'console', 'You can\'t boot people from a tournament like this.');
			return false;
		}
		tourSize = target;
		room.addRaw('<b>' + user.name + '</b> has changed the tournament size to: '+ tourSize +'. <b><i>' + (tourSize - tourSignup.length) + ' slots remaining.</b></i>');
		if(tourSize == tourSignup.length) {
			beginTour();
		}
		return false;
		break;
		
	case 'jointour':
	case 'jt':
	case 'j':
		if ((!tourSigyn) || tourActive) {
			emit(socket, 'console', 'There is already a tournament running, or there is not any tournament to join.');
			return false;
		}
		var tourGuy = user.userid;
		if (addToTour(tourGuy)) {
			room.addRaw('<b>' + user.name + '</b> has joined the tournament. <b><i>' + (tourSize - tourSignup.length) + ' slots remaining.</b></i>');
			if(tourSize == tourSignup.length) {
				beginTour();
			}
		} else {
			emit(socket, 'console', 'You could not enter the tournament.  You may already be in the tournament  Type /lt if you want to leave the tournament.');
		}
		return false;
		break;
	
	case 'leavetour':
	case 'lt':
		if ((!tourSigyn) && (!tourActive)) {
			emit(socket, 'console', 'There is no tournament to leave.');
			return false;
		}
		var spotRemover = false;
		if (tourSigyn) {
			for(var i=0;i<tourSignup.length;i++) {
				//emit(socket, 'console', tourSignup[1]);
				if (user.userid === tourSignup[i]) {
					tourSignup.splice(i,1);
					spotRemover = true;
					}
				}
			if (spotRemover) {
				room.addRaw('<b>' + user.name + '</b> has left the tournament. <b><i>' + (tourSize - tourSignup.length) + ' slots remaining.</b></i>');
			}
		} else if (tourActive) {
			var tourBrackCur;
			var tourDefWin;
			for(var i=0;i<tourBracket.length;i++) {
					tourBrackCur = tourBracket[i];
					if (tourBrackCur[0] == user.userid) {
						tourDefWin = Users.get(tourBrackCur[1]);
						if (tourDefWin) {
							spotRemover = true;
							tourDefWin.tourRole = 'winner';
							tourDefWin.tourOpp = '';
							user.tourRole = '';
							user.tourOpp = '';
						}
					}
					if (tourBrackCur[1] == user.userid) {
						tourDefWin = Users.get(tourBrackCur[0]);
						if (tourDefWin) {
							spotRemover = true;
							tourDefWin.tourRole = 'winner';
							tourDefWin.tourOpp = '';
							user.tourRole = '';
							user.tourOpp = '';
						}
					}
				}
			if (spotRemover) {
				room.addRaw('<b>' + user.name + '</b> has left the tournament. <b><i>');
			}
		}
		if (!spotRemover) {
			emit(socket, 'console', 'You cannot leave this tournament.  Either you did not enter the tournament, or your opponent is unavailable.');
			}
		return false;
		break;
			
	case 'forceleave':
	case 'fl':
	case 'flt':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (!tourSigyn) {
			emit(socket, 'console', 'There is no tournament in a sign-up phase.  Use /dq username if you wish to remove someone in an active tournament.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', 'Please specify a user to kick from this signup.');
			return false;
		}
		var targetUser = Users.get(target);
		if (targetUser){
			target = targetUser.userid;
			}

		var spotRemover = false;

			for(var i=0;i<tourSignup.length;i++) {
				//emit(socket, 'console', tourSignup[1]);
				if (target === tourSignup[i]) {
					tourSignup.splice(i,1);
					spotRemover = true;
					}
				}
		if (spotRemover) {
				room.addRaw('The user <b>' + target + '</b> has left the tournament by force. <b><i>' + (tourSize - tourSignup.length) + ' slots remaining.</b></i>');
			} else {
				emit(socket, 'console', 'The user that you specified is not in the tournament.');
			}
		return false;
		break;
	
	case 'vr':
	case 'viewround':
	if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
	}
	if (!tourActive) {
			emit(socket, 'console', 'There is no active tournament running.');
			return false;
	}
	if (tourRound == 1) {
		rooms.lobby.addRaw('<hr /><h3><font color="green">The ' + tourTier + ' tournament has begun!</font></h3><font color="blue"><b>TIER:</b></font> ' + tourTier );
	} else {
		rooms.lobby.addRaw('<hr /><h3><font color="green">Round '+ tourRound +'!</font></h3><font color="blue"><b>TIER:</b></font> ' + tourTier );
	}
	var tourBrackCur;
	for(var i = 0;i < tourBracket.length;i++) {
		tourBrackCur = tourBracket[i];
		if (!(tourBrackCur[0] === 'bye') && !(tourBrackCur[1] === 'bye')) {
			rooms.lobby.addRaw(' - ' + getTourColor(tourBrackCur[0]) + ' VS ' + getTourColor(tourBrackCur[1]));
		} else if (tourBrackCur[0] === 'bye') {
			rooms.lobby.addRaw(' - ' + tourBrackCur[1] + ' has recieved a bye!');
		} else if (tourBrackCur[1] === 'bye') {
			rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' has recieved a bye!');
		} else {
			rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' VS ' + tourBrackCur[1]);
		}
	}
	var tourfinalcheck = tourBracket[0];
	if ((tourBracket.length == 1) && (!(tourfinalcheck[0] === 'bye') || !(tourfinalcheck[1] === 'bye'))) {
		rooms.lobby.addRaw('This match is the finals!  Good luck!');
	}
	rooms.lobby.addRaw('<hr />');
	return false; 
	break;
	
	case 'remind':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (!tourSigyn) {
				emit(socket, 'console', 'There is no tournament to sign up for.');
				return false;
		}
		room.addRaw('<hr /><h2><font color="green">Please sign up for the ' + tourTier + ' Tournament.</font> <font color="red">/j</font> <font color="green">to join!</font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + tourSize + '<br /><font color="blue"><b>TIER:</b></font> ' + tourTier + '<hr />');
		return false;
		break;
		
	case 'replace':
	
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (!tourActive) {
			emit(socket, 'console', 'The tournament is currently in a sign-up phase or is not active, and replacing users only works mid-tournament.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', 'Proper syntax for this command is: /replace user1, user2.  User 2 will replace User 1 in the current tournament.');
			return false;
		}
		var targets = splittyDiddles(target);
		if (!targets[1]) {
			emit(socket, 'console', 'Proper syntax for this command is: /replace user1, user2.  User 2 will replace User 1 in the current tournament.');
			return false;
		}
		var userOne = Users.get(targets[0]); 
		var userTwo = Users.get(targets[1]);
		if (!userTwo) {
			emit(socket, 'console', 'Proper syntax for this command is: /replace user1, user2.  The user you specified to be placed in the tournament is not present!');
			return false;
		} else {
			targets[1] = userTwo.userid;
		}
		if (userOne) {
			targets[0] = userOne.userid;
		}
		var tourBrackCur = [];
		var replaceSuccess = false;
		//emit(socket, 'console', targets[0] + ' - ' + targets[1]);
		for (var i = 0; i < tourBracket.length; i++) {
			tourBrackCur = tourBracket[i];
			if (tourBrackCur[0] === targets[0]) {
				tourBrackCur[0] = targets[1];
				userTwo.tourRole = 'participant';
				userTwo.tourOpp = tourBrackCur[1];
				var oppGuy = Users.get(tourBrackCur[1]);
				if (oppGuy) {
					if (oppGuy.tourOpp === targets[0]) {
						oppGuy.tourOpp = targets[1];
						}
					}
				replaceSuccess = true;
				}
			if (tourBrackCur[1] === targets[0]) {
				tourBrackCur[1] = targets[1];
				userTwo.tourRole = 'participant';
				userTwo.tourOpp = tourBrackCur[0];
				var oppGuy = Users.get(tourBrackCur[0]);
				if (oppGuy) {
					if (oppGuy.tourOpp === targets[0]) {
						oppGuy.tourOpp = targets[1];
						}
					}
				replaceSuccess = true;
				}
			if (tourMoveOn[i] === targets[0]) {
				tourMoveOn[i] = targets[1];
				userTwo.tourRole = 'winner';
				userTwo.tourOpp = '';
			} else if (!(tourMoveOn[i] === '')) {
				userTwo.tourRole = '';
				userTwo.tourOpp = '';
			}
		}
		if (replaceSuccess) {
			room.addRaw('<b>' + targets[0] +'</b> has left the tournament and is replaced by <b>' + targets[1] + '</b>.');
			} else {
			emit(socket, 'console', 'The user you indicated is not in the tournament!');
			}
	return false;
	break;
	
	case 'endtour':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		tourActive = false;
		tourSigyn = false;
		tourBracket = [];
		tourSignup = [];
		tourTier = '';
		tourRound = 0;
		tourSize = 0;
		tourMoveOn = [];
		tourRoundSize = 0;
		room.addRaw('<h2><b>' + user.name + '</b> has ended the tournament.</h2>');
		return false;
		break;
	
	case 'dq':
	case 'disqualify':
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', 'Proper syntax for this command is: /dq username');
			return false;
		}
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'That user does not exist!');
			return false;
		}
		if (!tourActive) {
			emit(socket, 'console', 'There is no tournament running at this time!');
			return false;
		}
		var dqGuy = targetUser.userid;
		var tourBrackCur;
		var posCheck = false;
		for(var i = 0;i < tourBracket.length;i++) {
			tourBrackCur = tourBracket[i];
			if (tourBrackCur[0] === dqGuy) {
				var finalGuy = Users.get(tourBrackCur[1]);
				finalGuy.tourRole = 'winner';
				targetUser.tourRole = '';
				posCheck = true;
				}
			if (tourBrackCur[1] === dqGuy) {
				var finalGuy = Users.get(tourBrackCur[0]);
				finalGuy.tourRole = 'winner';
				targetUser.tourRole = '';
				posCheck = true;
				}
			}
		if (posCheck) {
			room.addRaw('<b>' + targetUser.name + '</b> has been disqualified.');
		} else {
			emit(socket, 'console', 'That user was not in the tournament!');
		}
		return false;
		break;
		
	//CURRENCY COMMANDS
	//POKEBUCKSS
	
	case 'scratchticket':
		var moneyGuy = showMoneyUser(user.name);
		if (moneyGuy[3] < 1) {
			emit(socket, 'console', 'You need at least one Fun Ticket to use a Scratch Ticket!');
			return false;
			}
		moneyGuy[3] = moneyGuy[3] - 1;
		var scratchwin = Math.floor((Math.random()*1000)+1);
		if (scratchwin < 850) {
				emit(socket, 'console', "Sorry, you didn't win this time!");
			} else if (scratchwin < 900) {
				emit(socket, 'console', 'You have won 50PB with a scratch ticket!  That\'s enough to buy... another ticket!');
				updateMoney(user.name, 50);
			} else if (scratchwin < 970) {
				emit(socket, 'console', 'You have won 150PB with a scratch ticket!  That\'s a decent profit!');
				updateMoney(user.name, 150);
			} else if (scratchwin < 980) {
				emit(socket, 'console', 'You have won 250PB with a scratch ticket!  Don\'t spend it all in one place!');
				updateMoney(user.name, 250);
			} else if (scratchwin < 985) {
				room.addRaw('<b>' + user.name + '</b> has won <b>500PB</b> with a scratch ticket!  You\'re luckier than a Farfetch\'d with a Stick and Super Luck using Slash!');
				updateMoney(user.name, 500);
			} else if (scratchwin < 990) {
				room.addRaw('<b>' + user.name + '</b> hit the jackpot!  They have won <b>20 Fun Tickets</b> with a scratch ticket!  I swear I\'m not encouraging gambling with this...');
				moneyGuy[3] = moneyGuy[3] + 20;
			} else if (scratchwin < 995) {
				room.addRaw('<b>' + user.name + '</b> hit the jackpot!  They have won <b>1000PB</b> with a scratch ticket!  Don\'t spend it all in one place!  (Actually, I hope you spend it all here...)');
				updateMoney(user.name, 1000);
			} else if ((scratchwin < 996) && (!moneyGuy[4])) {
				room.addRaw('<b>' + user.name + '</b> hit the jackpot!  They have won <b>a Bonus Mystery Mark</b> with a scratch ticket!  That\'s cool, I guess???');
				moneyGuy[4] = true;
			} else if ((scratchwin < 997) && (!moneyGuy[4])) {
				room.addRaw('<b>' + user.name + '</b> hit the jackpot!  They have won <b>2000PB</b> with a scratch ticket!  Don\'t spend it all in one place!  (Actually, I hope you spend it all here...)');
				updateMoney(user.name, 2000);
			} else if (scratchwin < 1000) {
				room.addRaw('<b>' + user.name + '</b> hit the jackpot!  They have won <b>2000PB</b> with a scratch ticket!  Don\'t spend it all in one place!  (Actually, I hope you spend it all here...)');
				updateMoney(user.name, 2000);
			} else {
				room.addRaw('<b>' + user.name + '</b> hit the ultimate jackpot!  They have won <b>5000PB</b> with a scratch ticket!  Jeez!  What luck!');
				updateMoney(user.name, 5000);
			}
			
	return false;
	break;
	
	case 'startroulette':
	case 'startroul':
		if (!user.can('mute')) {
			emit(socket, 'console', 'You must be a driver or above to start taking tickets for the roulette.');
			return false;
			}
		if (roulon) {
			emit(socket, 'console', 'Either someone is currently taking bets, or the roulette needs to be spun!');
			return false;
			} else {
			room.addRaw('<div class="infobox"><b>' + user.name + ' </b>is now taking bets for the roulette!'+
			'</b><br><br><b>1 Fun Ticket (<i>/buy ticket</i>):</b> One ticket per entry.  You can bet multiple times.' +
			'<br><b><i>/betnumber #</i>: </b> Bet on an individual number from 0-40.  Bonus if you win on 0!' + 
			'<br><b><i>/betcolor black</i>: </b> Bet on black (even) numbers not including 0.  Good odds, low payout.' + 
			'<br><b><i>/betcolor red</i>: </b> Bet on red (odd) numbers.' +  
			'</div>');
			roulon = true;
			emit(socket, 'console', 'When everyone is ready, type /spin to spin the wheel!');
			return false;
			}			
	return false;
	break;
	
	case 'betnumber':
	case 'betnum':
		var moneyGuy = showMoneyUser(user.name);
		if (!target) {
			emit(socket, 'console', 'The syntax for this command is /betnumber #');
			return false;
			}
		var targetNum = parseInt(target);
		if ((targetNum < 0) || (targetNum > 40) || (isNaN(targetNum))) {
			emit(socket, 'console', 'That\'s not a valid number!');
			return false;
		}
		if (!roulon) {
			emit(socket, 'console', 'The roulette is not currently taking bets at this time.');
			return false;
			}
		if (moneyGuy[3] < 1) {
			emit(socket, 'console', 'You need at least one Fun Ticket to place a bet on the roulette!');
			return false;
			}
		moneyGuy[3] = moneyGuy[3] - 1;
		roulbets.push([user.name,targetNum]);
		room.addRaw('<b>' + user.name + '</b> has placed a bet on the number <b>' + targetNum + '!');
		return false;
		break;
	
	case 'betcolor':
	case 'betcol':
		var moneyGuy = showMoneyUser(user.name);
		if (!target) {
			emit(socket, 'console', 'The syntax for this command is /betnumber #');
			return false;
			}
		var targetCol = target;
		if (!((targetCol === 'red') || (targetCol === 'black'))) {
			emit(socket, 'console', 'That\'s not a valid color!  You can pick red or black.');
			return false;
		}
		if (!roulon) {
			emit(socket, 'console', 'The roulette is not currently taking bets at this time.');
			return false;
			}
		if (moneyGuy[3] < 1) {
			emit(socket, 'console', 'You need at least one Fun Ticket to place a bet on the roulette!');
			return false;
			}
		moneyGuy[3] = moneyGuy[3] - 1;
		roulbets.push([user.name,targetCol]);
		room.addRaw('<b>' + user.name + '</b> has placed a bet on the color <b>' + targetCol + '!');
	return false;
	break;
	
	case 'spin':
		if (!user.can('mute')) {
			emit(socket, 'console', 'You must be a driver or above to spin the roulette wheel.');
			return false;
			}
		if (roulbets.length == 0) {
			emit(socket, 'console', 'No one has placed a bet yet!');
			return false;
			}
		if (!roulon) {
			emit(socket, 'console', 'You haven\'t started taking bets!');
			return false;
		} else {
		var finalRoulwin = false;
		do {
			var roulwin = Math.floor((Math.random()*100));
			var roulpeeps = [];
			var roulpeepsnames = '';
			var roulcolpeeps = [];
			var roulcolpeepsnames = '';
			var wintemp;
			var colorguywin;
			if (roulwin == 0) {
				for (var i = 0; i < roulbets.length; i++) {
					wintemp = roulbets[i];
					if (wintemp[1] === 0) {
						updateMoney(wintemp[0], (roulprize * 8 + 100));
						
						if ((roulpeeps.lastIndexOf(wintemp[0])) == -1) {
							roulpeeps.push(wintemp[0]);
							roulpeepsnames = roulpeepsnames + wintemp[0] + ' ';
							}
					}				
				}
				room.addRaw('<div class="infobox"><b>' + 'BIG WIN!'+
				'</b><br><br><b>The roulette spun a 0!</b>  That\'s a total prize of ' + ((roulprize * 8) + 100) + 'PB per ticket!' +
				'<br><b><i>Congrats to</i>:</b> ' + roulpeepsnames +
				'</div>');
				finalRoulwin = true;
			} else if (roulwin < 41) {
				var colorwin = 'red';
				if ((roulwin % 2) == 0) colorwin = 'black';
			
			
				for (var i = 0; i < roulbets.length; i++) {
					wintemp = roulbets[i];
					if (wintemp[1] === roulwin) {
						updateMoney(wintemp[0], (roulprize * 8));
						
						if ((roulpeeps.lastIndexOf(wintemp[0])) == -1) {
							roulpeeps.push(wintemp[0]);
							roulpeepsnames = roulpeepsnames + wintemp[0] + ' ';
							}
					} else if (wintemp[1] === colorwin)	{
						updateMoney(wintemp[0], (roulprize * 2));
						
						if ((roulcolpeeps.lastIndexOf(wintemp[0])) == -1) {
							roulcolpeeps.push(wintemp[0]);
							roulcolpeepsnames = roulcolpeepsnames + wintemp[0] + ' ';
							}
						}
				}
				room.addRaw('<div class="infobox"><b>' + 'Results:'+
				'</b><br><br><b>The roulette spun a ' + roulwin + '!</b>  That\'s a total prize of ' + (roulprize * 8) + 'PB per ticket on the number!' +
				'<br><b><i>Congrats to</i>:</b> ' + roulpeepsnames +
				'</b><br><br><b>The roulette landed on ' + colorwin + '!</b>  That\'s a total prize of ' + (roulprize * 2) + 'PB per ticket on the color!' +
				'<br><b><i>Congrats to</i>:</b> ' + roulcolpeepsnames +
				'</div>');
				finalRoulwin = true;
				} else {
				emit(socket, 'console', "Spinning...");
				}
		}
		while (!finalRoulwin);
	
	roulon = false;
	roulbets = [];
	}
	return false;
	break;
	
	case 'mmoneybackup':
		if (user.name === 'Orivexes') 
			{
				var done = backupMoney();
				emit(socket, 'console', "just check the logs, jeez");
			}
	return false;
	break;
	
	case 'mmoneyrestore':
		if (user.name === 'Orivexes') 
			{
				var done = restoreMoney();
				emit(socket, 'console', "just check the logs, jeez");
			}
		return false;
		break;
		
	
	case 'money':
	case 'inv':
	case 'inventory':
	case '!money':
	case '!inv':
	case '!inventory':
	
		if (!target) target = user.name;
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
			}
		
		var moneyGuy = showMoneyUser(targetUser.name);
		/*var targetUser;
		if (!target) 
			{
				targetUser = user;
			} else {
				targetUser = Users.get(target);
				if (!targetUser) 
					{
						emit(socket, 'console', 'User '+target+' not found.');
						return false;
					}
			}*/
		
		var emotepacklist = " ";
		var emoteguylist = moneyGuy[2];
		for(var i = 0; i < 10; i++) {
			if (emoteguylist[i]) {
				if (emotepacklist === " ") {
						emotepacklist = emotepacklist + "Pack #" + (i+1);
					} else {				
						emotepacklist = emotepacklist + ", " +"Pack #" + (i+1);
					}
				}
			}
		var marked;
		if (moneyGuy[4]) {
			marked = 'Yes';
		} else {
			marked = 'No';
		}
		
			
			
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>' + targetUser.name +
			':</b><br><b>Pokebucks: </b>' + moneyGuy[1] +
			'<br><b>Pokemon Emoticon Packs:</b>' + emotepacklist +
			'<br><b>Fun Tickets: </b>' + moneyGuy[3] +
			'<br><b>Bonus Mystery Mark: </b>' + marked + 
			//'<br><b>Intro Message: </b>' + targetUser.intro +
			'</div>');
		return false;
		break;
	
	case 'shopinfo':
	case '!shopinfo':
		if (!target) {
			emit(socket, 'console', 'Be sure to type /shopinfo <item>.');
			return false;
			}
		if ((target === 'ticket') || (target === 'funticket')) {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>Fun Ticket:</b> 50PB apiece or buy in bulk.  Use these to play games such as:<br><b>Scratch Ticket (1 Ticket):</b> Use a ticket like a scratch ticket to win!  <i>/scratchticket</i>' + 
			'<br><b>Roulette (1 Ticket):</b> Place a bet on the roulette wheel to get some extra Pokebucks!' +
			'</div>');
			}
		if ((target === 'emotepack') || (target === 'emotepacks') || (target === 'emotes') || (target === 'emoticons') || (target === 'epack')) {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>Emote Pack: </b> 15000PB per pack.  Buying these unlocks commands to use emoticons.' +
			'</div>');
			}
		if ((target === 'bonusmark') || (target === 'mark')) {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>Bonus Mystery Mark: </b> 10000PB.  A "?" is affixed to the front of your name.' +
			'</div>');
			}
		if (target === 'voice') {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>Voice:</b> 50000PB.  You will gain Voice status permanently!  This is only available to regular users.' +
			'</div>');
			}
		return false;
		break;
	
	case 'shop':
	case '!shop':
	case 'store':
	case '!store':
	case 'prices':
	case '!prices':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>1 Fun Ticket (<i>/buy ticket</i>): </b> 50PB' +
			'<br><b>Reel of 10 Fun Tickets (<i>/buy ticketreel</i>): </b> 450PB' + 
			'<br><b>Bucket of 100 Fun Tickets (<i>/buy ticketbucket</i>): </b> 4000PB' + 
			'<br><br><b>Bonus Mystery Mark (<i>/buy mark</i>): </b> 10000PB' + 
			'<br><br><b>Emoticon Pack 1 (<i>/buy epack1</i>): </b> SOLD OUT' + 
			'<br><b>Emoticon Pack 2 (<i>/buy epack2</i>): </b> SOLD OUT' + 
			'<br><br><b>Voice (<i>/buy voice</i>): </b> 50000PB' + 
			'<br><br><b>Want to gift one of these items to someone?  Type: <i>/gift username, item</i>! </b>' + 
			'<br><b>Want more info on one of these items?  Type: <i>/shopinfo item</i>! </b>' + 
			'<br><b>Need to check your money and inventory?  Type: <i>/money</i>! </b>' + 
			'<br><b>For other information on the shop, type: <i>/shophelp</i>! </b>' +
			'</div>');
		return false;
		break;
	
	case 'buy':
	case 'purchase':
		if (!target) {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>1 Fun Ticket (<i>/buy ticket</i>): </b> 50PB' +
			'<br><b>Reel of 10 Fun Tickets (<i>/buy ticketreel</i>): </b> 450PB' + 
			'<br><b>Bucket of 100 Fun Tickets (<i>/buy ticketbucket</i>): </b> 4000PB' + 
			'<br><br><b>Bonus Mystery Mark (<i>/buy mark</i>): </b> 10000PB' + 
			'<br><br><b>Emoticon Pack 1 (<i>/buy epack1</i>): </b> SOLD OUT' + 
			'<br><b>Emoticon Pack 2 (<i>/buy epack2</i>): </b> SOLD OUT' + 
			'<br><br><b>Voice (<i>/buy voice</i>): </b> 50000PB' + 
			'<br><br><b>Want to gift one of these items to someone?  Type: <i>/gift username, item</i>! </b>' + 
			'<br><b>Want more info on one of these items?  Type: <i>/shopinfo item</i>! </b>' + 
			'<br><b>Need to check your money and inventory?  Type: <i>/money</i>! </b>' + 
			'<br><b>For other information on the shop, type: <i>/shophelp</i>! </b>' +
			'</div>');
		return false;
		}
		var itemNames = ['ticket','ticketreel','ticketbucket','mark','epack1','epack2','voice'];
		var itemFullNames = ['Fun Ticket','Reel of Fun Tickets','Bucket of Fun Tickets','Bonus Mystery Mark','Emoticon Pack 1','Emoticon Pack 2','Voice'];
		var itemPrices = ['50','450','4000','10000','15000','15000','50000'];
		var checkItem = false;
		var finalItem;
		var finalPrice;
		for(var i = 0; i < itemNames.length; i++) {
			if (target === itemNames[i]) {
				checkItem = true;
				finalPrice = itemPrices[i];
				finalItem = itemFullNames[i];
				}
			}
		if (!checkItem) {
			emit(socket, 'console', 'This item was not found.  Please check the shop listing by typing "/shop".');
			return false;
			}
		if ((target === 'epack1') || (target === 'epack2')) {
			emit(socket, 'console', 'The item you are trying to purchase is not available at the moment.  Please check the shop listing by typing "/shop".');
			return false;
			}
		var work = buyItem(user.name,target,user.name);
		if (work) {
			room.addRaw('<b>' + user.name + '</b> has purchased a <b>' + finalItem + '</b> for ' + finalPrice + 'PB!');
			} else {
			var moneyGuy = showMoneyUser(user.name);
			if (moneyGuy[1] < parseInt(finalPrice)) {
				emit(socket, 'console', 'You don\'t have enough money.');
				} else {
				emit(socket, 'console', 'You already have or cannot purchase this item.');
				}
			}
		return false;
		break;
		
	case 'gift':
	case 'buyfor':
		if (!target) {
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox"><b>Welcome to the Pokebucks Shop!'+
			'</b><br><b>1 Fun Ticket (<i>/buy ticket</i>): </b> 50PB' +
			'<br><b>Reel of 10 Fun Tickets (<i>/buy ticketreel</i>): </b> 450PB' + 
			'<br><b>Bucket of 100 Fun Tickets (<i>/buy ticketbucket</i>): </b> 4000PB' + 
			'<br><br><b>Bonus Mystery Mark (<i>/buy mark</i>): </b> 10000PB' + 
			'<br><br><b>Emoticon Pack 1 (<i>/buy epack1</i>): </b> SOLD OUT' + 
			'<br><b>Emoticon Pack 2 (<i>/buy epack2</i>): </b> SOLD OUT' + 
			'<br><br><b>Voice (<i>/buy voice</i>): </b> 50000PB' + 
			'<br><br><b>Want to gift one of these items to someone?  Type: <i>/gift username, item</i>! </b>' + 
			'<br><b>Want more info on one of these items?  Type: <i>/shopinfo item</i>! </b>' + 
			'<br><b>Need to check your money and inventory?  Type: <i>/money</i>! </b>' + 
			'<br><b>For other information on the shop, type: <i>/shophelp</i>! </b>' +
			'</div>');
		return false;
		}
		
		var targets = splittyDoodles(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'Syntax for giving people money: /pay user, #');
			return parseCommand(user, '?', cmd, room, socket);
		}
		var targetUser = Users.get(targets[0]);
		if (!targetUser) {
			emit(socket, 'console', 'The user you specified is not here!');
			return false;
		}
		
		var itemNames = ['ticket','ticketreel','ticketbucket','mark','epack1','epack2','voice'];
		var itemFullNames = ['Fun Ticket','Reel of Fun Tickets','Bucket of Fun Tickets','Bonus Mystery Mark','Emoticon Pack 1','Emoticon Pack 2','Voice'];
		var itemPrices = ['50','450','4000','10000','15000','15000','50000'];
		var checkItem = false;
		var finalItem;
		var finalPrice;
		for(var i = 0; i < itemNames.length; i++) {
			if (targets[1] === itemNames[i]) {
				checkItem = true;
				finalPrice = itemPrices[i];
				finalItem = itemFullNames[i];
				}
			}
		if (!checkItem) {
			emit(socket, 'console', 'This item was not found.  Please check the shop listing by typing "/shop".');
			return false;
			}
		if ((targets[1] === 'epack1') || (targets[1] === 'epack2')) {
			emit(socket, 'console', 'The item you are trying to purchase is not available at the moment.  Please check the shop listing by typing "/shop".');
			return false;
			}
		var work = buyItem(user.name,targets[1],targetUser.name);
		if (work) {
			room.addRaw('<b>' + user.name + '</b> has gifted a <b>' + finalItem + '</b> to <b>' + targetUser.name + ' for ' + finalPrice + 'PB!');
			} else {
			var moneyGuy = showMoneyUser(targetUser.name);
			if (moneyGuy[1] < parseInt(finalPrice)) {
				emit(socket, 'console', 'You don\'t have enough money.');
				} else {
				emit(socket, 'console', 'You already have or cannot purchase this item.');
				}
			}
		return false;
		break;
	
	case 'give':
	case 'tossat':
		var targets = splittyDoodles(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'Syntax for giving people money: /pay user, #');
			return parseCommand(user, '?', cmd, room, socket);
		}
		var targetUser = Users.get(targets[0]);
		if (!targetUser) {
			emit(socket, 'console', 'The user you specified is not here!');
			return false;
		}
		if ((targets[1] === 'ticket') || (targets[1] === 'tickets')) {
			emit(socket, 'console', 'Use /givetickets username, # to give people tickets.');
			return false;
		}
		if ((targets[1] === 'mark') || (targets[1] === 'epack1') || (targets[1] === 'epack2')) {
			var work = inventoryGive(user.name,targets[1],targetUser.name);
			if (work) {
			room.addRaw('<b>' + user.name + '</b> has given their <b>' + targets[1] + '</b> to <b>' + targetUser.name + '.');
			} else {
			emit(socket, 'console', 'You can\'t give this item.  The user may already have it, or you may not have it.');
			}
		} else {
			emit(socket, 'console', 'You can\'t give this item.');
		}
		return false;
		break;
		
	case 'givetickets':
		var targets = splittyDoodles(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'Syntax for giving people tickets: /givetickets user, #');
			return parseCommand(user, '?', cmd, room, socket);
		}
		var targetUser = Users.get(targets[0]);
		if (!targetUser) {
			emit(socket, 'console', 'The user you specified is not here!');
			return false;
		}
		if (isNaN(targets[1])) {
			emit(socket, 'console', 'Syntax for giving people tickets: /givetickets user, #');
			return false;
		}
		if (targets[1] < 1) {
			emit(socket, 'console', 'don\'t be stupid');
			return false;
		}
		var work = ticketsGive(user.name,targets[1],targetUser.name);
		if (work) {
			room.addRaw('<b>' + user.name + '</b> has given <b>' + targets[1] + ' Fun Tickets</b> to <b>' + targetUser.name + '.');
		} else {
			emit(socket, 'console', 'You can\'t give this many tickets.');
		}
		return false;
		break;
	
	case 'orishowformats':
		if (user.name === 'Orivexes') 
			{
				var test = room.getFormatListText();
				emit(socket, 'console', 'test' + Tools.data.Formats[1]);
			}
		return false;
		break;
				
	case 'jmoney':
			updateMoney('Orivexes', 100000);
			emit(socket, 'console', "Joe done got lots money.");
	return false;
	break;
	
	case 'bmail':
			updateMoney('Skrappy', 100000);
			emit(socket, 'console', "Ben's rich.");
	return false;
	break;

	case 'viewmoney':
		if (user.name === 'Orivexes') 
			{
				emit(socket, 'console', allMoney);
				return false;
			}
	return false;
	break;
	
	case 'cleanmoney':
		if (user.name === 'Orivexes') {
			cleanMoney();
		}
	return false;
	break;
	
	case 'pay':
		if (!target) {
			emit(socket,'console', 'You need to choose a recipient to get money.');
			return false;
		}
		var checkPay = showMoneyUser(user.name);
		var targets = splittyDoodles(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'Syntax for giving people money: /pay user, #');
			return parseCommand(user, '?', cmd, room, socket);
		}
		var targetUser = Users.get(targets[0]);
		if (!targetUser) {
			emit(socket, 'console', 'The user you specified is not here!');
			return false;
		}
		targets[1] = parseInt(targets[1]);
		if (isNaN(targets[1])) {
			emit(socket, 'console', 'Syntax for giving people money: /pay user, #');
			return false;
		}
		if (targets[1] < 1) {
			emit(socket, 'console', 'don\'t be stupid');
			return false;
		}
		if (targets[1] > checkPay[1]) {
			emit(socket, 'console', 'don\'t be stupid');
			return false;
		}
	
		
		/*
		if (targets[1] > user.money) {
			emit(socket, 'console', 'You don\'t have that much money!');
			return false;
		}
		targets[1] = parseInt(targets[1]);
		user.money = user.money - targets[1];
		targetUser.money = targetUser.money + targets[1];
		*/
		var moneysuccess = updateMoney(user.name,((-1) * targets[1]));
			if (moneysuccess) {
				updateMoney(targetUser.name,targets[1]);
				room.addRaw('<b>' + user.name + '</b> has given <b>' + targets[1] + ' Pokebucks</b> to <b>' + targetUser.name + '!</b>');
				} else {
				emit(socket, 'console', 'You don\'t have that much money!');
				}
		return false;
		break;
			
	case 'removemark':
		if (user.mark) {
			user.mark = false;
			user.ignoremark = true;
			emit(socket, 'console', 'You removed the ? mark next to your name.');
			return false;
			}
	return false;
	break;
	
	case 'restoremark':
		var checkMark = showMoneyUser(user.name);
		if ((checkMark[4] == true) && (user.ignoremark == true)) {
			user.mark = true;
			user.ignoremark = false;
			emit(socket, 'console', 'You restored the ? mark next to your name.');
			return false;
			}
	return false;
	break;
	//end of test commands, functions of various commands will be found at bottom
	
	case 'me':
	case 'mee':
		if (canTalk(user, room)) {
			if (config.chatfilter) {
				var suffix = config.chatfilter(user, room, socket, target);
				if (suffix === false) return false;
				return '/' + cmd + ' ' + suffix;
			}
			return true;
		}
		break;

	case 'namelock':
	case 'nl':
		if(!target) {
			return false;
		}
		var targets = splitTarget(target);
		var targetUser = targets[0];
		var targetName = targets[1] || (targetUser && targetUser.name);
		if (!user.can('namelock', targetUser)) {
			emit(socket, 'console', '/namelock - access denied.');
			return false;
		} else if (targetUser && targetName) {
			var oldname = targetUser.name;
			var targetId = toUserid(targetName);
			var userOfName = Users.users[targetId];
			var isAlt = false;
			if (userOfName) {
				for(var altName in userOfName.getAlts()) {
					var altUser = Users.users[toUserid(altName)];
					if (!altUser) continue;
					if (targetId === altUser.userid) {
						isAlt = true;
						break;
					}
					for (var prevName in altUser.prevNames) {
						if (targetId === toUserid(prevName)) {
							isAlt = true;
							break;
						}
					}
					if (isAlt) break;
				}
			}
			if (!userOfName || oldname === targetName || isAlt) {
				targetUser.nameLock(targetName, true);
			}
			if (targetUser.nameLocked()) {
				logModCommand(room,user.name+" name-locked "+oldname+" to "+targetName+".");
				return false;
			}
			emit(socket, 'console', oldname+" can't be name-locked to "+targetName+".");
		} else {
			emit(socket, 'console', "User "+targets[2]+" not found.");
		}
		return false;
		break;
	case 'nameunlock':
	case 'unnamelock':
	case 'nul':
	case 'unl':
		if(!user.can('namelock') || !target) {
			return false;
		}
		var removed = false;
		for (var i in nameLockedIps) {
			if (nameLockedIps[i] === target) {
				delete nameLockedIps[i];
				removed = true;
			}
		}
		if (removed) {
			var targetUser = Users.get(target);
			if (targetUser) {
				Rooms.lobby.sendIdentity(targetUser);
			}
			logModCommand(room,user.name+" unlocked the name of "+target+".");
		} else {
			emit(socket, 'console', target+" not found.");
		}
		return false;
		break;

	case 'forfeit':
	case 'concede':
	case 'surrender':
		if (!room.battle) {
			emit(socket, 'console', "There's nothing to forfeit here.");
			return false;
		}
		if (!room.forfeit(user)) {
			emit(socket, 'console', "You can't forfeit this battle.");
		}
		return false;
		break;

	case 'register':
		emit(socket, 'console', 'You must win a rated battle to register.');
		return false;
		break;

	case 'avatar':
		if (!target) return parseCommand(user, 'avatars', '', room, socket);
		var parts = target.split(',');
		var avatar = parseInt(parts[0]);
		if (!avatar || avatar > 294 || avatar < 1) {
			if (!parts[1]) {
				emit(socket, 'console', 'Invalid avatar.');
			}
			return false;
		}

		user.avatar = avatar;
		if (!parts[1]) {
			emit(socket, 'console', 'Avatar changed to:');
			emit(socket, 'console', {rawMessage: '<img src="/sprites/trainers/'+avatar+'.png" alt="" width="80" height="80" />'});
		}

		return false;
		break;

	case 'whois':
	case 'ip':
	case 'getip':
	case 'rooms':
	case 'altcheck':
	case 'alt':
	case 'alts':
	case 'getalts':
		var targetUser = user;
		if (target) {
			targetUser = Users.get(target);
		}
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
		} else {
			emit(socket, 'console', 'User: '+targetUser.name);
			if (user.can('alts', targetUser.getHighestRankedAlt())) {
				var alts = targetUser.getAlts();
				var output = '';
				for (var i in targetUser.prevNames) {
					if (output) output += ", ";
					output += targetUser.prevNames[i];
				}
				if (output) emit(socket, 'console', 'Previous names: '+output);

				for (var j=0; j<alts.length; j++) {
					var targetAlt = Users.get(alts[j]);
					if (!targetAlt.named && !targetAlt.connected) continue;

					emit(socket, 'console', 'Alt: '+targetAlt.name);
					output = '';
					for (var i in targetAlt.prevNames) {
						if (output) output += ", ";
						output += targetAlt.prevNames[i];
					}
					if (output) emit(socket, 'console', 'Previous names: '+output);
				}
			}
			if (config.groups[targetUser.group] && config.groups[targetUser.group].name) {
				emit(socket, 'console', 'Group: ' + config.groups[targetUser.group].name + ' (' + targetUser.group + ')');
			}
			if (!targetUser.authenticated) {
				emit(socket, 'console', '(Unregistered)');
			}
			if (user.can('ip', targetUser)) {
				var ips = Object.keys(targetUser.ips);
				emit(socket, 'console', 'IP' + ((ips.length > 1) ? 's' : '') + ': ' + ips.join(', '));
			}
			var output = 'In rooms: ';
			var first = true;
			for (var i in targetUser.roomCount) {
				if (!first) output += ' | ';
				first = false;

				output += '<a href="/'+i+'" room="'+i+'">'+i+'</a>';
			}
			emit(socket, 'console', {rawMessage: output});
		}
		return false;
		break;

	case 'ban':
	case 'b':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('ban', targetUser)) {
			emit(socket, 'console', '/ban - Access denied.');
			return false;
		}

		logModCommand(room,""+targetUser.name+" was banned by "+user.name+"." + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has banned you.  If you feel that your banning was unjustified you can <a href="http://www.smogon.com/forums/announcement.php?f=126&a=204" target="_blank">appeal the ban</a>. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also banned: "+alts.join(", "));

		targetUser.ban();
		return false;
		break;

	case 'banredirect':
	case 'br':
		emit(socket, 'console', '/banredirect - This command is obsolete and has been removed.');
		return false;
		break;

	case 'redirect':
	case 'redir':
		emit(socket, 'console', '/redirect - This command is obsolete and has been removed.');
		return false;
		break;

	case 'kick':
	case 'warn':
	case 'k':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('warn', targetUser)) {
			emit(socket, 'console', '/warn - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was warned by '+user.name+'' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.sendTo('lobby', '|c|~|/warn '+targets[1]);
		return false;
		break;

	case 'unban':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('ban')) {
			emit(socket, 'console', '/unban - Access denied.');
			return false;
		}

		var targetid = toUserid(target);
		var success = false;

		for (var ip in bannedIps) {
			if (bannedIps[ip] === targetid) {
				delete bannedIps[ip];
				success = true;
			}
		}
		if (success) {
			logModCommand(room,''+target+' was unbanned by '+user.name+'.');
		} else {
			emit(socket, 'console', 'User '+target+' is not banned.');
		}
		return false;
		break;

	case 'unbanall':
		if (!user.can('ban')) {
			emit(socket, 'console', '/unbanall - Access denied.');
			return false;
		}
		logModCommand(room,'All bans and ip mutes have been lifted by '+user.name+'.');
		bannedIps = {};
		mutedIps = {};
		return false;
		break;

	case 'reply':
	case 'r':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.lastPM) {
			emit(socket, 'console', 'No one has PMed you yet.');
			return false;
		}
		return parseCommand(user, 'msg', ''+(user.lastPM||'')+', '+target, room, socket);
		break;

	case 'msg':
	case 'pm':
	case 'whisper':
	case 'w':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'You forgot the comma.');
			return parseCommand(user, '?', cmd, room, socket);
		}
		if (!targets[0] || !targetUser.connected) {
			if (target.indexOf(' ')) {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you forget a comma?');
			} else {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you misspell their name?');
			}
			return parseCommand(user, '?', cmd, room, socket);
		}
		// temporarily disable this because blarajan
		/* if (user.muted && !targetUser.can('mute', user)) {
			emit(socket, 'console', 'You can only private message members of the Moderation Team (users marked by %, @, &, or ~) when muted.');
			return false;
		} */

		if (!user.named) {
			emit(socket, 'console', 'You must choose a name before you can send private messages.');
			return false;
		}

		var message = {
			name: user.getIdentity(),
			pm: targetUser.getIdentity(),
			message: targets[1]
		};
		user.emit('console', message);
		targets[0].emit('console', message);
		targets[0].lastPM = user.userid;
		user.lastPM = targets[0].userid;
		return false;
		break;

	case 'mute':
	case 'm':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/mute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was muted by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has muted you. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		Rooms.lobby.sendIdentity(targetUser);
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) {
				targetAlt.muted = true;
				Rooms.lobby.sendIdentity(targetAlt);
			}
		}

		return false;
		break;

	case 'ipmute':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/ipmute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+"'s IP was muted by "+user.name+'.');
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		Rooms.lobby.sendIdentity(targetUser);
		for (var ip in targetUser.ips) {
			mutedIps[ip] = targetUser.userid;
		}
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) {
				targetAlt.muted = true;
				Rooms.lobby.sendIdentity(targetAlt);
			}
		}

		return false;
		break;

	case 'unmute':
	case 'um':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetid = toUserid(target);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/unmute - Access denied.');
			return false;
		}

		var success = false;

		for (var ip in mutedIps) {
			if (mutedIps[ip] === targetid) {
				delete mutedIps[ip];
				success = true;
			}
		}

		if (success) {
			logModCommand(room,''+(targetUser?targetUser.name:target)+"'s IP was unmuted by "+user.name+'.');
		}

		targetUser.muted = false;
		Rooms.lobby.sendIdentity(targetUser);
		logModCommand(room,''+targetUser.name+' was unmuted by '+user.name+'.');
		return false;
		break;

	case 'promote':
	case 'demote':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target, true);
		var targetUser = targets[0];
		var userid = toUserid(targets[2]);

		var currentGroup = ' ';
		if (targetUser) {
			currentGroup = targetUser.group;
		} else if (Users.usergroups[userid]) {
			currentGroup = Users.usergroups[userid].substr(0,1);
		}
		var name = targetUser ? targetUser.name : targets[2];

		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(currentGroup, cmd === 'demote');
		if (targets[1] === 'deauth') nextGroup = config.groupsranking[0];
		if (!config.groups[nextGroup]) {
			emit(socket, 'console', 'Group \'' + nextGroup + '\' does not exist.');
			return false;
		}
		if (!user.checkPromotePermission(currentGroup, nextGroup)) {
			emit(socket, 'console', '/promote - Access denied.');
			return false;
		}

		var isDemotion = (config.groups[nextGroup].rank < config.groups[currentGroup].rank);
		if (!Users.setOfflineGroup(name, nextGroup)) {
			emit(socket, 'console', '/promote - WARNING: This user is offline and could be unregistered. Use /forcepromote if you\'re sure you want to risk it.');
			return false;
		}
		var groupName = (config.groups[nextGroup].name || nextGroup || '').trim() || 'a regular user';
		var entry = ''+name+' was '+(isDemotion?'demoted':'promoted')+' to ' + groupName + ' by '+user.name+'.';
		logModCommand(room, entry, isDemotion);
		if (isDemotion) {
			Rooms.lobby.logEntry(entry);
			emit(socket, 'console', 'You demoted ' + name + ' to ' + groupName + '.');
			if (targetUser) {
				targetUser.emit('console', 'You were demoted to ' + groupName + ' by ' + user.name + '.');
			}
		}
		Rooms.lobby.sendIdentity(targetUser);
		return false;
		break;

	case 'forcepromote':
		// warning: never document this command in /help
		if (!user.can('forcepromote')) {
			emit(socket, 'console', '/forcepromote - Access denied.');
			return false;
		}
		var targets = splitTarget(target, true);
		var name = targets[2];
		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(' ', false);

		if (!Users.setOfflineGroup(name, nextGroup, true)) {
			emit(socket, 'console', '/forcepromote - Don\'t forcepromote unless you have to.');
			return false;
		}
		var groupName = config.groups[nextGroup].name || nextGroup || '';
		logModCommand(room,''+name+' was promoted to ' + (groupName.trim()) + ' by '+user.name+'.');
		return false;
		break;

	case 'deauth':
		return parseCommand(user, 'demote', target+', deauth', room, socket);
		break;

	case 'modchat':
		if (!target) {
			emit(socket, 'console', 'Moderated chat is currently set to: '+config.modchat);
			return false;
		}
		if (!user.can('modchat')) {
			emit(socket, 'console', '/modchat - Access denied.');
			return false;
		}

		target = target.toLowerCase();
		switch (target) {
		case 'on':
		case 'true':
		case 'yes':
			config.modchat = true;
			break;
		case 'off':
		case 'false':
		case 'no':
			config.modchat = false;
			break;
		default:
			if (!config.groups[target]) {
				emit(socket, 'console', 'That moderated chat setting is unrecognized.');
				return false;
			}
			if (config.groupsranking.indexOf(target) > 1 && !user.can('modchatall')) {
				emit(socket, 'console', '/modchat - Access denied for setting higher than ' + config.groupsranking[1] + '.');
				return false;
			}
			config.modchat = target;
			break;
		}
		if (config.modchat === true) {
			room.addRaw('<div class="broadcast-red"><b>Moderated chat was enabled!</b><br />Only registered users can talk.</div>');
		} else if (!config.modchat) {
			room.addRaw('<div class="broadcast-blue"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>');
		} else {
			var modchat = sanitize(config.modchat);
			room.addRaw('<div class="broadcast-red"><b>Moderated chat was set to '+modchat+'!</b><br />Only users of rank '+modchat+' and higher can talk.</div>');
		}
		logModCommand(room,user.name+' set modchat to '+config.modchat,true);
		return false;
		break;

	case 'declare':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('declare')) {
			emit(socket, 'console', '/declare - Access denied.');
			return false;
		}
		room.addRaw('<div class="broadcast-blue"><b>'+target+'</b></div>');
		logModCommand(room,user.name+' declared '+target,true);
		return false;
		break;

	case 'announce':
	case 'wall':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('announce')) {
			emit(socket, 'console', '/announce - Access denied.');
			return false;
		}
		return '/announce '+target;
		break;

	case 'hotpatch':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/hotpatch - Access denied.');
			return false;
		}

		if (target === 'chat') {
			delete require.cache[require.resolve('./chat-commands.js')];
			parseCommand = require('./chat-commands.js').parseCommand;
			emit(socket, 'console', 'Chat commands have been hot-patched.');
			return false;
		} else if (target === 'battles') {
			Simulator.SimulatorProcess.respawn();
			emit(socket, 'console', 'Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.');
			return false;
		} else if (target === 'formats') {
			// uncache the tools.js dependency tree
			parseCommand.uncacheTree('./tools.js');
			// reload tools.js
			Data = {};
			Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
			// rebuild the formats list
			Rooms.global.formatListText = Rooms.global.getFormatListText();
			// respawn simulator processes
			Simulator.SimulatorProcess.respawn();
			// broadcast the new formats list to clients
			Rooms.global.send(Rooms.global.formatListText);

			emit(socket, 'console', 'Formats have been hotpatched.');
			return false;
		}
		emit(socket, 'console', 'Your hot-patch command was unrecognized.');
		return false;
		break;

	case 'savelearnsets':
		if (user.can('hotpatch')) {
			emit(socket, 'console', '/savelearnsets - Access denied.');
			return false;
		}
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = '+JSON.stringify(BattleLearnsets)+";\n");
		emit(socket, 'console', 'learnsets.js saved.');
		return false;
		break;

	case 'rating':
	case 'ranking':
	case 'rank':
	case 'ladder':
		emit(socket, 'console', 'You are using an old version of Pokemon Showdown. Please reload the page.');
		return false;
		break;

	case 'nick':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		user.rename(target);
		return false;
		break;

	case 'disableladder':
		if (!user.can('disableladder')) {
			emit(socket, 'console', '/disableladder - Access denied.');
			return false;
		}
		if (LoginServer.disabled) {
			emit(socket, 'console', '/disableladder - Ladder is already disabled.');
			return false;
		}
		LoginServer.disabled = true;
		logModCommand(room, 'The ladder was disabled by ' + user.name + '.', true);
		room.addRaw('<div class="broadcast-red"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>');
		return false;
		break;
	case 'enableladder':
		if (!user.can('disableladder')) {
			emit(socket, 'console', '/enable - Access denied.');
			return false;
		}
		if (!LoginServer.disabled) {
			emit(socket, 'console', '/enable - Ladder is already enabled.');
			return false;
		}
		LoginServer.disabled = false;
		logModCommand(room, 'The ladder was enabled by ' + user.name + '.', true);
		room.addRaw('<div class="broadcast-green"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>');
		return false;
		break;

	case 'savereplay':
		if (!room || !room.battle) return false;
		var logidx = 2; // spectator log (no exact HP)
		if (room.battle.ended) {
			// If the battle is finished when /savereplay is used, include
			// exact HP in the replay log.
			logidx = 3;
		}
		var data = room.getLog(logidx).join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g,'')).digest('hex');

		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: room.p1.name,
			p2: room.p2.name,
			format: room.format
		}, function(success) {
			emit(socket, 'command', {
				command: 'savereplay',
				log: data,
				room: 'lobby',
				id: room.id.substr(7)
			});
		});
		return false;
		break;

	case 'trn':
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetAuth = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0,commaIndex);
			target = target.substr(commaIndex+1);
			commaIndex = target.indexOf(',');
			targetAuth = target;
			if (commaIndex >= 0) {
				targetAuth = !!parseInt(target.substr(0,commaIndex),10);
				targetToken = target.substr(commaIndex+1);
			}
		}
		user.rename(targetName, targetToken, targetAuth, socket);
		return false;
		break;

	case 'logout':
		user.resetName();
		return false;
		break;

	case 'forcerename':
	case 'fr':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('forcerename', targetUser)) {
			emit(socket, 'console', '/forcerename - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			var entry = ''+targetUser.name+' was forced to choose a new name by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : "");
			logModCommand(room, entry, true);
			Rooms.lobby.sendAuth(entry);
			if (room.id !== 'lobby') {
				room.add(entry);
			} else {
				room.logEntry(entry);
			}
			targetUser.resetName();
			targetUser.emit('nameTaken', {reason: user.name+" has forced you to change your name. "+targets[1]});
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	case 'forcerenameto':
	case 'frt':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!targets[1]) {
			emit(socket, 'console', 'No new name was specified.');
			return false;
		}
		if (!user.can('forcerenameto', targetUser)) {
			emit(socket, 'console', '/forcerenameto - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			var entry = ''+targetUser.name+' was forcibly renamed to '+targets[1]+' by '+user.name+'.';
			logModCommand(room, entry, true);
			Rooms.lobby.sendAuth(entry);
			if (room.id !== 'lobby') {
				room.add(entry);
			} else {
				room.logEntry(entry);
			}
			targetUser.forceRename(targets[1]);
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	// INFORMATIONAL COMMANDS

	case 'data':
	case '!data':
	case 'stats':
	case '!stats':
	case 'dex':
	case '!dex':
	case 'pokedex':
	case '!pokedex':
		showOrBroadcastStart(user, cmd, room, socket, message);
		var dataMessages = getDataMessage(target);
		for (var i=0; i<dataMessages.length; i++) {
			if (cmd.substr(0,1) !== '!') {
				sendData(socket, '>'+room.id+'\n'+dataMessages[i]);
			} else if (user.can('broadcast') && canTalk(user, room)) {
				room.add(dataMessages[i]);
			}
		}
		return false;
		break;

	case 'learnset':
	case '!learnset':
	case 'learn':
	case '!learn':
	case 'learnall':
	case '!learnall':
	case 'learn5':
	case '!learn5':
		var lsetData = {set:{}};
		var targets = target.split(',');
		if (!targets[1]) return parseCommand(user, 'help', 'learn', room, socket);
		var template = Tools.getTemplate(targets[0]);
		var move = {};
		var problem;
		var all = (cmd.substr(cmd.length-3) === 'all');

		if (cmd === 'learn5' || cmd === '!learn5') lsetData.set.level = 5;

		showOrBroadcastStart(user, cmd, room, socket, message);

		if (!template.exists) {
			showOrBroadcast(user, cmd, room, socket,
				'Pokemon "'+template.id+'" not found.');
			return false;
		}

		for (var i=1, len=targets.length; i<len; i++) {
			move = Tools.getMove(targets[i]);
			if (!move.exists) {
				showOrBroadcast(user, cmd, room, socket,
					'Move "'+move.id+'" not found.');
				return false;
			}
			problem = Tools.checkLearnset(move, template, lsetData);
			if (problem) break;
		}
		var buffer = ''+template.name+(problem?" <span class=\"message-learn-cannotlearn\">can't</span> learn ":" <span class=\"message-learn-canlearn\">can</span> learn ")+(targets.length>2?"these moves":move.name);
		if (!problem) {
			var sourceNames = {E:"egg",S:"event",D:"dream world"};
			if (lsetData.sources || lsetData.sourcesBefore) buffer += " only when obtained from:<ul class=\"message-learn-list\">";
			if (lsetData.sources) {
				var sources = lsetData.sources.sort();
				var prevSource;
				var prevSourceType;
				for (var i=0, len=sources.length; i<len; i++) {
					var source = sources[i];
					if (source.substr(0,2) === prevSourceType) {
						if (prevSourceCount < 0) buffer += ": "+source.substr(2);
						else if (all || prevSourceCount < 3) buffer += ', '+source.substr(2);
						else if (prevSourceCount == 3) buffer += ', ...';
						prevSourceCount++;
						continue;
					}
					prevSourceType = source.substr(0,2);
					prevSourceCount = source.substr(2)?0:-1;
					buffer += "<li>gen "+source.substr(0,1)+" "+sourceNames[source.substr(1,1)];
					if (prevSourceType === '5E' && template.maleOnlyDreamWorld) buffer += " (cannot have DW ability)";
					if (source.substr(2)) buffer += ": "+source.substr(2);
				}
			}
			if (lsetData.sourcesBefore) buffer += "<li>any generation before "+(lsetData.sourcesBefore+1);
			buffer += "</ul>";
		}
		showOrBroadcast(user, cmd, room, socket,
			buffer);
		return false;
		break;

	case 'uptime':
	case '!uptime':
		var uptime = process.uptime();
		var uptimeText;
		if (uptime > 24*60*60) {
			var uptimeDays = Math.floor(uptime/(24*60*60));
			uptimeText = ''+uptimeDays+' '+(uptimeDays == 1 ? 'day' : 'days');
			var uptimeHours = Math.floor(uptime/(60*60)) - uptimeDays*24;
			if (uptimeHours) uptimeText += ', '+uptimeHours+' '+(uptimeHours == 1 ? 'hour' : 'hours');
		} else {
			uptimeText = uptime.seconds().duration();
		}
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'Uptime: <b>'+uptimeText+'</b>'+
			'</div>');
		return false;
		break;

	case 'version':
	case '!version':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'Version: <b><a href="http://pokemonshowdown.com/versions#' + parseCommandLocal.serverVersion + '" target="_blank">' + parseCommandLocal.serverVersion + '</a></b>' +
			'</div>');
		return false;
		break;

	case 'groups':
	case '!groups':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'+ <b>Voice</b> - They can use ! commands like !groups, and talk during moderated chat<br />' +
			'% <b>Driver</b> - The above, and they can also mute users and check for alts<br />' +
			'@ <b>Moderator</b> - The above, and they can ban users<br />' +
			'&amp; <b>Leader</b> - The above, and they can promote moderators and force ties<br />'+
			'~ <b>Administrator</b> - They can do anything, like change what this message says'+
			'</div>');
		return false;
		break;

	case 'opensource':
	case '!opensource':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Pokemon Showdown is open source:<br />- Language: JavaScript<br />- <a href="https://github.com/Zarel/Pokemon-Showdown/commits/master" target="_blank">What\'s new?</a><br />- <a href="https://github.com/Zarel/Pokemon-Showdown" target="_blank">Server source code</a><br />- <a href="https://github.com/Zarel/Pokemon-Showdown-Client" target="_blank">Client source code</a></div>');
		return false;
		break;

	case 'avatars':
	case '!avatars':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Your avatar can be changed using the Options menu (it looks like a gear) in the upper right of Pokemon Showdown.</div>');
		return false;
		break;

	case 'intro':
	case 'introduction':
	case '!intro':
	case '!introduction':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">New to competitive pokemon?<br />' +
			'- <a href="http://www.smogon.com/dp/articles/intro_comp_pokemon" target="_blank">An introduction to competitive pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/articles/bw_tiers" target="_blank">What do "OU", "UU", etc mean?</a><br />' +
			'- <a href="http://www.smogon.com/bw/banlist/" target="_blank">What are the rules for each format? What is "Sleep Clause"?</a>' +
			'</div>');
		return false;
		break;
		
	case 'calc':
	case '!calc':
	case 'calculator':
	case '!calculator':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd , room , socket,
			'<div class="infobox">Pokemon Showdown! damage calculator. (Courtesy of Honko)<br />' +
			'- <a href="http://pokemonshowdown.com/damagecalc/" target="_blank">Damage Calculator</a><br />' +
			'</div>');
		return false;
		break;
	
	case 'cap':
	case '!cap':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">An introduction to the Create-A-Pokemon project:<br />' +
			'- <a href="http://www.smogon.com/cap/" target="_blank">CAP project website and description</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=48782" target="_blank">What Pokemon have been made?</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3464513" target="_blank">Talk about the metagame here</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3466826" target="_blank">Practice BW CAP teams</a>' +
			'</div>');
		return false;
		break;
	
	case 'npm':
	case '!npm':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">NPM is a pokemon modifier that tests the strengths and weaknesses of new typings while balancing and adding a sprinkle of flavor to the metagame:<br />' +
			'- <a href="http://pastebin.com/yS3aPeV8" target="_blank">NPM information and changelist</a><br />' +
			'- <a href="http://piratepad.net/NPMOU" target="_blank">If you have comments, suggestions, or questions, put them here</a><br />' +
			'</div>');
		return false;
		break;
		
	case 'om':
	case 'othermetas':
	case '!om':
	case '!othermetas':
		target = toId(target);
		var buffer = '<div class="infobox">';
		var matched = false;
		if (!target || target === 'all') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/forumdisplay.php?f=206" target="_blank">Information on the Other Metagames</a><br />';
		}
		if (target === 'all' || target === 'hackmons') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/showthread.php?t=3475624" target="_blank">Hackmons</a><br />';
		}
		if (target === 'all' || target === 'balancedhackmons' || target === 'bh') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/showthread.php?t=3463764" target="_blank">Balanced Hackmons</a><br />';
		}
		if (target === 'all' || target === 'glitchmons') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/showthread.php?t=3467120" target="_blank">Glitchmons</a><br />';
		}
		if (target === 'all' || target === 'tiershift' || target === 'ts') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/showthread.php?t=3479358" target="_blank">Tier Shift</a><br />';
		}
		if (target === 'all' || target === 'statexchange' || target === 'statex') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/forums/showthread.php?t=3482791" target="_blank">Stat Exchange</a>';
		}
		if (!matched) {
			emit(socket, 'console', 'The Other Metas entry "'+target+'" was not found. Try /othermetas or /om for general help.');
			return false;
		}
		buffer += '</div>';
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, buffer);
		return false;
		break;

	case 'rules':
	case 'rule':
	case '!rules':
	case '!rule':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Please follow the rules:<br />' +
			'- <a href="http://pokemonshowdown.com/rules" target="_blank">Rules</a><br />' +
			'</div>');
		return false;
		break;
		
	case 'faq':
	case '!faq':
		target = target.toLowerCase();
		var buffer = '<div class="infobox">';
		var matched = false;
		if (!target || target === 'all') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq" target="_blank">Frequently Asked Questions</a><br />';
		}
		if (target === 'all' || target === 'deviation') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#deviation" target="_blank">Why did this user gain or lose so many points?</a><br />';
		}
		if (target === 'all' || target === 'doubles' || target === 'triples' || target === 'rotation') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#doubles" target="_blank">Can I play doubles/triples/rotation battles here?</a><br />';
		}
		if (target === 'all' || target === 'randomcap') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#randomcap" target="_blank">What is this fakemon and what is it doing in my random battle?</a><br />';
		}
		if (target === 'all' || target === 'restarts') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#restarts" target="_blank">Why is the server restarting?</a><br />';
		}
		if (target === 'all' || target === 'staff') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/staff_faq" target="_blank">Staff FAQ</a><br />';
		}
		if (!matched) {
			emit(socket, 'console', 'The FAQ entry "'+target+'" was not found. Try /faq for general help.');
			return false;
		}
		buffer += '</div>';
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, buffer);
		return false;
		break;

	case 'banlists':
	case 'tiers':
	case '!banlists':
	case '!tiers':
		target = toId(target);
		var buffer = '<div class="infobox">';
		var matched = false;
		if (!target || target === 'all') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/tiers/" target="_blank">Smogon Tiers</a><br />';
			buffer += '- <a href="http://www.smogon.com/bw/banlist/" target="_blank">The banlists for each tier</a><br />';
		}
		if (target === 'all' || target === 'ubers' || target === 'uber') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/uber" target="_blank">Uber Pokemon</a><br />';
		}
		if (target === 'all' || target === 'overused' || target === 'ou') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/ou" target="_blank">Overused Pokemon</a><br />';
		}
		if (target === 'all' || target === 'underused' || target === 'uu') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/uu" target="_blank">Underused Pokemon</a><br />';
		}
		if (target === 'all' || target === 'rarelyused' || target === 'ru') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/ru" target="_blank">Rarelyused Pokemon</a><br />';
		}
		if (target === 'all' || target === 'neverused' || target === 'nu') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/nu" target="_blank">Neverused Pokemon</a><br />';
		}
		if (target === 'all' || target === 'littlecup' || target === 'lc') {
			matched = true;
			buffer += '- <a href="http://www.smogon.com/bw/tiers/lc" target="_blank">Little Cup Pokemon</a><br />';
		}
		if (!matched) {
			emit(socket, 'console', 'The Tiers entry "'+target+'" was not found. Try /tiers for general help.');
			return false;
		}
		buffer += '</div>';
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, buffer);
		return false;
		break;

	case 'analysis':
	case '!analysis':
	case 'strategy':
	case '!strategy':
	case 'smogdex':
	case '!smogdex':
		var targets = target.split(',');
		var pokemon = Tools.getTemplate(targets[0]);
		var item = Tools.getItem(targets[0]);
		var move = Tools.getMove(targets[0]);
		var ability = Tools.getAbility(targets[0]);
		var atLeastOne = false;
		var generation = (targets[1] || "bw").trim().toLowerCase();
		var genNumber = 5;

		showOrBroadcastStart(user, cmd, room, socket, message);

		if (generation === "bw" || generation === "bw2" || generation === "5" || generation === "five") {
			generation = "bw";
		} else if (generation === "dp" || generation === "dpp" || generation === "4" || generation === "four") {
			generation = "dp";
			genNumber = 4;
		} else if (generation === "adv" || generation === "rse" || generation === "rs" || generation === "3" || generation === "three") {
			generation = "rs";
			genNumber = 3;
		} else if (generation === "gsc" || generation === "gs" || generation === "2" || generation === "two") {
			generation = "gs";
			genNumber = 2;
		} else if(generation === "rby" || generation === "rb" || generation === "1" || generation === "one") {
			generation = "rb";
			genNumber = 1;
		} else {
			generation = "bw";
		}
		
		// Pokemon
		if (pokemon.exists) {
			atLeastOne = true;
			if (genNumber < pokemon.gen) {
				showOrBroadcast(user, cmd, room, socket, pokemon.name+' did not exist in '+generation.toUpperCase()+'!');
				return false;
			}
			if (pokemon.tier === 'G4CAP' || pokemon.tier === 'G5CAP') {
				generation = "cap";
			}
	
			var poke = pokemon.name.toLowerCase();
			if (poke === 'nidoranm') poke = 'nidoran-m';
			if (poke === 'nidoranf') poke = 'nidoran-f';
			if (poke === 'farfetch\'d') poke = 'farfetchd';
			if (poke === 'mr. mime') poke = 'mr_mime';
			if (poke === 'mime jr.') poke = 'mime_jr';
			if (poke === 'deoxys-attack' || poke === 'deoxys-defense' || poke === 'deoxys-speed' || poke === 'kyurem-black' || poke === 'kyurem-white') poke = poke.substr(0,8);
			if (poke === 'wormadam-trash') poke = 'wormadam-s';
			if (poke === 'wormadam-sandy') poke = 'wormadam-g';
			if (poke === 'rotom-wash' || poke === 'rotom-frost' || poke === 'rotom-heat') poke = poke.substr(0,7);
			if (poke === 'rotom-mow') poke = 'rotom-c';
			if (poke === 'rotom-fan') poke = 'rotom-s';
			if (poke === 'giratina-origin' || poke === 'tornadus-therian' || poke === 'landorus-therian') poke = poke.substr(0,10);
			if (poke === 'shaymin-sky') poke = 'shaymin-s';
			if (poke === 'arceus') poke = 'arceus-normal';
			if (poke === 'thundurus-therian') poke = 'thundurus-t';
	
			showOrBroadcast(user, cmd, room, socket,
				'<a href="http://www.smogon.com/'+generation+'/pokemon/'+poke+'" target="_blank">'+generation.toUpperCase()+' '+pokemon.name+' analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}
		
		// Item
		if (item.exists && genNumber > 1 && item.gen <= genNumber) {
			atLeastOne = true;
			var itemName = item.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/items/'+itemName+'" target="_blank">'+generation.toUpperCase()+' '+item.name+' item analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}
		
		// Ability
		if (ability.exists && genNumber > 2 && ability.gen <= genNumber) {
			atLeastOne = true;
			var abilityName = ability.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/abilities/'+abilityName+'" target="_blank">'+generation.toUpperCase()+' '+ability.name+' ability analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}
		
		// Move
		if (move.exists && move.gen <= genNumber) {
			atLeastOne = true;
			var moveName = move.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/moves/'+moveName+'" target="_blank">'+generation.toUpperCase()+' '+move.name+' move analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}
		
		if (!atLeastOne) {
			showOrBroadcast(user, cmd, room, socket, 'Pokemon, item, move, or ability not found for generation ' + generation.toUpperCase() + '.');
			return false;
		}
		
		return false;
		break;

	case 'join':
		var targetRoom = Rooms.get(target);
		if (!targetRoom) {
			emit(socket, 'console', "The room '"+target+"' does not exist.");
			return false;
		}
		if (!user.joinRoom(targetRoom, socket)) {
			emit(socket, 'console', "The room '"+target+"' could not be joined (most likely, you're already in it).");
			return false;
		}
		return false;
		break;

	case 'leave':
	case 'part':
		if (room.id === 'global') return false;

		user.leaveRoom(room, socket);
		return false;
		break;

	// Battle commands

	case 'reset':
	case 'restart':
		emit(socket, 'console', 'This functionality is no longer available.');
		return false;
		break;

	case 'move':
	case 'attack':
	case 'mv':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'move '+target);
		return false;
		break;

	case 'switch':
	case 'sw':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'switch '+parseInt(target,10));
		return false;
		break;

	case 'choose':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', target);
		return false;
		break;

	case 'undo':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'undo', target);
		return false;
		break;

	case 'team':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'team '+target);
		return false;
		break;

	case 'search':
	case 'cancelsearch':
		if (target) {
			Rooms.global.searchBattle(user, target);
		} else {
			Rooms.global.cancelSearch(user);
		}
		return false;
		break;

	case 'challenge':
	case 'chall':
		var targets = splitTarget(target);
		var targetUser = targets[0];
		target = targets[1];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'message', "The user '"+targets[2]+"' was not found.");
			return false;
		}
		if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
			emit(socket, 'message', "The user '"+targets[2]+"' is not accepting challenges right now.");
			return false;
		}
		if (typeof target !== 'string') target = 'customgame';
		var problems = Tools.validateTeam(user.team, target);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.makeChallenge(targetUser, target);
		return false;
		break;
		
	case 'away':
	case 'idle':
	case 'blockchallenges':
		user.blockChallenges = true;
		emit(socket, 'console', 'You are now blocking all incoming challenge requests.');
		return false;
		break;

	case 'back':
	case 'allowchallenges':
		user.blockChallenges = false;
		emit(socket, 'console', 'You are available for challenges from now on.');
		return false;
		break;

	case 'cancelchallenge':
	case 'cchall':
		user.cancelChallengeTo(target);
		return false;
		break;

	case 'accept':
		var userid = toUserid(target);
		var format = 'debugmode';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		var problems = Tools.validateTeam(user.team, format);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.acceptChallengeFrom(userid);
		return false;
		break;

	case 'reject':
		user.rejectChallengeFrom(toUserid(target));
		return false;
		break;

	case 'saveteam':
	case 'utm':
		try {
			user.team = JSON.parse(target);
			user.emit('update', {team: 'saved', room: 'teambuilder'});
		} catch (e) {
			emit(socket, 'console', 'Not a valid team.');
		}
		return false;
		break;

	case 'joinbattle':
	case 'partbattle':
		if (!room.joinBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.joinBattle(user);
		return false;
		break;

	case 'leavebattle':
		if (!room.leaveBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.leaveBattle(user);
		return false;
		break;

	case 'kickbattle':
		if (!room.leaveBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('kick', targetUser)) {
			emit(socket, 'console', "/kickbattle - Access denied.");
			return false;
		}

		if (room.leaveBattle(targetUser)) {
			logModCommand(room,''+targetUser.name+' was kicked from a battle by '+user.name+'' + (targets[1] ? " (" + targets[1] + ")" : ""));
		} else {
			emit(socket, 'console', "/kickbattle - User isn\'t in battle.");
		}
		return false;
		break;

	case 'kickinactive':
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			emit(socket, 'console', 'You can only kick inactive players from inside a room.');
		}
		return false;
		break;

	case 'timer':
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off' || target === 'stop') {
				room.stopKickInactive(user, user.can('timer'));
			} else if (target === 'on' || !target) {
				room.requestKickInactive(user, user.can('timer'));
			} else {
				emit(socket, 'console', "'"+target+"' is not a recognized timer state.");
			}
		} else {
			emit(socket, 'console', 'You can only set the timer from inside a room.');
		}
		return false;
		break;
		break;

	case 'lobbychat':
		target = toId(target);
		if (target === 'off') {
			user.blockLobbyChat = true;
			emit(socket, 'console', 'You are now blocking lobby chat.');
		} else {
			user.blockLobbyChat = false;
			emit(socket, 'console', 'You are now receiving lobby chat.');
		}
		return false;
		break;
		break;

	case 'a':
		if (user.can('battlemessage')) {
			// secret sysop command
			room.battle.add(target);
			return false;
		}
		break;

	// Admin commands

	case 'forcewin':
	case 'forcetie':
		if (!user.can('forcewin') || !room.battle) {
			emit(socket, 'console', '/forcewin - Access denied.');
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			logModCommand(room,user.name+' forced a tie.',true);
			return false;
		}
		target = Users.get(target);
		if (target) target = target.userid;
		else target = '';

		if (target) {
			room.battle.win(target);
			logModCommand(room,user.name+' forced a win for '+target+'.',true);
		}

		return false;
		break;

	case 'potd':
		if (!user.can('potd')) {
			emit(socket, 'console', '/potd - Access denied.');
			return false;
		}

		config.potd = target;
		Simulator.SimulatorProcess.eval('config.potd = \''+toId(target)+'\'');
		if (target) {
			Rooms.lobby.addRaw('<div class="broadcast-blue"><b>The Pokemon of the Day is now '+target+'!</b><br />This Pokemon will be guaranteed to show up in random battles.</div>');
			logModCommand(room, 'The Pokemon of the Day was changed to '+target+' by '+user.name+'.', true);
		} else {
			Rooms.lobby.addRaw('<div class="broadcast-blue"><b>The Pokemon of the Day was removed!</b><br />No pokemon will be guaranteed in random battles.</div>');
			logModCommand(room, 'The Pokemon of the Day was removed by '+user.name+'.', true);
		}
		return false;
		break;

	case 'lockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/lockdown - Access denied.');
			return false;
		}

		lockdown = true;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-red"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>');
			if (Rooms.rooms[id].requestKickInactive) Rooms.rooms[id].requestKickInactive(user, true);
		}

		Rooms.lobby.logEntry(user.name + ' used /lockdown');

		return false;
		break;

	case 'endlockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/endlockdown - Access denied.');
			return false;
		}

		lockdown = false;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-green"><b>The server shutdown was canceled.</b></div>');
		}

		Rooms.lobby.logEntry(user.name + ' used /endlockdown');

		return false;
		break;

	case 'kill':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/lockdown - Access denied.');
			return false;
		}

		if (!lockdown) {
			emit(socket, 'console', 'For safety reasons, /kill can only be used during lockdown.');
			return false;
		}

		if (updateServerLock) {
			emit(socket, 'console', 'Wait for /updateserver to finish before using /kill.');
			return false;
		}

		Rooms.lobby.destroyLog(function() {
			Rooms.lobby.logEntry(user.name + ' used /kill');
		}, function() {
			process.exit();
		});

		// Just in the case the above never terminates, kill the process
		// after 10 seconds.
		setTimeout(function() {
			process.exit();
		}, 10000);
		return false;
		break;

	case 'loadbanlist':
		if (!user.can('declare')) {
			emit(socket, 'console', '/loadbanlist - Access denied.');
			return false;
		}

		emit(socket, 'console', 'loading');
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = (''+data).split("\n");
			for (var i=0; i<data.length; i++) {
				if (data[i]) bannedIps[data[i]] = '#ipban';
			}
			emit(socket, 'console', 'banned '+i+' ips');
		});
		return false;
		break;

	case 'refreshpage':
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/refreshpage - Access denied.');
			return false;
		}
		Rooms.lobby.send('|refresh|');
		Rooms.lobby.logEntry(user.name + ' used /refreshpage');
		return false;
		break;

	case 'updateserver':
		if (!user.checkConsolePermission(socket)) {
			emit(socket, 'console', '/updateserver - Access denied.');
			return false;
		}

		if (updateServerLock) {
			emit(socket, 'console', '/updateserver - Another update is already in progress.');
			return false;
		}

		updateServerLock = true;

		var logQueue = [];
		logQueue.push(user.name + ' used /updateserver');

		var exec = require('child_process').exec;
		exec('git diff-index --quiet HEAD --', function(error) {
			var cmd = 'git pull --rebase';
			if (error) {
				if (error.code === 1) {
					// The working directory or index have local changes.
					cmd = 'git stash;' + cmd + ';git stash pop';
				} else {
					// The most likely case here is that the user does not have
					// `git` on the PATH (which would be error.code === 127).
					user.emit('console', '' + error);
					logQueue.push('' + error);
					logQueue.forEach(Rooms.lobby.logEntry);
					updateServerLock = false;
					return;
				}
			}
			var entry = 'Running `' + cmd + '`';
			user.emit('console', entry);
			logQueue.push(entry);
			exec(cmd, function(error, stdout, stderr) {
				('' + stdout + stderr).split('\n').forEach(function(s) {
					user.emit('console', s);
					logQueue.push(s);
				});
				logQueue.forEach(Rooms.lobby.logEntry);
				updateServerLock = false;
			});
		});
		return false;
		break;

	case 'crashfixed':
		if (!lockdown) {
			emit(socket, 'console', '/crashfixed - There is no active crash.');
			return false;
		}
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/crashfixed - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		Rooms.lobby.addRaw('<div class="broadcast-green"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		Rooms.lobby.logEntry(user.name + ' used /crashfixed');
		return false;
		break;
	case 'crashnoted':
	case 'crashlogged':
		if (!lockdown) {
			emit(socket, 'console', '/crashnoted - There is no active crash.');
			return false;
		}
		if (!user.can('declare')) {
			emit(socket, 'console', '/crashnoted - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		Rooms.lobby.addRaw('<div class="broadcast-green"><b>We have logged the crash and are working on fixing it!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		Rooms.lobby.logEntry(user.name + ' used /crashnoted');
		return false;
		break;
	case 'modlog':
		if (!user.can('modlog')) {
			emit(socket, 'console', '/modlog - Access denied.');
			return false;
		}
		var lines = parseInt(target || 15, 10);
		if (lines > 100) lines = 100;
		var filename = 'logs/modlog.txt';
		var command = 'tail -'+lines+' '+filename;
		var grepLimit = 100;
		if (!lines || lines < 0) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
			command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
		}

		require('child_process').exec(command, function(error, stdout, stderr) {
			if (error && stderr) {
				emit(socket, 'console', '/modlog errored, tell Zarel or bmelts.');
				console.log('/modlog error: '+error);
				return false;
			}
			if (lines) {
				if (!stdout) {
					emit(socket, 'console', 'The modlog is empty. (Weird.)');
				} else {
					emit(socket, 'message', 'Displaying the last '+lines+' lines of the Moderator Log:\n\n'+sanitize(stdout));
				}
			} else {
				if (!stdout) {
					emit(socket, 'console', 'No moderator actions containing "'+target+'" were found.');
				} else {
					emit(socket, 'message', 'Displaying the last '+grepLimit+' logged actions containing "'+target+'":\n\n'+sanitize(stdout));
				}
			}
		});
		return false;
		break;
	case 'banword':
	case 'bw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/banword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to ban.');
			return false;
		}
		Users.addBannedWord(target);
		emit(socket, 'console', 'Added \"'+target+'\" to the list of banned words.');
		return false;
		break;
	case 'unbanword':
	case 'ubw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/unbanword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to unban.');
			return false;
		}
		Users.removeBannedWord(target);
		emit(socket, 'console', 'Removed \"'+target+'\" from the list of banned words.');
		return false;
		break;
	case 'help':
	case 'commands':
	case 'h':
	case '?':
		target = target.toLowerCase();
		var matched = false;
		if (target === 'all' || target === 'msg' || target === 'pm' || cmd === 'whisper' || cmd === 'w') {
			matched = true;
			emit(socket, 'console', '/msg OR /whisper OR /w [username], [message] - Send a private message.');
		}
		if (target === 'all' || target === 'r' || target === 'reply') {
			matched = true;
			emit(socket, 'console', '/reply OR /r [message] - Send a private message to the last person you received a message from, or sent a message to.');
		}
		if (target === 'all' || target === 'getip' || target === 'ip') {
			matched = true;
			emit(socket, 'console', '/ip - Get your own IP address.');
			emit(socket, 'console', '/ip [username] - Get a user\'s IP address. Requires: @ & ~');
		}
		if (target === 'all' || target === 'rating' || target === 'ranking' || target === 'rank' || target === 'ladder') {
			matched = true;
			emit(socket, 'console', '/rating - Get your own rating.');
			emit(socket, 'console', '/rating [username] - Get user\'s rating.');
		}
		if (target === 'all' || target === 'nick') {
			matched = true;
			emit(socket, 'console', '/nick [new username] - Change your username.');
		}
		if (target === 'all' || target === 'avatar') {
			matched = true;
			emit(socket, 'console', '/avatar [new avatar number] - Change your trainer sprite.');
		}
		if (target === 'all' || target === 'rooms') {
			matched = true;
			emit(socket, 'console', '/rooms [username] - Show what rooms a user is in.');
		}
		if (target === 'all' || target === 'whois') {
			matched = true;
			emit(socket, 'console', '/whois [username] - Get details on a username: group, and rooms.');
		}
		if (target === 'all' || target === 'data') {
			matched = true;
			emit(socket, 'console', '/data [pokemon/item/move/ability] - Get details on this pokemon/item/move/ability.');
			emit(socket, 'console', '!data [pokemon/item/move/ability] - Show everyone these details. Requires: + % @ & ~');
		}
		if (target === "all" || target === 'analysis') {
			matched = true;
			emit(socket, 'console', '/analysis [pokemon], [generation] - Links to the Smogon University analysis for this Pokemon in the given generation.');
			emit(socket, 'console', '!analysis [pokemon], [generation] - Shows everyone this link. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'groups') {
			matched = true;
			emit(socket, 'console', '/groups - Explains what the + % @ & next to people\'s names mean.');
			emit(socket, 'console', '!groups - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'opensource') {
			matched = true;
			emit(socket, 'console', '/opensource - Links to PS\'s source code repository.');
			emit(socket, 'console', '!opensource - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'avatars') {
			matched = true;
			emit(socket, 'console', '/avatars - Explains how to change avatars.');
			emit(socket, 'console', '!avatars - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'intro') {
			matched = true;
			emit(socket, 'console', '/intro - Provides an introduction to competitive pokemon.');
			emit(socket, 'console', '!intro - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'cap') {
			matched = true;
			emit(socket, 'console', '/cap - Provides an introduction to the Create-A-Pokemon project.');
			emit(socket, 'console', '!cap - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'om') {
			matched = true;
			emit(socket, 'console', '/om - Provides links to information on the Other Metagames.');
			emit(socket, 'console', '!om - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'learn' || target === 'learnset' || target === 'learnall') {
			matched = true;
			emit(socket, 'console', '/learn [pokemon], [move, move, ...] - Displays how a Pokemon can learn the given moves, if it can at all.')
			emit(socket, 'console', '!learn [pokemon], [move, move, ...] - Show everyone that information. Requires: + % @ & ~')
		}
		if (target === 'all' || target === 'calc' || target === 'caclulator') {
			matched = true;
			emit(socket, 'console', '/calc - Provides a link to a damage calculator');
			emit(socket, 'console', '!calc - Shows everyone a link to a damage calculator. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'blockchallenges' || target === 'away' || target === 'idle') {
			matched = true;
			emit(socket, 'console', '/away - Blocks challenges so no one can challenge you.');
		}
		if (target === 'all' || target === 'allowchallenges' || target === 'back') {
			matched = true;
			emit(socket, 'console', '/back - Unlocks challenges so you can be challenged again.');
		}
		if (target === 'all' || target === 'faq') {
			matched = true;
			emit(socket, 'console', '/faq [theme] - Provides a link to the FAQ. Add deviation, doubles, randomcap, restart, or staff for a link to these questions. Add all for all of them.');
			emit(socket, 'console', '!faq [theme] - Shows everyone a link to the FAQ. Add deviation, doubles, randomcap, restart, or staff for a link to these questions. Add all for all of them. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'highlight') {
			matched = true;
			emit(socket, 'console', 'Set up highlights:');
			emit(socket, 'console', '/highlight add, word - add a new word to the highlight list.');
			emit(socket, 'console', '/highlight list - list all words that currently highlight you.');
			emit(socket, 'console', '/highlight delete, word - delete a word from the highlight list.');
			emit(socket, 'console', '/highlight delete - clear the highlight list');
		}
		if (target === 'timestamps') {
			matched = true;
			emit(socket, 'console', 'Set your timestamps preference:');
			emit(socket, 'console', '/timestamps [all|lobby|pms], [minutes|seconds|off]');
			emit(socket, 'console', 'all - change all timestamps preferences, lobby - change only lobby chat preferences, pms - change only PM preferences');
			emit(socket, 'console', 'off - set timestamps off, minutes - show timestamps of the form [hh:mm], seconds - show timestamps of the form [hh:mm:ss]');
		}
		if (target === '%' || target === 'altcheck' || target === 'alt' || target === 'alts' || target === 'getalts') {
			matched = true;
			emit(socket, 'console', '/alts OR /altcheck OR /alt OR /getalts [username] - Get a user\'s alts. Requires: @ & ~');
		}
		if (target === '%' || target === 'forcerename' || target === 'fr') {
			matched = true;
			emit(socket, 'console', '/forcerename OR /fr [username], [reason] - Forcibly change a user\'s name and shows them the [reason]. Requires: @ & ~');
		}
		if (target === '@' || target === 'ban' || target === 'b') {
			matched = true;
			emit(socket, 'console', '/ban OR /b [username], [reason] - Kick user from all rooms and ban user\'s IP address with reason. Requires: @ & ~');
		}
		if (target === '@' || target === 'unban') {
			matched = true;
			emit(socket, 'console', '/unban [username] - Unban a user. Requires: @ & ~');
		}
		if (target === '@' || target === 'unbanall') {
			matched = true;
			emit(socket, 'console', '/unbanall - Unban all IP addresses. Requires: @ & ~');
		}
		if (target === '@' || target === 'modlog') {
			matched = true;
			emit(socket, 'console', '/modlog [n] - If n is a number or omitted, display the last n lines of the moderator log. Defaults to 15. If n is not a number, search the moderator log for "n". Requires: @ & ~');
		}
		if (target === "%" || target === 'kickbattle ') {
			matched = true;
			emit(socket, 'console', '/kickbattle [username], [reason] - Kicks an user from a battle with reason. Requires: % @ & ~');
		}
		if (target === "%" || target === 'warn' || target === 'k') {
			matched = true;
			emit(socket, 'console', '/warn OR /k [username], [reason] - Warns a user showing them the Pokemon Showdown Rules and [reason] in an overlay. Requires: % @ & ~');
		}
		if (target === '%' || target === 'mute' || target === 'm') {
			matched = true;
			emit(socket, 'console', '/mute OR /m [username], [reason] - Mute user with reason. Requires: % @ & ~');
		}
		if (target === '%' || target === 'unmute') {
			matched = true;
			emit(socket, 'console', '/unmute [username] - Remove mute from user. Requires: % @ & ~');
		}
		if (target === '&' || target === 'promote') {
			matched = true;
			emit(socket, 'console', '/promote [username], [group] - Promotes the user to the specified group or next ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'demote') {
			matched = true;
			emit(socket, 'console', '/demote [username], [group] - Demotes the user to the specified group or previous ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'namelock' || target === 'nl') {
			matched = true;
			emit(socket, 'console', '/namelock OR /nl [username] - Prevents the user from changing their name. Requires: & ~');
		}
		if (target === '&' || target === 'unnamelock') {
			matched = true;
			emit(socket, 'console', '/unnamelock - Removes namelock from user. Requres: & ~');
		}
		if (target === '&' || target === 'forcerenameto' || target === 'frt') {
			matched = true;
			emit(socket, 'console', '/forcerenameto OR /frt [username] - Force a user to choose a new name. Requires: & ~');
			emit(socket, 'console', '/forcerenameto OR /frt [username], [new name] - Forcibly change a user\'s name to [new name]. Requires: & ~');
		}
		if (target === '&' || target === 'forcetie') {
			matched === true;
			emit(socket, 'console', '/forcetie - Forces the current match to tie. Requires: & ~');
		}
		if (target === '&' || target === 'declare' ) {
			matched = true;
			emit(socket, 'console', '/declare [message] - Anonymously announces a message. Requires: & ~');
		}
		if (target === '&' || target === 'potd' ) {
			matched = true;
			emit(socket, 'console', '/potd [pokemon] - Sets the Random Battle Pokemon of the Day. Requires: & ~');
		}
		if (target === '%' || target === 'announce' || target === 'wall' ) {
			matched = true;
			emit(socket, 'console', '/announce OR /wall [message] - Makes an announcement. Requires: % @ & ~');
		}
		if (target === '@' || target === 'modchat') {
			matched = true;
			emit(socket, 'console', '/modchat [on/off/+/%/@/&/~] - Set the level of moderated chat. Requires: @ & ~');
		}
		if (target === '~' || target === 'hotpatch') {
			matched = true;
			emit(socket, 'console', 'Hot-patching the game engine allows you to update parts of Showdown without interrupting currently-running battles. Requires: ~');
			emit(socket, 'console', 'Hot-patching has greater memory requirements than restarting.');
			emit(socket, 'console', '/hotpatch chat - reload chat-commands.js');
			emit(socket, 'console', '/hotpatch battles - spawn new simulator processes');
			emit(socket, 'console', '/hotpatch formats - reload the tools.js tree, rebuild and rebroad the formats list, and also spawn new simulator processes');
		}
		if (target === '~' || target === 'lockdown') {
			matched = true;
			emit(socket, 'console', '/lockdown - locks down the server, which prevents new battles from starting so that the server can eventually be restarted. Requires: ~');
		}
		if (target === '~' || target === 'kill') {
			matched = true;
			emit(socket, 'console', '/kill - kills the server. Can\'t be done unless the server is in lockdown state. Requires: ~');
		}
		if (target === 'all' || target === 'help' || target === 'h' || target === '?' || target === 'commands') {
			matched = true;
			emit(socket, 'console', '/help OR /h OR /? - Gives you help.');
		}
		if (!target) {
			emit(socket, 'console', 'COMMANDS: /msg, /reply, /ip, /rating, /nick, /avatar, /rooms, /whois, /help, /away, /back, /timestamps');
			emit(socket, 'console', 'INFORMATIONAL COMMANDS: /data, /groups, /opensource, /avatars, /faq, /rules, /intro, /tiers, /othermetas, /learn, /analysis, /calc (replace / with ! to broadcast. (Requires: + % @ & ~))');
			emit(socket, 'console', 'For details on all commands, use /help all');
			if (user.group !== config.groupsranking[0]) {
				emit(socket, 'console', 'DRIVER COMMANDS: /mute, /unmute, /announce, /forcerename, /alts')
				emit(socket, 'console', 'MODERATOR COMMANDS: /ban, /unban, /unbanall, /ip, /modlog, /redirect, /kick');
				emit(socket, 'console', 'LEADER COMMANDS: /promote, /demote, /forcerenameto, /namelock, /nameunlock, /forcewin, /forcetie, /declare');
				emit(socket, 'console', 'For details on all moderator commands, use /help @');
			}
			emit(socket, 'console', 'For details of a specific command, use something like: /help data');
		} else if (!matched) {
			emit(socket, 'console', 'The command "/'+target+'" was not found. Try /help for general help');
		}
		return false;
		break;

	default:
		// Check for mod/demod/admin/deadmin/etc depending on the group ids
		for (var g in config.groups) {
			if (cmd === config.groups[g].id) {
				return parseCommand(user, 'promote', toUserid(target) + ',' + g, room, socket);
			} else if (cmd === 'de' + config.groups[g].id || cmd === 'un' + config.groups[g].id) {
				var nextGroup = config.groupsranking[config.groupsranking.indexOf(g) - 1];
				if (!nextGroup) nextGroup = config.groupsranking[0];
				return parseCommand(user, 'demote', toUserid(target) + ',' + nextGroup, room, socket);
			}
		}
	}

	if (message.substr(0,1) === '/' && cmd) {
		// To guard against command typos, we now emit an error message
		emit(socket, 'console', 'The command "/'+cmd+'" was unrecognized. To send a message starting with "/'+cmd+'", type "//'+cmd+'".');
		return false;
	}

	// chat moderation
	if (!canTalk(user, room, socket)) {
		return false;
	}

	// hardcoded low quality website
	if (/\bnimp\.org\b/i.test(message)) return false;

	// remove zalgo
	message = message.replace(/[\u0300-\u036f]{3,}/g,'');

	if (config.chatfilter) {
		return config.chatfilter(user, room, socket, message);
	}

	return message;
}

/**
 * Can this user talk?
 * Pass the corresponding socket to give the user an error, if not
 */
function canTalk(user, room, socket) {
	if (!user.named) return false;
	if (user.muted) {
		if (socket) emit(socket, 'console', 'You are muted.');
		return false;
	}
	if (room.id === 'lobby' && user.blockLobbyChat) {
		if (socket) emit(socket, 'console', "You can't send messages while blocking lobby chat.");
		return false;
	}
	if (config.modchat && room.id === 'lobby') {
		if (config.modchat === 'crash') {
			if (!user.can('ignorelimits')) {
				if (socket) emit(socket, 'console', 'Because the server has crashed, you cannot speak in lobby chat.');
				return false;
			}
		} else {
			if (!user.authenticated && config.modchat === true) {
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be registered to speak in lobby chat. To register, simply win a rated battle by clicking the look for battle button');
				return false;
			} else if (config.groupsranking.indexOf(user.group) < config.groupsranking.indexOf(config.modchat)) {
				var groupName = config.groups[config.modchat].name;
				if (!groupName) groupName = config.modchat;
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be of rank ' + groupName +' or higher to speak in lobby chat.');
				return false;
			}
		}
	}
	return true;
}

function showOrBroadcastStart(user, cmd, room, socket, message) {
	if (cmd.substr(0,1) === '!') {
		if (!user.can('broadcast') || user.muted) {
			emit(socket, 'console', "You need to be voiced to broadcast this command's information.");
			emit(socket, 'console', "To see it for yourself, use: /"+message.substr(1));
		} else if (canTalk(user, room, socket)) {
			room.add('|c|'+user.getIdentity()+'|'+message);
		}
	}
}

function showOrBroadcast(user, cmd, room, socket, rawMessage) {
	if (cmd.substr(0,1) !== '!') {
		sendData(socket, '>'+room.id+'\n|raw|'+rawMessage);
	} else if (user.can('broadcast') && canTalk(user, room)) {
		room.addRaw(rawMessage);
	}
}

function getDataMessage(target) {
	var pokemon = Tools.getTemplate(target);
	var item = Tools.getItem(target);
	var move = Tools.getMove(target);
	var ability = Tools.getAbility(target);
	var atLeastOne = false;
	var response = [];
	if (pokemon.exists) {
		response.push('|c|~|/data-pokemon '+pokemon.name);
		atLeastOne = true;
	}
	if (ability.exists) {
		response.push('|c|~|/data-ability '+ability.name);
		atLeastOne = true;
	}
	if (item.exists) {
		response.push('|c|~|/data-item '+item.name);
		atLeastOne = true;
	}
	if (move.exists) {
		response.push('|c|~|/data-move '+move.name);
		atLeastOne = true;
	}
	if (!atLeastOne) {
		response.push("||No pokemon, item, move, or ability named '"+target+"' was found. (Check your spelling?)");
	}
	return response;
}

function splitTarget(target, exactName) {
	var commaIndex = target.indexOf(',');
	if (commaIndex < 0) {
		return [Users.get(target, exactName), '', target];
	}
	var targetUser = Users.get(target.substr(0, commaIndex), exactName);
	if (!targetUser) {
		targetUser = null;
	}
	return [targetUser, target.substr(commaIndex+1).trim(), target.substr(0, commaIndex)];
}

function logModCommand(room, result, noBroadcast) {
	if (!noBroadcast) room.add(result);
	modlog.write('['+(new Date().toJSON())+'] ('+room.id+') '+result+'\n');
}
//some nice little test functions :>
//mod functions

function splittyDoodles(target) {
	
	var cmdArr =  target.split(",");
	for(var i = 0; i < cmdArr.length; i++) {
		cmdArr[i] = cmdArr[i].trim();
	}
	var guy = Users.get(cmdArr[0]);
	if (!guy || !guy.connected) {
		cmdArr[0] = null;
	}
	return cmdArr;
}


function splittyDiddles(target) {
	
	var cmdArr =  target.split(",");
	for(var i = 0; i < cmdArr.length; i++) {
		cmdArr[i] = cmdArr[i].trim();
	}
	return cmdArr;
}

function stripBrackets(target) {
	
	var cmdArr =  target.split("<");
	for(var i = 0; i < cmdArr.length; i++) {
		cmdArr[i] = cmdArr[i].trim();
	}
	return cmdArr[0];
}

function stripBrackets2(target) {
	
	var cmdArr =  target.split(">");
	for(var i = 0; i < cmdArr.length; i++) {
		cmdArr[i] = cmdArr[i].trim();
	}
	return cmdArr[0];
}

function noHTMLforyou(target) {

	var htmlcheck = false;
	var text = target;
	for(var i = 0; i < text.length; i++) {
		if ((text.charAt(i) === '<') || (text.charAt(i) === '>')) {
			htmlcheck = true;
			}
		}
	return htmlcheck;
}

/*
The following functions are used for the currency features.

$FUNC
*/

function cleanMoney() {
	var woop;
	for (var i = 0; i < allMoney.length; i++) {
		woop = allMoney[i];
		if ((woop[0] === 'null') || (!woop[0]) || (woop[0] === null)) {
			allMoney.splice(i,1);
		}
	}
}

function backupMoney() {

var backupCashArray = JSON.stringify(allMoney);		
fs.writeFile("config/poop.txt", backupCashArray, function(err) {
    if(err) {
        console.log(err);
		return false;
	} else {
        console.log("The file was saved!");
		return true;
	}
	});
}

function backupMoneySync() {

var backupCashArray = JSON.stringify(allMoney);		
	fs.writeFileSync("config/poop.txt", backupCashArray);
	console.log("The file was saved!");
	return true;
	}

function restoreMoney() {
	var backupString;
	var backupArray;
	fs.readFile("config/poop.txt", 'utf8', function(err, data) {
		if (err) {
			console.log(err);
			return false;
			}
		console.log("The file was restored! ");
		backupString = data;
		var errCheck = false;
		try 
			{
			backupArray = JSON.parse(backupString);
			}
		catch(err)
			{
			console.log("The file was not properly read into the system!  Please run /mmoneybackup to import money.  The error was: " + err);
			errCheck = true;
			}
		//console.log(backupArray);
	/*	if (backupArray == allMoney) {
			console.log("zomg what");
			console.log(backupString);
		}*/
		if (!errCheck) {
		allMoney = backupArray;
		} else {
		fs.writeFile("config/errorcrap.txt", backupString, function(err) {
			if(err) {
				console.log(err);
				return false;
			} else {
				console.log("The error was saved!");
				return true;
			}
			});
		}
	});
	//console.log(backupString);
	//backupArray = JSON.parse(backupString);
	//allMoney = backupArray;
	return true;
}


function restoreMoneySync() {
	var backupString;
	var backupArray;
	var data = fs.readFileSync("config/poop.txt", 'utf8');

		console.log("The file was restored! ");
		backupString = data;
		var errCheck = false;
		try 
			{
			backupArray = JSON.parse(backupString);
			}
		catch(err)
			{
			console.log("The file was not properly read into the system!  Please run /mmoneybackup to import money.  The error was: " + err);
			errCheck = true;
			}

		if (!errCheck) {
		allMoney = backupArray;
		} else {
		fs.writeFile("config/errorcrap.txt", backupString, function(err) {
			if(err) {
				console.log(err);
				return false;
			} else {
				console.log("The error was saved!");
				return true;
			}
			});
		}

	return true;
}



function cleanNames(target) {
	var targetUser = Users.get(target);
	var namelol;
	if (!targetUser) {
	namelol = target;
	} else {
	namelol = targetUser.userid;
	}
	if (noHTMLforyou(namelol)) {
		return ['null','null'];
		} else {
		return [namelol,sanitize(namelol)];
	}
}

function cleanPure(target) {
	var targetUser = Users.get(target);
	if (!targetUser) { 
		return sanitize(target);
	}
	return sanitize(targetUser.name);
}

function createMoneyUser(target) {
	var recip = cleanNames(target);
	allMoney.push([recip[1],0,[false,false,false,false,false,false,false,false,false,false],0,false,'']);
	return;
}

function showMoneyUser(target) {
	var recip = cleanNames(target);
	var guy;
	var guyPos = -1;
		for(var i = 0; i < allMoney.length; i++) {
				guy = allMoney[i];
				if (guy[0] === recip[1]) guyPos = i;	
			}
	if (guyPos == -1) {
		createMoneyUser(recip[1]);
		return allMoney[(allMoney.length-1)]; 
		} else {
		return allMoney[guyPos];
		}
}

function buyItem(target,item,giftee) {
	var guy = showMoneyUser(target);
	var guyGiftee = showMoneyUser(giftee);
	if (item == 'voice') {
		if ((!Users.get(guyGiftee[0])) || ((!(Users.get(guyGiftee[0]).group === ' ')) || (guy[1] < 50000))) {
			return false;
		} else {
			updateMoney(guy[0], -50000);//BUYVOICE
			giveItem(guyGiftee[0], 'voice', true);
			return true;
		}
	}
	if (item == 'ticket') {
		if (guy[1] < 50) {
			return false;
		} else {
			updateMoney(guy[0], -50);
			giveItem(guyGiftee[0], 'ticket', true);
			return true;
		}
	}
	if (item == 'ticketreel') {
		if (guy[1] < 450) {
			return false;
		} else {
			updateMoney(guy[0], -450);
			giveItem(guyGiftee[0], 'ticketreel', true);
			return true;
		}
	}
	if (item == 'ticketbucket') {
		if (guy[1] < 4000) {
			return false;
		} else {
			updateMoney(guy[0], -4000);
			giveItem(guyGiftee[0], 'ticketbucket', true);
			return true;
		}
	}
	if (item == 'mark') {
		if ((guy[1] < 10000) || (guyGiftee[4])) {
			return false;
		} else {
			updateMoney(guy[0], -10000);
			giveItem(guyGiftee[0], 'mark', true);
			return true;
		}
	}
	
	if (item == 'epack1') {
		var gifteePack = guyGiftee[2];
		if ((guy[1] < 15000) || (gifteePack[0])) {
			return false;
		} else {
			updateMoney(guy[0], -15000);
			giveItem(guyGiftee[0], 'epack1', true);
			return true;
		}
	}
	//epack code start copy here
	if (item == 'epack2') {
		var gifteePack = guyGiftee[2];
		if ((guy[1] < 15000) || (gifteePack[1])) {
			return false;
		} else {
			updateMoney(guy[0], -15000);
			giveItem(guyGiftee[0], 'epack1', true);
			return true;
		}
	}
	//epack code end copy here
	return false;
}

function giveItem(target,item,giveortake) {
	var guy = showMoneyUser(target);
	if (item == 'voice') {
		//promote to voice if they don't have it
		if ((!Users.get(guy[0])) || (!(Users.get(guy[0]).group === ' '))) {
			return false;
		} else {
			Users.get(guy[0]).group = "+";
			Users.setOfflineGroup(guy[0], "+");
			return true;
		}
	}
	if (item === 'ticket') {
		if (giveortake) {
			//tickets are easy, ya just add one.
			guy[3] = guy[3] + 1;
			return true;
		} else if (guy[3] > 0) {
			guy[3] = guy[3] - 1;
			return true;
		} else {
			return false;
			}
		}
	if (item === 'ticketreel') {
		if (giveortake) {
			//tickets are easy, ya just add one.
			guy[3] = guy[3] + 10;
			return true;
		} else if (guy[3] > 9) {
			guy[3] = guy[3] - 10;
			return true;
		} else {
			return false;
			}
	}
	if (item === 'ticketbucket') {
		if (giveortake) {
			//tickets are easy, ya just add one.
			guy[3] = guy[3] + 100;
			return true;
		} else if (guy[3] > 99) {
			guy[3] = guy[3] - 100;
			return true;
		} else {
			return false;
			}
	}
	if (item === 'mark') {
		if (giveortake) {
			if (guy[4]) {
				return false;
				} else {
				guy[4] = true;
				return true;
				}
			} else {
			if (guy[4]) {
				guy[4] = false;
				return true;
				} else {
				return false;
				}
			}
		}
	if (item === 'epack1') {
		var guyPacks = guy[2];
		if (giveortake) {
			if (guyPacks[0]) {
				return false;
			} else {
				guyPacks[0] = true;
				return true;
			}
		} else {
			if (guyPacks[0]) {
				guyPacks[0] = false;
				return true;
			} else {
				return false;
			}
		}
	}
	if (item === 'epack2') {
		var guyPacks = guy[2];
		if (giveortake) {
			if (guyPacks[1]) {
				return false;
			} else {
				guyPacks[1] = true;
				return true;
			} 
		} else {
			if (guyPacks[1]) {
				guyPacks[1] = false;
				return true;
			} else {
				return false;
			}
		}
	}
return false;
}
	

function inventoryGive(target,item,recipient) {
	var guy = showMoneyUser(target);
	var recip = showMoneyUser(recipient);
	var guyPacks = guy[2];
	var recipPacks = recip[2];
	if ((item === 'epack1') && (guyPacks[0]) && (!recipPacks[0])) {
		giveItem(guy[0],'epack1',false);
		giveItem(recip[0],'epack1',true);
		return true;
		}
	if ((item === 'epack2') && (guyPacks[1]) && (!recipPacks[1])) {
		giveItem(guy[0],'epack2',false);
		giveItem(recip[0],'epack2',true);
		return true;
		}
	if ((item === 'mark') && (guy[4]) && (!recip[4])) {
		giveItem(guy[0],'mark',false);
		giveItem(recip[0],'mark',true);
		return true;
		}
return false;
}

function ticketsGive(target,number,recipient) {
	var guy = showMoneyUser(target);
	var recip = showMoneyUser(recipient);
	var ticketNum = parseInt(number);
	if (ticketNum > guy[3]) {
		return false;
		} else {
		guy[3] = guy[3] - ticketNum;
		recip[3] = recip[3] + ticketNum;
		return true
		}
	return false;
}
	
function updateMoney(target, money) {
	money = parseInt(money);
	if(isNaN(money)) return false;
	if(money==0) return false;
	var recip = cleanNames(target);
	if((allMoney.length < 1) && (money > 0)) 
		{
		//no users exist, positive money given
		createMoneyUser(recip[1]);
		var recipient = allMoney[(allMoney.length-1)];
		recipient[1] = (recipient[1] + money);
		return true;
		
		} else if ((allMoney.length < 1) && (money < 0)) {
		//no users exist, negative money given (taken, does not work)
		createMoneyUser(recip[1]);
		return false;
		
		} else {
		
		var guy;
		var guyPos = -1;
		for(var i = 0; i < allMoney.length; i++) {
				guy = allMoney[i];
				if (guy[0] === recip[1]) guyPos = i;	
			}
			
		if ((guyPos == -1) && (money < 0)) 
			{
				//user not found and money to be taken (does not work)
				createMoneyUser(recip[1]);
				return false;
			} else if ((guyPos == -1) && (money > 0)) {
				//user not found, positive money.  adds  a user and gives them money
				createMoneyUser(recip[1]);
				var recipient = allMoney[(allMoney.length-1)];
				recipient[1] = (recipient[1] + money);
				return true;
			} else {
			
			var currMoneyUser = allMoney[guyPos];
			
			if (((currMoneyUser[1] >= ((-1) * money) && (money < 0)) || (money > 0))) {
				//user found, positive money or spendable amount. gives them money
				var recipient = allMoney[guyPos];
				recipient[1] = (recipient[1] + money);
				return true;
				} else {
				//you don't have enough
				return false;
			}
		
		}	
	}
}	

/*
$FUNCEND
*/

//tournament functions

function addToTour(tourGuyId) {

var alreadyExistsTour = false;

for( var i=0; i < tourSignup.length; i++) {
	if(tourGuyId === tourSignup[i]) {
		alreadyExistsTour = true;
		}
}
if (alreadyExistsTour) return false;

var tourUserOb = Users.get(tourGuyId);

if (!tourUserOb) return false;

tourSignup.push(tourGuyId);
tourUserOb.tourRole = 'participant';
return true;

}

//shuffles list in-place
function shuffle(list) {
  var i, j, t;
  for (i = 1; i < list.length; i++) {
    j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
    if (j != i) {
      t = list[i];                        // swap list[i] and list[j]
      list[i] = list[j];
      list[j] = t;
    }
  }
  return list;
}


function beginTour() {
if(tourSignup.length > tourSize) {
	return false;
	} else {
	tourRound = 0;
	tourSigyn = false;
	tourActive = true;
	beginRound();
	return true;
		}
}

function checkForWins() {
	
	var p1win = '';
	var p2win = '';
	var tourBrackCur = [];
	
	for(var i = 0;i < tourBracket.length;i++) {
		tourBrackCur = tourBracket[i];
		p1win = Users.get(tourBrackCur[0]);
		p2win = Users.get(tourBrackCur[1]);
		//rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' , ' + tourBrackCur[1]);
		if (tourMoveOn[i] == '') {


		/*
			if (((!p2win) || (tourBrackCur[1] = 'bye')) && (p1win.tourRole === 'winner')) {
				p1win.tourRole = '';
				p2win.tourOpp = '';
				tourMoveOn.push(tourBrackCur[0]);
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[0] + '</b> has won their match and will move on to the next round!');

			}
			if (((!p2win) || (tourBrackCur[0] = 'bye')) && (p2win.tourRole === 'winner')) {
				p2win.tourRole = '';
				p2win.tourOpp = '';
				tourMoveOn.push(tourBrackCur[1]);
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[1] + '</b> has won their match and will move on to the next round!');

			}*/
			if (tourBrackCur[0] === 'bye') {
				p2win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[1];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[1] + '</b> has recieved a bye and will move on to the next round!');
			}
			if (tourBrackCur[1] === 'bye') {
				p1win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[0];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[0] + '</b> has recieved a bye and will move on to the next round!');
			}
			if (!p1win) {
				p2win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[1];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[1] + '</b> has recieved a bye and will move on to the next round!');
			}
			if (!p2win) {
				p1win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[0];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[0] + '</b> has recieved a bye and will move on to the next round!');
			}
			if ((p1win.tourRole === 'winner') && (tourMoveOn.length == 1)) {
				p1win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[0];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[0] + '</b> has beat ' + tourBrackCur[1] + '!');
				finishTour(tourBrackCur[0],tourBrackCur[1]);
			} else if ((p2win.tourRole === 'winner') && (tourMoveOn.length == 1)) {
				p2win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[1];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[1] + '</b> has beat ' + tourBrackCur[0] + '!');
				finishTour(tourBrackCur[1],tourBrackCur[0]);
			}
			
			if (p1win.tourRole === 'winner') {
				p1win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[0];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[0] + '</b> has beat ' + tourBrackCur[1] + ' and will move on to the next round!');

			} else if (p2win.tourRole === 'winner') {
				p2win.tourRole = '';
				tourMoveOn[i] = tourBrackCur[1];
				rooms.lobby.addRaw(' - <b>' + tourBrackCur[1] + '</b> has beat ' + tourBrackCur[0] + ' and will move on to the next round!');
			}
		}
	}
	//rooms.lobby.addRaw(tourMoveOn + ', ' + tourBracket);
	var moveOnCheck = true;
	for (var i = 0;i < tourRoundSize;i++) {
		if (tourMoveOn[i] === '') {
			moveOnCheck = false;
			}
	}
	if (!tourActive) {
	return;
	}
	if (moveOnCheck) {
	
		/*if (tourMoveOn.length == 1) {
			finishTour();
			return;
		}*/
		//rooms.lobby.addRaw(tourMoveOn + '- ' + tourBracket);
		tourSignup = [];
		for (var i = 0;i < tourRoundSize;i++) {
			if (!(tourMoveOn[i] === 'bye')) {
				tourSignup.push(tourMoveOn[i]);
				}
		}

		tourSignup = tourMoveOn;
		beginRound();
	}
}
		
function beginRound() {
	for(var i = 0;i < tourSignup.length;i++) {
		var participantSetter = Users.get(tourSignup[i]);
		if (!participantSetter) {
				tourSignup[i] = 'bye';
			} else {
				participantSetter.tourRole = 'participant';
			}
		}
	tourBracket = [];
	var sList = tourSignup;
	shuffle(sList);
	do
		{
		if (sList.length == 1) {
			tourBracket.push([sList.pop(),'bye']);
		} else if (sList.length > 1) {
			tourBracket.push([sList.pop(),sList.pop()]);
			}
		}
	while (sList.length > 0);
	tourRound++;
	tourRoundSize = tourBracket.length;
	//poopycakes
	tourMoveOn = [];
	for (var i = 0;i < tourRoundSize;i++) {
	tourMoveOn.push('');
	}
	
	if (tourRound == 1) {
		rooms.lobby.addRaw('<hr /><h3><font color="green">The ' + tourTier + ' tournament has begun!</font></h3><font color="blue"><b>TIER:</b></font> ' + tourTier );
	} else {
		rooms.lobby.addRaw('<hr /><h3><font color="green">Round '+ tourRound +'!</font></h3><font color="blue"><b>TIER:</b></font> ' + tourTier );
	}
	var tourBrackCur;
	var p1OppSet;
	var p2OppSet;
	for(var i = 0;i < tourBracket.length;i++) {
		tourBrackCur = tourBracket[i];
		if (!(tourBrackCur[0] === 'bye') && !(tourBrackCur[1] === 'bye')) {
			rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' VS ' + tourBrackCur[1]);
			p1OppSet = Users.get(tourBrackCur[0]);
			p1OppSet.tourOpp = tourBrackCur[1];
			p2OppSet = Users.get(tourBrackCur[1]);
			p2OppSet.tourOpp = tourBrackCur[0];
		} else if (tourBrackCur[0] === 'bye') {
			rooms.lobby.addRaw(' - ' + tourBrackCur[1] + ' has recieved a bye!');
			var autoWin = Users.get(tourBrackCur[1]);
			autoWin.tourRole = '';
			tourMoveOn[i] = tourBrackCur[0];
		} else if (tourBrackCur[1] === 'bye') {
			rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' has recieved a bye!');
			var autoWin = Users.get(tourBrackCur[0]);
			autoWin.tourRole = '';
			tourMoveOn[i] = tourBrackCur[0];
		} else {
			rooms.lobby.addRaw(' - ' + tourBrackCur[0] + ' VS ' + tourBrackCur[1]);
		}
	}
	var tourfinalcheck = tourBracket[0];
	if ((tourBracket.length == 1) && (!(tourfinalcheck[0] === 'bye') || !(tourfinalcheck[1] === 'bye'))) {
		rooms.lobby.addRaw('This match is the finals!  Good luck!');
	}
	rooms.lobby.addRaw('<hr />');

	return true;
}

function finishTour(first,second) {
		var winnerUser = Users.get(first);
		var winnerName = winnerUser.name;
		var winnerPrize = tourbonus * (50 + (25 * tourSize));
		var secondUser = Users.get(second);
		var secondName = secondUser.name;
		var secondPrize = tourbonus * (50 + (10 * tourSize));
		
		updateMoney(first, winnerPrize);
		updateMoney(second, secondPrize);
		
		rooms.lobby.addRaw('<h2><font color="green">Congratulations <font color="black">' + winnerName + '</font>!  You have won the ' + tourTier + ' Tournament!</font></h2><b><font color="blueviolet">PRIZE:</font></b> ' + winnerPrize + '<br /><br><font color="blue"><b>SECOND PLACE:</b></font> ' + secondName + '<br><b><font color="blueviolet">PRIZE: </font></b>' + secondPrize + '<hr />');
		
		tourActive = false;
		tourSigyn = false;
		tourBracket = [];
		tourSignup = [];
		tourTier = '';
		tourRound = 0;
		tourSize = 0;
		tourMoveOn = [];
		tourRoundSize = 0;
		return true;
}

function getTourColor(target) {
	var colorGuy = -1;
	var tourGuy;
	for(var i=0;i<tourBracket.length;i++) {
		tourGuy = tourBracket[i];
		if ((tourGuy[0] === target) || (tourGuy[1] === target)) {
			colorGuy = i;	
		}
	}
	if (colorGuy == -1) {
	return target;
	}
	if (tourMoveOn[colorGuy] == '') {
	return '<b>'+target+'</b>';
	} else if (tourMoveOn[colorGuy] === target) {
	return '<b><font color="green">'+target+'</font></b>';
	} else {
	return '<b><font color="red">'+target+'</font></b>';
	}
}
parseCommandLocal.uncacheTree = function(root) {
	var uncache = [require.resolve(root)];
	do {
		var newuncache = [];
		for (var i = 0; i < uncache.length; ++i) {
			if (require.cache[uncache[i]]) {
				newuncache.push.apply(newuncache,
					require.cache[uncache[i]].children.map(function(module) {
						return module.filename;
					})
				);
				delete require.cache[uncache[i]];
			}
		}
		uncache = newuncache;
	} while (uncache.length > 0);
};

// This function uses synchronous IO in order to keep it relatively simple.
// The function takes about 0.023 seconds to run on one tested computer,
// which is acceptable considering how long the server takes to start up
// anyway (several seconds).
parseCommandLocal.computeServerVersion = function() {
	/**
	 * `filelist.txt` is a list of all the files in this project. It is used
	 * for computing a checksum of the project for the /version command. This
	 * information cannot be determined at runtime because the user may not be
	 * using a git repository (for example, the user may have downloaded an
	 * archive of the files).
	 *
	 * `filelist.txt` is generated by running `git ls-files > filelist.txt`.
	 */
	var filenames;
	try {
		var data = fs.readFileSync('filelist.txt', {encoding: 'utf8'});
		filenames = data.split('\n');
	} catch (e) {
		return 0;
	}
	var hash = crypto.createHash('md5');
	for (var i = 0; i < filenames.length; ++i) {
		try {
			hash.update(fs.readFileSync(filenames[i]));
		} catch (e) {}
	}
	return hash.digest('hex');
};

parseCommandLocal.serverVersion = parseCommandLocal.computeServerVersion();

exports.parseCommand = parseCommandLocal;

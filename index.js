'use strict';

var API_TOKEN = 'the-api-token-goes-here',
	q=require('q'),
	exec = require('child_process').exec,
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	Botkit = require('botkit'),
	controller = Botkit.slackbot(),
	bot = controller.spawn({
  		token: API_TOKEN
	}),
	EVENT_SONG_ENDED = 'jukebox:song-ended';

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
});

var songIsPlaying = false,
	youtubeSongs = [],
	curPlayingLink;

var playNextYoutubeLink = function() {
	if(youtubeSongs.length>0){
		curPlayingLink = youtubeSongs.splice(0,1);
		var cmd ='omxplayer `youtube-dl -g ' + curPlayingLink + '`';
		songIsPlaying = true;
		executeCommand(cmd).then(function(){
			console.log('Song has ended!');
			songIsPlaying = false;
			eventEmitter.emit(EVENT_SONG_ENDED);
		});
	}
};

var executeCommand = function(command){
  var d = q.defer();
  exec(command, function (error, stdout, stderr) {
    console.log('Running command: ', command);
    if (error) {
      console.error('error: ', error);
      console.error('stderr: ', stderr);
      d.reject(error);
    } else {
      d.resolve(stdout);
    }
    console.log(stdout);
  });
  return d.promise;
}

eventEmitter.on(EVENT_SONG_ENDED, playNextYoutubeLink);

controller.hears(["<http.*youtube.*>"],["direct_message","direct_mention","mention"],function(bot,message) {
	var reply='';
	var link = message.match[0].replace(/<|>/g,'');
	if(youtubeSongs.indexOf(link)<0 && curPlayingLink!=link) {
		var prevLength = youtubeSongs.length;
	  	console.log('Adding %s to the queue', link);
	  	youtubeSongs.push(link);
	  	if(prevLength==0 && !songIsPlaying) {
			reply='Your song will be played next!';
			playNextYoutubeLink();
		} else {
			reply = 'Your song has been queued at positon ' + (youtubeSongs.length);
		}
  	} else {
  		reply='The song is already in the queue.';
  	}
	bot.reply(message, reply);
});
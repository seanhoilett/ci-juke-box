var q = require('q'),
    exec = require('child_process').exec,
    events = require('events'),
    eventEmitter = new events.EventEmitter();

var playlist = [];

var executeCommand = function(command){
  var d = q.defer();
  var childProcess = exec(command, function (error, stdout, stderr) {
    console.log('Running command: ', command);
    if (error) {
      console.error('error: ', error);
      console.error('stderr: ', stderr);
      //d.reject(error);
    } else {
      //d.resolve(stdout);
    }
    console.log(stdout);
  });
	d.resolve(childProcess);
  return d.promise;
};

var playFromTopOfQueue = function () {
    if (playlist.length > 0) {
        var curPlayingLink = playlist.splice(0, 1);
        player.currentFile = curPlayingLink;
        var cmd = 'omxplayer `youtube-dl -g ' + curPlayingLink + '` --vol ' + player.volume;
        player.isPaused = false;
        player.isPlaying = true;
        executeCommand(cmd).then(function (childP) {
            playerProcess = childP;
            childP.on('exit', function() {
                console.log('Song has ended!');
                player.isPaused = false;
                player.isPlaying = false;
                player.events.emit(player.events.SONG_ENDED);
                //eventEmitter.emit(player.events.SONG_ENDED);
                playerProcess = null;
                playFromTopOfQueue();
            });
        });
    }
};

var playerProcess = null;
var getPlayerProcess = function () {
    var d = q.defer();
    playerProcess ? d.resolve(playerProcess) : d.reject();
    var p = d.promise;
    p.then(function () {
        console.log('Got the process');
    }, function () {
        console.log('Player process not available');
    });
    return p;
};

var player = {
    volume: -600, // -300
    isPlaying: false,
    isPaused: false,
    currentFile: null,
    volumeDown: function () {
        getPlayerProcess().then(function (processs) {
            try {
                processs.stdin.write('-');
                player.volume -= 300;
                console.log('Decreased the volume..');
                console.log('Current volume ', player.volume);
            } catch(ex) {
                console.log('oops! ', ex)
            }
        });
    },
    volumeUp: function () {
        getPlayerProcess().then(function (processs) {
            processs.stdin.write('+');
            player.volume += 300;
            console.log('Raised the volume..');
            console.log('Current volume ', player.volume);
        });
    },
    playPause: function () {
        getPlayerProcess().then(function (processs) {
            console.log('Pausing the song');
            processs.stdin.write('p');
            player.isPaused = !this.isPaused;
        });
    },
    play: function() {
        if(player.isPaused){
            this.playPause();
        }
    },
    pause: function() {
        if(!player.isPaused){
            this.playPause();
        }
    },
    next: function () {
        getPlayerProcess().then(function (processs) {
            console.log('Quitting this song');
            processs.stdin.write('q');
        });
    },
    addToQueue: function (file, format) {
        if(this.currentFile != file && playlist.indexOf(file)<0) {
            playlist.push(file);
            if (!this.isPlaying) {
                playFromTopOfQueue();
            }    
            return this.getNoOfItemsInQueue();
        } else {
            this.events.emit(this.events.ALREADY_QUEUED);
            return -1;
        }
        
    },
    getNoOfItemsInQueue: function() {
      return playlist.length;  
    },
    events: {
        SONG_ENDED: 'song-ended',
        ALREADY_QUEUED: 'already-queued', 

        on: function(evenName, func) {
            eventEmitter.on('jukebox:', func);
        },
        emit: function(eventName) {
            eventEmitter.emit('jukebox:' + eventName);
        }
    }
};

module.exports = player;
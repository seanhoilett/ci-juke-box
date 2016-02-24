'use strict';

var config = require('./config.json');

var API_TOKEN = config.botApiToken,
    q = require('q'),
    Botkit = require('botkit'),
    controller = Botkit.slackbot(),
    bot = controller.spawn({
        token: API_TOKEN
    }),
    botWebhook = controller.spawn({
        incoming_webhook: {
            url: config.webHookUrl
        }
    }),
    player = require('./player');

bot.startRTM(function (err, bot, payload) {
    if (err) {
        throw new Error('Could not connect to Slack');
    }
});

var alreadyQueued = 'Item already in the queue';
var extractAndPlayLink = function (message) {
    var prevQueueLength = player.getNoOfItemsInQueue();
    var link = message.match[0].replace(/<|>/g, ''),
        position = player.addToQueue(link),
        reply;
        if(position>=0) {
            switch(position) {
                case 0:
                    reply = 'Playing it right away.';
                    break;
                case 1:
                    reply = 'I\'ll play it right after this one.';
                    break;
                default:
                    reply = 'Queued at position #' + position;
            }
        } else {
            reply = alreadyQueued;
        }
    return reply;
};

controller.hears(["<http.*youtube.*>"], ["direct_mention", "mention", 'ambient'], function (bot, message) {
    bot.reply(message, extractAndPlayLink(message));
});

controller.hears(["<http.*youtube.*>"], ["direct_message"], function (bot, message) {
    var reply = extractAndPlayLink(message);
    bot.reply(message, reply);
    if(reply != alreadyQueued){
        botWebhook.sendWebhook({
            text: 'Someone secretly add an item. ' + reply,
            channel: config.mainChannel
        }, function (err, res) {
            if (err) {
                // ...
            }
        });
    }
});

controller.hears(['next'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    player.next();
});

controller.hears(['louder', 'can\'t hear it', 'too low', 'too soft'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    player.volumeUp();
    sayVolume(player.volume, bot, message);
});

controller.hears(['too loud', 'turn it down'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    player.volumeDown();
    sayVolume(player.volume, bot, message);
});

controller.hears(['half as loud'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    var targetVolume = (lowest - player.volume)/2;
    for(var i=1; i<=(targetVolume/interval); i++) {
        player.volumeDown();
    }
    sayVolume(player.volume, bot, message);
});

controller.hears(['silence', 'silence!', 'hush', 'hush!', 'shut up'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    var targetVolume = lowest;
    for(var i=1; i<=(targetVolume-player.volume)/interval; i++) {
        player.volumeDown();
        player
    }
    sayVolume(player.volume, bot, message);
});

controller.hears(['2x louder', 'twice as loud'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    var targetVolume =  - player.volume*2;
    for(var i=1; i<=((targetVolume-player.volume)/interval); i++) {
        player.volumeUp();
    }
    sayVolume(player.volume, bot, message);
});

controller.hears(['as loud as you can'], ["direct_message", "direct_mention", "mention"], function (bot, message) {
    var targetVolume=loudest;
    for(var i=1; i<=((player.volume-targetVolume)/interval); i++) {
        player.volumeUp();
    }
    sayVolume(player.volume, bot, message);
});
controller.hears(['br'], ["direct_message"], function (bot, message) {
    });

var sayVolume = function(currentVolume, bot, message) {
    var volPerCent = (1-(currentVolume/lowest))*100;
    console.log('%d - (%d/%d)', 100, currentVolume, lowest);
    bot.reply(message, 'OK. Volume is set at ' + Math.floor(volPerCent) + '%');
};


var lowest = -3600;
var loudest = 0;
var interval = -300;
var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    // appId: null,
    // appPassword: null
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var model = process.env.model;
var recognizer = new builder.LuisRecognizer('');
var intents = new builder.IntentDialog({recognizers:[recognizer]});

bot.recognizer(recognizer);

bot.dialog('/', function (session){
    session.send("Hello World");
});

bot.dialog('start', function(session){
    session.send("Hi there!");
    session.beginDialog('help');
}).triggerAction({matches: /^hello/i})

bot.dialog('help', function(session){
    session.send(prompts.helpMessage);
    var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Space Needle")
                    .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    // .images([
                    //     builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    // ])
                    // .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
                    .buttons([
                        builder.CardAction.imBack(session,'select', "select")])
                        
            ]);
    
    session.send(msg);
    // return createThumbnailCard(session);
}).triggerAction({matches: /^help/i})

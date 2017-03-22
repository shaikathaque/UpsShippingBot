var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');
var locationDialog = require('botbuilder-location');
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
    // appId: process.env.MICROSOFT_APP_ID,
    appId: null,
    appPassword: null
    // appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var model = process.env.model;
var recognizer = new builder.LuisRecognizer('');
var intents = new builder.IntentDialog({recognizers:[recognizer]});

//Ak2VZoOri8R263-z_IAqqGRcG55S3S5q71H9lSkCsU-1gjnHD1KRUkbeI-zLPp5O
bot.library(locationDialog.createLibrary("Ak2VZoOri8R263-z_IAqqGRcG55S3S5q71H9lSkCsU-1gjnHD1KRUkbeI-zLPp5O"));

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

// Drop off dialog, giving choices to user
bot.dialog('dropoff', [
    function(session){
    builder.Prompts.choice(session,'Would you like to use current location ?', 'Yes|No',{listStyle:3});
    },
function(session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('findlocation');
                break;
            case 1:
                session.beginDialog('customlocation');
                break;
            default:
                session.endDialog();
                break;
        }
}]).triggerAction({matches: /^dropoff/i})

// fetch the address using bing Map Api
bot.dialog('customlocation', [function(session){
    locationDialog.getLocation(session, {
            prompt: "Where should I ship your order?",
            useNativeControl: true,
            reverseGeocode: true,
            requiredFields:
                locationDialog.LocationRequiredFields.streetAddress |
                locationDialog.LocationRequiredFields.locality |
                locationDialog.LocationRequiredFields.region |
                locationDialog.LocationRequiredFields.postalCode |
                locationDialog.LocationRequiredFields.country
        });

        locationDialog.getLocation(session, options);
},
function (session, results) {
        if (results.response) {
            var place = results.response;
            session.send(place.streetAddress + ", " + place.locality + ", " + place.region + ", " + place.country + " (" + place.postalCode + ")");
        }
    }
]).triggerAction({matches: /^customlocation/i})

// fetch the current location dialog
bot.dialog('findlocation', [
    function (session){
        builder.Prompts.text(session, "Getting your current location");
    },
    function (session) {
        if(session.message.entities.length != 0){
            session.userData.lat = session.message.entities[0].geo.latitude;
            session.userData.lon = session.message.entities[0].geo.longitude;
            session.send("session.userData.lat");
            session.endDialog();
        }else{
            session.endDialog("Sorry, I didn't get your location.");
        }
    }
]).triggerAction({matches: /^findlocation/i})
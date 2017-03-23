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


bot.recognizer(recognizer);
bot.library(locationDialog.createLibrary("Ak2VZoOri8R263-z_IAqqGRcG55S3S5q71H9lSkCsU-1gjnHD1KRUkbeI-zLPp5O"));

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

// takes user address and find nearest location
bot.dialog('dropoff', [function(session){
    locationDialog.getLocation(session, {
            prompt: "Enter your address",
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
]).triggerAction({matches: /^dropoff/i})

bot.dialog('shipment', [function(session, results){
builder.Prompts.text(session, prompts.shipToMessage);
},
function (session, results, next){

    session.privateConversationData[LocationKey] = results.response
    session.send('You said your location is ' + session.privateConversationData[LocationKey]);

    builder.Prompts.choice(session, "Great. What shipping speed would you like?", '2 Day Delivery|Ground Shipping|Cancel',{listStyle:3});
    switch (results.response.index) {
            case 0:
                session.beginDialog('2DayShipping');
                break;
            case 1:
                session.beginDialog('Ground Shipping');
                 break;
            case 2:
                session.beginDialog('quit');
                break;
            default:
                session.endDialog();
                break;
}}]).triggerAction({matches: /^shipment/i})

bot.dialog('2DayShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = '2DayShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);



}]).triggerAction({matches: /^2 Day Delivery/i})


bot.dialog('GroundShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = 'GroundShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);



}]).triggerAction({matches: /^Ground Shipping/i})

bot.dialog('printlabel', function(session){
    var picture = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("UPS")
                    .subtitle("Shipping Label")
                    .images([
                        builder.CardImage.create(session, "http://www.cuspdental.com/img/UPSLabel.jpg")
                    ])
            ]);
    session.send(picture);
}).triggerAction({matches: /^printlabel/i})

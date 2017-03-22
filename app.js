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
var LocationKey = "DefaultLocation";
var ShippingStyleKey = "Shipping Style";


bot.recognizer(recognizer);
bot.library(locationDialog.createLibrary("Ak2VZoOri8R263-z_IAqqGRcG55S3S5q71H9lSkCsU-1gjnHD1KRUkbeI-zLPp5O"));

bot.dialog('start', function(session){
    session.send("Hi there!");
    session.beginDialog('rootMenu');
}).triggerAction({matches: /^hello/i});

bot.dialog('rootMenu', [
    function (session) {
        builder.Prompts.choice(session, "Choose an option:", 'Pickup|Dropoff at UPS|Quit',{listStyle:3});
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('pickup');
                break;
            case 1:
                session.beginDialog('dropoff');
                break;
            case 2:
                session.beginDialog('quit');
                break;
            default:
                session.endDialog();
                break;
        }
    }
]).triggerAction({matches: /^menu/i});


bot.dialog('help', [
    function(session){
        session.send(prompts.helpMessage),
        builder.Prompts.choice(session, "Do you want to start a new order?", "Yes|No",{listStyle:3})
    },
    function(session, results){
         switch (results.response.index) {
            case 0:
                session.beginDialog('rootMenu');
                break;
            case 1:
                session.beginDialog('quit');
                break;
            default:
                session.endDialog();
                break;
    }
}]).triggerAction({matches: /^help/i});

bot.dialog('pickup', [
    function (session) {
        builder.Prompts.text(session, prompts.pickupAddressMessage);
    },
    function (session, result) {
        if (validateAddress(result.response)) {
            session.conversationData.pickupAddress = result.response;
            session.send('Your address is: ' + session.conversationData.pickupAddress);
            builder.Prompts.time(session, prompts.pickupTimeMessage);
        } else {
            session.send('Your address is not valid. Please try again');
            session.beginDialog('pickup');
        }
    },
    function (session, result) {
        session.conversationData.pickupTime = builder.EntityRecognizer.resolveTime([result.response]);
        session.send('Your pickup time is: ' + session.conversationData.pickupTime);
    }
]).triggerAction({matches: /^pickup/i});

bot.dialog('quit', function(session){
    session.endConversation("Have a nice day.")
}).triggerAction({matches: /^quit/i});

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
]).triggerAction({matches: /^dropoff/i});

bot.dialog('shipment', [
    function(session, results){
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
}}]).triggerAction({matches: /^shipment/i});

bot.dialog('2DayShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = '2DayShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);
}]).triggerAction({matches: /^2 Day Delivery/i});

bot.dialog('GroundShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = 'GroundShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);
}]).triggerAction({matches: /^Ground Shipping/i});



function validateAddress(string) {
    if (isNaN(string.split(' ')[0])) {
        return false;
    }
    return true;
}

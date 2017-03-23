
var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');
var locationDialog = require('botbuilder-location');


var Client = require('node-rest-client').Client;
//=========================================================
// Bot Setup
//=========================================================

jsonObject = {
    "AccessRequest": {
                        "AccessLicenseNumber": "AD245999B2916A98", "UserId": "shaikathaque4",
                        "Password": "UPSbot123!"
                    },
        "LocatorRequest": {
                        "Request": {
                        "RequestAction": "Locator", "RequestOption": "1", "TransactionReference": {
                        "CustomerContext": "Find nearest UPS location" }
                    }, 
                    "OriginAddress": {
                        "PhoneNumber": "1234567891", "AddressKeyFormat": {
                        "AddressLine": "11 Times Square", "PoliticalDivision2": "New York City", "PoliticalDivision1": "NY", "PostcodePrimaryLow": "10036", "PostcodeExtendedLow": "", "CountryCode": "US"
                        } },
	                "Translate": { "Locale": "en_US"},
                    "UnitOfMeasurement": {
                        "Code": "MI" },
                        "LocationSearchCriteria": { 
                            "SearchOption": {
                                "OptionType": { "Code": "01"},
                                "OptionCode": {
                                "Code": "002" }
                            },
                            "MaximumListSize": "5", "SearchRadius": "5"}
        }
};


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
var LocationKey = "DefaultLocation";
var ShippingStyleKey = "Shipping Style";
var async = require("async");


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
        builder.Prompts.text(session, 'Would you like to continue with your shipment?');
    },
    function (session, result) {
        if (result.response === 'yes') {
            session.beginDialog('shipment');
        } else {
            session.beginDialog('help');
        }
    }
]).triggerAction({matches: /^pickup/i});

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

var returnVals = [];
// takes user address and find nearest location
bot.dialog('dropoff', [function(session){
    locationDialog.getLocation(session, {
            prompt: "Please enter your address.",
            useNativeControl: true,
            reverseGeocode: true,
            requiredFields:
                locationDialog.LocationRequiredFields.streetAddress |
                locationDialog.LocationRequiredFields.locality |
                locationDialog.LocationRequiredFields.postalCode 
        });

        locationDialog.getLocation(session, options);
        },
        function (session, results) {
                if (results.response) {
                    var place = results.response;
                    async.waterfall([
                        function(callback){
                            var client = new Client();
                            var responseData = [];
                            jsonObject["LocatorRequest"]["OriginAddress"]["AddressKeyFormat"]["AddressLine"] = place.streetAddress;
                            jsonObject["LocatorRequest"]["OriginAddress"]["AddressKeyFormat"]["PoliticalDivision1"] = place.region;
                            jsonObject["LocatorRequest"]["OriginAddress"]["AddressKeyFormat"]["PostcodePrimaryLow"] = place.postalCode;
                        
                            console.log(jsonObject);
                            var args = {
                                data : JSON.stringify(jsonObject),
                                headers: {"Content-Type": "application/json"}
                            };
                            client.post("https://onlinetools.ups.com/rest/Locator", args, function (data, response) {
                                                // parsed response body as js object 
                                                
                                                responseData = data;
                                                
                                                dropLocations = responseData.LocatorResponse.SearchResults.DropLocation;
                                                for(var i = 0; i < dropLocations.length; i++){
                                                    returnVals[i] = dropLocations[i].AddressKeyFormat.AddressLine;
                                                };
                                                callback(null, returnVals);
                                            });
                        }, 
                        function(arg1, callback){
                                builder.Prompts.choice(session,"Which address do you want to select", returnVals, {listStyle:3});
                        }]);
                }
        },
        function(session,results){
            switch (results.response.index) {
                                case 0:
                                    session.send("Great!");
                                    session.beginDialog("shipment");
                                    break;
                                case 1:
                                    session.send("Great!");
                                    session.beginDialog("shipment");
                                    break;
                                case 2:
                                    session.send("Great!");
                                    session.beginDialog("shipment");
                                    break;
                                default:
                                    
                                    session.send("Great!");
                                    session.beginDialog("shipment");
                                    break;
                                }
                            }
]).triggerAction({matches: /^dropoff/i});


bot.dialog('quit', function(session){
    session.endConversation("Have a nice day.")
}).triggerAction({matches: /^quit/i});

bot.dialog('2DayShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = '2DayShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);
}]).triggerAction({matches: /^2 Day Delivery/i});

bot.dialog('GroundShipping', [function(session, resutlts){
    session.privateConversationData[ShippingStyleKey] = 'GroundShipping';
    session.send('You said you would like to send this package using' + ' ' + session.privateConversationData[ShippingStyleKey] +
    " to " + session.privateConversationData[LocationKey]);                   
     session.beginDialog('reship');
}]).triggerAction({matches: /^Ground Shipping/i});

bot.dialog('reship', [
    function(session, results){
        session.send('You got here!');
        builder.Prompts.choice(session, 'Restart?', 'Yes|No', {listStyle:3})},
    function (session, results) {
            switch (results.response.index) {
                case 0:
                moveDialog("shipment", session);
                    break;
                case 1:
                    session.endDialog();                    
                    break;
                default:
                    session.endDialog();
            }
    }
]).triggerAction({matches: /^reship/i});


function validateAddress(string) {
    if (isNaN(string.split(' ')[0])) {
        return false;
    }
    return true;
}

function moveDialog(string, session) {
    session.beginDialog(string);
}
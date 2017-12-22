var request = require('sync-request');

module.exports = function(RED) {
    function AlarmDotComNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var wrapAPIKey = config.apikey && config.apikey.length > 0 ? config.apikey : 'El6Lp01MtRTQEd0WxPxUt97BDllMCqvO';
        var alarmUser = config.user;
        var alarmPassword = config.password;
        var sessionUrl = '';
        var viewState = '';
        var viewStateGenerator = '';
        var eventValidation = '';

        node.initLogin = function() {
            var res = request('POST', 'https://wrapapi.com/use/reven/alarmdotcom/initlogin/0.0.4', {
                json: { 'wrapAPIKey': wrapAPIKey }
            });
            var jsonData = JSON.parse(res.getBody());
            sessionUrl = jsonData.data.sessionUrl;
            viewState = jsonData.data.viewState;
            viewStateGenerator = jsonData.data.viewStateGenerator;
            eventValidation = jsonData.data.eventValidation;
        };

        node.login = function(){
            var res = request('POST', 'https://wrapapi.com/use/reven/alarmdotcom/login/0.1.3', {
                json: { 
                    'wrapAPIKey': wrapAPIKey,
                    'sessionUrl': sessionUrl,
                    'viewState': viewState,
                    'viewStateGenerator': viewStateGenerator,
                    'eventValidation': eventValidation,
                    'username': alarmUser,
                    'password': alarmPassword
                }
            });
            var body = res.getBody();
            var jsonData = JSON.parse(body);
            var state = jsonData.data.alarmState.toLowerCase();
            if(state == 'disarmed' || state == 'disarm')
                return 'disarm';
            if(state == 'armed stay')
                return 'home';
            if(state == 'armed')
                return 'away';
            return '';
        };
        node.alarmAction = function(url){
            var res = request('POST', 'https://wrapapi.com/use/reven/alarmdotcom/' + url, {
                json: { 
                    'wrapAPIKey': wrapAPIKey,
                    'sessionUrl': sessionUrl
                }
            });
            var body = res.getBody();
            var jsonData = JSON.parse(body);
            return jsonData.success;	
        };
        node.armHome = function(){
            return node.alarmAction('armstay/0.1.0');
        };        
        node.armAway = function(){
            return node.alarmAction('armaway/0.1.0');
        };        
        node.disarm = function(){
            return node.alarmAction('disarm/0.1.0');	
        };        

        node.on('input', function(msg) {
            var force = msg.force == true;
            var desiredState = msg.payload.toLowerCase();
            node.initLogin();
            var alarmState  = node.login();
            if(alarmState != desiredState || force)
            {
                switch(msg.payload.toLowerCase()){
                    case 'away':
                        if(force || alarmState == 'disarm'){
                            node.armAway();
                            alarmState = 'away';
                        }
                        break;
                    case 'home':
                        if(force || alarmState == 'disarm'){
                            node.armHome();
                            alarmState = 'home';
                        }
                        break;
                    case 'disarm':
                        node.disarm();
                        alarmState = 'disarm';
                        break;                    
                }
            }
            msg.payload = alarmState;
            node.send(msg);
        });

    }
    RED.nodes.registerType("alarm.com",AlarmDotComNode);
}
/**
 StudioLite MediaSignage Inc (c) open source digital signage project.
 Visit Github for licenses and docs: http://git.digitalsignage.com
 @class StudioLite
 @constructor
 @return {Object} instantiated StudioLite
 **/
define(['underscore', 'jquery', 'backbone', 'bootstrap', 'backbone.controller', 'ComBroker', 'Lib', 'Pepper', 'PepperHelper'], function (_, $, Backbone, Bootstrap, backbonecontroller, ComBroker, Lib, Pepper, PepperHelper) {
    var StudioLite = Backbone.Controller.extend({

        // app init
        initialize: function () {
            var self = this;

            // very ugly functions used for foreign characters...probably should be moved to separate .js if we decide to make one
            window.toAnsi = function(str) {
                var byteArray = "";
                for (var i = 0; i < str.length; i++)
                    if (str.charCodeAt(i) <= 0x7F)
                        byteArray += str.charAt(i);
                    else {
                        var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
                        for (var j = 0; j < h.length; j++)
                            byteArray += String.fromCharCode(parseInt(h[j], 16));
                    }
                return byteArray;
            };
            window.fromAnsi = function(ansiStr) {
                var str = '';
                for (var i = 0; i < ansiStr.length; i++)
                    str +=  ansiStr.charCodeAt(i) <= 0x7F?
                            ansiStr.charCodeAt(i) === 0x25 ? "%25" : // %
                        String.fromCharCode(ansiStr.charCodeAt(i)) :
                        "%" + ansiStr.charCodeAt(i).toString(16).toUpperCase();
                return decodeURIComponent(str);
            };

            window.BB = Backbone;
            BB.globs = {};
            BB.SERVICES = {};
            BB.EVENTS = {};
            BB.LOADING = {};
            BB.CONSTS = {};
            BB.globs['UNIQUE_COUNTER'] = 0;
            BB.globs['RC4KEY'] = '226a3a42f34ddd778ed2c3ba56644315';
            BB.lib = new Lib();
            BB.lib.addBackboneViewOptions();
            BB.comBroker = new ComBroker();
            BB.comBroker.name = 'AppBroker';
            BB.Pepper = new Pepper();
            _.extend(BB.Pepper,BB.comBroker);
            BB.Pepper.clearServices();
            BB.Pepper.name = 'JalapenoBroker';
            BB.PepperHelper = new PepperHelper();
            window.pepper = BB.Pepper;
            window.log = BB.lib.log;

            // internationalization
            require(['LanguageSelectorView'], function (LanguageSelectorView) {
                self.m_languageSelectionLogin = new LanguageSelectorView({appendTo: Elements.LANGUAGE_SELECTION_LOGIN});
                var lang = self.m_languageSelectionLogin.getLanguage();
                if (lang)
                    self.m_languageSelectionLogin.setLanguage(lang);

                self.m_languageSelectionLogin.setLanguage("hr");
            });

            // router init
            require(['LayoutRouter'], function (LayoutRouter) {
                var LayoutRouter = new LayoutRouter();
                BB.history.start();
                LayoutRouter.navigate('authenticate/_/_', {trigger: true});
            })
        }
    });

    return StudioLite;
});
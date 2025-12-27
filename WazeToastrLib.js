/* global W */
/* global WazeToastr */
/* jshint esversion:6 */
/* eslint-disable */

(function () {
    'use strict';
    let wtSettings;

    function bootstrap(tries = 1) {
        if (!location.href.match(/^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/))
            return;

        if (W && W.map &&
            W.model && W.loginManager.user &&
            $)
            init();
        else if (tries < 1000)
            setTimeout(function () { bootstrap(++tries); }, 200);
        else
            console.log('WazeToastr failed to load');
    }

    bootstrap();

    async function init() {
        console.log("WazeToastr initializing...");
        WazeToastr.Version = "2025.04.11.00";
        WazeToastr.isBetaEditor = /beta/.test(location.href);

        loadSettings();
        await initializeToastr();

        WazeToastr.Alerts = new Alerts();

        WazeToastr.Ready = true;

        console.log('WazeToastr Loaded');
    }

    function loadSettings() {
        var loadedSettings = $.parseJSON(localStorage.getItem("WazeToastrSettings"));
        var defaultSettings = {
            editorPIN: ""
        };
        wtSettings = $.extend({}, defaultSettings, loadedSettings);
    }

    function saveSettings() {
        if (localStorage) {
            localStorage.setItem("WazeToastrSettings", JSON.stringify(wtSettings));
        }
    }

    async function initializeToastr() {
        let toastrSettings = {};
        try {
            function loadSettings() {
                var loadedSettings = $.parseJSON(localStorage.getItem("WTToastr"));
                var defaultSettings = {
                    historyLeftLoc: 35,
                    historyTopLoc: 40
                };
                toastrSettings = $.extend({}, defaultSettings, loadedSettings)
            }

            function saveSettings() {
                if (localStorage) {
                    var localsettings = {
                        historyLeftLoc: toastrSettings.historyLeftLoc,
                        historyTopLoc: toastrSettings.historyTopLoc
                    };

                    localStorage.setItem("WTToastr", JSON.stringify(localsettings));
                }
            }
            loadSettings();
            $('head').append(
              $('<link/>', {
                rel: 'stylesheet',
                type: 'text/css',
                href: 'https://cdn.jsdelivr.net/gh/WazeDev/toastr@master/build/toastr.min.css',
              }),
              $('<style type="text/css">.toast-container-wazetoastr > div {opacity: 0.95;} .toast-top-center-wide {top: 32px;}</style>')
            );

            await $.getScript('https://cdn.jsdelivr.net/gh/WazeDev/toastr@master/build/toastr.min.js');
            wazetoastr.options = {
                target: '#map',
                timeOut: 6000,
                positionClass: 'toast-top-center-wide',
                closeOnHover: false,
                closeDuration: 0,
                showDuration: 0,
                closeButton: true,
                progressBar: true
            };

            if ($('.WTAlertsHistory').length > 0)
                return;
            var $sectionToastr = $("<div>", { style: "padding:8px 16px", id: "wmeWTScriptUpdates" });
            $sectionToastr.html([
                '<div class="WTAlertsHistory" title="Script Alert History"><i class="fa fa-exclamation-triangle fa-lg"></i><div id="WTAlertsHistory-list"><div id="toast-container-history" class="toast-container-wazetoastr"></div></div></div>'
            ].join(' '));
            $("#WazeMap").append($sectionToastr.html());

            $('.WTAlertsHistory').css('left', `${toastrSettings.historyLeftLoc}px`);
            $('.WTAlertsHistory').css('top', `${toastrSettings.historyTopLoc}px`);

            try {
                await $.getScript("https://greasyfork.org/scripts/454988-jqueryui-custom-build/code/jQueryUI%20custom%20build.js");
            }
            catch (err) {
                console.log("Could not load jQuery UI " + err);
            }

            if ($.ui) {
                $('.WTAlertsHistory').draggable({
                    stop: function () {
                        let windowWidth = $('#map').width();
                        let panelWidth = $('#WTAlertsHistory-list').width();
                        let historyLoc = $('.WTAlertsHistory').position().left;
                        if ((panelWidth + historyLoc) > windowWidth) {
                            $('#WTAlertsHistory-list').css('left', Math.abs(windowWidth - (historyLoc + $('.WTAlertsHistory').width()) - panelWidth) * -1);
                        }
                        else
                            $('#WTAlertsHistory-list').css('left', 'auto');

                        toastrSettings.historyLeftLoc = $('.WTAlertsHistory').position().left;
                        toastrSettings.historyTopLoc = $('.WTAlertsHistory').position().top;
                        saveSettings();
                    }
                });
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    function Alerts() {
        this.success = function (scriptName, message) {
            $(wazetoastr.success(message, scriptName)).clone().prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr').find('.toast-close-button').remove();
        }

        this.info = function (scriptName, message, disableTimeout, disableClickToClose, timeOut) {
            let options = {};
            if (disableTimeout)
                options.timeOut = 0;
            else if (timeOut)
                options.timeOut = timeOut;

            if (disableClickToClose)
                options.tapToDismiss = false;
                
            $(wazetoastr.info(message, scriptName, options)).clone().prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr').find('.toast-close-button').remove();
        }

        this.warning = function (scriptName, message) {
            $(wazetoastr.warning(message, scriptName)).clone().prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr').find('.toast-close-button').remove();
        }

        this.error = function (scriptName, message) {
            $(wazetoastr.error(message, scriptName)).clone().prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr').find('.toast-close-button').remove();
        }

        this.debug = function (scriptName, message) {
            wazetoastr.debug(message, scriptName);
        }

        this.prompt = function (scriptName, message, defaultText = '', okFunction, cancelFunction) {
            wazetoastr.prompt(message, scriptName, { promptOK: okFunction, promptCancel: cancelFunction, PromptDefaultInput: defaultText });
        }

        this.confirm = function (scriptName, message, okFunction, cancelFunction, okBtnText = "Ok", cancelBtnText = "Cancel") {
            wazetoastr.confirm(message, scriptName, { confirmOK: okFunction, confirmCancel: cancelFunction, ConfirmOkButtonText: okBtnText, ConfirmCancelButtonText: cancelBtnText });
        }
    }
}.call(this));

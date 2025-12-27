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
        WazeToastr.Interface = new Interface();

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
                href: 'https://kid4rm90s.github.io/WazeToastr/toastr.min.css',
              }),
              $('<style type="text/css">.toast-container-wazetoastr > div {opacity: 0.95;} .toast-top-center-wide {top: 32px;}</style>')
            );

            await $.getScript('https://kid4rm90s.github.io/WazeToastr/toastr.min.js');
            
            // Wait for wazetoastr to be defined
            await new Promise((resolve) => {
                const checkToastr = () => {
                    if (typeof wazetoastr !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkToastr, 50);
                    }
                };
                checkToastr();
            });
            
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

        this.ScriptUpdateMonitor = class {
            #lastVersionChecked = '0';
            #scriptName;
            #currentVersion;
            #downloadUrl;
            #metaUrl;
            #metaRegExp;
            #GM_xmlhttpRequest;
            #intervalChecker = null;
    
            /**
             * Creates an instance of ScriptUpdateMonitor.
             * @param {string} scriptName The name of your script. Used as the alert title and in console error messages.
             * @param {string|number} currentVersion The current installed version of the script.
             * @param {string} downloadUrl The download URL of the script. If using Greasy Fork, the URL should end with ".user.js".
             * @param {object} GM_xmlhttpRequest A reference to the GM_xmlhttpRequest function used by your script.
             * This is used to obtain the latest script version number from the server.
             * @param {string} [metaUrl] The URL to a page containing the latest script version number.
             * Optional for Greasy Fork scripts (uses download URL path, replacing ".user.js" with ".meta.js").
             * @param {RegExp} [metaRegExp] A regular expression with a single capture group to extract the
             * version number from the metaUrl page. e.g. /@version\s+(.+)/i. Required if metaUrl is specified.
             * Ignored if metaUrl is a falsy value.
             * @memberof ScriptUpdateMonitor
             */
            constructor(scriptName, currentVersion, downloadUrl, GM_xmlhttpRequest, metaUrl = null, metaRegExp = null) {
                this.#scriptName = scriptName;
                this.#currentVersion = currentVersion;
                this.#downloadUrl = downloadUrl;
                this.#GM_xmlhttpRequest = GM_xmlhttpRequest;
                this.#metaUrl = metaUrl;
                this.#metaRegExp = metaRegExp || /@version\s+(.+)/i;
                this.#validateParameters();
            }
    
            /**
             * Starts checking for script updates at a specified interval.
             *
             * @memberof ScriptUpdateMonitor
             * @param {number} [intervalHours = 2] The interval, in hours, to check for script updates. Default is 2. Minimum is 1.
             * @param {boolean} [checkImmediately = true] If true, checks for a script update immediately when called. Default is true.
             */
            start(intervalHours = 2, checkImmediately = true) {
                if (intervalHours < 1) {
                    throw new Error('Parameter intervalHours must be at least 1');
                }
                if (!this.#intervalChecker) {
                    if (checkImmediately) this.#postAlertIfNewReleaseAvailable();
                    // Use the arrow function here to bind the "this" context to the ScriptUpdateMonitor object.
                    this.#intervalChecker = setInterval(() => this.#postAlertIfNewReleaseAvailable(), intervalHours * 60 * 60 * 1000);
                }
            }
    
            /**
             * Stops checking for script updates.
             *
             * @memberof ScriptUpdateMonitor
             */
            stop() {
                if (this.#intervalChecker) {
                    clearInterval(this.#intervalChecker);
                    this.#intervalChecker = null;
                }
            }
    
            #validateParameters() {
                if (this.#metaUrl) {
                    if (!this.#metaRegExp) {
                        throw new Error('metaRegExp must be defined if metaUrl is defined.');
                    }
                    if (!(this.#metaRegExp instanceof RegExp)) {
                        throw new Error('metaUrl must be a regular expression.');
                    }
                } else {
                    if (!/\.user\.js$/.test(this.#downloadUrl)) {
                        throw new Error('Invalid downloadUrl paramenter. Must end with ".user.js" [', this.#downloadUrl, ']');
                    }
                    this.#metaUrl = this.#downloadUrl.replace(/\.user\.js$/, '.meta.js');
                }
            }
    
            async #postAlertIfNewReleaseAvailable() {
                const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
                let latestVersion;
                try {
                    let tries = 1;
                    const maxTries = 3;
                    while (tries <= maxTries) {
                        latestVersion = await this.#fetchLatestReleaseVersion();
                        if (latestVersion === 503) {
                            // Greasy Fork returns a 503 error when too many requests are sent quickly.
                            // Pause and try again.
                            if (tries < maxTries) {
                                console.log(`${this.#scriptName}: Checking for latest version again (retry #${tries})`);
                                await sleep(1000);
                            } else {
                                console.error(`${this.#scriptName}: Failed to check latest version #. Too many 503 status codes returned.`);
                            }
                            tries += 1;
                        } else if (latestVersion.status) {
                            console.error(`${this.#scriptName}: Error while checking for latest version.`, latestVersion);
                            return;
                        } else {
                            break;
                        }
                    }
                } catch (ex) {
                    console.error(`${this.#scriptName}: Error while checking for latest version.`, ex);
                    return;
                }
                if (latestVersion > this.#currentVersion && latestVersion > (this.#lastVersionChecked || '0')) {
                    this.#lastVersionChecked = latestVersion;
                    this.#clearPreviousAlerts();
                    this.#postNewVersionAlert(latestVersion);
                }
            }
    
            #postNewVersionAlert(newVersion) {
                const message = `<a href="${this.#downloadUrl}" target = "_blank">Version ${
                    newVersion}</a> is available.<br>Update now to get the latest features and fixes.`;
                WazeToastr.Alerts.info(this.#scriptName, message, true, false);
            }
    
            #fetchLatestReleaseVersion() {
                const metaUrl = this.#metaUrl;
                const metaRegExp = this.#metaRegExp;
                return new Promise((resolve, reject) => {
                    this.#GM_xmlhttpRequest({
                        nocache: true,
                        revalidate: true,
                        url: metaUrl,
                        onload(res) {
                            if (res.status === 503) {
                                resolve(503);
                            } else if (res.status === 200) {
                                const versionMatch = res.responseText.match(metaRegExp);
                                if (versionMatch?.length !== 2) {
                                    throw new Error(`Invalid RegExp expression (${metaRegExp}) or version # could not be found at this URL: ${metaUrl}`);
                                }
                                resolve(res.responseText.match(metaRegExp)[1]);
                            } else {
                                resolve(res);
                            }
                        },
                        onerror(res) {
                            reject(res);
                        }
                    });
                });
            }
    
            #clearPreviousAlerts() {
                $('.toast-container-wazetoastr .toast-info:visible').toArray().forEach(elem => {
                    const $alert = $(elem);
                    const title = $alert.find('.toast-title').text();
                    if (title === this.#scriptName) {
                        const message = $alert.find('.toast-message').text();
                        if (/version .* is available/i.test(message)) {
                            // Force a click to make the alert go away.
                            $alert.click();
                        }
                    }
                });
            }
        }
    }

    function Interface() {
        /**
         * Shows the script update window with the given update text
         * @function WazeToastr.Interface.ShowScriptUpdate
         * @param {string} scriptName - The name of the script
         * @param {string} version - The version number
         * @param {string} updateHTML - HTML content describing the update
         * @param {string} greasyforkLink - Link to Greasyfork page (optional)
         * @param {string} forumLink - Link to forum discussion (optional)
         **/
        this.ShowScriptUpdate = function (scriptName, version, updateHTML, greasyforkLink = "", forumLink = "") {
            // Simply show an info alert with the update information
            let message = `<strong>Version ${version}</strong><br>${updateHTML}`;
            
            if (greasyforkLink || forumLink) {
                message += '<br><br>';
                if (greasyforkLink) {
                    message += `<a href="${greasyforkLink}" target="_blank">Install Update</a>`;
                }
                if (greasyforkLink && forumLink) {
                    message += ' | ';
                }
                if (forumLink) {
                    message += `<a href="${forumLink}" target="_blank">Forum Discussion</a>`;
                }
            }
            
            WazeToastr.Alerts.info(scriptName, message, true, false);
        };
    }
}.call(this));

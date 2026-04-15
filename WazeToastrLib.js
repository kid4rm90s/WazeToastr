/**
 * WazeToastr Library - Notification system for Waze Map Editor scripts
 * 
 * WMESDK Compatibility:
 * - Uses window.SDK_INITIALIZED promise for proper initialization (recommended pattern)
 * - Supports both modern WMESDK and deprecated W/Waze objects (for backward compatibility)
 * - Provides SDK instance to dependent scripts via WazeToastr.SDK
 * - Uses modern JSON parsing (no jQuery.parseJSON) and ES6+ patterns
 * 
 * Features:
 * - Toast notifications (success, info, warning, error, debug)
 * - Persistent notification history panel
 * - Script update monitoring and notifications
 * - Settings persistence using localStorage
 * - Full error handling and fallback support
 * 
 * Usage:
 * WazeToastr.Alerts.success(scriptName, message);
 * WazeToastr.Alerts.confirm(scriptName, message, okCallback, cancelCallback);
 * const monitor = new WazeToastr.Alerts.ScriptUpdateMonitor(...);
 * 
 * @requires jQuery (loaded by WazeToastr launcher)
 * @requires WME SDK_INITIALIZED promise (standard WME environment)
 */

/* global W */
/* global WazeToastr */
/* jshint esversion:6 */
/* eslint-disable */

(function () {
    'use strict';
    let wtSettings;
    let sdk = null;
    
    /**
     * Bootstrap initialization using WME SDK promise pattern
     * Waits for both jQuery and SDK_INITIALIZED to be ready
     */
    function bootstrap() {
        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        // Ensure jQuery is available
        if (typeof $ === 'undefined') {
            setTimeout(bootstrap, 100);
            return;
        }
        
        // Wait for WME SDK to be initialized
        if (pageWindow.SDK_INITIALIZED) {
            pageWindow.SDK_INITIALIZED.then(init).catch((err) => {
                console.error('WazeToastr: Failed to initialize SDK:', err);
                // Fallback: try to initialize anyway if SDK already available
                if (pageWindow.getWmeSdk) {
                    init();
                }
            });
        } else {
            // Fallback for older WME versions
            console.warn('WazeToastr: SDK_INITIALIZED not available, using fallback initialization');
            setTimeout(bootstrap, 200);
        }
    }

    bootstrap();

    /**
     * Initialize WazeToastr library with WMESDK support
     */
    async function init() {
        console.log("WazeToastr initializing...");
        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        // Initialize SDK if not already done
        if (!sdk && pageWindow.getWmeSdk) {
            try {
                sdk = pageWindow.getWmeSdk({ 
                    scriptName: 'WazeToastr',
                    scriptId: 'wazetoastr'
                });
                console.log('WazeToastr obtained WMESDK instance');
            } catch (err) {
                console.warn('WazeToastr: Could not obtain SDK, some features may be limited:', err);
            }
        }
        
        WazeToastr.Version = "2026.04.15.08";
        WazeToastr.isBetaEditor = /beta/.test(location.href);
        WazeToastr.SDK = sdk;  // Expose SDK for use by other scripts

        loadSettings();
        initializeScriptUpdateInterface();
        await initializeToastr();

        WazeToastr.Alerts = new Alerts();
        WazeToastr.Interface = new Interface();

        WazeToastr.Ready = true;

        console.log('WazeToastr Loaded');
    }

    function loadSettings() {
        try {
            const loadedSettings = localStorage.getItem("WazeToastrSettings");
            const parsedSettings = loadedSettings ? JSON.parse(loadedSettings) : {};
            const defaultSettings = {
                editorPIN: ""
            };
            wtSettings = Object.assign({}, defaultSettings, parsedSettings);
        } catch (err) {
            console.warn('WazeToastr: Error loading settings from localStorage:', err);
            wtSettings = { editorPIN: "" };
        }
    }

    function saveSettings() {
        try {
            if (localStorage) {
                localStorage.setItem("WazeToastrSettings", JSON.stringify(wtSettings));
            }
        } catch (err) {
            console.warn('WazeToastr: Error saving settings to localStorage:', err);
        }
    }

    /**
     * Initialize toastr notification system and history panel
     */
    async function initializeToastr() {
        let toastrSettings = {};
        try {
            function loadSettings() {
                try {
                    const loadedSettings = localStorage.getItem("WTToastr");
                    const parsedSettings = loadedSettings ? JSON.parse(loadedSettings) : {};
                    const defaultSettings = {
                        historyLeftLoc: 35,
                        historyTopLoc: 40
                    };
                    toastrSettings = Object.assign({}, defaultSettings, parsedSettings);
                } catch (err) {
                    console.warn('WazeToastr: Error loading toastr settings:', err);
                    toastrSettings = { historyLeftLoc: 35, historyTopLoc: 40 };
                }
            }

            function saveSettings() {
                try {
                    if (localStorage) {
                        const localsettings = {
                            historyLeftLoc: toastrSettings.historyLeftLoc,
                            historyTopLoc: toastrSettings.historyTopLoc
                        };
                        localStorage.setItem("WTToastr", JSON.stringify(localsettings));
                    }
                } catch (err) {
                    console.warn('WazeToastr: Error saving toastr settings:', err);
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

    /**
     * Initialize the script update notification interface
     * Creates a modal window for displaying available script updates
     */
    function initializeScriptUpdateInterface() {
        console.log("creating script update interface");
        injectCSS();
        var $section = $("<div>", { style: "padding:8px 16px", id: "wmeWTScriptUpdates" });
        $section.html([
            '<div id="WTSU-Container" class="fa" style="position:fixed; top:20%; left:40%; z-index:1000; display:none;">',
            '<div id="WTSU-Close" class="fa-close fa-lg"></div>',
            '<div class="modal-heading">',
            '<h2>Script Updates</h2>',
            '<h4><span id="WTSU-updateCount">0</span> of your scripts have updates</h4>',
            '</div>',
            '<div class="WTSU-updates-wrapper">',
            '<div id="WTSU-script-list">',
            '</div>',
            '<div id="WTSU-script-update-info">',
            '</div></div></div>'
        ].join(' '));
        $("#WazeMap").append($section.html());

        $('#WTSU-Close').click(function () {
            $('#WTSU-Container').hide();
        });

        $(document).on('click', '.WTSU-script-item', function () {
            $('.WTSU-script-item').removeClass("WTSU-active");
            $(this).addClass("WTSU-active");
        });
    }

    function injectCSS() {
        let css = [
            '#WTSU-Container { position:relative; background-color:#fbfbfb; width:650px; height:375px; border-radius:8px; padding:20px; box-shadow: 0 22px 84px 0 rgba(87, 99, 125, 0.5); border:1px solid #ededed; }',
            '#WTSU-Close { color:#000000; background-color:#ffffff; border:1px solid #ececec; border-radius:10px; height:25px; width:25px; position: absolute; right:14px; top:10px; cursor:pointer; padding: 5px 0px 0px 5px;}',
            '#WTSU-Container .modal-heading,.WTSU-updates-wrapper { font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif; } ',
            '.WTSU-updates-wrapper { height:350px; }',
            '#WTSU-script-list { float:left; width:175px; height:100%; padding-right:6px; margin-right:10px; overflow-y: auto; overflow-x: hidden; height:300px; }',
            '.WTSU-script-item { text-decoration: none; min-height:40px; display:flex; text-align: center; justify-content: center; align-items: center; margin:3px 3px 10px 3px; background-color:white; border-radius:8px; box-shadow: rgba(0, 0, 0, 0.4) 0px 1px 1px 0.25px; transition:all 200ms ease-in-out; cursor:pointer;}',
            '.WTSU-script-item:hover { text-decoration: none; }',
            '.WTSU-active { transform: translate3d(5px, 0px, 0px); box-shadow: rgba(0, 0, 0, 0.4) 0px 3px 7px 0px; }',
            '#WTSU-script-update-info { width:auto; background-color:white; height:275px; overflow-y:auto; border-radius:8px; box-shadow: rgba(0, 0, 0, 0.09) 0px 6px 7px 0.09px; padding:15px; position:relative;}',
            '#WTSU-script-update-info div { display: none;}',
            '#WTSU-script-update-info div:target { display: block; }',
            '.WTAlertsHistory:hover #WTAlertsHistory-list{display:block;}',
            '.WTAlertsHistory > .fa-exclamation-triangle {position: absolute; left:50%; margin-left:-9px; margin-top:8px;}',
            '#WTAlertsHistory-list{display:none; position:absolute; top:28px; border:2px solid black; border-radius:10px; background-color:white; padding:4px; overflow-y:auto; max-height: 300px;}',
            '#WTAlertsHistory-list #toast-container-history > div {max-width:500px; min-width:500px; border-radius:10px;}',
            '#WTAlertsHistory-list > #toast-container-history{ position:static; }'
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
    }

    /**
     * Alerts notification system
     * Provides a unified interface for displaying toast notifications to users
     * WMESDK Compatible: Works with both deprecated W object and new WMESDK
     * 
     * @example
     * WazeToastr.Alerts.success(scriptName, "Operation completed successfully");
     * WazeToastr.Alerts.error(scriptName, "An error occurred");
     * WazeToastr.Alerts.confirm(scriptName, "Continue?", okCallback, cancelCallback);
     */
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
            
            // Show the toast notification and also add to history
            let $toast = wazetoastr.info(message, scriptName, options);
            $($toast).clone().prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr').find('.toast-close-button').remove();
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

        this.prompt = function (scriptName, message, defaultText = '', okFunction, cancelFunction, inputType = 'text') {
            // Wrap the okFunction to handle type conversion based on inputType
            // Note: wazetoastr.prompt passes TWO parameters: (event, inputValue)
            const wrappedOkFunction = (event, inputValue) => {
                // The second parameter is the actual input value from A.val()
                let convertedValue = inputValue;
                
                if (inputType === 'number') {
                    // Convert to number and validate
                    convertedValue = Number(inputValue);
                    
                    // Check if conversion resulted in NaN
                    if (isNaN(convertedValue)) {
                        this.warning(scriptName, 'Invalid number entered. Please enter a valid number.');
                        return;
                    }
                }
                
                // Call the original okFunction with the converted value
                if (okFunction) okFunction(convertedValue);
            };
            
            wazetoastr.prompt(message, scriptName, { promptOK: wrappedOkFunction, promptCancel: cancelFunction, PromptDefaultInput: defaultText });
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

    /**
     * Interface for managing script updates and notifications
     * WMESDK Compatible: Integrates with WazeToastr alert system
     */
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
            let settings;
            function loadSettings() {
                try {
                    const loadedSettings = localStorage.getItem("WTScriptUpdate");
                    const parsedSettings = loadedSettings ? JSON.parse(loadedSettings) : {};
                    const defaultSettings = {
                        ScriptUpdateHistory: {},
                    };
                    settings = Object.assign({}, defaultSettings, parsedSettings);
                } catch (err) {
                    console.warn('WazeToastr: Error loading script update settings:', err);
                    settings = { ScriptUpdateHistory: {} };
                }
            }
            function saveSettings() {
                try {
                    if (localStorage) {
                        const localsettings = {
                            ScriptUpdateHistory: settings.ScriptUpdateHistory,
                        };
                        localStorage.setItem("WTScriptUpdate", JSON.stringify(localsettings));
                    }
                } catch (err) {
                    console.warn('WazeToastr: Error saving script update settings:', err);
                }
            }

            loadSettings();

            if ((updateHTML && updateHTML.length > 0) && (typeof settings.ScriptUpdateHistory[scriptName] === "undefined" || settings.ScriptUpdateHistory[scriptName] != version)) {
                let currCount = $('.WTSU-script-item').length;
                let divID = (scriptName + ("" + version)).toLowerCase().replace(/[^a-z-_0-9]/g, '');
                $('#WTSU-script-list').append(`<a href="#${divID}" class="WTSU-script-item ${currCount === 0 ? 'WTSU-active' : ''}">${scriptName}</a>`); //add the script's tab
                $("#WTSU-updateCount").html(parseInt($("#WTSU-updateCount").html()) + 1); //increment the total script updates value
                let install = "", forum = "";
                if (greasyforkLink != "")
                    install = `<a href="${greasyforkLink}" target="_blank">Greasyfork</a>`;
                if (forumLink != "")
                    forum = `<a href="${forumLink}" target="_blank">Forum</a>`;
                let footer = "";
                if (forumLink != "" || greasyforkLink != "") {
                    footer = `<span class="WTSUFooter" style="margin-bottom:2px; display:block;">${install}${(greasyforkLink != "" && forumLink != "") ? " | " : ""}${forum}</span>`;
                }
                $('#WTSU-script-update-info').append(`<div id="${divID}"><span><h3>${version}</h3><br>${updateHTML}</span>${footer}</div>`);
                $('#WTSU-Container').show();
                if (currCount === 0)
                    $('#WTSU-script-list').find("a")[0].click();
                settings.ScriptUpdateHistory[scriptName] = version;
                saveSettings();
            }
        };
    }
}.call(this));

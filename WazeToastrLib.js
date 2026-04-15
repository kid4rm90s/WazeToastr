/* global W */
/* global WazeToastr */
/* global $ */
/* global unsafeWindow */
/* jshint esversion:6 */
/* eslint-disable */
/*Version 2026.04.15.00*/
/**
 * WazeToastr Library
 * Provides notification and alert UI for WME userscripts
 * Updated to follow WME SDK best practices
 */
(function () {
    'use strict';
    
    const SCRIPT_NAME = 'WazeToastr';
    const MAX_BOOTSTRAP_ATTEMPTS = 1000;
    const BOOTSTRAP_RETRY_MS = 200;
    const TOASTR_CHECK_TIMEOUT_MS = 5000;
    const TOASTR_CHECK_INTERVAL_MS = 50;
    const TOASTR_SCRIPT_URL = 'https://kid4rm90s.github.io/WazeToastr/toastr.min.js';
    const TOASTR_CSS_URL = 'https://kid4rm90s.github.io/WazeToastr/toastr.min.css';
    
    let wtSettings = {};
    let toastrSettings = {};

    /**
     * Validate that script is running in a valid WME editor context
     */
    function isValidEditorPage() {
        return location.href.match(/^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/);
    }

    /**
     * Bootstrap the library with proper error handling
     */
    function bootstrap(tries = 1) {
        if (!isValidEditorPage()) {
            console.debug(`${SCRIPT_NAME}: Not running on valid WME editor page`);
            return;
        }

        // Check for required dependencies
        const hasW = typeof W !== 'undefined' && W?.map && W?.model;
        const hasUser = W?.loginManager?.user;
        const hasJQuery = typeof $ !== 'undefined';
        
        if (hasW && hasUser && hasJQuery) {
            init().catch(err => {
                console.error(`${SCRIPT_NAME}: Initialization error`, err);
            });
        } else if (tries < MAX_BOOTSTRAP_ATTEMPTS) {
            setTimeout(() => { bootstrap(tries + 1); }, BOOTSTRAP_RETRY_MS);
        } else {
            console.error(
                `${SCRIPT_NAME}: Bootstrap failed after ${MAX_BOOTSTRAP_ATTEMPTS} attempts. ` +
                `Missing dependencies: ${!hasW ? 'W ' : ''}${!hasUser ? 'loginManager.user ' : ''}${!hasJQuery ? 'jQuery' : ''}`
            );
        }
    }

    /**
     * Main initialization function
     */
    async function init() {
        try {
            console.info(`${SCRIPT_NAME}: Initializing...`);
            
            WazeToastr.Version = "2025.12.27.01";
            WazeToastr.isBetaEditor = /beta/.test(location.href);
            WazeToastr.Ready = false;

            loadSettings();
            initializeScriptUpdateInterface();
            await initializeToastr();

            WazeToastr.Alerts = new Alerts();
            WazeToastr.Interface = new Interface();
            WazeToastr.Ready = true;

            console.info(`${SCRIPT_NAME}: Initialization complete`);
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Initialization failed`, error);
            WazeToastr.Ready = false;
            throw error;
        }
    }

    /**
     * Load script settings from localStorage
     */
    function loadSettings() {
        try {
            const loadedSettings = localStorage.getItem("WazeToastrSettings");
            const defaultSettings = { editorPIN: "" };
            wtSettings = loadedSettings ? { ...defaultSettings, ...JSON.parse(loadedSettings) } : defaultSettings;
        } catch (error) {
            console.warn(`${SCRIPT_NAME}: Could not load settings, using defaults`, error);
            wtSettings = { editorPIN: "" };
        }
    }

    /**
     * Save script settings to localStorage
     */
    function saveSettings() {
        try {
            if (localStorage) {
                localStorage.setItem("WazeToastrSettings", JSON.stringify(wtSettings));
            }
        } catch (error) {
            console.warn(`${SCRIPT_NAME}: Could not save settings`, error);
        }
    }

    /**
     * Initialize toastr notification library and UI
     */
    async function initializeToastr() {
        try {
            // Load and initialize toastr settings
            function loadToastrSettings() {
                try {
                    const loaded = localStorage.getItem("WTToastr");
                    const defaults = { historyLeftLoc: 35, historyTopLoc: 40 };
                    toastrSettings = loaded ? { ...defaults, ...JSON.parse(loaded) } : defaults;
                } catch (error) {
                    console.warn(`${SCRIPT_NAME}: Could not load toastr settings`, error);
                    toastrSettings = { historyLeftLoc: 35, historyTopLoc: 40 };
                }
            }

            function saveToastrSettings() {
                try {
                    if (localStorage) {
                        const settings = {
                            historyLeftLoc: toastrSettings.historyLeftLoc,
                            historyTopLoc: toastrSettings.historyTopLoc
                        };
                        localStorage.setItem("WTToastr", JSON.stringify(settings));
                    }
                } catch (error) {
                    console.warn(`${SCRIPT_NAME}: Could not save toastr settings`, error);
                }
            }

            loadToastrSettings();

            // Inject CSS
            $('head').append(
                $('<link/>', {
                    rel: 'stylesheet',
                    type: 'text/css',
                    href: TOASTR_CSS_URL,
                    onerror() {
                        console.warn(`${SCRIPT_NAME}: Failed to load toastr CSS`);
                    }
                }),
                $('<style type="text/css">' +
                    '.toast-container-wazetoastr > div {opacity: 0.95;} ' +
                    '.toast-top-center-wide {top: 32px;}' +
                    '</style>')
            );

            // Load toastr library with timeout protection
            await loadToastrWithTimeout();
            
            configureToastrOptions();

            // Create alert history UI
            if ($('.WTAlertsHistory').length === 0) {
                createAlertHistoryUI();
                setupAlertHistoryDragable();
                setupToastrSettings(saveToastrSettings);
            }

        } catch (error) {
            console.error(`${SCRIPT_NAME}: Toastr initialization failed`, error);
            throw error;
        }
    }

    /**
     * Load toastr with timeout protection
     */
    async function loadToastrWithTimeout() {
        return Promise.race([
            $.getScript(TOASTR_SCRIPT_URL),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Toastr load timeout')), TOASTR_CHECK_TIMEOUT_MS)
            )
        ]).then(() => waitForToastrDefined());
    }

    /**
     * Wait for wazetoastr to be defined with timeout
     */
    function waitForToastrDefined() {
        return new Promise((resolve, reject) => {
            let elapsed = 0;
            const checkToastr = () => {
                if (typeof wazetoastr !== 'undefined') {
                    resolve();
                } else if (elapsed > TOASTR_CHECK_TIMEOUT_MS) {
                    reject(new Error('Timeout waiting for wazetoastr to be defined'));
                } else {
                    elapsed += TOASTR_CHECK_INTERVAL_MS;
                    setTimeout(checkToastr, TOASTR_CHECK_INTERVAL_MS);
                }
            };
            checkToastr();
        });
    }

    /**
     * Configure toastr display options
     */
    function configureToastrOptions() {
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
    }

    /**
     * Create the alert history UI panel
     */
    function createAlertHistoryUI() {
        const $sectionToastr = $("<div>", { 
            style: "padding:8px 16px", 
            id: "wmeWTScriptUpdates" 
        });
        
        $sectionToastr.html(
            '<div class="WTAlertsHistory" title="Script Alert History">' +
            '<i class="fa fa-exclamation-triangle fa-lg"></i>' +
            '<div id="WTAlertsHistory-list">' +
            '<div id="toast-container-history" class="toast-container-wazetoastr"></div>' +
            '</div></div>'
        );

        $("#WazeMap").append($sectionToastr.html());

        // Position the history panel
        $('.WTAlertsHistory').css('left', `${toastrSettings.historyLeftLoc}px`);
        $('.WTAlertsHistory').css('top', `${toastrSettings.historyTopLoc}px`);
    }

    /**
     * Setup draggable behavior for alert history panel
     */
    function setupAlertHistoryDragable() {
        // Try to load jQuery UI for dragging
        $.getScript("https://greasyfork.org/scripts/454988-jqueryui-custom-build/code/jQueryUI%20custom%20build.js")
            .then(() => {
                if ($.ui) {
                    $('.WTAlertsHistory').draggable({
                        stop: function () {
                            const windowWidth = $('#map').width();
                            const panelWidth = $('#WTAlertsHistory-list').width();
                            const historyLoc = $('.WTAlertsHistory').position().left;
                            
                            if ((panelWidth + historyLoc) > windowWidth) {
                                $('#WTAlertsHistory-list').css(
                                    'left',
                                    Math.abs(windowWidth - (historyLoc + $('.WTAlertsHistory').width()) - panelWidth) * -1
                                );
                            } else {
                                $('#WTAlertsHistory-list').css('left', 'auto');
                            }

                            toastrSettings.historyLeftLoc = $('.WTAlertsHistory').position().left;
                            toastrSettings.historyTopLoc = $('.WTAlertsHistory').position().top;
                        }
                    });
                }
            })
            .catch(err => {
                console.debug(`${SCRIPT_NAME}: jQuery UI not available for dragging`, err);
            });
    }

    /**
     * Setup toastr settings save callback
     */
    function setupToastrSettings(saveCallback) {
        // Save settings when alert history is moved
        $(document).off('dragstop.wazetoastr').on('dragstop.wazetoastr', () => {
            try {
                saveCallback();
            } catch (error) {
                console.warn(`${SCRIPT_NAME}: Failed to save toastr settings`, error);
            }
        });
    }

    /**
     * Initialize the script update interface UI
     */
    function initializeScriptUpdateInterface() {
        try {
            console.debug(`${SCRIPT_NAME}: Creating script update interface`);
            injectCSS();
            
            const $section = $("<div>", { 
                style: "padding:8px 16px", 
                id: "wmeWTScriptUpdates" 
            });
            
            $section.html([
                '<div id="WTSU-Container" class="fa" style="position:fixed; top:20%; left:40%; z-index:1000; display:none;">',
                '<div id="WTSU-Close" class="fa-close fa-lg"></div>',
                '<div class="modal-heading">',
                '<h2>Script Updates</h2>',
                '<h4><span id="WTSU-updateCount">0</span> of your scripts have updates</h4>',
                '</div>',
                '<div class="WTSU-updates-wrapper">',
                '<div id="WTSU-script-list">', '</div>',
                '<div id="WTSU-script-update-info">', '</div>',
                '</div></div>'
            ].join(' '));
            
            $("#WazeMap").append($section.html());

            // Setup event handlers
            $('#WTSU-Close').on('click', function () {
                $('#WTSU-Container').hide();
            });

            $(document).on('click', '.WTSU-script-item', function () {
                $('.WTSU-script-item').removeClass("WTSU-active");
                $(this).addClass("WTSU-active");
            });
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Failed to initialize script update interface`, error);
        }
    }

    /**
     * Inject CSS styles for the update interface
     */
    function injectCSS() {
        const css = [
            '#WTSU-Container { position:relative; background-color:#fbfbfb; width:650px; height:375px; border-radius:8px; padding:20px; box-shadow: 0 22px 84px 0 rgba(87, 99, 125, 0.5); border:1px solid #ededed; }',
            '#WTSU-Close { color:#000000; background-color:#ffffff; border:1px solid #ececec; border-radius:10px; height:25px; width:25px; position: absolute; right:14px; top:10px; cursor:pointer; padding: 5px 0px 0px 5px;}',
            '#WTSU-Container .modal-heading,.WTSU-updates-wrapper { font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif; }',
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
     * Alerts class - provides notification methods
     */
    function Alerts() {
        /**
         * Display a success notification
         */
        this.success = function (scriptName, message) {
            try {
                $(wazetoastr.success(message, scriptName))
                    .clone()
                    .prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr')
                    .find('.toast-close-button')
                    .remove();
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying success alert`, error);
            }
        };

        /**
         * Display an info notification
         */
        this.info = function (scriptName, message, disableTimeout, disableClickToClose, timeOut) {
            try {
                let options = {};
                if (disableTimeout) {
                    options.timeOut = 0;
                } else if (timeOut) {
                    options.timeOut = timeOut;
                }
                if (disableClickToClose) {
                    options.tapToDismiss = false;
                }
                
                const $toast = wazetoastr.info(message, scriptName, options);
                $($toast)
                    .clone()
                    .prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr')
                    .find('.toast-close-button')
                    .remove();
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying info alert`, error);
            }
        };

        /**
         * Display a warning notification
         */
        this.warning = function (scriptName, message) {
            try {
                $(wazetoastr.warning(message, scriptName))
                    .clone()
                    .prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr')
                    .find('.toast-close-button')
                    .remove();
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying warning alert`, error);
            }
        };

        /**
         * Display an error notification
         */
        this.error = function (scriptName, message) {
            try {
                $(wazetoastr.error(message, scriptName))
                    .clone()
                    .prependTo('#WTAlertsHistory-list > .toast-container-wazetoastr')
                    .find('.toast-close-button')
                    .remove();
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying error alert`, error);
            }
        };

        /**
         * Display a debug message
         */
        this.debug = function (scriptName, message) {
            try {
                wazetoastr.debug(message, scriptName);
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying debug message`, error);
            }
        };

        /**
         * Display a prompt dialog
         */
        this.prompt = function (scriptName, message, defaultText = '', okFunction, cancelFunction, inputType = 'text') {
            try {
                const wrappedOkFunction = (event, inputValue) => {
                    let convertedValue = inputValue;
                    
                    if (inputType === 'number') {
                        convertedValue = Number(inputValue);
                        if (isNaN(convertedValue)) {
                            this.warning(scriptName, 'Invalid number entered. Please enter a valid number.');
                            return;
                        }
                    }
                    
                    if (okFunction) okFunction(convertedValue);
                };
                
                wazetoastr.prompt(message, scriptName, {
                    promptOK: wrappedOkFunction,
                    promptCancel: cancelFunction,
                    PromptDefaultInput: defaultText
                });
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying prompt`, error);
            }
        };

        /**
         * Display a confirmation dialog
         */
        this.confirm = function (scriptName, message, okFunction, cancelFunction, okBtnText = "Ok", cancelBtnText = "Cancel") {
            try {
                wazetoastr.confirm(message, scriptName, {
                    confirmOK: okFunction,
                    confirmCancel: cancelFunction,
                    ConfirmOkButtonText: okBtnText,
                    ConfirmCancelButtonText: cancelBtnText
                });
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error displaying confirmation`, error);
            }
        };

        /**
         * ScriptUpdateMonitor class - monitors and alerts about script updates
         */
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
             * @param {string} scriptName The name of your script
             * @param {string|number} currentVersion The current installed version
             * @param {string} downloadUrl The download URL (should end with ".user.js" for Greasy Fork)
             * @param {object} GM_xmlhttpRequest Reference to the GM_xmlhttpRequest function
             * @param {string} [metaUrl] Optional URL to meta file with version info
             * @param {RegExp} [metaRegExp] Optional RegExp to extract version from metaUrl
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
             * Start checking for updates at specified interval
             * @param {number} [intervalHours=2] Hours between checks (minimum 1)
             * @param {boolean} [checkImmediately=true] Check immediately when called
             */
            start(intervalHours = 2, checkImmediately = true) {
                if (intervalHours < 1) {
                    throw new Error('Parameter intervalHours must be at least 1');
                }
                if (!this.#intervalChecker) {
                    if (checkImmediately) this.#postAlertIfNewReleaseAvailable();
                    this.#intervalChecker = setInterval(
                        () => this.#postAlertIfNewReleaseAvailable(),
                        intervalHours * 60 * 60 * 1000
                    );
                }
            }
    
            /**
             * Stop checking for updates
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
                        throw new Error('metaRegExp must be a regular expression.');
                    }
                } else {
                    if (!/\.user\.js$/.test(this.#downloadUrl)) {
                        throw new Error('Invalid downloadUrl parameter. Must end with ".user.js"');
                    }
                    this.#metaUrl = this.#downloadUrl.replace(/\.user\.js$/, '.meta.js');
                }
            }
    
            async #postAlertIfNewReleaseAvailable() {
                const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
                let latestVersion;
                try {
                    let tries = 1;
                    const maxTries = 3;
                    while (tries <= maxTries) {
                        latestVersion = await this.#fetchLatestReleaseVersion();
                        if (latestVersion === 503) {
                            if (tries < maxTries) {
                                console.debug(`${this.#scriptName}: Checking for update again (retry #${tries})`);
                                await sleep(1000);
                            } else {
                                console.error(`${this.#scriptName}: Failed to check latest version after multiple 503 errors`);
                            }
                            tries += 1;
                        } else if (latestVersion?.status) {
                            console.error(`${this.#scriptName}: Error checking for updates`, latestVersion);
                            return;
                        } else {
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`${this.#scriptName}: Error checking for updates`, error);
                    return;
                }
                
                if (latestVersion > this.#currentVersion && latestVersion > (this.#lastVersionChecked || '0')) {
                    this.#lastVersionChecked = latestVersion;
                    this.#clearPreviousAlerts();
                    this.#postNewVersionAlert(latestVersion);
                }
            }
    
            #postNewVersionAlert(newVersion) {
                const message = `<a href="${this.#downloadUrl}" target="_blank">Version ${newVersion}</a> is available.<br>Update now to get the latest features and fixes.`;
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
                            try {
                                if (res.status === 503) {
                                    resolve(503);
                                } else if (res.status === 200) {
                                    const versionMatch = res.responseText.match(metaRegExp);
                                    if (!versionMatch || versionMatch.length !== 2) {
                                        throw new Error(`Could not extract version from ${metaUrl} using ${metaRegExp}`);
                                    }
                                    resolve(versionMatch[1]);
                                } else {
                                    resolve(res);
                                }
                            } catch (error) {
                                reject(error);
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
                            $alert.click();
                        }
                    }
                });
            }
        };
    }

    /**
     * Interface class - provides UI update methods for scripts
     */
    function Interface() {
        /**
         * Shows the script update window with update information
         * @param {string} scriptName - The name of the script
         * @param {string} version - The version number
         * @param {string} updateHTML - HTML content describing the update
         * @param {string} [greasyforkLink] - Link to Greasyfork page
         * @param {string} [forumLink] - Link to forum discussion
         */
        this.ShowScriptUpdate = function (scriptName, version, updateHTML, greasyforkLink = "", forumLink = "") {
            try {
                let settings = {};
                
                function loadSettings() {
                    try {
                        const loaded = localStorage.getItem("WTScriptUpdate");
                        settings = loaded ? JSON.parse(loaded) : { ScriptUpdateHistory: {} };
                        if (!settings.ScriptUpdateHistory) settings.ScriptUpdateHistory = {};
                    } catch (error) {
                        console.warn(`${SCRIPT_NAME}: Could not load update history`, error);
                        settings = { ScriptUpdateHistory: {} };
                    }
                }

                function saveSettings() {
                    try {
                        if (localStorage) {
                            localStorage.setItem("WTScriptUpdate", JSON.stringify({ ScriptUpdateHistory: settings.ScriptUpdateHistory }));
                        }
                    } catch (error) {
                        console.warn(`${SCRIPT_NAME}: Could not save update history`, error);
                    }
                }

                loadSettings();

                // Check if this update has already been displayed
                const previousVersion = settings.ScriptUpdateHistory[scriptName];
                const isNewUpdate = updateHTML && updateHTML.length > 0 && previousVersion !== version;

                if (isNewUpdate) {
                    const currCount = $('.WTSU-script-item').length;
                    const divID = (scriptName + version).toLowerCase().replace(/[^a-z-_0-9]/g, '');
                    
                    $('#WTSU-script-list').append(
                        `<a href="#${divID}" class="WTSU-script-item ${currCount === 0 ? 'WTSU-active' : ''}">${scriptName}</a>`
                    );
                    
                    $("#WTSU-updateCount").html(parseInt($("#WTSU-updateCount").html()) + 1);
                    
                    const install = greasyforkLink ? `<a href="${greasyforkLink}" target="_blank">Greasyfork</a>` : "";
                    const forum = forumLink ? `<a href="${forumLink}" target="_blank">Forum</a>` : "";
                    const footer = (install || forum) ? 
                        `<span class="WTSUFooter" style="margin-bottom:2px; display:block;">${install}${(install && forum) ? " | " : ""}${forum}</span>` : "";
                    
                    $('#WTSU-script-update-info').append(
                        `<div id="${divID}"><span><h3>${version}</h3><br>${updateHTML}</span>${footer}</div>`
                    );
                    
                    $('#WTSU-Container').show();
                    
                    if (currCount === 0) {
                        $('#WTSU-script-list').find("a:first").click();
                    }
                    
                    settings.ScriptUpdateHistory[scriptName] = version;
                    saveSettings();
                }
            } catch (error) {
                console.error(`${SCRIPT_NAME}: Error showing script update`, error);
            }
        };
    }

    // Start bootstrap process
    bootstrap();

}.call(this));
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
                var loadedSettings = $.parseJSON(localStorage.getItem("WTScriptUpdate"));
                var defaultSettings = {
                    ScriptUpdateHistory: {},
                };
                settings = loadedSettings ? loadedSettings : defaultSettings;
                for (var prop in defaultSettings) {
                    if (!settings.hasOwnProperty(prop))
                        settings[prop] = defaultSettings[prop];
                }
            }

            function saveSettings() {
                if (localStorage) {
                    var localsettings = {
                        ScriptUpdateHistory: settings.ScriptUpdateHistory,
                    };

                    localStorage.setItem("WTScriptUpdate", JSON.stringify(localsettings));
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

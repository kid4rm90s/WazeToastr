// ==UserScript==
// @name         WazeToastr
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2026.04.15.07
// @description  A base library for WME script writers
// @author       JustinS83/MapOMatic
// @include      https://beta.waze.com/*editor*
// @include      https://www.waze.com/*editor*
// @exclude      https://www.waze.com/*user/editor/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Utility library for WME script writers providing common functionality.
// Updated to follow WME SDK best practices for initialization and error handling.

/* global WazeToastr */
/* global $ */
/* global unsafeWindow */
/* jshint esversion:6 */

var WazeToastr = {};

(function() {
    'use strict';
    
    const WT_URL = 'https://kid4rm90s.github.io/WazeToastr/WazeToastrLib.js';
    const MAX_INIT_ATTEMPTS = 1000;
    const INIT_RETRY_MS = 100;
    const SCRIPT_NAME = 'WazeToastr';
    
    /**
     * Initialize WazeToastr library.
     * Ensures single instance across page context (handles sandboxed and non-sandboxed).
     * @async
     * @throws {Error} When library fails to load
     */
    async function init() {
        const sandboxed = typeof unsafeWindow !== 'undefined';
        const pageWindow = sandboxed ? unsafeWindow : window;
        
        try {
            // Check if WazeToastr is already loaded
            const wtAvailable = pageWindow.WazeToastr;
            
            if (wtAvailable) {
                // Use existing instance
                WazeToastr = pageWindow.WazeToastr;
                console.debug(`${SCRIPT_NAME}: Using existing WazeToastr instance`);
            } else {
                // Register this instance on page window
                pageWindow.WazeToastr = WazeToastr;
                
                // Load external library
                console.debug(`${SCRIPT_NAME}: Loading WazeToastr library from ${WT_URL}`);
                await $.getScript(WT_URL);
            }
            
            // Ensure sandbox context has access
            if (sandboxed) {
                window.WazeToastr = WazeToastr;
            }
            
            console.info(`${SCRIPT_NAME}: Initialization complete`);
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Initialization failed:`, error);
            throw error;
        }
    }
    
    /**
     * Bootstrap function that waits for jQuery and initializes WazeToastr.
     * Retries up to MAX_INIT_ATTEMPTS times if jQuery is not available.
     * @param {number} tries - Current attempt number (default: 1)
     */
    function bootstrap(tries = 1) {
        try {
            if (typeof $ !== 'undefined') {
                // jQuery is available, proceed with initialization
                console.debug(`${SCRIPT_NAME}: jQuery detected, initializing...`);
                init().catch(error => {
                    console.error(`${SCRIPT_NAME}: Async initialization error:`, error);
                });
            } else if (tries < MAX_INIT_ATTEMPTS) {
                // jQuery not available yet, retry
                setTimeout(() => {
                    bootstrap(tries + 1);
                }, INIT_RETRY_MS);
            } else {
                // Max attempts reached
                console.error(`${SCRIPT_NAME}: Failed to initialize after ${MAX_INIT_ATTEMPTS} attempts. jQuery may not be available.`);
            }
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Bootstrap error:`, error);
        }
    }
    
    // Start bootstrap process
    bootstrap();
    
})();

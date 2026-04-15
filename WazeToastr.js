// ==UserScript==
// @name         WazeToastr
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2026.04.15.05
// @description  A toastr notification library for WME scripts - WMESDK Compatible
// @author       JustinS83/MapOMatic
// @include      https://beta.waze.com/*editor*
// @include      https://www.waze.com/*editor*
// @exclude      https://www.waze.com/*user/editor/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/**
 * WazeToastr - Main Script
 * 
 * WMESDK Compatible (v1.0+)
 * Forked from WazeDev's WazeWrap script to use a more reliable CDN for displaying alerts.
 * Updated to work with WMESDK initialization pattern.
 * 
 * INITIALIZATION FLOW:
 * 1. Waits for @run-at document-end to ensure DOM is ready
 * 2. Waits for jQuery availability (WME dependency)
 * 3. Loads WazeToastrLib.js which initializes WMESDK
 * 4. Library then waits for window.SDK_INITIALIZED before starting
 */

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
     * 
     * With WMESDK support:
     * - Detects if WMESDK is injected (window.SDK_INITIALIZED exists)
     * - Falls back to legacy mode if needed
     * - WazeToastrLib.js handles the actual WMESDK initialization
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

                // Expose to Tampermonkey sandbox if needed
                if (sandboxed) {
                    window.WazeToastr = WazeToastr;
                }

                // Log WMESDK availability
                const hasSDK = typeof pageWindow.SDK_INITIALIZED !== 'undefined';
                console.debug(`${SCRIPT_NAME}: ${hasSDK ? 'WMESDK detected' : 'Legacy mode - no WMESDK'}`);

                // Load library from CDN
                // WazeToastrLib.js will handle WMESDK initialization if available
                console.debug(`${SCRIPT_NAME}: Loading WazeToastrLib from CDN`);
                await $.getScript(WT_URL);
                console.info(`${SCRIPT_NAME} v2026.04.15.05 loaded successfully`);
                if (pageWindow.WazeToastr && pageWindow.WazeToastr.Version) {
                    console.info(`${SCRIPT_NAME} Library v${pageWindow.WazeToastr.Version} ready`);
                }
            }
        } catch (error) {
            console.error(`${SCRIPT_NAME}: Initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Bootstrap: Wait for jQuery, then initialize.
     * 
     * WMESDK COMPATIBILITY:
     * - jQuery is always available in WME (both legacy and WMESDK environments)
     * - WazeToastr waits for jQuery availability
     * - WazeToastrLib.js waits for window.SDK_INITIALIZED (if WMESDK is present)
     * - Falls back gracefully if WMESDK is not available
     * 
     * Respects maximum retry limit to prevent infinite loops.
     */
    function bootstrap(tries = 1) {
        if (typeof $ !== 'undefined') {
            init().catch(err => {
                console.error(`${SCRIPT_NAME}: Failed to initialize library`, err);
            });
        } else if (tries < MAX_INIT_ATTEMPTS) {
            setTimeout(() => { bootstrap(tries + 1); }, INIT_RETRY_MS);
        } else {
            console.error(`${SCRIPT_NAME}: Bootstrap failed after ${MAX_INIT_ATTEMPTS} attempts. jQuery not loaded.`);
        }
    }

    // Start bootstrap process
    // @run-at document-end ensures DOM is ready before scripts load
    bootstrap();

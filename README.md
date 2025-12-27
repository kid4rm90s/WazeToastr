# WazeToastr

A toast notification library forked from [WazeDev's WazeWrap](https://github.com/WazeDev/WazeWrap) for Waze Map Editor (WME) scripts that provides a consistent and user-friendly way to display alerts, messages, and prompts.

## Installation

Include WazeToastr in your userscript by adding the main script:

```javascript
// @require https://greasyfork.org/scripts/560385/code/WazeToastr.js
// @require https://kid4rm90s.github.io/WazeToastr/WazeToastr.js

```


## Alert Types

WazeToastr provides several alert types for different use cases:

### 1. Success Alert

Displays a green success notification.

```javascript
WazeToastr.Alerts.success(scriptName, message);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The success message to display

**Example:**
```javascript
WazeToastr.Alerts.success("MyScript", "Data saved successfully!");
```

---

### 2. Info Alert

Displays a blue informational notification with optional timeout and click-to-close settings.

```javascript
WazeToastr.Alerts.info(scriptName, message, disableTimeout, disableClickToClose, timeOut);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The informational message to display
- `disableTimeout` (Boolean, optional): If `true`, the alert stays visible until manually closed
- `disableClickToClose` (Boolean, optional): If `true`, prevents closing the alert by clicking on it
- `timeOut` (Number, optional): Custom timeout in milliseconds (overrides default 6000ms)

**Examples:**
```javascript
// Basic info alert (auto-closes after 6 seconds)
WazeToastr.Alerts.info("MyScript", "Processing data...");

// Info alert that stays until manually closed
WazeToastr.Alerts.info("MyScript", "Click the X to close this message", true);

// Info alert with custom timeout (10 seconds)
WazeToastr.Alerts.info("MyScript", "This will close in 10 seconds", false, false, 10000);

// Info alert that can't be clicked to close but auto-closes
WazeToastr.Alerts.info("MyScript", "Loading...", false, true);
```

---

### 3. Warning Alert

Displays an orange warning notification.

```javascript
WazeToastr.Alerts.warning(scriptName, message);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The warning message to display

**Example:**
```javascript
WazeToastr.Alerts.warning("MyScript", "Some data could not be loaded");
```

---

### 4. Error Alert

Displays a red error notification.

```javascript
WazeToastr.Alerts.error(scriptName, message);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The error message to display

**Example:**
```javascript
WazeToastr.Alerts.error("MyScript", "Failed to connect to server");
```

---

### 5. Debug Alert

Displays a debug message in the console with a styled group. Does not show a toast notification.

```javascript
WazeToastr.Alerts.debug(scriptName, message);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String or Object): The debug information to log

**Example:**
```javascript
WazeToastr.Alerts.debug("MyScript", { userId: 123, action: "save" });
```

---

### 6. Prompt Alert

Displays a dialog with a text input field for user input.

```javascript
WazeToastr.Alerts.prompt(scriptName, message, defaultText, okFunction, cancelFunction);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The prompt message/question to display
- `defaultText` (String, optional): Default text to pre-fill in the input field (default: '')
- `okFunction` (Function): Callback function when user clicks OK. Receives the input value as parameter
- `cancelFunction` (Function): Callback function when user clicks Cancel

**Example:**
```javascript
WazeToastr.Alerts.prompt(
    "MyScript",
    "Enter your name:",
    "John Doe",
    function(inputValue) {
        console.log("User entered:", inputValue);
        WazeToastr.Alerts.success("MyScript", "Welcome " + inputValue);
    },
    function() {
        console.log("User cancelled the prompt");
    }
);
```

---

### 7. Confirm Alert

Displays a confirmation dialog with OK and Cancel buttons.

```javascript
WazeToastr.Alerts.confirm(scriptName, message, okFunction, cancelFunction, okBtnText, cancelBtnText);
```

**Parameters:**
- `scriptName` (String): The name of your script (displayed as the title)
- `message` (String): The confirmation message/question to display
- `okFunction` (Function): Callback function when user clicks OK
- `cancelFunction` (Function): Callback function when user clicks Cancel
- `okBtnText` (String, optional): Custom text for the OK button (default: "Ok")
- `cancelBtnText` (String, optional): Custom text for the Cancel button (default: "Cancel")

**Examples:**
```javascript
// Basic confirm dialog
WazeToastr.Alerts.confirm(
    "MyScript",
    "Are you sure you want to delete this item?",
    function() {
        console.log("User confirmed");
        // Delete the item
    },
    function() {
        console.log("User cancelled");
    }
);

// Confirm dialog with custom button text
WazeToastr.Alerts.confirm(
    "MyScript",
    "Do you want to save your changes?",
    function() {
        // Save changes
    },
    function() {
        // Discard changes
    },
    "Save",
    "Discard"
);
```

---

## Script Update Monitoring

WazeToastr includes built-in support for monitoring script updates from Greasy Fork or custom URLs.

### ScriptUpdateMonitor Class

Automatically checks for new versions of your script and displays alerts when updates are available.

```javascript
const updateMonitor = new WazeToastr.Alerts.ScriptUpdateMonitor(
    scriptName,        // Your script name
    currentVersion,    // Current version (e.g., "1.0.5")
    downloadUrl,       // Script download URL (.user.js)
    GM_xmlhttpRequest  // Tampermonkey's GM function
);

// Start checking for updates
updateMonitor.start(2, true);  // Check every 2 hours, check immediately

// Stop checking
updateMonitor.stop();
```

**Parameters:**
- `scriptName` (String): Name of your script for alert title
- `currentVersion` (String|Number): Current installed version
- `downloadUrl` (String): Script's .user.js URL (must end with .user.js for Greasy Fork)
- `GM_xmlhttpRequest` (Function): Reference to GM_xmlhttpRequest function
- `metaUrl` (String, optional): Custom URL to version metadata (auto-generated for Greasy Fork)
- `metaRegExp` (RegExp, optional): Regex to extract version from metaUrl (default: `/@version\s+(.+)/i`)

**Methods:**
- `start(intervalHours, checkImmediately)`: Start monitoring (default: 2 hours, check immediately)
- `stop()`: Stop monitoring

**Preferred Example:**

```javascript
function scriptupdatemonitor() {
  if (WazeToastr?.Ready) {
    // Create and start the ScriptUpdateMonitor
    const updateMonitor = new WazeToastr.Alerts.ScriptUpdateMonitor(
      scriptName,
      scriptVersion,
      downloadUrl,
      GM_xmlhttpRequest
    );
    
    // Check immediately on page load, then every 2 hours
    updateMonitor.start(2, true);  // checkImmediately = true
    
    // Show the update dialog for the current version
    WazeToastr.Interface.ShowScriptUpdate(scriptName, scriptVersion, updateMessage, downloadUrl, forumURL);
  } else {
    setTimeout(scriptupdatemonitor, 250);
  }
}
scriptupdatemonitor();
```

**Example:**
```javascript
function initUpdateMonitor() {
    if (!WazeToastr.Ready) {
        setTimeout(initUpdateMonitor, 100);
        return;
    }
    
    const updateMonitor = new WazeToastr.Alerts.ScriptUpdateMonitor(
        "MyScript",
        "1.0.5",
        "https://greasyfork.org/scripts/12345-myscript/code/myscript.user.js",
        GM_xmlhttpRequest
    );
    
    // Check immediately and every 2 hours
    updateMonitor.start(2, true);
}

initUpdateMonitor();
```

When a new version is detected, users will see a blue info alert:
> **MyScript**  
> Version 1.0.6 is available.  
> Update now to get the latest features and fixes.

### ShowScriptUpdate Method

Display release notes and update information in a modal dialog.

```javascript
WazeToastr.Interface.ShowScriptUpdate(
    scriptName,      // Your script name
    version,         // Version number
    updateHTML,      // HTML content with release notes
    greasyforkLink,  // Link to Greasyfork page (optional)
    forumLink        // Link to forum discussion (optional)
);
```

**Example:**



```javascript
const updateMessage = `
    <ul>
        <li>Added new feature X</li>
        <li>Fixed bug Y</li>
        <li>Improved performance</li>
    </ul>
`;

WazeToastr.Interface.ShowScriptUpdate(
    "MyScript",
    "1.0.6",
    updateMessage,
    "https://greasyfork.org/scripts/12345-myscript",
    "https://www.waze.com/forum/viewtopic.php?f=819&t=12345"
);
```

**Complete Update Workflow:**
```javascript
const scriptName = "MyScript";
const scriptVersion = "1.0.6";
const downloadUrl = "https://greasyfork.org/scripts/12345-myscript/code/myscript.user.js";
const forumURL = "https://www.waze.com/forum/viewtopic.php?f=819&t=12345";

const updateMessage = `
    <h4>What's New:</h4>
    <ul>
        <li>New feature X</li>
        <li>Bug fix Y</li>
    </ul>
`;

function initUpdates() {
    if (!WazeToastr.Ready) {
        setTimeout(initUpdates, 250);
        return;
    }
    
    // Monitor for future updates
    const monitor = new WazeToastr.Alerts.ScriptUpdateMonitor(
        scriptName,
        scriptVersion,
        downloadUrl,
        GM_xmlhttpRequest
    );
    monitor.start(2, true);
    
    // Show release notes for current version
    WazeToastr.Interface.ShowScriptUpdate(
        scriptName,
        scriptVersion,
        updateMessage,
        downloadUrl,
        forumURL
    );
}

initUpdates();
```

---

## Features

- **Alert History**: All alerts (except debug) are saved to an alert history panel that can be accessed via the icon in the editor
- **Draggable History Panel**: The alert history panel can be dragged to a preferred location
- **Auto-save Position**: The position of the alert history panel is saved and restored
- **Progress Bar**: Visual indication of time remaining before auto-close
- **Close Button**: Manual close option for all alerts
- **Customizable**: Info alerts support custom timeouts and click behaviors
- **Update Monitoring**: Automatic script update detection with toast notifications
- **Update Dialog**: Modal window for displaying release notes and version history

## Best Practices

1. **Use appropriate alert types**: Choose the alert type that matches the severity and nature of your message
2. **Keep messages concise**: Short, clear messages are more effective
3. **Use scriptName consistently**: Always use the same script name throughout your script for brand recognition
4. **Handle callbacks**: Always provide both OK and Cancel callbacks for prompts and confirms
5. **Consider UX**: Don't spam users with too many alerts; use `disableTimeout` sparingly
6. **Update monitoring**: Set reasonable check intervals (2-24 hours) to avoid rate limiting
7. **Release notes**: Use `ShowScriptUpdate` to inform users about new features after updates

## Version

Current version: 2025.12.27.00

## License

This library is a fork of WazeDev's WazeWrap and is part of the Waze Map Editor community tools.
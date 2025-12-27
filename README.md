# WazeToastr

A toast notification library for Waze Map Editor (WME) scripts that provides a consistent and user-friendly way to display alerts, messages, and prompts.

## Installation

Include WazeToastr in your userscript by adding the main script:

```javascript
// @require https://kid4rm90s.github.io/WazeToastr/WazeToastr.js
```

## Usage

Wait for WazeToastr to be ready before using it:

```javascript
function init() {
    if (!WazeToastr.Ready) {
        setTimeout(init, 100);
        return;
    }
    
    // Your code here
    WazeToastr.Alerts.success("MyScript", "Script loaded successfully!");
}

init();
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

## Features

- **Alert History**: All alerts (except debug) are saved to an alert history panel that can be accessed via the icon in the editor
- **Draggable History Panel**: The alert history panel can be dragged to a preferred location
- **Auto-save Position**: The position of the alert history panel is saved and restored
- **Progress Bar**: Visual indication of time remaining before auto-close
- **Close Button**: Manual close option for all alerts
- **Customizable**: Info alerts support custom timeouts and click behaviors

## Best Practices

1. **Use appropriate alert types**: Choose the alert type that matches the severity and nature of your message
2. **Keep messages concise**: Short, clear messages are more effective
3. **Use scriptName consistently**: Always use the same script name throughout your script for brand recognition
4. **Handle callbacks**: Always provide both OK and Cancel callbacks for prompts and confirms
5. **Consider UX**: Don't spam users with too many alerts; use `disableTimeout` sparingly

## Version

Current version: 2025.04.11.00

## License

This library is part of the WazeDev community tools.
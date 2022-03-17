({
    // Update the variables for visibility that will trigger updates in the LWC component
	updateVisibility : function(component,focusedTabId) {
		var currentTab = component.get("v.consoleTabId");
        if (focusedTabId == currentTab) {
            component.set('v.pausedVar', false);
        } else {
            component.set('v.pausedVar', true);
        }
	},
    // Update the variable for the tab being closed to trigger updates in the LWC component
    tabClosed : function(component,tabId) {
        var currentTab = component.get("v.consoleTabId");
        
        if(tabId == currentTab){
            component.set('v.maintabClosed', true);
        } else {
            component.set('v.maintabClosed', false);
        }
    },
    // Update the variables for the case status and open/closed values to trigger updates in the LWC component
    updateCaseStatus : function(component) {
        // Pull the values from the record service and set the variables that are mapped to the LWC component
        component.set('v.caseStatus', component.get("v.simpleRecord.Status"));
        component.set('v.caseIsClosed', component.get("v.simpleRecord.IsClosed"));
    },
    logToConsole : function(component, textToLog) {
        if (component.get('v.loggingEnabled')) {
	        console.log("Case Timer AURA: " + textToLog);
        }
    }
})
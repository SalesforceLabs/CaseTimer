({
    doInit : function(component, event, helper) {        
		component.set('v.loggingEnabled',true); // Determines if the logs are written to the console. Disabled/remove before publishing
        
        var autoStarted = component.get("v.autoStartVar");
        var workspaceAPI = component.find("workspace");
        
        if(autoStarted == true){            
            component.set('v.pausedVar', false);
        }else{
            component.set('v.pausedVar', true);
        }
        workspaceAPI.getEnclosingTabId().then(function(response){
            var enclosingTabId = response;
            helper.logToConsole(component, "TabID: " + enclosingTabId);
            component.set('v.consoleTabId', enclosingTabId);
        })
        
        workspaceAPI.isConsoleNavigation().then(function(response) {
            // Set the parameter - true if console nav, false if standard
            component.set("v.isConsoleNavigation", response);
        })
    },
    // Called when the Case record is updated within the agents session
    handleRecordUpdated: function(component, event, helper) {
        var eventParams = event.getParams();
        if(eventParams.changeType === "LOADED" || eventParams.changeType === "CHANGED") {
           // record is loaded or updated in this session
            helper.logToConsole(component, "Record Update event: " + eventParams.changeType);
            helper.logToConsole(component, "Case in status " + component.get("v.simpleRecord.Status") + ", IsClosed: " + component.get("v.simpleRecord.IsClosed") + ", Time: " + component.get("v.simpleRecord.Cumulative_Time__c"));
            helper.updateCaseStatus(component);
        }
    },
    
    onTabCreated : function(component, event, helper) {
        helper.logToConsole(component, "onTabCreated event");
        helper.updateVisibility(component, event.getParam('tabId'));
    },        
    
    onTabFocused : function(component, event, helper) {
        helper.logToConsole(component, "onTabFocused event");
        helper.updateVisibility(component, event.getParam('currentTabId'));
    }, 
    
    onTabUpdated : function(component, event, helper) {
        helper.logToConsole(component, "onTabUpdated event");
        helper.updateVisibility(component, event.getParam('tabId'));
    },
    
    onTabReplaced : function(component, event, helper) {
        helper.logToConsole(component, "onTabReplaced event");
        helper.updateVisibility(component, event.getParam('tabId'));
    },
    
    onTabClosed : function(component, event, helper) {
        helper.logToConsole(component, "onTabClosed event");
        helper.tabClosed(component, event.getParam('tabId'));
    }
})
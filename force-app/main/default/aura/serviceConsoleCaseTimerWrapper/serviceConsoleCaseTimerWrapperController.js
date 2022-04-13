({
    doInit : function(component, event, helper) {        
		//component.set('v.loggingEnabled',true); // Determines if the logs are written to the console. Disable/remove before publishing
        
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
        });
        
        workspaceAPI.isConsoleNavigation().then(function(response) {
            // Set the parameter - true if console nav, false if standard
            component.set("v.isConsoleNavigation", response);
        });
        
    },
    // Called when the Case record is updated within the agents session
    handleRecordUpdated: function(component, event, helper) {
        var eventParams = event.getParams();
        helper.logToConsole(component, "Record Update event: " + eventParams.changeType);
        if(eventParams.changeType === "LOADED" || eventParams.changeType === "CHANGED") {
           // record is loaded or updated in this session
            helper.logToConsole(component, "Case in status " + component.get("v.simpleRecord.Status") + ", IsClosed: " + component.get("v.simpleRecord.IsClosed"));
            helper.updateCaseStatus(component);
        } 
        else if(eventParams.changeType === "ERROR") {
            // there’s an error while loading, saving, or deleting the record
            helper.logToConsole(component, "event: " + event); //JSON.stringify(event));
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
    },
    
    // This is called by the LWC to open the Session Time or User record when the corresponding column is clicked
    openRecord : function(component, event, helper){        
        var workspaceAPI = component.find("workspace");
        var recordId = event.getParam('passedrecid');          
        
        workspaceAPI.isConsoleNavigation().then(function(response) {
            if(response){
                workspaceAPI.openTab({
                    recordId: recordId,
                })
                .catch(function(error) {
                });
            }else{
                var navEvt = $A.get("e.force:navigateToSObject");
                navEvt.setParams({
                    "recordId": recordId,
                });
                navEvt.fire();
            }
        })
    }
})
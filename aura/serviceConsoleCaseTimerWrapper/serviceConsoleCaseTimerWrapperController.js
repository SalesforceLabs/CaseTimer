({
    doInit : function(component, event, helper) {                
        var autoStarted = component.get("v.autoStartVar");
        var workspaceAPI = component.find("workspace");
        
        if(autoStarted == true){            
            component.set('v.pausedVar', false);
        }else{
            component.set('v.pausedVar', true);
        }
        workspaceAPI.getFocusedTabInfo().then(function(response) {
            var focusedTabId = response.tabId;            
            component.set('v.consoleTabId', focusedTabId);
            component.set('v.tabFocused', true);
        })
    },
    
    onTabCreated : function(component, event, helper) {
        var currentTab = component.get("v.consoleTabId");
        var newTabId = event.getParam('tabId');
        var workspaceAPI = component.find("workspace"); 
        
        if (newTabId == currentTab) {
            component.set('v.tabFocused', true);
            component.set('v.pausedVar', false);
        }else {
            component.set('v.tabFocused', false);
            component.set('v.pausedVar', true);
        } 
    },        
 
    onTabFocused : function(component, event, helper) {
        var currentTab = component.get("v.consoleTabId");
        var focusedTabId = event.getParam('currentTabId');
        var workspaceAPI = component.find("workspace"); 
        
        if (focusedTabId == currentTab) {
            component.set('v.tabFocused', true);
            component.set('v.pausedVar', false);
        }else {
            component.set('v.tabFocused', false);
            component.set('v.pausedVar', true);
        } 
    }, 
    
    onTabUpdated : function(component, event, helper) {
        var workspaceAPI = component.find("workspace");
        var focusedTabId = event.getParam("tabId");
        var currentTab = component.get("v.consoleTabId");
        
        if (focusedTabId == currentTab) {
            component.set('v.tabFocused', true);
            component.set('v.pausedVar', false);
        }else {
            component.set('v.tabFocused', false);
            component.set('v.pausedVar', true);
        } 
    },
    
    onTabReplaced : function(component, event, helper) {
        var currentTab = component.get("v.consoleTabId");
        var replacedTabId = event.getParam('tabId');
        var workspaceAPI = component.find("workspace");
        
        if (replacedTabId == currentTab) {
            component.set('v.tabFocused', true);
            component.set('v.pausedVar', false);
        } else {
            component.set('v.tabFocused', false);
            component.set('v.pausedVar', true);
        } 
    },
    
    onTabClosed : function(component, event, helper) {
        var currentTab = component.get("v.consoleTabId");
        var tabId = event.getParam('tabId');
        
        if(tabId == currentTab){
            component.set('v.maintabClosed', true);
        } else{
            component.set('v.maintabClosed', false);
        }
    },
    
    parentreceivedid : function(component, event, helper){        
        var workspaceAPI = component.find("workspace");
        var agentId = event.getParam('passedrecid');          
        
        workspaceAPI.isConsoleNavigation().then(function(response) {
            if(response){
                workspaceAPI.openTab({
                    recordId: agentId,
                }).then(function(response) {
                    workspaceAPI.getTabInfo({
                        tabId: response
                    }).then(function(tabInfo) {
                    });
                })
                .catch(function(error) {
                });
            }else{
                var navEvt = $A.get("e.force:navigateToSObject");
                navEvt.setParams({
                    "recordId": agentId,
                });
                navEvt.fire();
            }
        })
    }
})

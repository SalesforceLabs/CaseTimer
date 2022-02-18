global with sharing class CaseTimeCount {
    
    @AuraEnabled
    // Checks all the required pre-config has been completed. 
    global static String checkAccess() {
        String accessMessage = null;
        
        // Check we can access the custom object
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Case__c', 'Date__c','Duration__c','Agent__c'};
        for(String field : fieldsToCheck) {
            if(!objMap.get(field).getDescribe().isAccessible() && !objMap.get(field).getDescribe().isCreateable() ) {
                accessMessage = 'Unable to access Session Time object field ' + field;
                break;
            }
        }
        
        // Check we can access some related objects
        if (accessMessage == null && !Schema.sObjectType.Case.fields.Id.isAccessible()){
			accessMessage = 'Unable to access Case objects Id field.';
        }
        
        if (accessMessage == null && !Schema.sObjectType.User.fields.Name.isAccessible()){
			accessMessage = 'Unable to access the User objects Name field.';
        }
        
        // Check the metadata is present for the buffer setting
        if (accessMessage == null)
        {
        	Timer_Config__mdt[] caseTimeCustomSetting = [Select Duration_Buffer__c from Timer_Config__mdt  where label='default'];
            if (caseTimeCustomSetting == null || caseTimeCustomSetting.size() == 0)
            {
                accessMessage = 'No buffer time found - a default Timer Config custom metadata record is required.';
            }
        }
        
        
        return accessMessage;
    }
    
    @AuraEnabled
    // Called when the tab is closed to record time against the record.
    global static Session_Time__c newSession(Id caseId, Integer timeVal) {
        // Time Calculations - convert milliseconds to seconds.   
        Double timeInSecs = timeVal/1000;
        Session_Time__c session = null;
        
        Timer_Config__mdt caseTimeCustomSetting = [Select Duration_Buffer__c from Timer_Config__mdt  where label='default' limit 1];
        Decimal bufferDuration = caseTimeCustomSetting.Duration_Buffer__c;                       
        
        // If time is longer than the buffer then save it
        if(timeInSecs > bufferDuration){
            session = new Session_Time__c();
            session.Case__c = caseId;
            session.Date__c = System.Date.today();
            session.Duration__c = timeInSecs;
            session.Session_Time__c = Time.newInstance(0, 0, 0, timeVal);
            session.Agent__c = UserINFO.getUserId();
            session.Name = UserINFO.getName() + ' time of ' + timeInSecs + 's on ' + String.valueOf(session.Date__c);
            insert session;        
        }
               
        return session;        
    }
    
    @AuraEnabled
    // Called when a new manual entry is saved
    global static Session_Time__c newSessionManual(Id caseId, String timeVal, String theDate, String comments) {        
        // Split out the time string into hours, minutes and seconds
        String[] t = timeVal.split(':');
        Integer h = Integer.valueof(t[0]);
        Integer m = Integer.valueof(t[1]);
        Integer s = Integer.valueof(t[2]);
        Integer fullTime = s + (m * 60) + (h * 3600);
        
        Session_Time__c session = new Session_Time__c();
        session.Case__c = caseId;
        session.Date__c = Date.valueOf(theDate);
        session.Duration__c = fullTime;
        session.Session_Time__c = Time.newInstance(h, m, s, 0);
        session.Agent__c = UserINFO.getUserId();
        session.Manual_Entry__c  = true;
        session.Comments__c = comments;
        session.Name = UserINFO.getName() + ' time of ' + fullTime + 's on ' + String.valueOf(session.Date__c);
        
        insert session;
        return session;
    }
    
    @AuraEnabled(cacheable=true)
    // Get all the sessions related to this record
    global static Session_Time__c[] grabSessions(Id recordId) {
        return [SELECT Agent__r.Name, Date__c, Duration__c, Session_Time__c FROM Session_Time__c WHERE Case__r.Id = :recordId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    // Gets the total time spent on the record
    global static Double totalTime(Id recordId) {        
        Double total = [SELECT Id, Cumulative_Time__c FROM Case WHERE Id = :recordId LIMIT 1].Cumulative_Time__c;
        return total;
    }
    
}
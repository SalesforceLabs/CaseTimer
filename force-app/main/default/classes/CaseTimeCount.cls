global with sharing class CaseTimeCount {
    
    @AuraEnabled
    // Checks all the required pre-config has been completed. 
    global static String checkAccess() {
        String accessMessage = null;
        
        // Check we can access the custom object
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Case__c', 'Date__c','Duration__c','Agent__c','Case_Status__c'};
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
        
        return accessMessage;
    }
    
    @AuraEnabled
    // Called when the tab is closed to record time against the record.
    global static Session_Time__c newSession(Id caseId, Integer timeVal, String status) {
        // Time Calculations - convert milliseconds to seconds.   
        Integer timeInSecs = timeVal/1000;               
        return CaseTimeCount.saveSession(caseId, timeInSecs, System.Date.today(), null, status, false);        
    }
    
    @AuraEnabled
    // Called when a new manual entry is saved
    global static Session_Time__c newSessionManual(Id caseId, String timeVal, String theDate, String comments, String status) {        
        // Split out the time string into hours, minutes and seconds
        String[] t = timeVal.split(':');
        Integer h = Integer.valueof(t[0]);
        Integer m = Integer.valueof(t[1]);
        Integer s = Integer.valueof(t[2]);
        Integer fullTime = s + (m * 60) + (h * 3600);
        
        return CaseTimeCount.saveSession(caseId, fullTime, Date.valueOf(theDate), comments, status, true);
    }
    
    global static Session_Time__c saveSession(Id caseId, Integer duration, Date theDate, String comments, String status, Boolean isManual)
    {   
		Session_Time__c session = new Session_Time__c();
        session.Case__c  = caseId;
        session.Date__c = theDate;
        session.Duration__c = duration;
        session.Agent__c = UserINFO.getUserId();
        session.Manual_Entry__c  = isManual;
        session.Comments__c = comments;
        session.Name = UserINFO.getName() + ' time of ' + duration + 's on ' + String.valueOf(session.Date__c);
        session.Case_Status__c = status;
        insert session;
        return session;
    }
    
    @AuraEnabled(cacheable=true)
    // Get all the sessions related to this record
    global static Session_Time__c[] grabSessions(Id recordId) {
        return [SELECT Agent__r.Name, Date__c, Duration__c FROM Session_Time__c WHERE Case__r.Id = :recordId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    // Gets the total time spent on the record
    global static Double totalTime(Id recordId) {        
        AggregateResult aggr = [SELECT SUM(Duration__c) TotalDuration FROM Session_Time__c WHERE Case__r.Id = :recordId][0];
        return (Double)aggr.get('TotalDuration');
    }
    
}
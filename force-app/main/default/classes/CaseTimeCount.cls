global with sharing class CaseTimeCount {
    
    // Required for Managed packages to have a Namespace for custom fields/objects
    static String namespace = 'LWCCaseTimer__';
    @AuraEnabled
    // Checks all the required pre-config has been completed. 
    global static String checkAccess() {
        String accessMessage = null;
        
        // Check we can access the custom object
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Name',  namespace +'Case__c', namespace + 'Date__c', namespace + 'Duration__c', namespace + 'Agent__c', namespace + 'Case_Status__c', namespace + 'Manual_Entry__c',namespace + 'Comments__c' };
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
        
        if (accessMessage == null && !Schema.sObjectType.User.fields.Name.isAccessible() && !Schema.sObjectType.User.fields.Id.isAccessible()){
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
        if (duration > 0)
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
        return null;
    }
    
    @AuraEnabled(cacheable=true)
    // Get all the sessions related to this record
    global static Session_Time__c[] grabSessions(Id recordId) {
        return [SELECT Id, Agent__r.Name , Agent__c, Date__c, Duration__c FROM Session_Time__c WHERE Case__c = :recordId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    // Gets the total time spent on the record
    global static Double totalTime(Id recordId) {        
        AggregateResult aggr = [SELECT SUM(Duration__c) TotalDuration FROM Session_Time__c WHERE Case__c = :recordId][0];
        return aggr.get('TotalDuration') != null ? (Double)aggr.get('TotalDuration') : 0;
    }
    
}
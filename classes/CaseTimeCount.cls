global with sharing class CaseTimeCount {
    
    @AuraEnabled
    global static String checkAccess() {
        String accessMessage = null;
        
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Case__c', 'Date__c','Duration__c','Agent__c'};
            for(String field : fieldsToCheck) {
                if(!objMap.get(field).getDescribe().isAccessible() && !objMap.get(field).getDescribe().isCreateable() ) {
                    accessMessage = 'Unable to access Session Time object field ' + field;
                    break;
                }
            } 
        if (accessMessage != null && !Schema.sObjectType.Case.fields.Id.isAccessible()){
			accessMessage = 'Unable to access Case ID field.';
        }
        if (accessMessage != null && !Schema.sObjectType.User.fields.Name.isAccessible()){
			accessMessage = 'Unable to access Current User name.';
        }
        return accessMessage;
    }
    
    @AuraEnabled
    global static Session_Time__c[] newSession(Id caseId, String timeVal) {
        // Time Calculations 
        String[] t = timeVal.split(':');
        Integer h = Integer.valueof(t[0]);
        Integer m = Integer.valueof(t[1]);
        Integer s = Integer.valueof(t[2]);
        Integer fullTime = s + (m * 60) + (h * 3600);                
        
        List<Session_Time__c> sessionTimes1 = [SELECT LastModifiedDate, Agent__r.Name, Date__c, CreatedById, Duration__c FROM Session_Time__c WHERE Case__r.Id = :caseId ORDER BY LastModifiedDate DESC Limit 1]; 
        
        Session_Time__c latestSessionTime = new Session_Time__c();
        latestSessionTime.Case__c = caseId;
        latestSessionTime.Date__c = System.Date.today();
        latestSessionTime.Duration__c = 0;
        latestSessionTime.Agent__c = UserINFO.getUserId();
        
        if (sessionTimes1.size() > 0) {
            latestSessionTime = sessionTimes1[0];
        }
        
        Buffer_Duration__mdt caseTimeCustomSetting = [Select Duration_Buffer__c from Buffer_Duration__mdt where label='default' limit 1];
        Decimal bufferDuration = caseTimeCustomSetting.Duration_Buffer__c;                       
        
        if(latestSessionTime.Date__c == System.Date.today() && latestSessionTime.Duration__c == fullTime && latestSessionTime.CreatedbyId == UserINFO.getUserId() && (math.abs(latestSessionTime.LastModifiedDate.getTime() - DateTime.now().getTime()) <= (bufferDuration * 1000))) {
        
        }
        else if(fullTime > bufferDuration){
            Session_Time__c session = new Session_Time__c();
            session.Case__c = caseId;
            session.Date__c = System.Date.today();
            session.Duration__c = fullTime;
            session.Session_Time__c = Time.newInstance(h, m, s, 0);
            session.Agent__c = UserINFO.getUserId();
            
            insert session;        
        }
               
        return [SELECT Agent__r.Name, Date__c, Duration__c, Session_Time__c FROM Session_Time__c WHERE Case__r.Id = :caseId ORDER BY CreatedDate DESC];        
    }
    
    @AuraEnabled
    global static Session_Time__c[] newSessionManual(Id caseId, String timeVal, String theDate, String comments) {        
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Case__c', 'Date__c','Duration__c','Agent__c','Manual_Entry__c'};
            for(String field : fieldsToCheck) {
                if( !objMap.get(field).getDescribe().isAccessible() && !objMap.get(field).getDescribe().isCreateable() ) {
                    throw new System.NoAccessException();
                }
            } 
        if (!Schema.sObjectType.Case.fields.Id.isAccessible()){
            throw new System.NoAccessException();
        }
        if (!Schema.sObjectType.User.fields.Name.isAccessible()){
            throw new System.NoAccessException();
        }
        
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
        
        insert session;
        return [SELECT Agent__r.Name, Date__c, Duration__c, Session_Time__c FROM Session_Time__c WHERE Case__r.Id = :caseId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    global static Session_Time__c[] grabSessions(Id recordId) {
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'Case__c', 'Date__c','Duration__c','Agent__c'};
            for(String field : fieldsToCheck) {
                if( !objMap.get(field).getDescribe().isAccessible() && !objMap.get(field).getDescribe().isCreateable() ) {
                    throw new System.NoAccessException();
                }
            } 
        if (!Schema.sObjectType.Case.fields.Id.isAccessible()){
            throw new System.NoAccessException();
        }
        if (!Schema.sObjectType.User.fields.Name.isAccessible()){
            throw new System.NoAccessException();
        }
        return [SELECT Agent__r.Name, Date__c, Duration__c, Session_Time__c FROM Session_Time__c WHERE Case__r.Id = :recordId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    global static Double totalTime(Id recordId) {        
        Double total = [SELECT Id, Cumulative_Time__c FROM Case WHERE Id = :recordId LIMIT 1].Cumulative_Time__c;
        return total;
    }
    
}
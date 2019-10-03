global with sharing class CaseTimeCount {
    
    @AuraEnabled
    global static Session_Time__c[] newSession(Id caseId, String timeVal) {
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'CaseTimer19__Case__c', 'CaseTimer19__Date__c','CaseTimer19__Duration__c','CaseTimer19__Agent__c'};
            for(String field : fieldsToCheck) {
                if(!objMap.get(field).getDescribe().isAccessible() && !objMap.get(field).getDescribe().isCreateable() ) {
                    throw new System.NoAccessException();
                }
            } 
        if (!Schema.sObjectType.Case.fields.Id.isAccessible()){
            throw new System.NoAccessException();
        }
        if (!Schema.sObjectType.User.fields.Name.isAccessible()){
            throw new System.NoAccessException();
        }
        
        // Time Calculations 
        String[] t = timeVal.split(':');
        Integer h = Integer.valueof(t[0]);
        Integer m = Integer.valueof(t[1]);
        Integer s = Integer.valueof(t[2]);
        Integer fullTime = s + (m * 60) + (h * 3600);                
        
        List<Session_Time__c> sessionTimes1 = [SELECT LastModifiedDate, CaseTimer19__Agent__r.Name, CaseTimer19__Date__c, CreatedById, CaseTimer19__Duration__c FROM CaseTimer19__Session_Time__c WHERE CaseTimer19__Case__r.Id = :caseId ORDER BY LastModifiedDate DESC Limit 1]; 
        
        Session_Time__c latestSessionTime = new Session_Time__c();
        latestSessionTime.Case__c = caseId;
        latestSessionTime.Date__c = System.Date.today();
        latestSessionTime.Duration__c = 0;
        latestSessionTime.Agent__c = UserINFO.getUserId();
        
        if (sessionTimes1.size() > 0) {
            latestSessionTime = sessionTimes1[0];
        }
        
        CaseTimer19__Buffer_Duration__mdt caseTimeCustomSetting = [Select CaseTimer19__Duration_Buffer__c from CaseTimer19__Buffer_Duration__mdt where label='default' limit 1];
        Decimal bufferDuration = caseTimeCustomSetting.Duration_Buffer__c;                       
        
        if(latestSessionTime.CaseTimer19__Date__c == System.Date.today() && latestSessionTime.CaseTimer19__Duration__c == fullTime && latestSessionTime.CreatedbyId == UserINFO.getUserId() && (math.abs(latestSessionTime.LastModifiedDate.getTime() - DateTime.now().getTime()) <= (bufferDuration * 1000))) {
        
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
    global static Session_Time__c[] newSessionManual(Id caseId, String timeVal, String theDate) {        
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'CaseTimer19__Case__c', 'CaseTimer19__Date__c','CaseTimer19__Duration__c','CaseTimer19__Agent__c','CaseTimer19__Manual_Entry__c'};
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
        
        insert session;
        return [SELECT Agent__r.Name, Date__c, Duration__c, Session_Time__c FROM Session_Time__c WHERE Case__r.Id = :caseId ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled(cacheable=true)
    global static Session_Time__c[] grabSessions(Id recordId) {
        Map<String,Schema.SObjectField> objMap = Schema.SObjectType.Session_Time__c.fields.getMap();
        String[] fieldsToCheck = new String[] {'CaseTimer19__Case__c', 'CaseTimer19__Date__c','CaseTimer19__Duration__c','CaseTimer19__Agent__c'};
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
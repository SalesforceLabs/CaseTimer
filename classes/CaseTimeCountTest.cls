@isTest
global with sharing class CaseTimeCountTest {
    @testSetup
    static void setup() {
        Case c = new Case(Subject = 'Test Case');
        insert c;
        Session_Time__c s = new Session_Time__c (Case__c = c.Id, Date__c = System.Date.today(), Duration__c = 1200, Agent__c = UserInfo.getUserId());
        insert s;
        Session_Time__c s2 = new Session_Time__c (Case__c = c.Id, Date__c = System.Date.today(), Duration__c = 1988, Agent__c = UserInfo.getUserId());
        insert s2;
    }
    
    static testMethod void newSessionTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        List<Session_Time__c> sesh = CaseTimeCount.newSession(cId, '00:12:35');
        System.assert(!sesh.isEmpty());
    }
    
    static testMethod void newSessionManualTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        List<Session_Time__c> sesh = CaseTimeCount.newSessionManual(cId, '00:12:00', '2018-12-15');
        System.assert(!sesh.isEmpty());
    }
    
    static testMethod void grabSessionsTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        List<Session_Time__c> sesh = CaseTimeCount.grabSessions(cId);
        System.assert(!sesh.isEmpty());
    }
    
    static testMethod void totalTimeTest(){
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        Double totalTimeVal = CaseTimeCount.totalTime(cId);
        System.assert(totalTimeVal != null);        
    }
    
}
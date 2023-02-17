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
        c = new Case(Subject = 'Test Case 2');
        insert c;
    }
    
    static testMethod void checkAccessTest() {
        String message = CaseTimeCount.checkAccess();
        System.assert(message == null, 'Error checking access - message: ' + message);
    }
    
    static testMethod void newSessionTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        Session_Time__c sesh = CaseTimeCount.newSession(cId, 120000, 'New');
        System.assert(sesh != null, 'Session not created properly.');
    }
    
    static testMethod void newSessionManualTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        Session_Time__c sesh = CaseTimeCount.newSessionManual(cId, '00:05:30', '2022-03-16', 'Comments from Test Class', 'Working');
        System.assert(sesh != null, 'Manual Session not created properly.');
    }
    
    static testMethod void grabSessionsTest() {
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        List<Session_Time__c> sesh = CaseTimeCount.grabSessions(cId);
        System.assert(!sesh.isEmpty(), 'List of Sessions not found');
    }
    
    static testMethod void totalTimeTest(){
        Id cId = [SELECT Id FROM Case WHERE Subject='Test Case'].Id;
        Double totalTimeVal = CaseTimeCount.totalTime(cId);
        System.assert(totalTimeVal == (1200 + 1988), 'Incorrect time returned - got: ' + totalTimeVal + ', expected: 3188'); 
        cId = [SELECT Id FROM Case WHERE Subject='Test Case 2'].Id;
        totalTimeVal = CaseTimeCount.totalTime(cId);
        System.assert(totalTimeVal == 0, 'Incorrect time returned - got: ' + totalTimeVal + ', expected: 0'); 
    }
    
}
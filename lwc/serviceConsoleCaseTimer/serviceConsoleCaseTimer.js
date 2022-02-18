import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import timerPause from '@salesforce/resourceUrl/timerpause';
import timerPlay from '@salesforce/resourceUrl/timerplay';
import { refreshApex } from '@salesforce/apex';

//import stopWatchClass from './stopwatch';

//import SESSION_OBJECT from "@salesforce/schema/Session_Time__c";
import { getRecord } from 'lightning/uiRecordApi';
import newSession from "@salesforce/apex/CaseTimeCount.newSession";
import totalTime from "@salesforce/apex/CaseTimeCount.totalTime";
import grabSessions from "@salesforce/apex/CaseTimeCount.grabSessions";
import newSessionManual from "@salesforce/apex/CaseTimeCount.newSessionManual";
import checkAccess from "@salesforce/apex/CaseTimeCount.checkAccess";

export default class ServiceConsoleCaseTimer extends LightningElement {

    //Static Resources
    timerPauseBtn = timerPause;
    timerPlayBtn = timerPlay;
    
    //Fields and IDs
    @api recordId; 
    @track caseId;    
    
    //Design Attributes
    @api hideCmp = false;
    @api cmpHeader;
    @api hideClock = false;
    @api allowManual = false;
    @api autoStart = false;
    @api isConsoleNavigation = false;
    @api pauseOnLostFocus = false;
   // @api pauseOnHidden = false;

    //Modal
    @track modalClosed = true;
    @track modalClass = 'slds-hide';
    @track manualDate;
    @track manualDuration = '00:00:00';
    @track comments;

    //Timer Variables
    @track stime = "00:00:00";
    @track formattedTime; 
    @track playing = false;
    @track manualPause = false;
    timeIntervalInstance;
    clocktimer;
    totalMilliseconds = 0;
    @track tabisclosed;
    @track timeSaved = false;
    @track isRunningInAppBuilder = false;

    // Field Access variables
    @track hasAccess = true;
    @track accessMessage;
    @track observer;


    @wire(grabSessions, {recordId: '$recordId'}) sessions;    
    @wire(getRecord, { recordId: '$recordId'}) caseRecord;       
    
    // Go get the total time from the database
    @wire(totalTime, {recordId: '$recordId'}) wireTotalTime(result) {
        this.total = result;
        console.log("LWC - totalTime: " + result.data);
        if (result.data){
            this.formattedTime = this.formatSeconds(result.data);
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.formattedTime = '00:00:00';
        }
    }
        
    @api
    get paused() {
        return this._paused;
    }

    set paused(value) {
        console.log("LWC - tabPaused: " + value);
        this._paused = value;
        this.pauseTimer(this._paused);
    }

    @api
    get tabclosed(){
        return this._tabclosed;
    }

    set tabclosed(value){
        console.log("LWC - tabClosed: " + value);
        this._tabclosed = value;
        this.tabisclosed = this._tabclosed;
        if(this.tabisclosed){
            this.disconnectedHandler();
        }
    }

    constructor(params){
        super(params)
        // These are important to set the context of 'this' in the callback functions
        this.disconnectedHandler = this.disconnectedHandler.bind(this);
        this.pauseTimer = this.pauseTimer.bind(this);
        this.onvisibilitychange = this.onvisibilitychange.bind(this);
        this.btnClick = this.btnClick.bind(this);
     }

    connectedCallback() {
        console.log("location.href: " + location.href);
        this.isRunningInAppBuilder = location.href.indexOf("flexipageEditor") > 0;
        console.log("isRunningInAppBuilder: " + this.isRunningInAppBuilder);

        this.manualPause = !this.autoStart; // Set manual pause true if we aren't auto-starting
        if(this.autoStart){              
            this.start();
        }
        checkAccess().then(result => {
            this.accessMessage = result;
            if (result) {
                this.hasAccess = false;
                this.hideClock = true;
            }
        })
        
        // For console navigation the tab stays open and the Workspace API allows us to track updates
        if (!this.isConsoleNavigation && !this.isRunningInAppBuilder) {
            // For standard navigation we need to listen for the URL changing and write the time at that point
            // let lastUrl = location.href;
            console.log("lastUrl: " + lastUrl);
            new MutationObserver((mutationsList, observer) => {
                const url = location.href;
                console.log("lastUrl: " + lastUrl);
                console.log("url: " + url);
                if (url !== lastUrl) {
                    this.disconnectedHandler();
                }
                 // Use traditional 'for loops' for IE 11
                for(const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        console.log('A child node has been added or removed.');
                    }
                    else if (mutation.type === 'attributes') {
                        console.log('The ' + mutation.attributeName + ' attribute was modified.');
                    }
                }
                observer.disconnect();
            }).observe(document, {subtree: true,childList: true});
        }

        window.addEventListener("beforeunload", this.disconnectedHandler);
        
        console.log("pauseOnLostFocus: " + this.pauseOnLostFocus);
        if (this.pauseOnLostFocus) {
            // this one detects changing tabs in the browser
            document.addEventListener("visibilitychange", this.onvisibilitychange);
            // Want these too for when leaving the browser window
            window.onfocus = window.onblur = this.onvisibilitychange;
        }

    }       
    
    disconnectedCallback() {
        //this.observer.disconnect();
        console.log("LWC - disconnectedCallback() called");
        this.disconnectedHandler();
    }

    // Function for detecting window navigation/closing 
    disconnectedHandler(){
        console.log("LWC - disconnectingHandler. stime: " + this.stime);
        if(!this.timeSaved && this.stime !== '00:00:00'){       
            this.stop();
            this.timeSaved = true; // Ensures we only save once
            newSession({caseId: this.recordId, timeVal: this.totalMilliseconds}).then(() => {
                 
                })
                .catch(error => {
                    console.error(error);
                });
            
        }
    }

    errorCallback(error, stack)
    {
        console.error(error.message);
    }

    onvisibilitychange (evt) {
        console.log("Visiblity Event - " + evt.type);
        console.log("document.visibilityState: " + document.visibilityState);
        console.log("playing: " + this.playing + ", manualPause: " + this.manualPause);
        
        // Browser events for the window being hidden or shown
        if (!this.manualPause && ((evt.type === 'visibilitychange' && document.visibilityState === 'visible') ||
                evt.type === 'focus' )) {
            console.log("Starting/continuing");
            this.start();
        } else if ((evt.type === 'visibilitychange' && document.visibilityState === 'hidden') ||
                evt.type === 'blur' ) {
            console.log("Pausing");
            this.stop();
        }

    }

    // Called by the setting which is triggered via the Workspace API (from Aura component)
    // when tab switched within Salesforce
    pauseTimer(pause){
        switch(pause){
            // False means play timer
            case false:  
                if(this.stime != '00:00:00' && !this.manualPause && !this.playing){
                    this.start();
                }                              
                break;
            // True means pause timer
            case true:                            
                this.stop();
                break;
            default:
                this.stop();
                break;
        }
    }

    //Send Agent Id to Aura Component Wrapper
    handleAgentId(event){
        var passedrecid = event.detail;

        const passingAgentIdEvent = new CustomEvent('passingagentid',{
            detail : {passedrecid},
        })
        this.dispatchEvent(passingAgentIdEvent);
    }

    //Open Modal Logic
    toggleModal(){
        this.modalClosed = !this.modalClosed;
        this.modalClass = this.modalClosed ? 'slds-hide' : '';
    }

    //clear manual session creation form inputs
    clearInputs(){
        this.manualDate = null;
        this.manualDuration = '00:00:00';       
    }

    //handle manual session creation form input
    handleFormInput(event){
        if( event.target.name == 'manualDate' ){
            this.manualDate = event.target.value;
        }
        else if( event.target.name == 'manualDuration' ){
            this.manualDuration = event.target.value;
        }
        else if( event.target.name == 'comments' ){
            this.comments = event.target.value;
        }
    }

    //Manually Saving Session - onClick method
    handleSaveSession(){
        newSessionManual({caseId: this.recordId, timeVal: this.manualDuration, theDate: new Date(this.manualDate), comments: this.comments})
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Session Saved',
                        message: 'New session created',
                        variant: 'success',
                    }),
                );
                // This goes and retrieves all of the data from the DB again, this could be more efficient
                // By just adding the new one to the list and incrementing the count
                refreshApex(this.sessions);
                refreshApex(this.total);                        
                this.toggleModal();
                this.clearInputs();
            })
            .catch(error => {                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error saving session',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }

    //Pause Timer/Session when button clicked
    btnClick(event){
        var id = event.target.dataset.id;       
        switch(id){
            case "start":
                this.manualPause = false;              
                this.start();
                break;
            case "stop":
                this.manualPause = true;              
                this.stop();
                break;
            default:
                this.manualPause = true;  
                this.stop();
                break;
        }
    }

    /////////////////HELPER METHODS//////////////////
    start(){
        if (!this.isRunningInAppBuilder && !this.playing) {
            let that = this;
            this.playing = true;
            this.clocktimer = setInterval(function(){
                that.updateStatus();
                that.totalMilliseconds += 100;
            }, 100); 
        }
    }

    stop(){
        if (this.playing) 
        {
            this.playing = false;
            clearInterval(this.clocktimer);
        }
    }

    updateStatus(){      
        this.stime = this.formatMilliseconds(this.totalMilliseconds);  
    }    

    //stopwatch stores values as milliseconds
    formatMilliseconds(milliseconds){
        var h, m, s = 0;
        
        h = Math.floor( milliseconds / (60 * 60 * 1000) );
        milliseconds = milliseconds % (60 * 60 * 1000);
        m = Math.floor( milliseconds / (60 * 1000) );
        milliseconds = milliseconds % (60 * 1000);
        s = Math.floor( milliseconds / 1000 );
        
        return this.pad(h, 2) + ':' + this.pad(m, 2) + ':' + this.pad(s, 2);
    }

    //roll up summary field returns seconds
    formatSeconds(seconds){   
        var h, m, s = 0;
        
        h = Math.floor( seconds / (60 * 60 ) );
        seconds = seconds % (60 * 60 );
        m = Math.floor( seconds / (60 ) );
        seconds = seconds % (60 );
        s = Math.floor( seconds );
        
        return this.pad(h, 2) + ':' + this.pad(m, 2) + ':' + this.pad(s, 2);
    }

    pad(num, size){
        var s = "0000" + num;
        return s.substr(s.length - size);
    }
    //////////////////////////////////////////////////
}
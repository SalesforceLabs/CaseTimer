import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import timerPause from '@salesforce/resourceUrl/timerpause';
import timerPlay from '@salesforce/resourceUrl/timerplay';
import { refreshApex } from '@salesforce/apex';
import newSession from "@salesforce/apex/CaseTimeCount.newSession";
import totalTime from "@salesforce/apex/CaseTimeCount.totalTime";
import grabSessions from "@salesforce/apex/CaseTimeCount.grabSessions";
import newSessionManual from "@salesforce/apex/CaseTimeCount.newSessionManual";
import checkAccess from "@salesforce/apex/CaseTimeCount.checkAccess";

export default class ServiceConsoleCaseTimer extends LightningElement {

    // Whether to log out to the browser console or not. Disabled before publishing
    loggingEnabled = false;

    //Static Resources
    timerPauseBtn = timerPause;
    timerPlayBtn = timerPlay;

    //Fields and IDs
    @api recordId;

    //Design Attributes
    @api hideCmp = false;
    @api cmpHeader;
    @api hideClock = false;
    @api allowManual = false;
    @api autoStart = false;
    @api isConsoleNavigation = false;
    @api pauseOnLostFocus = false;
    @api stopWhenCaseClosed = false;
    @api bufferInSeconds = 0;

    //Modal
    @track modalClosed = true;
    @track modalClass = 'slds-hide';
    @track manualDate;
    @track manualDuration = '00:00:00';
    @track comments;

    //Timer Variables
    @track stime = "00:00:00";
    @track timerStartTime;
    @track formattedTime; 
    @track playing = false;
    @track manualPause = false;
    @track pausedElapsedTime = 0;
    @track pausedStartTime = 0;
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

    // Gets the list of sessions related to this record
    @wire(grabSessions, {recordId: '$recordId'}) sessions;
    
    // Go get the total time from the database
    @wire(totalTime, {recordId: '$recordId'}) wireTotalTime(result) {
        this.total = result;
        this.logToConsole("totalTime: " + result.data);
        if (result.data){
            this.formattedTime = this.formatSeconds(result.data);
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.formattedTime = '00:00:00';
        } else 
        {
            // if the result is NULL (i.e. no time recorded)
            this.formattedTime = '00:00:00';
        }
    }
    

    @api
    get paused() {
        return this._paused;
    }
    // Called when value in the Aura component is updated
    set paused(value) {
        this.logToConsole("tabPaused: " + value);
        this._paused = value;
        this.pauseTimer(this._paused);
    }

    @api
    get caseStatus() {
        return this._caseStatus;
    }

    // Called when value in the Aura component is updated
    set caseStatus(value) {
        this.logToConsole("caseStatus: " + value);
        // Before updating the status create a new time entry and use the previous status value
        if (this._caseStatus && this._caseStatus != value)
        {
            this.logToConsole("CaseStatus: changed");
            this.stop();
            this.logToConsole("Saving new session " + this.totalMilliseconds);
            newSession({caseId: this.recordId, timeVal: this.totalMilliseconds, status: this.caseStatus}).then(() => {
                    // Reload the values from the DB so we have the latest
                    refreshApex(this.sessions);
                    refreshApex(this.total);  
                    this.totalMilliseconds = 0;
                    this.pausedElapsedTime = 0;
                    this.timerStartTime = Date.now();
                    this.pausedStartTime = this.timerStartTime;
                    this.manualPause ? this.updateTime() : this.start(); // Only restart the timer if we haven't manually paused before the update of the status
                })
                .catch(error => {
                    console.error(error);
                });
            
        }
        this._caseStatus = value;
    }

    @api
    get caseIsClosed() {
        return this._IsClosed;
    }

    // Called when value in the Aura component is updated
    set caseIsClosed(value) {
        this.logToConsole("IsClosed: " + value);
        if (value === true && this.stopWhenCaseClosed)
        {
            this.stop();
        }
        this._IsClosed = value;
    }
    @api
    get tabclosed(){
        return this._tabclosed;
    }

    // Called when value in the Aura component is updated
    set tabclosed(value){
        this.logToConsole("tabClosed: " + value);
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
        this.logToConsole("location.href: " + location.href);
        this.isRunningInAppBuilder = location.href.indexOf("flexipageEditor") > 0;
        this.logToConsole("isRunningInAppBuilder: " + this.isRunningInAppBuilder);
        this.timerStartTime = Date.now();
        this.pausedStartTime = this.timerStartTime;
        this.logToConsole("timerStartTime: " + this.timerStartTime);

        this.manualPause = !this.autoStart; // Set manual pause true if we aren't auto-starting
        if(this.autoStart){
            this.start();
        }
        checkAccess().then(result => {
            this.logToConsole('checkAccess(): Got result returned');
            this.accessMessage = result;
            if (result) {
                this.hasAccess = false;
                this.hideClock = true;
                this.hideCmp = false;
            }
        }).catch(error => {
            this.logToConsole('Error in call to checkAccess() - usually due to no access to the Apex Class. Assign the permission set');
            this.accessMessage = error.body.message;
            this.hasAccess = false;
            this.hideClock = true;
            this.hideCmp = false; // For show this component
        })
        
        // For console navigation the tab stays open and the Workspace API allows us to track updates
        if (!this.isConsoleNavigation && !this.isRunningInAppBuilder) {
            // NEVER GOT THIS RELIABLY WORKING SO ONLY SUPPORTING CONSOLE SCREENS
            // For standard navigation we need to listen for the URL changing and write the time at that point
            // Never got this reliably working, so for now, only Console apps are supported
            // let lastUrl = location.href;
            // this.logToConsole("lastUrl: " + lastUrl);
            // new MutationObserver((mutationsList, observer) => {
            //     const url = location.href;
            //     this.logToConsole("lastUrl: " + lastUrl);
            //     this.logToConsole("url: " + url);
            //     if (url !== lastUrl) {
            //         this.disconnectedHandler();
            //     }
            //      // Use traditional 'for loops' for IE 11
            //     for(const mutation of mutationsList) {
            //         if (mutation.type === 'childList') {
            //             this.logToConsole('A child node has been added or removed.');
            //         }
            //         else if (mutation.type === 'attributes') {
            //             this.logToConsole('The ' + mutation.attributeName + ' attribute was modified.');
            //         }
            //     }
            //     observer.disconnect();
            // }).observe(document, {subtree: true,childList: true});
        }

        window.addEventListener("beforeunload", this.disconnectedHandler);
        
        this.logToConsole("pauseOnLostFocus: " + this.pauseOnLostFocus);
        // this one detects changing tabs in the browser
        document.addEventListener("visibilitychange", this.onvisibilitychange);
        // Want these too for when leaving the browser window
        window.onfocus = window.onblur = this.onvisibilitychange;

    }       
    
    disconnectedCallback() {
        //this.observer.disconnect();
        this.logToConsole("disconnectedCallback() called");
        this.disconnectedHandler();
    }

    // Function for detecting window navigation/closing 
    disconnectedHandler(){
        this.logToConsole("disconnectingHandler. stime: " + this.stime + ", this.timeSaved: " + this.timeSaved) ;
        if(!this.timeSaved && this.stime !== '00:00:00' && this.totalMilliseconds > (this.bufferInSeconds*1000)){
            this.timeSaved = true; // Ensures we only save once as this event can be called multiple times
            this.stop();
            this.logToConsole("Saving new session " + this.totalMilliseconds);
            newSession({caseId: this.recordId, timeVal: this.totalMilliseconds, status: this.caseStatus}).then(() => {
                    refreshApex(this.sessions);
                    refreshApex(this.total);  
                })
                .catch(error => {
                    console.error(error);
                });
            
        }
    }

    errorCallback(error, stack)
    {
        console.error(error.message);
        console.error(stack);
    }

    onvisibilitychange (evt) {
        this.logToConsole("Visiblity Event - " + evt.type);
        this.logToConsole("document.visibilityState: " + document.visibilityState);
        this.logToConsole("playing: " + this.playing + ", manualPause: " + this.manualPause);
        
        // Browser events for the window being hidden or shown
        if (!this.manualPause && ((evt.type === 'visibilitychange' && document.visibilityState === 'visible') ||
                evt.type === 'focus' )) {
            // focus on gaining focus for window and tab
            // visibilitychange + visible on tab switch
            this.logToConsole("Starting/continuing");
            this.start();
            if (evt.type === 'visibilitychange' && !this.pauseOnLostFocus)
            {
                // when changing tabs, the browser can pause timers in the background, so recalculate elasped time (if we pause on lost focus then we wont have been counting anyway)
                this.logToConsole("this.timerStartTime + this.pausedElapsedTime: " + this.timerStartTime + " + " + this.pausedElapsedTime);
                this.logToConsole("this.totalMilliseconds previous value.");
                this.totalMilliseconds = Date.now() - (this.timerStartTime + this.pausedElapsedTime);
                this.logToConsole("this.totalMilliseconds updated value.");
            }
        } else if ((evt.type === 'visibilitychange' && document.visibilityState === 'hidden') ||
                evt.type === 'blur' ) {
            // blur on lose focus to different application/window
            // visibilitychange on swapping browser tabs
            if (this.pauseOnLostFocus) {
                this.logToConsole("Pausing");
                this.stop();
            }
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

    //Send Record Id to Aura Component Wrapper to open the record (either session record or agent/user)
    handleRecordId(event){
        var passedrecid = event.detail;

        const passingRecordIdEvent = new CustomEvent('passingrecordid',{
            detail : {passedrecid},
        })
        this.dispatchEvent(passingRecordIdEvent);
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
        this.comments = null;
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
        let isValid = true;
        this.logToConsole("handleSaveSession() called");
        let requiredInputs = this.template.querySelectorAll(".reqInpFld");
        requiredInputs.forEach(inputField => {
            if(!inputField.checkValidity()) {
                inputField.reportValidity();
                isValid = false;
            }
        });
        if (isValid)
        {
            newSessionManual({caseId: this.recordId, timeVal: this.manualDuration, theDate: new Date(this.manualDate), comments: this.comments, status: this.caseStatus})
                .then(result => {
                    if (result) {
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
                    }
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
        if (!this.isRunningInAppBuilder && !this.playing && !(this.stopWhenCaseClosed && this.caseIsClosed)) {
            let that = this;
            this.playing = true;
            // Keep track of how much time the timer has been paused
            this.logToConsole("this.pausedStartTime: " + this.pausedStartTime);
            this.pausedElapsedTime += (Date.now() - this.pausedStartTime);
            this.logToConsole("pausedElapsedTime: " + this.pausedElapsedTime);
            this.clocktimer = setInterval(function(){
                that.updateTime();
                that.totalMilliseconds += 100;
            }, 100); 
        }
    }

    stop(){
        if (this.playing) 
        {
            // Keep track of how much time the timer has been paused
            this.pausedStartTime = Date.now();
            this.playing = false;
            clearInterval(this.clocktimer);
        }
    }

    updateTime(){      
        this.stime = this.formatMilliseconds(this.totalMilliseconds);
    }    

    //stopwatch stores values as milliseconds
    formatMilliseconds(milliseconds){
        var h, m, s = 0;
        
        h = Math.floor( milliseconds / (60 * 60 * 1000) );
        milliseconds = milliseconds % (60 * 60 * 1000) ;
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

    logToConsole(textToLog) {
        if (this.loggingEnabled) {
            console.log("Case Timer LWC: " + textToLog);
        }
    }
    //////////////////////////////////////////////////
}
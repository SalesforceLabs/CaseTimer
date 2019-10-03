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

    //Modal
    @track modalClosed = true;
    @track modalClass = 'slds-hide';
    @track manualDate;
    @track manualDuration = '00:00:00';

    //Timer Variables
    @track stime = "00:00:00";
    //@api stopwatch = new stopWatchClass();
    @track formattedTime; 
    @track playing = false;
    @track recording = false;
    timeIntervalInstance;
    clocktimer;
    totalMilliseconds = 0;
    @track ispaused;
    @track tabisclosed;


    @wire(grabSessions, {recordId: '$recordId'}) sessions;    
    @wire(getRecord, { recordId: '$recordId'}) caseRecord;       
    
    @wire(totalTime, {recordId: '$recordId'})
    wireTotalTime(result) {
        this.total = result;
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
        this._paused = value;
        this.ispaused = this._paused;
        this.pauseTimer(this.ispaused);
    }

    @api
    get tabclosed(){
        return this._tabclosed;
    }

    set tabclosed(value){
        this._tabclosed = value;
        this.tabisclosed = this._tabclosed;
        if(this.tabisclosed){
            this.disconnectedHandler();
        }
    }



    constructor(params){
        super(params)
        this.disconnectedHandler = this.disconnectedHandler.bind(this)
        this.pauseTimer = this.pauseTimer.bind(this)
     }
    
    

    connectedCallback() {
        if(this.autoStart){              
            this.start();
        }
        window.addEventListener("beforeunload", this.disconnectedHandler); 
    }       
    
    // Function for detecting window navigation/closing 
    disconnectedHandler(){
        if(this.stime !== '00:00:00'){       
        this.stop();        
        newSession({caseId: this.recordId, timeVal: this.stime}).then(() => {
            })
            .catch(error => {
            });
        }
    }

    pauseTimer(ontab){
        switch(ontab){
            // False means play timer
            case false:  
            if(this.stime != '00:00:00' && this.playing != true){
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
    }

    //Method to automatically start session
    startSessionAutomatic(){
        //Start from 0
        if(this.stime === '00:00:00'){
            newSession({caseId: this.recordId, timeVal: this.stime})
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Session Saved',
                            message: 'New session created',
                            variant: 'success',
                        }),
                    );
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

    //Manually Saving Session - onClick method
    handleSaveSession(){
        newSessionManual({caseId: this.recordId, timeVal: this.manualDuration, theDate: new Date(this.manualDate)})
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Session Saved',
                        message: 'New session created',
                        variant: 'success',
                    }),
                );       
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

    //Pause Timer/Session Method
    btnClick(event){
        var id = event.target.dataset.id;       
        switch(id){
            case "start":                
                this.start();
                break;
            case "stop":                           
                this.stop();
                break;
            default:
                this.stop();
                break;
        }
    }

    /////////////////HELPER METHODS//////////////////
    start(){
        let that = this;
        this.playing = true;
        this.recording = true;
        this.clocktimer = setInterval(function(){
            that.updateStatus();
            that.totalMilliseconds += 100;
        }, 100); 
    }

    stop(){
        this.playing = false;
        this.recording = false;
        clearInterval(this.clocktimer);
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
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class LwcSessionItem extends NavigationMixin(LightningElement) {
    @track formattedTime;    
    @track agentURL;
    @track sessionURL;     
    _session; 

    @api 
    get session(){
        return this._session;        
    }

    set session(value){     
        if(value){
            this._session = value;        
            this.formattedTime = this.formatTime(value.Duration__c);                        
        }           
    }

    connectedCallback(){
        this.generateAgentURL(this.session.Agent__c);
        this.generateSessionURL(this.session.Id);
    }

    generateAgentURL(agentId){
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: agentId,
                objectApiName: 'User',
                actionName: 'view',
            },
        }).then(url => {
            this.agentURL = url;
        });
    }

    generateSessionURL(sessionId){
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: sessionId,
                objectApiName: 'Session_Time__c',
                actionName: 'view'
            },
        }).then(url => {
            this.sessionURL = url;
        });
    }

    handleClickedAgent(event){
        var recId = event.target.dataset.targetId;

        const sendAgentIdEvent = new CustomEvent('sendagentid',{
            detail : recId,
        })
        this.dispatchEvent(sendAgentIdEvent);
        
    }
    
    formatTime(duration){   
        
        var h, m, s = 0;
        var newTime = '';
        
        h = Math.floor( duration / (60 * 60 ) );
        duration = duration % (60 * 60 );
        m = Math.floor( duration / (60 ) );
        duration = duration % (60 );
        s = Math.floor( duration );
        
        return this.pad(h, 2) + ':' + this.pad(m, 2) + ':' + this.pad(s, 2);
    }

    pad(num, size){
        var s = "0000" + num;
        return s.substr(s.length - size);
    }
}
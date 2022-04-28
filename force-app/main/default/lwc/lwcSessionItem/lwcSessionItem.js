import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class LwcSessionItem extends NavigationMixin(LightningElement) {
    @track formattedTime;
    _session; 

    @api 
    get session(){
        return this._session;        
    }

    set session(value){     
        if(value){
            this._session = value;        
            this.formattedTime = this.formatTime(value.LWCCaseTimer__Duration__c);                        
        }           
    }

    connectedCallback(){
    }

    handleClickedRecord(event){
        var recId = event.target.dataset.targetId;

        const sendRecordIdEvent = new CustomEvent('sendrecordid',{
            detail : recId,
        })
        this.dispatchEvent(sendRecordIdEvent);
        
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
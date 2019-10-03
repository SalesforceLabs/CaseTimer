import { LightningElement, track, api} from 'lwc';

export default class Stopwatch {
    timeIntervalInstance;
    totalMilliseconds = 0;

    start(event) {
        var parentThis = this;

        // Run timer code in every 100 milliseconds
        this.timeIntervalInstance = setInterval(function() {

            // Time calculations for hours, minutes, seconds and milliseconds
            var hours = Math.floor((parentThis.totalMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((parentThis.totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((parentThis.totalMilliseconds % (1000 * 60)) / 1000);
            var milliseconds = Math.floor((parentThis.totalMilliseconds % (1000)));
                        
            parentThis.totalMilliseconds += 100;
        }, 100);
    }

    stop(event) {
        clearInterval(this.timeIntervalInstance);
    }

    reset(event) {
        this.totalMilliseconds = 0;
        clearInterval(this.timeIntervalInstance);
    }

    @api
    formatTime(time){
        var h, m, s = 0;
        var newTime = '';
        
        h = Math.floor( time / (60 * 60 * 1000) );
        time = time % (60 * 60 * 1000);
        m = Math.floor( time / (60 * 1000) );
        time = time % (60 * 1000);
        s = Math.floor( time / 1000 );
        
        newTime = this.pad(h, 2) + ':' + this.pad(m, 2) + ':' + this.pad(s, 2);
        return newTime;
    }

    @api
    pad(num, size){
        var s = "0000" + num;
        return s.substr(s.length - size);
    }
}
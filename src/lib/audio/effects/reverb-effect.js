// reverb effect is currently work in progress.

class ReverbEffect {
    constructor(audioContext, startTime, endTime) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();

        this.gain = this.audioContext.createGain();
        this.gain.gain.value = 0;

        this.gain.gain.setValueAtTime(0.75, startTime);
        this.gain.gain.setValueAtTime(0, endTime);

        this.delay1 = this.audioContext.createDelay();
        this.delay2 = this.audioContext.createDelay();
        this.delay3 = this.audioContext.createDelay();
        this.delay4 = this.audioContext.createDelay();

        this.delay1.delayTime.value = 0.03;
        this.delay2.delayTime.value = 0.07;
        this.delay3.delayTime.value = 0.15;
        this.delay4.delayTime.value = 0.30;

        this.feedback1 = this.audioContext.createGain();
        this.feedback2 = this.audioContext.createGain();
        this.feedback3 = this.audioContext.createGain();
        this.feedback4 = this.audioContext.createGain();
        
        this.feedback1.gain.value = 0.3;
        this.feedback2.gain.value = 0.2;
        this.feedback3.gain.value = 0.15;
        this.feedback4.gain.value = 0.1;

        this.mix = this.audioContext.createGain();
        this.dryMix = this.audioContext.createGain();
        this.wetMix = this.audioContext.createGain();

        this.dryMix.gain.value = 1;
        this.wetMix.gain.value = 0.5;

        this.tailDelay = this.audioContext.createDelay();
        this.tailDelay.delayTime.value = 0.05;

        this.input.connect(this.gain);
        this.gain.connect(this.dryMix);
        this.gain.connect(this.delay1);
        this.gain.connect(this.delay2);
        this.gain.connect(this.delay3);
        this.gain.connect(this.delay4);

        this.delay1.connect(this.feedback1);
        this.feedback1.connect(this.delay1);
        this.delay1.connect(this.wetMix);

        this.delay2.connect(this.feedback2);
        this.feedback2.connect(this.delay2);
        this.delay2.connect(this.wetMix);

        this.delay3.connect(this.feedback3);
        this.feedback3.connect(this.delay3);
        this.delay3.connect(this.wetMix);

        this.delay4.connect(this.feedback4);
        this.feedback4.connect(this.delay4);
        this.delay4.connect(this.wetMix);

        this.dryMix.connect(this.mix);
        this.wetMix.connect(this.mix);
        this.mix.connect(this.tailDelay);
        this.tailDelay.connect(this.output);
    }
}

export default ReverbEffect;

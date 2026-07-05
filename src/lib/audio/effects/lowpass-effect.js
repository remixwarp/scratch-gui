class LowPassEffect {
    constructor (audioContext, startSeconds, endSeconds) {
        this.audioContext = audioContext;

        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();

        this.effect = this.audioContext.createBiquadFilter();
        this.effect.type = "lowpass";
        this.effect.frequency.value = 11025;
        this.effect.Q.value = 0.7;

        this.effect.frequency.setValueAtTime(880, startSeconds);
        this.effect.frequency.setValueAtTime(11025, endSeconds);

        this.input.connect(this.effect);
        this.effect.connect(this.output);
    }
}

export default LowPassEffect;

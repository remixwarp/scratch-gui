class HighPassEffect {
    constructor (audioContext, startSeconds, endSeconds) {
        this.audioContext = audioContext;

        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();

        this.effect = this.audioContext.createBiquadFilter();
        this.effect.type = "highpass";
        this.effect.frequency.value = 0;
        this.effect.Q.value = 0.7;

        this.effect.frequency.setValueAtTime(800, startSeconds);
        this.effect.frequency.setValueAtTime(0, endSeconds);

        this.input.connect(this.effect);
        this.effect.connect(this.output);
    }
}

export default HighPassEffect;

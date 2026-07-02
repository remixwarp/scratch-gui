class TestEffect {
    constructor (audioContext) {
        this.audioContext = audioContext;

        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();

        this.gain = this.audioContext.createGain();
    }
}

export default TestEffect;
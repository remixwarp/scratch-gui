class DistortionEffect {
    constructor(audioContext) {
        this.audioContext = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Drive amount
        this.drive = audioContext.createGain();
        this.drive.gain.value = 3;

        // Distortion
        this.distortion = audioContext.createWaveShaper();
        this.distortion.curve = this.createCurve(60);
        this.distortion.oversample = "4x";

        // Tone shaping
        this.lowpass = audioContext.createBiquadFilter();
        this.lowpass.type = "lowpass";
        this.lowpass.frequency.value = 7000;

        // Output level
        this.makeupGain = audioContext.createGain();
        this.makeupGain.gain.value = 0.8;

        // Wiring
        this.input.connect(this.drive);
        this.drive.connect(this.distortion);
        this.distortion.connect(this.lowpass);
        this.lowpass.connect(this.makeupGain);
        this.makeupGain.connect(this.output);
    }

    createCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] =
                ((3 + amount) * x * 20 * deg) /
                (Math.PI + amount * Math.abs(x));
        }

        return curve;
    }
}

export default DistortionEffect;
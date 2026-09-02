const audioContext = new window.AudioContext();
const masterGainNode = audioContext.createGain();
masterGainNode.connect(audioContext.destination);

const GAIN = 0.15;
masterGainNode.gain.value = GAIN;

export const mute = () => {
	masterGainNode.gain.value = 0;
};

export const unmute = () => {
	masterGainNode.gain.value = GAIN;
};

export function playWonTune() {
	// quick ascending run of sparkly bell notes, like a wand being waved, then a bright sustained finish
	const sparkle = [1046.5, 1174.66, 1318.51, 1567.98, 1760];
	return sparkle
		.reduce((p, freq) => p.then(() => playBell(freq, 80)), Promise.resolve())
		.then(() => playBell(2093, 500));
}

export function playLooseTune() {
	// mirrors playWonTune but slow and descending, for a somber fading chime
	const descend = [784, 659.25, 523.25];
	return descend
		.reduce((p, freq) => p.then(() => playBell(freq, 220)), Promise.resolve())
		.then(() => playBell(392, 700));
}

export function playBeep(freq = 400) {
	return playBell(freq, 80);
}

// layers a few inharmonic overtones with a decaying envelope to mimic a bell/chime
function playBell(freq: number, duration = 400) {
	const now = audioContext.currentTime;
	const partials = [1, 2.4, 3.8, 5.4];
	// boosted since the decay envelope makes it sound quieter than a sustained square tone
	const gains = [1.8, 0.9, 0.45, 0.22];
	const end = now + duration / 1000;

	partials.forEach((mult, i) => {
		const osc = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		osc.type = "sine";
		osc.frequency.value = freq * mult;
		gainNode.gain.setValueAtTime(gains[i], now);
		gainNode.gain.exponentialRampToValueAtTime(0.0001, end);
		osc.connect(gainNode);
		gainNode.connect(masterGainNode);
		osc.start(now);
		osc.stop(end);
	});

	return new Promise<void>((res) => setTimeout(res, duration));
}

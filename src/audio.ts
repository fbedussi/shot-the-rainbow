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

export function playTone(freq: number, duration = 500) {
	const osc = audioContext.createOscillator();
	osc.connect(masterGainNode);
	osc.type = "square";
	osc.frequency.value = freq;
	osc.start();

	return new Promise<void>((res) => {
		setTimeout(() => {
			osc.stop();
			res();
		}, duration);
	});
}

export function playWonTune() {
	return playTone(440, 50)
		.then(() => playTone(0, 25))
		.then(() => playTone(440, 50))
		.then(() => playTone(0, 25))
		.then(() => playTone(400, 50))
		.then(() => playTone(0, 25))
		.then(() => playTone(700, 150));
}

export function playLooseTune() {
	return playTone(300, 200)
		.then(() => playTone(0, 50))
		.then(() => playTone(300, 200))
		.then(() => playTone(250, 100))
		.then(() => playTone(100, 125));
}

export function playBeep(freq = 400) {
	return playTone(freq, 50);
}

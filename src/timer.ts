import { playBeep } from "./audio";
import qs from "./qs";

const timerEl = document.querySelector(".timer")!;

let timerId: number;
let ms = 1000 * 60;

export function startTimer() {
	timerId = setInterval(updateTimer, 1000);
}

function updateTimer() {
	if (ms <= 0) {
		stopTimer();
		document.body.dispatchEvent(new CustomEvent("timer-expired"));

		return;
	}

	ms -= 1000;

	const m = Math.trunc(ms / 60000);
	const s = Math.trunc((ms / 1000) % 60000);
	timerEl.textContent = `${m}:${s < 10 ? 0 : ""}${s}`;

	const muted = qs.getItem("muted") === "true";
	if (!muted) {
		playBeep();
	}
}

export function stopTimer() {
	window.clearInterval(timerId);
}

export function getRemainingTime() {
	return ms;
}

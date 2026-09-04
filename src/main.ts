import { playLooseTune, playWonTune } from "./audio";
import { ColorBar } from "./color-bar";
import "./style.css";
import state from "./state";
import { getRemainingTime, startTimer, stopTimer } from "./timer";
import { UserVideo } from "./user-video";

customElements.define("user-video", UserVideo);
customElements.define("color-bar", ColorBar);

const targetCols: number[][] = [];
let currentColorBarIndex = 0;
const numberOfBars = 10;
let points = 0;
let wins = 0;
const winDialog = document.querySelector<HTMLDialogElement>("#win")!;
const loosDialog = document.querySelector<HTMLDialogElement>("#loose")!;
const instructionsDialog =
	document.querySelector<HTMLDialogElement>("#instructions")!;
const colorBar = document.querySelector("color-bar")!;

const path = document.querySelector(".path")!;
let muted = state.getMuted();
const muteBtn = document.querySelector(".mute")!;

function createColor() {
	const targetCol = [
		getTargetHue(targetCols.length, numberOfBars),
		getTargetVal(25, 75),
		getTargetVal(25, 75),
	];
	targetCols.push(targetCol);
}

// Deterministically slots hues so min separation is guaranteed without retrying.
function getTargetHue(index: number, count: number) {
	const slotSize = 360 / count;
	const minDist = Math.max(0, Math.floor(slotSize) - count);
	const jitter = Math.random() * (slotSize - minDist);
	return Math.round(index * slotSize + jitter);
}

function getTargetVal(min: number, max: number) {
	return Math.round(min + Math.random() * (max - min));
}

function setPoints(p: number) {
	points = p;
	document.querySelector("header .points span")!.textContent =
		points.toString();
	winDialog.querySelector(".points")!.textContent = points.toString();
}

// main
instructionsDialog.showModal();
instructionsDialog.querySelector("button")?.addEventListener("click", () => {
	if (!muted) {
		document.querySelector("user-video")!.setAttribute("muted", "false");
	}
	startTimer();
});

const difficultyRadios = Array.from(
	document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]'),
);
difficultyRadios.forEach((difficultyRadio) => {
	if (difficultyRadio.checked) {
		if (!state.isDifficulty(difficultyRadio.value)) {
			throw new Error("wrong difficulty value");
		}
		state.setDifficulty(difficultyRadio.value);
	}
	difficultyRadio.addEventListener("change", onDifficultyChange);
});
function onDifficultyChange(ev: Event) {
	const target = ev.target as HTMLInputElement;
	if (!state.isDifficulty(target.value)) {
		throw new Error("wrong difficulty value");
	}
	state.setDifficulty(target.value);
}

muteBtn.textContent = muted ? "unmute" : "mute";
muteBtn.addEventListener("click", () => {
	muted = !muted;
	state.setMuted(muted);
	muteBtn.textContent = muted ? "unmute" : "mute";
});

document.body.addEventListener("click", (ev) => {
	if (ev.target instanceof HTMLElement && ev.target.className === "restart") {
		window.location.search = "";
	}
});

for (let i = 0; i < numberOfBars; i++) {
	createColor();
}

targetCols.forEach((color, i) => {
	const swatch = document.createElement("div");
	swatch.className = ["swatch", i === 0 ? "active" : undefined].join(" ");
	swatch.style.backgroundColor = `hsl(${color[0]}deg ${color[1]}% ${color[2]}%)`;
	path.appendChild(swatch);
});
const pathEnd = document.createElement("div");
pathEnd.className = "path-end";
path.appendChild(pathEnd);

const swatches = Array.from(
	document.querySelectorAll(".swatch"),
) as HTMLDivElement[];

colorBar.setAttribute("target-col", targetCols[currentColorBarIndex].join(","));

document.body.addEventListener("timer-expired", () => {
	if (!muted) {
		playLooseTune();
	}
	loosDialog.showModal();
});

document.body.addEventListener("shot-taken", (ev) => {
	const event = ev as CustomEvent;

	if (event.detail.win) {
		if (!muted) {
			playWonTune();
		}

		wins++;

		setPoints(points + event.detail.points);

		if (wins < numberOfBars) {
			const { avgCol } = event.detail;
			const targetCol = targetCols[currentColorBarIndex];
			const gradient = `linear-gradient(to top, hsl(${targetCol[0]}deg ${targetCol[1]}% ${targetCol[2]}%) 50%, hsl(${avgCol[0]}deg ${avgCol[1]}% ${avgCol[2]}%) 50%)`;
			swatches[currentColorBarIndex].style.background = gradient;

			currentColorBarIndex++;
			const setActiveSwatch = () => {
				swatches.forEach((swatch, i) => {
					swatch.classList.toggle("active", i === currentColorBarIndex);
				});
			};
			document.startViewTransition
				? document.startViewTransition(setActiveSwatch)
				: setActiveSwatch();
			colorBar.setAttribute(
				"target-col",
				targetCols[currentColorBarIndex].join(","),
			);
		} else {
			colorBar.setAttribute("active", "false");
			stopTimer();
			const remainingMs = getRemainingTime();
			setPoints(Math.round(points + (remainingMs / 1000) * 10));
			winDialog.showModal();
		}
	}
});

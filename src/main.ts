import { ColorBar } from "./color-bar";
import "./style.css";
import { UserVideo } from "./user-video";

customElements.define("user-video", UserVideo);
customElements.define("color-bar", ColorBar);

const colorsEl = document.querySelector(".colors")!;
const targetHues: number[] = [];
let currentColorBar: ColorBar | undefined;

function addColorBar() {
	currentColorBar?.setAttribute("active", "false");
	currentColorBar = document.createElement("color-bar") as ColorBar;
	currentColorBar.setAttribute("active", "true");
	const targetHue = getTargetHue();
	currentColorBar.setAttribute("target-hue", targetHue.toString());
	targetHues.push(targetHue);
	colorsEl.appendChild(currentColorBar);
}

function getTargetHue() {
	const MIN_DIST = 50;
	const getCandidate = () => Math.round(Math.random() * 360);
	let candidate = getCandidate();

	while (targetHues.some((oldHue) => Math.abs(oldHue - candidate) < MIN_DIST)) {
		candidate = getCandidate();
	}

	return candidate;
}

function main() {
	document.querySelector<HTMLDialogElement>("#instructions")?.showModal();
	const winDialog = document.querySelector<HTMLDialogElement>("#win");
	winDialog?.querySelector("button")?.addEventListener("click", () => {
		window.location.reload();
	});

	addColorBar();

	let wins = 0;
	const maxWins = 3;

	document.body.addEventListener("shot-taken", (ev) => {
		const event = ev as CustomEvent;
		console.log(event.detail.win ? "you win" : "you loose");
		if (event.detail.win) {
			wins++;

			if (wins < maxWins) {
				addColorBar();
			} else {
				currentColorBar?.setAttribute("active", "false");
				winDialog?.showModal();
			}
		}
	});
}

main();

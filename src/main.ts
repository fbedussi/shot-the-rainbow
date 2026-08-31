import { ColorBar } from "./color-bar";
import "./style.css";
import { UserVideo } from "./user-video";

customElements.define("user-video", UserVideo);
customElements.define("color-bar", ColorBar);

const colorsEl = document.querySelector(".colors")!;
const targetCols: number[][] = [];
let currentColorBar: ColorBar | undefined;

function addColorBar() {
	currentColorBar?.setAttribute("active", "false");
	currentColorBar = document.createElement("color-bar") as ColorBar;
	currentColorBar.setAttribute("active", "true");
	const targetCol = [
		getTargetVal(0, 360, 50, 0),
		getTargetVal(25, 75, 15, 1),
		getTargetVal(25, 75, 15, 2),
	];
	currentColorBar.setAttribute("target-col", targetCol.join(","));
	targetCols.push(targetCol);
	colorsEl.appendChild(currentColorBar);
}

function getTargetVal(min: number, max: number, minDist: number, i: number) {
	const getCandidate = () => Math.min(max, Math.max(min, Math.round(Math.random() * max)));
	let candidate = getCandidate();

	while (
		targetCols.some((oldCol) => Math.abs(oldCol[i] - candidate) < minDist)
	) {
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

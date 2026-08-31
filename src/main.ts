import { ColorBar } from "./color-bar";
import "./style.css";
import { UserVideo } from "./user-video";

customElements.define("user-video", UserVideo);
customElements.define("color-bar", ColorBar);

const colorsEl = document.querySelector(".colors")!;
const targetCols: number[][] = [];
let currentColorBarIndex = 0

function addColorBar(active: boolean) {
	const colorBar = document.createElement("color-bar") as ColorBar;
	colorBar.setAttribute("active", active.toString());
	const targetCol = [
		getTargetVal(0, 360, 25, 0),
		getTargetVal(25, 75, 0, 1),
		getTargetVal(25, 75, 0, 2),
	];
	colorBar.setAttribute("target-col", targetCol.join(","));
	targetCols.push(targetCol);
	colorsEl.appendChild(colorBar);
}

function getTargetVal(min: number, max: number, minDist: number, i: number) {
	const getCandidate = () =>
		Math.min(max, Math.max(min, Math.round(Math.random() * max)));
	let candidate = getCandidate();

	while (
		targetCols.some((oldCol) => Math.abs(oldCol[i] - candidate) < minDist)
	) {
		candidate = getCandidate();
	}

	return candidate;
}

function main() {
	const qs = new URLSearchParams(window.location.search)
	const level = Number(qs.get('level') ?? '1')

	if (level === 1) {
		document.querySelector<HTMLDialogElement>("#instructions")!.showModal();
		localStorage.removeItem('points')
	} else {
		document.querySelector('header .points span')!.textContent = localStorage.getItem('points')
	}

	const winDialog = document.querySelector<HTMLDialogElement>("#win")!;
	winDialog?.querySelector("button")?.addEventListener("click", () => {
		qs.set('level', (level + 1).toString())
		window.location.search = qs.toString()
	});

	const numberOfBars = level * 2 + 1
	for (let i = 0; i < numberOfBars; i++) {
		addColorBar(i === 0);
	}
	const colorBars = Array.from(document.querySelectorAll('color-bar'))

	let wins = 0;

	document.body.addEventListener("shot-taken", (ev) => {
		const event = ev as CustomEvent;
		console.log(event.detail.win ? "you win" : "you loose");
		if (event.detail.win) {
			wins++;

			const points = Number(localStorage.getItem('points') ?? '0') + event.detail.points
			localStorage.setItem('points', points)
			document.querySelector('header .points span')!.textContent = points

			colorBars[currentColorBarIndex].setAttribute("active", "false");

			if (wins < numberOfBars) {
				currentColorBarIndex++
				colorBars[currentColorBarIndex].setAttribute("active", "true");
			} else {
				winDialog.querySelector('#level')!.textContent = (level + 1).toString()
				winDialog.showModal();
			}
		}
	});
}

main();

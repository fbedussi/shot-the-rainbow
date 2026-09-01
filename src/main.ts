import { ColorBar } from "./color-bar";
import "./style.css";
import { UserVideo } from "./user-video";

customElements.define("user-video", UserVideo);
customElements.define("color-bar", ColorBar);

const targetCols: number[][] = [];
let currentColorBarIndex = 0;
let numberOfBars = 3;
let points = 0;
let level = 1;
let wins = 0;
const winDialog = document.querySelector<HTMLDialogElement>("#win")!;
const instructionsDialog =
	document.querySelector<HTMLDialogElement>("#instructions")!;
const colorBar = document.querySelector("color-bar")!;

const path = document.querySelector(".path")!;
const qs = new URLSearchParams(window.location.search);

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
}

function setLevel(l: number) {
	level = l;
	numberOfBars = level * 2 + 1;
	winDialog.querySelector("#level")!.textContent = (level + 1).toString();
	document.querySelector("header .level span")!.textContent = level.toString();
}

// main
setLevel(Number(qs.get("level") ?? "1"));
setPoints(Number(qs.get("points") ?? "0"));

if (level === 1) {
	instructionsDialog.showModal();
}

winDialog?.querySelector("button")?.addEventListener("click", () => {
	qs.set("level", (level + 1).toString());
	qs.set("points", points.toString());
	window.location.search = qs.toString();
});

document.querySelector(".restart")?.addEventListener("click", () => {
	window.location.search = "";
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
const swatches = Array.from(
	document.querySelectorAll(".swatch"),
) as HTMLDivElement[];

colorBar.setAttribute("target-col", targetCols[currentColorBarIndex].join(","));

document.body.addEventListener("shot-taken", (ev) => {
	const event = ev as CustomEvent;

	if (event.detail.win) {
		wins++;

		setPoints(points + event.detail.points);

		if (wins < numberOfBars) {
			const { avgCol } = event.detail;
			const targetCol = targetCols[currentColorBarIndex];
			const gradient = `linear-gradient(to right top, hsl(${targetCol[0]}deg ${targetCol[1]}% ${targetCol[2]}%) 50%, hsl(${avgCol[0]}deg ${avgCol[1]}% ${avgCol[2]}%) 50%)`;
			swatches[currentColorBarIndex].style.background = gradient;

			currentColorBarIndex++;
			swatches.forEach((swatch, i) => {
				swatch.classList.toggle("active", i === currentColorBarIndex);
			});
			colorBar.setAttribute(
				"target-col",
				targetCols[currentColorBarIndex].join(","),
			);
		} else {
			colorBar.setAttribute("active", "false");
			winDialog.showModal();
		}
	}
});

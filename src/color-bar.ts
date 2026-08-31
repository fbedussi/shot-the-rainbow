import type { UserVideo } from "./user-video";

export class ColorBar extends HTMLElement {
	userVideo: UserVideo;
	target: HTMLElement;
	active: boolean;
	targetCol: [number, number, number];

	static observedAttributes = ["active"];

	constructor() {
		super();

		this.active = false;
		this.target = document.createElement("div");
		this.target.className = "target";
		this.target.innerHTML = `<div>🦄</div>`;
		this.userVideo = document.createElement("user-video") as UserVideo;
		this.targetCol = [0, 0, 0];
	}

	connectedCallback() {
		const attr = this.getAttribute("target-Col")?.split(",").map(Number);
		this.targetCol =
			attr && attr.length === 3 ? [attr[0], attr[1], attr[2]] : this.targetCol;
		this.target.style.backgroundColor = `hsl(${this.targetCol[0]}deg ${this.targetCol[1]}% ${this.targetCol[2]}%)`;
		this.userVideo.setAttribute("target-col", this.targetCol.join(","));
		this.appendChild(this.target);
		this.appendChild(this.userVideo);
		this.active = this.getAttribute("active") === "true";

		if (this.active) {
			this.enableShot();
		}
	}

	disconnectedCallback() {
		this.disableShot();
	}

	attributeChangedCallback(_name: string, _oldValue: string, newValue: string) {
		this.active = newValue === "true";

		if (this.active) {
			this.enableShot();
		} else {
			this.disableShot();
		}
	}

	enableShot() {
		this.userVideo.setAttribute("active", "true");
	}

	disableShot() {
		this.userVideo.setAttribute("active", "false");
	}
}

import type { UserVideo } from "./user-video";

export class ColorBar extends HTMLElement {
	userVideo: UserVideo;
	target: HTMLElement;
	active: boolean;
	targetCol: [number, number, number];

	static observedAttributes = ["active", "target-col"];

	constructor() {
		super();

		this.active = false;
		this.target = document.createElement("div");
		this.target.className = "target";
		this.userVideo = document.createElement("user-video") as UserVideo;
		this.targetCol = [0, 0, 0];
	}

	connectedCallback() {
		this.setTaragetColFromAttr();
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

	attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
		if (name === "active") {
			this.active = newValue === "true";

			if (this.active) {
				this.enableShot();
			} else {
				this.disableShot();
			}
		}

		if (name === "target-col") {
			this.setTaragetColFromAttr();
		}
	}

	private setTaragetColFromAttr() {
		const attr = this.getAttribute("target-Col")?.split(",").map(Number);
		this.targetCol =
			attr && attr.length === 3 ? [attr[0], attr[1], attr[2]] : this.targetCol;
		this.target.style.backgroundColor = `hsl(${this.targetCol[0]}deg ${this.targetCol[1]}% ${this.targetCol[2]}%)`;
		this.userVideo.setAttribute("target-col", this.targetCol.join(","));
	}

	private enableShot() {
		this.userVideo.setAttribute("active", "true");
	}

	private disableShot() {
		this.userVideo.setAttribute("active", "false");
	}
}

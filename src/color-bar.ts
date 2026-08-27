import type { UserVideo } from "./user-video";

export class ColorBar extends HTMLElement {
	userVideo: UserVideo;
	target: HTMLElement;
	active: boolean;
	targetHue?: string;

	static observedAttributes = ["active"];

	constructor() {
		super();

		this.active = false;
		this.target = document.createElement("div");
		this.userVideo = document.createElement("user-video") as UserVideo;
	}

	connectedCallback() {
		this.targetHue = this.getAttribute("target-hue")!;
		this.target.style.backgroundColor = `hsl(${this.targetHue} 100% 50%)`;
		this.userVideo.setAttribute("target-hue", this.targetHue);
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

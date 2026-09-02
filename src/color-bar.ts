import type { UserVideo } from "./user-video";

export class ColorBar extends HTMLElement {
	userVideo: UserVideo;
	target: HTMLDivElement;
	active: boolean;
	targetCol: [number, number, number];

	static observedAttributes = ["active", "target-col"];

	constructor() {
		super();

		this.active = false;
		this.target = this.querySelector<HTMLDivElement>(".target")!;
		this.userVideo = this.querySelector<UserVideo>("user-video")!;
		this.targetCol = [0, 0, 0];
	}

	connectedCallback() {
		this.setTaragetColFromAttr();
		this.active = this.getAttribute("active") === "true";

		if (this.active) {
			this.enableShot();
		}
	}

	disconnectedCallback() {
		this.disableShot();
	}

	attributeChangedCallback(
		name: (typeof ColorBar.observedAttributes)[number],
		_oldValue: string,
		newValue: string,
	) {
		switch (name) {
			case "active": {
				this.active = newValue === "true";

				if (this.active) {
					this.enableShot();
				} else {
					this.disableShot();
				}
				break;
			}

			case "target-col":
				{
					this.setTaragetColFromAttr();
				}
				break;
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

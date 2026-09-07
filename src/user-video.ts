import { averageHsl } from "./color-utils";
import state from "./state";

export class UserVideo extends HTMLElement {
	private video: HTMLVideoElement;
	private targetCol: [number, number, number];
	private sampleRadius = 16;
	private active: boolean;
	private avgCol: [number, number, number];
	private canvas: HTMLCanvasElement;
	private ctx?: CanvasRenderingContext2D;

	static observedAttributes = ["active", "target-col"] as const;

	constructor() {
		super();

		this.video = document.createElement("video");
		this.active = false;
		this.avgCol = [0, 0, 0];
		this.targetCol = [0, 0, 0];
		this.canvas = document.createElement("canvas");
	}

	connectedCallback() {
		this.active = this.getAttribute("active") === "true";
		const attr = this.getAttribute("target-col")?.split(",").map(Number);
		this.targetCol =
			attr && attr.length === 3 ? [attr[0], attr[1], attr[2]] : this.targetCol;

		if (this.active) {
			this.initVideo();
		}
	}

	attributeChangedCallback(
		name: (typeof UserVideo.observedAttributes)[number],
		_oldValue: string,
		newValue: string,
	) {
		switch (name) {
			case "active": {
				this.active = newValue === "true";

				if (!this.active) {
					this.removeEventListener("click", this.takeImage);
					this.freezeVideo();
				} else {
					this.initVideo();
				}
				break;
			}
			case "target-col": {
				const attr = newValue?.split(",").map(Number);
				this.targetCol =
					attr && attr.length === 3
						? [attr[0], attr[1], attr[2]]
						: this.targetCol;
				break;
			}
		}
	}

	private getToleranceHue() {
		switch (state.getDifficulty()) {
			case "easy":
				return 38;
			case "medium":
				return 28;
			case "high":
				return 18;
		}
	}

	private getToleranceSaturation() {
		switch (state.getDifficulty()) {
			case "easy":
				return 38;
			case "medium":
				return 28;
			case "high":
				return 18;
		}
	}

	private getToleranceLightness() {
		switch (state.getDifficulty()) {
			case "easy":
				return 38;
			case "medium":
				return 28;
			case "high":
				return 18;
		}
	}

	private initVideo() {
		this.startWebcam()
			.then(() => {
				if (!this.active) {
					this.stopStream();
					return;
				}
				this.appendChild(this.video);

				this.addEventListener("click", this.takeImage);
			})
			.catch(() => {
				this.stopStream();
				alert("Could not access webcam");
			});
	}

	private async startWebcam() {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: "environment",
			},
		});
		this.video.srcObject = stream;
		this.video.autoplay = true;
		this.video.playsInline = true;

		// videoWidth/videoHeight are only available once metadata has loaded
		await new Promise<void>((resolve, reject) => {
			if (this.video.readyState >= 1) {
				resolve();
			} else {
				const timeoutId = window.setTimeout(() => {
					this.video.removeEventListener("loadedmetadata", onMetadata);
					reject(new Error("Camera metadata did not load"));
				}, 5000);
				const onMetadata = () => {
					window.clearTimeout(timeoutId);
					resolve();
				};
				this.video.addEventListener("loadedmetadata", onMetadata, {
					once: true,
				});
			}
		});

		this.canvas.width = this.video.videoWidth;
		this.canvas.height = this.video.videoHeight;
		this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
	}

	private stopStream() {
		(this.video.srcObject as MediaStream | null)
			?.getTracks()
			.forEach((track) => {
				track.stop();
			});
		this.video.srcObject = null;
	}

	private freezeVideo() {
		this.stopStream();
		this.video.remove();
		this.style.backgroundColor = `hsl(${this.avgCol[0]}deg ${this.avgCol[1]}% ${this.avgCol[2]}%)`;
	}

	// maps a click/tap position to the underlying video frame, accounting for object-fit: cover scaling
	private getVideoPoint(clientX: number, clientY: number) {
		const rect = this.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const scale = Math.max(
			rect.width / this.video.videoWidth,
			rect.height / this.video.videoHeight,
		);
		const offsetX = (this.video.videoWidth * scale - rect.width) / 2;
		const offsetY = (this.video.videoHeight * scale - rect.height) / 2;

		return {
			x: (x + offsetX) / scale,
			y: (y + offsetY) / scale,
		};
	}

	private getAverageColAt(x: number, y: number): [number, number, number] {
		if (!this.ctx) {
			throw new Error("ctx not initialized");
		}

		this.ctx.drawImage(this.video, 0, 0);

		const left = Math.max(0, Math.round(x - this.sampleRadius));
		const top = Math.max(0, Math.round(y - this.sampleRadius));
		const width = Math.min(this.canvas.width - left, this.sampleRadius * 2);
		const height = Math.min(this.canvas.height - top, this.sampleRadius * 2);

		const { data } = this.ctx.getImageData(left, top, width, height);

		return averageHsl(data);
	}

	private checkColor() {
		if (window.location.search.includes("debug")) {
			return {
				win: true,
				points: 100,
			};
		}

		const hueDiff = Math.abs(this.avgCol[0] - this.targetCol[0]);
		const circularHueDiff = Math.min(hueDiff, 360 - hueDiff);
		const saturationDiff = Math.abs(this.avgCol[1] - this.targetCol[1]);
		const lightnessDiff = Math.abs(this.avgCol[2] - this.targetCol[2]);

		const toleranceHue = this.getToleranceHue();
		const toleranceSaturation = this.getToleranceSaturation();
		const toleranceLightness = this.getToleranceLightness();

		const win =
			circularHueDiff <= toleranceHue &&
			saturationDiff <= toleranceSaturation &&
			lightnessDiff <= toleranceLightness;
		const points =
			toleranceHue +
			toleranceSaturation +
			toleranceLightness -
			(circularHueDiff + saturationDiff + lightnessDiff);

		return {
			win,
			points,
		};
	}

	// shows a temporary square over the area of the video that was sampled
	private showSampleMarker(
		rect: DOMRect,
		clientX: number,
		clientY: number,
		scale: number,
	) {
		const size = this.sampleRadius * 2 * scale;
		const marker = document.createElement("div");
		marker.className = "sample-marker";
		marker.style.width = `${size}px`;
		marker.style.height = `${size}px`;
		marker.style.left = `${clientX - rect.left - size / 2}px`;
		marker.style.top = `${clientY - rect.top - size / 2}px`;
		this.appendChild(marker);
		setTimeout(() => marker.remove(), 500);
	}

	private takeImage = (event: MouseEvent) => {
		const rect = this.getBoundingClientRect();
		const scale = Math.max(
			rect.width / this.video.videoWidth,
			rect.height / this.video.videoHeight,
		);

		const { x, y } = this.getVideoPoint(event.clientX, event.clientY);
		this.showSampleMarker(rect, event.clientX, event.clientY, scale);

		this.avgCol = this.getAverageColAt(x, y);

		const avgColEl = document.createElement("div");
		avgColEl.style.backgroundColor = `hsl(${this.avgCol[0]}deg ${this.avgCol[1]}% ${this.avgCol[2]}%)`;
		avgColEl.className = "avg-col";
		this.appendChild(avgColEl);
		setTimeout(() => avgColEl.remove(), 500);

		const { win, points } = this.checkColor();

		document.body.dispatchEvent(
			new CustomEvent("shot-taken", {
				detail: {
					win,
					points,
					avgCol: this.avgCol,
				},
			}),
		);
	};
}

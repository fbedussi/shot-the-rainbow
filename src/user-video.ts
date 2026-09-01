import { playBeep } from "./audio";

export class UserVideo extends HTMLElement {
	private video: HTMLVideoElement;
	private targetCol: [number, number, number];
	private sampleRadius = 16;
	private toleranceHue = 28;
	private toleranceSaturation = 28;
	private toleranceLightness = 28;
	private active: boolean;
	private avgCol: [number, number, number];
	private canvas: HTMLCanvasElement;
	private ctx?: CanvasRenderingContext2D;
	private playBeep: boolean;
	private nextBeep?: boolean;

	static observedAttributes = ["active", "muted", "target-col"];

	constructor() {
		super();

		this.video = document.createElement("video");
		this.active = false;
		this.avgCol = [0, 0, 0];
		this.targetCol = [0, 0, 0];
		this.canvas = document.createElement("canvas");
		this.playBeep = false;
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

	attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
		if (name === "active") {
			this.active = newValue === "true";

			if (!this.active) {
				this.removeEventListener("click", this.takeImage);
				this.freezeVideo();
			} else {
				this.initVideo();
			}
		}

		if (name === "muted") {
			this.playBeep = newValue === "false";
		}

		if (name === "target-col") {
			const attr = newValue?.split(",").map(Number);
			this.targetCol =
				attr && attr.length === 3
					? [attr[0], attr[1], attr[2]]
					: this.targetCol;
		}
	}

	private initVideo() {
		this.appendChild(this.video);

		this.startWebcam()
			.catch((err) => {
				console.error("Could not access webcam", err);
				alert("Could not access webcam");
			})
			.then(() => {
				this.playBeep = this.getAttribute("muted") === "false";
				setTimeout(() => {}, 3000);
				this.initBeep();
			});

		this.addEventListener("click", this.takeImage);
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
		await new Promise<void>((resolve) => {
			if (this.video.readyState >= 1) {
				resolve();
			} else {
				this.video.addEventListener("loadedmetadata", () => resolve(), {
					once: true,
				});
			}
		});

		this.canvas.width = this.video.videoWidth;
		this.canvas.height = this.video.videoHeight;
		this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
	}

	private initBeep() {
		const avgCol = this.getAverageCol();

		const hueDiff = Math.abs(avgCol[0] - this.targetCol[0]);
		const circularHueDiff = Math.min(hueDiff, 360 - hueDiff);
		const hueRatio = circularHueDiff / 360;
		const saturationRatio = Math.abs(avgCol[1] - this.targetCol[1]) / 100;
		const lightnessRatio = Math.abs(avgCol[2] - this.targetCol[2]) / 100;

		// 0 = perfect match, 1 = as far as possible
		const diffRatio = (hueRatio + saturationRatio + lightnessRatio) / 3;

		const minInterval = 100;
		const maxInterval = 2000;
		// closer match -> shorter interval -> faster beeping, like a geiger counter
		const interval = minInterval + diffRatio * (maxInterval - minInterval);

		const minPitch = 400;
		const maxPitch = 1200;
		// closer match -> higher pitch
		const pitch = maxPitch - diffRatio * (maxPitch - minPitch);

		if (!this.nextBeep) {
			this.nextBeep = true;
			setTimeout(() => {
				if (this.playBeep) {
					playBeep(pitch);
				}
				this.nextBeep = false;
				this.initBeep();
			}, interval);
		}
	}

	private freezeVideo() {
		this.playBeep = false;
		this.video.remove();
		this.style.backgroundColor = `hsl(${this.avgCol[0]}deg ${this.avgCol[1]}% ${this.avgCol[2]}%)`;
	}

	private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const delta = max - min;
		const lightness = (max + min) / 2;

		if (delta === 0) return [0, 0, lightness * 100];

		let hue: number;
		if (max === r) hue = ((g - b) / delta) % 6;
		else if (max === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;

		hue *= 60;
		if (hue < 0) hue += 360;

		const saturation = delta / (1 - Math.abs(2 * lightness - 1));
		return [hue, saturation * 100, lightness * 100];
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

	// hue is circular (0-360deg), so it must be averaged as an angle (via its
	// sin/cos components) rather than summed directly, otherwise samples near
	// the 0/360 wrap-around (e.g. red) can average out to the opposite hue
	private averageHsl(data: Uint8ClampedArray): [number, number, number] {
		let sumSin = 0;
		let sumCos = 0;
		let totalSaturation = 0;
		let totalLightness = 0;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			const [hue, saturation, lightness] = this.rgbToHsl(
				data[i],
				data[i + 1],
				data[i + 2],
			);
			const hueRad = (hue * Math.PI) / 180;
			sumSin += Math.sin(hueRad);
			sumCos += Math.cos(hueRad);
			totalSaturation += saturation;
			totalLightness += lightness;
			count++;
		}

		let avgHue = (Math.atan2(sumSin / count, sumCos / count) * 180) / Math.PI;
		if (avgHue < 0) avgHue += 360;

		return [
			Math.round(avgHue),
			Math.round(totalSaturation / count),
			Math.round(totalLightness / count),
		];
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

		return this.averageHsl(data);
	}

	private getAverageCol(): [number, number, number] {
		if (!this.ctx) {
			throw new Error("ctx not initialized");
		}

		this.ctx.drawImage(this.video, 0, 0);

		const { data } = this.ctx.getImageData(
			0,
			0,
			this.canvas.width,
			this.canvas.height,
		);

		return this.averageHsl(data);
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

		const win =
			circularHueDiff <= this.toleranceHue &&
			saturationDiff <= this.toleranceSaturation &&
			lightnessDiff <= this.toleranceLightness;
		const points =
			this.toleranceHue +
			this.toleranceSaturation +
			this.toleranceLightness -
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

export class UserVideo extends HTMLElement {
	video: HTMLVideoElement;
	targetCol: [number, number, number];
	sampleRadius = 15;
	toleranceHue = 20;
	toleranceSaturation = 20;
	toleranceLightness = 20;
	active: boolean;
	avgCol: [number, number, number];

	static observedAttributes = ["active"];

	constructor() {
		super();

		this.video = document.createElement("video");
		this.active = false;
		this.avgCol = [0, 0, 0];
		this.targetCol = [0, 0, 0];
	}

	connectedCallback() {
		this.active = this.getAttribute("active") === "true";
		const attr = this.getAttribute("target-col")?.split(",").map(Number);
		this.targetCol =
			attr && attr.length === 3 ? [attr[0], attr[1], attr[2]] : this.targetCol;
		console.log('targetCol', this.targetCol)
		this.appendChild(this.video);

		this.startWebcam().catch((err) => {
			console.error("Could not access webcam", err);
			alert("Could not access webcam");
		});

		this.addEventListener("click", this.takeImage);
	}

	attributeChangedCallback(_name: string, _oldValue: string, newValue: string) {
		this.active = newValue === "true";

		if (!this.active) {
			this.removeEventListener("click", this.takeImage);
			this.freezeVideo();
		}
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
	}

	private freezeVideo() {
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

	private getAverageColAt(x: number, y: number): [number, number, number] {
		const canvas = document.createElement("canvas");
		canvas.width = this.video.videoWidth;
		canvas.height = this.video.videoHeight;
		const ctx = canvas.getContext("2d")!;
		ctx.drawImage(this.video, 0, 0);

		const left = Math.max(0, Math.round(x - this.sampleRadius));
		const top = Math.max(0, Math.round(y - this.sampleRadius));
		const width = Math.min(canvas.width - left, this.sampleRadius * 2);
		const height = Math.min(canvas.height - top, this.sampleRadius * 2);

		const { data } = ctx.getImageData(left, top, width, height);

		let totalHue = 0;
		let totalSaturation = 0;
		let totalLightness = 0;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			const [hue, saturation, lightness] = this.rgbToHsl(
				data[i],
				data[i + 1],
				data[i + 2],
			);
			totalHue += hue;
			totalSaturation += saturation;
			totalLightness += lightness;
			count++;
		}

		return [Math.round(totalHue / count), Math.round(totalSaturation / count), Math.round(totalLightness / count)];
	}

	private checkColor(x: number, y: number) {
		const hueDiff = Math.abs(this.avgCol[0] - this.targetCol[0]);
		const circularHueDiff = Math.min(hueDiff, 360 - hueDiff);
		const saturationDiff = Math.abs(this.avgCol[1] - this.targetCol[1]);
		const lightnessDiff = Math.abs(this.avgCol[2] - this.targetCol[2]);

		return (
			circularHueDiff <= this.toleranceHue &&
			saturationDiff <= this.toleranceSaturation &&
			lightnessDiff <= this.toleranceLightness
		);
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

		const avgColEl = document.createElement('div')
		avgColEl.style.backgroundColor = `hsl(${this.avgCol[0]}deg ${this.avgCol[1]}% ${this.avgCol[2]}%)`
		avgColEl.className = 'avg-col'
		this.appendChild(avgColEl)
		console.log('avgCol', this.avgCol, avgColEl)
		setTimeout(() => avgColEl.remove(), 500);

		const win = this.checkColor(x, y);

		document.body.dispatchEvent(
			new CustomEvent("shot-taken", {
				detail: {
					win,
				},
			}),
		);
	};
}

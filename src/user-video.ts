export class UserVideo extends HTMLElement {
	video: HTMLVideoElement;
	targetHue?: number;
	sampleRadius = 25;
	active: boolean;
	avgHue: number;

	static observedAttributes = ["active"];

	constructor() {
		super();

		this.video = document.createElement("video");
		this.active = false;
		this.avgHue = 0;
	}

	connectedCallback() {
		this.active = this.getAttribute("active") === "true";
		this.targetHue = Number(this.getAttribute("target-hue"));
		this.appendChild(this.video);

		this.startWebcam().catch((err) =>
			console.error("Could not access webcam", err),
		);

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
		const stream = await navigator.mediaDevices.getUserMedia({ video: true });
		this.video.srcObject = stream;
		this.video.autoplay = true;
		this.video.playsInline = true;
	}

	private freezeVideo() {
		this.video.remove();
		this.style.backgroundColor = `hsl(${this.avgHue} 100% 50%)`;
	}

	private rgbToHue(r: number, g: number, b: number) {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const delta = max - min;
		if (delta === 0) return 0;

		let hue: number;
		if (max === r) hue = ((g - b) / delta) % 6;
		else if (max === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;

		hue *= 60;
		return hue < 0 ? hue + 360 : hue;
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

	private getAverageHueAt(x: number, y: number) {
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

		let total = 0;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			total += this.rgbToHue(data[i], data[i + 1], data[i + 2]);
			count++;
		}

		return total / count;
	}

	private checkColor(targetHue: number, x: number, y: number) {
		this.avgHue = this.getAverageHueAt(x, y);
		const diff = Math.abs(this.avgHue - targetHue);
		const circularDiff = Math.min(diff, 360 - diff);
		const tolerance = targetHue * 0.2;

		return circularDiff <= tolerance;
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
		if (!this.targetHue) {
			throw new Error("targetHue not set");
		}

		const rect = this.getBoundingClientRect();
		const scale = Math.max(
			rect.width / this.video.videoWidth,
			rect.height / this.video.videoHeight,
		);

		const { x, y } = this.getVideoPoint(event.clientX, event.clientY);
		this.showSampleMarker(rect, event.clientX, event.clientY, scale);

		const win = this.checkColor(this.targetHue, x, y);
		document.body.dispatchEvent(
			new CustomEvent("shot-taken", {
				detail: {
					win,
				},
			}),
		);
	};
}

export type HslColor = [number, number, number];

export function rgbToHsl(r: number, g: number, b: number): HslColor {
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

// hue is circular (0-360deg), so it must be averaged as an angle (via its
// sin/cos components) rather than summed directly, otherwise samples near
// the 0/360 wrap-around (e.g. red) can average out to the opposite hue
export function averageHsl(data: Uint8ClampedArray): HslColor {
	let sumSin = 0;
	let sumCos = 0;
	let totalSaturation = 0;
	let totalLightness = 0;
	let count = 0;

	for (let i = 0; i < data.length; i += 4) {
		const [hue, saturation, lightness] = rgbToHsl(
			data[i],
			data[i + 1],
			data[i + 2],
		);
		const hueRad = (hue * Math.PI) / 180;
		sumSin += Math.sin(hueRad) * saturation;
		sumCos += Math.cos(hueRad) * saturation;
		totalSaturation += saturation;
		totalLightness += lightness;
		count++;
	}

	let avgHue = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
	if (avgHue < 0) avgHue += 360;

	return [
		Math.round(avgHue),
		Math.round(totalSaturation / count),
		Math.round(totalLightness / count),
	];
}

import { describe, expect, it } from "vitest";
import { averageHsl, rgbToHsl } from "./color-utils";

describe("rgbToHsl", () => {
	it("converts primary colors", () => {
		expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50]);
		expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50]);
		expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50]);
	});

	it("represents grayscale colors without hue or saturation", () => {
		expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 50.19607843137255]);
	});
});

describe("averageHsl", () => {
	it("averages hues across the 0/360 boundary", () => {
		const data = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 43, 255]);

		expect(averageHsl(data)[0]).toBe(355);
	});

	it("does not let grayscale pixels pull hue toward red", () => {
		const data = new Uint8ClampedArray([0, 0, 255, 255, 128, 128, 128, 255]);

		expect(averageHsl(data)).toEqual([240, 50, 50]);
	});

	it("weights hue toward the more saturated pixel", () => {
		const data = new Uint8ClampedArray([0, 0, 255, 255, 128, 128, 255, 255]);

		expect(averageHsl(data)[0]).toBe(240);
	});
});

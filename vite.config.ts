import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
	// relative base so the build works both on GitHub Pages (served from a subfolder)
	// and when the zipped dist is unzipped and opened from any other location
	base: command === "build" ? "./" : "/",
}));

import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
	base: command === "build" ? "/shot-the-rainbow/" : "/",
}));

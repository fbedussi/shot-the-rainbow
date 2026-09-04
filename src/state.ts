function getItem(name: string) {
	const qs = new URLSearchParams(window.location.search);
	return qs.get(name);
}

function replaceItem(name: string, value: string) {
	const qs = new URLSearchParams(window.location.search);
	qs.set(name, value);
	const url = `${window.location.pathname}?${qs}${window.location.hash}`;
	window.history.replaceState(null, "", url);
}

const MUTED = "muted";

function getMuted(): boolean {
	return getItem(MUTED) === "true";
}

function setMuted(muted: boolean) {
	replaceItem(MUTED, muted.toString());
}

const DIFFICULTY = "difficulty";
type Difficulty = "easy" | "medium" | "high";

function isDifficulty(candidate: string): candidate is Difficulty {
	return ["easy", "medium", "high"].includes(candidate);
}

function getDifficulty(): Difficulty {
	return getItem(DIFFICULTY) as Difficulty;
}

function setDifficulty(difficulty: Difficulty) {
	replaceItem(DIFFICULTY, difficulty.toString());
}

export default {
	getMuted,
	setMuted,
	getDifficulty,
	setDifficulty,
	isDifficulty,
};

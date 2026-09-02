export function getItem(name: string) {
	const qs = new URLSearchParams(window.location.search);
	return qs.get(name);
}

export function replaceItem(name: string, value: string) {
	const qs = new URLSearchParams(window.location.search);
	qs.set(name, value);
	const url = `${window.location.pathname}?${qs}${window.location.hash}`;
	window.history.replaceState(null, "", url);
}

export default {
	getItem,
	replaceItem,
};

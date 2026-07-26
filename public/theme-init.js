(() => {
	try {
		const storageKey = "titeet-theme";
		const storedTheme = window.localStorage.getItem(storageKey);
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const darkMode = storedTheme ? storedTheme === "dark" : prefersDark;

		document.documentElement.classList.toggle("dark", darkMode);
	} catch {
		// Ignore storage access issues in private/locked environments.
	}
})();

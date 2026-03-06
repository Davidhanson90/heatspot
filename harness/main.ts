import "../dist/index.js";

const toolbarMode = document.querySelector<HTMLSelectElement>("#toolbar-mode");
const demoHeatmap = document.querySelector<HTMLElement>("#demo-heatmap");

if (toolbarMode && demoHeatmap) {
	const syncToolbarMode = () => {
		const nextMode = toolbarMode.value === "hidden" ? "hidden" : "simple";
		demoHeatmap.setAttribute("toolbar", nextMode);
	};

	toolbarMode.addEventListener("change", syncToolbarMode);
	syncToolbarMode();
}

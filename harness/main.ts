import "../dist/index.js";

const toolbarMode = document.querySelector<HTMLSelectElement>("#toolbar-mode");
const downloadData = document.querySelector<HTMLButtonElement>("#download-data");
const downloadImage = document.querySelector<HTMLButtonElement>("#download-image");

type HarnessHeatSpotElement = HTMLElement & {
	getHeatmapData: () => unknown;
	getHeatmapImage: (options?: { type?: string; quality?: number }) => string | null;
};

const demoHeatmap = document.querySelector<HarnessHeatSpotElement>("#demo-heatmap");

function downloadFile(fileName: string, href: string): void {
	const link = document.createElement("a");
	link.href = href;
	link.download = fileName;
	link.click();
}

if (toolbarMode && demoHeatmap) {
	const syncToolbarMode = () => {
		const nextMode = toolbarMode.value === "hidden" ? "hidden" : "simple";
		demoHeatmap.setAttribute("toolbar", nextMode);
	};

	toolbarMode.addEventListener("change", syncToolbarMode);
	syncToolbarMode();

	downloadData?.addEventListener("click", () => {
		const data = demoHeatmap.getHeatmapData();
		const json = JSON.stringify(data, null, 2);
		const href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
		downloadFile("heatmap-data.json", href);
	});

	downloadImage?.addEventListener("click", () => {
		const image = demoHeatmap.getHeatmapImage();
		if (!image) {
			window.alert("Heatmap image is not available yet. Interact with the panel first.");
			return;
		}

		downloadFile("heatmap.png", image);
	});
}

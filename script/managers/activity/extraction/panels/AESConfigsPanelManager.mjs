import VisualComponent from "../../../../entities/model/visual/VisualComponent.mjs";
import { ActivitySimulationManager } from "../../simulation/ActivitySimulationManager.mjs";

export class AESConfigsPanelManager {
    /** @type {ActivitySimulationManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;


    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;
    }

    /** @param {{ name, source: VisualComponent, sink: VisualComponent, mode}} configs */
    displayConfigs(configs) {
        // Setup properties
        const nameView = this.#rootElement.querySelector(`input[name="name"]`);
        const sourceRootView = this.#rootElement.querySelector(`[data-aes-detail="source"]`);
        const sourceTextView = sourceRootView.querySelector("span");
        const sourceVertexDisplay = sourceRootView.querySelector(".vertex-display");
        const sinkRootView = this.#rootElement.querySelector(`[data-aes-detail="sink"]`);
        const sinkTextView = sinkRootView.querySelector("span");
        const sinkVertexDisplay = sinkRootView.querySelector(".vertex-display");
        const modeView = this.#rootElement.querySelector(`[data-aes-detail="mode"]`);

        nameView.value = configs.name || "";
        sourceTextView.innerHTML = configs.source.identifier;
        sinkTextView.innerHTML = configs.sink.identifier;
        modeView.innerHTML = {
            pseudorandom: "Pseudo-random selection",
            user: "User-based selection"
        }[configs.mode] || "-";

        sourceVertexDisplay.setAttribute("data-vertex-type", configs.source.type);
        sinkVertexDisplay.setAttribute("data-vertex-type", configs.sink.type);        
    }
}
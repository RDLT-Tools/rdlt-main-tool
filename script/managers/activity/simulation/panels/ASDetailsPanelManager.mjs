import Activity from "../../../../entities/activity/Activity.mjs";
import VisualComponent from "../../../../entities/model/visual/VisualComponent.mjs";
import { ActivitySimulationManager } from "../ActivitySimulationManager.mjs";

export class ASDetailsPanelManager {
    /** @type {ActivitySimulationManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;


    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;
    }

    /** @param {Activity} activity */
    displayActivityDetails(activity) {
        // Setup conclusion chip
        const conclusionChip = this.#rootElement.querySelector(".status-chip");
        const conclusion = activity.conclusion;
        if(conclusion && conclusion.title) {
            const { pass, title, description } = conclusion;
            if(pass) conclusionChip.classList.add("passed");

            const conclusionTitleView = conclusionChip.querySelector(".status-title");
            const conclusionDescView = conclusionChip.querySelector(".status-description");

            conclusionTitleView.innerHTML = title;

            if(description) conclusionDescView.innerHTML = description || "";
            else conclusionDescView.classList.add("hidden");
        } else {
            conclusionChip.classList.add("hidden");
        }

        // Setup properties
        const nameView = this.#rootElement.querySelector(`[data-as-detail="name"]`);
        const sourceRootView = this.#rootElement.querySelector(`[data-as-detail="source"]`);
        const sourceTextView = sourceRootView.querySelector("span");
        const sourceVertexDisplay = sourceRootView.querySelector(".vertex-display");
        const sinkRootView = this.#rootElement.querySelector(`[data-as-detail="sink"]`);
        const sinkTextView = sinkRootView.querySelector("span");
        const sinkVertexDisplay = sinkRootView.querySelector(".vertex-display");
        const originView = this.#rootElement.querySelector(`[data-as-detail="origin"]`);

        const source = this.#simulationManager.getVertex(activity.source);
        const sink = this.#simulationManager.getVertex(activity.sink);

        nameView.innerHTML = activity.name;
        sourceTextView.innerHTML = source?.identifier || "";
        sinkTextView.innerHTML = sink?.identifier || "";
        originView.innerHTML = {
            ae: "Generated", aes: "Simulated", direct: "Direct Input", import: "From File"
        }[activity.origin] || "-";

        sourceVertexDisplay.setAttribute("data-vertex-type", source?.type);
        sinkVertexDisplay.setAttribute("data-vertex-type", sink?.type);     
    }
}
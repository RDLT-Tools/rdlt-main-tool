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
        const conclusionChip = this.#rootElement.querySelector(".conclusion-chip");
        const conclusion = activity.conclusion;
        if(conclusion && conclusion.title) {
            const { pass, title, description } = conclusion;
            if(pass) conclusionChip.classList.add("passed");

            const conclusionTitleView = conclusionChip.querySelector(".conclusion-title");
            const conclusionDescView = conclusionChip.querySelector(".conclusion-description");

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
        const sinkRootView = this.#rootElement.querySelector(`[data-as-detail="sink"]`);
        const sinkTextView = sinkRootView.querySelector("span");
        const originView = this.#rootElement.querySelector(`[data-as-detail="origin"]`);

        const source = this.#simulationManager.getComponent(activity.source);
        const sink = this.#simulationManager.getComponent(activity.sink);

        nameView.innerHTML = activity.name;
        sourceTextView.innerHTML = source.identifier;
        sinkTextView.innerHTML = sink.identifier;
        originView.innerHTML = {
            ae: "Generated", aes: "Simulated", direct: "Direct Input", import: "From File"
        }[activity.origin] || "-";

        sourceRootView.setAttribute("data-vertex-type", source.type);
        sinkRootView.setAttribute("data-vertex-type", sink.type);     
    }
}
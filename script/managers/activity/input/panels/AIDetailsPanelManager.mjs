import Activity from "../../../../entities/activity/Activity.mjs";
import VisualComponent from "../../../../entities/model/visual/VisualComponent.mjs";
import { Form } from "../../../../utils.mjs";
import { ActivityInputManager } from "../ActivityInputManager.mjs";

export class AIDetailsPanelManager {
    /** @type {ActivityInputManager} */
    #simulationManager;

    /** @type {HTMLDivElement} */
    #rootElement;

    /** @type {Form} */
    #form;


    constructor(simulationManager, rootElement) {
        this.#simulationManager = simulationManager;
        this.#rootElement = rootElement;
    }

    /**
     * 
     * @param {VisualComponent[]} potentialSources 
     * @param {VisualComponent[]} potentialSinks 
     */
    setup(potentialSources, potentialSinks) {
        this.#form = new Form(this.#rootElement)
            .setFieldNames([ "name", "source", "sink" ]);

        // Setup sources & sinks selector
        this.#form.getFieldElement("source").innerHTML = 
            potentialSources.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");
        this.#form.getFieldElement("sink").innerHTML = 
            potentialSinks.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");
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

        const source = this.#simulationManager.getComponent(activity.source);
        const sink = this.#simulationManager.getComponent(activity.sink);

        nameView.innerHTML = activity.name;
        sourceTextView.innerHTML = source.identifier;
        sinkTextView.innerHTML = sink.identifier;
        originView.innerHTML = {
            ae: "Generated", aes: "Simulated", direct: "Direct Input", import: "From File"
        }[activity.origin] || "-";

        sourceVertexDisplay.setAttribute("data-vertex-type", source.type);
        sinkVertexDisplay.setAttribute("data-vertex-type", sink.type);     
    }

    getFormValues() {
        return this.#form.getValues();
    }
}
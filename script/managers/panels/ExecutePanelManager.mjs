import { Form } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export default class ExecutePanelManager {
    /** @type { ModelContext } */
    context;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *  activityExtraction: {
     *      root: HTMLDivElement,
     *      generateButton: HTMLButtonElement,
     *      simulateButton: HTMLButtonElement,
     *  }
     * }}
     */
    #views = {
        activityExtraction: {}
    };

    /**
     * @type {{
     *  activityExtraction: Form
     * }}
     */
    #forms = {
        activityExtraction: null
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context, rootElement) {
        this.context = context;
        this.#rootElement = rootElement;

        this.#initializeView();
        this.#initializeForms();
    }

    #initializeView() {
        this.#initializeAESection();
    }

    #initializeAESection() {
        const aeSectionRoot = this.#rootElement.querySelector("[data-section-id='ae']");
        const aeSectionViews = this.#views.activityExtraction;

        aeSectionViews.root = aeSectionRoot;
        aeSectionViews.generateButton = aeSectionRoot.querySelector("button[data-subaction='generate']");
        aeSectionViews.simulateButton = aeSectionRoot.querySelector("button[data-subaction='simulate']");

        aeSectionViews.generateButton.addEventListener("click", () => {
            console.log("About to start activity extraction");
        });

        aeSectionViews.simulateButton.addEventListener("click", () => {
            const { name, source, sink, mode } = this.#forms.activityExtraction.getValues();
            if(!source || !sink || !mode) return;
            
            const aesManager = this.context.managers.workspace.startAESimulation({
                name, source: Number(source), sink: Number(sink), mode
            });

            aesManager.start();
        });
    }

    #initializeForms() {
        this.#forms.activityExtraction = new Form(this.#views.activityExtraction.root)
            .setFieldNames([ 'name', 'source', 'sink', 'mode' ]);
    }

    refreshModelValues() {

        // Refresh AE configs
        const potentialSourceVertices = this.context.managers.visualModel.getPotentialSourceVertices();
        const potentialSinkVertices = this.context.managers.visualModel.getPotentialSinkVertices();

        this.#forms.activityExtraction.getFieldElement("source").innerHTML = 
            potentialSourceVertices.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");

        this.#forms.activityExtraction.getFieldElement("sink").innerHTML = 
            potentialSinkVertices.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");

    }
}
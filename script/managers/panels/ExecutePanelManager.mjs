import Activity from "../../entities/activity/Activity.mjs";
import { buildElement, Form } from "../../utils.mjs";
import { ActivitiesManager } from "../activity/ActivitiesManager.mjs";
import ModelContext from "../model/ModelContext.mjs";

export default class ExecutePanelManager {
    /** @type { ModelContext } */
    context;

    /** @type {HTMLDivElement} */
    #rootElement;

    /**
     * @type {{
     *  activities: {
     *      root: HTMLDivElement,
     *      table: HTMLTableElement,
     *      importButton: HTMLButtonElement
     *  },
     *  activityExtraction: {
     *      root: HTMLDivElement,
     *      generateButton: HTMLButtonElement,
     *      simulateButton: HTMLButtonElement,
     *  },
     *  vertexSimplification: {
     *      root: HTMLDivElement,
    *       generateLevel1Button: HTMLButtonElement,
    *       generateLevel2Button: HTMLButtonElement,
     *  }
     * }}
     */
    #views = {
        activities: {},
        activityExtraction: {},
        vertexSimplification: {}
    };

    /**
     * @type {{
     *  activityExtraction: Form,
     *  vertexSimplification: Form
     * }}
     */
    #forms = {
        activityExtraction: null,
        vertexSimplification: null
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
        this.#initializeActivitiesSection();
        this.#initializeAESection();
        this.#initializeVSSection();
    }

    #initializeActivitiesSection() {
        const activitiesSectionRoot = this.#rootElement.querySelector("[data-section-id='activities']");
        const activitiesSectionViews = this.#views.activities;

        activitiesSectionViews.root = activitiesSectionRoot;
        activitiesSectionViews.table = activitiesSectionRoot.querySelector("table");
        activitiesSectionViews.importButton = activitiesSectionRoot.querySelector("button[data-subaction='import']");

        activitiesSectionViews.importButton.addEventListener("click", () => this.context.managers.activities.importActivity());
    }

    #initializeAESection() {
        const aeSectionRoot = this.#rootElement.querySelector("[data-section-id='ae']");
        const aeSectionViews = this.#views.activityExtraction;

        aeSectionViews.root = aeSectionRoot;
        aeSectionViews.generateButton = aeSectionRoot.querySelector("button[data-subaction='generate']");
        aeSectionViews.simulateButton = aeSectionRoot.querySelector("button[data-subaction='simulate']");

        aeSectionViews.generateButton.addEventListener("click", () => {
            const { name, source, sink } = this.#forms.activityExtraction.getValues();
            if(!name.trim() || !source || !sink) return;

            this.context.managers.activities.generateActivity({ 
                name, 
                source: Number(source), 
                sink: Number(sink) 
            });
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

    #initializeVSSection() {
        const vsSectionRoot = this.#rootElement.querySelector("[data-section-id='vs']");
        const vsSectionViews = this.#views.vertexSimplification;

        vsSectionViews.root = vsSectionRoot;
        vsSectionViews.generateLevel1Button = vsSectionRoot.querySelector("button[data-subaction='vs-generate-1']");
        vsSectionViews.generateLevel2Button = vsSectionRoot.querySelector("button[data-subaction='vs-generate-2']");

        vsSectionViews.generateLevel1Button.addEventListener("click", () => {
            this.context.managers.workspace.startVertexSimplification(1);
        });

        vsSectionViews.generateLevel2Button.addEventListener("click", () => {
            const { rbs } = this.#forms.vertexSimplification.getValues();
            if(!rbs) return;

            this.context.managers.workspace.startVertexSimplification(2, Number(rbs));
        });
    }

    #initializeForms() {
        this.#forms.activityExtraction = new Form(this.#views.activityExtraction.root)
            .setFieldNames([ 'name', 'source', 'sink', 'mode' ]);

        this.#forms.vertexSimplification = new Form(this.#views.vertexSimplification.root)
            .setFieldNames([ 'rbs' ]);
    }

    /** @param {Activity[]} activities */
    refreshActivitiesList(activities) {
        const activitiesManager = this.context.managers.activities;
        
        const tableBody = this.#views.activities.table.querySelector("tbody");
        tableBody.innerHTML = "";

        for(const activity of activities) {
            const viewButton = buildElement("button", { classname: "icon" }, [ buildElement("i", { classname: "fas fa-eye" }) ]);
            const simulateButton = buildElement("button", { classname: "icon" }, [ buildElement("i", { classname: "fas fa-play" }) ]);
            const downloadButton = buildElement("button", { classname: "icon" }, [ buildElement("i", { classname: "fas fa-arrow-down" }) ]);
            const deleteButton = buildElement("button", { classname: "icon" }, [ buildElement("i", { classname: "fas fa-close" }) ]);
            
            simulateButton.addEventListener("click", () => activitiesManager.simulateActivity(activity.id));
            downloadButton.addEventListener("click", () => this.context.managers.export.exportActivityToTextFile(activity));
            deleteButton.addEventListener("click", () => activitiesManager.deleteActivity(activity.id));

            const passed = activity.conclusion?.pass || false;

            const actRow = buildElement("tr", { "data-passed": passed }, [
                buildElement("td", {}, [
                    buildElement("div", { classname: "activity-name" }, [ activity.name ]),
                    buildElement("div", { classname: "activity-origin" }, [
                        buildElement("span", { classname: "data-passed-message" }, [ passed ? "Passed" : "Failed" ]),
                        " • ",
                        { aes: "Simulated", direct: "Direct Input", ae: "Generated", import: "From File" }[activity.origin] || ""
                    ]),
                ]),
                buildElement("td", {}, [ simulateButton, downloadButton, deleteButton ])
            ]);

            tableBody.appendChild(actRow);
        }
    }

    refreshModelValues() {

        // Refresh AE configs
        const potentialSourceVertices = this.context.managers.visualModel.getPotentialSourceVertices();
        const potentialSinkVertices = this.context.managers.visualModel.getPotentialSinkVertices();

        this.#forms.activityExtraction.getFieldElement("source").innerHTML = 
            potentialSourceVertices.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");

        this.#forms.activityExtraction.getFieldElement("sink").innerHTML = 
            potentialSinkVertices.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");


        // Refresh RBS centers list
        const rbsCenters = this.context.managers.visualModel.getAllComponents().filter(c => c.isRBSCenter);
        this.#forms.vertexSimplification.getFieldElement("rbs").innerHTML =
            rbsCenters.map(vertex => `<option value="${vertex.uid}">${vertex.identifier}</option>`).join("");
    }
}
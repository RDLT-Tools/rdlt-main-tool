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
     *      addActivityButton: HTMLButtonElement
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
     *  },
     *  convert: {
     *      root: HTMLDivElement,
     *      convertToPNButton: HTMLButtonElement
     *  }
     * }}
     */
    #views = {
        activities: {},
        activityExtraction: {},
        vertexSimplification: {},
        convert: {}
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
        this.#initializeConvertSection();
    }

    #initializeActivitiesSection() {
        const activitiesSectionRoot = this.#rootElement.querySelector("[data-section-id='activities']");
        const activitiesSectionViews = this.#views.activities;

        activitiesSectionViews.root = activitiesSectionRoot;
        activitiesSectionViews.table = activitiesSectionRoot.querySelector("table");
        activitiesSectionViews.addActivityButton = activitiesSectionRoot.querySelector("button[data-subaction='add-activity']");
        activitiesSectionViews.importButton = activitiesSectionRoot.querySelector("button[data-subaction='import']");

        activitiesSectionViews.addActivityButton.addEventListener("click", () => this.context.managers.workspace.createdInputtedActivity());
        activitiesSectionViews.importButton.addEventListener("click", () => this.context.managers.activities.importActivity());
    }

    #initializeAESection() {
        const aeSectionRoot = this.#rootElement.querySelector("[data-section-id='ae']");
        const aeSectionViews = this.#views.activityExtraction;

        aeSectionViews.root = aeSectionRoot;
        aeSectionViews.generateButton = aeSectionRoot.querySelector("button[data-subaction='generate']");
        aeSectionViews.simulateButton = aeSectionRoot.querySelector("button[data-subaction='simulate']");

        aeSectionViews.generateButton.addEventListener("click", async () => {
            const { name, source, sink, isTargeted, isMaximal } = this.#forms.activityExtraction.getValues();
            if(!source || !sink) return;

            let targetedArcs = new Set();
            const visualModel = this.context.managers.visualModel.makeCopy();
            
            if(isTargeted) {
                targetedArcs = await this.context.managers.workspace.startTargetedArcSelection(visualModel);
            }

            this.context.managers.activities.generateActivity({ 
                name: name?.trim() || "<Untitled Activity>", 
                source: Number(source), 
                sink: Number(sink),
                targetedArcs,
                isMaximal
            }, visualModel);
        });

        aeSectionViews.simulateButton.addEventListener("click", async () => {
            const { name, source, sink, mode, isTargeted } = this.#forms.activityExtraction.getValues();
            if(!source || !sink || !mode) return;

            let targetedArcs = new Set();
            const visualModel = this.context.managers.visualModel.makeCopy();
            
            if(isTargeted) {
                targetedArcs = await this.context.managers.workspace.startTargetedArcSelection(visualModel);
            }
            
            const aesManager = this.context.managers.workspace.startAESimulation({
                name, source: Number(source), sink: Number(sink), mode,
                targetedArcs
            }, visualModel);
        });
    }

    #initializeVSSection() {
        const vsSectionRoot = this.#rootElement.querySelector("[data-section-id='vs']");
        const vsSectionViews = this.#views.vertexSimplification;

        vsSectionViews.root = vsSectionRoot;
        vsSectionViews.generateLevel1Button = vsSectionRoot.querySelector("button[data-subaction='vs-generate-1']");
        vsSectionViews.generateLevel2Button = vsSectionRoot.querySelector("button[data-subaction='vs-generate-2']");

        vsSectionViews.generateLevel1Button.addEventListener("click", async () => {
            await this.context.managers.workspace.startVertexSimplification(1);
        });

        vsSectionViews.generateLevel2Button.addEventListener("click", async () => {
            const { rbs } = this.#forms.vertexSimplification.getValues();
            if(!rbs) return;

            await this.context.managers.workspace.startVertexSimplification(2, Number(rbs));
        });
    }

    #initializeConvertSection() {
        const convertSectionRoot = this.#rootElement.querySelector("[data-section-id='convert']");
        const convertSectionViews = this.#views.convert;

        convertSectionViews.root = convertSectionRoot;
        convertSectionViews.convertToPNButton = convertSectionRoot.querySelector("button[data-subaction='convert-to-pn']");

        convertSectionViews.convertToPNButton.addEventListener("click", () => {
            this.context.managers.workspace.startConvertToPetriNet();
        });
    }

    #initializeForms() {
        // Activity Extraction
        this.#forms.activityExtraction = new Form(this.#views.activityExtraction.root)
            .setFieldNames([ 'name', 'source', 'sink', 'mode', 'isTargeted', 'isMaximal' ]);
        this.#forms.activityExtraction.getFieldElement('mode').addEventListener("change", (event) => 
            this.#views.activityExtraction.root.setAttribute("data-value-mode", event.target.value));
        this.#forms.activityExtraction.getFieldElement('isMaximal').addEventListener("change", (event) => 
            this.#views.activityExtraction.root.setAttribute("data-value-ismaximal", event.target.checked));
 
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
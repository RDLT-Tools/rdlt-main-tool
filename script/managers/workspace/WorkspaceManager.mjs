import App from "../../App.mjs";
import Activity from "../../entities/activity/Activity.mjs";
import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { instantiateTemplate } from "../../utils.mjs";
import { AESimulationManager } from "../activity/extraction/AESimulationManager.mjs";
import { ActivityInputManager } from "../activity/input/ActivityInputManager.mjs";
import { ActivitySimulationManager } from "../activity/simulation/ActivitySimulationManager.mjs";
import { TargetedArcSelectManager } from "../activity/targeted/TargetedArcSelectManager.mjs";
import { RDLT2PNManager } from "../convert/RDLT2PNManager.mjs";
import ImportManager from "../file/import/ImportManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { POIManager } from "../poi/POIManager.mjs";
import { VerificationsResultManager } from "../verifications/VerificationsResultManager.mjs";
import { VertexSimplificationManager } from "../vsimp/VertexSimplificationManager.mjs";
import { TabGroupManager } from "../workspace/TabGroupManager.mjs";
import { TabManager } from "../workspace/TabManager.mjs";

export default class WorkspaceManager {
    /** @type { ModelContext } */
    context;

    /**
     * @typedef {Object} ModeButtons
     * @property {HTMLButtonElement} view 
     * @property {HTMLButtonElement} select 
     * 
     * @typedef {Object} ActionButtons
     * @property {HTMLButtonElement} undo
     * @property {HTMLButtonElement} select
     * @property {HTMLButtonElement} save
     * @property {HTMLButtonElement} add
     * @property {HTMLButtonElement} upload
     * @property {HTMLButtonElement} download
     * @property {HTMLButtonElement} settings
     * 
     * @typedef {{ modes: ModeButtons, actions: ActionButtons }} ViewButtons
     * 
     * @typedef {Object} ViewDrawing
     * @property {HTMLDivElement} container
     * @property {SVGElement} svg
     * 
     * @typedef {{ [panelID: string]: HTMLDivElement }} PanelsView
     */
     
    /**
     * @type {{ 
     *      root: HTMLDivElement,
     *      main: HTMLDivElement, 
     *      buttons: ViewButtons,
     *      panels: PanelsView, 
     *      drawing: ViewDrawing,
     *      header: { modelNameInput: HTMLInputElement }
     * }}
     */
    #view = {
        root: null,
        main: null,
        buttons: {
            modes: {},
            actions: {}
        },
        panels: {},
        drawing: {},
        header: { modelNameInput: null }
    };

    
    /**
     * @type {{
     *  subworkspaces: TabGroupManager,
    *   left: TabGroupManager,
    *   right: TabGroupManager
    * }}
    */
   tabs = { subworkspaces: null, left: null, right: null }


    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }
    
    async initialize() {
        await this.#initializeView();
        this.#setupSubworkspaceTabs();
        this.#setupMainModelTabs();
    }

    async #initializeView() {
        const rootElement = await instantiateTemplate("./templates/model-context.html");
        
        this.#view.root = rootElement;

        this.#view.main = rootElement.querySelector(".main-view");
        // Initialize mode buttons
        [...rootElement.querySelectorAll('button[data-mode]')].forEach(
            button => this.#view.buttons.modes[button.getAttribute("data-mode")] = button);
        
        // Initialize action buttons
        [...rootElement.querySelectorAll('button[data-action]')].forEach(
            button => {
                const action = button.getAttribute("data-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });
        
        // Initialize drawing area
        this.#view.drawing = {
            container: rootElement.querySelector('.drawing'),
            svg: rootElement.querySelector('.drawing > svg'),
        };

        // Initialize panels
        [...rootElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize model name input
        this.#view.header.modelNameInput = rootElement.querySelector("input.model-name-input");
        this.#view.header.modelNameInput.addEventListener("input", (event) => {
            const newName = event.target.value?.trim() || "Untitled Model";
            this.context.managers.modelling.renameModel(newName);
            App.setContextTabTitle(this.context, newName);
        });
        this.#view.header.modelNameInput.value = this.context.getModelName();
    }

    getRootElement() {
        return this.#view.root;
    }


    /**
     * @returns {SVGElement}
     */
    getDrawingSVG() {
        return this.#view.drawing.svg;
    }

    /**
     * @param {string} panelID 
     * @returns {HTMLDivElement} 
     */
    getPanelRootElement(panelID) {
        return this.#view.panels[panelID];
    }

    /**
     * 
     * @param {"undo" | "redo" | "save" | "add" | "upload" | "download" | "settings"} action 
     */
    #onActionClicked(action) {
        switch(action) {
            case "save":
                this.context.managers.export.exportToRDLTFile();
            break;
            case "add":
                App.addContext();
            break;
            case "upload":
                this.context.managers.import.importRDLTFile();
            break;
            case "download":
                this.context.managers.export.exportToPNGImage();
            break;
            case "remove-component":
                this.context.managers.modelling.removeSelectedComponents();
            break;
            case "remove-arc":
                this.context.managers.modelling.removedSelectedArcs();
            break;
        }
    }

    #setupSubworkspaceTabs() {
        const tabButtonsContainer = this.#view.root.querySelector(".tab-buttons");
        const tabAreaContainer = this.#view.root.querySelector("main");

        this.tabs.subworkspaces = new TabGroupManager(this, tabButtonsContainer, tabAreaContainer);
        
        this.tabs.subworkspaces.loadTab(TabManager.load(
            this, "main-model", "Main Model",
            this.#view.root.querySelector(".tab-button[data-tab-id='main-model']"),
            this.#view.root.querySelector(".tab-area[data-tab-id='main-model']"),
        ));

        this.tabs.subworkspaces.selectTab("main-model");
    }

    #setupMainModelTabs() {

        const leftPanelsTabButtonsContainer = this.#view.root.querySelector(".left-panels > .tab-buttons");
        const leftPanelsTabAreaContainer = this.#view.root.querySelector(".left-panels > .panel-tabs");

        const rightPanelsTabButtonsContainer = this.#view.root.querySelector(".right-panels > .tab-buttons");
        const rightPanelsTabAreaContainer = this.#view.root.querySelector(".right-panels > .panel-tabs");


        this.tabs.left = new TabGroupManager(this, leftPanelsTabButtonsContainer, leftPanelsTabAreaContainer);
        this.tabs.right = new TabGroupManager(this, rightPanelsTabButtonsContainer, rightPanelsTabAreaContainer);

        this.tabs.left.loadTab(TabManager.load(
            this, "palette", "Palette", 
            leftPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='palette']"),
            leftPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='palette']")
        ));

        this.tabs.left.loadTab(TabManager.load(
            this, "components", "Components", 
            leftPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='components']"),
            leftPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='components']")
        ));
        
        
        
        this.tabs.right.loadTab(TabManager.load(
            this, "properties", "Properties", 
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='properties']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='properties']")
        ));
        
        this.tabs.right.loadTab(TabManager.load(
            this, "execute", "Execute", 
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='execute']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='execute']")
        ));
        
        this.tabs.right.loadTab(TabManager.load(
            this, "verifications", "Verifications", 
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='verifications']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='verifications']")
        ));
        
        this.tabs.left.selectTab("palette");
        this.tabs.right.selectTab("execute");

    }

    setModellingEvent(event, isActive) {
        const attr = `data-evt-${event}`;
        if(isActive) {
            this.#view.main.setAttribute(attr, "true");
        } else {
            this.#view.main.removeAttribute(attr);
        }
    }

    /**
     * @param {string} id 
     * @param {string} title 
     * @param {string} templateID 
     * @returns {Promise<TabManager>}
     */
    async #addTemplatedSubworkspace(id, title, templateID) {
        const tabArea = await instantiateTemplate(`./templates/subworkspaces/${templateID}.html`);
        const tabManager = new TabManager(this.context, this.tabs.subworkspaces, id, title, true);
        tabManager.tabAreaElement = tabArea;

        this.tabs.subworkspaces.addTab(tabManager);
        this.tabs.subworkspaces.selectTab(id);

        return tabManager;
    }
    
    gotoMainModel() {
        this.tabs.subworkspaces.selectTab("main-model");
    }

    showPanel(panelID) {
        this.tabs.left.selectTab(panelID);
        this.tabs.right.selectTab(panelID);
    }

    async addAESSubworkspace(aesID) {
        return await this.#addTemplatedSubworkspace(`aes-${aesID}`, "Activity Extraction", "aes");
    }

    async addVerificationResultSubworkspace(verID, title) {
        return await this.#addTemplatedSubworkspace(`ver-${verID}`, title, "ver");
    }

    async addVSSubworkspace(vsID, title) {
        return await this.#addTemplatedSubworkspace(`vs-${vsID}`, title, "vs");
    }

    async addASSubworkspace(asID) {
        return await this.#addTemplatedSubworkspace(`as-${asID}`, "Activity Simulation", "as");
    }

    async addAISubworkspace(aiID) {
        return await this.#addTemplatedSubworkspace(`ai-${aiID}`, "Create Activity", "ai");
    }

    async addPOISubworkspace(poiID) {
        return await this.#addTemplatedSubworkspace(`poi-${poiID}`, "Points of Interest", "poi");
    }

    async addTASSubworkspace(tasID) {
        return await this.#addTemplatedSubworkspace(`tas-${tasID}`, "Select Targeted Arcs", "tas");
    }

    async addRDLT2PNSubworkspace(rdlt2pnID) {
        return await this.#addTemplatedSubworkspace(`rdlt2pn-${rdlt2pnID}`, "Convert to Petri Net", "rdlt2pn");
    }

    /** @param {{ name, source, sink, mode, targetedArcs }} configs */
    startAESimulation(configs, visualModel = null) {
        return new AESimulationManager(this.context, configs, 
            visualModel || this.context.managers.visualModel.makeCopy()
        );
    }

    /** @param {Activity} activity */
    startActivitySimulation(activity) {
        return new ActivitySimulationManager(this.context, activity, 
            this.context.managers.visualModel.makeCopy()
        );
    }

    showVerificationResults(result, visualModel) {
        return new VerificationsResultManager(this.context, result,
            visualModel
        );
    }

    /**
     * @param {1 | 2} level 
     * @returns {VertexSimplificationManager}
     */
    startVertexSimplification(level, rbsCenterUID = null) {
        return new VertexSimplificationManager(this.context, level, rbsCenterUID);
    }

    showPOIs(configs) {
        return new POIManager(this.context, configs, this.context.managers.visualModel.makeCopy());
    }

    createdInputtedActivity() {
        return new ActivityInputManager(this.context, this.context.managers.visualModel.makeCopy());
    }

    /**
     * @param {VisualRDLTModel} visualModel
     * @param {(arcs: Set<number>) => void} onArcsSelected
     * @returns {Promise<Set<number>>} 
     */
    startTargetedArcSelection(visualModel) {
        return new Promise(resolve => {
            new TargetedArcSelectManager(this.context, visualModel, (arcs) => resolve(arcs));
        });
    }

    startConvertToPetriNet() {
        return new RDLT2PNManager(this.context, this.context.managers.visualModel.makeCopy());
    }
}
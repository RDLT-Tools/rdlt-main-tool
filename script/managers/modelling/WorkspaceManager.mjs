import { AESimulationManager } from "../activity/AESimulationManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { VerificationsResultManager } from "../verifications/VerificationsResultManager.mjs";
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
     *      main: HTMLDivElement, 
     *      buttons: ViewButtons,
     *      panels: PanelsView, 
     *      drawing: ViewDrawing 
     * }}
     */
    #view = {
        main: null,
        buttons: {
            modes: {},
            actions: {}
        },
        panels: {},
        drawing: {}
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
        this.#initializeView();
        this.#setupSubworkspaceTabs();
        this.#setupMainModelTabs();
    }

    #initializeView() {
        this.#view.main = document.querySelector("body > main");
        // Initialize mode buttons
        [...document.querySelectorAll('button[data-mode]')].forEach(
            button => this.#view.buttons.modes[button.getAttribute("data-mode")] = button);
        
        // Initialize action buttons
        [...document.querySelectorAll('button[data-action]')].forEach(
            button => {
                const action = button.getAttribute("data-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });
        
        // Initialize drawing area
        this.#view.drawing = {
            container: document.querySelector('.drawing'),
            svg: document.querySelector('.drawing > svg'),
        };

        // Initialize panels
        [...document.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

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
        const tabButtonsContainer = document.querySelector("body > .tab-buttons");
        const tabAreaContainer = document.querySelector("body > main");

        this.tabs.subworkspaces = new TabGroupManager(this, tabButtonsContainer, tabAreaContainer);
        
        this.tabs.subworkspaces.loadTab(TabManager.load(
            this, "main-model", "Main Model",
            document.querySelector(".tab-button[data-tab-id='main-model']"),
            document.querySelector(".tab-area[data-tab-id='main-model']"),
        ));

        this.tabs.subworkspaces.selectTab("main-model");
    }

    #setupMainModelTabs() {

        const leftPanelsTabButtonsContainer = document.querySelector(".left-panels > .tab-buttons");
        const leftPanelsTabAreaContainer = document.querySelector(".left-panels > .panel-tabs");

        const rightPanelsTabButtonsContainer = document.querySelector(".right-panels > .tab-buttons");
        const rightPanelsTabAreaContainer = document.querySelector(".right-panels > .panel-tabs");


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
        this.tabs.right.selectTab("verifications");

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
     * @returns {TabManager}
     */
    #addTemplatedSubworkspace(id, title, templateID) {
        const templateTabArea = document.querySelector(`template[data-tab-template-id='${templateID}']`).content;
        const tabArea = templateTabArea.cloneNode(true).firstElementChild;
        const tabManager = new TabManager(this.context, this.tabs.subworkspaces, id, title, true);
        tabManager.tabAreaElement = tabArea;

        this.tabs.subworkspaces.addTab(tabManager);
        this.tabs.subworkspaces.selectTab(id);

        return tabManager;
    }

    addAESSubworkspace(aesID) {
        return this.#addTemplatedSubworkspace(`aes-${aesID}`, "Activity Extraction", "aes");
    }

    addVerificationResultSubworkspace(verID, title) {
        return this.#addTemplatedSubworkspace(`ver-${verID}`, title, "ver");
    }

    /** @param {{ name, source, sink, mode }} configs */
    startAESimulation(configs) {
        return new AESimulationManager(this.context, configs, 
            this.context.managers.visualModel.makeCopy()
        );
    }

    showVerificationResults(result, visualModel) {
        return new VerificationsResultManager(this.context, result,
            visualModel
        );
    }
}
import { AESStep } from "../../../entities/activity/AESStep.mjs";
import { Form } from "../../../utils.mjs";
import { TabGroupManager } from "../../workspace/TabGroupManager.mjs";
import { TabManager } from "../../workspace/TabManager.mjs";
import { AESimulationManager } from "./AESimulationManager.mjs";

export class AESSubworkspaceManager {
    
    /** @type {AESimulationManager} */
    #simulationManager;
    
    /** @type {HTMLDivElement} */
    #rootAreaElement;

    /**
     * @type {{
     *      main: HTMLDivElement,
     *      buttons: { actions: { [action: string]: HTMLButtonElement } },
     *      header: { modeLabel: HTMLElement, label: HTMLSpanElement, arcTag: HTMLDivElement, vertexTag: HTMLDivElement, main: HTMLDivElement },
     *      panels: { [panelID: string]: HTMLDivElement },
     *      forms: { configs: Form }
     * }}
     */
    #view = {
        header: {},
        buttons: { actions: {} },
        panels: {},
        forms: { configs: null }
    };

    /** 
     * @type {{
     *  left: TabGroupManager,
     *  right: TabGroupManager
     * }} 
     * */
    #tabs = { left: null, right: null };

    /** @type {} */
    constructor(simulationManager, rootAreaElement) {
        this.#simulationManager = simulationManager;
        this.#rootAreaElement = rootAreaElement;
        this.#initializeView();
        this.#initializeTabs();
        this.#initializeForms();
    }

    #initializeView() {
        this.#view.main = this.#rootAreaElement.querySelector(".aes-main");

        const headerElement = this.#rootAreaElement.querySelector(".aes-main > header");
        this.#view.header = {
            main: headerElement.querySelector(".aes-status-view"),
            modeLabel: headerElement.querySelector(".aes-mode-label"),
            label: headerElement.querySelector(".aes-status-view .aes-step-label"),
            arcTag: headerElement.querySelector(".aes-status-view .arc-tag"),
            vertexTag: headerElement.querySelector(".aes-status-view .vertex-tag"),
        };

        // Initialize panels
        [...this.#rootAreaElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize action buttons
        [...this.#rootAreaElement.querySelectorAll('button[data-aes-action]')].forEach(
            button => {
                const action = button.getAttribute("data-aes-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });
    }

    #onActionClicked(action) {
        switch(action) {
            case "pause": 
                this.#simulationManager.pause();
            break;
            case "prev": 
                this.#simulationManager.prev();
            break;
            case "next": 
                this.#simulationManager.next();
            break;
            case "random": 
                this.#simulationManager.chooseRandom();
            break;
            case "repeat": 
                this.#simulationManager.reselectArc();
            break;
            case "save":
                const name = this.#view.forms.configs.getFieldValue("name");
                this.#simulationManager.saveActivity(name);
            break;
        }
    }

    #initializeTabs() {
        const leftPanelsTabButtonsContainer = this.#rootAreaElement.querySelector(".left-panels > .tab-buttons");
        const leftPanelsTabAreaContainer = this.#rootAreaElement.querySelector(".left-panels > .panel-tabs");

        const rightPanelsTabButtonsContainer = this.#rootAreaElement.querySelector(".right-panels > .tab-buttons");
        const rightPanelsTabAreaContainer = this.#rootAreaElement.querySelector(".right-panels > .panel-tabs");


        this.#tabs.left = new TabGroupManager(this, leftPanelsTabButtonsContainer, leftPanelsTabAreaContainer);
        this.#tabs.right = new TabGroupManager(this, rightPanelsTabButtonsContainer, rightPanelsTabAreaContainer);

        this.#tabs.left.loadTab(TabManager.load(
            this, "configs", "Configurations",
            leftPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='configs']"),
            leftPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='configs']")
        ));

        this.#tabs.left.loadTab(TabManager.load(
            this, "steps", "Steps",
            leftPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='steps']"),
            leftPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='steps']")
        ));

        
        this.#tabs.right.loadTab(TabManager.load(
            this, "states", "States",
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='states']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='states']")
        ));
        
        this.#tabs.right.loadTab(TabManager.load(
            this, "profile", "Activity Profile",
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='profile']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='profile']")
        ));
        
        this.#tabs.left.selectTab("configs");
        this.#tabs.right.selectTab("states");
    }

    #initializeForms() {
        // Initialize configurations form
        this.#view.forms.configs = new Form(this.#view.panels["configs"])
            .setFieldNames(["name"]);
    }

    /** @param {{ mode }} configs */
    setup(configs) {
        this.#view.header.modeLabel.innerText = {
            user: "User-Based Selection",
            pseudorandom: "Pseudo-Random Selection",
        }[configs.mode] || "";
    }

    /** @param {AESStep} step */
    setCurrentStep(step) {
        this.#rootAreaElement.setAttribute("data-aes-current-action", step.action);
    
        const { label, arcTag, vertexTag, main } = this.#view.header;
        label.innerText = step.actionLabel;
        
        main.setAttribute("data-aes-step-action", step.action);
        if([ "start", "backtrack", "end-sink" ].includes(step.action)) {
            const currentVertexIdentifier = this.#simulationManager.getVertexIdentifier(step.currentVertex);
            arcTag.classList.add("hidden");
            vertexTag.classList.remove("hidden");
            vertexTag.innerText = currentVertexIdentifier;
        } else if([ "try-explore", "explore", "check", "traverse" ].includes(step.action)) {
            const [ fromVertexIdentifier, toVertexIdentifier ] = this.#simulationManager.getArcIdentifierPair(step.currentArc);
            vertexTag.classList.add("hidden");
            arcTag.classList.remove("hidden");
            arcTag.querySelector(".arc-tag-from").innerText = fromVertexIdentifier;
            arcTag.querySelector(".arc-tag-to").innerText = toVertexIdentifier;
        } else {
            vertexTag.classList.add("hidden");
            arcTag.classList.add("hidden");
        }
    }
}
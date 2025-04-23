import { TabGroupManager } from "../../workspace/TabGroupManager.mjs";
import { TabManager } from "../../workspace/TabManager.mjs";
import { ActivityInputManager } from "./ActivityInputManager.mjs";

export class AISubworkspaceManager {
    
    /** @type {ActivityInputManager} */
    #simulationManager;
    
    /** @type {HTMLDivElement} */
    #rootAreaElement;

    /**
     * @type {{
     *      main: HTMLDivElement,
     *      buttons: { actions: { [action: string]: HTMLButtonElement } },
     *      header: { main: HTMLDivElement },
     *      panels: { [panelID: string]: HTMLDivElement }
     * }}
     */
    #view = {
        header: {},
        buttons: { actions: {} },
        panels: {}
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
    }

    #initializeView() {
        this.#view.main = this.#rootAreaElement.querySelector(".ai-main");

        const headerElement = this.#rootAreaElement.querySelector(".ai-main > header");
        this.#view.header = {
            main: headerElement.querySelector(".ai-status-view"),
        };

        // Initialize panels
        [...this.#rootAreaElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize action buttons
        [...this.#rootAreaElement.querySelectorAll('button[data-ai-action]')].forEach(
            button => {
                const action = button.getAttribute("data-ai-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });
    }

    #onActionClicked(action) {
        switch(action) {
            case "prev": 
                this.#simulationManager.prev();
            break;
            case "next": 
                this.#simulationManager.next();
            break;
            case "add-timestep":
                this.#simulationManager.addTimestep();
            break;
            case "save":
                this.#simulationManager.saveActivity();
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
            this, "details", "Activity Details",
            leftPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='details']"),
            leftPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='details']")
        ));
        
        this.#tabs.right.loadTab(TabManager.load(
            this, "profile", "Activity Profile",
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='profile']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='profile']")
        ));
        
        this.#tabs.left.selectTab("details");
        this.#tabs.right.selectTab("profile");
    }
}
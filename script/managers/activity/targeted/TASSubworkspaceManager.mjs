import { TabGroupManager } from "../../workspace/TabGroupManager.mjs";
import { TabManager } from "../../workspace/TabManager.mjs";
import { TargetedArcSelectManager } from "./TargetedArcSelectManager.mjs";

export class TASSubworkspaceManager {
    
    /** @type {TargetedArcSelectManager} */
    #parentManager;
    
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
    constructor(parentManager, rootAreaElement) {
        this.#parentManager = parentManager;
        this.#rootAreaElement = rootAreaElement;
        this.#initializeView();
        this.#initializeTabs();
    }

    #initializeView() {
        this.#view.main = this.#rootAreaElement.querySelector(".tas-main");

        const headerElement = this.#rootAreaElement.querySelector(".tas-main > header");
        this.#view.header = {
            main: headerElement.querySelector(".tas-status-view"),
        };

        // Initialize panels
        [...this.#rootAreaElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize action buttons
        [...this.#rootAreaElement.querySelectorAll('button[data-tas-action]')].forEach(
            button => {
                const action = button.getAttribute("data-tas-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });
    }

    #onActionClicked(action) {
        switch(action) {
            case "continue":
                this.#parentManager.save();
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
        
        this.#tabs.right.loadTab(TabManager.load(
            this, "arcs", "Selected Arcs",
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='arcs']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='arcs']")
        ));
        
        this.#tabs.right.selectTab("arcs");
    }
}
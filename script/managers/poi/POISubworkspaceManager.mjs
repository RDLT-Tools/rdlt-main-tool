import { TabGroupManager } from "../workspace/TabGroupManager.mjs";
import { TabManager } from "../workspace/TabManager.mjs";
import { POIManager } from "./POIManager.mjs";

export class POISubworkspaceManager {
    
    /** @type {POIManager} */
    #poiManager;
    
    /** @type {HTMLDivElement} */
    #rootAreaElement;

    /**
     * @type {{
     *      main: HTMLDivElement,
     *      buttons: { actions: { [action: string]: HTMLButtonElement } },
     *      header: { title: HTMLSpanElement, selector: HTMLSelectElement },
     *      panels: { [panelID: string]: HTMLDivElement },
     * }}
     */
    #view = {
        header: {},
        buttons: { actions: {} },
        panels: {},
    };

    /** 
     * @type {{
     *  left: TabGroupManager,
     *  right: TabGroupManager
     * }}
     * */
    #tabs = { left: null, right: null };

    /** @type {} */
    constructor(poiManager, rootAreaElement) {
        this.#poiManager = poiManager;
        this.#rootAreaElement = rootAreaElement;
        this.#initializeView();
        this.#initializeTabs();
    }

    #initializeView() {
        this.#view.main = this.#rootAreaElement.querySelector(".poi-main");

        const headerElement = this.#rootAreaElement.querySelector(".poi-main > header");
        this.#view.header = {
            title: headerElement.querySelector(".poi-main > header h1"),
            selector: headerElement.querySelector(".poi-controls select"),
        };

        // Initialize panels
        [...this.#rootAreaElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize action buttons
        [...this.#rootAreaElement.querySelectorAll('button[data-poi-action]')].forEach(
            button => {
                const action = button.getAttribute("data-poi-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });

        // Initialize POI item selector
        this.#view.header.selector = this.#rootAreaElement.querySelector("select");
        this.#view.header.selector.addEventListener("change", (event) => {
            this.#poiManager.setActivePOI(event.target.value);
        });

    }

    #onActionClicked(action) {
        switch(action) {
        }
    }

    #initializeTabs() {
        const rightPanelsTabButtonsContainer = this.#rootAreaElement.querySelector(".right-panels > .tab-buttons");
        const rightPanelsTabAreaContainer = this.#rootAreaElement.querySelector(".right-panels > .panel-tabs");


        this.#tabs.right = new TabGroupManager(this, rightPanelsTabButtonsContainer, rightPanelsTabAreaContainer);
        
        this.#tabs.right.loadTab(TabManager.load(
            this, "poi", "POIs",
            rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='poi']"),
            rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='poi']")
        ));
        
        this.#tabs.right.selectTab("poi");
    }

    setActivePOI(id) {
        this.#rootAreaElement.setAttribute("data-active-poi", id);
    }
}
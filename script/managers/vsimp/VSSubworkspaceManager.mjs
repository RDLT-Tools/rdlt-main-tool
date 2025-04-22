import { VertexSimplificationManager } from "./VertexSimplificationManager.mjs";

export class VSSubworkspaceManager {
    
    /** @type {VertexSimplificationManager} */
    #vsManager;
    
    /** @type {HTMLDivElement} */
    #rootAreaElement;

    /**
     * @type {{
     *      main: HTMLDivElement,
     *      header: { levelLabel: HTMLDivElement },
     *      buttons: { actions: { [action: string]: HTMLButtonElement } },
     *      panels: { [panelID: string]: HTMLDivElement }
     * }}
     */
    #view = {
        header: { levelLabel: null },
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

    constructor(vsManager, rootAreaElement) {
        this.#vsManager = vsManager;
        this.#rootAreaElement = rootAreaElement;
        this.#initializeView();
        this.#initializeTabs();
    }

    #initializeView() {
        this.#view.main = this.#rootAreaElement.querySelector(".vs-main");

        // Initialize panels
        [...this.#rootAreaElement.querySelectorAll(".panel")].forEach(
            panel => {
                const panelID = panel.getAttribute("data-panel-id");
                this.#view.panels[panelID] = panel;
        });

        // Initialize action buttons
        [...this.#rootAreaElement.querySelectorAll('button[data-vs-action]')].forEach(
            button => {
                const action = button.getAttribute("data-vs-action");
                this.#view.buttons.actions[action] = button;
                button.addEventListener("click", () => this.#onActionClicked(action));
        });

        // Initialize header
        this.#view.header.levelLabel = this.#rootAreaElement.querySelector(".vs-level-label");
    }

    #onActionClicked(action) {
        switch(action) {
            case "open":
                this.#vsManager.openAsModel();
            break;
        }
    }

    #initializeTabs() {
        const rightPanelsTabButtonsContainer = this.#rootAreaElement.querySelector(".right-panels > .tab-buttons");
        const rightPanelsTabAreaContainer = this.#rootAreaElement.querySelector(".right-panels > .panel-tabs");


        // this.#tabs.right = new TabGroupManager(this, rightPanelsTabButtonsContainer, rightPanelsTabAreaContainer);
        
        // this.#tabs.right.loadTab(TabManager.load(
        //     this, "result", "Result",
        //     rightPanelsTabButtonsContainer.querySelector(".tab-button[data-tab-id='result']"),
        //     rightPanelsTabAreaContainer.querySelector(".tab-area[data-tab-id='result']")
        // ));
        
        // this.#tabs.right.selectTab("result");
    }

    setup(level, rbsCenterIdentifier) {
        if(level === 1) {
            this.#view.header.levelLabel.innerHTML = `Level 1`;
        } else {
            this.#view.header.levelLabel.innerHTML = `Level 2 (Level 1 on RBS centered at <div class="vertex-tag">${rbsCenterIdentifier}</div>)`;
        }
    }
}
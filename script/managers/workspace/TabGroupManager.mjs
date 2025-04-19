import ModelContext from "../model/ModelContext.mjs";
import { TabManager } from "./TabManager.mjs";

export class TabGroupManager {

    /** @type {ModelContext} */
    context;

    /** @type {TabManager[]} */
    #tabs = [];


    /** @type {HTMLDivElement} */
    #tabButtonsContainerElement;

    /** @type {HTMLDivElement} */
    #tabAreaContainerElement;

    /** @type {string} */
    #activeTab;

    /** @type {(tabID) => void} */
    onTabSelectedListener;

    /** @type {(tabID) => void} */
    onTabClosedListener;

    /**
     * 
     * @param {ModelContext} context 
     * @param {HTMLDivElement} tabButtonsContainer 
     * @param {HTMLDivElement} tabAreaContainer 
     */
    constructor(context, tabButtonsContainer, tabAreaContainer) {
        this.context = context;
        this.#tabButtonsContainerElement = tabButtonsContainer;
        this.#tabAreaContainerElement = tabAreaContainer;
    }

    /**
     * Add a tab from scratch
     * @param {TabManager} tabManager 
     */
    addTab(tabManager) {
        this.#tabButtonsContainerElement.append(tabManager.buildTabButton());
        this.#tabAreaContainerElement.append(tabManager.buildTabArea());

        this.loadTab(tabManager);
    }

    /**
     * Load a tab whose views are already added
     * @param {TabManager} tabManager 
     */
    loadTab(tabManager) {
        this.#tabs.push(tabManager);
        tabManager.tabGroupManager = this;

        tabManager.tabButtonElement.addEventListener("click", () => this.selectTab(tabManager.id));
    }


    getTabManager(id) {
        return this.#tabs.find(tab => tab.id === id) || null;
    }

    selectTab(id) {
        const tabManager = this.getTabManager(id);
        if(!tabManager) return;

        if(this.#activeTab) {
            const activeTabManager = this.getTabManager(this.#activeTab);
            if(activeTabManager) activeTabManager.setActive(false);
        }

        this.#activeTab = id;
        tabManager.setActive(true);
        if(this.onTabSelectedListener) {
            this.onTabSelectedListener(id);
        }
    }

    onTabClosed(id) {
        this.#tabs = this.#tabs.filter(t => t.id !== id);
        if(this.#tabs.length > 0) {
            if(this.#activeTab === id) {
                this.selectTab(this.#tabs[this.#tabs.length-1].id);
            }
        }

        if(this.onTabClosedListener) {
            this.onTabClosedListener(id);
        }
    }
}
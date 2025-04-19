import { buildElement, ellipsize } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { TabGroupManager } from "./TabGroupManager.mjs";

export class TabManager {
    
    static maxTitleLength = 30;
    
    /** @type {string} */
    id;

    /** @type {string} */
    title;

    /** @type {boolean} */
    dismissable;

    /** @type {ModelContext} */
    context;

    /** @type {HTMLDivElement} */
    tabButtonElement;

    /** @type {HTMLSpanElement} */
    tabTitleElement;

    /** @type {HTMLDivElement} */
    tabAreaElement;

    /** @type {TabGroupManager} */
    tabGroupManager;

    /**
     * @param {ModelContext} id 
     * @param {string} id 
     * @param {string} title 
     * @param {boolean} dismissable 
     */
    constructor(context, tabGroupManager, id, title, dismissable = false) {
        this.context = context;
        this.tabGroupManager = tabGroupManager;
        this.id = id;
        this.title = title;
        this.dismissable = dismissable;
    }

    buildTabButton() {
        if(this.tabButtonElement) return this.tabButtonElement;

        this.tabButtonCloseElement = buildElement("button", { classname: "close-btn" }, [ 
            buildElement("i", { classname: "fas fa-close" }) ]);

        this.tabButtonCloseElement.addEventListener("click", () => this.close());

        this.tabTitleElement = buildElement("span", { classname: "tab-title" }, [ 
            ellipsize(this.title, TabManager.maxTitleLength) ]);

        this.tabButtonElement = buildElement("div", {
            classname: "tab-button"
        }, this.dismissable ? [ this.tabTitleElement, this.tabButtonCloseElement ] : [ this.tabTitleElement ]);

        return this.tabButtonElement;
    }
    
    buildTabArea() {
        if(this.tabAreaElement) return this.tabAreaElement;
        
        this.tabAreaElement = buildElement("div", {
            classname: "tab-area"
        });

        return this.tabAreaElement;
    }

    setActive(isActive) {
        if(isActive) {
            this.tabAreaElement?.classList.add("active");
            this.tabButtonElement?.classList.add("active");
        } else {
            this.tabAreaElement?.classList.remove("active");
            this.tabButtonElement?.classList.remove("active");
        }
    }

    setVisible(isVisible) {
        if(isVisible) {
            this.tabAreaElement?.classList.remove("hidden");
            this.tabButtonElement?.classList.remove("hidden");
        } else {
            this.tabAreaElement?.classList.add("hidden");
            this.tabButtonElement?.classList.add("hidden");
        }
    }

    setTitle(title) {
        this.tabTitleElement.innerText = ellipsize(title, TabManager.maxTitleLength);
    }

    close() {
        if(!this.dismissable) return;

        this.tabButtonElement.remove();
        this.tabAreaElement.remove();
        this.tabGroupManager.onTabClosed(this.id);
    }

    static load(context, id, title, tabButtonElement, tabAreaElement, dismissable = false) {
        const tabManager = new TabManager(context, null, id, title, dismissable);
        tabManager.tabButtonElement = tabButtonElement;
        tabManager.tabAreaElement = tabAreaElement;

        return tabManager;
    }
}
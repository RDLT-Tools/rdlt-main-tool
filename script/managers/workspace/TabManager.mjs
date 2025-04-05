import { buildElement } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export class TabManager {
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

    /** @type {HTMLDivElement} */
    tabAreaElement;

    /**
     * @param {ModelContext} id 
     * @param {string} id 
     * @param {string} title 
     */
    constructor(context, id, title) {
        this.context = context;
        this.id = id;
        this.title = title;
        this.dismissable = false;
    }

    buildTabButton() {
        if(this.tabButtonElement) return this.tabButtonElement;
        
        this.tabButtonElement = buildElement("div", {
            classname: "tab-button"
        }, [ this.title ]);

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

    static load(context, id, title, tabButtonElement, tabAreaElement) {
        const tabManager = new TabManager(context, id, title);
        tabManager.tabButtonElement = tabButtonElement;
        tabManager.tabAreaElement = tabAreaElement;

        return tabManager;
    }
}
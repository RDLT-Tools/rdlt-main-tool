import VisualRDLTModel from "./entities/model/visual/VisualRDLTModel.mjs";
import ModelContext from "./managers/model/ModelContext.mjs";
import { GlobalKeyEventsManager } from "./managers/modelling/events/GlobalKeyEventsManager.mjs";
import { LocalSessionManager } from "./managers/session/LocalSessionManager.mjs";
import { TabGroupManager } from "./managers/workspace/TabGroupManager.mjs";
import { TabManager } from "./managers/workspace/TabManager.mjs";

export default class App {
    
    /**
     * @type {ModelContext[]}
     */
    static contexts;

    /**
     * @type {TabGroupManager}
     */
    static #contextsTabGroupManager;

    
    static #states = {
        currentContextID: null
    };


    static async initialize() {
        App.#initializeStates();
        App.#initializeViews();
        await App.#initializeContexts();
    }

    static #initializeStates() {
        const savedStates = LocalSessionManager.loadAppStates();
        if(savedStates) App.#states = savedStates;
    }

    static #initializeViews() {
        const tabButtonsContainer = document.querySelector("body > footer");
        const tabAreaContainer = document.querySelector("body > main");
        App.#contextsTabGroupManager = new TabGroupManager(null, tabButtonsContainer, tabAreaContainer);
        App.#contextsTabGroupManager.onTabSelectedListener = (id) => {
            App.#states.currentContextID = id;
            App.saveStates();
            App.notifySelectedContext(id);
        };
        App.#contextsTabGroupManager.onTabClosedListener = (id) => {
            const context = App.contexts.find(c => c.id === id);
            if(!context) return;
            
            App.contexts = App.contexts.filter(context => context.id !== id);
            LocalSessionManager.removeModel(context);
            LocalSessionManager.removeDrawingStates(context.id);

            if(App.contexts.length > 0) {
                LocalSessionManager.saveContextIDs(App.contexts);
            } else {
                App.addContext();
            }
        };

        GlobalKeyEventsManager.initialize();
    }

    static async #initializeContexts() {
        const contextsJSON = LocalSessionManager.loadAllContexts();

        if(contextsJSON.length > 0) {
            App.contexts = contextsJSON.map(c => ModelContext.fromJSON(c))
        } else {
            App.contexts = [];
            App.addContext();
        }

        // Load all contexts
        await Promise.all(App.contexts.map(c => c.initialize()));

        for(const context of this.contexts) {
            App.#addContextTab(context);
        }

        if(!App.#states.currentContextID || !App.contexts.find(c => c.id === App.#states.currentContextID)) {
            App.#states.currentContextID = App.contexts[0]?.id || null;
        }

        App.selectContext(App.#states.currentContextID);
    }

    static #addContextTab(context) {
        const tabManager = TabManager.load(context, context.id, context.getModelName(), null, context.managers.workspace.getRootElement(), true);
        App.#contextsTabGroupManager.addTab(tabManager);
    }

    /**
     * 
     * @param {VisualRDLTModel} visualModel 
     * @returns 
     */
    static async addContext(visualModel) {
        const context = new ModelContext(null, visualModel);
        await context.initialize();
        
        App.contexts.push(context);
        App.#addContextTab(context);
        LocalSessionManager.saveContextIDs(App.contexts);
        App.selectContext(context.id);

        LocalSessionManager.saveModel(context);

        return context;
    }
    
    /**
     * 
     * @param {ModelContext} context 
     * @param {string} title 
     */
    static setContextTabTitle(context, title) {
        this.#contextsTabGroupManager.getTabManager(context.id)?.setTitle(title);
    }

    static saveStates() {
        LocalSessionManager.saveAppStates(App.#states);
    }

    static notifySelectedContext(contextID) {
        const context = this.contexts.find(c => c.id === contextID);
        if(!context) return;

        context.onContextOpened();
    }

    static selectContext(id) {
        if(!id) return;

        App.#states.currentContextID = id;
        App.#contextsTabGroupManager.selectTab(App.#states.currentContextID);
        App.saveStates();
        App.notifySelectedContext(id);
    }
}
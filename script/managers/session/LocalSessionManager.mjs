import ModelContext from "../model/ModelContext.mjs";

export class LocalSessionManager {

    static #get(key) {
        const valueString = localStorage.getItem(key);
        if(valueString === null) return null;
        
        return JSON.parse(valueString);
    }

    static #set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static #remove(key) {
        localStorage.removeItem(key);
    }

    /**
     * @param {ModelContext} context 
     */
    static saveModel(context) {
        const modelJSON = context.managers.visualModel.getModelJSON();
        
        LocalSessionManager.#set(`rdlt-tool-model-${context.id}`, modelJSON);
    }

    /**
     * @param {ModelContext} context 
     */
    static removeModel(context) {
        LocalSessionManager.#remove(`rdlt-tool-model-${context.id}`);
    }

    /**
     * 
     * @param {ModelContext} context 
     */
    static saveContext(context) {
        LocalSessionManager.saveModel(context);
    }

    /**
     * @param {ModelContext[]} contexts 
     */
    static saveContextIDs(contexts) {
        const savedContextIDs = contexts.map(context => context.id);
        LocalSessionManager.#set("rdlt-tool-contexts", savedContextIDs);
    }

    static saveAppStates(states) {
        LocalSessionManager.#set("rdlt-tool-states", states);
    }

    static loadAppStates() {
        return LocalSessionManager.#get("rdlt-tool-states");
    }


    static loadAllContexts() {
        const savedContextIDs = LocalSessionManager.#get("rdlt-tool-contexts") || [];
        
        const contextsJSON = [];
        for(const contextID of savedContextIDs) {
            const model = LocalSessionManager.#get(`rdlt-tool-model-${contextID}`);
            
            contextsJSON.push({ id: contextID, model });
        }

        return contextsJSON;
    }

    static loadDrawingStates(contextID) {
        return LocalSessionManager.#get(`rdlt-tool-drawing-states-${contextID}`);
    }

    static saveDrawingStates(contextID, states) {
        return LocalSessionManager.#set(`rdlt-tool-drawing-states-${contextID}`, states);
    }

    static removeDrawingStates(contextID) {
        return LocalSessionManager.#remove(`rdlt-tool-drawing-states-${contextID}`);
    }
}
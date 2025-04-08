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

    /**
     * @param {ModelContext} context 
     */
    static saveModel(context) {
        const modelJSON = context.managers.visualModel.getModelJSON();
        
        this.#saveContextRef(context);
        LocalSessionManager.#set(`rdlt-tool-model-${context.id}`, modelJSON);
    }

    /**
     * 
     * @param {ModelContext} context 
     */
    static #saveContextRef(context) {
        const contextID = context.id;
        const savedContextIDs = LocalSessionManager.#get("rdlt-tool-contexts-set") || [];
        
        if(!savedContextIDs.includes(contextID)) {
            savedContextIDs.push(contextID);
            LocalSessionManager.#set("rdlt-tool-contexts-set", savedContextIDs);
        }
    }

    static loadAllContexts() {
        const savedContextIDs = LocalSessionManager.#get("rdlt-tool-contexts-set") || [];
        
        const contextsJSON = [];
        for(const contextID of savedContextIDs) {
            const model = LocalSessionManager.#get(`rdlt-tool-model-${contextID}`);
            
            contextsJSON.push({ id: contextID, model });
        }

        return contextsJSON;
    }
}
import ModelContext from "./managers/model/ModelContext.mjs";
import { LocalSessionManager } from "./managers/session/LocalSessionManager.mjs";

export default class App {
    
    /**
     * @type {ModelContext[]}
     */
    static contexts;

    static async initialize() {
        const contextsJSON = LocalSessionManager.loadAllContexts();

        if(contextsJSON.length > 0) {
            App.contexts = contextsJSON.map(c => ModelContext.fromJSON(c))
        } else {
            App.contexts = [
                new ModelContext()
            ];
        }

        console.log(App.contexts);
    }
}
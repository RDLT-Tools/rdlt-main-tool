import ModelContext from "./managers/model/ModelContext.mjs";

export default class App {
    
    /**
     * @type {ModelContext[]}
     */
    static contexts;

    static async initialize() {
        App.contexts = [
            new ModelContext()
        ];
    }
}
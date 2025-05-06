import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export class RDLT2PNManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /**
     * @param {ModelContext} context
     * @param {VerificationResultData} result 
     * @param {*} visualModelSnapshot 
     */
    constructor(context, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.#modelSnapshot = visualModelSnapshot;

        this.#initialize();
    }

    async #initialize() {
        const subworkspaceTabManager = await this.context.managers.workspace.addRDLT2PNSubworkspace(this.id);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        const simpleModel = this.#modelSnapshot.toSimpleModel();
        const iframe = rootElement.querySelector("iframe");
        
        iframe.addEventListener("load", () => {
            // TODO: Setup PN conversion here (use `simpleModel`)
        });
    }
}
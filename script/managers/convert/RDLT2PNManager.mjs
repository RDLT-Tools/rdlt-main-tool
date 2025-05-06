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
        const jsonInput = {
            vertices: simpleModel.components.map(vertex => ({
                // id: vertex.uid.toString(),
                id: vertex.identifier,
                type: vertex.type.charAt(0),
                label: '',
                M: vertex.isRBSCenter? 1 : 0,
            })),
            edges: simpleModel.arcs.map(edge => ({
                from: simpleModel.components.filter(v => v.uid === edge.fromVertexUID)[0].identifier,
                to: simpleModel.components.filter(v => v.uid === edge.toVertexUID)[0].identifier,
                C: edge.C === ''? 'ϵ':edge.C,
                L: edge.L,
            }))
        }

        iframe.addEventListener("load", () => {
            console.log(simpleModel);
            console.log(jsonInput);
            iframe.contentWindow.renderConversion(jsonInput); 
        });
    }
}
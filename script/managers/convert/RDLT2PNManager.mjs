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
            iframe.contentWindow.renderConversion(
                {
                    vertices: [
                      { id: "x1", type: "b", label: "", M: 0 },
                      { id: "y1", type: "c", label: "", M: 0 },
                      { id: "y2", type: "c", label: "", M: 0 },
                      { id: "y3", type: "c", label: "", M: 0 },
                      { id: "x2", type: "e", label: "", M: 1 },
                      { id: "y4", type: "c", label: "", M: 0 },
                      { id: "y5", type: "c", label: "", M: 0 }
                    ],
                    edges: [
                      { from: "x1", to: "y1", C: "a", L: 1 },
                      { from: "x1", to: "y2", C: "b", L: 1 },
                      { from: "y2", to: "y3", C: "d", L: 1 },
                      { from: "y1", to: "x2", C: "ϵ", L: 2 },
                      { from: "y2", to: "x2", C: "send m", L: 2 },
                      { from: "x2", to: "y5", C: "ϵ", L: 1 },
                      { from: "x2", to: "y4", C: "ϵ", L: 1 },
                      { from: "y4", to: "y5", C: "ϵ", L: 1 },
                      { from: "y5", to: "y3", C: "send n, p", L: 1 }
                    ]
                }
            ); 
        });
    }
}
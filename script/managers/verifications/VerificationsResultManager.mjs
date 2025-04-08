import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID, pickRandomFromSet } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { VERSubworkspaceManager } from "./VERSubworkspaceManager.mjs";

export class VerificationsResultManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** 
     * @typedef {number} VertexUID 
     * @typedef {number} ArcUID 
     * @typedef {{
     *      title: string,
     *      instances: {
     *          name: string,
     *          evaluation: {
     *              conclusion: { 
     *                  pass: boolean, 
     *                  title: string, 
     *                  description: string 
     *              },
     *              criteria: {
     *                  pass: boolean,
     *                  description: string
     *              }[],
     *              violating: {
     *                  vertices: VertexUID[],
     *                  arcs: ArcUID[]
     *              },
     *          }
     *      }[]
     * }} VerificationResultData
     * 
     * @type {VerificationResultData}
    */
    result;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {VERSubworkspaceManager} */
    #subworkspaceManager;

    /** 
     * @type {{
     * }} 
     * */
    #panels;


    /**
     * @param {ModelContext} context
     * @param {VerificationResultData} result 
     * @param {*} visualModelSnapshot 
     */
    constructor(context, result, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.result = result;
        this.#modelSnapshot = visualModelSnapshot;

        this.#initialize();
    }

    #initialize() {
        const subworkspaceTabManager = this.context.managers.workspace.addVerificationResultSubworkspace(this.id, this.result.title);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        // this.#drawingManager = new AESDrawingManager(this, rootElement.querySelector(".drawing > svg"));
        this.#subworkspaceManager = new VERSubworkspaceManager(this, rootElement);

        this.#panels = {
        };

        // this.#drawingManager.setupComponents(
        //     this.#modelSnapshot.getAllComponents(), 
        //     this.#modelSnapshot.getAllArcs());   
    }
}
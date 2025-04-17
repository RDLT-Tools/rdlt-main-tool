import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID, pickRandomFromSet } from "../../utils.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import VERResultTabManager from "./panels/VERResultTabManager.mjs";
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
     *          },
     *          model: {
     *              vertices: VertexUID[],
     *              arcs: ArcUID[],
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
     *      result: VERResultTabManager
     * }} 
     * */
    #panels;

    /** @type {BaseModelDrawingManager[]} */
    #drawingManagers = [];

    #currentInstanceIndex = 0;


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
            result: new VERResultTabManager(this, rootElement.querySelector(`[data-panel-id="result"]`))
        };

        this.#panels.result.displayInstanceResult(this.result.instances[0]);

        const allVertices = this.#modelSnapshot.getAllComponents();
        const allArcs = this.#modelSnapshot.getAllArcs();
        
        // Initialize model drawings
        for(let i = 0; i < this.result.instances.length; i++) {
            const instance = this.result.instances[i];
            const drawingManager = new BaseModelDrawingManager(this.#subworkspaceManager.getInstanceSVG(i), "vs");
            
            const vertices = instance.model?.vertices ? 
                allVertices.filter(v => instance.model?.vertices.includes(v.uid)) : allVertices;

            const arcs = instance.model?.arcs ? 
                allArcs.filter(v => instance.model?.arcs.includes(v.uid)) : allArcs;

            drawingManager.setupComponents(vertices, arcs);

            // Highlight violating arcs
            const violatingArcsUIDs = instance.evaluation?.violating?.arcs || [];
            for(const arcUID of violatingArcsUIDs) {
                drawingManager.highlightArc(arcUID);
            }

            // Highlight violating vertices
            const violatingVerticesUIDs = instance.evaluation?.violating?.vertices || [];
            for(const vertexUID of violatingVerticesUIDs) {
                drawingManager.highlightVertex(vertexUID);
            }
            
            this.#drawingManagers.push(drawingManager);
        }

        this.displayInstanceResult(0);
    }

    getVertexIdentifier(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID)?.identifier || "";
    }

    /**
     * @returns {[ string, string ]}
     */
    getArcIdentifierPair(arcUID) {
        const arc = this.#modelSnapshot.getArc(arcUID);
        if(!arc) return [ "", "" ];

        const from = this.getVertexIdentifier(arc.fromVertexUID);
        const to = this.getVertexIdentifier(arc.toVertexUID);

        return [ from, to ];
    }

    displayInstanceResult(instanceIndex) {
        const prevIndex = this.#currentInstanceIndex;

        this.#currentInstanceIndex = instanceIndex;
        const instance = this.result.instances[instanceIndex];

        // Change visible drawing
        this.#subworkspaceManager.getInstanceSVG(prevIndex).classList.remove("active");
        this.#subworkspaceManager.getInstanceSVG(instanceIndex).classList.add("active");

        // Update result tab
        this.#panels.result.displayInstanceResult(instance);
    }
}
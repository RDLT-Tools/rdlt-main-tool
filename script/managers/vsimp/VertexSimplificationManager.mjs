import App from "../../App.mjs";
import VisualArc from "../../entities/model/visual/VisualArc.mjs";
import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { performVertexSimplificationLevel1 } from "../../services/vs.mjs";
import { generateUniqueID } from "../../utils.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import { VSSubworkspaceManager } from "./VSSubworkspaceManager.mjs";

export class VertexSimplificationManager {

    /** @type {string} */
    id;

    /** @type {ModelContext} */
    context;

    /** @type {1 | 2} */
    #level;

    /** @type {1 | 2} */
    #rbsCenterUID;

    /** @type {BaseModelDrawingManager} */
    #drawingManager;

    /** @type {VSSubworkspaceManager} */
    #subworkspaceManager;

    /** @type {VisualRDLTModel} */
    #newModel;

    #panels;

    /**
     * 
     * @param {ModelContext} context 
     * @param {1 | 2} level 
     * @param {number} rbsCenterUID
     */
    constructor(context, level, rbsCenterUID = null) {
        this.context = context;
        this.#level = level;
        this.#rbsCenterUID = rbsCenterUID;

        this.id = generateUniqueID();
    }

    async start() {
        const subworkspaceTabManager = await this.context.managers.workspace.addVSSubworkspace(this.id, "Vertex Simplification");
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        this.#drawingManager = new BaseModelDrawingManager(rootElement.querySelector(".drawing > svg"), "vs");
        this.#subworkspaceManager = new VSSubworkspaceManager(this, rootElement);

        if(this.#level === 1) {
            this.#subworkspaceManager.setup(1);
        } else {
            const rbsCenter = this.context.managers.visualModel.getComponent(this.#rbsCenterUID);
            this.#subworkspaceManager.setup(2, rbsCenter.identifier);
        }

        
        this.#start();
    }

    #start() {
        let vertices = [];
        let arcs = [];

        const modelManager = this.context.managers.visualModel;
        
        if(this.#level === 1) {
            vertices = modelManager.getAllComponents().map(v => v.simplify());
            arcs = modelManager.getAllArcs().map(a => a.simplify());
        } else {
            vertices = modelManager.getRBSComponents(this.#rbsCenterUID).map(v => ({ ...v.simplify(), isRBSCenter: false }));
            const vertexUIDSet = new Set(vertices.map(v => v.uid));
            
            const allArcs = modelManager.getAllArcs();
            for(const arc of allArcs) {
                if(vertexUIDSet.has(arc.fromVertexUID) && vertexUIDSet.has(arc.toVertexUID)) {
                    arcs.push(arc.simplify());
                }
            }
        }
        
        const { vertexUIDs, arcUIDs, abstractArcs } = performVertexSimplificationLevel1(vertices, arcs);

        const newVertices = [];
        const newArcs = [];
        
        for(const vertexUID of vertexUIDs) {
            const vertex = modelManager.getComponent(vertexUID).copy();
            vertex.type = "controller";
            vertex.isRBSCenter = false;

            newVertices.push(vertex);
        }

        for(const arcUID of arcUIDs) {
            newArcs.push(modelManager.getArc(arcUID).copy());
        }
        
        this.#newModel = new VisualRDLTModel({ components: newVertices, arcs: newArcs });

        // Add abstract arcs
        for(const { fromVertexUID, toVertexUID, C, L } of abstractArcs) {
            this.#newModel.addArc(fromVertexUID, toVertexUID, { C, L }, null, null, true);
        }

        this.#drawingManager.setupComponents(this.#newModel.getAllComponents(), this.#newModel.getAllArcs());
    }

    openAsModel() {
        App.addContext(this.#newModel);
    }
}
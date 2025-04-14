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

        this.#initialize();
        this.#start();
    }

    #initialize() {
        const subworkspaceTabManager = this.context.managers.workspace.addVSSubworkspace(this.id, "Vertex Simplification");
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        this.#drawingManager = new BaseModelDrawingManager(rootElement.querySelector(".drawing > svg"), "vs");
        this.#subworkspaceManager = new VSSubworkspaceManager(this, rootElement);

        // this.#panels = {
        // };

        // this.#drawingManager.setupComponents(
        //     this.#modelSnapshot.getAllComponents(), 
        //     this.#modelSnapshot.getAllArcs());   
    }

    #start() {
        console.log({ level: this.#level, rbs: this.#rbsCenterUID });
        let vertices = [];
        let arcs = [];

        const model = this.context.managers.visualModel.makeCopy();
        const simpleModel = model.toSimpleModel();
        
        if(this.#level === 1) {
            vertices = simpleModel.components;
            arcs = simpleModel.arcs;
        }
        
        const { vertexUIDs, arcUIDs } = performVertexSimplificationLevel1(vertices, arcs);

        const newVertices = [];
        const newArcs = [];
        
        for(const vertexUID of vertexUIDs) {
            const vertex = model.getComponent(vertexUID).copy();
            vertex.type = "controller";
            vertex.isRBSCenter = false;

            newVertices.push(vertex);
        }

        for(const arcUID of arcUIDs) {
            newArcs.push(model.getArc(arcUID).copy());
        }

        this.#drawingManager.setupComponents(newVertices, newArcs);
    }

}
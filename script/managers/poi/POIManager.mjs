import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { generateUniqueID, pickRandomFromSet } from "../../utils.mjs";
import { BaseModelDrawingManager } from "../drawing/BaseModelDrawingManager.mjs";
import ModelContext from "../model/ModelContext.mjs";
import POIPanelManager from "./panels/POIPanelManager.mjs";
import { POISubworkspaceManager } from "./POISubworkspaceManager.mjs";

export class POIManager {
    /** @typedef { "pos" | "pod" | "deadlocks" | "shared" | "tor" | "pore" } POIItemID */
    
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {POISubworkspaceManager} */
    #subworkspaceManager;

    /** 
     * @type {{
     *      poi: POIPanelManager
     * }} 
     * */
    #panels;

    /** @type {BaseModelDrawingManager} */
    #drawingManager;

    /** @type {{ [poiItemID: string]: { vertices: Set<number>, arcs: Set<number> } }} */
    #highlightComponents = {};


    /**
     * @param {ModelContext} context
     */
    constructor(context, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.#modelSnapshot = visualModelSnapshot;

        this.#initialize();
        this.#start();
    }

    #initialize() {
        const subworkspaceTabManager = this.context.managers.workspace.addPOISubworkspace(this.id);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        this.#drawingManager = new BaseModelDrawingManager(rootElement.querySelector(".drawing > svg"), "poi");
        this.#subworkspaceManager = new POISubworkspaceManager(this, rootElement);

        this.#panels = {
            poi: new POIPanelManager(this, rootElement.querySelector(`[data-panel-id="poi"]`))
        };

    }

    #start() {

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(),
            this.#modelSnapshot.getAllArcs(),
        );


        // POD
        const podResult = {
            vertices: new Set([ 1, 3 ])
        };

        this.#panels.poi.setupPODDisplay(podResult);

        this.#highlightComponents["pod"] = {
            vertices: podResult.vertices
        };


        // POS
        const posResult = {
            vertices: new Set([ 4 ])
        };
        
        this.#panels.poi.setupPOSDisplay(posResult);

        this.#highlightComponents["pos"] = {
            vertices: posResult.vertices
        }

        // Shared Resources
        const sharedResourcesResult = {
            arcs: new Set([ 3 ])
        };

        this.#panels.poi.setupSharedResourcesDisplay(sharedResourcesResult);

        this.#highlightComponents["shared"] = {
            arcs: sharedResourcesResult.arcs
        };


        // Deadlocks
        const deadlocksResult = {
            vertices: new Set([ 3 ])
        };

        this.#panels.poi.setupDeadlocksDisplay(deadlocksResult);

        this.#highlightComponents["deadlocks"] = {
            vertices: deadlocksResult.vertices
        }


        // TOR
        const torResult = [
            {
                vertexUID: 1,
                timeReached: [ 1 ],
                parents: [
                    { arcUID: 3, timeSatisfied: [ 2 ] },
                ]
            },
            {
                vertexUID: 4,
                timeReached: [ 1, 2 ],
                parents: [
                    { arcUID: 3, timeSatisfied: [ 3 ] },
                    { arcUID: 4, timeSatisfied: [ 4, 5 ] },
                ]
            },
            {
                vertexUID: 3,
                timeReached: [ 1, 2 ],
                parents: []
            },
        ];

        this.#panels.poi.setupTORDisplay(torResult);


        // PORe
        const poreResult = [
            { vertexUID: 4, arcs: new Set([ 3 ]) }
        ];

        this.#panels.poi.setupPOReDisplay(poreResult);

        this.#highlightComponents["pore"] = {
            vertices: poreResult.map(r => r.vertexUID),
            arcs: poreResult.map(r => [...r.arcs]).flat()
        };

        this.setActivePOI("pod");

    }

    
    /**
     * 
     * @param {POIItemID} id 
     */
    setActivePOI(id) {
        this.#subworkspaceManager.setActivePOI(id);
        this.#drawingManager.clearHighlights();

        const highlightComponents = this.#highlightComponents[id];
        if(!highlightComponents) return;

        highlightComponents.vertices?.forEach(vuid => this.#drawingManager.highlightVertex(vuid));
        highlightComponents.arcs?.forEach(auid => this.#drawingManager.highlightArc(auid));
    }

    getVertex(vertexID) {
        return this.#modelSnapshot.getComponent(vertexID);
    }

    getArc(arcID) {
        return this.#modelSnapshot.getArc(arcID);
    }

    getArcIdentifierPair(arcID) {
        const arc = this.getArc(arcID);
        if(!arc) return [ "", "" ];

        const from = this.getVertex(arc.fromVertexUID);
        const to = this.getVertex(arc.toVertexUID);

        return [ 
            from?.identifier || "",
            to?.identifier || ""
        ];
    }


}
import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { getPODs, getPOSs, getSharedResources } from "../../services/poi.mjs";
import { getDeadlockPoints } from "../../services/soundness/soundness-service.mjs";
import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, findAllLoopingArcs, generateUniqueID, getIncidentArcs, getSetsIntersection, pickRandomFromSet } from "../../utils.mjs";
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

    /** @type {{ source: number, sink: number }} */
    configs;

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

    #states = {
        activePOI: null,
        sharedResourceActivities: new Set()
    };


    /**
     * @param {ModelContext} context
     */
    constructor(context, configs, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.configs = configs;
        this.#modelSnapshot = visualModelSnapshot;
    }

    async initialize() {
        const subworkspaceTabManager = await this.context.managers.workspace.addPOISubworkspace(this.id);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        
        this.#drawingManager = new BaseModelDrawingManager(rootElement.querySelector(".drawing > svg"), "poi");
        this.#subworkspaceManager = new POISubworkspaceManager(this, rootElement);

        this.#panels = {
            poi: new POIPanelManager(this, rootElement.querySelector(`[data-panel-id="poi"]`))
        };

        this.#start();

    }

    #start() {

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(),
            this.#modelSnapshot.getAllArcs(),
        );


        const vertices = this.#modelSnapshot.getAllComponents();
        const arcs = this.#modelSnapshot.getAllArcs();
        const vertexMap = buildVertexMap(vertices);
        const cache = {
            vertexMap,
            arcMap: buildArcMap(arcs),
            arcsMatrix: buildArcsAdjacencyMatrix(arcs),
            rbsMatrix: buildRBSMatrix(vertexMap, arcs)
        };

        const simpleModel = this.#modelSnapshot.toSimpleModel();


        // POD
        const podResult = {
            vertices: getPODs(cache)
        };

        this.#panels.poi.setupPODDisplay(podResult);

        this.#highlightComponents["pod"] = {
            vertices: podResult.vertices
        };


        // POS
        const posResult = {
            vertices: getPOSs(this.configs.source, cache)
        };
        
        this.#panels.poi.setupPOSDisplay(posResult);

        this.#highlightComponents["pos"] = {
            vertices: posResult.vertices
        }

        // Shared Resources
        const activities = this.context.managers.activities.getAllActivities();
        const sharedResourcesResult = {
            arcs: new Set([ 3 ])
        };

        this.#panels.poi.setupSharedResourcesActivitiesDisplay(activities);
        this.#panels.poi.refreshSharedResourcesDisplay(sharedResourcesResult);

        this.#highlightComponents["shared"] = {
            arcs: sharedResourcesResult.arcs
        };


        // Deadlocks
        const deadlocksResult = {
            vertices: new Set(getDeadlockPoints(simpleModel, this.configs.source, this.configs.sink))
        };

        this.#panels.poi.setupDeadlocksDisplay(deadlocksResult);

        this.#highlightComponents["deadlocks"] = {
            vertices: deadlocksResult.vertices
        }

        // PORe
        const loopingArcs = findAllLoopingArcs(
            this.configs.source, 
            new Set(), cache.arcsMatrix
        );

        const poreResult = [...deadlocksResult.vertices].map(vertexUID => ({
            vertexUID, arcs: getSetsIntersection(getIncidentArcs(vertexUID, cache.arcsMatrix), loopingArcs)
        }));

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
        this.#states.activePOI = id;
        this.#subworkspaceManager.setActivePOI(id);
        this.#refreshComponentHighlights();
    }
    
    #refreshComponentHighlights() {
        const id = this.#states.activePOI;
        this.#drawingManager.clearHighlights();
    
        const highlightComponents = this.#highlightComponents[id];
        if(!highlightComponents) return;
    
        highlightComponents.vertices?.forEach(vuid => this.#drawingManager.highlightVertex(vuid));
        highlightComponents.arcs?.forEach(auid => this.#drawingManager.highlightArc(auid));
    }
    
    toggleSRSelectedActivity(activityID, isSelected) {
        if(isSelected) {
            this.#states.sharedResourceActivities.add(activityID);
        } else {
            this.#states.sharedResourceActivities.delete(activityID);
        }

        this.#refreshSharedResourcesResult();
    }

    #refreshSharedResourcesResult() {
        const allActivities = this.context.managers.activities.getAllActivities();
        const selectedActivities = allActivities.filter(a => this.#states.sharedResourceActivities.has(a.id));
        const profiles = selectedActivities.map(a => a.profile);
        
        const sharedResources = getSharedResources(profiles);

        this.#panels.poi.refreshSharedResourcesDisplay({ arcs: sharedResources });
        this.#highlightComponents["shared"] = {
            arcs: sharedResources
        };

        this.#refreshComponentHighlights();
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
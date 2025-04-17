import VisualRDLTModel from "../../entities/model/visual/VisualRDLTModel.mjs";
import { backtrack, buildArcMap, buildArcsAdjacencyMatrix, buildVertexMap, checkArc, iterateAtVertex, traverseArc } from "../../services/aes.mjs";
import { generateUniqueID, pickRandomFromSet } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export class ActivitiesManager {
    /** @type {ModelContext} */
    context;
    
    /** 
     * @typedef {number} ArcUID
     * @typedef {number} VertexUID
     * @typedef {{ [timestep: number]: Set<ArcUID> }} ActivityProfile
     * @typedef {"aes" | "direct" | "ae" | "import"} ActivityOrigin
     * @typedef {{ 
     *      id: string, 
     *      name: string, 
     *      origin: ActivityOrigin, 
     *      source: VertexUID, 
     *      sink: VertexUID, 
     *      conclusion: { 
     *          pass: boolean,
     *          title: string,
     *          description: string
     *      }, 
     *      profile: ActivityProfile 
     * }} Activity
     * @type {Activity[]}
    */
    #activities = [];

    /**
     * 
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    /** 
     * @typedef {number} ComponentID
     * @typedef {"pseudorandom" | "user" | "targeted"} ActivityExtractionMode
     * @param {{
     *      name: string,
     *      source: ComponentID,
     *      sink: ComponentID,
     *      mode: ActivityExtractionMode
     * }} configs
    */
    generateActivity(configs) {
        const modelSnapshot = this.context.managers.visualModel.makeCopy();
        const vertices = modelSnapshot.getAllComponents().map(v => ({
            uid: v.uid, type: v.type
        }));

        const arcs = modelSnapshot.getAllArcs().map(a => ({
            uid: a.uid, fromVertexUID: a.fromVertexUID, 
            toVertexUID: a.toVertexUID, L: a.L, C: a.C
        }));

        const aeCache = {
            vertexMap: buildVertexMap(vertices),
            arcMap: buildArcMap(arcs),
            arcsMatrix: buildArcsAdjacencyMatrix(arcs)
        };
        
        const aeStates = {
            T: {}, CTIndicator: {}, path: [ configs.source ], activityProfile: {}
        };

        
        let currentVertex = configs.source;
        let conclusion = "";

        while(true) {
            // Check explorable arcs from current vertex
            const explorableArcs = iterateAtVertex({ vertexUID: currentVertex }, aeStates, aeCache);

            // If no explorable arcs, try to backtrack (if unable, report as failure)
            if(explorableArcs.size === 0) {
                const backtrackedVertex = backtrack(null, aeStates, aeCache);
                if(backtrackedVertex !== null) {
                    currentVertex = backtrackedVertex;
                } else {
                    conclusion = "end-fail";
                    break;
                }

                continue;
            }

            // Choose random arc
            const chosenArc = pickRandomFromSet(explorableArcs);

            // Perform check on choosen arc
            const isUnconstrained = checkArc({ arcUID: chosenArc }, aeStates, aeCache);
            
            // If unconstrained, traverse arc
            if(isUnconstrained) {
                currentVertex = traverseArc({ arcUID: chosenArc }, aeStates, aeCache);

                // If sink reached, report as done
                if(currentVertex === configs.sink) {
                    conclusion = "end-sink";
                    break;
                }
            }
        }

        const pass = conclusion === "end-sink";

        const activity = {
            id: generateUniqueID(),
            name: configs.name,
            source: configs.source,
            sink: configs.sink,
            origin: "ae",
            conclusion: {
                pass,
                title: pass ? 
                    "Activity completed" : "Activity failed to complete",
                description: pass ? 
                    "The activity was able to reach the sink" :
                    "The activity failed to reach the sink"
            },
            profile: aeStates.activityProfile
        };

        this.addActivity(activity);
    }

    /**
     * @param {Activity} activity 
     */
    addActivity(activity) {
        if(!activity.id) activity.id = generateUniqueID();
        
        this.#activities.push(activity);
        this.#refreshActivitiesList();
    }

    importActivity() {
        console.log("About to import a new activity");
    }

    simulateActivity(activityID) {
        const activity = this.#activities.find(a => a.id === activityID);
        if(!activity) return;

        this.context.managers.workspace.startActivitySimulation(activity);
    }

    deleteActivity(activityID) {
        this.#activities = this.#activities.filter(a => a.id !== activityID);
        this.#refreshActivitiesList();
    }

    #refreshActivitiesList() {
        this.context.managers.panels.execute.refreshActivitiesList(this.#activities);
    }
}
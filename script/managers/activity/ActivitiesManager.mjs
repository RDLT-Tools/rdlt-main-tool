import Activity from "../../entities/activity/Activity.mjs";
import { backtrack, checkArc, iterateAtVertex, traverseArc } from "../../services/aes.mjs";
import { buildArcMap, buildArcsAdjacencyMatrix, buildVertexMap, pickRandomFromSet } from "../../utils.mjs";
import ModelContext from "../model/ModelContext.mjs";

export class ActivitiesManager {
    /** @type {ModelContext} */
    context;
    
    /** 
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

        const activity = new Activity({
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
        });

        this.addActivity(activity);
    }

    /**
     * @param {Activity} activity 
     */
    addActivity(activity) {
        this.#activities.push(activity);
        this.#refreshActivitiesList();
    }

    importActivity() {
        this.context.managers.import.importActivityFile();
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
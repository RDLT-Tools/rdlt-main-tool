import Activity from "../../entities/activity/Activity.mjs";
import { backtrack, checkArc, iterateAtVertex, traverseArc } from "../../services/aes.mjs";
import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, findAllLoopingArcs, getSetsIntersection, pickRandomFromSet } from "../../utils.mjs";
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
     *      mode: ActivityExtractionMode,
     *      targetedArcs: Set<number>,
     *      isMaximal: boolean
     * }} configs
     * 
     * @returns {Activity}
    */
    generateActivity(configs, visualModel = null, thenSave = true) {
        const modelSnapshot = visualModel || this.context.managers.visualModel.makeCopy();
        const vertices = modelSnapshot.getAllComponents().map(v => v.simplify());
        const arcs = modelSnapshot.getAllArcs().map(a => a.simplify());

        const vertexMap = buildVertexMap(vertices);
        const arcMap = buildArcMap(arcs);
        const aeCache = {
            vertexMap,
            arcs,
            arcMap,
            arcsMatrix: buildArcsAdjacencyMatrix(arcs),
            rbsMatrix: buildRBSMatrix(vertexMap, arcs),
        };
        
        const aeStates = {
            T: {}, CTIndicator: {}, path: [ configs.source ], activityProfile: {}, tor: {}
        };

        
        let currentVertex = configs.source;
        let conclusion = "";

        const reachedVertices = new Set([ configs.source ]);

        while(true) {
            // Check explorable arcs from current vertex
            const explorableArcs = iterateAtVertex({ vertexUID: currentVertex }, aeStates, aeCache);
            const explorableTargetedArcs = getSetsIntersection(explorableArcs, configs.targetedArcs);
            const choosableArcs = explorableTargetedArcs.size > 0 ? explorableTargetedArcs : explorableArcs;

            // If no explorable arcs, try to backtrack (if unable, report as failure)
            if(choosableArcs.size === 0) {
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
            let chosenArc = null;
            if(configs.isMaximal) {
                chosenArc = [...choosableArcs].find(arcUID => reachedVertices.has(arcMap[arcUID].toVertexUID));
            }

            if(!chosenArc) {
                chosenArc = pickRandomFromSet(choosableArcs);
            }

            // Perform check on choosen arc
            const isUnconstrained = checkArc({ arcUID: chosenArc }, aeStates, aeCache);
            
            // If unconstrained, traverse arc
            if(isUnconstrained) {
                currentVertex = traverseArc({ arcUID: chosenArc }, aeStates, aeCache);
                reachedVertices.add(currentVertex);

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
            profile: aeStates.activityProfile,
            tor: aeStates.tor
        });

        if(thenSave) {
            this.addActivity(activity);
        }

        return activity;
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

    getAllActivities() {
        return [...this.#activities];
    }

    #refreshActivitiesList() {
        this.context.managers.panels.execute.refreshActivitiesList(this.#activities);
    }
}
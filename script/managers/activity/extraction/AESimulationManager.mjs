import Activity from "../../../entities/activity/Activity.mjs";
import { AESStep } from "../../../entities/activity/AESStep.mjs";
import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import { backtrack, checkArc, iterateAtVertex, traverseArc } from "../../../services/aes.mjs";
import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, generateUniqueID, pickRandomFromSet } from "../../../utils.mjs";
import ModelContext from "../../model/ModelContext.mjs";
import { AESDrawingManager } from "./AESDrawingManager.mjs";
import { AESSubworkspaceManager } from "./AESSubworkspaceManager.mjs";
import { AESConfigsPanelManager } from "./panels/AESConfigsPanelManager.mjs";
import { AESProfilePanelManager } from "./panels/AESProfilePanelManager.mjs";
import { AESStatesPanelManager } from "./panels/AESStatesPanelManager.mjs";
import { AESStepsPanelManager } from "./panels/AESStepsPanelManager.mjs";

export class AESimulationManager {
    /** @type {ModelContext} */
    context;

    /** @type {string} */
    id;

    /** 
     * @typedef {number} ComponentID
     * @typedef {"pseudorandom" | "user" | "targeted"} ActivityExtractionMode
     * @type {{
     *      name: string,
     *      source: ComponentID,
     *      sink: ComponentID,
     *      mode: ActivityExtractionMode
     * }} 
    */
    configs;

    /** @type {VisualRDLTModel} */
    #modelSnapshot;

    /** @type {AESDrawingManager} */
    #drawingManager;

    /** @type {AESSubworkspaceManager} */
    #subworkspaceManager;

    /** 
     * @type {{
     *      configs: AESConfigsPanelManager,
     *      steps: AESStepsPanelManager,
     *      states: AESStatesPanelManager,
     *      profile: AESProfilePanelManager,
     * }} 
     * */
    #panels;


    /** 
     * @typedef {{ path, T, CTIndicator, activityProfile }} AESStatesValues
     * @type {{
     *  currentStepIndex: number,
     *  steps: AESStep[],
     *  aeStates: {
     *      currentIndex: number,
     *      current: AESStatesValues,
     *      checkpoints: {
     *          [stepIndex]: AESStatesValues
     *      }
     *  }
     * }} 
    * */
    #states = {
        currentStepIndex: 0,
        steps: [],
        aeStates: {
            currentIndex: 0,
            current: null,
            checkpoints: {}
        }
    };


    /**
     * @type {{
     *      arcs: {}[], vertices: {}[],
     *      aeCache: { vertexMap, arcMap, arcsMatrix }
     * }}
     */
    #cache = {
        arcs: [],
        vertices: [],
        aeCache: {}
    };

    /**
     * @param {ModelContext} context
     * @param {{ name, source, sink, mode }} configs 
     * @param {*} visualModelSnapshot 
     */
    constructor(context, configs, visualModelSnapshot) {
        this.context = context;
        this.id = generateUniqueID();
        this.configs = configs;
        this.#modelSnapshot = visualModelSnapshot;

        this.#initialize();
    }

    #initialize() {
        const subworkspaceTabManager = this.context.managers.workspace.addAESSubworkspace(this.id);
        const rootElement = subworkspaceTabManager.tabAreaElement;
        this.#drawingManager = new AESDrawingManager(this, rootElement.querySelector(".drawing > svg"));
        this.#subworkspaceManager = new AESSubworkspaceManager(this, rootElement);

        this.#panels = {
            configs: new AESConfigsPanelManager(this, rootElement.querySelector(".panel[data-panel-id='configs']")),
            steps: new AESStepsPanelManager(this, rootElement.querySelector(".panel[data-panel-id='steps']")),
            states: new AESStatesPanelManager(this, rootElement.querySelector(".panel[data-panel-id='states']")),
            profile: new AESProfilePanelManager(this, rootElement.querySelector(".panel[data-panel-id='profile']")),
        };

        this.#panels.configs.displayConfigs({
            ...this.configs,
            source: this.context.managers.visualModel.getComponent(this.configs.source),
            sink: this.context.managers.visualModel.getComponent(this.configs.sink),
        });

        this.#drawingManager.setupComponents(
            this.#modelSnapshot.getAllComponents(), 
            this.#modelSnapshot.getAllArcs());

        
        this.#subworkspaceManager.setup(this.configs);
    }

    
    start() {
        const startVertexUID = this.configs.source;
        this.#states.steps = [
            new AESStep({ action: "start", previousVertex: startVertexUID, currentVertex: startVertexUID }),
        ];

        const initialAEStates = {
            T: {}, CTIndicator: {}, path: [ startVertexUID ], activityProfile: {}
        };

        this.#states.aeStates.checkpoints[0] = structuredClone(initialAEStates);
        this.#states.aeStates.current = initialAEStates;

        const vertices = this.#modelSnapshot.getAllComponents().map(v => v.simplify());
        const arcs = this.#modelSnapshot.getAllArcs().map(a => a.simplify());

        this.#cache.vertices = vertices;
        this.#cache.arcs = arcs;

        const vertexMap = buildVertexMap(vertices);

        this.#cache.aeCache = {
            arcs,
            vertexMap,
            arcMap: buildArcMap(arcs),
            arcsMatrix: buildArcsAdjacencyMatrix(arcs),
            rbsMatrix: buildRBSMatrix(vertexMap, arcs)
        };

        this.refreshStepsList();
        this.setCurrentStepIndex(0);
    }
    
    pause() {
        console.log("Pause");
    }

    next() {
        const maxIndex = this.#states.steps.length - 1;
        if(this.#states.currentStepIndex < maxIndex) {
            this.setCurrentStepIndex(this.#states.currentStepIndex+1);
            return;
        }

        const previousIndex = this.#states.steps.length-1;
        const previousStep = this.#states.steps[previousIndex];

        if(previousStep.action.startsWith("end")) return;

        const { mode, sink } = this.configs;
        const aeStates = this.getStatesAtStepIndex(previousIndex);
        const aeCache = this.#cache.aeCache;

        /** @type {AESStep} */
        let nextStep = null;

        if(previousStep.currentVertex === sink) {
            nextStep = new AESStep({ action: "end-sink", currentVertex: previousStep.currentVertex });
        } else if([ "start", "traverse", "backtrack" ].includes(previousStep.action) || (previousStep.action === "check" && previousStep.status === "constrained")) {
            const currentVertex = previousStep.currentVertex;

            const explorableArcs = iterateAtVertex({ vertexUID: currentVertex }, aeStates, aeCache);

            if(explorableArcs.size > 0) {
                switch(mode) {
                    case "user":
                        nextStep = new AESStep({ action: "choosing", explorableArcs, currentVertex });
                    break;
                    case "pseudorandom":
                        const chosenArc = pickRandomFromSet(explorableArcs);
                        nextStep = new AESStep({ action: "explore", trigger: "random", currentVertex, currentArc: chosenArc });
                    break;
                }
            } else {
                const backtrackedVertex = backtrack(null, aeStates, aeCache);
                if(backtrackedVertex !== null) {
                    nextStep = new AESStep({ action: "backtrack", currentVertex: backtrackedVertex });
                } else {
                    nextStep = new AESStep({ action: "end-fail" });
                }
            }
        } else if(previousStep.action === "explore") {
            const currentArc = previousStep.currentArc;
            const isUnconstrained = checkArc({ arcUID: currentArc }, aeStates, aeCache);
            nextStep = new AESStep({ 
                action: "check", 
                currentArc, currentVertex: previousStep.currentVertex,
                status: isUnconstrained ? "unconstrained" : "constrained" });   
            this.#states.aeStates.currentIndex = previousIndex+1;
        } else if(previousStep.action === "check" && previousStep.status === "unconstrained") {
            const currentArc = previousStep.currentArc;
            const previousVertex = previousStep.currentVertex;
            const newVertex = traverseArc({ arcUID: currentArc }, aeStates, aeCache);
            nextStep = new AESStep({
                action: "traverse",
                currentArc, previousVertex, currentVertex: newVertex
            });
            this.#states.aeStates.currentIndex = previousIndex+1;
        }

        if(!nextStep) return;

        const nextStepIndex = this.#states.steps.push(nextStep) - 1;
        this.refreshStepsList();
        this.setCurrentStepIndex(nextStepIndex);
    }

    chooseArc(arcUID, trigger = "user") {
        const currentStep = this.#getCurrentStep();
        if(currentStep.action !== "choosing") return;
        if(!currentStep.explorableArcs.has(arcUID)) return;

        const nextStep = new AESStep({ action: "explore", trigger, currentVertex: currentStep.currentVertex, currentArc: arcUID });
        this.#states.steps[this.#states.currentStepIndex] = nextStep;
        this.refreshStepsList();
        this.setCurrentStepIndex(this.#states.currentStepIndex);
    }

    chooseRandom() {
        const currentStep = this.#getCurrentStep();
        if(currentStep.action !== "choosing") return;
        if(currentStep.explorableArcs.size === 0) return;

        this.chooseArc(pickRandomFromSet(currentStep.explorableArcs), "random");
    }

    reselectArc() {
        const currentStepIndex = this.#states.currentStepIndex;
        const currentStep = this.#states.steps[currentStepIndex];
        if(currentStep.action !== "explore") return;

        const mode = this.configs.mode;
        let newStep = null;
        
        const aeStates = this.getStatesAtStepIndex(currentStepIndex-1);
        const aeCache = this.#cache.aeCache;
        const currentVertex = currentStep.currentVertex;
        const explorableArcs = iterateAtVertex({ vertexUID: currentVertex }, aeStates, aeCache);

        if(mode === "user") {
            newStep = new AESStep({ action: "choosing", explorableArcs, currentVertex });
        } else if(mode === "pseudorandom") {
            const filteredExplorableArcs = new Set(explorableArcs);
            if(filteredExplorableArcs.size > 1) filteredExplorableArcs.delete(currentStep.currentArc);

            const chosenArc = pickRandomFromSet(filteredExplorableArcs);
            newStep = new AESStep({ action: "explore", trigger: "random", currentVertex, currentArc: chosenArc });
        }

        if(!newStep) return;

        this.#states.steps[currentStepIndex] = newStep;
        this.#states.steps.length = currentStepIndex+1;
        this.refreshStepsList();
        this.setCurrentStepIndex(currentStepIndex);
    }

    prev() {
        if(this.#states.currentStepIndex > 0) {
            this.setCurrentStepIndex(this.#states.currentStepIndex-1);
            return;
        }
    }

    setCurrentStepID(stepID) {
        const stepIndex = this.#states.steps.findIndex(step => step.id === stepID);
        if(stepIndex != -1) this.setCurrentStepIndex(stepIndex);
    }

    setCurrentStepIndex(stepIndex) {
        this.#states.currentStepIndex = stepIndex;

        const currentStep = this.#getCurrentStep();
        const aeStates = this.getStatesAtStepIndex(stepIndex);
        this.#states.aeStates.currentIndex = stepIndex;
        this.#states.aeStates.current = aeStates;

        this.#subworkspaceManager.setCurrentStep(currentStep);
        this.#panels.steps.setActiveStep(currentStep.id);

        this.#panels.states.refreshStatesView(currentStep, aeStates, this.#cache.aeCache);
        this.#panels.profile.refreshActivityProfileView(aeStates, this.#cache.aeCache);

        // Update visualization
        this.#drawingManager.clearHighlights();
        
        // Highlight current vertex?
        if(["start", "end-sink", "backtrack", "explore", "check", "traverse"].includes(currentStep.action)) {
            this.#drawingManager.highlightVertex(currentStep.currentVertex);
        }
        
        // Highlight current arc?
        if(["explore", "check"].includes(currentStep.action)) {
            this.#drawingManager.highlightArc(currentStep.currentArc);
        }

        if(currentStep.action === "choosing") {
            for(const explorableArcUID of currentStep.explorableArcs) {
                this.#drawingManager.highlightArc(explorableArcUID);
            }
        }
    }

    #getCurrentStep() {
        return this.#states.steps[this.#states.currentStepIndex];
    }

    /** @returns {string} */
    getVertexIdentifier(vertexUID) {
        return this.#modelSnapshot.getComponent(vertexUID).identifier;
    }

    /** @returns {[string, string]} */
    getArcIdentifierPair(arcUID) {
        const arc = this.#modelSnapshot.getArc(arcUID);
        if(!arc) return [ "", "" ];

        const vertexFrom = this.#modelSnapshot.getComponent(arc.fromVertexUID);
        const vertexTo = this.#modelSnapshot.getComponent(arc.toVertexUID);

        return [
            vertexFrom?.identifier || "",
            vertexTo?.identifier || "" ];
    }

    /**
     * 
     * @param {number} stepIndex 
     * @returns {AESStatesValues}
     */
    getStatesAtStepIndex(stepIndex) {
        // Return if current
        const aeStates = this.#states.aeStates;
        if(aeStates.currentIndex === stepIndex) return aeStates.current;

        // Checkpoint
        const checkpointAEStates = aeStates.checkpoints[stepIndex];
        if(checkpointAEStates) return structuredClone(checkpointAEStates);

        // Build from previous step
        const currentStep = this.#states.steps[stepIndex];
        const AEStates = this.getStatesAtStepIndex(stepIndex - 1);
        if(currentStep.action === "check") {
            checkArc({ arcUID: currentStep.currentArc }, 
                AEStates, this.#cache.aeCache
            );
        } else if(currentStep.action === "traverse") {
            traverseArc({ arcUID: currentStep.currentArc }, AEStates, this.#cache.aeCache);
        }

        return AEStates;
    }
    
    refreshStepsList() {
        this.#panels.steps.refreshStepsList(this.#states.steps)
    }

    saveActivity(name) {
        if(![ "end-fail", "end-sink" ].includes(this.#getCurrentStep().action)) return;

        const result = this.#getCurrentStep().action;
        const pass = result === "end-sink";

        const activity = new Activity({
            name: name.trim() || "<Untitled Activity>", 
            source: this.configs.source,
            sink: this.configs.sink,
            origin: "aes",
            conclusion: {
                pass,
                title: pass ? 
                    "Activity completed" : "Activity failed to complete",
                description: pass ? 
                    "The activity was able to reach the sink" :
                    "The activity failed to reach the sink"
            },
            profile: this.getStatesAtStepIndex(this.#states.currentStepIndex).activityProfile
        });

        this.context.managers.activities.addActivity(activity);
        this.context.managers.workspace.gotoMainModel();
        this.context.managers.workspace.showPanel("execute");
    }

}
import Activity from "../../../entities/activity/Activity.mjs";
import { AESStep } from "../../../entities/activity/AESStep.mjs";
import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import { backtrack, checkArc, iterateAtVertex, traverseArc } from "../../../services/aes.mjs";
import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, generateUniqueID, getSetsIntersection, pickRandomFromSet } from "../../../utils.mjs";
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
     *      mode: ActivityExtractionMode,
     *      targetedArcs: Set<number>
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
     * @typedef {{ path, T, CTIndicator, activityProfile, tor }} AESStatesValues
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

    async #initialize() {
        const subworkspaceTabManager = await this.context.managers.workspace.addAESSubworkspace(this.id);
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
        
        this.#drawingManager.highlightTargetedArcs(this.configs.targetedArcs);

        
        this.#subworkspaceManager.setup(this.configs);

        this.#start();
    }

    
    #start() {
        const startVertexUID = this.configs.source;
        this.#states.steps = [
            new AESStep({ action: "start", previousVertex: startVertexUID, currentVertex: startVertexUID }),
        ];

        const initialAEStates = {
            T: {}, CTIndicator: {}, path: [ startVertexUID ], activityProfile: {}, tor: {}
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

            nextStep = this.#getStepWhenChoosing(currentVertex, aeStates);
            if(!nextStep) {
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

    #getStepWhenChoosing(currentVertex, aeStates, exceptArc = null) {
        const mode = this.configs.mode;
        const explorableArcs = iterateAtVertex({ vertexUID: currentVertex }, aeStates, this.#cache.aeCache);
        const explorableTargetedArcs = getSetsIntersection(explorableArcs, this.configs.targetedArcs);
        const choosableArcs = explorableTargetedArcs.size > 0 ? explorableTargetedArcs : explorableArcs;

        if(choosableArcs.size === 0) return null;

        const areArcsTargeted = explorableTargetedArcs.size > 0;

        
        if(choosableArcs.size === 1) {
            // If only 1 choosable arc, automatically select such arc
            return new AESStep({ 
                action: "explore", 
                trigger: areArcsTargeted ? "targeted-single" : "single",
                currentVertex, 
                currentArc: [...choosableArcs][0] 
            });
        } else if(mode === "user") {
            return new AESStep({ 
                action: "choosing", 
                explorableArcs: choosableArcs, 
                status: areArcsTargeted ? "targeted" : null,
                currentVertex,
            });
        } else if(mode === "pseudorandom") {
            if(exceptArc && choosableArcs.has(exceptArc) && choosableArcs.size > 1) {
                choosableArcs.delete(exceptArc);
            }

            const chosenArc = pickRandomFromSet(choosableArcs);
            return new AESStep({ 
                action: "explore", 
                trigger: areArcsTargeted ? "targeted-random" : "random", 
                currentVertex,
                currentArc: chosenArc 
            });
        }
    }

    chooseArc(arcUID, trigger = "user") {
        const currentStep = this.#getCurrentStep();
        if(currentStep.action !== "choosing") return;
        if(!currentStep.explorableArcs.has(arcUID)) return;

        const nextStep = new AESStep({ 
            action: "explore", 
            trigger: currentStep.status === "targeted" ? `targeted-${trigger}` : trigger, 
            currentVertex: currentStep.currentVertex, currentArc: arcUID 
        });
        
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

        const aeStates = this.getStatesAtStepIndex(currentStepIndex-1);
        const currentVertex = currentStep.currentVertex;

        const newStep = this.#getStepWhenChoosing(currentVertex, aeStates, currentStep.currentArc);
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

        const states = this.getStatesAtStepIndex(this.#states.currentStepIndex);
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
            profile: states.activityProfile,
            tor: states.tor
        });

        this.context.managers.activities.addActivity(activity);
        this.context.managers.workspace.gotoMainModel();
        this.context.managers.workspace.showPanel("execute");
    }

}
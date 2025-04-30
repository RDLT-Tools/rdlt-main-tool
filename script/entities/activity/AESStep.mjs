export class AESStep {
    static idCounter = 1;

    /** @type {number} */
    id;

    /**
     * @typedef {"start" | "choosing" | "try-explore" | "explore" | "check" | "traverse" | "backtrack" | "end-sink" | "end-fail"} AESStepAction 
     * @type {AESStepAction} 
    */
    action;

    /**
     * @typedef {number} VertexUID 
     * @type {VertexUID} 
     */
    previousVertex;

    /** @type {VertexUID} */
    currentVertex;

    /**
     * @typedef {number} ArcUID 
     * @type {ArcUID} 
     */
    currentArc;

    /** @type {Set<ArcUID>} */
    explorableArcs;

    /**
     * @typedef {"consequent" | "single" | "random" | "user" | "targeted-single" | "targeted-random" | "targeted-user" | "fallback"} AESStepTrigger 
     * @type {AESStepTrigger} */
    trigger;

    /**
     * @typedef {"unconstrained" | "constrained" | "targeted"} AESStepStatus 
     * @type {AESStepStatus}
    */
    status;

    /**
     * 
     * @param {{ action: AESStepAction, previousVertex: VertexUID, currentVertex: VertexUID, currentArc: ArcUID, trigger: AESStepTrigger, status: AESStepStatus, explorableArcs: Set<ArcUID> }} values 
     */
    constructor(values = {}) {
        this.id = AESStep.idCounter++;
        this.action = values.action;
        this.previousVertex = values.previousVertex;
        this.currentVertex = values.currentVertex;
        this.currentArc = values.currentArc;
        this.explorableArcs = values.explorableArcs;
        this.trigger = values.trigger;
        this.status = values.status;
    }

    get inProgress() {
        return this.action === "choosing";
    }

    get actionLabel() {
        if(this.action === "choosing" && this.status === "targeted")
             return "Choosing from targeted...";

        return {
            "start": "Start",
            "choosing": "Choosing...",
            "try-explore": "Try Explore",
            "explore": "Explore",
            "check": "Check",
            "traverse": "Traverse",
            "traverse": "Traverse",
            "backtrack": "Backtrack",
            "end-sink": "End",
            "end-fail": "Fail",
        }[this.action] || "";
    }
    
    get triggerLabel() {
        return {
            "random": "Random",
            "user": "User-chosen",
            "targeted-random": "Random<br/>from Targeted",
            "targeted-user": "User-chosen<br/>from Targeted",
            "single": "Only arc",
            "targeted-single": "Only targeted arc"
        }[this.trigger] || "";
    }
    
    get statusLabel() {
        return {
            "constrained": "Constrained",
            "unconstrained": "Unconstrained",
        }[this.status] || "";
    }

    get remarks() {
        if(this.action === "explore") {
            return this.triggerLabel;
        } else if(this.action === "check") {
            return  this.statusLabel;
        } else {
            return "";
        }
    }
}
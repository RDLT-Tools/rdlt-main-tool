import ModelContext from "../model/ModelContext.mjs";

export default class ArcTracingManager {
    /** @type { ModelContext } */
    context;

    #states = {
        isArcTracing: false,
        fromVertexUID: null,
        hoveredTargetVertexUID: null
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }


    startTracing(componentUID) {
        this.#states.isArcTracing = true;
        this.#states.fromVertexUID = componentUID;
    }

    /**
     * @param {number} componentUID
     */
    enterTargetComponent(componentUID) {
        this.#states.hoveredTargetVertexUID = componentUID;
        this.context.managers.modelling.traceArcToVertex(this.#states.fromVertexUID, this.#states.hoveredTargetVertexUID);
    }

    /**
     * @param {number} componentUID 
     */
    leaveTargetComponent(componentUID) {
        if(this.#states.hoveredTargetVertexUID !== componentUID) return;

        this.#states.hoveredTargetVertexUID = null;
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    moveTo(x, y) {
        if(!this.#states.hoveredTargetVertexUID) {
            this.context.managers.modelling.traceArcToPoint(this.#states.fromVertexUID, { x, y });
        }
    }

    endTracing() {
        if(this.#states.hoveredTargetVertexUID) {
            this.context.managers.modelling.addArc(
                this.#states.fromVertexUID, this.#states.hoveredTargetVertexUID,
                null, null, null, true);
        }

        this.#states.isArcTracing = false;
        this.#states.fromVertexUID = null;
        this.#states.hoveredTargetVertexUID = null;

        
    }
}
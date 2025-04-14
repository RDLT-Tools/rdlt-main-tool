import ModelContext from "../model/ModelContext.mjs";

export default class TransformManager {
    /** @type { ModelContext } */
    context;

    /**
     * @type {{
    *  events: { 
    *      isMoving: boolean, 
    *  },
    *  moveStart: { x: number, y: number } | null, 
    *  moveInitialPositions: {
    *      components: { [id: number]: { x: number, y } },
    *      arcs: { [id: number]: { x: number, y } },
    *      annotations: { [id: number]: { x: number, y } },
    *  }
    * }}
    */
    states = {
        events: {
            isMoving: false
        },
        moveStart: null,
        moveInitialPositions: {
            components: {},
            arcs: {},
            annotations: {}
        }
    };

    /**
     * @param {ModelContext} context 
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * @param {{ x: number, y: number } | null} moveStart
     * @param {{
     *      components: { [id: number]: { x: number, y } },
     *      arcs: { [id: number]: { x: number, y } },
     *      annotations: { [id: number]: { x: number, y } },
     *  }} moveInitialPositions
    */
    startMovement(moveStart, moveInitialPositions) {
        this.states.events.isMoving = true;
        this.states.moveStart = moveStart;
        this.states.moveInitialPositions = moveInitialPositions;
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    moveTo(x, y) {
        const { x: startX, y: startY } = this.states.moveStart;
        const offsetX = x - startX;
        const offsetY = y - startY;

        const absOffsetX = offsetX;
        const absOffsetY = offsetY;

        const initialPositions = this.states.moveInitialPositions;
        const newPositions = {};
        for(let id in initialPositions.components) {
            id = Number(id);
            const { x: ix, y: iy } = initialPositions.components[id];
            const nx = ix + absOffsetX;
            const ny = iy + absOffsetY;

            newPositions[id] = { x: nx, y: ny };
        }

        this.context.managers.modelling.updateComponentsPositions(newPositions);
    }

    endMovement() {
        this.states.events.isMoving = false;
        this.states.moveStart = null;
        this.states.moveInitialPositions = {
            components: {}, arcs: {}, annotations: {}
        };
    }
}
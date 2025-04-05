import MouseEventsManager from "./MouseEventsManager.mjs";
import KeyEventsManager from "./KeyEventsManager.mjs";
import ModelContext from "../../model/ModelContext.mjs";

export default class UserEventsManager {
    /** @type { ModelContext } */
    context;

    /** @type {SVGElement} */
    #drawingSVG;

    /** @type {MouseEventsManager} */
    #mouseEventsManager;

    /** @type {KeyEventsManager} */
    #keyEventsManager;

    /**
     * @param {ModelContext} context
     * @param {{ drawingSVG: SVGElement }} options 
     */
    constructor(context, options = {}) {
        this.context = context;
        this.#drawingSVG = options.drawingSVG;

        this.#mouseEventsManager = new MouseEventsManager(this);
        this.#keyEventsManager = new KeyEventsManager(this);

        this.#mouseEventsManager.registerDrawingSVG(this.#drawingSVG);
    }

    /**
     * @param {number} id 
     * @param {SVGGElement} rootElement 
     */
    registerComponent(id, rootElement) {
        this.#mouseEventsManager.registerComponent(id, rootElement);
        this.#mouseEventsManager.registerArcTracingHover(id, rootElement.querySelector(".arctracing-hover"));
    }


    /**
     * @param {number} id 
     * @param {SVGGElement} rootElement 
     */
    registerArc(id, rootElement) {
        this.#mouseEventsManager.registerArc(id, rootElement);
    }
    
    /**
     * 
     * @param {"mouse-move" | "mouse-up" | "mouse-down"} event 
     * @param {number} x 
     * @param {number} y 
     */
    onDrawingViewMouseEvent(event, x, y) {
        this.context.managers.modelling.onDrawingViewUserEvent(event, { x, y });
    }
    

    /**
     * @param {"click" | "mouse-down" | "mouse-up" | "mouse-enter" | "mouse-leave"} event 
     * @param {number} id 
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onComponentMouseEvent(event, id, props) {
        this.context.managers.modelling.onComponentUserEvent(event, id, props);
    }

    /**
     * @param {"mouse-down"} event 
     * @param {number} componentUID 
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onArcTracingHoverMouseEvent(event, componentUID, props) {
        this.context.managers.modelling.onArcTracingHoverUserEvent(event, componentUID, props);
    }

    /**
     * @param {"mouse-down"} event 
     * @param {number} id 
     * @param {{ drawingX: number, drawingY: number }} props
     */
    onArcMouseEvent(event, id, props) {
        this.context.managers.modelling.onArcUserEvent(event, id, props);
    }
}
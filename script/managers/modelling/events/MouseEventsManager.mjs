import UserEventsManager from "./UserEventsManager.mjs";

export default class MouseEventsManager {

    /**
     * @type {UserEventsManager}
     */
    #parent;

    /**
     * @type {SVGElement}
     */
    #drawingSVG;

    /**
     * @param {UserEventsManager} parent 
     */
    constructor(parent) {
        this.#parent = parent;
    }

    /**
     * 
     * @param {SVGElement} svgElement 
     */
    registerDrawingSVG(svgElement) {
        this.#drawingSVG = svgElement;

        const eventsHandler = (mouseEvent) => (event) => {
            const { x, y } = this.#getRelativeDrawingPosition(event.clientX, event.clientY);
            this.#parent.onDrawingViewMouseEvent(mouseEvent, x, y);
        };

        const innerEvents = [
            [ "mousedown", "mouse-down" ],
        ];

        innerEvents.forEach(([ elementEvent, mouseEvent ]) => svgElement.addEventListener(elementEvent, eventsHandler(mouseEvent)));
        
        const universalEvents = [
            [ "mousemove", "mouse-move" ],
            [ "mouseup", "mouse-up" ],
        ];
        
        universalEvents.forEach(([ elementEvent, mouseEvent ]) => document.addEventListener(elementEvent, eventsHandler(mouseEvent)));
    }

    #getRelativeDrawingPosition(x, y) {
        const { x: ox, y: oy } = this.#drawingSVG.getBoundingClientRect();
        return { x: x - ox, y: y - oy };
    }

    /**
     * @param {number} id 
     * @param {SVGGElement} rootElement 
     */
    registerComponent(id, rootElement) {
        /** @type {SVGPathElement} */
        const componentCircleElement = rootElement.querySelector(".component-circle");
        
        const events = [
            [ "click", "click" ],
            [ "mousedown", "mouse-down" ],
            [ "mouseup", "mouse-up" ],
            [ "mouseenter", "mouse-enter" ],
            [ "mouseleave", "mouse-leave" ],
        ];

        events.forEach(([ elementEvent, mouseEvent ]) => componentCircleElement.addEventListener(elementEvent, (event) => {
            const { x: drawingX, y: drawingY } = this.#getRelativeDrawingPosition(event.clientX, event.clientY);
            this.#parent.onComponentMouseEvent(mouseEvent, id, { drawingX, drawingY });
            if(elementEvent === "mousedown") event.stopPropagation();
        }));
    }


    /**
     * @param {number} componentUID 
     * @param {SVGCircleElement} rootElement 
     */
    registerArcTracingHover(componentUID, rootElement) {
        rootElement.addEventListener("mousedown", (event) => {
            const { x: drawingX, y: drawingY } = this.#getRelativeDrawingPosition(event.clientX, event.clientY);
            this.#parent.onArcTracingHoverMouseEvent("mouse-down", componentUID, { drawingX, drawingY });
            event.stopPropagation();
        });
    }

    
    /**
     * @param {number} id
     * @param {SVGGElement} rootElement
     */
    registerArc(id, rootElement) {
        const events = [
            [ "mousedown", "mouse-down" ]
        ];

        const arcTriggerElement = rootElement.querySelector(".arc-trigger");
        events.forEach(([ elementEvent, mouseEvent ]) => arcTriggerElement.addEventListener(elementEvent, (event) => {
            const { x: drawingX, y: drawingY } = this.#getRelativeDrawingPosition(event.clientX, event.clientY);
            this.#parent.onArcMouseEvent(mouseEvent, id, { drawingX, drawingY });
            if(elementEvent === "mousedown") event.stopPropagation();
        }));
    }

    

}
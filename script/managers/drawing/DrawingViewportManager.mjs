import { setHasExact } from "../../utils.mjs";
import { GlobalKeyEventsManager } from "../modelling/events/GlobalKeyEventsManager.mjs";

export class DrawingViewportManager {
    
    /** @type {SVGElement} */
    #svgElement;

    #view = {
        states: {
            offset: { x: 0, y: 0 },
            zoom: 1,
        }, 
        motion: {
            zoomFactor: 1.1,
            moveFactor: { x: 24, y: 24 }
        }
    };

    /** @type {(states: { offset: { x, y }, zoom }) => void} */
    onUpdateListener;

    constructor(svgElement, states) {
        this.#svgElement = svgElement;
        if(states) {
            this.#view.states = states;
            requestAnimationFrame(() => this.#updateViewport());
        }

        this.#initialize();
    }

    #initialize() {
        GlobalKeyEventsManager.listen(this.#svgElement, (keys, scrollDirection, cursorPosition) => {
            if(keys.size === 0) {
                this.move(0, scrollDirection);
            } else if(setHasExact(keys, "Control")) {
                // const { x: cx, y: cy } = cursorPosition;
                // const { x: ox, y: oy } = this.#svgElement.getBoundingClientRect();

                if(scrollDirection < 0) this.zoomIn();
                else if(scrollDirection > 0) this.zoomOut();

            } else if(setHasExact(keys, "Shift")) {
                this.move(scrollDirection, 0);
            } else if(setHasExact(keys, "Control", "=")) {
                this.zoomIn();
            } else if(setHasExact(keys, "Control", "-")) {
                this.zoomOut();
            }
        });
    }

    move(directionX, directionY) {
        const { states, motion } = this.#view;
        states.offset.x += Math.sign(directionX) * motion.moveFactor.x;
        states.offset.y += Math.sign(directionY) * motion.moveFactor.y;

        this.#updateViewport();
    }

    zoomIn() {
        this.#view.states.zoom *= this.#view.motion.zoomFactor;
        
        this.#updateViewport();
    }

    zoomOut() {
        this.#view.states.zoom /= this.#view.motion.zoomFactor;

        this.#updateViewport();
    }

    #updateViewport() {
        const { width, height } = this.#svgElement.getBoundingClientRect();
        if(width === 0 || height === 0) return;

        const { offset, zoom } = this.#view.states;

        const viewBox = `${offset.x} ${offset.y} ${width/zoom} ${height/zoom}`;
        this.#svgElement.setAttribute("viewBox", viewBox);

        if(this.onUpdateListener) this.onUpdateListener({
            offset: {...offset}, zoom
        });
    }

    refresh() {
        this.#updateViewport();
    }

    setStates(states) {
        requestAnimationFrame(() => {
            this.#view.states = states;
            this.#updateViewport();
        });
    }

    getAbsolutePosition(x, y) {
        const { offset, zoom } = this.#view.states;

        return { 
            x: x*zoom + offset.x, 
            y: y*zoom + offset.y
        };
    }
}
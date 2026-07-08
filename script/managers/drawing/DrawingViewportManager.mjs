import { getAbsoluteSVGCoordinates, setHasExact } from "../../utils.mjs";
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
            zoomFactor: 1.05,
            moveFactor: { x: 16, y: 16 }
        }
    };

    /** @type {{ minX: number, minY: number, maxX: number, maxY: number, padding: number }|null} */
    #pendingFit = null;

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
        GlobalKeyEventsManager.listen(this.#svgElement, (keys, scrollDirection, relativeCursorPosition) => {
            if(keys.size === 0) {
                this.move(0, scrollDirection);
            } else if(setHasExact(keys, "Control")) {
                // const { x: cx, y: cy } = cursorPosition;
                // const { x: ox, y: oy } = this.#svgElement.getBoundingClientRect();
                
                relativeCursorPosition = relativeCursorPosition || { x: 0, y: 0 };

                if(scrollDirection < 0) this.zoomIn(relativeCursorPosition);
                else if(scrollDirection > 0) this.zoomOut(relativeCursorPosition);

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

    /**
     * 
     * @param {number} zoomFactor 
     * @param {{ x: number, y: number }} relativeCursorPosition 
     */
    #zoom(zoomFactor, relativeCursorPosition) {
        this.#view.states.zoom *= zoomFactor;

        // const relativeReoffsetX = (zoomFactor-1)*relativeCursorPosition.x;
        // const relativeReoffsetY = (zoomFactor-1)*relativeCursorPosition.y;
        // const drawingCursorPosition = this.getAbsolutePosition(relativeCursorPosition.x, relativeCursorPosition.y);

        // this.#view.states.offset.x += (zoomFactor-1)*drawingCursorPosition.x;
        // this.#view.states.offset.y += (zoomFactor-1)*drawingCursorPosition.y;
        
        this.#updateViewport();
    }

    zoomIn(relativeCursorPosition) {
        this.#zoom(this.#view.motion.zoomFactor, relativeCursorPosition);
    }

    zoomOut(relativeCursorPosition) {
        this.#zoom(1/this.#view.motion.zoomFactor, relativeCursorPosition);
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
        if (this.#pendingFit) {
            this.#applyFit();
        } else {
            this.#updateViewport();
        }
    }

    /**
     * Fit the viewport to a bounding box of content.
     * Sets the viewBox attribute directly (works even on hidden SVGs) and stores
     * the fit so that refresh() can properly apply zoom/offset once the SVG has
     * real dimensions.
     * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bounds
     * @param {number} [padding=40]
     */
    fitToContent(bounds, padding = 40) {
        const { minX, minY, maxX, maxY } = bounds;
        this.#pendingFit = { minX, minY, maxX, maxY, padding };

        // Set the viewBox directly so the content is visible even before the SVG
        // has been laid out.  Use the content dimensions but never smaller than a
        // reasonable viewport size so small graphs are not enlarged by the browser.
        const contentW = maxX - minX + 2 * padding;
        const contentH = maxY - minY + 2 * padding;
        const w = Math.max(contentW, 800);
        const h = Math.max(contentH, 600);
        this.#svgElement.setAttribute('viewBox',
            `${minX - padding} ${minY - padding} ${w} ${h}`
        );

        this.#applyFit();
    }

    #applyFit() {
        if (!this.#pendingFit) return;
        const { minX, minY, maxX, maxY, padding } = this.#pendingFit;

        const { width, height } = this.#svgElement.getBoundingClientRect();
        if (width === 0 || height === 0) return;   // SVG not yet visible — viewBox already set directly

        const contentW = Math.max(maxX - minX + 2 * padding, 1);
        const contentH = Math.max(maxY - minY + 2 * padding, 1);
        const zoom = Math.min(1, width / contentW, height / contentH);

        this.#view.states.zoom   = zoom;
        this.#view.states.offset = { x: minX - padding, y: minY - padding };
        this.#pendingFit = null;

        this.#updateViewport();
    }

    setStates(states) {
        if(!states) return;
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
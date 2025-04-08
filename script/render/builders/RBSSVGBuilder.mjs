import SVGAssetsRepository from "./SVGAssetsRepository.mjs";
import TextSVGBuilder from "./TextSVGBuilder.mjs";
import { makeGroupSVG, makeSVGElement } from "./utils.mjs";

export default class RBSSVGBuilder {
    /** @type {SVGGElement} */
    #element;

    /** @type {TextSVGBuilder} */
    #label;

    /** @type {SVGRectElement} */
    #boundsElement;

    static padding = 20;

    constructor() {
        this.#label = new TextSVGBuilder("RBS", {
            x: RBSSVGBuilder.padding, y: RBSSVGBuilder.padding + 14
        });

        this.setCenterIdentifier("");

        this.#boundsElement = makeSVGElement("rect", {
            stroke: "#585858", "stroke-width": 2, 
            "stroke-dasharray": "4 4",
            fill: "none", className: "rbs-bounds"
        });

        this.#element = makeGroupSVG([
            this.#boundsElement,
            this.#label.element
        ], { className: "rbs diagram" });
    }

    get element() { return this.#element; }

    setCenterIdentifier(identifier) {
        this.#label.text = `RBS with M(${identifier})=1`;
    }

    /**
     * @param {{ minX, minY, maxX, maxY }} bounds 
     */
    setBounds(bounds) {
        const { minX, minY, maxX, maxY } = bounds;
        
        const padding = RBSSVGBuilder.padding;
        const labelHeight = 20;
        
        const x = minX - padding;
        const y = minY - labelHeight - padding*1.5;

        const width = maxX - minX + padding*2;
        const height = maxY - minY + padding*2 + labelHeight + padding;
        
        this.#boundsElement.setAttribute("width", width);
        this.#boundsElement.setAttribute("height", height);
        this.#element.setAttribute("transform", `translate(${x}, ${y})`);

        return this;
    }
}
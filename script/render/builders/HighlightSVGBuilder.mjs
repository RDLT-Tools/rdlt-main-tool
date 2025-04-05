import SVGAssetsRepository from "./SVGAssetsRepository.mjs";
import TextSVGBuilder from "./TextSVGBuilder.mjs";
import { makeGroupSVG, makeSVGElement } from "./utils.mjs";

export default class HighlightSVGBuilder {
    /** @type {SVGGElement} */
    #element;

    constructor() {
        this.#element = SVGAssetsRepository.loadHighlightSVGElement().querySelector("rect");
        this.#element.classList.add("highlight");
    }

    get element() { return this.#element; }

    highlightOver(ix, iy, fx, fy) {
        this.#element.style.display = "initial";
        this.#element.setAttribute("transform", `translate(${ix}, ${iy})`);
        this.#element.setAttribute("width", fx - ix);
        this.#element.setAttribute("height", fy - iy);
    }

    hide() {
        this.#element.style.display = "none";
    }
}
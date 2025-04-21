import SVGAssetsRepository from "./SVGAssetsRepository.mjs";
import TextSVGBuilder from "./TextSVGBuilder.mjs";
import { makeGroupSVG, makeSVGElement } from "./utils.mjs";

export default class ComponentSVGBuilder {

    /**
     * @typedef {"model" | "dragging" | "aes"} DrawingOrigin
     */
    #origin;
    
    /** 
     * @typedef {"boundary" | "entity" | "controller"} ComponentType
     * @type {ComponentType} */
    #type;

    /** @type {number} */
    boundWidth;

    /** @type {number} */
    boundHeight;

    /** @type {number} */
    initialCircleSize;


    /** @type {TextSVGBuilder} */
    #centerLabel;

    /** @type {TextSVGBuilder} */
    #outerLabel;

    /** @type {SVGGElement} */
    #element;

    /** @type {SVGElement} */
    #componentElement;

    /** @type {SVGElement} */
    #componentShapeElement;

    
    /**
     * @param {ComponentType} type
     * @param {DrawingOrigin} origin
     */
    constructor(type, origin = "model") {
        this.#origin = origin;
        this.#type = type;
        this.boundWidth = 100;
        this.boundHeight = 100;
        this.initialCircleSize = 70;


        this.#componentShapeElement = SVGAssetsRepository.loadComponentSVGElement(this.#type);
        this.#componentShapeElement.classList.add("diagram");
        this.#componentElement = makeGroupSVG([
            makeSVGElement("circle", {
                cx: 50, cy: 50, r: 35, "fill": "black",
                "fill-opacity": 0,
                className: "component-circle"
            }),
            this.#componentShapeElement,
        ]);

        const groupBounds = makeSVGElement("rect", {
            x: 0, y: 0, 
            width: this.boundWidth,
            height: this.boundHeight,
            fill: "transparent",
        });

        if(origin === "model") {
            this.#centerLabel = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: this.boundWidth/2,
                y: this.boundHeight/2,
                fontSize: 20
            });

            this.#outerLabel = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: this.boundWidth/2,
                y: this.boundHeight + 2,
                fontSize: 14
            });

            this.#centerLabel.element.classList.add("diagram");
            this.#outerLabel.element.classList.add("diagram");

            const hoverElement = SVGAssetsRepository.loadComponentHoverSVGElement();
            hoverElement.classList.add("component-hover");
            this.#componentElement.appendChild(hoverElement);

            const selectedElement = SVGAssetsRepository.loadComponentSelectedSVGElement();
            selectedElement.classList.add("component-selected");
            this.#componentElement.appendChild(selectedElement);

            const arcTracingHoverElement = SVGAssetsRepository.loadArcTracingHoverSVGElement();
            const arcTracingHoverCircleElement = arcTracingHoverElement.querySelector("circle");
            arcTracingHoverCircleElement.classList.add("arctracing-hover");
            this.#componentElement.appendChild(arcTracingHoverCircleElement);

            this.#element = makeGroupSVG([
                groupBounds,
                this.#componentElement,
                this.#centerLabel.element,
                this.#outerLabel.element
            ], { className: "component" });
        } else if(origin === "dragging") {
            this.#element = makeGroupSVG([
                groupBounds,
                this.#componentElement,
            ], { className: "component dragging" });
        } else if([ "aes", "vs", "poi" ].includes(origin)) {
            this.#centerLabel = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: this.boundWidth/2,
                y: this.boundHeight/2,
                fontSize: 20
            });

            this.#outerLabel = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: this.boundWidth/2,
                y: this.boundHeight + 2,
                fontSize: 14
            });

            this.#element = makeGroupSVG([
                groupBounds,
                this.#componentElement,
                this.#centerLabel.element,
                this.#outerLabel.element
            ], { className: "component" });
        }
    }

    static Boundary() {
        return new ComponentSVGBuilder("boundary");
    }

    static Entity() {
        return new ComponentSVGBuilder("entity");
    }

    static Controller() {
        return new ComponentSVGBuilder("controller");
    }

    get element() { return this.#element; }

    setType(type) {
        if(type === this.#type) return;

        this.#type = type;
        const newComponentShapeElement = SVGAssetsRepository.loadComponentSVGElement(this.#type);
        newComponentShapeElement.classList.add("diagram");
        this.#componentShapeElement.parentElement.replaceChild(newComponentShapeElement, this.#componentShapeElement);
        this.#componentShapeElement = newComponentShapeElement;
    }

    setCenterLabelText(text) {
        this.#centerLabel.text = text;

        return this;
    }

    setOuterLabelText(text) {
        this.#outerLabel.text = text;

        return this;
    }

    setPosition(x, y) {

        x -= this.boundWidth/2;
        y -= this.boundHeight/2;

        this.#element.setAttribute("transform", `translate(${x}, ${y})`);

        return this;
    }

    setStrokeWidth(strokeWidth) {
        for(const path of [ ...this.#componentElement.querySelectorAll("path") ]) {
            path.setAttribute("stroke-width", strokeWidth);
        }

        return this;
    }

    setIsSelected(isSelected) {
        if(isSelected) this.#element.setAttribute("data-selected", "");
        else this.#element.removeAttribute("data-selected");
    }
}
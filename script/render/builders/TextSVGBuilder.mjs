import { makeSVGElement } from "./utils.mjs";

export default class TextSVGBuilder {
    /** @type {string} */
    #text;
    
    /** @type {number | string} */
    #fontSize;
    
    /** @type {string} */
    #fontFamily;
    
    /** @type {string} */
    #color;

    /** @type {{ x: number, y: number }} */
    #position;

    /** 
     * @typedef { "start" | "middle" | "end" } TextAlign
     * @type {TextAlign} 
    */
    #align;

    /** 
     * @typedef { "auto" | "middle" | "hanging" | "alphabetic" | "ideographic" | "mathematical" | "central" | "text-before-edge" | "text-after-edge" } TextVerticalAlign
     * @type {TextVerticalAlign} 
    */
    #vAlign;

    /** 
     * @type {SVGTextElement} 
    */
    #element;

    /**
     * 
     * @param {string} text 
     * @param {{ fontSize: number | string, fontFamily: string, align: TextAlign, vAlign: TextVerticalAlign, x: number, y: number }} props 
     */
    constructor(text, props = {}) {
        const { fontSize, fontFamily, color, align, vAlign, x = 0, y = 0 } = props;

        this.#element = makeSVGElement("text");
        this.text = text;
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
        this.color = color;
        this.position = { x, y };
        this.align = align;
        this.vAlign = vAlign;
    }

    get text() { return this.#text; }
    get fontSize() { return this.#fontSize; }
    get fontFamily() { return this.#fontFamily; }
    get color() { return this.#color; }
    get position() { return { ...this.#position }; }
    get align() { return this.#align; }
    get vAlign() { return this.#vAlign; }
    get element() { return this.#element; }

    set text(text) {
        this.#text = text || "";
        this.#element.textContent = this.#text;
    }
    
    set fontSize(fontSize) {
        this.#fontSize = fontSize || 17;
        this.#element.setAttribute("font-size", this.#fontSize);
    }
    
    set fontFamily(fontFamily) {
        this.#fontFamily = fontFamily || "Arial";
        this.#element.setAttribute("font-family", this.#fontFamily);
    }

    set color(color) {
        this.#color = color || "black";
        this.#element.setAttribute("color", this.#color);
    }
    
    set position(position) {
        if(!position) position = { x: 0, y: 0 };
        
        this.#position = {
            x: position.x || 0,
            y: position.y || 0
        };
        
        this.#element.setAttribute("x", this.#position.x);
        this.#element.setAttribute("y", this.#position.y);
    }

    set align(align) {
        this.#align = align || "start";
        this.#element.setAttribute("text-anchor", this.#align);
    }

    set vAlign(vAlign) {
        this.#vAlign = vAlign || "start";
        this.#element.setAttribute("dominant-baseline", this.#vAlign);
    }

    copy() {
        return new TextSVGBuilder(
            this.#text, {
                fontSize: this.#fontSize, 
                fontFamily: this.#fontFamily, 
                color: this.#color, 
                align: this.#align, 
                vAlign: this.#vAlign, 
                x: this.#position.x, 
                y: this.#position.y
            }
        );
    }
}
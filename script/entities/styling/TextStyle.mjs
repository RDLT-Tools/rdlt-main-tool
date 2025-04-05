export default class TextStyle {
    static DEFAULTS = {
        fontFamily: "Arial",
        size: 17,
        color: "black",
        weight: "normal"
    };

    /** @type {string} */
    fontFamily;

    /** @type {number} */
    size;

    /** @type {string} */
    color;

    /** 
     * @typedef {number | "bold" | "normal" | "medium" | "thin"} FontWeight
     * @type {FontWeight} */
    weight;

    /**
     * 
     * @param {{ fontFamily: string, size: number, color: string, weight: FontWeight }} options
     */
    constructor(options = {}) {
        const { fontFamily, size, color, weight } = options || {};
        this.fontFamily = fontFamily || TextStyle.DEFAULTS.fontFamily;
        this.size = size || TextStyle.DEFAULTS.size;
        this.color = color || TextStyle.DEFAULTS.color;
        this.weight = weight || TextStyle.DEFAULTS.weight;
    }

    copy() {
        return new TextStyle({
            fontFamily: this.fontFamily,
            size: this.size,
            color: this.color,
            weight: this.weight
        });
    }
}
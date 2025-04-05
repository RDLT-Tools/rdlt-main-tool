export default class OutlineStyle {
    static DEFAULTS = {
        width: 2,
        color: "black"
    };
    
    /** @type {number} */
    width;

    /** @type {string} */
    color;

    /**
     * 
     * @param {{ width: number, color: string }} options
     */
    constructor(options = {}) {
        const { width, color } = options || {};
        this.width = width || OutlineStyle.DEFAULTS.width;
        this.color = color || OutlineStyle.DEFAULTS.color;
    }

    copy() {
        return new OutlineStyle({
            width: this.width,
            color: this.color
        });
    }

    
}
import OutlineStyle from "./OutlineStyle.mjs";
import TextStyle from "./TextStyle.mjs";

export default class ComponentStyles {
    /** @type {OutlineStyle} */
    outline;

    /** @type {TextStyle} */
    innerLabel;

    /** @type {TextStyle} */
    outerLabel;

    constructor() {
        this.outline = new OutlineStyle();
        this.innerLabel = new TextStyle();
        this.outerLabel = new TextStyle();
    }

    copy() {
        const copied = new ComponentStyles();

        copied.outline = this.outline.copy();
        copied.innerLabel = this.innerLabel.copy();
        copied.outerLabel = this.outerLabel.copy();

        return copied;
    }

    toJSON() {
        return {
            outline: this.outline.toJSON(),
            innerLabel: this.innerLabel.toJSON(),
            outerLabel: this.outerLabel.toJSON()
        };
    }

    static fromJSON(json) {
        const componentStyles = new ComponentStyles();
        componentStyles.outline = OutlineStyle.fromJSON(json.outline);
        componentStyles.innerLabel = TextStyle.fromJSON(json.innerLabel);
        componentStyles.outerLabel = TextStyle.fromJSON(json.outerLabel);

        return componentStyles;
    }
}
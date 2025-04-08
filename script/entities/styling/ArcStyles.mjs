import OutlineStyle from "./OutlineStyle.mjs";
import TextStyle from "./TextStyle.mjs";

export default class ArcStyles {
    /** @type {OutlineStyle} */
    outline;

    /** @type {TextStyle} */
    label;

    /**
     * @typedef {"none" | "arrow-open" | "arrow-closed-filled" | "arrow-closed"} ConnectorType
     * @typedef {{ type: ConnectorType, thickness: number }} ConnectorStyle
    */

    /** @type {ConnectorStyle} */
    connectorEnd;

    constructor() {
        this.outline = new OutlineStyle();
        this.label = new TextStyle();
        this.connectorEnd = {
            type: "arrow-closed-filled",
            thickness: 15
        };
    }

    copy() {
        const copied = new ArcStyles();

        copied.outline = this.outline.copy();
        copied.label = this.label.copy();
        copied.connectorEnd = {...this.connectorEnd};

        return copied;
    }

    toJSON() {
        return {
            outline: this.outline.toJSON(),
            label: this.label.toJSON(),
            connectorEnd: { ...this.connectorEnd },
        };
    }

    static fromJSON(json) {
        const arcStyles = new ArcStyles();
        arcStyles.outline = OutlineStyle.fromJSON(json.outline);
        arcStyles.label = TextStyle.fromJSON(json.label);
        arcStyles.connectorEnd = json.connectorEnd;

        return arcStyles;
    }
}
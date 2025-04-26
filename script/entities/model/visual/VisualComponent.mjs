import ComponentGeometry from "../../geometry/ComponentGeometry.mjs";
import ComponentStyles from "../../styling/ComponentStyles.mjs";
import ModelComponent from "../ModelComponent.mjs";

export default class VisualComponent {
    static ID_COUNTER = 1;

    /** @type {number} */
    uid;

    /** @type {string} */
    identifier;

    /** 
     * @typedef {"boundary" | "entity" | "controller"} ComponentType
     * @type {ComponentType} */
    type;

    /** @type {boolean} */
    isRBSCenter;

    /** @type {string} */
    label;

    /** @type {string} */
    notes;

    /** @type {ComponentGeometry} */
    geometry;

    /** @type {ComponentStyles} */
    styles;

    /**
     * @param {{ uid?: number, identifier: string, label: string, type: ComponentType, isRBSCenter: boolean, geometry?: ComponentGeometry, styles?: ComponentStyles }} options 
     */
    constructor(options = {}) {
        const { uid, identifier, label, type, isRBSCenter, geometry, styles } = options || {};

        this.uid = uid || ModelComponent.ID_COUNTER++;
        this.identifier = identifier || "";
        this.label = label || "";
        this.type = type;
        this.isRBSCenter = isRBSCenter || false;
        this.geometry = geometry || new ComponentGeometry();
        this.styles = styles || new ComponentStyles();
    }

    copy(newInstance = false) {
        const copied = new VisualComponent({
            uid: newInstance ? null : this.uid,
            identifier: this.identifier,
            label: this.label,
            type: this.type,
            isRBSCenter: this.isRBSCenter,
            geometry: this.geometry.copy(),
            styles: this.styles.copy()
        });

        copied.notes = this.notes;
        return copied;
    }

    simplify() {
        return {
            uid: this.uid,
            identifier: this.identifier,
            isRBSCenter: this.isRBSCenter,
            type: this.type
        };
    }

    toJSON() {
        return {
            uid: this.uid,
            identifier: this.identifier,
            label: this.label,
            type: this.type,
            isRBSCenter: this.isRBSCenter,
            geometry: this.geometry.toJSON(),
            styles: this.styles.toJSON()
        };
    }

    get typeLabel() {
        return {
            entity: "Entity",
            boundary: "Boundary",
            controller: "Controller"
        }[this.type];
    }

    static fromJSON(json) {
        return new VisualComponent({
            ...json,
            geometry: ComponentGeometry.fromJSON(json.geometry),
            styles: ComponentStyles.fromJSON(json.styles),
        });
    }
}
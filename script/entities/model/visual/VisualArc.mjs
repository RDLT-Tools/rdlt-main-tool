import ArcGeometry from "../../geometry/ArcGeometry.mjs";
import ArcStyles from "../../styling/ArcStyles.mjs";
import ModelArc from "../ModelArc.mjs";

export default class VisualArc {
    static ID_COUNTER = 1;

    /** @type {number} */
    uid;

    /** @type {string} */
    C;

    /** @type {number} */
    L;

    /** @type {number} */
    fromVertexUID;
    
    /** @type {number} */
    toVertexUID;

    /** @type {string} */
    notes;

    /** @type {ArcGeometry} */
    geometry;

    /** @type {ArcStyles} */
    styles;


    /**
     * @param {{ uid: number, C: string, L: number, fromVertexUID: number, toVertexUID: number, geometry, styles }} options 
     */
    constructor(options = {}) {
        const { uid, C, L, fromVertexUID, toVertexUID, geometry, styles } = options || {};
    
        this.uid = uid || ModelArc.ID_COUNTER++;
        this.C = C || "";
        this.L = L || 1;
        this.fromVertexUID = fromVertexUID;
        this.toVertexUID = toVertexUID;

        this.geometry = geometry || new ArcGeometry();
        this.styles = styles || new ArcStyles();
    }

    copy() {
        return new VisualArc({
            uid: this.uid,
            C: this.C,
            L: this.L,
            fromVertexUID: this.fromVertexUID,
            toVertexUID: this.toVertexUID,
            geometry: this.geometry.copy(),
            styles: this.styles.copy(),
        });
    }

    toJSON() {
        return {
            uid: this.uid,
            C: this.C,
            L: this.L,
            fromVertexUID: this.fromVertexUID,
            toVertexUID: this.toVertexUID,
            geometry: this.geometry.toJSON(),
            styles: this.styles.toJSON()
        };
    }

    get form() {
        if(this.fromVertexUID === this.toVertexUID) return "self-loop";

        return "straight";
    }

    get controlPoint() {
        return { x: 20, y: -65 };
    }

    static fromJSON(json) {
        return new VisualArc({
            ...json,
            geometry: ArcGeometry.fromJSON(json.geometry),
            styles: ArcStyles.fromJSON(json.styles),
        });
    }
}
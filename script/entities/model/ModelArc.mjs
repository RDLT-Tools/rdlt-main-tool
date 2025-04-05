export default class ModelArc {
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

    /**
     * 
     * @param {{ C: string, L: number, fromVertexUID: number, toVertexUID: number }} options 
     */
    constructor(options = {}) {
        const { C, L, fromVertexUID, toVertexUID } = options || {};
    
        this.uid = ModelArc.ID_COUNTER++;
        this.C = C || "";
        this.L = L || 1;
        this.fromVertexUID = fromVertexUID;
        this.toVertexUID = toVertexUID;
    }

    /**
     * @param {number} fromVertexUID 
     * @param {number} toVertexUID 
     * @returns {ModelArc}
     */
    static create(fromVertexUID, toVertexUID) {
        return new ModelArc({
            C: "", L: 1, fromVertexUID, toVertexUID
        });
    }
}
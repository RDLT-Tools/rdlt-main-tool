import ModelArc from "./ModelArc.mjs";
import ModelComponent from "./ModelComponent.mjs";

export default class RDLTModel {
    /** @type {{ [ componentUID: number ]: ModelComponent }} */
    #components;

    /** @type {ModelArc[]} */
    #arcs;

    /**
     * @typedef {number} ArcUID 
     * @type {{ [ fromVertexUID: number ]: { [ toVertexUID: number ]: Set<ArcUID> } }} */
    #arcConnections;

    /**
     * 
     * @param {{ components: ModelComponent[], arcs: ModelArc[] }} options 
     */
    constructor(options = {}) {
        const { components, arcs } = options || {};
        
        this.#components = {};
        this.#arcs = [];
        this.#arcConnections = {};

        if(components) for(const component of components) this.addComponent(component);
        if(arcs) for(const arc of arcs) this.addArc(arc);
    }

    /**
     * @param {number} componentUID 
     * @returns {ModelComponent | null}
     */
    getComponent(componentUID) {
        return this.#components[componentUID] || null;
    }

    /**
     * @param {number} arcUID
     * @returns {ModelArc | null}
     */
    getArc(arcUID) {
        return this.#arcs.find(arc => arc.uid == arcUID) || null;
    }

    /**
     * @param {ModelComponent} component 
     */
    addComponent(component) {
        this.#components[component.uid] = component;
        this.#arcConnections[component.uid] = {};

        return component;
    }

    /**
     * @param {ModelArc} arc 
     */
    addArc(arc) {
        this.#arcs.push(arc);

        if(!this.#arcConnections[arc.fromVertexUID]) 
            this.#arcConnections[arc.fromVertexUID] = {};

        if(!this.#arcConnections[arc.fromVertexUID][arc.toVertexUID]) 
            this.#arcConnections[arc.fromVertexUID][arc.toVertexUID] = new Set([ arc.uid ]);
        else this.#arcConnections[arc.fromVertexUID][arc.toVertexUID].add(arc.uid);

        return arc;
    }

    /**
     * @param {number} componentUID 
     * @returns {ModelComponent | null}
     */
    removeComponent(componentUID) {
        const component = this.getComponent(componentUID);
        if(!component) return null;

        delete this.#components[componentUID];
        delete this.#arcConnections[componentUID];

        this.#arcs = this.#arcs.filter(arc => {
            if(arc.fromVertexUID === componentUID) return false;
            if(arc.toVertexUID === componentUID) {
                delete this.#arcConnections[arc.fromVertexUID]?.[componentUID];

                return false;
            }

            return true;
        });

        return component;
    }

    /**
     * @param {number} arcUID 
     * @returns {ModelArc | null}
     */
    removeArc(arcUID) {
        const arc = this.getArc(arcUID);
        if(!arc) return null;

        this.#arcs = this.#arcs.filter(arc => arc.uid !== arcUID);
        this.#arcConnections[arc.fromVertexUID]?.[arc.toVertexUID]?.delete(arcUID);

        return arc;
    }
}
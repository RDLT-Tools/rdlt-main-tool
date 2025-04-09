import RDLTModel from "../RDLTModel.mjs";
import ModelAnnotation from "./ModelAnnotation.mjs";
import VisualArc from "./VisualArc.mjs";
import VisualComponent from "./VisualComponent.mjs";


/**
 * @typedef {{ x: number, y: number }} Position
 * @typedef {{ width: number, color: string }} OutlineStyleJSON
 * @typedef {{
 *      fontFamily: string,
 *      size: number,
 *      color: string,
 *      weight: number
 * }} TextStyleJSON
 * 
 * @typedef {{
 *      position: Position,
 *      size: number
 * }} VertexGeometryJSON
 * 
 * @typedef {{
 *      outline: OutlineStyleJSON,
 *      innerLabel: TextStyleJSON,
 *      outerLabel: TextStyleJSON
 * }} VertexStylesJSON
 * 
 * @typedef {{
 *      uid: number, identifier: string,
 *      label: string, type: "boundary" | "entity" | "controller",
 *      isRBSCenter: boolean, 
 *      geometry: VertexGeometryJSON,
 *      styles: VertexStylesJSON
 * }} VisualVertexJSON
 * 
 * 
 * @typedef {{
 *      pathType: "straight" | "elbowed",
 *      isAutoDraw: boolean,
 *      waypoints: Position[],
 *      arcLabel: { baseSegmentIndex: number, footFracDistance: number, perpDistance: number }
 * }} ArcGeometryJSON
 * 
 * @typedef {{
 *      outline: OutlineStyleJSON,
 *      label: TextStyleJSON,
 *      connectorEnd: { type: "none" | "arrow-open" | "arrow-closed-filled" | "arrow-closed", thickness: number }
 * }} ArcStylesJSON
 * 
 * @typedef {{
 *      uid: number, C: string, L: number,
 *      fromVertexUID: number, toVertexUID: number,
 *      geometry: ArcGeometryJSON,
 *      styles: ArcStylesJSON
 * }} VisualArcJSON
 * 
 * @typedef {{
 *      name: string,
 *      components: VisualVertexJSON[],
 *      arcs: VisualArcJSON[]
 * }} VisualRDLTModelJSON
 */
export default class VisualRDLTModel {

    VERTEX_ID_COUNTER = 1;
    ARC_ID_COUNTER = 1;

    /** @type {string} */
    #name;

    /** @type {{ [ componentUID: number ]: VisualComponent }} */
    #components = {};

    /** @type {VisualArc[]} */
    #arcs = [];

    /**
     * @typedef {number} ArcUID 
     * @type {{ [ fromVertexUID: number ]: { [ toVertexUID: number ]: Set<ArcUID> } }} */
    #arcConnections = {};


    /**
     * @typedef {{ [centerComponentUID: number]: VisualComponent[] }} RBSComponentsCache
     * @typedef {{ [componentUID: number]: VisualArc[] }} OutgoingArcsCache
     * @typedef {{ [componentUID: number]: VisualArc[] }} IncidentArcsCache
     * @type {{ outgoingArcs: OutgoingArcsCache, incidentArcs: IncidentArcsCache, rbsComponents: RBSComponentsCache }}
     */
    #cache = {
        outgoingArcs: {},
        incidentArcs: {},
        rbsComponents: {}
    };

    /** @type {ModelAnnotation[]} */
    #annotations;

    /**
     * 
     * @param {{ components?: VisualComponent[], arcs?: VisualArc[] }} options 
     */
    constructor(options = {}) {
        const { name, components, arcs } = options || {};
        
        this.#name = name || "New RDLT Model";

        if(components) {
            for(const component of components) this.addComponent(component);
        }

        if(arcs) {
            for(const arc of arcs) this.addArc(arc);
        }
    }

    getName() {
        return this.#name;
    }

    setName(newName) {
        this.#name = newName;
    }

    /**
     * @param {number} componentUID 
     * @returns {VisualComponent | null}
     */
    getComponent(componentUID) {
        return this.#components[componentUID] || null;
    }

    /**
     * @returns {VisualComponent[]}
     */
    getAllComponents() {
        return Object.values(this.#components);
    }

    /**
     * @param {number} componentUID 
     * @returns {VisualArc[]}
     */
    getArcsIncidentToComponent(componentUID) {
        if(this.#cache.incidentArcs[componentUID]) {
            return this.#cache.incidentArcs[componentUID];
        }

        const incidentArcs = [];
        for(const arc of this.#arcs) {
            if(arc.fromVertexUID === componentUID || arc.toVertexUID === componentUID) {
                incidentArcs.push(arc);
            }
        }

        this.#cache.incidentArcs[componentUID] = incidentArcs;
        return incidentArcs;
    }

    /**
     * @param {number} componentUID 
     * @returns {VisualArc[]}
     */
    getOutgoingArcs(componentUID) {
        const component = this.getComponent(componentUID);
        if(!component) return;

        if(this.#cache.outgoingArcs[componentUID]) {
            return this.#cache.outgoingArcs[componentUID];
        }

        // List all outgoing arcs
        const outgoingArcs = [];
        const arcConnections = this.#arcConnections[componentUID] || [];
        for(const otherComponentUID in arcConnections) {
            const arcs = arcConnections[otherComponentUID];
            for(const arcUID of arcs) {
                outgoingArcs.push(this.getArc(arcUID));
            }
        }

        this.#cache.outgoingArcs[componentUID] = outgoingArcs;
        return outgoingArcs;
    }

    /**
     * @param {number} componentUID 
     * @returns {VisualArc[]}
     */
    getIncomingArcs(componentUID) {
        const incomingArcs = [];

        for(const arc of this.#arcs) {
            if(arc.toVertexUID === componentUID) {
                incomingArcs.push(arc);
            }
        }

        return incomingArcs;
    }

    /**
     * @param {number} centerUID 
     * @returns {VisualComponent[]}
     */
    getRBSComponents(centerUID) {
        const component = this.getComponent(centerUID);
        if(!component) return [];

        if(!component.isRBSCenter) {
            delete this.#cache.rbsComponents[centerUID];
            return [];
        }

        if(this.#cache.rbsComponents[centerUID]) {
            return this.#cache.rbsComponents[centerUID];
        }

        // List all RBS components through outgoing arcs
        const addedComponents = new Set([ centerUID ]);
        const rbsComponents = [ component ];
        const outgoingArcs = this.getOutgoingArcs(centerUID);
        for(const arc of outgoingArcs) {
            if(addedComponents.has(arc.toVertexUID)) continue;

            if(arc.C === "") { // only add if C-attribute is epsilon
                addedComponents.add(arc.toVertexUID);
                rbsComponents.push(this.getComponent(arc.toVertexUID));
            }
        }

        this.#cache.rbsComponents[centerUID] = rbsComponents;
        return rbsComponents;
    }

    resetRBSCache(centerUID) {
        delete this.#cache.rbsComponents[centerUID];
    }

    /**
     * @param {number} arcUID
     * @returns {VisualArc | null}
     */
    getArc(arcUID) {
        return this.#arcs.find(arc => arc.uid == arcUID) || null;
    }

    /**
     * @return {VisualArc[]}
     */
    getAllArcs() {
        return [...this.#arcs];
    }

    /**
     * @param {VisualComponent} component 
     */
    addComponent(component) {
        this.#components[component.uid] = component;
        this.#arcConnections[component.uid] = {};

        return component;
    }

    /**
     * @param {VisualArc} arc 
     */
    addArc(arc) {
        this.#arcs.push(arc);

        if(!this.#arcConnections[arc.fromVertexUID]) 
            this.#arcConnections[arc.fromVertexUID] = {};

        if(!this.#arcConnections[arc.fromVertexUID][arc.toVertexUID]) 
            this.#arcConnections[arc.fromVertexUID][arc.toVertexUID] = new Set([ arc.uid ]);
        else this.#arcConnections[arc.fromVertexUID][arc.toVertexUID].add(arc.uid);


        // Reset cache for affected components
        delete this.#cache.incidentArcs[arc.fromVertexUID];
        delete this.#cache.incidentArcs[arc.toVertexUID];
        delete this.#cache.outgoingArcs[arc.fromVertexUID];
        delete this.#cache.rbsComponents[arc.fromVertexUID];

        return arc;
    }

    /**
     * @param {number} componentUID 
     * @returns {{ removedComponent: VisualComponent, removedArcs: VisualArc[] }}
     */
    removeComponent(componentUID) {
        const component = this.getComponent(componentUID);
        if(!component) return { removeComponent: null, removedArcs: [] };

        delete this.#components[componentUID];
        delete this.#arcConnections[componentUID];

        delete this.#cache.incidentArcs[componentUID];
        delete this.#cache.outgoingArcs[componentUID];
        delete this.#cache.rbsComponents[componentUID];

        const removedArcs = [];

        this.#arcs = this.#arcs.filter(arc => {
            if(arc.fromVertexUID === componentUID) {
                delete this.#cache.incidentArcs[arc.toVertexUID];

                removedArcs.push(arc);
                return false;
            }

            if(arc.toVertexUID === componentUID) {
                delete this.#arcConnections[arc.fromVertexUID]?.[componentUID];
                delete this.#cache.outgoingArcs[arc.fromVertexUID];
                delete this.#cache.rbsComponents[arc.fromVertexUID];
                delete this.#cache.incidentArcs[arc.fromVertexUID];

                removedArcs.push(arc);
                return false;
            }

            return true;
        });

        return { removedComponent: component, removedArcs };
    }

    /**
     * @param {number} arcUID 
     * @returns {VisualArc | null}
     */
    removeArc(arcUID) {
        const arc = this.getArc(arcUID);
        if(!arc) return null;

        this.#arcs = this.#arcs.filter(arc => arc.uid !== arcUID);
        this.#arcConnections[arc.fromVertexUID]?.[arc.toVertexUID]?.delete(arcUID);

        delete this.#cache.incidentArcs[arc.fromVertexUID];
        delete this.#cache.incidentArcs[arc.toVertexUID];
        delete this.#cache.outgoingArcs[arc.fromVertexUID];
        delete this.#cache.rbsComponents[arc.fromVertexUID];

        return arc;
    }

    getPotentialSourceVertices() {
        const potentialSourceVertices = [];

        for(const vertexUID in this.#components) {
            const incomingArcs = this.getIncomingArcs(Number(vertexUID));
            if(incomingArcs.length === 0) potentialSourceVertices.push(this.#components[vertexUID]);
        }

        return potentialSourceVertices.sort((v1, v2) => v1.identifier.localeCompare(v2.identifier));
    }

    getPotentialSinkVertices() {
        const potentialSinkVerties = [];

        for(const vertexUID in this.#components) {
            const outgoingArcs = this.getOutgoingArcs(Number(vertexUID));
            if(outgoingArcs.length === 0) potentialSinkVerties.push(this.#components[vertexUID]);
        }

        return potentialSinkVerties.sort((v1, v2) => v1.identifier.localeCompare(v2.identifier));
    }

    copy() {
        const copiedVertices = [];
        for(const vertexUID in this.#components) {
            copiedVertices.push(this.#components[vertexUID].copy());
        }

        const copiedArcs = this.#arcs.map(arc => arc.copy());

        return new VisualRDLTModel({
            name: this.#name,
            components: copiedVertices,
            arcs: copiedArcs
        });
    }
    
    toJSON() {
        return {
            name: this.#name,
            components: Object.values(this.#components).map(c => c.toJSON()),
            arcs: this.#arcs.map(a => a.toJSON()),
            VERTEX_ID_COUNTER: this.VERTEX_ID_COUNTER,
            ARC_ID_COUNTER: this.ARC_ID_COUNTER,
        };
    }

    toSimpleModel() {
        return {
            components: Object.values(this.#components).map(c => ({
                uid: c.uid,
                identifier: c.identifier,
                isRBSCenter: c.isRBSCenter
            })),
            arcs: this.#arcs.map(a => ({
                uid: a.uid,
                fromVertexUID: a.fromVertexUID,
                toVertexUID: a.toVertexUID,
            }))
        };
    }

    static fromJSON(json) {
        const visualRDLTModel = new VisualRDLTModel({
            name: json.name,
            components: json.components.map(c => VisualComponent.fromJSON(c)),
            arcs: json.arcs.map(a => VisualArc.fromJSON(a)),
        });

        // Setup UID counters for visual component and visual arcs
        visualRDLTModel.VERTEX_ID_COUNTER = json.VERTEX_ID_COUNTER;
        visualRDLTModel.ARC_ID_COUNTER = json.ARC_ID_COUNTER;

        return visualRDLTModel;
    }
}
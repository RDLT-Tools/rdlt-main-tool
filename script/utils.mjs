import VisualArc from "./entities/model/visual/VisualArc.mjs";

export class Form {
    /** @type {HTMLDivElement} */
    #rootElement;

    /** @type {string[]} */
    #fieldNames = null;

    /** @type {{ [fieldName: string]: HTMLInputElement | HTMLSelectElement }} */
    #fieldElements = null;

    /** @type {(fieldName, value) => any}  */
    #listener;

    constructor(rootElement) {
        this.#rootElement = rootElement;
        this.#listener = null;
    }

    /**
     * @param {string[]} fieldNames 
     * @returns {Form}
     */
    setFieldNames(fieldNames) {
        this.#fieldNames = fieldNames;
        this.#loadFields();

        return this;
    }

    #loadFields() {
        if(this.#fieldElements !== null) throw new Error("Field names can only be loaded once.");
        this.#fieldElements = {};

        for(const fieldName of this.#fieldNames) {
            /** @type {HTMLInputElement | HTMLSelectElement} */
            const fieldElement = this.#rootElement.querySelector(`[name='${fieldName}']`);
            if(!fieldElement) continue;

            this.#fieldElements[fieldName] = fieldElement;
            if(fieldElement.tagName === "INPUT") {
                fieldElement.addEventListener("input", () => this.#onFieldChange(fieldName, fieldElement));
            } else if(fieldElement.tagName === "SELECT") {
                fieldElement.addEventListener("change", () => this.#onFieldChange(fieldName, fieldElement));
            }
        }
    }

    #onFieldChange(fieldName, fieldElement) {
        let value = this.getFieldValue(fieldName);
        if(this.#listener) this.#listener(fieldName, value);
    }

    /**
     * 
     * @param {[ fieldName: string ]: any} values 
     */
    setValues(values) {
        for(const fieldName in values) {
            const fieldElement = this.#fieldElements[fieldName];
            if(!fieldElement) continue;

            const value = values[fieldName];

            if(fieldElement.tagName === "INPUT" && fieldElement.type === "checkbox") {
                fieldElement.checked = value;
            } else {
                fieldElement.value = value;
            }
        }

        return this;
    }

    getValues() {
        const values = {};
        for(const fieldName in this.#fieldElements) {
            values[fieldName] = this.getFieldValue(fieldName);
        }

        return values;
    }

    getFieldElement(fieldName) {
        return this.#fieldElements[fieldName] || null;
    }

    getFieldValue(fieldName) {
        const fieldElement = this.#fieldElements[fieldName];
        if(!fieldElement) return null;

        let value = fieldElement.value;
        if(fieldElement.tagName === "INPUT" && fieldElement.type === "checkbox") {
            value = fieldElement.checked;
        }

        return value;
    }

    /**
     * @param {(fieldName, value) => any} listener 
     * @returns {Form}
     */
    setOnChangeListener(listener) {
        this.#listener = listener;

        return this;
    }
}

/**
 * @param {string} tagName 
 * @param {Object} attributes 
 * @param {Node[]} children 
 */
export function buildElement(tagName = "div", attributes = {}, children = []) {
    const element = document.createElement(tagName);
    if(attributes) {
        for(const key in attributes) {
            if(key === "classname") {
                element.classList.add(...attributes["classname"].split(" "));
            } else {
                element.setAttribute(key, attributes[key]);
            }
        }
    }

    if(children) {
        element.append(...children);
    }

    return element;
}

export function pickRandomFromSet(set) {
    const arr = Array.from(set);
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

export function generateUniqueID() {
    const timestamp = Date.now();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomChars = "";
    for (let i = 0; i < 5; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${timestamp}${randomChars}`;
}

export function setHasExact(setA, ...elements) {
    if (setA.size !== elements.length) return false;
    for (const elem of elements) {
        if (!setA.has(elem)) return false;
    }

    return true;
}

/**
 * 
 * @param {SVGElement} svgElement 
 * @param {number} mouseX 
 * @param {number} mouseY 
 * @returns 
 */
export function getAbsoluteSVGCoordinates(svgElement, viewX, viewY) {
    const { width, height } = svgElement.getBoundingClientRect();
    let { baseVal: { x: vx, y: vy, width: vw, height: vh } } = svgElement.viewBox;
    
    if(!vx) vx = 0;
    if(!vy) vy = 0;
    if(!vw) vw = width;
    if(!vh) vh = height;

    const zoom = width / vw;

    return { 
        x: viewX/zoom + vx, 
        y: viewY/zoom + vy
    };
}


/**
 * @typedef {number} ArcUID
 * @typedef {number} VertexUID
 * @typedef {number} RBSCenterVertexUID
 * @typedef {{ uid: ArcUID, fromVertexUID: number, toVertexUID: number, C: string, L: number }} Arc
 * @typedef {{ uid: ArcUID, type: "boundary" | "entity" | "controller", isRBSCenter: boolean }} Vertex
 * 
 * @typedef {{ [vertexUID: number]: Vertex }} VertexMap 
 * @typedef {{ [arcUID: number]: Arc }} ArcMap 
 * @typedef {{ [fromVertexUID: number]: { [toVertexUID: number]: Set<ArcUID> } }} ArcsAdjacencyMatrix
 * @typedef {{ [vertexUID: number]: RBSCenterVertexUID }} RBSMatrix
 */

/**
 * @param {Arc[]} arcs 
 * @returns {{ [arcUID: number]: VisualArc }}
 */
export function buildArcMap(arcs) {
    const map = {};
    for(const arc of arcs) {
        map[arc.uid] = arc;
    }

    return map;
}


/**
 * @param {Arc[]} arcs 
 * @returns {ArcsAdjacencyMatrix}
 */
export function buildArcsAdjacencyMatrix(arcs) {
    /** @type {ArcsAdjacencyMatrix} */
    const matrix = {};

    for(const arc of arcs) {
        const { uid, fromVertexUID, toVertexUID } = arc;
        if(!(fromVertexUID in matrix)) matrix[fromVertexUID] = {};
        
        const outgoingArcs = matrix[fromVertexUID];
        if(!(toVertexUID in outgoingArcs)) outgoingArcs[toVertexUID] = new Set();

        outgoingArcs[toVertexUID].add(uid);
    }

    return matrix;
}


/**
 * 
 * @param {Vertex[]} vertices 
 * @returns {VertexMap}
 */
export function buildVertexMap(vertices) {
    const map = {};
    for(const vertex of vertices) {
        map[vertex.uid] = vertex;
    }

    return map;
}


/**
 * 
 * @param {VertexMap} vertexMap
 * @param {Arc[]} arcs
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {RBSMatrix}
 */
export function buildRBSMatrix(vertexMap, arcs) {
    const rbsMatrix = {};

    for(const arc of arcs) {
        const from = vertexMap[arc.fromVertexUID];
        if(from.isRBSCenter && isEpsilon(arc)) {
            rbsMatrix[arc.fromVertexUID] = arc.fromVertexUID;
            rbsMatrix[arc.toVertexUID] = arc.fromVertexUID;
        }
    }

    return rbsMatrix;
}

/**
 * @param {number} vertexUID 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {Set<ArcUID>}
 */
export function getIncomingArcs(vertexUID, arcsMatrix) {
    const allIncomingArcs = new Set(); 
    for(const fromVertexUID in arcsMatrix) {
        const incomingArcs = arcsMatrix[fromVertexUID][vertexUID];
        if(incomingArcs) {
            for(const arcUID of incomingArcs) {
                allIncomingArcs.add(arcUID);
            }
        }
    }

    return allIncomingArcs;
}

/**
 * @param {number} vertexUID 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {Set<ArcUID>}
 */
export function getOutgoingArcs(vertexUID, arcsMatrix) {
    const allOutgoingArcs = new Set();
    const outgoingMap = arcsMatrix[vertexUID];

    for(const toVertexUID in outgoingMap) {
        const arcs = outgoingMap[toVertexUID];
        for(const arcUID of arcs) {
            allOutgoingArcs.add(arcUID);
        }
    }

    return allOutgoingArcs;
}

/**
 * @param {number} vertexUID 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {Set<ArcUID>}
 */
export function getIncidentArcs(vertexUID, arcsMatrix) {
    const incidentArcs = new Set();

    // Get incoming arcs
    for(const fromVertexUID in arcsMatrix) {
        const incomingArcs = arcsMatrix[fromVertexUID][vertexUID];
        if(incomingArcs) {
            for(const arcUID of incomingArcs) {
                incidentArcs.add(arcUID);
            }
        }
    }

    // Get outgoing arcs
    const outgoingMap = arcsMatrix[vertexUID];
    for(const toVertexUID in outgoingMap) {
        const arcs = outgoingMap[toVertexUID];
        for(const arcUID of arcs) {
            incidentArcs.add(arcUID);
        }
    }

    return incidentArcs;
}


/**
 * @param {Arc | string} arc
 * @returns {boolean} 
 */
export function isEpsilon(arc) {
    if(typeof(arc) === "string") return arc.trim() === "";
    return arc.C.trim() === "";
}

/**
 * 
 * @param {VertexUID} startVertexUID 
 * @param {VertexUID} endVertexUID 
 * @param {Set<ArcUID>} visitedArcs 
 * @param {{ vertexMap: VertexMap, arcMap: ArcMap, arcsMatrix: ArcsAdjacencyMatrix, rbsMatrix: RBSMatrix }} cache 
 * 
 * @returns {VertexUID[][]}
 */
export function findAllRBSPaths(startVertexUID, endVertexUID, visitedArcs, cache) {
    if(!visitedArcs) visitedArcs = new Set();
    const { vertexMap, arcMap, arcsMatrix, rbsMatrix } = cache;
    
    const arcPaths = [];
    
    const rbsCenterUID = rbsMatrix[startVertexUID];

    const outgoingArcs = getOutgoingArcs(startVertexUID, arcsMatrix);
    for(const arcUID of outgoingArcs) {
        if(visitedArcs.has(arcUID)) continue;
        const arc = arcMap[arcUID];

        if(arc.toVertexUID === endVertexUID) {
            arcPaths.push([ arcUID ]);
            continue;
        }

        if(rbsMatrix[arc.toVertexUID] !== rbsCenterUID) continue;

        const _visitedArcs = new Set(visitedArcs);
        _visitedArcs.add(arcUID);

        const nextArcPaths = findAllRBSPaths(arc.toVertexUID, endVertexUID, _visitedArcs, cache);
        for(const arcPath of nextArcPaths) {
            arcPaths.push([ arcUID, ...arcPath ]);
        }

    }

    return arcPaths;
}
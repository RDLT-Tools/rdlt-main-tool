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

export function buildVertexDisplayElement(type) {
    return buildElement("div", { 
        classname: "vertex-display", 
        "data-vertex-type": type
    });
}

export function buildArcDisplayElement() {
    return buildElement("div", { classname: "arc-display" });
}

export function buildVertexTagElement(vertexIdentifier) {
    return buildElement("div", { classname: "vertex-tag" }, [ vertexIdentifier ]);
}

export function buildArcTagElement(fromIdentifier, toIdentifier) {
    return buildElement("div", { classname: "arc-tag" }, [
        buildElement("div", { classname: "from" }, [ fromIdentifier ]),
        buildElement("div", { classname: "to" }, [ toIdentifier ]),
    ]);
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
 * @param {Set<number>} setA 
 * @param {Set<number>} setB 
 * @returns {Set<number>}
 */
export function getSetsIntersection(setA, setB) {
    const intersection = new Set();

    for(const element of setA) {
        if(setB.has(element)) intersection.add(element);
    }
    
    return intersection;
}

export function getSetsUnion(...sets) {
    const union = new Set();
    for(const set of sets) {
        for(const element of set) {
            union.add(element);
        }
    }

    return union;
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
 * @returns {boolean}
 */
export function vertexHasIncomingArcs(vertexUID, arcsMatrix) {
    for(const fromVertexUID in arcsMatrix) {
        const incomingArcs = arcsMatrix[fromVertexUID][vertexUID];
        if(incomingArcs && incomingArcs.size > 0) {
            return true;
        }
    }

    return false;
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
export function findAllRBSPaths(startVertexUID, endVertexUID, visitedVertices, visitedArcs, cache) {
    if(!visitedArcs) visitedArcs = new Set();
    if(!visitedVertices) visitedVertices = new Set();

    const { vertexMap, arcMap, arcsMatrix, rbsMatrix } = cache;
    
    const arcPaths = [];
    
    const rbsCenterUID = rbsMatrix[startVertexUID];

    const outgoingArcs = getOutgoingArcs(startVertexUID, arcsMatrix);
    for(const arcUID of outgoingArcs) {
        const arc = arcMap[arcUID];
        if(arc.toVertexUID === endVertexUID) {
            arcPaths.push([ arcUID ]);
            continue;
        }

        if(visitedArcs.has(arcUID)) continue;
        if(visitedVertices.has(arc.toVertexUID)) continue;

        if(rbsMatrix[arc.toVertexUID] !== rbsCenterUID) continue;

        const _visitedArcs = new Set(visitedArcs);
        _visitedArcs.add(arcUID);

        const _visitedVertices = new Set(visitedVertices);
        _visitedVertices.add(arc.fromVertexUID);

        const nextArcPaths = findAllRBSPaths(arc.toVertexUID, endVertexUID, _visitedVertices, _visitedArcs, cache);
        for(const arcPath of nextArcPaths) {
            arcPaths.push([ arcUID, ...arcPath ]);
        }

    }

    return arcPaths;
}

export function isInbridge(arcUID, arcMap, rbsMatrix) {
    const arc = arcMap[arcUID];

    return rbsMatrix[arc.toVertexUID] && 
        (rbsMatrix[arc.fromVertexUID] !== rbsMatrix[arc.toVertexUID]);
}

export function isOutbridge(arcUID, arcMap, rbsMatrix) {
    const arc = arcMap[arcUID];

    return rbsMatrix[arc.fromVertexUID] && 
        (rbsMatrix[arc.fromVertexUID] !== rbsMatrix[arc.toVertexUID]);
}

export function areTypeAlikeIncoming(arcUID1, arcUID2, arcMap, rbsMatrix) {
    // Two incoming arcs to the same vertex are type-alike if any is true:
    //    1. Neither are inbridge/outbridge
    //    2. Both are inbridges
    //    3. Both are outbridges and come from the same vertex

    const isArc1Inbridge = isInbridge(arcUID1, arcMap, rbsMatrix);
    const isArc1Outbridge = isOutbridge(arcUID1, arcMap, rbsMatrix);
    const isArc2Inbridge = isInbridge(arcUID2, arcMap, rbsMatrix);
    const isArc2Outbridge = isOutbridge(arcUID2, arcMap, rbsMatrix);

    // 1. Neither are inbridge/outbridge
    if(!isArc1Inbridge && !isArc1Outbridge && !isArc2Inbridge && !isArc2Outbridge) return true;

    // 2. Both are inbridges
    if(isArc1Inbridge && isArc2Inbridge) return true;

    // 3. Both are outbridges and come from the same vertex
    if(isArc1Outbridge && isArc2Outbridge &&
        arcMap[arcUID1].fromVertexUID === arcMap[arcUID2].fromVertexUID) return true; 

    return false;
}


/**
 * 
 * @param {VertexUID} startVertexUID 
 * @param {VertexUID} endVertexUID 
 * @param {boolean} elementaryPathsOnly 
 * @param {Set<number>} visitedVertices 
 * @param {ArcMap} arcMap 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * 
 * @returns {VertexUID[][]}
 */
export function findAllElementaryPaths(startVertexUID, endVertexUID, visitedVertices, arcMap, arcsMatrix) {
    if(startVertexUID === endVertexUID) return [ [startVertexUID] ];

    const vertexPaths = [];
    const nextVertices = getNextVertices(startVertexUID, arcsMatrix);
    visitedVertices.add(startVertexUID);


    for(const vertexUID of nextVertices) {
        if(visitedVertices.has(vertexUID)) continue;

        const nextVertexPaths = findAllElementaryPaths(
            vertexUID, endVertexUID,
            new Set(visitedVertices), arcMap, arcsMatrix);

        for(const nextVertexPath of nextVertexPaths) {
            nextVertexPath.unshift(startVertexUID);
            vertexPaths.push(nextVertexPath);
        }
    }

    return vertexPaths;
}

/**
 * 
 * @param {VertexUID} vertexUID 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {Set<VertexUID>}
 */
export function getNextVertices(vertexUID, arcsMatrix) {
    const nextVertices = new Set();
    for(const toVertexUID in arcsMatrix[vertexUID]) {
        if(arcsMatrix[vertexUID][toVertexUID].size > 0) {
            nextVertices.add(Number(toVertexUID));
        }
    }

    return nextVertices;
}

/**
 * 
 * @param {VertexUID} fromVertexUID 
 * @param {VertexUID} toVertexUID 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 * @returns {Set<number>}
 */
export function getArcsBetween(fromVertexUID, toVertexUID, arcsMatrix) {
    return arcsMatrix[fromVertexUID]?.[toVertexUID] || new Set();
}


/**
 * 
 * @param {VertexUID} currentVertexUID 
 * @param {Set<VertexUID>} visitedVertices 
 * @param {ArcMap} arcMap 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 */
export function findAllLoopingArcs(currentVertexUID, visitedVertices, arcsMatrix) {
    const loopingArcs = new Set();

    const nextVertices = getNextVertices(currentVertexUID, arcsMatrix);
    visitedVertices.add(currentVertexUID);

    for(const vertexUID of nextVertices) {
        if(vertexUID === currentVertexUID) continue; // ignore self-loops

        if(visitedVertices.has(vertexUID)) {
            const arcs = getArcsBetween(currentVertexUID, vertexUID, arcsMatrix);
            for(const arcUID of arcs) loopingArcs.add(arcUID);
            continue;
        }

        const nextLoopingArcs = findAllLoopingArcs(vertexUID, new Set(visitedVertices), arcsMatrix);
        for(const loopingArc of nextLoopingArcs) {
            loopingArcs.add(loopingArc);
        }
    }

    return loopingArcs;
}


/**
 * 
 * @param {VertexUID} currentVertexUID 
 * @param {Set<VertexUID>} visitedVertices 
 * @param {ArcMap} arcMap 
 * @param {ArcsAdjacencyMatrix} arcsMatrix 
 */
export function findAllVertexCycles(currentVertexUID, vertexPath, arcsMatrix) {
    const vertexCycles = [];

    const nextVertices = getNextVertices(currentVertexUID, arcsMatrix);
    vertexPath.push(currentVertexUID);

    for(const vertexUID of nextVertices) {
        if(vertexUID === currentVertexUID) continue; // ignore self-loops

        if(vertexPath.includes(vertexUID)) { 
            // Found cycle (with looping arc/s)
            const vertexCycle = [...vertexPath.slice(vertexPath.lastIndexOf(vertexUID)), vertexUID];
            vertexCycles.push(vertexCycle);
            continue;
        }

        const nextCycles = findAllVertexCycles(vertexUID, [...vertexPath], arcsMatrix);
        for(const vertexCycle of nextCycles) {
            vertexCycles.push(vertexCycle);
        }
    }

    return vertexCycles;
}

export function findAllArcCycles(sourceVertexUID, arcsMatrix) {
    const vertexCycles = findAllVertexCycles(sourceVertexUID, [], arcsMatrix);
    const arcCycles = [];

    for(const vertexCycle of vertexCycles) {
        let arcCyclePartials = [ [] ];

        for(let i = 0; i < vertexCycle.length - 1; i++) {
            const fromVertexUID = vertexCycle[i];
            const toVertexUID = vertexCycle[i+1];
            const arcs = arcsMatrix[fromVertexUID][toVertexUID];

            const tmpArcCyclePartials = [];
            for(const arcCyclePartial of arcCyclePartials) {
                for(const arcUID of arcs) {
                    tmpArcCyclePartials.push([...arcCyclePartial, arcUID]);
                }
            }

            arcCyclePartials = tmpArcCyclePartials;
        }

        arcCycles.push(...arcCyclePartials);
    }

    return arcCycles;
}


/**
 * 
 * @param {string} str 
 * @param {number} maxLength 
 */
export function ellipsize(str, maxLength) {
    if(str.length <= maxLength) return str;

    return str.substring(0, maxLength - 3) + "...";
}


/**
 * 
 * @param {Vertex} vertex 
 * @returns {boolean}
 */
export function isVertexAnObject(vertex) {
    return [ "boundary", "entity" ].includes(vertex.type);
}

export async function instantiateTemplate(path) {
    const response = await fetch(path);
    const rawHTML = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHTML, 'text/html');
    const template = doc.querySelector("template");
    return template.content.cloneNode(true).firstElementChild;
}
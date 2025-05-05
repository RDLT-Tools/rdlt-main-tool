import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, findAllArcCycles, findAllRBSPaths, getIncidentArcs, getIncomingArcs, getOutgoingArcs, isInbridge, vertexHasIncomingArcs } from "../utils.mjs";

/**
 * @typedef {number} ArcUID
 * @typedef {number} VertexUID
 * @typedef {{ uid: ArcUID, fromVertexUID: number, toVertexUID: number, C: string, L: number }} Arc
 * @typedef {{ uid: ArcUID, type: "boundary" | "entity" | "controller", isRBSCenter: boolean }} Vertex
 * 
 * @param {Vertex[]} vertices 
 * @param {Arc[]} arcs 
 * 
 * @returns {{ vertexUIDs: Set<VertexUID>, arcUIDs: Set<ArcUID>, abstractArcs: Arc[] }}
 */
export function performVertexSimplificationLevel1(vertices, arcs) {
    const chosenVertices = new Set();
    const chosenArcs = new Set();

    const vertexMap = buildVertexMap(vertices);
    const arcMap = buildArcMap(arcs);
    const arcsMatrix = buildArcsAdjacencyMatrix(arcs);
    const rbsMatrix = buildRBSMatrix(vertexMap, arcs);

    /** @type {{ [rbsCenterUID: number]: Set<number> }} */
    const gatewayVertices = {};

    for(const vertex of vertices) {
        const rbsCenterUID = rbsMatrix[vertex.uid];
        // Include a vertex if it does not belong to an RBS
        if(!rbsCenterUID) {
            chosenVertices.add(vertex.uid);
            continue;
        }

        if(!(rbsCenterUID in gatewayVertices)) gatewayVertices[rbsCenterUID] = new Set();


        // Include if vertex is in an RBS and has inbridge/outbridge
        const incidentArcs = getIncidentArcs(vertex.uid, arcsMatrix);
        for(const arcUID of incidentArcs) {
            const arc = arcMap[arcUID];
            if(rbsMatrix[arc.toVertexUID] !== rbsCenterUID || 
                rbsMatrix[arc.fromVertexUID] !== rbsCenterUID) {
                gatewayVertices[rbsCenterUID].add(vertex.uid);
                chosenVertices.add(vertex.uid);
                continue;
            }
        }

    }

    for(const arc of arcs) {
        // Ignore arcs that are inside an RBS
        if(rbsMatrix[arc.fromVertexUID] && rbsMatrix[arc.fromVertexUID] === rbsMatrix[arc.toVertexUID]) continue;
        
        // Add arc if its vertices are within simplified version and is not within an RBS
        if(chosenVertices.has(arc.fromVertexUID) && chosenVertices.has(arc.toVertexUID)) {
            chosenArcs.add(arc.uid);
        }
    }

    // Add abstract arcs
    const abstractArcs = [];

    const source = findSource(chosenVertices, arcsMatrix);
    const arcCycles = findAllArcCycles(source, arcsMatrix);
    const partCycles = getPartCycles({ arcCycles, rbsMatrix, arcMap });
    const inbridges = getInbridges({ arcMap, rbsMatrix });
    const rbsArcCycles = getRBSArcCycles({ arcCycles, rbsMatrix, arcMap });

    const cache = {
        arcsMatrix, arcMap, arcCycles, rbsMatrix, partCycles, inbridges, rbsArcCycles
    };
    for(const rbsCenterUID in gatewayVertices) {
        const vertexUIDs = [...gatewayVertices[rbsCenterUID]];

        // Go through all pairs of gateway vertices (directed)
        for(let i = 0; i < vertexUIDs.length; i++) {
            for(let j = 0; j < vertexUIDs.length; j++) {
                const startVertexUID = vertexUIDs[i];
                const endVertexUID = vertexUIDs[j];
                const arcPaths = findAllRBSPaths(startVertexUID, endVertexUID, null, null, cache);

                for(const arcPath of arcPaths) {
                    const L = calcAbstractArcL(arcPath, cache);
                    abstractArcs.push({
                        fromVertexUID: startVertexUID,
                        toVertexUID: endVertexUID,
                        L, C: "",
                    });
                }
            }
        }
    }
    
    return { vertexUIDs: chosenVertices, arcUIDs: chosenArcs, abstractArcs };
}

export function getRBSArcCycles(cache) {
    const { arcCycles, rbsMatrix } = cache;
    const rbsArcCycles = [];

    for(const arcCycle of arcCycles) {
        const firstArcRBS = rbsMatrix[arcCycle[0]];
        if(!firstArcRBS) continue;

        if(arcCycle.every(aUID => isArcinRBS(aUID, firstArcRBS, cache))) {
            rbsArcCycles.push(arcCycle);
        }
    }

    return rbsArcCycles;

}

export function calcRU(arcUID, cache, rbsCenterUID = null) {
    const { arcCycles, arcMap } = cache;

    let cycles;
    if(rbsCenterUID) {
        // If RBS is specified, only include cycles within RBS
        cycles = arcCycles.filter(c => 
            c.includes(arcUID) && c.every(aUID => isArcinRBS(aUID, rbsCenterUID, cache))
        );
    } else {
        cycles = arcCycles.filter(c => c.includes(arcUID));
    }

    if(cycles.length === 0) { return 0; }

    let cumulativeRU = 0;
    for(const c of cycles) {
        if(c.some(aUID => !isArcinRBS(aUID, rbsCenterUID, cache))) continue;   

        let minL = Infinity;
        for(const aUID of c) {
            minL = Math.min(minL, arcMap[aUID].L);
        }

        cumulativeRU += minL;
    }

    return cumulativeRU;
}

export function findSource(vertexUIDs, arcsMatrix) {
    for(const vertexUID of vertexUIDs) {
        if(!vertexHasIncomingArcs(vertexUID, arcsMatrix)) {
            return vertexUID;
        }
    }

    return [...vertexUIDs][0];
}

function calcRU2(arcUID, cache) {
    const { arcMap } = cache;

    const B = getArcRBS(arcUID, cache);
    if(!B) return 0;

    if(isArcCritical(arcUID, cache, true)) {
        return arcMap[arcUID].L;
    }


    return calcRU(arcUID, cache, B);
}

export function calcERU(arcUID, cache) {
    const { inbridges, arcMap, partCycles: allPartCycles } = cache;

    const B = getArcRBS(arcUID, cache);
    if(!B) return calcRU(arcUID, cache);

    let sum = 0;
    const arcRU2 = calcRU2(arcUID, cache);

    for(const ibArcUID of inbridges) {
        const partCycles = allPartCycles.filter(
            c => c.includes(arcUID) && c.includes(ibArcUID)
        );

        let l = arcMap[ibArcUID].L;
        for(const cycle of partCycles) {
            // Get L value of PCA
            const outsideArcs = cycle.filter(aUID => !isArcinAnyRBS(aUID, cache));
            const PCA_L = Math.min(...outsideArcs.map(aUID => arcMap[aUID].L));
            l = Math.min(l, PCA_L);
        }

        sum += l * (arcRU2 + 1);
    }

    return sum;

}

export function calcAbstractArcL(arcPath, cache) {
    if(arcPath.length === 0) return 1;

    let minERU = Infinity;
    for(const arcUID of arcPath) {
        const eRU = calcERU(arcUID, cache);
        minERU = Math.min(minERU, eRU);
    }

    return minERU + 1;
}

function isArcinRBS(arcUID, rbsCenterUID, cache) {
    const { rbsMatrix, arcMap } = cache;

    const arc = arcMap[arcUID];
    return rbsMatrix[arc.fromVertexUID] === rbsCenterUID
        && rbsMatrix[arc.toVertexUID] === rbsCenterUID;
}

function isArcCritical(arcUID, cache, onlyRBSCycles = false) {
    const { arcCycles, rbsArcCycles, arcMap } = cache;
    const arcL = arcMap[arcUID].L;

    const cycles = onlyRBSCycles ? rbsArcCycles : arcCycles;

    for(const arcCycle of cycles) {
        if(arcCycle.includes(arcUID)) {
            let tmpIsCritical = true;
            for(const otherArcUID of arcCycle) {
                if(arcL > arcMap[otherArcUID].L) {
                    tmpIsCritical = false;
                    break;
                }
            }

            if(tmpIsCritical) return true;
        }
    }

    return false;
}

function isArcinAnyRBS(arcUID, cache) {
    const { rbsMatrix, arcMap } = cache;

    const arc = arcMap[arcUID];
    return rbsMatrix[arc.fromVertexUID] && 
        rbsMatrix[arc.fromVertexUID] === rbsMatrix[arc.toVertexUID];
}

export function getArcRBS(arcUID, cache) {
    const { rbsMatrix, arcMap } = cache;

    const arc = arcMap[arcUID];
    const fromRBS = rbsMatrix[arc.fromVertexUID]
    const isInsideRBS = (fromRBS && fromRBS === rbsMatrix[arc.toVertexUID]);
    return isInsideRBS ? fromRBS : null;
}

export function getPartCycles(cache) {
    const { arcCycles } = cache;

    const partCycles = [];
    for(const arcCycle of arcCycles) {
        let hasArcInsideRBS = false;
        let hasArcOutsideRBS = false;

        for(const arcUID of arcCycle) {
            if(isArcinAnyRBS(arcUID, cache)) {
                hasArcInsideRBS = true;
            } else {
                hasArcOutsideRBS = true;
            }

            if(hasArcInsideRBS && hasArcOutsideRBS) {
                partCycles.push(arcCycle);
                break;
            }
        }
    }

    return partCycles;
}

export function getInbridges(cache) {
    const { arcMap, rbsMatrix } = cache;

    const inbridges = new Set();

    for(let _arcUID in arcMap) {
        const arcUID = Number(_arcUID);
        if(isInbridge(arcUID, arcMap, rbsMatrix)) {
            inbridges.add(arcUID);
        }
    }

    return inbridges;
}
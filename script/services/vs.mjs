import { buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, findAllRBSPaths, getIncidentArcs, getIncomingArcs, getOutgoingArcs } from "../utils.mjs";

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
        if(chosenVertices.has(arc.fromVertexUID) && chosenVertices.has(arc.toVertexUID)) {
            chosenArcs.add(arc.uid);
        }
    }

    // Add abstract arcs
    const abstractArcs = [];
    const cache = { vertexMap, arcMap, arcsMatrix, rbsMatrix };
    for(const rbsCenterUID in gatewayVertices) {
        const vertexUIDs = [...gatewayVertices[rbsCenterUID]];

        // Go through all pairs of gateway vertices (directed)
        for(let i = 0; i < vertexUIDs.length; i++) {
            for(let j = 0; j < vertexUIDs.length; j++) {
                if(i === j) continue;

                const startVertexUID = vertexUIDs[i];
                const endVertexUID = vertexUIDs[j];
                const arcPaths = findAllRBSPaths(startVertexUID, endVertexUID, null, cache);

                for(const arcPath of arcPaths) {
                    // Only consider path whose length is at least 2
                    if(arcPath.length < 2) continue;
                    
                    const minL = Math.min(...arcPath.map(arcUID => arcMap[arcUID].L));
                    abstractArcs.push({
                        fromVertexUID: startVertexUID,
                        toVertexUID: endVertexUID,
                        C: "",
                        L: minL
                    });
                }
            }
        }
    }
    
    return { vertexUIDs: chosenVertices, arcUIDs: chosenArcs, abstractArcs };
}


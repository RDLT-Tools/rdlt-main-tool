
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

    for(const vertex of vertices) {
        chosenVertices.add(vertex.uid);
    }

    for(const arc of arcs) {
        chosenArcs.add(arc.uid)
    }

    return { vertexUIDs: chosenVertices, arcUIDs: chosenArcs, abstractArcs: [] };
}
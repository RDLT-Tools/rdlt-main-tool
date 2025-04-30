
/**
 * @typedef {number} ArcUID
 * @typedef {number} VertexUID
 * 
 * @typedef {{ 
 *      vertices: { uid, identifier, type }[],
 *      arcs: { uid, fromVertexUID, toVertexUID, C, L }[] 
 * }} Model 
 * 
 * @typedef {{
 *      vertexMap: import("../utils.mjs").VertexMap,
 *      arcMap: import("../utils.mjs").ArcMap,
 *      arcsMatrix: import("../utils.mjs").ArcsAdjacencyMatrix,
 *      rbsMatrix: import("../utils.mjs").RBSMatrix
 * }} Cache
 */

import { areTypeAlikeIncoming, buildArcMap, buildArcsAdjacencyMatrix, buildRBSMatrix, buildVertexMap, findAllLoopingArcs, getIncomingArcs, getSetsUnion } from "../utils.mjs";


/** 
 * @param {Model} model 
 * @param {Cache} cache
 * */
export function getPODs(cache) {
    const { vertexMap } = cache;

    const podSet = new Set();

    for(const vertexUID in vertexMap) {
        if(isVertexPOD(vertexUID, cache)) podSet.add(vertexUID);
    }

    return podSet;
}

/** 
 * @param {number} vertexUID 
 * @param {Cache} cache
 * @returns {boolean}
 * */
export function isVertexPOD(vertexUID, cache) {
    const { arcMap, arcsMatrix, rbsMatrix } = cache;
    const incomingArcs = [...getIncomingArcs(vertexUID, arcsMatrix)];

    // Compare every two incoming arcs
    //   If a pair are type-alike and differs in C-attribute, add vertex as POD
    for(let i = 0; i < incomingArcs.length - 1; i++) {
        for(let j = i+1; j < incomingArcs.length; j++) {
            const arc1UID = incomingArcs[i];
            const arc2UID = incomingArcs[j];
            const arc1 = arcMap[arc1UID];
            const arc2 = arcMap[arc2UID];
            
            if(areTypeAlikeIncoming(arc1UID, arc2UID, arcMap, rbsMatrix)
                && arc1.C.trim() !== arc2.C.trim()) {
                return true;
            }
        }
    }

    return false;
}


/**
 * 
 * @param {Model} model 
 * @param {VertexUID} source
 * @param {Cache} cache 
 */
export function getPOSs(source, cache) {
    const { arcMap, arcsMatrix } = cache;

    const posSet = new Set([ source ]);
    const loopingArcs = findAllLoopingArcs(source, new Set(), arcsMatrix);

    for(const loopingArc of loopingArcs) {
        const arc = arcMap[loopingArc];
        if(!arc) continue;

        posSet.add(arc.toVertexUID);
    }

    return posSet;
}


/**
 * 
 * @param {{ [timestep: number]: Set<ArcUID> }[]} profiles 
 * @returns {Set<ArcUID>}
 */
export function getSharedResources(profiles) {
    const countedArcs = new Set();
    const sharedArcs = new Set();

    for(const profile of profiles) {
        const profileArcs = getSetsUnion(...Object.values(profile));

        for(const arcUID of profileArcs) {
            if(countedArcs.has(arcUID)) sharedArcs.add(arcUID);
            else countedArcs.add(arcUID);
        }
    }

    return sharedArcs;
}
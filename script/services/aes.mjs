/* 
Service Module for the Activity Extraction Simulation 
Developed by Honneluv Labanan (2025)

This is a modified version of the activity extraction (AE) algorithm from Malinao (2017),
which supports iterative execution of AE, where various steps such as 
exploration, checking, and traversal may be performed over separate iterations.
*/

import { areTypeAlikeIncoming, getIncomingArcs, getOutgoingArcs, isEpsilon, isOutbridge, isVertexAnObject } from "../utils.mjs";
import { isVertexPOD } from "./poi.mjs";

/**
 * @typedef {number} ArcUID
 * @typedef {number} VertexUID
 * @typedef {{ uid: ArcUID, fromVertexUID: number, toVertexUID: number, C: string, L: number }} Arc
 * @typedef {{ uid: ArcUID, type: "boundary" | "entity" | "controller", isRBSCenter: boolean }} Vertex
 * 
 * @typedef {{ [vertexUID: number]: Vertex }} VertexMap 
 * @typedef {{ [arcUID: number]: Arc }} ArcMap 
 * @typedef {{ [fromVertexUID: number]: { [toVertexUID: number]: Set<ArcUID> } }} ArcsAdjacencyMatrix
 * 
 * @typedef {{ [arcUID: number]: number[] }} T
 * @typedef {{ [arcUID: number]: number[] }} CTIndicator - whether traversed (2), checked (1), or neither (0)
 * 
 * @typedef {{ [vertexUID: number]: { 
 *      T_reached: Set<number>, 
 *      T_condition_satisfied: { 
 *          arcUID: number,  
 *          checkedTime: number
 *      }[] } }} TimelinessOfResponse 
 * 
 * @typedef {{ [vertexUID: number]: number }} VertexTimesteps
 * @typedef {VertexUID[]} TraversedPath
 * @typedef {{ [timeStep: number]: Set<ArcUID> }} ActivityProfile
 * @typedef {{ [vertexUID: number]: VertexUID }} RBSMatrix
 * 
 * @typedef {{ 
 *  vertexUID: number, 
 *  arcUID: number, 
 * }} RoutineArgs
 * 
 * @typedef {{ 
 *  arcs: Arc[],
 *  arcMap?: ArcMap,  
 *  vertexMap?: VertexMap,
 *  arcsMatrix: ArcsAdjacencyMatrix,
 *  rbsMatrix: RBSMatrix
 * }} Cache
 * 
 * @typedef {{ 
 *  T: T,
 *  CTIndicator: CTIndicator,
 *  path: TraversedPath,
 *  activityProfile: ActivityProfile,
 *  tor: TimelinessOfResponse
 * }} States
 */



/**
 * This routine is executed at the following points:
 * (1) As AE starts
 * (2) After a traversal
 * (3) After a backtrack
 * 
 * At the end of this routine, a list of outgoing arcs is returned.
 * These are arcs which may be explored, whose number of traversals 
 * have not yet reach the maximum (L) and was not previously checked.
 * 
 * 
 * @param {RoutineArgs} args
 * @param {States} states
 * @param {Cache} cache
 * @returns {Set<ArcUID>}
 */
export function iterateAtVertex(args, states, cache) {
    const { vertexUID } = args;
    const { CTIndicator } = states;
    const { arcsMatrix, arcMap } = cache;

    const explorableArcs = new Set();
    const allOutgoingArcs = getOutgoingArcs(vertexUID, arcsMatrix);

    for(const arcUID of allOutgoingArcs) {
        const arc = arcMap[arcUID];
        const hasExceededTraversalLimit = getArcTraversals(arcUID, CTIndicator) >= arc.L;
        const wasPreviouslyChecked = isArcPreviouslyChecked(arcUID, CTIndicator);

        if(!hasExceededTraversalLimit && !wasPreviouslyChecked) {
            explorableArcs.add(arcUID);
        }
    }

    return explorableArcs;
}

/**
 * This routine is executed after an arc has been chosen to be explored.
 * The following will be performed:
 *  1. Update T (add new traversal checked time)
 *  2. Determine whether arc is unconstrained
 * 
 * The response of this routine is a boolean, whether the arc is unconstrained.
 * 
 * @param {RoutineArgs} args 
 * @param {States} states
 * @param {Cache} cache
 * @returns {boolean}
 */
export function checkArc(args, states, cache) {
    const { arcUID } = args;
    const { T, CTIndicator } = states;
    const { arcMap, arcsMatrix } = cache;

    const arc = arcMap[arcUID];

    // 1. Update T
    if(!(arcUID in T)) T[arcUID] = [];
    if(!(arcUID in CTIndicator)) CTIndicator[arcUID] = [];
    const previousIncomingArcs = getIncomingArcs(arc.fromVertexUID, arcsMatrix);

    const checkedTime = getMaxT(previousIncomingArcs, T) + 1;
    T[arcUID].push(checkedTime);
    CTIndicator[arcUID].push(1);

    // 2. Determine whether arc is unconstrained
    const neighboringArcs = getIncomingArcs(arc.toVertexUID, arcsMatrix);
    neighboringArcs.delete(arcUID);

    // 2.1. The C values of all neighboring arcs are either epsilon or equal to current arc
    let areNeighborCsEqualOrEpsilons = true;
    for(const neighborArcUID of neighboringArcs) {
        const neighborArc = arcMap[neighborArcUID];
        
        const isEqualC = (neighborArc.C === arc.C);

        if(!isEqualC && !isEpsilon(neighborArc)) {
            areNeighborCsEqualOrEpsilons = false;
            break;
        }
    }

    // 2.2. Non-epsilon neighboring arcs have already been checked ahead (# of check/traversals is greater or equal)
    let areNeighborsCheckedAhead = true;
    const currentArcCTs = getArcChecksOrTraversals(arcUID, CTIndicator);
    for(const neighborArcUID of neighboringArcs) {
        const neighborArc = arcMap[neighborArcUID];

        // Ignore neighbor arc if C is epsilon or the same as arc
        if(isEpsilon(neighborArc) || arc.C === neighborArc.C) continue;
        
        const neighborArcCTs = getArcChecksOrTraversals(neighborArcUID, CTIndicator);
        const wasCheckedAhead = neighborArcCTs >= currentArcCTs;

        if(!wasCheckedAhead) {
            areNeighborsCheckedAhead = false;
            break;
        }
    }

    // 2.3. Arc C is epsilon and every non-epsilon neighbor has been checked before
    let isArcEpsilonAndNeighborsCheckedBefore = true;
    if(isEpsilon(arc)) {
        for(const neighborArcUID of neighboringArcs) {
            const neighborArc = arcMap[neighborArcUID];
    
            // Ignore neighbor arc if C is epsilon or the same as arc
            if(isEpsilon(neighborArc)) continue;
            
            const neighborArcTraversals = getArcTraversals(neighborArcUID, CTIndicator);
            const wasCheckedBefore = neighborArcTraversals > 0;
    
            if(!wasCheckedBefore) {
                isArcEpsilonAndNeighborsCheckedBefore = false;
                break;
            }
        }
    } else {
        isArcEpsilonAndNeighborsCheckedBefore = false;
    }

    const isUnconstrained = areNeighborCsEqualOrEpsilons 
        || areNeighborsCheckedAhead 
        || isArcEpsilonAndNeighborsCheckedBefore;

    // 3. Register arc for timeliness of response (tor)
    if(isVertexPOD(arc.toVertexUID, cache)) {
        if(!(arc.toVertexUID in states.tor)) {
            states.tor[arc.toVertexUID] = {
                T_reached: new Set(),
                T_condition_satisfied: []
            }
        }
    
        states.tor[arc.toVertexUID].T_condition_satisfied.push({
            arcUID: arc.uid, checkedTime
        });
    }
    
    return isUnconstrained;
}

/**
 * This routine attempts to backtrack to the previous vertex through
 * the last traversed arc. If no such previous vertex is reached, null is returned.
 * 
 * @param {RoutineArgs} args 
 * @param {States} states
 * @param {Cache} cache
 * @returns {VertexUID}
 */
export function backtrack(args, states, cache) {
    const { path } = states;
    if(path.length <= 1) return null;
    path.pop();

    return path[path.length - 1];
}

/**
 * This routine performs traversal on an arc. It performs the following:
 *  1. Get max from checked timesteps
 *  2. Update T of every recently checked incoming arc
 *  3. Update first T of every unchecked arc that is (object -> controller)
 *  4. Push target vertex to traversed path
 *  5. Update activity profile
 *  6. If arc is outbridge, reset states for the RBS exited
 * 
 * 
 * This returns the vertex UID of the reached vertex.
 * 
 * @param {RoutineArgs} args 
 * @param {States} states 
 * @param {Cache} cache
 * @returns {VertexUID}
 */
export function traverseArc(args, states, cache) {
    const { arcUID } = args;
    const { T, CTIndicator, path } = states;
    const { arcs, arcMap, vertexMap, arcsMatrix, rbsMatrix } = cache;

    const arc = arcMap[arcUID];

    // 1. Get max from checked timesteps
    const incomingArcs = getIncomingArcs(arc.toVertexUID, arcsMatrix);
    const maxT = getMaxT(incomingArcs, T);
    const reachableArcs = new Set();

    // 2. Update T of every recently checked incoming arc whose C != epsilon
    for(const incomingArcUID of incomingArcs) {
        // Skip if incoming arc is not type alike with traversed arc
        if(incomingArcUID !== arcUID && !areTypeAlikeIncoming(arcUID, incomingArcUID, arcMap, rbsMatrix)) continue;
        
        // Skip if incoming arc has never been checked previously
        if(!isArcPreviouslyChecked(incomingArcUID, CTIndicator)) continue;

        const incomingArc = arcMap[incomingArcUID];

        const t = T[incomingArcUID];
        t[t.length-1] = maxT;

        const cti = CTIndicator[incomingArcUID];
        cti[cti.length-1] = 2;

        reachableArcs.add(incomingArcUID);
    }

    // 3. Update first T of every unchecked arc that is (object -> controller)
    for(const incomingArcUID of incomingArcs) {
        // Skip if already traversed
        if(getArcTraversals(incomingArcUID, CTIndicator) > 0) continue;

        // Skip if incoming arc is not type alike with traversed arc
        if(incomingArcUID !== arcUID && !areTypeAlikeIncoming(arcUID, incomingArcUID, arcMap, rbsMatrix)) continue;
        
        const incomingArc = arcMap[incomingArcUID];
        if(!isEpsilon(incomingArc)) continue;

        const fromVertex = vertexMap[incomingArc.fromVertexUID];
        const toVertex = vertexMap[incomingArc.toVertexUID];
        if(!(isVertexAnObject(fromVertex) && toVertex.type === "controller")) continue;

        T[incomingArcUID] = [maxT];
        CTIndicator[incomingArcUID] = [2];
        reachableArcs.add(incomingArcUID);
    }

    // 4. Push target vertex to traversed path
    path.push(arc.toVertexUID);

    
    // 5. Update activity profile
    if(!(maxT in states.activityProfile)) states.activityProfile[maxT] = new Set();
    for(const reachableArcUID of reachableArcs) {
        states.activityProfile[maxT].add(reachableArcUID);
    }

    // 6. If arc is outbridge, reset states for the RBS exited
    if(isOutbridge(arcUID, arcMap, rbsMatrix)) {
        const centerUID = rbsMatrix[arc.fromVertexUID];

        for(const arc of arcs) {
            if(rbsMatrix[arc.fromVertexUID] === centerUID
                && rbsMatrix[arc.toVertexUID] === centerUID) {
                T[arc.uid] = [];
                CTIndicator[arc.uid] = [];
            }
        }
    }

    // 7. Register traversal in timeliness of response
    if(isVertexPOD(arc.toVertexUID, cache)) {
        states.tor[arc.toVertexUID].T_reached.add(maxT);
    }

    return arc.toVertexUID;
}



/**
 * 
 * @param {ArcUID} arcUID 
 * @param {CTIndicator} CTIndicator 
 * @returns {boolean}
 */
export function isArcPreviouslyChecked(arcUID, CTIndicator) {
    const CTInd_arc = CTIndicator[arcUID];
    if(!CTInd_arc) return false;

    return CTInd_arc[CTInd_arc.length-1] === 1;
}

/**
 * 
 * @param {ArcUID} arcUID 
 * @param {CTIndicator} CTIndicator 
 * @returns {number}
 */
export function getArcChecksOrTraversals(arcUID, CTIndicator) {
    const CTInd_arc = CTIndicator[arcUID];
    if(!CTInd_arc) return 0;

    return CTInd_arc.reduce((count, cti) => count + ([1,2].includes(cti) ? 1 : 0), 0);
}

/**
 * 
 * @param {ArcUID} arcUID 
 * @param {CTIndicator} CTIndicator 
 * @returns {number}
 */
export function getArcTraversals(arcUID, CTIndicator) {
    const CTInd_arc = CTIndicator[arcUID];
    if(!CTInd_arc) return 0;

    return CTInd_arc.reduce((count, cti) => count + (cti === 2 ? 1 : 0), 0);
}

/**
 * @param {Set<ArcUID>} arcs 
 * @param {T} T 
 * @returns {number}
 */
export function getMaxT(arcs, T) {
    let maxT = 0;
    for(const arcUID of arcs) {
        if(!(arcUID in T)) continue;

        maxT = Math.max(maxT, ...T[arcUID]);
    }

    return maxT;
}

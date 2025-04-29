// create_r2.js

import { Cycle } from './cycle.mjs';

/**
 * Processes the R2 component of an RDLT (Reset‐Bound Subsystem).
 *
 * Given various possible input formats for R2, this function extracts
 * all arcs (except those under an 'R1' key), detects cycles, and assigns
 * an Expanded Reusability (eRU) to each arc: zero for non-cyclic arcs,
 * or the cycle’s minimum l‐attribute for arcs that participate in cycles.
 *
 * @param {Object|Array} R2
 *   Either:
 *     • An object with a top‐level 'R2' key holding an array of arc objects,
 *     • An object whose keys are component names ('R1','R2','R3'…) mapping
 *       to arrays of arc objects,
 *     • An array of such { componentName: [ arcObj, … ] } dictionaries.
 *
 *   Each arc object must contain:
 *     - arc:          "vertexA, vertexB"
 *     - 'c-attribute': string or number
 *     - 'l-attribute': string or number
 *
 * @returns {Array<Object>}
 *   A flat array of processed arc objects:
 *     {
 *       arc: "A, B",
 *       'c-attribute': …,
 *       'l-attribute': …,
 *       eRU:           …  // computed as string
 *     }
 *
 * @throws {Error}
 *   If any required field is missing or invalid.
 */
export function processR2(R2) {
    if (R2 && typeof R2 === 'object' && !Array.isArray(R2) && Array.isArray(R2.R2)) {
        R2 = R2.R2;
    }

    const mergedArcs = [];
    if (Array.isArray(R2)) {
        for (const comp of R2) {
            for (const [key, val] of Object.entries(comp)) {
                if (key !== 'R1') mergedArcs.push(...val);
            }
        }
    } else if (typeof R2 === 'object') {
        for (const [key, val] of Object.entries(R2)) {
            if (key !== 'R1') mergedArcs.push(...val);
        }
    } else {
        throw new Error(`Unsupported R2 format: ${R2}`);
    }

    const arcsList = [], cAttrList = [], lAttrList = [], verticesSet = new Set();
    for (const arcObj of mergedArcs) {
        const { arc, ['c-attribute']: cAttr, ['l-attribute']: lAttr, uid } = arcObj;
        if (!arc || cAttr == null || lAttr == null) {
            throw new Error(`Missing required fields in arc: ${JSON.stringify(arcObj)}`);
        }
        arcsList.push(arc);
        cAttrList.push(cAttr);
        lAttrList.push(lAttr);
        arc.split(', ').forEach(v => verticesSet.add(v));
    }
    const verticesList = Array.from(verticesSet).sort();

    const cycleInstance = new Cycle({ merged: mergedArcs });
    const cycles = cycleInstance.evaluateCycle();

    for (const arcObj of mergedArcs) arcObj.eRU = '0';

    if (cycles && cycles.length) {
        for (const { cycle: cycleArcs } of cycles) {
            const lValues = cycleArcs
                .map(ca => ca.split(': ')[1].trim())
                .map(name => mergedArcs.find(a => a.arc === name))
                .filter(a => a && a['l-attribute'] != null)
                .map(a => parseInt(String(a['l-attribute']).replace(/\D/g, ''), 10))
                .filter(n => !isNaN(n));
            if (!lValues.length) continue;
            const ca = Math.min(...lValues).toString();
            for (const caEntry of cycleArcs) {
                const name = caEntry.split(': ')[1].trim();
                const arcObj = mergedArcs.find(a => a.arc === name);
                if (arcObj) arcObj.eRU = ca;
            }
        }
    }

    // Include UID in R2 arcs
    mergedArcs.forEach((arc, index) => {
        arc.uid = arcsList[index]?.uid || null; // Include UID from the original arcsList
    });

    return mergedArcs;
}

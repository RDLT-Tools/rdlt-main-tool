// create_r1.js

import { AbstractArc } from './abstract.mjs';
import { Cycle } from './cycle.mjs';
import { utils } from './rdlt-utils.mjs';

/**
 * Processes R1 components: extracts arcs, vertices, attributes, and calculates eRU.
 * If R2 exists, abstract arcs are generated from R2 and added to R1.
 * After abstract arcs are added, cycles are detected in R1 and eRU values updated accordingly.
 *
 * @param {string[]} arcsList - List of arc strings (e.g. ["x1, x2", "x2, x3"]).
 * @param {Object[]} R1 - Array of arc objects in R1. Each object has keys 'arc', 'r-id', 'c-attribute', 'l-attribute', 'eRU'.
 * @param {string[]} centersList - List of center vertices for Reset-Bound Subsystems (RBS).
 * @param {string[]} inList - List of in-bridge arcs in RBS (each as "x, y").
 * @param {string[]} outList - List of out-bridge arcs in RBS (each as "x, y").
 * @param {Object[]} R2 - Array of arc objects representing RBS (R2) structure.
 * @returns {Object[]} The updated R1 array, now including any abstract arcs and updated eRU values.
 */
export function ProcessR1(arcsList, R1, centersList, inList, outList, R2) {
    // 1. Prepare containers
    const abstractArcData = [];
    let addedAbstractArcs = [];

    // 2. Extract basic R1 info
    const arcsListR1 = R1.filter(r => r.arc).map(r => r.arc);
    const verticesListR1 = Array.from(
        new Set(arcsListR1.flatMap(arc => arc.split(', ').map(v => v)))
    ).sort();
    const cAttributeListR1 = R1.map(r => r['c-attribute'] || '');
    const lAttributeListR1 = R1.map(r => r['l-attribute'] || '');

    // 3. If R2 exists, generate abstract arcs
    if (R2 && R2.length) {
        const abstract = new AbstractArc(R1, R2, inList, outList, centersList, arcsList);
        let abstractVertices = abstract.findAbstractVertices();
        console.log("Raw abstract vertices:", abstractVertices);

        abstractVertices = abstractVertices.map(v => (typeof v === 'object' && v.identifier ? v.identifier : v));
        console.log("Processed abstract vertices (identifiers only):", abstractVertices);

        let stepA, stepB, finalAbstractArcs;
        try {
            stepA = abstract.makeAbstractArcsStepA(abstractVertices);
            console.log("abstractArcsStepA:", stepA);
        } catch (e) {
            console.error(`Failed Step A: ${e}`);
            return R1;
        }
        try {
            stepB = abstract.makeAbstractArcsStepB(stepA);
            console.log("abstractArcsStepB:", stepB);
        } catch (e) {
            console.error(`Failed Step B: ${e}`);
            return R1;
        }
        try {
            finalAbstractArcs = abstract.makeAbstractArcsStepC(stepB);
            console.log("finalAbstractArcs:", finalAbstractArcs);
        } catch (e) {
            console.error(`Failed Step C: ${e}`);
            return R1;
        }

        // Assign unique r-ids and defaults, mark abstract
        let aIdOffset = 1;
        for (const arc of finalAbstractArcs) {
            if (!arc['r-id']) {
                arc['r-id'] = `A-${aIdOffset++}`;
            }
            arc['c-attribute'] = arc['c-attribute'] ?? '';
            arc['l-attribute'] = arc['l-attribute'] ?? '0';
            arc['eRU'] = arc['eRU'] ?? '0';
            arc['is_abstract'] = true;
            abstractArcData.push({ ...arc });
        }

        // Add to R1
        const initialLength = R1.length;
        R1.push(...abstractArcData);
        addedAbstractArcs = R1.slice(initialLength);
    } else {
        console.log('No R2 provided, skipping abstract arc generation.');
    }

    // 4. Include UID in R1 arcs
    R1.forEach((arc, index) => {
        arc.uid = arcsList[index]?.uid || null; // Include UID from the original arcsList
    });

    // 5. Cycle detection and eRU updates
    const cycleInstance = new Cycle(R1);
    const cycles = cycleInstance.evaluateCycle();
    if (cycles) {
        for (const { cycle: cycleArcs } of cycles) {
            const lValues = [];
            for (const entry of cycleArcs) {
                const [rid, arcName] = entry.split(': ').map(s => s.trim());
                const actualArc = utils.getArcFromRid(rid, R1);
                const match = R1.find(r => r.arc === actualArc);
                if (match && !match.is_abstract) {
                    const l = parseInt(match['l-attribute'] ?? '0', 10);
                    lValues.push(l);
                }
            }
            const ca = lValues.length ? Math.min(...lValues) : null;
            if (ca !== null) {
                for (const entry of cycleArcs) {
                    const [rid, arcName] = entry.split(': ').map(s => s.trim());
                    const actualArc = utils.getArcFromRid(rid, R1);
                    const match = R1.find(r => r.arc === actualArc);
                    if (match && !match.is_abstract) {
                        match.eRU = String(ca);
                    }
                }
            }
        }
    }

    return R1;
}

import { Graph } from '../models/graph.js';
import { SoundnessCriteria } from './soundness-criteria.js';
import { GraphOperations } from './graph-operations.js';
import { utils } from './rdlt-utils.mjs';
import { Cycle } from './cycle.mjs';
import { TestJoins } from './joins.mjs';
import { Matrix } from './matrix.mjs';

/**
 * Utility class for verifying soundness properties.
 */
export class Soundness {
    /** 
    * Verifies the relaxed soundness property of an RDLT by checking for
    * weakened proper termination and liveness conditions.
    * @param {Graph} graph - The graph to check.
    * @returns {boolean} - True if the RDLT is relaxed sound, false otherwise.
    */
    static isRelaxedSound(graph) {
        // Check for weakened proper termination condition
        const weakenedProperTermination = SoundnessCriteria.hasProperTermination(graph.activityProfile);
        
        // Check for liveness
        const liveness = SoundnessCriteria.hasLiveness(graph.activityProfile, graph.vertices);

        if (weakenedProperTermination && liveness){
            return true;
        }
        else{
            return false;
        }
    }

    /** 
    * Verifies the classical  soundness property of an RDLT by checking for
    * L-safeness of the RDLT
    * @param {Graph} graph - The graph to check.
    * @param {Object[]} r1 - r1 structure.
    * @param {Object[]} r2 - r2 structure.
    * @returns {boolean} - True if the RDLT is relaxed sound, false otherwise.
    */
    static isClassicalSound(graph, R1, R2) {
        // Pre-processing
        const cycleR1 = new Cycle(R1); // Cycle detection for R1

        //Evaluate the cycle; will populate Cycle_List
        cycleR1.evaluateCycle();

        const cycleListR1 = cycleR1.cycleList; // Get the cycle list for R1

        // Evaluate JOIN conditions and determine the appropriate matrix operations
        console.log("Testing joins in RBS...");
        const check = TestJoins.checkSimilarTargetVertexAndUpdate(R1, R2);

        if(check){
            console.log("All are OR-JOINs, using only R1 data.");

            // Convert to matrix representation of Asoy
            const matrixInstance = new Matrix(R1, cycleListR1);

            let l_safe_vector, matrix;
            // Perform matrix evaluation to determine L-safeness
            ({ l_safe_vector, matrix } = matrixInstance.evaluate());

            console.log(`Matrix evaluation result: (R1 only): ${l_safe_vector === true ? 'RDLT is L-Safe' : 'RDLT is not L-Safe'}`);
            console.log(`Generated Matrix`);
            console.log("|  Arc  |   |x|   |y|  |l|  |c||eRU||cv| |op|  |cycle| |loop||out| |safe|");
            matrixInstance.printMatrix();
            console.log("-".repeat(60));

            // Print result for L-safeness

            if(l_safe_vector){
                console.log("Verification: RDLT is CLASSICAL SOUND");
                return false;
            }
            else{
                console.log("Verification: Needs further verification");
                console.log("-".repeat(60));

                const violations = matrixInstance.getViolations();
                //TODO return violations as well
                return false;
            }
        }
        else{
            console.log("RDLT contains other JOINs. Evaluating both R1 and R2");

            const matrixInstance = new Matrix([R1, R2], cycleListR1);
            

            // Perform matrix operations to determine L-safeness
            let l_safe_vector, matrix;
            ({ l_safe_vector, matrix } = matrixInstance.evaluate());

            console.log(`Matrix evaluation result: (R1 only): ${l_safe_vector === true ? 'RDLT is L-Safe' : 'RDLT is not L-Safe'}`);

            if(l_safe_vector){
                console.log("RDLT is CLASSICAL SOUND");
                return true;
            }
            else{
                console.log("Verification: Needs further verification");
                console.log("-".repeat(60));

                const violations = matrixInstance.getViolations();
                //TODO return violations
                return false;
            }
        }
    }

    /** 
    * Verifies the easy soundness property of an RDLT by checking for
    * the existence of a contraction path from the source to the sink.
    * @param {Graph} graph - The original RDLT.
    * @param {Graph[]} evsa - Collection of vertex-simplified RDLTs.
    * @returns {boolean} - True if the RDLT is easy sound, false otherwise.
    */
    static isEasySound(graph, evsa) {
        console.log("received evsa", evsa); // Debug: Check the received evsa

        for (const rdlt of evsa) {
            // Get the source and sink vertices for the current RDLT
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);

            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return false; // If either source or sink is missing, the graph is not easy sound
            }

            console.log(`Source: ${source.id}, Sink: ${sink.id}`); // Debug: Log source and sink

            // Get the contracted RDLT by applying the graph contraction strategy
            const contractedRDLT = GraphOperations.contractGraph(rdlt, source);
            let rdltClear = false; // Flag to indicate if a contraction path is found for the current RDLT

            // Check if the contracted RDLT has a contraction path from the source to the sink
            for (const vertex of contractedRDLT.vertices) {
                // Split the vertex ID by the underscore to get the merged vertex components (if there are any)
                const mergedVertexIds = vertex.id.split('_');

                // Check if both the source and sink IDs are present in the merged vertex components
                if (mergedVertexIds.includes(source.id) && mergedVertexIds.includes(sink.id)) {
                    console.log(`There is a contraction path from ${source.id} to ${sink.id} in the contracted RDLT.`); // Debug: Path found
                    rdltClear = true; // Set the flag to true if a path is found
                    break; // Exit the loop if a path is found
                }
            }

            if (!rdltClear) {
                return false; // If no contraction path is found in the RDLT, return false
            }
        }

        return true; // Return true if all RDLTs have a contraction path
    }

    /** 
    * Verifies the weak soundness property of an RDLT by checking for
    * the deadlock-tolerance of the RDLT.
    * @param {Graph} graph - The original RDLT.
    * @param {Graph[]} evsa - Collection of vertex-simplified RDLTs.
    * @returns {boolean} - True if the RDLT is easy sound, false otherwise.
    */
    static isWeakSound(graph, evsa) {
        console.log("received evsa", evsa); // Debug: Check the received evsa

        for (const rdlt of evsa) {
            // Get the source and sink vertices for the current RDLT
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);

            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return false; // If either source or sink is missing, the graph is not easy sound
            }

            console.log(`Source: ${source.id}, Sink: ${sink.id}`); // Debug: Log source and sink

            // Get the contracted RDLT by applying the graph contraction strategy
            const contractedRDLT = GraphOperations.contractGraph(rdlt, source);
            let rdltClear = false; // Flag to indicate if a contraction path is found for the current RDLT

            // Check if the contracted RDLT has a contraction path from the source to the sink
            for (const vertex of contractedRDLT.vertices) {
                // Split the vertex ID by the underscore to get the merged vertex components (if there are any)
                const mergedVertexIds = vertex.id.split('_');

                // Check if both the source and sink IDs are present in the merged vertex components
                if (mergedVertexIds.includes(source.id) && mergedVertexIds.includes(sink.id)) {
                    console.log(`There is a contraction path from ${source.id} to ${sink.id} in the contracted RDLT.`); // Debug: Path found
                    rdltClear = true; // Set the flag to true if a path is found
                    break; // Exit the loop if a path is found
                }
            }

            if (!rdltClear) {
                return false; // If no contraction path is found in the RDLT, return false
            }
        }

        return true; // Return true if all RDLTs have a contraction path
    }
}
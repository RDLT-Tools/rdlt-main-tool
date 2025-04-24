import { Graph } from '../models/graph.js';
import { SoundnessCriteria } from './soundness-criteria.js';
import { GraphOperations } from './graph-operations.js';

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
    * Verifies the easy soundness property of an RDLT by checking for
    * the existence of a contraction path from the source to the sink
    * @param {Graph} graph - The original RDLT.
    * @param {Graph[]} evsa - Collection of vertex-simplified RDLTs.
    * @param {Vertex} source - The source vertex
    * @param {Vertex} sink - The sink vertex.
    * @returns {boolean} - True if the RDLT is easy sound, false otherwise.
    */
    static isEasySound(graph, evsa, source, sink) {
        const easySound = true;
        let rdltClear; // Flag to indicate if a contraction path is found for current rdlt structure

        for (const rdlt of evsa) {
            // Get the contracted RDLT by applying the graph contraction strategy
            const contractedRDLT = GraphOperations.contractGraph(rdlt, source);
            rdltClear = false; // Reset the flag for each RDLT

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

            if (rdltClear === false){
                return false; // If no contraction path is found in the RDLT, return false
            }
        }

        return true;
    }
}
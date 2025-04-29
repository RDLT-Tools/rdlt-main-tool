import { Graph } from "../models/Graph.js";
import { GraphOperations } from "./graph-operations.js";

/**
 * Utility class for verifying soundness properties.
 */
export class SoundnessCriteria {
    /**
     * Verifies the liveness property. Checks an input activity profile.
     * @param {ActivityProfile} activityProfile - The activity profile to check.
     * @param {Vertex[]} vertices - The vertices in the graph.
     * @returns {Object} An object containing:
     *   - `pass` {boolean}: Whether the liveness property is satisfied.
     *   - `violations` {Vertex[]}: An array of vertices that are not used in the activity profile.
     */
    static hasLiveness(activityProfile, vertices) {
        // Create a Set to store all unique vertex IDs used in the activity profile
        const usedVertices = new Set();
        const unusedVertices = new Set();

        // Iterate through each activity in the activity profile
        for (const activity of activityProfile.activities) {
            // Iterate through each reachability configuration (Set of vertex pairs)
            for (const configuration of activity.reachabilityConfigurations) {
                // Add each vertex from the configuration to the usedVertices Set
                for (const [from, to] of configuration) {
                    usedVertices.add(from.id);
                    usedVertices.add(to.id);
                }
            }
        }

        console.log("UsedVertices set: ", usedVertices);

        // Check if all input vertices are present in the usedVertices Set
        for (const vertex of vertices) {
            if (!usedVertices.has(vertex.id)) {
                // console.log(`Vertex ${vertex.id} is not used in the activity profile.`); // Debug: Missing vertex
                unusedVertices.add(vertex); // Add to unused vertices Set
            }
        }

        // If there are any unused vertices, return false
        if (unusedVertices.size > 0) {
            console.log(`Liveness check failed. Unused vertices: ${Array.from(unusedVertices).map(v => v.id).join(', ')}`); // Debug: Unused vertices
            return {
                pass: false,
                violations: Array.from(unusedVertices)
            };
        }
        // If all vertices are used, return true
        return {
            pass: true,
            violations: []
        };
    }

    /**
     * Verifies the weakened proper termination property. Checks an input activity profile.
     * Checks for the existence of at least one activity where the last reachability configuration
     * has no unfinished processes.
     * @param {ActivityProfile} activityProfile - The activity profile to check.
     * @returns {Object} An object containing:
     *   - `pass` {boolean}: Whether the weakened proper termination property is satisfied.
     *   - `violations` {Array<Object>}: An array of objects representing invalid vertices that do not satisfy continuity of flow.
     *     Each object contains:
     *       - `vertex` {Vertex}: The invalid vertex.
     *       - `activity` {number}: The activity index (1-based) where the violation occurred.
     *       - `timestep` {number}: The timestep where the violation occurred.
     */
    static hasWeakenedProperTermination(activityProfile) {
        console.log("Checking for weakened proper termination for activity profile: ", activityProfile); // Debug: Start
        let invalidVertices = []; // Array to store vertices that do not satisfy continuity
        
        // Iterate through each activity in the activity profile
        for (const [index, activity] of activityProfile.activities.entries()) {
            console.log("=".repeat(50));
            console.log(`Checking activity #${index + 1} with target vertex: ${activity.target.id}`); // Debug: Activity target

            // Get the last reachability configuration
            const lastConfiguration = activity.reachabilityConfigurations.at(-1); // Use `.at(-1)` to get the last element
            if (!lastConfiguration) {
                console.log(`Activity #${index + 1} has no reachability configurations.`); // Debug: No configurations
                continue; // Skip to the next activity
            }

            console.log(`Last reachability configuration for activity #${index + 1}: `, lastConfiguration); // Debug: Last configuration

            // Check if all "to-vertices" in the last configuration match the target vertex
            const allToVerticesMatchTarget = Array.from(lastConfiguration).every(([from, to]) => {
                console.log(`Checking vertex pair (${from.name}, ${to.name}) for activity #${index + 1}`); // Debug: Vertex pair
                console.log(`to: ${to.id}, target: ${activity.target.id}, comparison result: ${to.id === activity.target.id}`); // Debug: Target comparison
                return to.id === activity.target.id;
            });

            if (!allToVerticesMatchTarget) {
                console.log(`Activity #${index + 1} does not satisfy weakened proper termination.`); // Debug: Failure
                continue; // Skip to the next activity
            }

            // Ensure continuity of flow: "to-vertex" must appear as a "from-vertex" in future configurations
            console.log("Checking if continuity of flow is satisfied..."); // Debug: Continuity check
            let satisfiesContinuity = true;
            for (let timestep = 0; timestep < activity.reachabilityConfigurations.length; timestep++) {
                const currentConfiguration = activity.reachabilityConfigurations[timestep];
                const futureConfigurations = activity.reachabilityConfigurations.slice(timestep + 1);
                console.log("Current timestep:", timestep);
                console.log("Future configurations: ", futureConfigurations); // Debug: Future configurations

                for (const [from, to] of currentConfiguration) {
                    console.log(`Checking vertex pair (${from.name}, ${to.name}) for continuity...`, to); // Debug: Continuity check
                    const isToVertexInFuture = futureConfigurations.some(futureConfig =>
                        Array.from(futureConfig).some(([futureFrom]) => futureFrom.id === to.id)
                    );

                    if (!isToVertexInFuture && to.id !== activity.target.id) {
                        invalidVertices.push({ vertex: to, activity: index + 1, timestep }); // Add to invalid vertices list
                        satisfiesContinuity = false;
                    }
                }
            }

            if (satisfiesContinuity) {
                console.log(`Input activity profile satisfies weakened proper termination through Activity #${index + 1}.`); // Debug: Success
                return {
                    pass: true,
                    violations: invalidVertices
                }; // Found an activity that satisfies the condition
            }
        }

        if (invalidVertices.length > 0) {
            console.log("The following vertices do not satisfy continuity of flow:", invalidVertices); // Debug: List invalid vertices
        }

        console.log("No activity satisfies the weakened proper termination property."); // Debug: Failure
        return {
            pass: false,
            violations: invalidVertices
        }; // No activity satisfies the condition
    }

    /**
     * Verifies the deadlock-resolving property.
     * @param {Graph} rdlt - The RDLT structure to verify the deadlock-resolving property.
     * @param {Vertex[]} deadlockPoints - The deadlock points in the graph.
     * @param {Vertex[]} reachedVertices - The vertices that have been reached in the graph.
     * @param {Vertex} sink - The sink vertex of the RDLT structure.
     * @returns {Object} An object containing:
     *   - `pass` {boolean}: Whether the deadlock-resolving property is satisfied.
     *   - `violations` {Vertex[]}: An array of deadlock points that do not have an escape contraction path.
     */
    static isDeadlockResolving(rdlt, deadlockPoints, reachedVertices, sink) {
        let deadlockResolving = true;
        const violations = [];

        for(const point of deadlockPoints){
            // Get the parent of all deadlock points
            const parent = new Set();
            const incomingEdges = rdlt.edges.filter(edge => edge.to.id === point.id);
            console.log("(deadlock resolving) Incoming edges: ", incomingEdges);

            incomingEdges.forEach(edge => {
                parent.add(edge.from);
            });
            console.log("Parent set: ", parent);

            // Look for an escape contraction path for each reached parent of deadlock points
            let contractionPathFound = false;
            parent.forEach(parentVertex => {
                if(reachedVertices.includes(parentVertex.id)){
                    // Contract graph from the parent
                    const contractedGraph = GraphOperations.contractGraph(rdlt, parentVertex);
                    // console.log("(deadlock resolving) Contracted graph: ", contractedGraph);

                    // Check if the contracted RDLT has a contraction path from the parent to the sink
                    for (const vertex of contractedGraph.vertices) {
                        // Split the vertex ID by the underscore to get the merged vertex components (if there are any)
                        const mergedVertexIds = vertex.id.split('_');
                        // console.log("(deadlock resolving) Merged vertex ids: ", mergedVertexIds);
                        
                        // Check if both the source and sink IDs are present in the merged vertex components
                        if (mergedVertexIds.includes(parentVertex.id) && mergedVertexIds.includes(sink.id)) {
                            console.log(`There is a contraction path from ${parentVertex.id} to ${sink.id} in the contracted RDLT.`);
                            contractionPathFound = true; // Set the flag to true if a path is found
                            break;
                        }
                    }
                }
            });

            if (!contractionPathFound) {
                violations.push(point)
                deadlockResolving = false;
            }
        }

        return{
            pass: deadlockResolving,
            violations
        };
    }
}
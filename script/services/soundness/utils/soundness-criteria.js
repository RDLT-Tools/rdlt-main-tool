/**
 * Utility class for verifying soundness properties.
 */
export class SoundnessCriteria {
    /**
    * Verifies the liveness property. Checks an input activity profile.
    * @param {ActivityProfile} activityProfile - The activity profile to check.
    * @param {Vertex[]} vertices - The vertices in the graph.
    * @returns {boolean} - True if the activity profile is live, false otherwise.
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
                    usedVertices.add(from);
                    usedVertices.add(to);
                }
            }
        }

        // Check if all input vertices are present in the usedVertices Set
        for (const vertex of vertices) {
            if (!usedVertices.has(vertex)) {
                // console.log(`Vertex ${vertex.id} is not used in the activity profile.`); // Debug: Missing vertex
                unusedVertices.add(vertex); // Add to unused vertices Set
            }
        }

        // If there are any unused vertices, return false
        if (unusedVertices.size > 0) {
            console.log(`Liveness check failed. Unused vertices: ${Array.from(unusedVertices).map(v => v.id).join(', ')}`); // Debug: Unused vertices
            return false;
        }
        // If all vertices are used, return true
        return true;
    }

    /**
    * Verifies the proper termination property. Checks an input activity profile.
    * Ensures the last reachability configuration has no unfinished processes in every activity.
    * @param {ActivityProfile} activityProfile - The activity profile to check.
    * @returns {boolean} - True if the activity profile satisfies the proper termination property, false otherwise.
    */
    static hasProperTermination(activityProfile) {
        let invalidVertices = []; // Array to store vertices that do not satisfy continuity

        // Iterate through each activity in the activity profile
        for (const [index, activity] of activityProfile.activities.entries()) {
            console.log(`Checking activity #${index + 1} with target vertex: ${activity.target.id}`); // Debug: Activity target

            // Get the last reachability configuration
            const lastConfiguration = activity.reachabilityConfigurations.at(-1); // Use `.at(-1)` to get the last element
            if (!lastConfiguration) {
                console.log(`Activity #${index + 1} has no reachability configurations.`); // Debug: No configurations
                return false; // If any activity has no configurations, proper termination fails
            }

            console.log(`Last reachability configuration for activity #${index + 1}: `, lastConfiguration); // Debug: Last configuration

            // Check if all "to-vertices" in the last configuration match the target vertex
            const allToVerticesMatchTarget = Array.from(lastConfiguration).every(([from, to]) => {
                console.log(`Checking vertex pair (${from.id}, ${to.id}) for activity #${index + 1}`); // Debug: Vertex pair
                return to === activity.target;
            });

            if (!allToVerticesMatchTarget) {
                console.log(`Activity #${index + 1} does not satisfy proper termination.`); // Debug: Failure
                return false; // If any activity fails the condition, proper termination fails
            }

            // Ensure continuity of flow: "to-vertex" must appear as a "from-vertex" in future configurations
            let satisfiesContinuity = true;
            for (let timestep = 0; timestep < activity.reachabilityConfigurations.length; timestep++) {
                const currentConfiguration = activity.reachabilityConfigurations[timestep];
                const futureConfigurations = activity.reachabilityConfigurations.slice(timestep + 1);

                for (const [from, to] of currentConfiguration) {
                    const isToVertexInFuture = futureConfigurations.some(futureConfig =>
                        Array.from(futureConfig).some(([futureFrom]) => futureFrom === to)
                    );

                    if (!isToVertexInFuture && to.id !== activity.target.id) {
                        invalidVertices.push({ vertex: to.id, activity: index + 1, timestep }); // Add to invalid vertices list
                        satisfiesContinuity = false;
                    }
                }
            }

            if (!satisfiesContinuity) {
                console.log(`Activity #${index + 1} does not satisfy continuity of flow.`); // Debug: Success
                continue; // Skip to the next activity
            }
        }

        if (invalidVertices.length > 0) {
            console.log("The following vertices do not satisfy continuity of flow:", invalidVertices); // Debug: List invalid vertices
            return false; // If any violating vertices are found, proper termination fails
        }

        console.log("All activities satisfy the proper termination property."); // Debug: Success
        return true; // All activities satisfy the condition
    }

    /**
    * Verifies the weakened proper termination property. Checks an input activity profile.
    * Checks for the existence of at least one activity where the last reachability configuration
    * has no unfinished processes.
    * @param {ActivityProfile} activityProfile - The activity profile to check.
    * @returns {boolean} - True if the activity profile satisfies the weakened proper termination property, false otherwise.
    */
    static hasWeakenedProperTermination(activityProfile) {
        let invalidVertices = []; // Array to store vertices that do not satisfy continuity

        // Iterate through each activity in the activity profile
        for (const [index, activity] of activityProfile.activities.entries()) {
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
                console.log(`Checking vertex pair (${from.id}, ${to.id}) for activity #${index + 1}`); // Debug: Vertex pair
                return to === activity.target;
            });

            if (!allToVerticesMatchTarget) {
                console.log(`Activity #${index + 1} does not satisfy weakened proper termination.`); // Debug: Failure
                continue; // Skip to the next activity
            }

            // Ensure continuity of flow: "to-vertex" must appear as a "from-vertex" in future configurations
            let satisfiesContinuity = true;
            for (let timestep = 0; timestep < activity.reachabilityConfigurations.length; timestep++) {
                const currentConfiguration = activity.reachabilityConfigurations[timestep];
                const futureConfigurations = activity.reachabilityConfigurations.slice(timestep + 1);

                for (const [from, to] of currentConfiguration) {
                    const isToVertexInFuture = futureConfigurations.some(futureConfig =>
                        Array.from(futureConfig).some(([futureFrom]) => futureFrom === to)
                    );

                    if (!isToVertexInFuture && to.id !== activity.target.id) {
                        invalidVertices.push({ vertex: to.id, activity: index + 1, timestep }); // Add to invalid vertices list
                        satisfiesContinuity = false;
                    }
                }
            }

            if (satisfiesContinuity) {
                console.log(`Input activity profile satisfies weakened proper termination through Activity #${index + 1}.`); // Debug: Success
                return true; // Found an activity that satisfies the condition
            }
        }

        if (invalidVertices.length > 0) {
            console.log("The following vertices do not satisfy continuity of flow:", invalidVertices); // Debug: List invalid vertices
        }

        console.log("No activity satisfies the weakened proper termination property."); // Debug: Failure
        return false; // No activity satisfies the condition
    }
}
import { Graph } from '../models/Graph.js';
import { SoundnessCriteria } from './soundness-criteria.js';
import { GraphOperations } from './graph-operations.js';
import { utils } from './rdlt-utils.mjs';
import { Cycle } from './cycle.mjs';
import { TestJoins } from './joins.mjs';
import { Matrix } from './matrix.mjs';
import { ActivityProfile } from '../models/ActivityProfile.js';
import { Activity } from '../models/Activity.js';

/**
* Utility class for verifying soundness properties.
*/
export class Soundness {
    /** 
    * Verifies the relaxed soundness property of an RDLT by checking for
    * weakened proper termination and liveness conditions.
    * @param {Graph} graph - The graph to check.
    * @param {Graph} evsa - The vertex-simplified RDLTs to check.
    * @returns {boolean} - True if the RDLT is relaxed sound, false otherwise.
    */
    static checkRelaxedSound(graph, evsa) {

        const livenessViolations = [], weakenedPTViolations = [];
        for(const rdlt of evsa) {
            // Clear activity profiles array of the graph object
            rdlt.activityProfiles = [];

            console.log("input graph for the relaxed soundness check: ", rdlt);
            // Get the source and sink vertices for the current RDLT
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);
                
            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return false; // If either source or sink is missing, the graph is not easy sound
            }

            const activities = new Set();

            // Undergo activity extraction to get all cases
            for (let i = 0; i < 20; i++) {
                const activityProfile = rdlt.extractActivityProfile(source.id, sink.id);

                // Serialize the activities array for uniqueness
                const serializedActivities = JSON.stringify(
                    activityProfile.activities.map(slot => Array.from(slot).sort())
                );

                // Add the serialized activities to the set if unique
                if (!activities.has(serializedActivities)) {
                    activities.add(serializedActivities);
                    console.log("Added unique activity profile:", activityProfile);
                } else {
                    console.log("Duplicate activity profile detected. Skipping...");
                }
            }

            console.log("Unique activities:", activities);

            // For every unique activity, check for proper termination and liveness
            let activitiesArray = [];
            for (const serializedActivity of activities) {
                const reachabilityConfigurations = JSON.parse(serializedActivity);
                const activity = new Activity(source, sink, reachabilityConfigurations);

                activitiesArray.push(activity);
            }
            rdlt.activityProfile = new ActivityProfile(source, sink, activitiesArray);

            // Check for weakened proper termination condition
            const weakenedProperTermination = SoundnessCriteria.hasWeakenedProperTermination(rdlt.activityProfile);
            
            // Check for liveness
            const liveness = SoundnessCriteria.hasLiveness(rdlt.activityProfile, rdlt.vertices);
            
            if (!(weakenedProperTermination.pass && liveness.pass)){
                livenessViolations.push(...liveness.violations);
                weakenedPTViolations.push(...weakenedProperTermination.violations);
            }
        }

        if(weakenedPTViolations.length > 0 || livenessViolations.length > 0){
            return {
                pass: false, 
                message: "Relaxed Soundness Check was inconclusive",
                description: "The given RDLT did not satisfy relaxed soundness checks. Therefore more verification is needed.",
                violations: {
                    weakenedPTViolations,
                    livenessViolations
                },
                criteria: [
                    {   
                        pass: !(weakenedPTViolations.length > 0),
                        description: weakenedPTViolations.length > 0 
                        ? "Weakened Proper Termination: Not Satisfied" 
                        : "Weakened Proper Termination: Satisfied"
                    },
                    {   
                        pass: !(livenessViolations.length > 0),
                        description: livenessViolations.length > 0 
                        ? "Liveness: Not Satisfied" 
                        : "Liveness: Satisfied"
                    }
                ]
            };
        }
        else{
            return {
                pass: true, 
                message: "The model is Relaxed Sound",
                description: "The given RDLT satisfied relaxed soundness checks. Therefore it is relaxed sound."
            };
        }
    }
    
    /**
    * Verifies the classical soundness property of an RDLT by checking for
    * L-safeness based on the cycle structure and join conditions of the RDLT.
    *
    * @param {Graph} graph - The graph to check.
    * @param {Object[]} R1 - the Level-1 vertex-simplified RDLT.
    * @param {Object[]} R2 - the Level-2 vertex-simplified RDLT.
    * @returns {{
    *   pass: boolean,
    *   message: string,
    *   description: string,
    *   violations?: Object[]
    * }} An object indicating the result of the classical soundness check:
    * - `pass`: `true` if the RDLT is classical sound (L-safe), `false` if more verification is needed.
    * - `message`: a general message about the result.
    * - `description`: a more descriptive message about the result.
    * - `violations` (optional): if the RDLT fails L-safeness, this field contains an array of violation details
    *   as determined by `matrixInstance.getViolations()`.
    */
    static checkClassicalSound(graph, R1, R2) {
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
            ({ l_safe_vector, matrix } = matrixInstance.evaluateLSafeness());
            
            console.log(`Matrix evaluation result: (R1 only): ${l_safe_vector === true ? 'RDLT is L-Safe' : 'RDLT is not L-Safe'}`);
            console.log(`Generated Matrix`);
            console.log("|  Arc  |   |x|   |y|  |l|  |c||eRU||cv| |op|  |cycle| |loop||out| |safe|");
            matrixInstance.printMatrix();
            console.log("-".repeat(60));
            
            // Print result for L-safeness
            
            if(l_safe_vector){
                console.log("Verification: RDLT is CLASSICAL SOUND");
                return {
                    pass: true, 
                    message: "The model is Classical Sound", 
                    description: "The model has satisfied L-safeness checks and therefore is classical sound.",
                    criteria: [
                        {   
                            pass: true,
                            description: "JOIN-Safeness: Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness: Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness: Satisfied" 
                        }
                    ]
                };
            }
            else{
                console.log("Verification: Needs further verification");
                console.log("-".repeat(60));
                
                const violations = matrixInstance.getViolations();
                return {
                    pass: false, 
                    violations, 
                    message: "Classical Soundness check was inconclusive", 
                    description: "The model has not satisfied L-safeness checks and therefore needs further verification.",
                    criteria: [
                        {   
                            pass: matrixInstance.checkIfAllPositive("join"),
                            description: matrixInstance.checkIfAllPositive("join") 
                            ? "JOIN-Safeness: Satisfied" 
                            : "JOIN-Safeness: Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("loop"),
                            description: matrixInstance.checkIfAllPositive("loop")
                            ? "LOOP-Safeness: Satisfied" 
                            : "LOOP-Safeness: Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("safe"),
                            description: matrixInstance.checkIfAllPositive("safe")
                            ? "Safeness: Satisfied" 
                            : "Safeness: Not Satisfied"
                        }
                    ]
                };
            }
        }
        else{
            console.log("RDLT contains other JOINs. Evaluating both R1 and R2");
            
            const matrixInstance = new Matrix([R1, R2], cycleListR1);
            
            // Perform matrix operations to determine L-safeness
            let l_safe_vector, matrix;
            ({ l_safe_vector, matrix } = matrixInstance.evaluateLSafeness());
                        
            console.log(`Matrix evaluation result: (R1 only): ${l_safe_vector === true ? 'RDLT is L-Safe' : 'RDLT is not L-Safe'}`);
            
            if(l_safe_vector){
                console.log("RDLT is CLASSICAL SOUND");
                return {
                    pass: true, 
                    message: "The model is Classical Sound", 
                    description: "The model has satisfied L-safeness checks and therefore is classical sound.",
                    criteria: [
                        {   
                            pass: true,
                            description: "JOIN-Safeness: Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness: Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness: Satisfied" 
                        }
                    ]
                };
            }
            else{
                console.log("Verification: Needs further verification");
                console.log("-".repeat(60));
                
                const violations = matrixInstance.getViolations();
                return {
                    pass: false,
                    violations, 
                    message: "Classical Soundness check was inconclusive", 
                    description: "The model has not satisfied L-safeness checks and therefore needs further verification.",
                    criteria: [
                        {   
                            pass: matrixInstance.checkIfAllPositive("join"),
                            description: matrixInstance.checkIfAllPositive("join") 
                            ? "JOIN-Safeness: Satisfied" 
                            : "JOIN-Safeness: Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("loop"),
                            description: matrixInstance.checkIfAllPositive("loop")
                            ? "LOOP-Safeness: Satisfied" 
                            : "LOOP-Safeness: Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("safe"),
                            description: matrixInstance.checkIfAllPositive("safe")
                            ? "Safeness: Satisfied" 
                            : "Safeness: Not Satisfied"
                        }
                    ]
                };
            }
        }
    }
    
    /** 
    * Verifies the easy soundness property of an RDLT by checking for
    * the existence of a contraction path from the source to the sink.
    * @param {Graph} graph - The original RDLT.
    * @param {Graph[]} evsa - Collection of vertex-simplified RDLTs.
    * @returns {{
    *   pass: boolean,
    *   message: string,
    *   description: string,
    *   violations?: Object[]
    * }} An object indicating the result of the easy soundness check:
    * - `pass`: `true` if the RDLT is easy sound, `false` if more verification is needed.
    * - `message`: a general message about the result.
    * - `description`: a more descriptive message about the result.
    * - `violations` (optional): if the RDLT does not have a contraction path from
    * source to sink, this field contains an array of violation details
    */
    static checkEasySound(graph, evsa) {
        console.log("received evsa", evsa); // Debug: Check the received evsa

        for (const rdlt of evsa) {
            // Get the source and sink vertices for the current RDLT
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);

            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return {
                    pass: false,
                    message: "Easy Soundness Check was inconclusive",
                    description: "Source or sink vertex is missing in the graph.",
                    violations: []
                };
            }

            // Get the contracted RDLT by applying the graph contraction strategy
            const contractedRDLT = GraphOperations.contractGraph(rdlt, source);
            let rdltClear = false; // Flag to indicate if a contraction path is found for the current RDLT
            const reachableVertices = new Set(); // Track reachable vertices
            const blockingVertices = []; // Track blocking vertices

            // Check if the contracted RDLT has a contraction path from the source to the sink
            for (const vertex of contractedRDLT.vertices) {
                // Split the vertex ID by the underscore to get the merged vertex components (if there are any)
                const mergedVertexIds = vertex.id.split('_');

                // Add all reachable vertices to the set
                if(mergedVertexIds.includes(source.id)){
                    mergedVertexIds.forEach(id => reachableVertices.add(id));
                }

                // Check if both the source and sink IDs are present in the merged vertex components
                if (mergedVertexIds.includes(source.id) && mergedVertexIds.includes(sink.id)) {
                    console.log(`There is a contraction path from ${source.id} to ${sink.id} in the contracted RDLT.`); // Debug: Path found
                    rdltClear = true; // Set the flag to true if a path is found
                    break; // Exit the loop if a path is found
                }
            }

            // Identify blocking vertices (vertices not reachable from the source)
            for (const vertex of rdlt.vertices) {
                if (!reachableVertices.has(vertex.id) && vertex.id !== sink.id) {
                    blockingVertices.push(vertex);
                }
            }

            // If no contraction path is found, return the blocking vertices as violations
            if (!rdltClear) {
                return {
                    pass: false,
                    message: "Easy Soundness Check was inconclusive",
                    description: "There was no contraction path from the source to the sink. Therefore, further verification is needed to verify easy soundness.",
                    violations: blockingVertices.map(vertex => ({
                        id: vertex.id,
                    })),
                    criteria: [
                        {   
                            pass: false, 
                            description: "Contraction Path From Source to Sink: Not Satisfied" 
                        }
                    ]
                }; // If no contraction path is found in the RDLT, return false
            }
        }

        return {
            pass: true,
            message: "The model is Easy Sound",
            description: "A contraction path from the source to the sink was found. Therefore, the given RDLT is easy sound.",
            violations: [],
            criteria: [
                {   
                    pass: true, 
                    description: "Contraction Path From Source to Sink: Satisfied" 
                }
            ]
        }; // Return true if all RDLTs have a contraction path
    }
    
    /** 
    * Verifies the weak soundness property of an RDLT by checking for
    * the deadlock-tolerance of the RDLT.
    * @param {Graph} graph - The original RDLT.
    * @param {Graph[]} evsa - Collection of vertex-simplified RDLTs.
    * @param {Object} matrixInput - the RDLT & EVSA representation objects in readable format for matrix operations of Asoy 
    * @returns {{
    *   pass: boolean,
    *   message: string,
    *   description: string,
    *   violations?: Object[]
    * }} An object indicating the result of the weak soundness check:
    * - `pass`: `true` if the RDLT is weak sound, `false` if more verification is needed.
    * - `message`: a general message about the result.
    * - `description`: a more descriptive message about the result.
    * - `violations` (optional): if the RDLT failed weak soundness check, this field contains an array of violation details
    */
    static checkWeakSound(graph, evsa, matrixInput) {
        const violations = [];

        // Pre-processing for Asoy's matrix operations
        const cycleR1 = new Cycle(matrixInput.R1); // Cycle detection for R1
        
        //Evaluate the cycle; will populate Cycle_List
        cycleR1.evaluateCycle();
        
        const cycleListR1 = cycleR1.cycleList; // Get the cycle list for R1
        
        // Evaluate JOIN conditions and determine the appropriate matrix operations
        console.log("Testing joins in RBS...");
        const check = TestJoins.checkSimilarTargetVertexAndUpdate(matrixInput.R1, matrixInput.R2);

        let safeCA_loopSafeNCA;
        if(check){
            console.log("All are OR-JOINs, using only R1 data.");
            
            // Convert to matrix representation of Asoy
            const matrixInstance = new Matrix(matrixInput.R1, cycleListR1);
            
            let pass, matrix;
            // Perform matrix evaluation to determine L-safeness
            ({ pass, matrix } = matrixInstance.evaluateSafeLoopSafe());
            
            console.log(`Matrix evaluation result: (R1 only): ${pass === true ? 'NCAs are loop-safe and CAs are safe' : 'NCAs are not loop-safe or CAs are not safe'}`);
            console.log(`Generated Matrix`);
            console.log("|  Arc  |   |x|   |y|  |l|  |c||eRU||cv| |op|  |cycle| |loop||out| |safe|");
            matrixInstance.printMatrix();
            console.log("-".repeat(60));
            
            // Print result for L-safeness
            safeCA_loopSafeNCA = false;
        }

        let deadlockResolving, alldeadlockResolving = true;
        for(const rdlt of evsa){
            // Get the source and sink vertices for the current RDLT
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);
            
            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return false; // If either source or sink is missing, the graph is not easy sound
            }

            // console.log(`Source: ${source.id}, Sink: ${sink.id}`); // Debug: Log source and sink

            const {deadlockPoints, reachedVertices} = GraphOperations.gatherDeadlockPoints(rdlt, source);
            
            // console.log("Deadlock points: ", deadlockPoints);

            // Check for deadlock resolving
            deadlockResolving = SoundnessCriteria.isDeadlockResolving(rdlt, deadlockPoints, reachedVertices, sink);
            console.log("Deadlock resolving result: ", deadlockResolving);
            if(!deadlockResolving.pass){
                alldeadlockResolving = false;
                violations.push([...deadlockResolving.violations]);
            }
        }

        let pass, message, description;
        // Format outputs
        if( alldeadlockResolving && safeCA_loopSafeNCA){
            pass = true;
            message = "The model is Weak Sound";
            description = "The given RDLT passed deadlock-tolerance checks. Therefore it is Weak Sound.";
        }
        else{
            pass = false;
            message = "Weak sound verification is inconclusive",
            description = "The given RDLT is did not pass deadlock-tolerance checks. Therefore more verification is needed."
        }

        return {
            pass,
            message,
            description,
            violations
        };
    }
}
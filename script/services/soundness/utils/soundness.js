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

        const livenessViolations = [], weakenedPTViolations = [], criteria = [];;
        let level = 1; // Initialize level for the EVSA
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
            for (let i = 0; i < 50; i++) {
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
            
            if (!(weakenedProperTermination.pass && liveness.pass)) {
                // Add level information to liveness violations
                liveness.violations.forEach(violation => {
                    livenessViolations.push({
                        ...violation,
                        level: `L${level}` // Add the level information
                    });
                });

                // Add level information to weakened proper termination violations
                weakenedProperTermination.violations.forEach(violation => {
                    weakenedPTViolations.push({
                        ...violation,
                        level: `L${level}` // Add the level information
                    });
                });

                criteria.push({
                    pass: weakenedProperTermination.pass,
                    description: weakenedProperTermination.pass ? 
                    `Weakened Proper Termination (L${level}): Satisfied` :
                    `Weakened Proper Termination (L${level}): Not Satisfied`
                });

                criteria.push({
                    pass: liveness.pass,
                    description: liveness.pass ? 
                    `Liveness (L${level}): Satisfied` :
                    `Liveness (L${level}): Not Satisfied`
                });
            }

            level++;
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
                        ? "Weakened Proper Termination (R): Not Satisfied" 
                        : "Weakened Proper Termination (R): Satisfied"
                    },
                    {   
                        pass: !(livenessViolations.length > 0),
                        description: livenessViolations.length > 0 
                        ? "Liveness (R): Not Satisfied" 
                        : "Liveness (R): Satisfied"
                    },
                    ...criteria
                ]
            };
        }
        else{
            return {
                pass: true, 
                message: "The model is Relaxed Sound",
                description: "The given RDLT satisfied relaxed soundness checks. Therefore it is relaxed sound.",
                criteria:[
                    {   
                        pass: true,
                        description: "Weakened Proper Termination (R): Satisfied"
                    },
                    {   
                        pass: true,
                        description: "Liveness (R): Satisfied"
                    },
                    ...criteria
                ]
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
                            description: "JOIN-Safeness (R): Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness (R): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness (R): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "JOIN-Safeness (L1): Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness (L1): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness (L1): Satisfied" 
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
                            ? "JOIN-Safeness (R): Satisfied" 
                            : "JOIN-Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("loop"),
                            description: matrixInstance.checkIfAllPositive("loop")
                            ? "LOOP-Safeness (R): Satisfied" 
                            : "LOOP-Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("safe"),
                            description: matrixInstance.checkIfAllPositive("safe")
                            ? "Safeness (R): Satisfied" 
                            : "Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("join"),
                            description: matrixInstance.checkIfAllPositive("join") 
                            ? "JOIN-Safeness (L1): Satisfied" 
                            : "JOIN-Safeness (L1): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("loop"),
                            description: matrixInstance.checkIfAllPositive("loop")
                            ? "LOOP-Safeness (L1): Satisfied" 
                            : "LOOP-Safeness (L1): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("safe"),
                            description: matrixInstance.checkIfAllPositive("safe")
                            ? "Safeness (L1): Satisfied" 
                            : "Safeness (L1): Not Satisfied"
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
                        
            console.log(`Matrix evaluation result: (R1 and R2): ${l_safe_vector === true ? 'RDLT is L-Safe' : 'RDLT is not L-Safe'}`);
            
            if(l_safe_vector){
                console.log("RDLT is CLASSICAL SOUND");
                return {
                    pass: true, 
                    message: "The model is Classical Sound", 
                    description: "The model has satisfied L-safeness checks and therefore is classical sound.",
                    criteria: [
                        {   
                            pass: true,
                            description: "JOIN-Safeness (R): Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness (R): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness (R): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "JOIN-Safeness (L1 & L2): Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness (L1 & L2): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness (L1 & L2): Satisfied" 
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
                            ? "JOIN-Safeness (R): Satisfied" 
                            : "JOIN-Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("loop"),
                            description: matrixInstance.checkIfAllPositive("loop")
                            ? "LOOP-Safeness (R): Satisfied" 
                            : "LOOP-Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: matrixInstance.checkIfAllPositive("safe"),
                            description: matrixInstance.checkIfAllPositive("safe")
                            ? "Safeness (R): Satisfied" 
                            : "Safeness (R): Not Satisfied"
                        },
                        {   
                            pass: true,
                            description: "JOIN-Safeness (L1 & L2): Satisfied"
                        },
                        {   
                            pass: true,
                            description: "LOOP-Safeness (L1 & L2): Satisfied" 
                        },
                        {   
                            pass: true,
                            description: "Safeness (L1 & L2): Satisfied" 
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

        let level = 1;
        const criteria = [], violations = []; // Store criteria details per level
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
                const mergedVertexIds = vertex.id.split('_');

                // Add all reachable vertices to the set
                if (mergedVertexIds.includes(source.id)) {
                    mergedVertexIds.forEach(id => reachableVertices.add(id));
                }

                // Check if both the source and sink IDs are present in the merged vertex components
                if (mergedVertexIds.includes(source.id) && mergedVertexIds.includes(sink.id)) {
                    console.log(`There is a contraction path from ${source.id} to ${sink.id} in the contracted RDLT.`);
                    rdltClear = true;
                    break;
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
                violations.push(...blockingVertices.map(vertex => ({
                    id: vertex.id,
                    level: `L${level}` // Append level to the message
                })));

                criteria.push({
                    pass: false,
                    description: `Contraction Path From Source to Sink (L${level}): Not Satisfied`
                });
            }
            else{
                criteria.push({
                    pass: true,
                    description: `Contraction Path From Source to Sink (L${level}): Satisfied`
                });
            }

            level++; // Increment the level for the next EVSA
        }

        if(violations.length > 0){
            return {
                pass: false,
                message: "Easy Soundness Check was inconclusive",
                description: "There was no contraction path from the source to the sink. Therefore, further verification is needed to verify easy soundness.",
                violations,
                criteria: [
                    {
                        pass: false, 
                        description: "Contraction Path From Source to Sink (R): Satisfied" 
                    },
                    ...criteria
                ]
            }; // Return true if all RDLTs have a contraction path
        }
        else{
            return {
                pass: true,
                message: "The model is Easy Sound",
                description: "A contraction path from the source to the sink was found. Therefore, the given RDLT is easy sound.",
                violations: [],
                criteria: [
                    {   
                        pass: true, 
                        description: "Contraction Path From Source to Sink (R): Satisfied" 
                    },
                    ...criteria
                ]
            }; // Return true if all RDLTs have a contraction path
        }
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
        const violations = []; // Store violation details, messages, and types
        const criteria = []; // Store criteria details per level

        // Pre-processing for Asoy's matrix operations
        const cycleR1 = new Cycle(matrixInput.R1); // Cycle detection for R1
        cycleR1.evaluateCycle(); // Evaluate the cycle
        const cycleListR1 = cycleR1.cycleList; // Get the cycle list for R1

        // Evaluate JOIN conditions and determine the appropriate matrix operations
        console.log("Testing joins in RBS...");
        const check = TestJoins.checkSimilarTargetVertexAndUpdate(matrixInput.R1, matrixInput.R2);

        // Check for safe CA and loop-safe NCA
        let safeCA_loopSafeNCA = true, matrixViolations = [];
        if (check) {
            console.log("All are OR-JOINs, using only R1 data.");
            const matrixInstance = new Matrix(matrixInput.R1, cycleListR1);
            const { pass } = matrixInstance.evaluateSafeLoopSafe();
            if (!pass){
                safeCA_loopSafeNCA = false;
                matrixViolations = matrixInstance.getSafeLoopSafeViolations();
                criteria.push({
                    pass: false,
                    description: "Safe CA and Loop-Safe NCA (L1): Not Satisfied"
                });
            }
            else{
                criteria.push({
                    pass: true,
                    description: "Safe CA and Loop-Safe NCA (L1): Satisfied"
                });
            }
        } else {
            console.log("RDLT contains other JOINs. Evaluating both R1 and R2");
            const matrixInstance = new Matrix([matrixInput.R1, matrixInput.R2], cycleListR1);
            const { pass } = matrixInstance.evaluateSafeLoopSafe();
            
            if (!pass){
                safeCA_loopSafeNCA = false;
                matrixViolations = matrixInstance.getSafeLoopSafeViolations();
                criteria.push({
                    pass: false,
                    description: "Safe CA and Loop-Safe NCA (L1 & L2): Not Satisfied"
                });
            }
            else{
                criteria.push({
                    pass: false,
                    description: "Safe CA and Loop-Safe NCA (L1 & L2): Satisfied"
                });
            }
        }

        if (matrixViolations.length > 0) {
            console.log("Formatting matrix violations...");
            matrixViolations.forEach(violation => {
                // Determine the level based on the r-id
                const level = violation['r-id'].startsWith("R1") ? "L1" : "L2";

                // Append the level to the message
                violations.push({
                    id: violation.arc, // Map the "arc" field to the "id"
                    message: `${violation.type} (${level})`, // Append the level to the type
                    type: "asoy-edge"
                });
            });
        }

        // Checking for deadlock resolving
        let alldeadlockResolving = true, weakenedJoinSafe = true;
        let deadlockPoints = [], reachedVertices = [], level = 1;
        for (const rdlt of evsa) {
            const { source, sink } = utils.getSourceAndSinkVertices(rdlt);
            if (!source || !sink) {
                console.warn("Source or sink vertex not found in the graph.");
                return false;
            }

            ({ deadlockPoints, reachedVertices } = GraphOperations.gatherDeadlockPoints(rdlt, source));
            const deadlockResolving = SoundnessCriteria.isDeadlockResolving(rdlt, deadlockPoints, reachedVertices, sink);
            if (!deadlockResolving.pass) {
                alldeadlockResolving = false;
                deadlockResolving.violations.forEach(violation => {
                    violations.push({
                        id: violation.id,
                        message: `${violation.message} (L${level})`, // Append level to the message
                        type: "vertex"
                    });
                });

                criteria.push({
                    pass: false,
                    description: `Deadlock-Resolving (L${level}): Not Satisfied` // Append level to the description
                })
            }
            else{
                criteria.push({
                    pass: true,
                    description: `Deadlock-Resolving (L${level}): Satisfied` // Append level to the description
                })
            }

            // Checking for Weakened JOIN-Safe L values
            console.log("Checking weakened join l-safe for deadlock points: ", deadlockPoints);
            for (const deadlock of deadlockPoints) {
                const incomingArcs = rdlt.edges.filter(edge => edge.to.id === deadlock.id);
                let weakenedJoinSafeForThisDeadlock = true; // Track if weakened JOIN-safe L-values are satisfied for this deadlock

                if (incomingArcs.length !== 2) {
                    weakenedJoinSafeForThisDeadlock = false;
                    violations.push({
                        id: deadlock.id,
                        message: `Deadlock point does not have exactly two incoming arcs. (L${level})`, // Append level
                        type: "vertex"
                    });
                } else {
                    const joinVertex1 = incomingArcs[0].from;
                    const joinVertex2 = incomingArcs[1].from;

                    // Criterion 1: Shared split origin
                    const splitOrigin = GraphOperations.findUniqueSplitOrigin(rdlt, joinVertex1, joinVertex2, deadlock);
                    if (splitOrigin === null) {
                        weakenedJoinSafeForThisDeadlock = false;
                        violations.push({
                            id: deadlock.id,
                            message: `No shared split origin found for the deadlock point. (L${level})`, // Append level
                            type: "vertex"
                        });
                    } else {
                        const pathU = GraphOperations.findSimplePath(rdlt, splitOrigin, joinVertex1);
                        const pathV = GraphOperations.findSimplePath(rdlt, splitOrigin, joinVertex2);

                        if (!pathU) {
                            weakenedJoinSafeForThisDeadlock = false;
                            violations.push({
                                id: joinVertex1.id,
                                message: `No unique simple path found from split origin to join vertex. (L${level})`, // Append level
                                type: "vertex"
                            });
                        } else {
                            pathU.push(deadlock);
                        }

                        if (!pathV) {
                            weakenedJoinSafeForThisDeadlock = false;
                            violations.push({
                                id: joinVertex2.id,
                                message: `No unique simple path found from split origin to join vertex. (L${level})`, // Append level
                                type: "vertex"
                            });
                        } else {
                            pathV.push(deadlock);
                        }

                        // Criterion 2: No Unrelated Processes
                        if (pathU && pathV && (!GraphOperations.noInterruptions(rdlt, pathU) || !GraphOperations.noInterruptions(rdlt, pathV))) {
                            weakenedJoinSafeForThisDeadlock = false;
                            violations.push({
                                id: deadlock.id,
                                message: `Unrelated processes detected on one or both paths. (L${level})`, // Append level
                                type: "vertex"
                            });
                        }

                        // Criterion 3: No branching out
                        if (pathU && pathV && (!GraphOperations.noBranchingOut(rdlt, pathU) || !GraphOperations.noBranchingOut(rdlt, pathV))) {
                            weakenedJoinSafeForThisDeadlock = false;
                            violations.push({
                                id: deadlock.id,
                                message: `Branching out detected on one or both paths. (L${level})`, // Append level
                                type: "vertex"
                            });
                        }

                        // Criterion 5: Duplicate Values
                        if (incomingArcs[0].constraint !== "" && incomingArcs[1].constraint !== "") {
                            const checkDuplicateConditions = GraphOperations.checkDuplicateValues(incomingArcs[0], incomingArcs[1], rdlt);
                            if (!checkDuplicateConditions.pass) {
                                weakenedJoinSafeForThisDeadlock = false;
                                for (const violation of checkDuplicateConditions.violations) {
                                    violations.push({
                                        id: `${violation.from}, ${violation.to}`,
                                        message: `Duplicate constraint values not satisfied. (L${level})`, // Append level
                                        type: "edge"
                                    });
                                }
                            }
                        }

                        // Criterion 6: AND-Join L-Value Match
                        if (incomingArcs[0].constraint !== "" && incomingArcs[1].constraint !== "") {
                            if (incomingArcs[0].maxTraversals !== incomingArcs[1].maxTraversals) {
                                weakenedJoinSafeForThisDeadlock = false;
                                violations.push({
                                    id: `${incomingArcs[0].from.id}, ${incomingArcs[0].to.id}`,
                                    message: `L-values for AND-Join do not match. (L${level})`, // Append level
                                    type: "edge"
                                }, {
                                    id: `${incomingArcs[1].from.id}, ${incomingArcs[1].to.id}`,
                                    message: `L-values for AND-Join do not match. (L${level})`, // Append level
                                    type: "edge"
                                });
                            }
                        }
                    }
                }

                // Add to criteria if weakened JOIN-safe L-values are not satisfied for this deadlock
                if (!weakenedJoinSafeForThisDeadlock) {
                    weakenedJoinSafe = false;
                    criteria.push({
                        pass: false,
                        description: `Weakened JOIN-Safe L-Values (L${level}): Not Satisfied` // Append level to the description
                    });
                }
                else{
                    criteria.push({
                        pass: true,
                        description: `Weakened JOIN-Safe L-Values (L${level}): Satisfied` // Append level to the description
                    });
                }
            }
            level++;
        }

        let pass, message, description;
        if (alldeadlockResolving && safeCA_loopSafeNCA && weakenedJoinSafe) {
            pass = true;
            message = "The model is Weak Sound";
            description = "The given RDLT passed deadlock-tolerance checks. Therefore it is Weak Sound.";
        } else {
            pass = false;
            message = "Weak sound verification is inconclusive";
            description = "The given RDLT did not pass deadlock-tolerance checks. Therefore more verification is needed.";
        }
        console.log("Violations: ", violations);
        return {
            pass,
            message,
            description,
            criteria:[
                {   
                    pass: safeCA_loopSafeNCA,
                    description: safeCA_loopSafeNCA
                            ? "Safe CA and Loop-Safe NCA (R): Satisfied" 
                            : "Safe CA and Loop-Safe NCA (R): Not Satisfied"
                },
                {   
                    pass: alldeadlockResolving,
                    description: alldeadlockResolving
                            ? "Deadlock-Resolving (R): Satisfied" 
                            : "Deadlock-Resolving (R): Not Satisfied"
                },
                {   
                    pass: weakenedJoinSafe,
                    description: weakenedJoinSafe
                            ? "Weakened JOIN-Safe L-Values (R): Satisfied" 
                            : "Weakened JOIN-Safe L-Values (R): Not Satisfied"
                },
                ...criteria
            ],
            violations
        };
    }
}
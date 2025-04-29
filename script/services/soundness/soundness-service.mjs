// import { spawn } from 'child_process';
import { VertexType } from './models/VertexType.js';
import {isInbridge, isOutbridge, buildArcMap, buildRBSMatrix, buildVertexMap} from '../../utils.mjs';
import { Vertex } from './models/Vertex.js';
import { Edge } from './models/Edge.js';
import { ResetBoundSubsystem } from './models/ResetBoundSubsystem.js';
import { ProcessR1 } from './utils/create_r1.mjs';
import { InputRDLT } from './utils/input-rdlt.mjs';
import { Activity } from './models/Activity.js';
import { Graph } from './models/Graph.js';
import { Soundness } from './utils/soundness.js';
import { GraphOperations } from './utils/graph-operations.js';
import { processR2 } from './utils/create_r2.mjs';
import { utils } from './utils/rdlt-utils.mjs';

function getInBridges(model, arcMap, vertexMap) {
    
    console.log("arcMap:", arcMap);
    console.log("vertexMap:", vertexMap);
    
    const rbsMatrix = buildRBSMatrix(vertexMap, model.arcs);
    
    console.log("rbsMatrix:", rbsMatrix);
    
    const inBridgesUIDs = new Set();
    const inBridges = new Set(); // Set to collect "fromVertexIdentifier, toVertexIdentifier" strings
    
    for (const arc of model.arcs) {
        if (isInbridge(arc.uid, arcMap, rbsMatrix)) {
            inBridgesUIDs.add(arc.uid); // Collect UIDs of in-bridge arcs
        }
    }
    
    console.log("UIDs of in-bridge arcs:", inBridgesUIDs);
    
    // Map UIDs to their corresponding "fromVertexIdentifier, toVertexIdentifier" and add to inBridges
    for (const uid of inBridgesUIDs) {
        const arc = arcMap[uid]; // Retrieve the arc using the UID
        const fromVertex = vertexMap[arc.fromVertexUID]; // Retrieve the "from" vertex
        const toVertex = vertexMap[arc.toVertexUID]; // Retrieve the "to" vertex
        
        if (fromVertex && toVertex) {
            const entry = `${fromVertex.identifier}, ${toVertex.identifier}`;
            inBridges.add(entry); // Add the formatted string to the inBridges set
        }
    }
    
    return inBridges;
}

function getOutBridges(model, arcMap, vertexMap) {
    
    const rbsMatrix = buildRBSMatrix(vertexMap, model.arcs);
    const outBridgesUIDs = new Set();
    const outBridges = new Set(); // Set to collect "fromVertexIdentifier, toVertexIdentifier" strings
    
    for (const arc of model.arcs) {
        if (isOutbridge(arc.uid, arcMap, rbsMatrix)) {
            outBridgesUIDs.add(arc.uid); // Collect UIDs of out-bridge arcs
        }
    }
    
    console.log("UIDs of out-bridge arcs:", outBridgesUIDs);
    
    // Map UIDs to their corresponding "fromVertexIdentifier, toVertexIdentifier" and add to outBridges
    for (const uid of outBridgesUIDs) {
        const arc = arcMap[uid]; // Retrieve the arc using the UID
        const fromVertex = vertexMap[arc.fromVertexUID]; // Retrieve the "from" vertex
        const toVertex = vertexMap[arc.toVertexUID]; // Retrieve the "to" vertex
        
        if (fromVertex && toVertex) {
            const entry = `${fromVertex.identifier}, ${toVertex.identifier}`;
            outBridges.add(entry); // Add the formatted string to the outBridges set
        }
    }
    
    return outBridges;
}

function mapGUIModelToSoundness(model, source, sink){
    const arcMap = buildArcMap(model.arcs);
    const vertexMap = buildVertexMap(model.components);

    const inVertices = getInBridges(model, arcMap, vertexMap);
    const outVertices = getOutBridges(model, arcMap, vertexMap);
    
    console.log("model:", model);
    console.log("inVertices:", inVertices);
    console.log('outVertices:', outVertices);
    
    const input_rdlt = new InputRDLT(model, inVertices, outVertices);
    const evsa = input_rdlt.evaluate();
    let R2;
    if(input_rdlt.centersList.length === 0){
        R2 = [];
    }
    else{
        R2 = processR2(evsa.Rs);
    }
    
    console.log("rdlt:", input_rdlt);
    console.log("evsa:", evsa);
    
    const R1 = ProcessR1(input_rdlt.model.arcs, evsa.R1.R1, input_rdlt.centersList, input_rdlt.in_list, input_rdlt.out_list, R2);
    
    console.log("R1:", R1);
    console.log("R2:", R2);
    
    const { rdltGraph, r2Graphs, r1Graph } = mapToGraphs(input_rdlt, R2, R1);
    console.log("rdltGraph:", rdltGraph);
    console.log("r2Graphs:", r2Graphs);
    console.log("r1Graph:", r1Graph);
    
    let combinedEvsa;
    if(r2Graphs.length > 0){
        combinedEvsa = [r1Graph, ...r2Graphs.map(item => item.graph)];
    }
    else{
        combinedEvsa = [r1Graph];
    }

    return {rdltGraph, combinedEvsa};
}

export function verifySoundness(model, source, sink, soundnessNotion) {
    console.log({ model, source, sink, soundnessNotion });
    
    const arcMap = buildArcMap(model.arcs);
    const vertexMap = buildVertexMap(model.components);

    const inVertices = getInBridges(model, arcMap, vertexMap);
    const outVertices = getOutBridges(model, arcMap, vertexMap);
    
    console.log("model:", model);
    console.log("inVertices:", inVertices);
    console.log('outVertices:', outVertices);
    
    const input_rdlt = new InputRDLT(model, inVertices, outVertices);
    const evsa = input_rdlt.evaluate();
    let R2;
    if(input_rdlt.centersList.length === 0){
        R2 = [];
    }
    else{
        R2 = processR2(evsa.Rs);
    }
    
    console.log("rdlt:", input_rdlt);
    console.log("evsa:", evsa);
    
    const R1 = ProcessR1(input_rdlt.model.arcs, evsa.R1.R1, input_rdlt.centersList, input_rdlt.in_list, input_rdlt.out_list, R2);
    
    console.log("R1:", R1);
    console.log("R2:", R2);
    
    const { rdltGraph, r2Graphs, r1Graph } = mapToGraphs(input_rdlt, R2, R1);
    console.log("rdltGraph:", rdltGraph);
    console.log("r2Graphs:", r2Graphs);
    console.log("r1Graph:", r1Graph);
    
    let combinedEvsa;
    if(r2Graphs.length > 0){
        combinedEvsa = [r1Graph, ...r2Graphs.map(item => item.graph)];
    }
    else{
        combinedEvsa = [r1Graph];
    }
    
    let soundnessPass, soundnessTitle, soundnessDescription, soundnessCriteria;
    let soundnessViolation = {arcs: [], vertices: []};
    let soundnessViolationRemarks = {arcs: {}, vertices: {}};
    switch(soundnessNotion){
        case 'easy':
            const easyResult = Soundness.checkEasySound(rdltGraph, combinedEvsa);
            // Format output
            soundnessPass = easyResult.pass;
            soundnessTitle = easyResult.message;
            soundnessDescription = easyResult.description;
            soundnessCriteria = easyResult.criteria

            const mappedViolations = mapVerticesToUIDs(easyResult.violations, vertexMap);

            soundnessViolation.vertices = mappedViolations.map(violation => violation.uid);
            for(const violation of mappedViolations) {
                soundnessViolationRemarks.vertices[violation.uid] = "Vertex cannot be used for contraction";
            }

            break;
        case 'classical':
            // Use the structures RDLT structures of Asoy
            const classicalResult = Soundness.checkClassicalSound(input_rdlt, R1, R2);
            console.log("Classical Soundness Result:", classicalResult);
            
            // Format output
            soundnessPass = classicalResult.pass;
            soundnessTitle = classicalResult.message;
            soundnessDescription = classicalResult.description;
            soundnessCriteria = classicalResult.criteria;

            classicalResult.violations.forEach(violation => {
                const transformedArcMap = utils.transformArcMap(arcMap);
                const arcIdentifiers = violation.arc.replace(/[()]/g, '').split(', '); // Extract identifiers (e.g., ["x6", "x9"])
                const fromUID = Object.keys(vertexMap).find(key => vertexMap[key].identifier === arcIdentifiers[0]);
                const toUID = Object.keys(vertexMap).find(key => vertexMap[key].identifier === arcIdentifiers[1]);

                if (!fromUID || !toUID) {
                    console.warn(`No UID found for arc: ${violation.arc}`);
                    return;
                }

                const arcKey = `${fromUID}, ${toUID}`; // Transform to UID-based key
                console.log("arcKey:", arcKey);
                console.log("transformed arc map: ", transformedArcMap);

                const matchingArcs = transformedArcMap[arcKey];

                if (matchingArcs) {
                    // If there are multiple matches, disambiguate using additional attributes
                    const matchedArc = matchingArcs.find(arc =>
                        (!violation['c-attribute'] || arc.C === violation['c-attribute']) &&
                        (!violation['l-attribute'] || arc.L === violation['l-attribute'])
                    );

                    if (matchedArc) {
                        console.log(`Mapped r-id: ${violation['r-id']} to UID: ${matchedArc.uid}`);
                        const violationMessage = violation.violation || ""; // Fallback to an empty string if undefined

                        // Check if the UID is already in soundnessViolation.arcs
                        if (!soundnessViolation.arcs.includes(matchedArc.uid)) {
                            soundnessViolation.arcs.push(matchedArc.uid);
                        }

                        // Check if the UID already exists in soundnessViolationRemarks.arcs
                        if (soundnessViolationRemarks.arcs[matchedArc.uid]) {
                            // Concatenate the new violation message
                            soundnessViolationRemarks.arcs[matchedArc.uid] += `; ${violation.type}: ${violationMessage}`;
                        } else {
                            // Add a new entry
                            soundnessViolationRemarks.arcs[matchedArc.uid] = `${violation.type}: ${violationMessage}`;
                        }
                    } else {
                        console.warn(`No exact match found for arc: ${violation.arc}`);
                    }
                } else {
                    console.warn(`No match found for arc: ${violation.arc}`);
                }
            });
            
            break;
        case 'relaxed':
            console.log("Relaxed Soundness Check");
            // Perform activity extraction to get all possible cases
            const relaxedResult = Soundness.checkRelaxedSound(rdltGraph, combinedEvsa);

            console.log("Violations: ", relaxedResult.violations);

            const mappedWeakenedPTViolations = mapVerticesToUIDs(relaxedResult.violations.weakenedPTViolations, vertexMap);
            const mappedLivenessViolations = mapVerticesToUIDs(relaxedResult.violations.livenessViolations, vertexMap);
            
            // Format output
            soundnessPass = relaxedResult.pass;
            soundnessTitle = relaxedResult.message;
            soundnessDescription = relaxedResult.description;
            soundnessCriteria = relaxedResult.criteria;

            soundnessViolation.vertices = mappedWeakenedPTViolations.map(violation => violation.uid);
            soundnessViolation.vertices = mappedLivenessViolations.map(violation => violation.uid);

            for(const violation of mappedWeakenedPTViolations) {
                soundnessViolationRemarks.vertices[violation.uid] = "Fails Proper Termination";
            }
            for(const violation of mappedLivenessViolations) {
                soundnessViolationRemarks.vertices[violation.uid] = "Vertex is not used in any activity";
            }
            
            console.log("soundness violation vertices: ", soundnessViolation.vertices);
            console.log("soundness violation remarks vertices: ", soundnessViolationRemarks.vertices);
            
            break;
        case 'weak':
            const matrixInput = {
                input_rdlt,
                R1,
                R2
            }; // Group the objects in Asoy's format so we can reuse her matrix operations
            const weakResult = Soundness.checkWeakSound(rdltGraph, combinedEvsa, matrixInput);
            
            // Format output
            soundnessPass = weakResult.pass;
            soundnessTitle = weakResult.message;
            soundnessDescription = weakResult.description;
            break;
    }
    
    return {
        title: "Lorem Ipsum",
        instances: [
            {
                name: "Main Model",
                evaluation: {
                    conclusion: {
                        pass: soundnessPass,
                        title: soundnessTitle,
                        description: soundnessDescription
                    },
                    criteria: soundnessCriteria,
                    violating: {
                        arcs: soundnessViolation.arcs,
                        vertices: soundnessViolation.vertices
                    },
                    violatingRemarks: {
                        arcs: soundnessViolationRemarks.arcs,
                        vertices: soundnessViolationRemarks.vertices
                    },
                },
            }
        ]
        
    };
}

/**
* Maps RDLT, R2, and R1 data to their respective Graph models.
* @param {Object} rdlt - The RDLT model data.
* @param {Object[]} R2 - The R2 data (array of reset-bound subsystems).
* @param {Object[]} R1 - The R1 data (array of arcs).
* @returns {Object} An object containing the mapped Graph models for RDLT, R2, and R1.
*/
function mapToGraphs(rdlt, R2, R1) {
    const rdltGraph = new Graph();
    let r2Graphs; // Array to hold multiple R2 graphs
    const r1Graph = new Graph();

    // Map RDLT to Graph
    if (rdlt && rdlt.model && rdlt.model.components && rdlt.model.arcs) {
        console.log("Mapping RDLT to Graph...");

        // Add vertices with UIDs
        rdlt.model.components.forEach(component => {
            const vertex = new Vertex(
                component.uid, // Use the UID from the original model
                VertexType.ENTITY_OBJECT,
                {}, // Additional attributes can be added here
                component.identifier || '' // Use the identifier
            );
            rdltGraph.addVertex(vertex);
        });

        // Add edges with UIDs
        rdlt.model.arcs.forEach(arc => {
            const fromVertex = rdltGraph.vertices.find(v => v.id === arc.fromVertexUID);
            const toVertex = rdltGraph.vertices.find(v => v.id === arc.toVertexUID);
            const edge = new Edge(
                arc.uid, // Use the UID from the original model
                fromVertex,
                toVertex,
                arc.C,
                arc.L,
                [] // Additional attributes can be added here
            );
            rdltGraph.addEdge(edge);
        });

        // Map Reset-Bound Subsystems (RBS)
        if (rdlt.centersList && rdlt.centersList.length > 0) {
            console.log("Mapping Reset-Bound Subsystems...");
            rdlt.centersList.forEach(centerId => {
                const centerVertex = rdltGraph.vertices.find(v => v.id === centerId.uid);
                if (!centerVertex) {
                    console.error(`Center vertex with ID ${centerId.uid} not found in the graph.`);
                    return;
                }

                // Get members of the RBS (vertices connected to the center)
                const members = rdltGraph.edges
                    .filter(edge => edge.from.id === centerId.uid)
                    .map(edge => (edge.from.id === centerId.uid ? edge.to : edge.from));

                // Get in-bridges (arcs in in_list connected to members)
                const inBridges = rdlt.in_list
                    .map(entry => {
                        const [fromId, toId] = entry.split(', ');
                        const fromVertex = rdltGraph.vertices.find(v => v.name === fromId);
                        const toVertex = rdltGraph.vertices.find(v => v.name === toId);

                        // Find the edge in the graph
                        return rdltGraph.edges.find(edge => edge.from === fromVertex && edge.to === toVertex);
                    })
                    .filter(edge => edge && (members.includes(edge.to) || centerVertex === edge.to));

                // Get out-bridges (arcs in out_list connected to members)
                const outBridges = rdlt.out_list
                    .map(entry => {
                        const [fromId, toId] = entry.split(', ');
                        const fromVertex = rdltGraph.vertices.find(v => v.name === fromId);
                        const toVertex = rdltGraph.vertices.find(v => v.name === toId);
                        return rdltGraph.edges.find(edge => edge.from === fromVertex && edge.to === toVertex);
                    })
                    .filter(edge => edge && members.includes(edge.from));

                // Create and add the ResetBoundSubsystem
                const resetBoundSubsystem = new ResetBoundSubsystem(centerVertex, members, inBridges, outBridges);
                rdltGraph.addResetBoundSubsystem(resetBoundSubsystem);
            });
        }
    }

    // Map R2 to Graphs
    if (R2 && R2.length > 0) {
        console.log("Mapping R2 to Graphs...");

        // Group R2 entries by r_number
        const r2Groups = R2.reduce((groups, arc) => {
            const rNumber = arc['r-id'].split('-')[0]; // Extract r_number from r-id
            if (!groups[rNumber]) {
                groups[rNumber] = [];
            }
            groups[rNumber].push(arc);
            return groups;
        }, {});

        // Create a Graph for each group
        r2Graphs = Object.entries(r2Groups).map(([rNumber, arcs]) => {
            const graph = new Graph();
            console.log(`Creating Graph for R2 group: ${rNumber}`);

            arcs.forEach(arc => {
                const [fromId, toId] = arc.arc.split(', ');
                const fromVertex = graph.vertices.find(v => v.id === fromId) || new Vertex(fromId, VertexType.ENTITY_OBJECT, {}, fromId);
                const toVertex = graph.vertices.find(v => v.id === toId) || new Vertex(toId, VertexType.ENTITY_OBJECT, {}, toId);

                // Add vertices if not already present
                if (!graph.vertices.find(v => v.id === fromId)) graph.addVertex(fromVertex);
                if (!graph.vertices.find(v => v.id === toId)) graph.addVertex(toVertex);

                const edge = new Edge(
                    arc['r-id'], // Use the UID from the processed R2
                    fromVertex,
                    toVertex,
                    arc['c-attribute'],
                    parseInt(arc['l-attribute'], 10),
                    []
                );
                graph.addEdge(edge);
            });

            return { rNumber, graph };
        });

        console.log("Mapped R2 Graphs:", r2Graphs);
    } else {
        r2Graphs = [];
    }

    // Map R1 to Graph
    if (R1 && R1.length > 0) {
        console.log("Mapping R1 to Graph...");
        R1.forEach((arc, index) => {
            const [fromId, toId] = arc.arc.split(', ');
            const fromVertex = r1Graph.vertices.find(v => v.id === fromId) || new Vertex(fromId, VertexType.ENTITY_OBJECT, {}, fromId);
            const toVertex = r1Graph.vertices.find(v => v.id === toId) || new Vertex(toId, VertexType.ENTITY_OBJECT, {}, toId);

            if (!r1Graph.vertices.find(v => v.id === fromId)) r1Graph.addVertex(fromVertex);
            if (!r1Graph.vertices.find(v => v.id === toId)) r1Graph.addVertex(toVertex);

            const edge = new Edge(
                arc['r-id'],
                fromVertex,
                toVertex,
                arc['c-attribute'],
                parseInt(arc['l-attribute'], 10),
                []
            );
            r1Graph.addEdge(edge);
        });
    }

    return { rdltGraph, r2Graphs, r1Graph };
}

export function getDeadlockPoints(model, input_source, input_sink){
    const {rdlt, combinedEvsa} = mapGUIModelToSoundness(model, input_source, input_sink);
    const arcMap = buildArcMap(model.arcs);
    const vertexMap = buildVertexMap(model.components);

    let deadlockPoints = [];
    for(const evsa of combinedEvsa){
        // Get the source and sink vertices for the current RDLT
        const { source, sink } = utils.getSourceAndSinkVertices(evsa);
        
        if (!source || !sink) {
            console.warn("Source or sink vertex not found in the graph.");
            return false; // If either source or sink is missing, the graph is not easy sound
        }

        deadlockPoints.push(...GraphOperations.gatherDeadlockPoints(evsa, source).deadlockPoints);
    }

    // Map deadlock points to objects with an `id` attribute
    const deadlockPointIDs = deadlockPoints.map(deadlockPoint => ({
        id: deadlockPoint.id
    }));

    const mappedVertices = mapVerticesToUIDs(deadlockPointIDs, vertexMap);
    const uids = mappedVertices.map(vertex => vertex.uid).filter(uid => uid !== null); // Filter out null UIDs if necessary

    return uids;
}

function mapVerticesToUIDs(vertices, vertexMap) {
    return vertices.map(vertex => {
        if (!vertex.id) {
            console.warn(`Vertex is missing an 'id' property:`, vertex);
            return { ...vertex, uid: null }; // Return the vertex with a null UID
        }

        // Normalize the ID if necessary (e.g., trim whitespace, convert case)
        const normalizedId = vertex.id.trim();
        const uid = Object.keys(vertexMap).find(key => vertexMap[key].identifier === normalizedId);

        if (uid) {
            return { ...vertex, uid: Number(uid) }; // Add the UID to the vertex object
        } else {
            console.warn(`No UID found for identifier: ${vertex.id}`);
            return { ...vertex, uid: null }; // Add a null UID if not found
        }
    });
}
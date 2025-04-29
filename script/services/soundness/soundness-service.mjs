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


function getInBridges(model) {
    const arcMap = buildArcMap(model.arcs);
    const vertexMap = buildVertexMap(model.components);
    
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

function getOutBridges(model) {
    const arcMap = buildArcMap(model.arcs);
    const vertexMap = buildVertexMap(model.components);
    
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

function getVertexFromID(rdlt, id) {
    return rdlt.vertices.find(vertex => vertex.id === id);
}

function mapGUIModelToSoundness(model, source, sink){
    const inVertices = getInBridges(model);
    const outVertices = getOutBridges(model);
    
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
    
    const inVertices = getInBridges(model);
    const outVertices = getOutBridges(model);
    
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
    
    let soundnessPass, soundnessTitle, soundnessDescription;
    switch(soundnessNotion){
        case 'easy':
            const easyResult = Soundness.checkEasySound(rdltGraph, combinedEvsa);
            // Format output
            soundnessPass = easyResult.pass;
            soundnessTitle = easyResult.message;
            soundnessDescription = easyResult.description;
            break;
        case 'classical':
            // Use the structures RDLT structures of Asoy
            const classicalResult = Soundness.checkClassicalSound(input_rdlt, R1, R2);
            console.log("Classical Soundness Result:", classicalResult.pass);
            
            // Format output
            soundnessPass = classicalResult.pass;
            soundnessTitle = classicalResult.message;
            soundnessDescription = classicalResult.description;
            
            break;
        case 'relaxed':
            console.log("Relaxed Soundness Check");
            // Perform activity extraction to get all possible cases
            const relaxedResult = Soundness.checkRelaxedSound(rdltGraph);

            //TODO placeholders
            soundnessPass = true;
            soundnessTitle = "Lorem Ipsum";
            soundnessDescription = "Lorem ipsum";
            
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
                    criteria: [
                        {
                            pass: true,
                            description: "JOIN-Safe: Not Satisfied."
                        },
                        {
                            pass: false,
                            description: "Loop-Safe NCAs: Satisfied."
                        },
                        {
                            pass: true,
                            description: "Safe CAs: Satisfied."
                        }
                    ],
                    violating: {
                        arcs: [ 14, 25, 26, 24 ],
                        vertices: [ ]
                    },
                    violatingRemarks: {
                        arcs: {
                            14: "Invalid Join Input: arc not in valid paths",
                            25: "Disconnected Path: split arc not reaching join",
                            26: "Disconnected Path: split arc not reaching join",
                            24: "Disconnected Path: split arc not reaching join"
                        }
                    },
                },
            }
        ]
        
    };
}

function testActExtract(){
    // Example Usage
    const graph = new Graph();
    
    const x1 = new Vertex("x1", "BOUNDARY_OBJECT");
    const y1 = new Vertex("y1", "CONTROLLER");
    const x2 = new Vertex("x2", "ENTITY_OBJECT");
    const y2 = new Vertex("y2", "CONTROLLER");
    const y4 = new Vertex("y4", "CONTROLLER");
    const y5 = new Vertex("y5", "CONTROLLER");
    const y3 = new Vertex("y3", "BOUNDARY_OBJECT");
    
    graph.addVertex(x1);
    graph.addVertex(x2);
    graph.addVertex(y1);
    graph.addVertex(y2);
    graph.addVertex(y3);
    graph.addVertex(y4);
    graph.addVertex(y5);
    
    const e1 = new Edge(1, x1, y1, "a", 1);
    const e2 = new Edge(2, x1, y2, "b", 1);
    const e3 = new Edge(3, y1, x2, "", 2);
    const e4 = new Edge(4, y2, x2, "m", 2);
    const e5 = new Edge(5, x2, y4, "", 1);
    const e6 = new Edge(6, x2, y5, "", 1);
    const e7 = new Edge(7, y4, y5, "", 1);
    const e8 = new Edge(8, y5, y3, "p", 1);
    const e9 = new Edge(9, y2, y3, "d", 1);
    
    graph.addEdge(e1);
    graph.addEdge(e2);
    graph.addEdge(e3);
    graph.addEdge(e4);
    graph.addEdge(e5);
    graph.addEdge(e6);
    graph.addEdge(e7);
    graph.addEdge(e8);
    graph.addEdge(e9);
    
    const activityProfile = graph.extractActivityProfile("x1", "y3");
    // console.log(activityProfile.activities);
    console.log("Activities from x1 to x4:");
    activityProfile.forEach(activity => {
        console.log(activity.activities);
    });
}

function testUtils(){
    const graph = new Graph();
    
    const x1 = new Vertex("x1", "BOUNDARY_OBJECT");
    const y1 = new Vertex("y1", "CONTROLLER");
    const x2 = new Vertex("x2", "ENTITY_OBJECT");
    const y2 = new Vertex("y2", "CONTROLLER");
    const y4 = new Vertex("y4", "CONTROLLER");
    const y5 = new Vertex("y5", "CONTROLLER");
    const y3 = new Vertex("y3", "BOUNDARY_OBJECT");
    
    graph.addVertex(x1);
    graph.addVertex(x2);
    graph.addVertex(y1);
    graph.addVertex(y2);
    graph.addVertex(y3);
    graph.addVertex(y4);
    graph.addVertex(y5);
    
    const e1 = new Edge(1, x1, y1, "a", 1);
    const e2 = new Edge(2, x1, y2, "b", 1);
    const e3 = new Edge(3, y1, x2, "", 2);
    const e4 = new Edge(4, y2, x2, "m", 2);
    const e5 = new Edge(5, x2, y4, "", 1);
    const e6 = new Edge(6, x2, y5, "", 1);
    const e7 = new Edge(7, y4, y5, "", 1);
    const e8 = new Edge(8, y5, y3, "p", 1);
    const e9 = new Edge(9, y2, y3, "d", 1);
    
    graph.addEdge(e1);
    graph.addEdge(e2);
    graph.addEdge(e3);
    graph.addEdge(e4);
    graph.addEdge(e5);
    graph.addEdge(e6);
    graph.addEdge(e7);
    graph.addEdge(e8);
    graph.addEdge(e9);
    
    const activity1 = new Activity(x1, y3);
    activity1.reachabilityConfigurations = [
        new Set([[x1, y2]]),
        new Set([[y2, x2]]),
        new Set([[x2, y4], [x2, y5]]),
        new Set([[y5, y3], [y2, y3]]),
    ];
    
    graph.activityProfile.activities = [activity1];
    graph.activityProfile.duration = 4; // Example duration
    
    const result = Soundness.isRelaxedSound(graph); // Check liveness
    console.log(result)
}

function testContraction(){
    // Example Usage
    const graph = new Graph();
    
    const x1 = new Vertex("x1", "BOUNDARY_OBJECT");
    const x3 = new Vertex("x3", "ENTITY_OBJECT");
    const x4 = new Vertex("x4", "ENTITY_OBJECT");
    const x5 = new Vertex("x5", "ENTITY_OBJECT");
    const x6 = new Vertex("x6", "ENTITY_OBJECT");
    const x7 = new Vertex("x7", "ENTITY_OBJECT");
    const x8 = new Vertex("x8", "ENTITY_OBJECT");
    const x9 = new Vertex("x9", "ENTITY_OBJECT");
    
    graph.addVertex(x1);
    graph.addVertex(x3);
    graph.addVertex(x4);
    graph.addVertex(x5);
    graph.addVertex(x6);
    graph.addVertex(x7);
    graph.addVertex(x8);
    graph.addVertex(x9);
    
    const e1 = new Edge(1, x1, x3, "", 1);
    const e2 = new Edge(2, x1, x5, "", 1);
    const e3 = new Edge(3, x1, x6, "", 1);
    const e4 = new Edge(4, x3, x4, "", 1);
    const e5 = new Edge(5, x3, x4, "", 1);
    const e6 = new Edge(6, x5, x9, "", 1);
    const e7 = new Edge(7, x4, x9, "", 1);
    const e8 = new Edge(8, x8, x9, "", 1);
    const e9 = new Edge(9, x6, x8, "b", 1);
    const e10 = new Edge(10, x8, x6, "", 1);
    const e11 = new Edge(11, x6, x7, "", 1);
    const e12 = new Edge(12, x7, x8, "a", 1);
    
    graph.addEdge(e1);
    graph.addEdge(e2);
    graph.addEdge(e3);
    graph.addEdge(e4);
    graph.addEdge(e5);
    graph.addEdge(e6);
    graph.addEdge(e7);
    graph.addEdge(e8);
    graph.addEdge(e9);
    graph.addEdge(e10);
    graph.addEdge(e11);
    graph.addEdge(e12);
    
    console.log(GraphOperations.contractGraph(graph, x1));
}
// testContraction();

//testActExtract();

// testUtils();

// demo();

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
        
        // Add vertices
        rdlt.model.components.forEach(component => {
            const vertex = new Vertex(component.uid, VertexType.ENTITY_OBJECT, {}, component.identifier || '');
            rdltGraph.addVertex(vertex);
        });
        
        // Add edges
        rdlt.model.arcs.forEach(arc => {
            const fromVertex = rdltGraph.vertices.find(v => v.id === arc.fromVertexUID);
            const toVertex = rdltGraph.vertices.find(v => v.id === arc.toVertexUID);
            const edge = new Edge(arc.uid, fromVertex, toVertex, arc.C, arc.L, []);
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
                
                const edge = new Edge(arc['r-id'], fromVertex, toVertex, arc['c-attribute'], parseInt(arc['l-attribute'], 10), []);
                graph.addEdge(edge);
            });
            
            return { rNumber, graph };
        });
        
        console.log("Mapped R2 Graphs:", r2Graphs);
    }
    else{
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
            
            const edge = new Edge(`R1-${index}`, fromVertex, toVertex, arc['c-attribute'], parseInt(arc['l-attribute'], 10), []);
            r1Graph.addEdge(edge);
        });
    }
    
    return { rdltGraph, r2Graphs, r1Graph };
}

export function getDeadlockPoints(model, input_source, input_sink){
    const {rdlt, combinedEvsa} = mapGUIModelToSoundness(model, input_source, input_sink);

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

    const deadlockPointIDs = []
    for(const deadlockPoint of deadlockPoints){
        deadlockPointIDs.push(deadlockPoint.id);
    }

    return deadlockPointIDs
}
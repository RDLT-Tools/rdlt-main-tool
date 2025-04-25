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
        combinedEvsa = [...r2Graphs.map(item => item.graph), r1Graph];
    }
    else{
        combinedEvsa = [r1Graph];
    }
    

    // fetch('http://localhost:3000/verify', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         soundnessNotion,
    //         filepath: filepath,
    //         model: model,
    //         inVertices: Array.from(inVertices), // Convert Set to Array
    //         outVertices: Array.from(outVertices) // Convert Set to Array
    //     })
    // })
    // .then(res => res.json())
    // .then(response => {
    //     console.log("Output from backend:", response);
    
    //     // Assume your backend returns parsed graph info and verification result
    //     const { result, pythonOutput } = response;
    
    //     // You may want to recreate your Graph objects here from pythonOutput if needed
    //     console.log("Verification Result:", result);
    // })
    // .catch(error => {
    //     console.error("Error calling backend:", error);
    // });

    //  TODO Implement soundness

    switch(soundnessNotion){
        case 'easy':
            console.log("Easy Soundness Check");

            const result = Soundness.isEasySound(rdltGraph, combinedEvsa);

            console.log("Easy Soundness Result:", result);
            break;
        case 'classical':
            console.log("Classical Soundness Check");
            break;
        case 'relaxed':
            console.log("Relaxed Soundness Check");
            break;
        case 'weak':
            console.log("Weak Soundness Check");
            break;
    }

    return {
        title: "Lorem Ipsum",
        instances: [
            {
                name: "Main Model",
                evaluation: {
                    conclusion: {
                        pass: false,
                        title: "The model is NOT free-choice",
                        description: "It's not able to choose freely lorem ipsum dolor sit amet."
                    },
                    criteria: [
                        {
                            pass: true,
                            description: "The constraints are valid"
                        },
                        {
                            pass: false,
                            description: "The L values are valid"
                        }
                    ],
                    violating: {
                        arcs: [],
                        vertices: [ 1, 2 ]
                    },
                },
                // for MAS only
                model: {
                    vertices: [ 1, 2, 3, 4 ],
                    arcs: [ 1, 2, 3 ]
                }
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

// // Define the file path as an argument (not as JSON)
// const filepath = "rdlt_text\\sample_ronnie.txt";

// // Function to check if a string is valid JSON
// function isValidJSON(str) {
//     try {
//         JSON.parse(str);
//         return true;
//     } catch (e) {
//         return false;
//     }
// }

// // Function to spawn a Python process and handle its output
// function runPythonScript(scriptPath, args) {
//     return new Promise((resolve, reject) => {
//         const pythonProcess = spawn("python", [scriptPath, ...args]);

//         let pythonOutput = '';
//         pythonProcess.stdout.on("data", (data) => {
//             pythonOutput += data.toString();
//         });

//         pythonProcess.on("close", (code) => {
//             console.log(`Python process ${scriptPath} exited with code ${code}`);
//             if (isValidJSON(pythonOutput)) {
//                 const result = JSON.parse(pythonOutput); // If output is JSON, parse it
//                 resolve(result);
//             } else {
//                 resolve(pythonOutput);
//             }
//         });

//         pythonProcess.stderr.on("data", (data) => {
//             console.error(`Python stderr from ${scriptPath}: ${data.toString()}`);
//             reject(data.toString());
//         });
//     });
// }

// // Function to map the parsed graph data to the Graph model
// //TODO this function does not consider na "rs" could be multiple graphs based sa output ni asoy
// function mapParsedGraph(data) {
    
//     const originalGraph = new Graph(); // Graph for original_rdlt
//     const rsGraph = new Graph(); // Graph for Rs
//     const r1Graph = new Graph(); // Graph for R1

//     // Map original_rdlt if it exists
//     if (data.original_rdlt) {
//         console.log("Mapping original_rdlt...");
//         // Add vertices
//         data.original_rdlt.Vertices_List.forEach(vertexId => {
//             const vertex = new Vertex(vertexId, VertexType.ENTITY_OBJECT); // Assuming ENTITY_OBJECT for all vertices
//             originalGraph.addVertex(vertex);
//         });

//         // Add edges
//         data.original_rdlt.Arcs_List.forEach((arc, index) => {
//             const [sourceId, targetId] = arc.split(', ');
//             const sourceVertex = originalGraph.vertices.find(v => v.id === sourceId);
//             const targetVertex = originalGraph.vertices.find(v => v.id === targetId);
//             const constraint = data.original_rdlt.C_attribute_list[index];
//             const maxTraversal = parseInt(data.original_rdlt.L_attribute_list[index], 10);
//             const edge = new Edge(index, sourceVertex, targetVertex, constraint, maxTraversal, []); // Assuming empty array for additional attributes
//             originalGraph.addEdge(edge);
//         });
//     }

//     // Map Rs if it exists and is not empty
//     if (data.Rs && data.Rs.length > 0) {
//         console.log("Mapping Rs...");
//         data.Rs.forEach((resetSubsystem, rsIndex) => {
//             Object.entries(resetSubsystem).forEach(([key, edges]) => {
//                 console.log(`Mapping ${key} in Rs[${rsIndex}]...`);
//                 edges.forEach((edgeData, edgeIndex) => {
//                     const [sourceId, targetId] = edgeData.arc.split(', ');
//                     const sourceVertex = rsGraph.vertices.find(v => v.id === sourceId) || new Vertex(sourceId, VertexType.ENTITY_OBJECT);
//                     const targetVertex = rsGraph.vertices.find(v => v.id === targetId) || new Vertex(targetId, VertexType.ENTITY_OBJECT);

//                     // Add vertices if not already present
//                     if (!rsGraph.vertices.find(v => v.id === sourceId)) rsGraph.addVertex(sourceVertex);
//                     if (!rsGraph.vertices.find(v => v.id === targetId)) rsGraph.addVertex(targetVertex);

//                     const constraint = edgeData["c-attribute"];
//                     const maxTraversal = parseInt(edgeData["l-attribute"], 10);
//                     const edge = new Edge(`${key}-${edgeIndex}`, sourceVertex, targetVertex, constraint, maxTraversal, []); // Assuming empty array for additional attributes
//                     rsGraph.addEdge(edge);
//                 });
//             });
//         });
//     }

//     // Map R1 if it exists
//     if (data.R1) {
//         console.log("Mapping R1...");
//         data.R1.forEach((edgeData, edgeIndex) => {
//             const [sourceId, targetId] = edgeData.arc.split(', ');
//             const sourceVertex = r1Graph.vertices.find(v => v.id === sourceId) || new Vertex(sourceId, VertexType.ENTITY_OBJECT);
//             const targetVertex = r1Graph.vertices.find(v => v.id === targetId) || new Vertex(targetId, VertexType.ENTITY_OBJECT);

//             // Add vertices if not already present
//             if (!r1Graph.vertices.find(v => v.id === sourceId)) r1Graph.addVertex(sourceVertex);
//             if (!r1Graph.vertices.find(v => v.id === targetId)) r1Graph.addVertex(targetVertex);

//             const constraint = edgeData["c-attribute"];
//             const maxTraversal = parseInt(edgeData["l-attribute"], 10);
//             const edge = new Edge(`R1-${edgeIndex}`, sourceVertex, targetVertex, constraint, maxTraversal, []); // Assuming empty array for additional attributes
//             r1Graph.addEdge(edge);
//         });
//     }

//     // Log the separate graphs
//     console.log('Original Graph:', JSON.stringify(originalGraph, null, 2));
//     console.log('Rs Graph:', JSON.stringify(rsGraph, null, 2));
//     console.log('R1 Graph:', JSON.stringify(r1Graph, null, 2));

//     // Return the graphs for further use
//     return { originalGraph, rsGraph, r1Graph };
// }

// // Function to clean up and format the output
// function formatOutput(output) {
//     if (typeof output !== 'string') {
//         output = JSON.stringify(output);
//     }
//     try {
//         const parsedOutput = JSON.parse(output);
//         return JSON.stringify(parsedOutput, null, 2);
//     } catch (e) {
//         return output.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
//     }
// }

// // Run both main.py and input_rdlt.py
// let originalGraph, rsGraph, r1Graph;

// fetch('http://localhost:3000/verify', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//         soundnessNotion: 'easy',
//         filepath: filepath
//     })
// })
// .then(res => res.json())
// .then(response => {
//     console.log("Output from backend:", response);

//     // Assume your backend returns parsed graph info and verification result
//     const { result, pythonOutput } = response;

//     // You may want to recreate your Graph objects here from pythonOutput if needed
//     console.log("Verification Result:", result);
// })
// .catch(error => {
//     console.error("Error calling backend:", error);
// });


// Promise.all([
//     runPythonScript("python\\ClassicalSoundness-Automation-Tool\\main.py", [filepath]),
//     runPythonScript("python\\ClassicalSoundness-Automation-Tool\\input_rdlt.py", [filepath])
// ]).then((results) => {
//     console.log("Output from main.py:", formatOutput(results[0]));
//     console.log("Output from input_rdlt.py:", formatOutput(results[1]));
//     ({ originalGraph, rsGraph, r1Graph } = mapParsedGraph(results[1]));

//     // Group all members of rsGraph and r1Graph into a single array
//     const evsa = [r1Graph];

//     // Find vertex in the graph (TODO make this a function sa graph class)
//     const sourceVertex = originalGraph.vertices.find(v => v.id === 'x1');
//     const sinkVertex = originalGraph.vertices.find(v => v.id === 'x6');

//     console.log(Soundness.isEasySound(originalGraph, evsa, sourceVertex, sinkVertex));
// }).catch((error) => {
//     console.error("Error running Python scripts:", error);
// });

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
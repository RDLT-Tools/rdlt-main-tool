import { Graph } from '../models/Graph.js';
import { Vertex } from '../models/Vertex.js';
import { VertexType } from '../models/VertexType.js';
import { Edge } from '../models/Edge.js';
import { utils } from './rdlt-utils.mjs';

/**
* Utility class that handles all RDLT operations.
*/
export class GraphOperations {
    /** 
    * Applies graph contraction strategy to the given vertex-simplified RDLT.
    * Contracts vertices relative to the source vertex. Only edges originating from the source or merged
    * vertices are considered for contraction. Algorithm stops if no more contractions are possible.
    * @param {Graph} graph - The vertex-simplified RDLT to contract.
    * @param {Vertex} source - The source vertex to start the contraction from.
    * @returns {Graph} - The contracted graph.
    */
    static contractGraph(graph, source) {
        console.log("Starting graph contraction from source:", source.id);
        
        const contractedGraph = new Graph();
        
        // Clone the vertices and edges to avoid modifying the original graph
        let vertices = [...graph.vertices];
        let edges = [...graph.edges];
        
        console.log(`Initial vertices: `, vertices);
        console.log(`Initial edges: `, edges);
        
        // Helper function to gather type-alike incoming edges for a given vertex
        const getIncomingEdges = (candidateEdge, vertex) => {
            const incomingEdges = edges.filter(edge => edge.to === vertex);
            let typeAlike = [];
            
            if (graph.resetBoundSubsystems && graph.resetBoundSubsystems.length > 0) {
                // If there is an RBS present, check for type-alike arcs
                for (const edge of incomingEdges) {
                    graph.resetBoundSubsystems.forEach(rbs => {
                        if (rbs.isTypeAlike(candidateEdge, edge)) {
                            typeAlike.push(edge);
                        }
                    });
                }
                return typeAlike;
            } else {
                // If there is no RBS, all arcs are considered type-alike
                return incomingEdges;
            }
        };
        
        // Helper function to check if constraints on incoming edges are a subset of candidate edges
        const isConstraintSubset = (incomingEdges, candidateEdges) => {
            const incomingConstraints = new Set(
                incomingEdges.map(edge => edge.constraint).filter(constraint => constraint !== "")
            );
            const candidateConstraints = new Set(
                candidateEdges.map(edge => edge.constraint).filter(constraint => constraint !== "")
            );
            return [...incomingConstraints].every(constraint => candidateConstraints.has(constraint));
        };
        
        // Start with the source vertex
        let activeVertices = [source];
        let contractionPossible = true;
        
        while (contractionPossible) {
            contractionPossible = false;
            
            // Stop if there is only one vertex left
            if (vertices.length === 1) {
                console.log("Only one vertex remains. Clearing edges and stopping contraction.");
                edges = []; // Clear all edges since there is only one vertex
                break;
            }
            
            console.log("Starting a new contraction iteration...");
            console.log(`Active vertices: ${activeVertices.map(v => v.id).join(", ")}`);
            console.log(`Current edges: ${edges.map(e => `(${e.from.id}, ${e.to.id})`).join(", ")}`);
            
            // Iterate through all edges originating from active vertices
            for (const candidateEdge of edges) {
                const { from: x, to: y } = candidateEdge;
                console.log(`Checking candidate edge (${x.id}, ${y.id})...`);
                
                // Only consider edges originating from active vertices
                if (!activeVertices.some(v => v.id === x.id)) {
                    console.log(`Skipping edge (${x.id}, ${y.id}) as it does not originate from an active vertex.`);
                    continue;
                }
                
                console.log(`Checking edge (${x.id}, ${y.id}) for contraction...`);
                
                // Gather all incoming edges to y
                const incomingEdges = getIncomingEdges(candidateEdge, y);
                console.log(`Incoming edges to ${y.id}: ${incomingEdges.map(e => `(${e.from.id}, ${e.to.id})`).join(", ")}`);
                
                // Gather all edges from x to y (candidate edges)
                const candidateEdges = edges.filter(edge => edge.from === x && edge.to === y);
                console.log(`Candidate edges from ${x.id} to ${y.id}: ${candidateEdges.map(e => `(${e.from.id}, ${e.to.id})`).join(", ")}`);
                
                // Check if the constraint condition is satisfied
                if (isConstraintSubset(incomingEdges, candidateEdges)) {
                    console.log(`Constraint condition satisfied for edge (${x.id}, ${y.id}). Merging vertices ${x.id} and ${y.id}...`);
                    
                    // Merge vertices x and y into a new vertex "xy"
                    const mergedVertex = new Vertex(`${x.id}_${y.id}`, VertexType.CONTROLLER);
                    
                    // Rewire edges to and from x and y to the new vertex
                    edges = edges
                    .filter(edge => edge !== candidateEdge) // Remove the candidate edge
                    .map(edge => {
                        if ((edge.from === x || edge.from === y) && !(edge.from === x && edge.to === y)) {
                            console.log(`Rewiring edge (${edge.from.id}, ${edge.to.id}) to (${mergedVertex.id}, ${edge.to.id})`);
                            return new Edge(edge.id, mergedVertex, edge.to, edge.constraint, edge.maxTraversals);
                        } else if ((edge.to === x || edge.to === y) && !(edge.from === x && edge.to === y)) {
                            console.log(`Rewiring edge (${edge.from.id}, ${edge.to.id}) to (${edge.from.id}, ${mergedVertex.id})`);
                            return new Edge(edge.id, edge.from, mergedVertex, edge.constraint, edge.maxTraversals);
                        }
                        return edge;
                    })
                    .filter(edge => edge.from !== edge.to); // Remove self-loops
                    
                    // Remove x and y from the vertex list and add the new vertex
                    vertices = vertices.filter(vertex => vertex !== x && vertex !== y);
                    vertices.push(mergedVertex);
                    
                    // Update active vertices to include the new merged vertex
                    activeVertices = activeVertices.filter(v => v !== x && v !== y);
                    activeVertices.push(mergedVertex);
                    
                    console.log(`Vertices after merging: ${vertices.map(v => v.id).join(", ")}`);
                    console.log(`Active vertices after merging: ${activeVertices.map(v => v.id).join(", ")}`);
                    contractionPossible = true; // Indicate that a contraction was performed
                    break; // Exit the loop to restart with the updated graph
                } else {
                    console.log(`Constraint condition not satisfied for edge (${x.id}, ${y.id}).`);
                }
            }
            
            if (!contractionPossible) {
                console.log("No more contractions possible relative to the active vertices.");
            }
        }
        
        // Add remaining vertices and edges to the contracted graph
        vertices.forEach(vertex => contractedGraph.addVertex(vertex));
        edges.forEach(edge => contractedGraph.addEdge(edge));
        
        console.log("Graph contraction completed.");
        console.log(`Final vertices: ${contractedGraph.vertices.map(v => v.id).join(", ")}`);
        console.log(`Final edges: ${contractedGraph.edges.map(e => `(${e.from.id}, ${e.to.id})`).join(", ")}`);
        
        return contractedGraph;
    }
    
    /** 
    * Gathers deadlock points in a graph
    * @param {Graph} graph - The vertex-simplified RDLT to contract.
    * @param {Vertex} source - The source vertex to start the contraction from.
    * @returns {Object}
    */
    static gatherDeadlockPoints(graph, source) {
        // Gather PODs of the graph
        const POD = new Set(); // Use a Set to ensure uniqueness
        const deadlockPoints = new Set(); // Use a Set to ensure unique deadlock points
        
        for (const vertex of graph.vertices) {
            // Gather all incoming edges
            const incomingEdges = graph.edges.filter(edge => edge.to.id === vertex.id);
            
            // Extract the set of unique constraints
            const uniqueConstraints = new Set(incomingEdges.map(edge => edge.constraint));
            
            // If there are 2 or more distinct constraints, this vertex is a POD
            if (uniqueConstraints.size >= 2) {
                POD.add(vertex);
            }
        }
        
        // Contract graph
        const contractedRDLT = this.contractGraph(graph, source);
        console.log("Contracted RDLT: ", contractedRDLT);
        
        let mergePoint, mergedVertexIds;
        for (const vertex of contractedRDLT.vertices) {
            // Split the vertex ID by the underscore to get the merged vertex components (if there are any)
            mergedVertexIds = vertex.id.split('_');
            
            // The merge point is the vertex with the source vertex
            if (mergedVertexIds.includes(source.id)) {
                mergePoint = vertex;
                break;
            }
        }
        
        // Get adjacent vertices
        const outgoingEdges = contractedRDLT.edges.filter(edge => edge.from.id === mergePoint.id);
        console.log("Outgoing edges from merge point: ", outgoingEdges);
        
        for (const edge of outgoingEdges) {
            let vertex = edge.to;
            
            // If vertex is a POD, it's a deadlock point
            if (POD.has(vertex)) {
                deadlockPoints.add(vertex); // Add to the Set to ensure uniqueness
            }
        }
        
        // Convert the Set to an array before returning
        return { deadlockPoints: Array.from(deadlockPoints), reachedVertices: mergedVertexIds };
    }
    
    /**
    * Finds a unique split origin for two branches leading to a join vertex.
    * @param {Object} R - The RDLT graph containing vertices, arcs, and their attributes.
    * @param {Vertex} u - The source vertex of the first branch.
    * @param {Vertex} v - The source vertex of the second branch.
    * @param {Vertex} y - The join vertex where the branches meet.
    * @returns {Vertex|null} - The unique split origin vertex if found, otherwise null.
    */
    static findUniqueSplitOrigin(R, u, v, y) {
        console.log("Starting findUniqueSplitOrigin...");
        console.log("Graph vertices:", R.vertices.map(v => v.id));
        console.log("Graph edges:", R.edges.map(e => `(${e.from.id}, ${e.to.id})`));
        console.log("Branch source vertices: u =", u.id, ", v =", v.id);
        console.log("Join vertex: y =", y.id);
        
        // Step 1: Find all vertices reachable to both u and v
        const reachableToU = GraphOperations.getVerticesReachingTarget(R, u);
        const reachableToV = GraphOperations.getVerticesReachingTarget(R, v);
        console.log("Vertices reachable to u:", Array.from(reachableToU).map(v => v.id));
        console.log("Vertices reachable to v:", Array.from(reachableToV).map(v => v.id));
        
        const candidates = [...reachableToU].filter(vertex => reachableToV.has(vertex));
        console.log("Candidate vertices reachable to both u and v:", candidates.map(v => v.id));
        
        // Step 2: Check each candidate to see if it satisfies the split origin criteria
        for (const x of candidates) {
            console.log(`Checking candidate vertex: ${x.id}`);
            if (GraphOperations.exactlyOneSplitAndNoRejoin(R, x, u, v, y)) {
                console.log(`Vertex ${x.id} satisfies the split origin criteria.`);
                return x; // Return the unique split origin if found
            } else {
                console.log(`Vertex ${x.id} does NOT satisfy the split origin criteria.`);
            }
        }
        
        // Step 3: If no valid split origin is found, return null
        console.warn("No valid split origin found.");
        return null;
    }
    
    /**
    * Finds all vertices reachable from a given vertex in the graph.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Vertex} start - The starting vertex.
    * @returns {Set<Vertex>} - A set of all reachable vertices.
    */
    static getReachableVertices(R, start) {
        const reachable = new Set();
        const stack = [start];
        
        while (stack.length > 0) {
            const current = stack.pop();
            if (!reachable.has(current)) {
                reachable.add(current);
                const outgoingEdges = R.edges.filter(edge => edge.from === current);
                for (const edge of outgoingEdges) {
                    stack.push(edge.to);
                }
            }
        }
        
        return reachable;
    }
    
    /**
    * Finds all simple paths between two vertices in the graph.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Vertex} start - The starting vertex.
    * @param {Vertex} end - The ending vertex.
    * @returns {Array<Array<Vertex>>} - An array of paths, where each path is an array of vertices.
    */
    static findSimplePaths(R, start, end, visited = new Set(), path = [], allPaths = []) {
        visited.add(start);
        path.push(start);
        
        if (start === end) {
            allPaths.push([...path]);
        } else {
            const outgoingEdges = R.edges.filter(arc => arc.from === start);
            for (const edge of outgoingEdges) {
                if (!visited.has(edge.to)) {
                    GraphOperations.findSimplePaths(R, edge.to, end, visited, path, allPaths);
                }
            }
        }
        
        path.pop();
        visited.delete(start);
        return allPaths;
    }
    
    /**
    * Checks if there is exactly one split and no rejoin between the branches.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Vertex} x - The candidate split origin vertex.
    * @param {Vertex} u - The source vertex of the first branch.
    * @param {Vertex} v - The source vertex of the second branch.
    * @param {Vertex} y - The join vertex where the branches meet.
    * @returns {boolean} - True if the criteria are satisfied, otherwise false.
    */
    static exactlyOneSplitAndNoRejoin(R, x, u, v, y) {
        console.log("Starting exactlyOneSplitAndNoRejoin...");
        console.log("Candidate split origin vertex:", x.id);
        console.log("Branch source vertices: u =", u.id, ", v =", v.id);
        console.log("Join vertex: y =", y.id);
        
        // Find all simple paths from x to u and x to v
        const pathsToU = GraphOperations.findSimplePaths(R, x, u);
        const pathsToV = GraphOperations.findSimplePaths(R, x, v);
        console.log(`Paths from ${x.id} to ${u.id}:`, pathsToU.map(path => path.map(v => v.id)));
        console.log(`Paths from ${x.id} to ${v.id}:`, pathsToV.map(path => path.map(v => v.id)));
        
        // Ensure there is exactly one path from x to u and x to v
        if (pathsToU.length !== 1 || pathsToV.length !== 1) {
            console.warn(`Vertex ${x.id} does not have exactly one path to both ${u.id} and ${v.id}.`);
            return false;
        }
        
        // Check that the paths do not rejoin before reaching y
        const pathToU = pathsToU[0];
        const pathToV = pathsToV[0];
        console.log(`Path from ${x.id} to ${u.id}:`, pathToU.map(v => v.id));
        console.log(`Path from ${x.id} to ${v.id}:`, pathToV.map(v => v.id));
        
        const commonVertices = pathToU.filter(vertex => pathToV.includes(vertex));
        console.log("Common vertices between the two paths:", commonVertices.map(v => v.id));
        
        const result = commonVertices.length === 1; // Only x should be common
        if (result) {
            console.log(`Vertex ${x.id} satisfies the split and no rejoin criteria.`);
        } else {
            console.warn(`Vertex ${x.id} does NOT satisfy the split and no rejoin criteria.`);
        }
        return result;
    }
    
    /**
    * Finds all vertices that can reach a given vertex in the graph.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Vertex} target - The target vertex.
    * @returns {Set<Vertex>} - A set of all vertices that can reach the target vertex.
    */
    static getVerticesReachingTarget(R, target) {
        const reachable = new Set();
        const stack = [target];
        
        while (stack.length > 0) {
            const current = stack.pop();
            if (!reachable.has(current)) {
                reachable.add(current);
                
                // Find all incoming edges to the current vertex
                const incomingEdges = R.edges.filter(edge => edge.to === current);
                
                // Add the source vertices of the incoming edges to the stack
                for (const edge of incomingEdges) {
                    stack.push(edge.from);
                }
            }
        }
        
        return reachable;
    }
    /**
    * Finds a unique simple path from a starting vertex to an ending vertex in the graph.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Vertex} start - The starting vertex.
    * @param {Vertex} end - The ending vertex.
    * @returns {Array<Vertex>|null} - The unique simple path if found, otherwise null.
    */
    static findSimplePath(R, start, end) {
        console.log(`Finding unique simple path from ${start.id} to ${end.id}...`);
        
        // Use a depth-first search (DFS) to find all simple paths
        const allPaths = GraphOperations.findSimplePaths(R, start, end);
        
        // If there is not exactly one simple path, return null
        if (allPaths.length !== 1) {
            console.warn(`No unique simple path found from ${start.id} to ${end.id}. Found ${allPaths.length} paths.`);
            return null;
        }
        
        // Return the unique simple path
        const uniquePath = allPaths[0];
        console.log(`Unique simple path found:`, uniquePath.map(v => v.id));
        return uniquePath;
    }
    
    /**
    * Checks if every internal node on the path has no incoming arcs from off-path nodes.
    * Only considers edges with a non-empty constraint value for interruptions.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Array<Vertex>} path - The path to check, represented as an array of vertices.
    * @returns {boolean} - True if there are no interruptions, otherwise false.
    */
    static noInterruptions(R, path) {
        console.log(`Checking for interruptions on path:`, path.map(v => v.id));

        // Skip the first element (split) and the last element (just-before-y)
        for (let i = 1; i < path.length - 1; i++) {
            const w = path[i]; // Current internal vertex
            console.log(`Checking vertex ${w.id} for incoming arcs from off-path nodes...`);

            // Find all predecessors (vertices with arcs leading to w) with non-empty constraints
            const predecessors = R.edges
                .filter(edge => edge.to === w && edge.constraint !== "") // Only consider edges with non-empty constraints
                .map(edge => edge.from);

            console.log(`Predecessors of ${w.id} (with non-empty constraints):`, predecessors.map(v => v.id));

            // Check if any predecessor is not part of the path
            for (const p of predecessors) {
                if (!path.includes(p)) {
                    console.warn(`Interruption detected: Vertex ${p.id} has an arc leading to ${w.id}, but it is not part of the path.`);
                    return false; // Interruption detected
                }
            }
        }

        console.log(`No interruptions detected on path:`, path.map(v => v.id));
        return true; // No interruptions detected
    }
    
    /**
    * Checks if every internal node on the path has exactly one outgoing arc, 
    * which continues to the next node on the path. Branching out from the source vertex or edges with empty constraints is allowed.
    * @param {Object} R - The RDLT graph containing vertices and arcs.
    * @param {Array<Vertex>} path - The path to check, represented as an array of vertices.
    * @returns {boolean} - True if there is no branching out (except from the source or edges with empty constraints), otherwise false.
    */
    static noBranchingOut(R, path) {
        // Get the source vertex of the graph
        const source = utils.getSourceAndSinkVertices(R).source;

        console.log(`Checking for branching out on path:`, path.map(v => v.id));

        // Skip the last vertex (just-before-y) since it has no outgoing arcs
        for (let i = 0; i < path.length - 1; i++) {
            const w = path[i]; // Current vertex
            const nextNode = path[i + 1]; // Next vertex on the path

            // Allow branching out from the source vertex
            if (w === source) {
                console.log(`Skipping branching check for source vertex: ${w.id}`);
                continue;
            }

            console.log(`Checking vertex ${w.id} for outgoing arcs that do not lead to ${nextNode.id}...`);

            // Find all outgoing edges from the current vertex
            const outgoingEdges = R.edges.filter(edge => edge.from === w);

            console.log(`Outgoing edges from ${w.id}:`, outgoingEdges.map(e => `(${e.from.id}, ${e.to.id}, constraint: "${e.constraint}")`));

            // Check if all outgoing edges either lead to the next node on the path or have an empty constraint
            const validOutgoingEdges = outgoingEdges.every(edge => edge.to === nextNode || edge.constraint === "");
            if (!validOutgoingEdges) {
                console.warn(`Branching out detected: Vertex ${w.id} has outgoing arcs that do not lead to ${nextNode.id} and do not have an empty constraint.`);
                return false; // Branching out detected
            }
        }

        console.log(`No branching out detected on path:`, path.map(v => v.id));
        return true; // No branching out detected
    }
}
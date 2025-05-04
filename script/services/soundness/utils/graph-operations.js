import { Graph } from '../models/Graph.js';
import { Vertex } from '../models/Vertex.js';
import { VertexType } from '../models/VertexType.js';
import { Edge } from '../models/Edge.js';

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
        
        console.log(`Initial vertices: ${vertices.map(v => v.id).join(", ")}`);
        console.log(`Initial edges: ${edges.map(e => `(${e.from.id}, ${e.to.id})`).join(", ")}`);
        
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
            const incomingConstraints = new Set(incomingEdges.map(edge => edge.constraint));
            const candidateConstraints = new Set(candidateEdges.map(edge => edge.constraint));
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
                    const mergedVertex = new Vertex(`${x.id}_${y.id}`, VertexType.ENTITY_OBJECT);
                    
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
    static gatherDeadlockPoints(graph, source){
        // Gather PODs of the graph
        const POD = [];
        const deadlockPoints = [];

        for(const vertex of graph.vertices){
            // Gather all incoming edges
            const incomingEdges = graph.edges.filter(edge => edge.to.id === vertex.id);

            // Extract the set of unique constraints
            const uniqueConstraints = new Set(incomingEdges.map(edge => edge.constraint));

            // If there are 2 or more distinct constraints, this vertex is a POD
            if (uniqueConstraints.size >= 2) {
                POD.push(vertex);
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
            if (mergedVertexIds.includes(source.id)){
                mergePoint = vertex;
                break;
            }
        }

        // Get adjacent vertices
        const outgoingEdges = contractedRDLT.edges.filter(edge => edge.from.id === mergePoint.id);
        console.log("outgoing edges from merge point: ", outgoingEdges);
        
        for(const edge of outgoingEdges){
            let vertex = edge.to;

            // If vertex is a POD, its a deadlock point
            if(POD.includes(vertex)){
                deadlockPoints.push(vertex);
            }
        }

        return {deadlockPoints, reachedVertices: mergedVertexIds};
    }
}
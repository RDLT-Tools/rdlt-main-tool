// Import necessary functions (You'll need to implement these or use libraries)
import { johnson } from "../algos/johnsons.js";

function findCycles(R_set, R_name) {
  // Detect individual cycles
  const graph = toDict(R_set);
  // console.log(typeof graph); // Should print 'object'

  const cycles = johnson(graph);
  return cycles;
}

function toDict(R1) {
  const graph = new Map();

  // Construct adjacency list
  R1.forEach((arc) => {
    const { start, end } = arc;

    if (!graph.has(start)) {
      graph.set(start, []); // Initialize adjacency list for the node
    }
    graph.get(start).push(end);
  });

  // Ensure all nodes are present in the graph
  const allNodes = new Set([
    ...R1.map((arc) => arc.start),
    ...R1.map((arc) => arc.end),
  ]);

  allNodes.forEach((node) => {
    if (!graph.has(node)) {
      graph.set(node, []); // Add nodes with no outgoing edges
    }
  });

  return graph;
}

export { findCycles, toDict };

function findDisjointPaths(graph, source, sink) {
  // BFS to find augmenting paths
  const bfs = (residualGraph, parent) => {
    const visited = new Set();
    const queue = [source];
    visited.add(source);
    parent.clear();

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = residualGraph.get(current);
      if (!neighbors) continue;

      for (const [neighbor, capacity] of neighbors.entries()) {
        if (!visited.has(neighbor) && capacity > 0) {
          parent.set(neighbor, current);
          visited.add(neighbor);
          queue.push(neighbor);
          if (neighbor === sink) return true;
        }
      }
    }
    return false;
  };

  // Deep copy the graph into residualGraph (Map of Maps)
  const residualGraph = new Map();
  for (const [node, edges] of graph.entries()) {
    residualGraph.set(node, new Map(edges));
  }

  const parent = new Map(); // Tracks parent-child relationships
  const paths = []; // Stores all found paths

  // Find augmenting paths until none exist
  while (bfs(residualGraph, parent)) {
    // Reconstruct path from sink to source
    const pathEdges = [];
    let flow = Infinity;
    let current = sink;

    while (current !== source) {
      const prev = parent.get(current);
      pathEdges.push([prev, current]);
      // Get capacity from forward edge
      flow = Math.min(flow, residualGraph.get(prev).get(current));
      current = prev;
    }

    paths.push(pathEdges.reverse());

    // Update residual capacities
    current = sink;
    while (current !== source) {
      const prev = parent.get(current);
      // Update forward edge
      const prevEdges = residualGraph.get(prev);
      prevEdges.set(current, prevEdges.get(current) - flow);

      // Initialize/update backward edge
      if (!residualGraph.has(current)) {
        residualGraph.set(current, new Map());
      }
      const currentEdges = residualGraph.get(current);
      currentEdges.set(prev, (currentEdges.get(prev) || 0) + flow);

      current = prev;
    }
  }

  // Convert edge lists to node sequences
  return paths.map((path) => {
    const nodes = path.map((edge) => edge[0]); // Starting nodes of edges
    nodes.push(sink); // Add final sink node
    return nodes;
  });
}

export { findDisjointPaths };

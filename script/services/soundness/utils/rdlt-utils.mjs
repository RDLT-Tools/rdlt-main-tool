/**
* Utility functions for RDLT processing
*/
export const utils = {
  /**
  * Find all simple paths from start to end in a directed graph without revisiting nodes.
  * @param {Record<string, string[]>} graph - Adjacency list where keys are vertices.
  * @param {string} start
  * @param {string} end
  * @param {string[]} [path=[]] - Accumulated path for recursion.
  * @returns {string[][]} List of paths, each an array of vertices.
  */
  findAllPaths(graph, start, end, path = []) {
    const newPath = [...path, start];
    if (start === end) return [newPath];
    if (!graph[start]) return [];
    
    let paths = [];
    for (const neighbor of graph[start]) {
      if (!newPath.includes(neighbor)) {
        paths = paths.concat(this.findAllPaths(graph, neighbor, end, newPath));
      }
    }
    return paths;
  },
  
  /**
  * Convert a vertex path into arc strings "start, end".
  * @param {string[]} path
  * @returns {string[]}
  */
  formatPath(path) {
    const arcs = [];
    for (let i = 0; i < path.length - 1; i++) {
      arcs.push(`${path[i]}, ${path[i + 1]}`);
    }
    return arcs;
  },
  
  /**
  * Build adjacency list from an array of "x, y" strings.
  * @param {string[]} arcList
  * @returns {Record<string, string[]>}
  */
  listToGraph(arcList) {
    const graph = {};
    for (const arc of arcList) {
      const [start, end] = arc.split(', ').map(s => s.trim());
      graph[start] = graph[start] || [];
      graph[end] = graph[end] || [];
      graph[start].push(end);
    }
    return graph;
  },
  
  /**
  * Extract all unique vertices from a list of "x, y" strings.
  * @param {string[]} arcList
  * @returns {string[]} Sorted list of vertices.
  */
  extractVertices(arcList) {
    const set = new Set();
    for (const arc of arcList) {
      arc.split(', ').forEach(v => set.add(v));
    }
    return Array.from(set).sort();
  },
  
  /**
  * DFS to detect cycles in a directed graph.
  * @param {Record<string, string[]>} graph
  * @param {string} start
  * @param {Set<string>} [visited]
  * @param {Set<string>} [recStack]
  * @returns {boolean} True if cycle detected.
  */
  dfsWithCycleDetection(graph, start, visited = new Set(), recStack = new Set()) {
    visited.add(start);
    recStack.add(start);
    
    for (const neighbor of graph[start] || []) {
      if (!visited.has(neighbor)) {
        if (this.dfsWithCycleDetection(graph, neighbor, visited, recStack)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    
    recStack.delete(start);
    return false;
  },
  
  /**
  * Find all paths in R list of arc objects with 'arc' key.
  * @param {{arc: string}[]} R
  * @param {string} source
  * @param {string} target
  * @param {Set<string>} [visited]
  * @returns {string[][]}
  */
  findPaths(R, source, target, visited = new Set()) {
    visited.add(source);
    if (source === target) return [[source]];
    
    let paths = [];
    for (const entry of R) {
      const [src, tgt] = entry.arc.split(', ').map(s => s.trim());
      if (src === source && !visited.has(tgt)) {
        for (const sub of this.findPaths(R, tgt, target, new Set(visited))) {
          paths.push([source, ...sub]);
        }
      }
    }
    return paths;
  },
  
  /**
  * Find all paths in an adjacency graph.
  * @param {Record<string, string[]>} graph
  * @param {string} start
  * @param {string} end
  * @param {string[]} [path]
  * @returns {string[][]}
  */
  findPathFromGraph(graph, start, end, path = []) {
    const newPath = [...path, start];
    if (start === end) return [newPath];
    if (!graph[start]) return [];
    
    let paths = [];
    for (const node of graph[start]) {
      if (!newPath.includes(node)) {
        paths = paths.concat(this.findPathFromGraph(graph, node, end, newPath));
      }
    }
    return paths;
  },
  
  /**
  * Identify source and target vertices of the longest path in R.
  * @param {{arc: string}[]} R
  * @returns {{source: string, target: string}}
  */
  getSourceAndTargetVertices(R) {
    const adj = {};
    R.forEach(r => {
      const [x, y] = r.arc.split(', ').map(s => s.trim());
      adj[x] = adj[x] || [];
      adj[x].push(y);
    });
    
    const allX = new Set(R.map(r => r.arc.split(', ')[0]));
    const allY = new Set(R.map(r => r.arc.split(', ')[1]));
    const sources = [...allX].filter(x => !allY.has(x));
    console.log({ allX:[...allX], allY:[...allY], sources });
    
    let bestPath = [];
    let bestSrc = null;
    
    const dfs = (v, visited, path) => {
      visited.add(v);
      path.push(v);
      let longest = [...path];
      for (const nxt of adj[v] || []) {
        if (!visited.has(nxt)) {
          const p = dfs(nxt, visited, path);
          if (p.length > longest.length) longest = p;
        }
      }
      path.pop();
      visited.delete(v);
      return longest;
    };
    
    sources.forEach(s => {
      const p = dfs(s, new Set(), []);
      console.log(`from ${s} → path =`, p);
      if (p.length > bestPath.length) {
        bestPath = p;
        bestSrc = s;
      }
    });
    
    console.log({ bestPath, length: bestPath.length, last: bestPath[bestPath.length-1] });
    
    return { source: bestSrc, target: bestPath[bestPath.length - 1] };
  },
  
  /**
  * Retrieve r-id for a given arc string.
  * @param {string} arc
  * @param {{arc: string, 'r-id': string}[]} R
  * @returns {string|null}
  */
  getRId(arc, R) {
    const found = R.find(e => e.arc === arc);
    return found ? found['r-id'] : null;
  },
  
  /**
  * Retrieve arc string by r-id from R1.
  * @param {string} rid
  * @param {{arc: string, 'r-id': string}[]} R1
  * @returns {string|null}
  */
  getArcFromRid(rid, R1) {
    const found = R1.find(r => r['r-id'] === rid);
    return found ? found.arc : null;
  },
  
  /**
  * Build adjacency graph from list of arc objects {arc: "x, y"}.
  * @param {{arc: string}[]} R
  * @returns {Record<string, string[]>}
  */
  buildGraph(R) {
    const g = {};
    R.forEach(a => {
      const [s, e] = a.arc.split(', ').map(s => s.trim());
      g[s] = g[s] || [];
      g[s].push(e);
    });
    return g;
  },
  
  /**
  * Identifies the source and sink vertices of a graph.
  * @param {Graph} graph - The graph to analyze.
  * @returns {Object} - An object containing the source and sink vertices.
  */
  getSourceAndSinkVertices(graph) {
    let source = null;
    let sink = null;
    
    // Find the source vertex (no incoming edges)
    source = graph.vertices.find(vertex => 
      !graph.edges.some(edge => edge.to === vertex)
    );
    
    // Find the sink vertex (no outgoing edges)
    sink = graph.vertices.find(vertex => 
      !graph.edges.some(edge => edge.from === vertex)
    );
    
    return { source, sink };
  },
  
  /**
  * Transforms the arcMap into a structure where keys are "fromVertexUID, toVertexUID".
  * @param {Object} arcMap - The original arcMap generated by buildArcMap.
  * @returns {Object} A transformed arcMap with keys as "fromVertexUID, toVertexUID".
  */
  transformArcMap(arcMap) {
    const transformedMap = {};
    
    Object.values(arcMap).forEach(arc => {
      const arcKey = `${arc.fromVertexUID}, ${arc.toVertexUID}`;
      if (!transformedMap[arcKey]) {
        transformedMap[arcKey] = [];
      }
      transformedMap[arcKey].push(arc);
    });
    
    return transformedMap;
  }
};

// src/models/rdltModel.js

export class RDLTModel {
  constructor() {
    // Dictionary of nodes keyed by their id.
    this.nodes = {};
    // Array of edges.
    this.edges = [];
  }

  // Add a node (vertex) to the model.
  addNode(node) {
    // Enrich the node with incoming/outgoing lists.
    this.nodes[node.id] = {
      ...node,
      incoming: [],
      outgoing: []
    };
  }

  // Add an edge to the model.
  addEdge(edge) {
    this.edges.push(edge);
    // Attach the edge to the source and target nodes.
    if (this.nodes[edge.from] && this.nodes[edge.to]) {
      this.nodes[edge.from].outgoing.push(edge);
      this.nodes[edge.to].incoming.push(edge);
    }
  }

  // Retrieve a node by id.
  getNode(id) {
    return this.nodes[id];
  }

  clone() {
    return new RDLTModel(this.nodes, this.edges);
  }

  /**
   * Returns the set of vertices that belong to the RBS induced by the given center nodeId.
   * According to Malinao 2023, vertices belonging to the RBS are:
   *  - The center node itself (nodeId)
   *  - Plus all nodes directly connected from the center by an epsilon ("ϵ") edge.
   *
   * @param {string} centerId - The node ID of the RBS center.
   * @returns {Array<string>} - An array of node IDs belonging to the RBS.
   */
  getVerticesInRBS(centerId) {
    const centerNode = this.getNode(centerId);
    if (!centerNode) return [];

    const rbsVertices = new Set();
    rbsVertices.add(centerId); // The center node always belongs to the RBS

    // Find immediate outgoing epsilon edges from the center
    centerNode.outgoing.forEach(edge => {
      if (edge.C === "ϵ") {
        rbsVertices.add(edge.to);
      }
    });

    return Array.from(rbsVertices);
  }


  // Reset the M attribute to 0 for all nodes in the model.
  resetMForNodes() {
    Object.values(this.nodes).forEach(node => {
      node.M = 0;
    });
  }

  // Returns the JSON representation of the model.
  toJSON() {
    return {
      vertices: Object.values(this.nodes),
      edges: this.edges
    };
  }

  // Static method: Create an RDLTModel from a JSON representation.
  static fromJSON(json) {
    const model = new RDLTModel();
    if (json.vertices && Array.isArray(json.vertices)) {
      json.vertices.forEach(v => {
        model.addNode(v);
      });
    }
    if (json.edges && Array.isArray(json.edges)) {
      json.edges.forEach(e => {
        model.addEdge(e);
      });
    }
    return model;
  }

  // -------------------------------
  // Methods used in Step 2 in applying Castillo's Mapping Algorithm
  // -------------------------------

  /**
   * Checks if there is a path from startId to targetId using a BFS.
   * @param {string} startId - The starting node id.
   * @param {string} targetId - The target node id.
   * @returns {boolean} True if targetId is reachable from startId.
   */
  isReachable(startId, targetId) {
    const visited = new Set();
    const queue = [startId];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === targetId) return true;
      visited.add(curr);
      const currNode = this.nodes[curr];
      if (currNode && currNode.outgoing) {
        for (const edge of currNode.outgoing) {
          if (!visited.has(edge.to)) {
            queue.push(edge.to);
          }
        }
      }
    }
    return false;
  }

  /**
   * Returns all unique elementary (cycle‑free) paths from startId to endId using DFS.
   * Each path is an array of node IDs.
   * @param {string} startId - The starting node id.
   * @param {string} endId - The ending node id.
   * @returns {Array<Array<string>>} Array of paths.
   */
  getElementaryPathsBetween(startId, endId) {
    const paths = [];
    const seenPaths = new Set();

    const dfs = (currentId, path, visited) => {
      if (currentId === endId) {
        const pathStr = path.join("->");
        if (!seenPaths.has(pathStr)) {
          seenPaths.add(pathStr);
          paths.push([...path]);
        }
        return;
      }
      const currentNode = this.nodes[currentId];
      if (!currentNode || !currentNode.outgoing) return;
      for (const edge of currentNode.outgoing) {
        const nextId = edge.to;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          path.push(nextId);
          dfs(nextId, path, visited);
          path.pop();
          visited.delete(nextId);
        }
      }
    };

    const visited = new Set([startId]);
    dfs(startId, [startId], visited);
    return paths;
  }

  /**
 * Static helper: Determines if there exists at least one sibling pair
 * among an array of processes.  A sibling pair is two processes that
 * share the same start and end nodes and have disjoint edge sets.
 *
 * @param {Array<Array<string>>} processes - Array of processes
 * @returns {boolean} True if at least one pair are siblings
 */
static hasAnySiblingPair(processes) {
  const n = processes.length;
  if (n < 2) return false;

  // Precompute each process's start, end, and edgeSet
  const meta = processes.map(proc => {
    const start = proc[0];
    const end = proc[proc.length - 1];
    const edgeSet = new Set();
    for (let i = 0; i + 1 < proc.length; i++) {
      edgeSet.add(`${proc[i]}-${proc[i + 1]}`);
    }
    return { start, end, edgeSet };
  });

  // Check every pair (i,j)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // same start & end?
      if (
        meta[i].start === meta[j].start &&
        meta[i].end   === meta[j].end
      ) {
        // are their edge sets disjoint?
        let disjoint = true;
        for (const e of meta[i].edgeSet) {
          if (meta[j].edgeSet.has(e)) {
            disjoint = false;
            break;
          }
        }
        if (disjoint) {
          // found one valid sibling pair
          return true;
        }
      }
    }
  }

  // no qualifying pair found
  return false;
}

  /**
   * Checks if a node qualifies as an OR-join.
   * (An OR-join node has at least 2 incoming edges that all share the same constraint value.)
   * @param {object} node - The node to check.
   * @returns {boolean} True if the node is an OR-join.
   */
  isOrJoin(node) {
    if (!node.incoming || node.incoming.length < 2) return false;
    const firstConstraint = node.incoming[0].C;
    return node.incoming.every(edge => edge.C === firstConstraint);
  }

  /**
   * For a given split node, checks if there is at least one candidate OR-join merge point.
   * A candidate OR-join merge point is a reachable node (via any path) that qualifies as an OR-join,
   * and for which there exist at least two unique elementary paths (from the split to the join)
   * that are siblings.
   * @param {object} vertex - The split node.
   * @returns {boolean} True if a proper OR-join merge point with sibling processes exists.
   */
  hasSiblingsWithORJoinMergePoint(vertex) {
    const candidateOrJoinVertices = Object.values(this.nodes).filter(n => {
      return this.isOrJoin(n) && this.isReachable(vertex.id, n.id);
    });
    // console.log(candidateOrJoinVertices);
    if (candidateOrJoinVertices.length === 0) return false;
    for (const joinVertex of candidateOrJoinVertices) {
      const processes = this.getElementaryPathsBetween(vertex.id, joinVertex.id);
      if (processes.length >= 2 && RDLTModel.hasAnySiblingPair(processes)) {
        return true;
      }
    }
    return false;
  }

  /**
   * For a given split node, returns true if there is at least one candidate join vertex that yields
   * at least two unique elementary paths that are not siblings (i.e. a problematic split).
   * @param {object} vertex - The split node.
   * @returns {boolean} True if the split’s outgoing branches are non-siblings.
   */
  hasNonSiblingPaths(vertex) {
    const outgoingEdges = this.edges.filter(e => e.from === vertex.id);
    if (outgoingEdges.length < 2) return false;
    const candidateJoinVertices = Object.values(this.nodes).filter(n => {
      return n.incoming && n.incoming.length >= 2 && this.isReachable(vertex.id, n.id);
    });
    if (candidateJoinVertices.length === 0) return true;
    for (const joinVertex of candidateJoinVertices) {
      const processes = this.getElementaryPathsBetween(vertex.id, joinVertex.id);
      if (processes.length >= 2 && RDLTModel.hasAnySiblingPair(processes)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if any outgoing edge from the given node is marked as an abstract arc.
   * @param {object} vertex - The node.
   * @returns {boolean} True if an outgoing edge has type "abstract".
   */
  hasAbstractArc(vertex) {
    const outgoingEdges = this.edges.filter(e => e.from === vertex.id);
    return outgoingEdges.some(e => e.type === "abstract");
  }

  /**
   * Checks for a cycle starting from the given node.
   * Returns true if the node is eventually reached again.
   * @param {object} vertex - The starting node.
   * @returns {boolean} True if a cycle is detected.
   */
  hasCycle(vertex) {
    const startId = vertex.id;
    const visited = new Set();
    const queue = [startId];
    while (queue.length > 0) {
      const curr = queue.shift();
      // If we revisit the start node after at least one step, a cycle exists.
      if (curr === startId && visited.size > 0) return true;
      visited.add(curr);
      const currNode = this.nodes[curr];
      if (currNode && currNode.outgoing) {
        for (const edge of currNode.outgoing) {
          if (!visited.has(edge.to)) {
            queue.push(edge.to);
          }
        }
      }
    }
    return false;
  }

  /**
   * Checks if a given split node satisfies "case 1" conditions.
   * It considers whether there is an OR-join merge point with sibling processes,
   * whether there are non-sibling paths, if any outgoing edge is abstract,
   * or if there is a cycle (loop) from this node.
   * @param {object} vertex - The split node to check.
   * @returns {boolean} True if any condition is met.
   */
  checkIfSplitCase1(vertex) {
    // If the vertex does not actually split (fewer than 2 outgoing edges), return false.
    const outgoingEdges = this.edges.filter(e => e.from === vertex.id);
    if (outgoingEdges.length < 2) return false;
    const siblings = this.hasSiblingsWithORJoinMergePoint(vertex);
    const nonSiblings = this.hasNonSiblingPaths(vertex);
    const hasAbstract = this.hasAbstractArc(vertex);
    const hasLoop = this.hasLoopingArc(vertex.id);
    // console.log(`${vertex.id}: siblingsOrJoin=${siblings}, nonSiblings=${nonSiblings}, areAbstractArcs=${hasAbstract}, hasALoopingProcess=${hasLoop}`);
    return {
      case1: siblings || nonSiblings || hasAbstract || hasLoop,
      isSiblingsOrJoin: siblings,
      isNonSiblings: nonSiblings,
      hasAbstract: hasAbstract,
      hasLoop: hasLoop
    };
  }

  /**
   * Checks if there is a looping arc (cycle) starting from the given node.
   * A looping arc exists if any outgoing edge from startId leads back to startId (directly or indirectly).
   * @param {string} startId - The id of the node to check for a loop.
   * @returns {boolean} True if a looping arc exists for the node.
   */
  hasLoopingArc(startId) {
    const node = this.nodes[startId];
    if (!node || !node.outgoing) return false;
    
    // Iterate through each outgoing edge.
    for (const edge of node.outgoing) {
      // Direct self-loop check.
      if (edge.to === startId) {
        return true;
      }
      // Indirect loop: if the target node can reach back to the startId.
      if (this.isReachable(edge.to, startId)) {
        return true;
      }
    }
    return false;
  }

}

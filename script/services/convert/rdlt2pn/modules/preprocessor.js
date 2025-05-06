// preprocessor.js
import { RDLTModel } from '../models/rdltModel.js';

/**
 * Helper function to produce a unique key for an edge.
 * This is used for mapping each edge to its computed reusability value.
 *
 * By including the C and L attributes, parallel edges
 * (same from/to) will still get distinct keys.
 *
 * @param {Object} edge
 * @param {string} edge.from  – source node id
 * @param {string} edge.to    – target node id
 * @param {string} edge.C     – the C–attribute (condition) on this arc
 * @param {number} edge.L     – the L–attribute (traversal bound) on this arc
 * @returns {string} a unique identifier for this edge
 */
function edgeKey(edge) {
  // return `${edge.from}->${edge.to}|C=${edge.C}|L=${edge.L}`;
  return `${edge.from}->${edge.to}`;
}


/**
 * Implements Johnson's algorithm to enumerate all simple cycles
 * in the directed (multi‑)graph represented by the RDLT, treating
 * parallel edges as distinct.
 *
 * @param {RDLTModel} model - The graph model which contains nodes and edges.
 * @returns {Array} - An array of cycles, where each cycle is an array of the actual edge objects.
 */
function findAllSimpleCycles(model) {
  const cycles = [];

  // Build adjacency from each vertex to the list of outgoing edge objects
  const graph = new Map();
  Object.values(model.nodes).forEach(n => graph.set(n.id, []));
  model.edges.forEach(edge => {
    if (graph.has(edge.from)) graph.get(edge.from).push(edge);
  });

  // Unblock utility
  function unblock(v, blocked, blockMap) {
    blocked.delete(v);
    if (blockMap.has(v)) {
      for (const w of blockMap.get(v)) {
        if (blocked.has(w)) unblock(w, blocked, blockMap);
      }
      blockMap.set(v, new Set());
    }
  }

  /**
   * DFS that tracks actual edges in stackEdges and vertices in stackV.
   * @returns {boolean} true if at least one cycle was found in this call.
   */
  function circuit(v, start, blocked, blockMap, stackV, stackEdges) {
    let foundCycle = false;
    blocked.add(v);

    for (const edge of graph.get(v) || []) {
      const w = edge.to;
      if (w === start) {
        // record the cycle as the edges in stackEdges plus this closing edge
        cycles.push([...stackEdges, edge]);
        foundCycle = true;
      } else if (!blocked.has(w)) {
        // visit w via this edge
        stackV.push(w);
        stackEdges.push(edge);
        blocked.add(w);

        if (circuit(w, start, blocked, blockMap, stackV, stackEdges)) {
          foundCycle = true;
        }

        // backtrack
        blocked.delete(w);
        stackEdges.pop();
        stackV.pop();
      }
    }

    if (foundCycle) {
      unblock(v, blocked, blockMap);
    } else {
      for (const edge of graph.get(v) || []) {
        const w = edge.to;
        if (!blockMap.has(w)) blockMap.set(w, new Set());
        blockMap.get(w).add(v);
      }
    }

    return foundCycle;
  }

  // Main loop: try each vertex as start, then delete it
  const vertices = Object.values(model.nodes).map(n => n.id);
  for (const start of vertices) {
    const blocked = new Set();
    const blockMap = new Map();
    // stackV = [start], stackEdges = []
    circuit(start, start, blocked, blockMap, [start], []);
    graph.delete(start);
  }

  return cycles;
}


function computeExpandedReusability(model, RBSmap, abstractArcPath, centerId) {
  let eRU = 0;

  // Identify all RBS centers
  const centers = Object.values(model.nodes).filter(n => n.M === 1).map(n => n.id);

  // For each center build its B subgraph and RU_B set
  const Bs = {}, RU_Bs = {};
  for (const center of centers) {
    Bs[center] = buildRBSsubgraph(model, RBSmap[center]);
    RU_Bs[center] = computeRBSReusability(Bs[center]);
  }

  const allRbsEdgeSets = centers.map(c => Bs[c].edgeSet);

  const IBr = InBridges(model, RBSmap[centerId]);
  IBr.forEach(inBridge => {
    const luv = computeLuv(model, Bs[centerId], inBridge, abstractArcPath, allRbsEdgeSets);
    const pathRU = pathReusability(abstractArcPath, RU_Bs[centerId], Bs[centerId]);
    eRU += luv*(pathRU+1);
  });
  return eRU;
}

/**
 * Given an RBS subgraph B, compute RU′(x,y) for every edge (x→y) in B,
 * per the definitions in Malinao‐2023:
 *   RU(x,y) = ∑_{c∋(x,y)} minL(c)
 *   RU′(x,y) = RU(x,y)     if RU(x,y) < L(x,y)
 *             = L(x,y)     otherwise
 *
 * @param {{ nodes:Set<string>, edgeSet:Set<{from,to,C,L}> }} B
 *    B.nodes   = set of RBS vertex‐IDs
 *    B.edgeSet = set of edge‐objects (with .from/.to/.C/.L) *inside* that RBS
 * @returns {Map<string,number>}
 *    Map from edgeKey(e) → RU′ value
 */
function computeRBSReusability(B) {
  // 1) build a tiny model containing just B
  const tmp = { nodes: {}, edges: [] };
  for (const id of B.nodes)       tmp.nodes[id] = { id };
  for (const e of B.edgeSet)      tmp.edges.push(e);

  // 2) enumerate every simple cycle in that tiny sub‐model
  const cycles = findAllSimpleCycles(tmp);

  // 3) precompute each cycle's min L
  const cycleMinL = cycles.map(cyc =>
    Math.min(...cyc.map(e => e.L))
  );

  // 4) initialize a running‐sum map (keyed by edgeKey)
  const ruSum = new Map();
  tmp.edges.forEach((e) => {
    ruSum.set(edgeKey(e), 0);
  });

  // 5) for each cycle, add its minL to every edge in that cycle
  cycles.forEach((cyc,i) => {
    const m = cycleMinL[i];
    for (const e of cyc) {
      // we need the *same* edgeKey(...) that we used above
      // look it up by matching `from,to,C,L` and position
      for (let j=0; j<tmp.edges.length; j++) {
        const te = tmp.edges[j];
        if (
          te.from === e.from &&
          te.to   === e.to   &&
          te.C    === e.C    &&
          te.L    === e.L
        ) {
          const k = edgeKey(te);
          ruSum.set(k, ruSum.get(k) + m);
          break;
        }
      }
    }
  });

  // 6) now finalize RU′ by enforcing loop‐safety:
  //      RU′ = RU  if RU < L
  //        else = L
  const result = new Map();
  tmp.edges.forEach((e) => {
    const k  = edgeKey(e);
    const ru = ruSum.get(k);
    result.set(k, ru < e.L ? ru : e.L);
  });

  return result;
}

/**
 * Given one abstractArcPath and an RU map for its RBS,
 * returns the minimum RU among the concrete edges.
 *
 * @param {{uPrime:string,vPrime:string,concretePath:string[]}} abstractArcPath
 * @param {Map<string,number>}    ruMap
 *   keys look like "x2->x3|C=ϵ|L=2" → RU value
 * @param {{ nodes:Set<string>, edgeSet:Set<Object> }} B
 *   your RBS subgraph; edgeSet must be a Set of the *actual* edge
 *   objects: { from, to, C, L }
 * @returns {number}
 *   the minimum RU across all consecutive edges in concretePath;
 *   if none match, returns 0
 */
function pathReusability(abstractArcPath, ruMap, B) {
  const { concretePath } = abstractArcPath;
  const reusabilities = [];

  // for each hop in the abstractArcPath…
  for (let i = 0; i + 1 < concretePath.length; i++) {
    const u = concretePath[i];
    const v = concretePath[i + 1];

    // look up the actual edge object inside our RBS‐subgraph
    const edgeObj = [...B.edgeSet].find(e =>
      e.from === u && e.to === v
    );
    if (!edgeObj) continue;      // this hop isn't in B, skip

    // build exactly the same key you used to populate ruMap
    const mapKey = edgeKey(edgeObj);

    // grab its RU if present
    const ru = ruMap.get(mapKey);
    if (ru != null) {
      reusabilities.push(ru);
    }
  }

  // if we found any, return the min, otherwise 0
  return reusabilities.length
    ? Math.min(...reusabilities)
    : 0;
}


/**
 * Constructs the subgraph B = (V',E') of the RBS identified by the
 * given list of node IDs.  We only need to collect those nodes and
 * any edges of the original model that lie entirely within that node set.
 *
 * @param {RDLTModel} model       – the full RDLT
 * @param {Iterable<string>} rbsNodeIds – the IDs of all vertices in that RBS
 * @returns {{ nodes: Set<string>, edgeSet: Set<string> }}
 */
function buildRBSsubgraph(model, rbsNodeIds) {
  // ensure we have a Set for fast membership tests
  const B = {
    nodes: new Set(rbsNodeIds),
    edgeSet: new Set()
  };

  // collect all original edges that lie fully inside this RBS
  for (const e of model.edges) {
    if (B.nodes.has(e.from) && B.nodes.has(e.to)) {
      // record by “from->to” so we can quickly test membership later
      B.edgeSet.add(e);
    }
  }

  return B;
}

/**
 * Returns all “in‑bridge” edges into the RBS centered at `center`.
 * An in‑bridge is any edge (u→v) where v belongs to the RBS but u does not.
 *
 * @param {RDLTModel} model
 * @param {Iterable<string>} rbsNodeIds – the IDs of all vertices in that RBS
 * @returns {Set<Object>}  a set of edge objects from model.edges
 */
function InBridges(model, rbsNodeIds) {
  const memberSet = new Set(rbsNodeIds || []);
  const result = new Set();
  for (const edge of model.edges) {
    if (!memberSet.has(edge.from) && memberSet.has(edge.to)) {
      result.add(edge);
    }
  }
  return result;
}

// Cycles_part: keep only cycles crossing the B boundary
function Cycles_part(R, B, allCycles) {
  return allCycles.filter(cycle => {
    let hasIn=false, hasOut=false;
    for (const e of cycle) {
      if (B.edgeSet.has(e)) hasIn=true;
      else hasOut=true;
    }
    return hasIn && hasOut;
  });
}

/**
 * PCA_of_cycle – pseudocritical arcs excluding *any* RBS edge
 *
 * @param {Array<{from:string,to:string,C:string,L:number}>} cycle
 *    the list of edges in one simple cycle
 * @param {Iterable<Set<string>>} allRbsEdgeSets
 *    a collection of edge‐key‐Sets, one per RBS in your model
 * @returns {Set<string>}
 *    the edgeKey(...) strings of those cycle edges with minimal L
 *    after removing *all* RBS edges from consideration
 */
function PCA_of_cycle(cycle, allRbsEdgeSets) {
  const globalRbsObjects = new Set(
    allRbsEdgeSets.flatMap(oneRbsSet => [...oneRbsSet])
  );
  // console.log(globalRbsObjects);

  // 1) keep only the cycle edges *not* in any RBS
  const nonRbsArcs = cycle.filter(
    e => !globalRbsObjects.has(e)
  );

  if (nonRbsArcs.length === 0) {
    // no outside‐RBS edges → no pseudocritical arcs
    return new Set();
  }

  // 2) find the minimum L among those remaining
  const minL = Math.min(...nonRbsArcs.map(e => e.L));

  // 3) collect all whose L equals that minimum
  //    return them as edgeKey(...) strings
  return new Set(
    nonRbsArcs
      .filter(e => e.L === minL)
  );
}

/**
 * computeLuv(R, B, inBridge, abstractPath) → Number
 *
 * Compute
 *    l(u,v) = min( inBridge.L, ∑{ L(r,s) |
 *                (r,s) ∈ PCA(c) AND (u,v),(r,s) ∈ ArcsOfCycle(c) } )
 * for only those cycles c that
 *  - contain the inBridge, AND
 *  - traverse an arc in abstractPath.concretePath
 *
 * If no cycle passes both filters, return 1.
 *
 * @param {RDLTModel} R
 * @param {{nodes:Set<string>, edgeSet:Set<string>}} B
 * @param {{from,to,C,L}} inBridge
 * @param {{uPrime:string,vPrime:string,concretePath:string[]}} abstractPath
 * @returns {number}
 */
function computeLuv(R, B, inBridge, abstractPath, allRbsEdgeSets) {
  // 1) only the sub‐cycles that cross B at all
  const cyclePart = Cycles_part(R, B, findAllSimpleCycles(R));

  // 2) exact‐edge matcher
  function hasExactEdge(cyc, e) {
    return cyc.some(x=>
      x.from === e.from &&
      x.to   === e.to   &&
      x.C    === e.C    &&
      x.L    === e.L
    );
  }

  // 3) now filter and collect
  const candidates = [];
  const { concretePath } = abstractPath;

  cyclePart.forEach(cyc => {
    // must see the inBridge
    if (!hasExactEdge(cyc, inBridge)) return;

    const pathOk = concretePath
      .slice(0, -1)    // drop the final node; it has no outgoing arc
      .some((u, i) => {
        const v = concretePath[i+1];
        return cyc.some(x => x.from === u && x.to === v);
      });
    if (!pathOk) return;

    // cycle qualifies → pull its PCA
    const pcaSet = PCA_of_cycle(cyc, allRbsEdgeSets);
    if (pcaSet.size === 0) return;
    
    // console.log("cycle: ",cyc);
    // console.log("pcaSet: ", pcaSet);
    // map to L’s and take the min
    // const minPcaL = Math.min(
    //   ...Array.from(pcaSet).map(e => {
    //     return e.L;
    //   })
    // );

    // record the loop‐safe L
    candidates.push(pcaSet);
  });

  // console.log("candidates:",candidates);
  const distinctPCAs = filterOverlappingPCAs(candidates);
  // console.log("distinctPCAs:",[...distinctPCAs]);
  const SumDistinctPCAs = [...distinctPCAs].reduce((sum, arc) => sum + arc.L, 0);
  // const minDistinctPCA = Math.min(...[...distinctPCAs].map(arc => arc.L));
  // console.log("SumDistinctPCAs:",[...distinctPCAs].reduce((sum, arc) => sum + arc.L, 0));
  // 4) done
  if (candidates.length === 0) return 1;
  return Math.min(inBridge.L,SumDistinctPCAs);
}

/**
 * @typedef {{ from: string, to: string, C: string, L: number }} Arc
 * @param {Array<Set<Arc>>} pcaPerCycleList - Array of PCA sets, one per cycle
 * @returns {Set<Arc>} - Final distinct PCA arcs to sum
 */
function filterOverlappingPCAs(pcaPerCycleList) {
  const arcMap = new Map(); // key: uniqueArcId → Arc with minimum L

  for (const cyclePCAs of pcaPerCycleList) {
    for (const arc of cyclePCAs) {
      const key = edgeKey(arc);
      if (!arcMap.has(key)) {
        arcMap.set(key, arc);
      } else {
        const existing = arcMap.get(key);
        if (arc.L < existing.L) {
          arcMap.set(key, arc); // keep arc with smaller L
        }
      }
    }
  }

  return new Set(arcMap.values());
}

/**
 * Updates the L-values of abstract arcs in the level‑1 vertex‑simplified RDLT (R1)
 * using the computed expanded reusability values from the original model.
 *
 * @param {RDLTModel} model - The original RDLT model.
 * @param {string} centerId - The RBS center vertex id.
 * @param {Array} abstractArcPaths - An array where each element represents an abstract arc.
 *        Each element is an object with properties:
 *          - uPrime: starting vertex id in R1
 *          - vPrime: ending vertex id in R1
 *          - concretePath: an array of vertex ids for the underlying concrete path.
 * @returns {Array} - An array of updated abstract arc objects with new L attribute.
 */
function generateAbstractArcs(RDLTModel, RBSmap, abstractArcPaths, centerId) {
  const abstractArcs = abstractArcPaths.map(abstractArc => {
    // console.log(abstractArc);
    const eRU = computeExpandedReusability(RDLTModel, RBSmap, abstractArc, centerId);
    const newL = eRU + 1;
    return {
      from: abstractArc.uPrime,
      to: abstractArc.vPrime,
      L: newL,
      C: 'ϵ', // Abstract arcs use a null condition.
      type: "abstract",
      path: abstractArc.concretePath.join(',')
    };
  });
  return abstractArcs;
}

/**
 * Checks if a node is an in-bridge within its reset-bound subsystem.
 * A node is an in-bridge if it has at least one incoming edge from outside its RBS.
 *
 * @param {Object} node - The node object.
 * @param {string} rbsCenter - The id of the RBS center.
 * @param {Object} vertexToRBS - A mapping from node id to RBS center id.
 * @returns {boolean}
 */
function isInBridge(node, rbsCenter, vertexToRBS) {
  if (!node.incoming) return false;
  return node.incoming.some(edge => {
    return (!vertexToRBS[edge.from] || vertexToRBS[edge.from] !== rbsCenter);
  });
}

/**
 * Checks if a node is an out-bridge within its reset-bound subsystem.
 * A node is an out-bridge if it has at least one outgoing edge to a node outside its RBS.
 *
 * @param {Object} node - The node object.
 * @param {string} rbsCenter - The id of the RBS center.
 * @param {Object} vertexToRBS - A mapping from node id to RBS center id.
 * @returns {boolean}
 */
function isOutBridge(node, rbsCenter, vertexToRBS) {
  if (!node.outgoing) return false;
  return node.outgoing.some(edge => {
    return (!vertexToRBS[edge.to] || vertexToRBS[edge.to] !== rbsCenter);
  });
}

/**
 * Performs Partial EVSA on the original RDLT graph to produce a level‑1 graph.
 * Nodes not in any RBS are kept in full; nodes in an RBS are kept only if they serve as in‐
 * bridges or out‐ bridges.
 *
 * @param {RDLTModel} rdltGraph - The original RDLT graph.
 * @returns {RDLTModel} - The level‑1 simplified RDLT.
 */
function expandedVertexSimplifyR1(rdltGraph) {
  const vertices = Object.values(rdltGraph.nodes);
  const edges = rdltGraph.edges;

  // --- Identify all reset-bound subsystems (RBS) ---
  const RBSmap = {};      // center id -> array of node ids in that RBS
  const vertexToRBS = {}; // node id -> center id for nodes in an RBS
  vertices.forEach(node => {
    if (node.M === 1) {
      const centerId = node.id;
      // Use a BFS (assumed to be provided by the model) on epsilon edges ("ϵ")
      const subgraphNodeIds = rdltGraph.getVerticesInRBS(centerId);
      RBSmap[centerId] = subgraphNodeIds;
      subgraphNodeIds.forEach(id => {
        vertexToRBS[id] = centerId;
      });
    }
  });

  // --- Build Level-1 vertex set (V1) ---
  const V1 = [];
  vertices.forEach(node => {
    const clone = { ...node, type: "c", M: 0, isInBridge: false, isOutBridge: false };
    if (vertexToRBS[node.id]) {
      const rbsCenter = vertexToRBS[node.id];
      if (isInBridge(node, rbsCenter, vertexToRBS)) {
        clone.isInBridge = true;
      }
      if (isOutBridge(node, rbsCenter, vertexToRBS)) {
        clone.isOutBridge = true;
      }
    }
    if (!(node.id in vertexToRBS) || clone.isInBridge || clone.isOutBridge) {
      V1.push(clone);
    }
  });

  // --- Build Level-1 edge set (E1) ---
  const V1_ids = new Set(V1.map(n => n.id));
  const E1 = [];
  edges.forEach(edge => {
    if (V1_ids.has(edge.from) && V1_ids.has(edge.to)) {
      if (
        (edge.from in vertexToRBS) &&
        (edge.to in vertexToRBS) &&
        vertexToRBS[edge.from] === vertexToRBS[edge.to]
      ) {
        return;
      }
      E1.push({ ...edge });
    }
  });

  // Create a new level-1 graph.
  const level1Graph = new RDLTModel();
  V1.forEach(n => level1Graph.addNode(n));
  E1.forEach(edge => level1Graph.addEdge(edge));

  // Save the RBS information for later use.
  level1Graph.RBSmap = RBSmap;
  level1Graph.vertexToRBS = vertexToRBS;

  return level1Graph;
}

/**
 * For each RBS in the level‑1 simplified graph, builds a level‑2 subgraph and
 * extracts all abstract arc connections by enumerating:
 *   • every simple path from each in‑bridge to each out‑bridge,
 *   • every simple path from each out‑bridge to each in‑bridge,
 *   • every simple cycle starting and ending at each in‑bridge without passing
 *     through any other bridge node,
 *   • every simple cycle starting and ending at each out‑bridge without passing
 *     through any other bridge node.
 * After collecting these concrete paths, it creates new abstract arcs on the
 * original level‑1 graph — updating their L‑values based on the expanded
 * reusability of the underlying original graph — and returns the map of
 * centerId → level‑2 subgraph for further processing.
 *
 * @param {RDLTModel} level1Graph - The level‑1 simplified RDLT (will be extended in place).
 * @param {RDLTModel} originalGraph - The original RDLT model (used to derive reusability).
 * @returns {Object} - A mapping from each RBS center id to its level‑2 RDLTModel subgraph.
 */
function expandedVertexSimplifyR2(level1Graph, originalGraph) {
  const level2 = {};
  const RBSmap = level1Graph.RBSmap;
  // For each RBS center (assume one or more)
  for (const centerId in RBSmap) {
    let abstractArcPaths = [];
    const rbsNodeIds = new Set(RBSmap[centerId]);
    // Filter nodes in the original graph that belong to this RBS.
    const allNodes = Object.values(originalGraph.nodes);
    let inBridges = allNodes.filter(
      node => rbsNodeIds.has(node.id) && isInBridge(node, centerId, level1Graph.vertexToRBS)
    );
    let outBridges = allNodes.filter(
      node => rbsNodeIds.has(node.id) && isOutBridge(node, centerId, level1Graph.vertexToRBS)
    );

    // Build a level‑2 subgraph for the RBS.
    const level2Graph = new RDLTModel();
    rbsNodeIds.forEach(id => {
      const orig = originalGraph.getNode(id);
      level2Graph.addNode({ ...orig, type: "c", M: 0 });
    });
    originalGraph.edges.forEach(edge => {
      if (rbsNodeIds.has(edge.from) && rbsNodeIds.has(edge.to)) {
        level2Graph.addEdge({ ...edge });
      }
    });
    level2[centerId] = level2Graph;

    // Create a set of bridge node ids (both in‑ and out‑bridges).
    const bridgeSet = new Set([...inBridges.map(n => n.id), ...outBridges.map(n => n.id)]);

    // Prepare pairs for non-self paths: inBridge→outBridge and outBridge→inBridge.
    const pairs = [];
    for (const inNode of inBridges) {
      for (const outNode of outBridges) {
        if (inNode.id !== outNode.id) {
          pairs.push({ u: inNode, v: outNode });
        }
      }
    }
    for (const outNode of outBridges) {
      for (const inNode of inBridges) {
        if (outNode.id !== inNode.id) {
          pairs.push({ u: outNode, v: inNode });
        }
      }
    }

    // Enumerate paths for non-self pairs.
    for (const pair of pairs) {
      const simplePaths = enumerateSimplePathsGraph(level2Graph, pair.u.id, pair.v.id);
      simplePaths.forEach(path => {
        abstractArcPaths.push({
          uPrime: pair.u.id,
          vPrime: pair.v.id,
          concretePath: path
        });
      });
    }

    // For self-loop paths (from a bridge node back to itself):
    // We use a specialized DFS that allows cycles only if no other bridge node appears.
    const selfNodes = [...inBridges, ...outBridges];
    // To avoid duplicates, we can use a set of node ids already processed:
    const processedSelf = new Set();
    for (const node of selfNodes) {
      if (!processedSelf.has(node.id)) {
        const selfPaths = enumerateSelfPathsGraph(level2Graph, node.id, bridgeSet);
        selfPaths.forEach(path => {
          abstractArcPaths.push({
            uPrime: node.id,
            vPrime: node.id,
            concretePath: path
          });
        });
        processedSelf.add(node.id);
      }
    }

    // Create Abstract Arcs for each abstract path and append it to the level1Graph
    const abstractArcs = generateAbstractArcs(originalGraph, RBSmap, abstractArcPaths, centerId);
    level1Graph.edges =level1Graph.edges.concat(abstractArcs);
  }
  return level2;
}

/**
 * Enumerates all simple paths (without repeated nodes) between startId and endId using DFS.
 *
 * @param {RDLTModel} model - The graph model.
 * @param {string} startId - The starting node id.
 * @param {string} endId - The target node id.
 * @returns {Array} - An array of paths, where each path is an array of node ids.
 */
function enumerateSimplePathsGraph(model, startId, endId) {
  const paths = [];
  function dfs(current, visited, path) {
    if (current === endId) {
      paths.push([...path]);
      return;
    }
    const node = model.getNode(current);
    if (!node || !node.outgoing) return;
    node.outgoing.forEach(edge => {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        path.push(edge.to);
        dfs(edge.to, visited, path);
        path.pop();
        visited.delete(edge.to);
      }
    });
  }
  dfs(startId, new Set([startId]), [startId]);
  return paths;
}

/**
 * Enumerates self paths for a given node (start and end are the same) in the graph.
 * Only returns paths whose intermediate nodes (if any) are not in the specified bridgeSet.
 *
 * @param {RDLTModel} model - The graph model.
 * @param {string} nodeId - The id of the node for which we want self paths.
 * @param {Set} bridgeSet - A set of node ids that qualify as inBridge or outBridge.
 * @returns {Array} - An array of self paths (each path is an array of node ids).
 */
function enumerateSelfPathsGraph(model, nodeId, bridgeSet) {
  const paths = [];
  // Check for direct self-loop edge first.
  // const node = model.getNode(nodeId);
  // if (node && node.outgoing) {
  //   node.outgoing.forEach(edge => {
  //     if (edge.to === nodeId) {
  //       paths.push([nodeId, nodeId]);
  //     }
  //   });
  // }
  // For indirect self paths, we allow DFS that returns to nodeId
  // and later filter out those with any intermediate node in bridgeSet.
  function dfs(current, path, visited) {
    // Allow returning to nodeId only if the path length is > 1.
    if (current === nodeId && path.length > 1) {
      // Exclude the starting/ending node.
      const intermediates = path.slice(1, path.length - 1);
      const containsBridge = intermediates.some(id => bridgeSet.has(id));
      if (!containsBridge) {
        paths.push([...path]);
      }
      // Do not continue from nodeId to avoid infinite cycles.
      return;
    }
    const currNode = model.getNode(current);
    if (!currNode || !currNode.outgoing) return;
    for (const edge of currNode.outgoing) {
      // Allow revisiting nodeId even if it is in visited in order to complete a self-loop.
      if (edge.to === nodeId || !visited.has(edge.to)) {
        visited.add(edge.to);
        path.push(edge.to);
        dfs(edge.to, path, visited);
        path.pop();
        visited.delete(edge.to);
      }
    }
  }
  // Start DFS; initialize visited with the starting node removed (so that we allow a return to nodeId)
  dfs(nodeId, [nodeId], new Set());
  return paths;
}

/**
 * Extend a level‑1 RDLT in place by adding a dummy source ("i") and sink ("o")
 * and connecting them to its current sources and sinks.
 *
 * @param {RDLTModel} level1Model - The level‑1 RDLT model to be extended.
 */
function extendWithDummyEndpoints(level1Model) {
  // 1. Compute incoming counts to identify current sources.
  const incomingCount = {};
  Object.values(level1Model.nodes).forEach(n => { incomingCount[n.id] = 0; });
  level1Model.edges.forEach(e => {
    if (incomingCount.hasOwnProperty(e.to)) incomingCount[e.to]++;
  });
  const sources = Object.values(level1Model.nodes)
    .filter(n => incomingCount[n.id] === 0);

  // 2. Compute outgoing counts to identify current sinks.
  const outgoingCount = {};
  Object.values(level1Model.nodes).forEach(n => { outgoingCount[n.id] = 0; });
  level1Model.edges.forEach(e => {
    if (outgoingCount.hasOwnProperty(e.from)) outgoingCount[e.from]++;
  });
  const sinks = Object.values(level1Model.nodes)
    .filter(n => outgoingCount[n.id] === 0);

  // 3. Add dummy source and sink nodes.
  const dummySource = { id: "i", type: "c", label: "Source", M: 0 };
  const dummySink   = { id: "o", type: "c", label: "Sink", M: 0 };
  level1Model.addNode(dummySource);
  level1Model.addNode(dummySink);

  // 4. Connect dummy source to each original source.
  sources.forEach(src => {
    level1Model.addEdge({
      from: "i",
      to: src.id,
      C: "ϵ",
      L: 1
    });
  });

  // 5. Connect each original sink to dummy sink.
  sinks.forEach(snk => {
    level1Model.addEdge({
      from: snk.id,
      to: "o",
      C: `${snk.id}_o`,  // unique label per sink
      L: 1
    });
  });
}


/* --- Main Preprocessor Function --- */

/**
 * The main preprocessor function that integrates the EVSA routines.
 * It performs vertex simplification, extracts abstract arcs, updates their L-values,
 * and extends the level‑1 graph with dummy source and sink edges.
 *
 * @param {RDLTModel} rdltGraph - The input RDLT model.
 * @returns {Object} - An object containing the level‑1 processed graph and level‑2 RBS subgraphs.
 */
export function preprocessRDLT(rdltGraph, extend = true) {
  // Step 1: Partial Expanded Vertex Simplification to obtain the level‑1 vertex simplified model.
  const level1 = expandedVertexSimplifyR1(rdltGraph);
  
  // Step 2: Expanded Vertex Simplification to  build level-2 vertex simplified model/s.
  // Also appends abstract arcs to the level-1 model from the paths in the level-2 models.
  const level2 = expandedVertexSimplifyR2(level1, rdltGraph);

  // console.log(level1);
  // console.log(level2);

  // Step 3: Extends the level-1 model with dummy source and sink nodes. 
  if(extend) extendWithDummyEndpoints(level1);

  // console.log("Extended Level1: ",level1);

  return {
    level1: level1,
    level2: level2
  };
}

export function combineLevels(level1, level2) {
  // Create a new RDLT model to hold the combined levels.
  const combinedModel = new RDLTModel();

  // First, add all nodes and edges from level1.
  Object.values(level1.nodes).forEach(node => {
    combinedModel.addNode({ ...node });
  });
  level1.edges.forEach(edge => {
    combinedModel.addEdge({ ...edge });
  });

  // Then, for each level2 model (each corresponding to a reset-bound subsystem),
  // rename the nodes and edges (for example, by appending an apostrophe)
  // and add them to the combined model.
  for (const centerId in level2) {
    const level2Model = level2[centerId];
    // Optionally, store the group info:
    combinedModel.rbsGroups = combinedModel.rbsGroups || {};
    combinedModel.rbsGroups[centerId] = [];

    // Rename and add nodes.
    Object.values(level2Model.nodes).forEach(node => {
      const renamedNode = {
        ...node,
        id: node.id + "'",
        label: node.label ? node.label + "'" : "",
        // Mark if this node is the center of the RBS:
        center: (node.id === centerId),
        rbsGroup: centerId
      };
      combinedModel.addNode(renamedNode);
      combinedModel.rbsGroups[centerId].push(node.id);
    });

    // Rename and add edges.
    level2Model.edges.forEach(edge => {
      const renamedEdge = {
        ...edge,
        from: edge.from + "'",
        to: edge.to + "'",
        rbsGroup: centerId
      };
      combinedModel.addEdge(renamedEdge);
    });
  }

  return combinedModel;
}
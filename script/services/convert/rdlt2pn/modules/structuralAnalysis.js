// src/modules/structuralAnalysis.js
/**
 * Returns all source places (places with no incoming arcs) regardless of whether they are auxiliary.
 */
function getAllSourcePlaces(pnModel) {
  return Object.values(pnModel.places).filter(place => place.incoming.length === 0);
}

/**
 * Returns core (non-auxiliary) source places.
 */
function getGlobalSourcePlace(pnModel) {
  return getAllSourcePlaces(pnModel).filter(place => !place.auxiliary);
}

/**
 * Returns auxiliary source places.
 */
function getAuxiliarySourcePlaces(pnModel) {
  return getAllSourcePlaces(pnModel).filter(place => place.auxiliary);
}

/**
 * Returns all sink places (places with no outgoing arcs).
 */
function getSinkPlaces(pnModel) {
  return Object.values(pnModel.places).filter(place => place.outgoing.length === 0);
}

/**
 * Build a directed graph using all places (both core and auxiliary) and all transitions.
 * Reset arcs are excluded.
 */
function buildFullGraph(pnModel) {
  const graph = {};
  // Add nodes for all places.
  Object.values(pnModel.places).forEach(place => {
    graph[place.id] = [];
  });
  // Add nodes for all transitions.
  Object.values(pnModel.transitions).forEach(trans => {
    graph[trans.id] = [];
  });
  // Add arcs if arc type is not "reset".
  pnModel.arcs.forEach(arc => {
    if (arc.type !== 'reset' && graph.hasOwnProperty(arc.from) && graph.hasOwnProperty(arc.to)) {
      graph[arc.from].push(arc.to);
    }
  });
  return graph;
}

/**
 * Detailed BFS that logs each traversal step.
 */
function bfsDetailed(start, graph) {
  const visited = new Set();
  const queue = [start];
  const traversalSteps = []; // Record each step
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = graph[current] || [];
      traversalSteps.push({ current, neighbors, queue: [...queue] });
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
  }
  return { visited, traversalSteps };
}

/**
 * Check connectivity from the designated source to the designated sink.
 * This function:
 *  - Builds the full graph (including all places and transitions, excluding reset arcs).
 *  - Designates a source from the full list of source places. We choose "Pim" if available,
 *    otherwise the first core source.
 *  - Designates a sink from the full list of sink places. We choose "Po" if available.
 *  - Performs a forward BFS starting from the designated source.
 *  - Flags as an error any visited place (node) that is a place with no outgoing arcs but isn't the designated sink.
 *  - Returns detailed logs including the visited nodes, missing nodes, and any isolated nodes.
 */
export function isConnectedFromSourceToSink(pnModel) {
  const graph = buildFullGraph(pnModel);
  const nodes = Object.keys(graph);
  if (nodes.length === 0) {
    return {
      connected: false,
      visited: new Set(),
      missing: [],
      isolatedNodes: [],
      traversalSteps: []
    };
  }
  
  // Determine designated source: choose "Pim" if it exists among all source places; otherwise, choose first core source.
  const allSources = getAllSourcePlaces(pnModel);
  let designatedSource;
  if (allSources.find(place => place.id === "Pim")) {
    designatedSource = "Pim";
  } else {
    const coreSources = getGlobalSourcePlace(pnModel);
    designatedSource = coreSources.length > 0 ? coreSources[0].id : allSources[0].id;
  }
  
  // Determine designated sink: choose "Po" if it exists; otherwise, first sink.
  const allSinks = getSinkPlaces(pnModel);
  let designatedSink;
  if (allSinks.find(place => place.id === "Po")) {
    designatedSink = "Po";
  } else {
    designatedSink = allSinks[0].id;
  }
  
  // Perform forward BFS from the designated source.
  const forwardResult = bfsDetailed(designatedSource, graph);
  
  // Check if designated sink is reached.
  const sinkReached = forwardResult.visited.has(designatedSink);
  
  // Identify isolated nodes: any visited node that is a place (not a transition) with no outgoing edges, except the designated sink.
  const isolatedNodes = [];
  for (const node of forwardResult.visited) {
    if (pnModel.places[node] && graph[node].length === 0 && node !== designatedSink) {
      isolatedNodes.push(node);
    }
  }
  
  // Also list nodes from the full graph that were not reached.
  const unreached = nodes.filter(node => !forwardResult.visited.has(node));

  let auxiliary = [];
  unreached.forEach(nodeid => {
    if(pnModel.places[nodeid] && pnModel.places[nodeid].auxiliary) auxiliary.push(nodeid);
  });

  // const auxiliary = nodes.filter(node => node.auxiliary);
  
  // The connectivity check passes if:
  //   - the designated sink is reached, and
  //   - no isolated nodes are found.
  const stronglyConnected = sinkReached && (isolatedNodes.length === 0);

  return {
    stronglyConnected,
    // visited: forwardResult.visited,
    unreached,
    auxiliary,
    isolatedNodes,
    // traversalSteps: forwardResult.traversalSteps,
    source: designatedSource,
    sink: designatedSink//,
    // report: `The sink ${designatedSink} is ${stronglyConnected? "reachable" : "unreachanle"} from the source ${designatedSource} with ${isolatedNodes.length} isolated nodes and ${unreached.length} unreached nodes, having ${auxiliary.length} out of ${unreached.length} unreached nodes are auxiliary places.`
  };
}

/**
 * Main function for structural analysis.
 * Returns an object with issues and connectivity details.
 */
export function structuralAnalysis(pnModel) {
  const issues = [];
  
  // Get lists of all source places, core source places, and auxiliary source places.
  const allSources = getAllSourcePlaces(pnModel);
  const coreSources = getGlobalSourcePlace(pnModel);
  const auxiliarySources = getAuxiliarySourcePlaces(pnModel);
  
  if (allSources.length !== 1) {
    issues.push(`Expected exactly 1 source place; found ${allSources.length}. (Non-auxiliary: ${coreSources.length}, Auxiliary: ${auxiliarySources.length})`);
  }
  
  const sinks = getSinkPlaces(pnModel);
  if (sinks.length !== 1) {
    issues.push(`Expected exactly 1 sink place; found ${sinks.length}.`);
  }
  
  // Check that every transition is fully connected.
  Object.values(pnModel.transitions).forEach(transition => {
    if (transition.incoming.length === 0) {
      issues.push(`Transition ${transition.id} has no incoming arcs.`);
    }
    if (transition.outgoing.length === 0) {
      issues.push(`Transition ${transition.id} has no outgoing arcs.`);
    }
  });
  
  // Check connectivity from the designated source to the designated sink.
  const connectivityResult = isConnectedFromSourceToSink(pnModel);
  if (!connectivityResult.stronglyConnected) {
    issues.push(`The designated sink (${connectivityResult.sink}) is not reachable from the designated source (${connectivityResult.source}).`);
    if (connectivityResult.isolatedNodes.length > 0) {
      issues.push("Isolated nodes (places with no outgoing arcs, excluding sink): " + connectivityResult.isolatedNodes.join(", "));
    }
  }
  const transitions = Object.values(pnModel.transitions);
  const places = Object.values(pnModel.places);
  const transitionsCount = transitions.length;
  const placesCount = places.length;
  const globalSource = places.filter(place => place.globalSource).map(place => place.id);
  const globalSink = places.filter(place => place.globalSink).map(place => place.id);
  const resetTransitions = transitions.filter(trans => trans.resetTransition).map(trans => trans.id);
  const checkTransitions = transitions.filter(trans => trans.checkTransition).map(trans => trans.id);
  const traverseTransitions = transitions.filter(trans => trans.traverseTransition).map(trans => trans.id);
  const auxiliaryPlaces = places.filter(place => place.auxiliary).map(place => place.id);
  const checkedPlaces = places.filter(place => place.checkedPlace).map(place => place.id);
  const traversedPlaces = places.filter(place => place.traversedPlace).map(place => place.id);
  const consensusPlaces = places.filter(place => place.consensusPlace).map(place => place.id);
  const unconstrainedPlaces = places.filter(place => place.unconstrainedPlace).map(place => place.id);
  const splitPlaces = places.filter(place => place.splitPlace).map(place => place.id);
  
  return { 
    issues, 
    connectivityDetails: connectivityResult,
    transitionsCount,
    placesCount,
    globalSource,
    globalSink,
    resetTransitions,
    checkTransitions,
    traverseTransitions,
    auxiliaryPlaces,
    checkedPlaces,
    traversedPlaces,
    consensusPlaces,
    unconstrainedPlaces,
    splitPlaces
  };
}

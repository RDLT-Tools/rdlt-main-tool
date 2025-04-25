import { findSiblings } from "./Siblings.js";
import { Vertex } from "../classes/Vertex.js";

function getAntecedentSet(graph, start, end) {
  const descendants = new Set();

  function dfs(node) {
    // Get neighbors or empty array if undefined
    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (neighbor !== end && !descendants.has(neighbor)) {
        descendants.add(neighbor);
        dfs(neighbor);
      }
    }
  }

  dfs(start); // Start the DFS traversal
  return descendants;
}

// function getDescendants(graph, node, visited = null) {
//   // Initialize visited Set if not provided
//   if (visited === null) {
//     visited = new Set();
//   }

//   // Add current node to visited
//   visited.add(node);

//   // Get neighbors or empty array if none exist
//   const neighbors = graph.get(node) || [];

//   // Recursively visit all unvisited neighbors
//   for (const neighbor of neighbors) {
//     if (!visited.has(neighbor)) {
//       getDescendants(graph, neighbor, visited);
//     }
//   }

//   return visited;
// }

function getDescendants(graph, node, visited = null) {
  if (visited === null) visited = new Set();
  visited.add(node);

  // Get neighbor MAP (not array)
  const neighborsMap = graph.get(node) || new Map();

  // Extract Vertex objects from nested Map keys
  const neighbors = [...neighborsMap.keys()];

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      getDescendants(graph, neighbor, visited);
    }
  }
  return visited;
}

function ifPathExists(graph, start, target) {
  const queue = [start]; // Queue holds Vertex objects only
  const visited = new Set();

  while (queue.length > 0) {
    const currentNode = queue.shift(); // Always a Vertex object

    // Early exit if target found
    if (currentNode === target) return true;

    if (!visited.has(currentNode)) {
      visited.add(currentNode);

      // Get neighbors (ensure they're Vertex objects)
      const neighbors = graph.get(currentNode) || [];

      // Validate and add ONLY Vertex objects to queue
      for (const neighbor of neighbors.keys()) {
        if (neighbor instanceof Vertex && !visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  return false;
}

export function checkIfClosedStructure(
  graph,
  disjointPaths,
  siblingPaths,
  splitPoints = null,
  joinPoints = null
) {
  const closedStrucListCon1 = new Map();
  const closedStrucListCon2 = new Map();
  const closedStrucList = new Map();

  // Condition 1 calculation
  for (const join of joinPoints) {
    if (join.join_type === "AND") {
      const processesAtYCount = join.incoming.length;
      let relevantSplits = [];

      // Find splits paired with this join in siblingPaths
      for (const [keyStr] of siblingPaths) {
        const [_, joinName] = keyStr.split("-");
        if (joinName === join.name) {
          const splitName = keyStr.split("-")[0];
          const split = splitPoints.find((sp) => sp.name === splitName);
          if (split) relevantSplits.push(split);
        }
      }

      if (relevantSplits.length === 0) {
        console.log(
          "No relevant split with sibling paths for AND-join: ",
          join.name
        );
        relevantSplits = disjointPaths
          .filter((path) => path[path.length - 1] === join)
          .map((path) => path[0]);
      }

      for (const split of relevantSplits) {
        const key = `${split.name}-${join.name}`;
        const pathCount = siblingPaths.get(key)?.length || 0;
        closedStrucListCon1.set(key, pathCount === processesAtYCount);
      }
    } else {
      // OR join case
      for (const [keyStr] of siblingPaths) {
        const [splitName, joinName] = keyStr.split("-");
        if (joinName === join.name) {
          closedStrucListCon1.set(keyStr, true);
        }
      }
    }
  }

  console.log(
    "Closed Structure List Condition 1:",
    Array.from(closedStrucListCon1.entries()).map(([k, v]) => ({ [k]: v }))
  );

  // Condition 2 calculation
  for (const [keyStr] of closedStrucListCon1) {
    const [splitName, joinName] = keyStr.split("-");
    const split = splitPoints.find((sp) => sp.name === splitName);
    const join = joinPoints.find((jp) => jp.name === joinName);
    const paths = siblingPaths.get(keyStr) || [];

    if (split.outgoing.length > paths.length && join.join_type === "AND") {
      const processesFromX = disjointPaths.filter((p) => {
        return (
          p[0].name === splitName &&
          p[p.length - 1].name !== joinName &&
          !paths.some((sp) => arraysEqual(sp, p))
        );
      });

      const hasValidPath = processesFromX.some((process) => {
        let lastNode = process[process.length - 1];
        let descendants = getDescendants(graph, join);
        let isDescendant = descendants.has(lastNode);
        let hasPath = ifPathExists(graph, lastNode, join);
        return isDescendant || hasPath;
      });

      closedStrucListCon2.set(keyStr, hasValidPath);
    } else {
      closedStrucListCon2.set(keyStr, true);
    }
  }

  console.log(
    "Closed Structure List Condition 2:",
    Array.from(closedStrucListCon2.entries()).map(([k, v]) => ({ [k]: v }))
  );

  // Combine conditions
  for (const [keyStr] of closedStrucListCon1) {
    const con1 = closedStrucListCon1.get(keyStr);
    const con2 = closedStrucListCon2.get(keyStr);
    closedStrucList.set(keyStr, con1 && con2);
  }

  return closedStrucList;
}

export function checkComplementarity(graph, splitPoints, joinPoints) {
  const { siblingPaths, allDisjointPaths } = findSiblings(
    graph,
    splitPoints,
    joinPoints
  );
  const splitJoinStrucList = new Map();

  const closedStructure = checkIfClosedStructure(
    graph,
    allDisjointPaths,
    siblingPaths,
    splitPoints,
    joinPoints
  );

  // Build split-join structure list
  for (const [keyStr] of closedStructure) {
    const [splitName, joinName] = keyStr.split("-");
    const start = splitPoints.find((sp) => sp.name === splitName);
    const end = joinPoints.find((jp) => jp.name === joinName);
    if (start && end) {
      splitJoinStrucList.set(keyStr, [start.split_type, end.join_type]);
    }
  }

  // Log sibling paths
  for (const [, paths] of siblingPaths) {
    for (const path of paths) {
      console.log(`Sibling Path: ${path.map((n) => n.name).join(" -> ")}`);
    }
  }

  console.log(
    "Split-Join Struc List:",
    Array.from(splitJoinStrucList.entries()).map(([k, v]) => ({ [k]: v }))
  );

  console.log(
    "Closed Structure List:",
    Array.from(closedStructure.entries()).map(([k, v]) => ({ [k]: v }))
  );

  // Calculate complementarity
  const complementarityList = new Map();
  for (const [keyStr, structure] of splitJoinStrucList) {
    const isValidCombination =
      (structure[0] === "OR" && structure[1] === "OR") ||
      (structure[0] === "AND" && structure[1] === "AND");

    const isClosed = closedStructure.get(keyStr) || false;
    complementarityList.set(
      keyStr,
      isValidCombination && isClosed ? true : false
    );
  }

  return complementarityList;
}

// Helper function for array comparison
function arraysEqual(a, b) {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}

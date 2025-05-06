import { findDisjointPaths } from "../algos/edmonds.js";

function serializeVertex(vertex) {
  return vertex.name || vertex.id || JSON.stringify(vertex);
}

function serializePath(path) {
  if (!Array.isArray(path)) {
    console.warn("Expected path to be an array, but got:", path);
    return "[Invalid Path]";
  }
  return path.map(serializeVertex).join(" -> ");
}

function findSplitJoinPoints(graph) {
  let splitPoints = new Set();
  let joinPoints = new Set();

  for (let x in graph) {
    let neighbors = Object.keys(graph[x]);
    if (neighbors.length > 1) {
      splitPoints.add(x);
    }
  }

  for (let y in graph) {
    let incomingEdges = [];
    for (let u in graph) {
      if (graph[u]?.[y]) {
        incomingEdges.push(u);
      }
    }
    if (incomingEdges.length > 1) {
      joinPoints.add(y);
    }
  }

  return { splitPoints, joinPoints };
}

// function findSiblings(graph, splitPoints, joinPoints) {
//   console.log("Finding siblings");

//   let allDisjointPaths = [];
//   let disjointPathsDict = {};

//   for (let start of splitPoints) {
//     for (let end of joinPoints) {
//       console.log(`Finding paths from ${start} to ${end}`);
//       let disjointPaths = findDisjointPaths(graph, start, end);
//       if (disjointPaths.length) {
//         allDisjointPaths.push(...disjointPaths);
//       }
//     }
//   }

//   allDisjointPaths.forEach((path) => {
//     let key = `${path[0]}-${path[path.length - 1]}`;
//     if (!disjointPathsDict[key]) {
//       disjointPathsDict[key] = new Set();
//     }
//     disjointPathsDict[key].add(path.join(","));
//   });

//   if (Object.keys(disjointPathsDict).length === 0) {
//     console.log("No paths found between any node pairs");
//   }

//   let siblingPaths = Object.fromEntries(
//     Object.entries(disjointPathsDict).filter(([_, paths]) => paths.size > 1)
//   );

//   let debugSiblingPaths = Object.fromEntries(
//     Object.entries(disjointPathsDict)
//       .filter(([_, paths]) => paths.size > 1)
//       .map(([key, pathSet]) => {
//         // Convert Set to Array first
//         const readablePaths = Array.from(pathSet).map(serializePath);
//         return [key, readablePaths];
//       })
//   );

//   console.log("Debuggable siblingPaths:", debugSiblingPaths);

//   return [siblingPaths, allDisjointPaths];
// }

function findSiblings(graph, splitPoints, joinPoints) {
  console.log("Finding siblings");

  const allDisjointPaths = [];

  // Finding all disjoint paths
  for (const start of splitPoints) {
    for (const end of joinPoints) {
      console.log(`Finding paths from ${start.name} to ${end.name}`);
      const disjointPaths = findDisjointPaths(graph, start, end);
      if (disjointPaths && disjointPaths.length > 0) {
        allDisjointPaths.push(...disjointPaths);
      }
    }
  }

  const disjointPathsDict = new Map();

  // Group paths by their start and end nodes
  for (const path of allDisjointPaths) {
    const source = path[0];
    const sink = path[path.length - 1];
    const key = `${source.name}-${sink.name}`;

    if (!disjointPathsDict.has(key)) {
      disjointPathsDict.set(key, {
        paths: [],
        pathStrs: new Set(),
      });
    }

    const entry = disjointPathsDict.get(key);
    const pathStr = path.map((node) => node.name).join(",");

    // Ensure paths are unique
    if (!entry.pathStrs.has(pathStr)) {
      entry.paths.push(path);
      entry.pathStrs.add(pathStr);
    }
  }

  if (disjointPathsDict.size === 0) {
    console.log("No paths found between any node pairs");
  }

  // Filter to only include entries with multiple paths
  const siblingPaths = new Map();
  for (const [key, entry] of disjointPathsDict) {
    if (entry.paths.length > 1) {
      siblingPaths.set(key, entry.paths);
    }
  }

  return { siblingPaths, allDisjointPaths };
}

// function findSiblings(graph, splitPoints, joinPoints) {
//   console.log("Finding siblings");

//   const allDisjointPaths = [];

//   // Finding all disjoint paths
//   for (const start of splitPoints) {
//     for (const end of joinPoints) {
//       console.log(`Finding paths from ${start.name} to ${end.name}`);
//       const disjointPaths = findDisjointPaths(graph, start, end);
//       if (disjointPaths?.length) {
//         allDisjointPaths.push(...disjointPaths);
//       }
//     }
//   }

//   // Using a Map with WeakMap for object reference keys
//   const disjointPathsDict = new Map();

//   // Group paths by their start and end node objects
//   for (const path of allDisjointPaths) {
//     const source = path[0];
//     const sink = path[path.length - 1];
//     const key = [source, sink]; // Object reference tuple

//     // Get or create entry
//     let entry = disjointPathsDict.get(key);
//     if (!entry) {
//       entry = new Set();
//       disjointPathsDict.set(key, entry);
//     }

//     // Add path (using object references)
//     entry.add(path);
//   }

//   if (disjointPathsDict.size === 0) {
//     console.log("No paths found between any node pairs");
//   }

//   // Filter to only include entries with multiple paths
//   const siblingPaths = new Map();
//   for (const [key, paths] of disjointPathsDict) {
//     if (paths.size > 1) {
//       siblingPaths.set(key, [...paths]); // Convert Set to Array
//     }
//   }

//   return {
//     siblingPaths, // Map with [source, sink] object tuples as keys
//     allDisjointPaths,
//   };
// }

export { findSplitJoinPoints, findSiblings };

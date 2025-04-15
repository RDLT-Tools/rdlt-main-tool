import { findDisjointPaths } from "../algos/edmonds.js";

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

function findSiblings(graph, splitPoints, joinPoints) {
  console.log("Finding siblings");

  let allDisjointPaths = [];
  let disjointPathsDict = {};

  for (let start of splitPoints) {
    for (let end of joinPoints) {
      console.log(`Finding paths from ${start} to ${end}`);
      let disjointPaths = findDisjointPaths(graph, start, end);
      if (disjointPaths.length) {
        allDisjointPaths.push(...disjointPaths);
      }
    }
  }

  allDisjointPaths.forEach((path) => {
    let key = `${path[0]}-${path[path.length - 1]}`;
    if (!disjointPathsDict[key]) {
      disjointPathsDict[key] = new Set();
    }
    disjointPathsDict[key].add(path.join(","));
  });

  if (Object.keys(disjointPathsDict).length === 0) {
    console.log("No paths found between any node pairs");
  }

  let siblingPaths = Object.fromEntries(
    Object.entries(disjointPathsDict).filter(([_, paths]) => paths.size > 1)
  );

  return [siblingPaths, allDisjointPaths];
}

export { findSplitJoinPoints, findSiblings };

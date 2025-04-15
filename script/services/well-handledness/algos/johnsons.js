function johnson(graph) {
  function unblock(node) {
    if (blocked.get(node)) {
      blocked.set(node, false);
      while (blockMap.get(node).length > 0) {
        let neighbor = blockMap.get(node).pop();
        unblock(neighbor);
      }
    }
  }

  function findCycles(v, start) {
    let foundCycle = false;
    path.push(v);
    blocked.set(v, true);

    for (let neighbor of graph.get(v)) {
      if (neighbor === start) {
        cycles.push([...path]);
        foundCycle = true;
      } else if (!blocked.get(neighbor)) {
        if (findCycles(neighbor, start)) {
          foundCycle = true;
        }
      }
    }

    if (foundCycle) {
      unblock(v);
    } else {
      for (let neighbor of graph.get(v)) {
        if (!blockMap.get(neighbor).includes(v)) {
          blockMap.get(neighbor).push(v);
        }
      }
    }

    path.pop();
    return foundCycle;
  }

  let cycles = [];
  let path = [];
  let blocked = new Map();
  let blockMap = new Map();

  // Initialize blockMap and blocked for each vertex
  for (let node of graph.keys()) {
    blocked.set(node, false);
    blockMap.set(node, []);
  }

  for (let start of graph.keys()) {
    for (let v of graph.keys()) {
      blocked.set(v, false);
      blockMap.set(v, []);
    }
    findCycles(start, start);
  }

  // Remove duplicate cycles by storing them as sorted arrays
  let uniqueCycles = [];
  let seen = new Set();

  for (let cycle of cycles) {
    let sortedCycle = cycle
      .map((v) => v._name)
      .sort()
      .toString();
    if (!seen.has(sortedCycle)) {
      seen.add(sortedCycle);
      uniqueCycles.push(cycle);
    }
  }

  return uniqueCycles;
}

export { johnson };

function unweightArcs(lAttr) {
  const unweighted = new Map();

  for (const arc of lAttr.keys()) {
    if (!arc?.start || !arc?.end) continue;

    // Initialize start vertex entry if needed
    if (!unweighted.has(arc.start)) {
      unweighted.set(arc.start, new Map());
    }
    if (!unweighted.has(arc.end)) {
      unweighted.set(arc.end, new Map());
    }

    // Add end vertex connection with weight 1
    const connections = unweighted.get(arc.start);
    connections.set(arc.end, 1);
  }

  return unweighted;
}

export { unweightArcs };

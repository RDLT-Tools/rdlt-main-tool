export function modifiedActivityExtraction(RDLT, source, sink) {
  // Initialize data structures using Maps to handle object keys
  // const activityProfile = new Map();
  const activityProfile = {};
  const traversalTimes = new Map();
  let currentVertex = source;
  let reachesSink = false;
  const problematicVertices = new Set();
  let currentTime = 1;
  const checkedTimes = new Map();

  // Helper functions
  function isUnconstrainedArc(currentArc) {
    if (
      currentArc.end.join_type === "AND" ||
      currentArc.end.join_type === "MIX"
    ) {
      const candidateArcs = RDLT.arcs.filter(
        (arc) => arc.end === currentArc.end && arc.start !== currentArc.start
      );
      for (const arc of candidateArcs) {
        if (
          arc.c_attr !== "0" &&
          currentArc.c_attr !== arc.c_attr &&
          !checkedTimes.has(arc)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  function selectNextArc(vertex) {
    const candidates = RDLT.arcs.filter((arc) => arc.start === vertex);
    return candidates.length > 0 ? candidates[0] : null;
  }

  function getAlternativeArcs(currentArc) {
    return RDLT.arcs.filter(
      (arc) => arc.start === currentArc.start && arc.end !== currentArc.end
    );
  }

  function selectAlternativeArc(alternatives) {
    if (alternatives.length === 0) return null;
    const cycleArcs = new Set();
    RDLT.cycleList.forEach((cycle) => {
      cycle.arcs.forEach((arc) => cycleArcs.add(arc));
    });
    const prioritized = alternatives.map((arc) => ({
      priority: cycleArcs.has(arc) ? 1 : 0,
      arc: arc,
    }));
    const maxPriority = Math.max(...prioritized.map((p) => p.priority));
    const topChoices = prioritized
      .filter((p) => p.priority === maxPriority)
      .map((p) => p.arc);
    return topChoices[Math.floor(Math.random() * topChoices.length)];
  }

  function backtrack(sourceArc, currentArc) {
    for (const arc of RDLT.arcs) {
      if (arc.end === currentArc.start) {
        if (!traversalTimes.has(arc)) return arc;
        const alternatives = getAlternativeArcs(arc);
        for (const alt of alternatives) {
          if (
            !traversalTimes.has(alt) ||
            traversalTimes.get(alt).length < alt.l_attr
          ) {
            return alt;
          }
        }
        if (arc.start !== sourceArc) {
          return backtrack(sourceArc, arc);
        }
      }
    }
    return null;
  }

  // Main processing loop
  let nextArc = selectNextArc(currentVertex);
  while (currentVertex !== sink) {
    if (!nextArc) {
      problematicVertices.add(currentVertex);
      break;
    }

    if (
      !traversalTimes.has(nextArc) ||
      traversalTimes.get(nextArc).length < nextArc.l_attr
    ) {
      if (isUnconstrainedArc(nextArc)) {
        // Process valid arc
        const joinArcs = Array.from(checkedTimes.keys()).filter(
          (arc) => arc.end === nextArc.end && arc.start !== nextArc.start
        );

        let maxTime = currentTime;
        if (joinArcs.length > 0) {
          const joinTimes = joinArcs.map((arc) =>
            Math.max(...checkedTimes.get(arc))
          );
          maxTime = Math.max(currentTime, ...joinTimes);
        }

        // Update data structures
        [nextArc, ...joinArcs].forEach((arc) => {
          if (!traversalTimes.has(arc)) traversalTimes.set(arc, []);
          traversalTimes.get(arc).push(maxTime);

          if (!activityProfile[maxTime]) {
            activityProfile[maxTime] = new Set();
          }
          activityProfile[maxTime].add(arc.id);
        });

        joinArcs.forEach((arc) => checkedTimes.delete(arc));
        currentTime = Math.max(...traversalTimes.get(nextArc)) + 1;
        currentVertex = nextArc.end;
        nextArc = selectNextArc(currentVertex);
      } else {
        // Handle constrained arc
        if (!checkedTimes.has(nextArc)) checkedTimes.set(nextArc, []);
        checkedTimes.get(nextArc).push(currentTime);

        if (checkedTimes.get(nextArc).length > nextArc.l_attr) {
          problematicVertices.add(currentVertex);
          console.error("DEADLOCK DETECTED");
          break;
        }

        nextArc = backtrack(source, nextArc);
        if (!nextArc) {
          console.error("DEADLOCK DETECTED");
          break;
        }
        currentVertex = nextArc.start;
      }
    } else {
      // Handle arc capacity full
      const alternatives = getAlternativeArcs(nextArc);
      nextArc = selectAlternativeArc(alternatives);
      if (!nextArc) {
        problematicVertices.add(currentVertex);
        break;
      }
      currentVertex = nextArc.start;
    }
  }

  // Final checks and cleanup
  reachesSink = currentVertex === sink;
  if (reachesSink) {
    console.log("Reached sink vertex");
  } else {
    console.error(`Stopped at vertex: ${currentVertex.identifier}`);
  }

  // Deduplicate traversal times
  traversalTimes.forEach((times, arc) => {
    traversalTimes.set(arc, [...new Set(times)]);
  });

  return {
    activityProfile: activityProfile,
    problematicVertices: Array.from(problematicVertices),
    traversalTimes: Array.from(traversalTimes.entries()),
    reachesSink,
  };
}

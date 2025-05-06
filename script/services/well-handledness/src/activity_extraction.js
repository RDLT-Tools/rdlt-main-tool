export function modifiedActivityExtraction(RDLT, source, sink) {
  const activityProfile = {};
  const traversalTimes = new Map(); // Using Map for traversalTimes
  let currentVertex = source;
  let reachesSink = false;
  const problematicVertices = new Set();
  let currentTime = 1;
  const checkedTimes = new Map(); // Changed to Map for checkedTimes
  const parallelQueue = [];

  function isUnconstrainedArc(current, checkedTimes, currentTime) {
    if (current.end.join_type === "AND" || "MIX") {
      const candidateArcs = RDLT.arcs.filter(
        (arc) => arc.end === current.end && arc.start !== current.start
      );
      for (const arc of candidateArcs) {
        if (arc.c_attr !== "0") {
          if (current.c_attr !== arc.c_attr && !checkedTimes.has(arc)) {
            // Changed to Map.has()
            return false;
          }
        }
      }
    }
    return true;
  }

  function selectNextArc(currentVertex, arcs) {
    const candidateArcs = arcs.filter((arc) => arc.start === currentVertex);

    const cycleArcs = new Set();
    for (const cycle of RDLT.cycle_list) {
      for (const arc of cycle.arcs) {
        cycleArcs.add(arc);
      }
    }

    const prioritized = [];
    for (const arc of candidateArcs) {
      const priority = cycleArcs.has(arc) ? 1 : 0;
      prioritized.push({ priority, arc });
    }

    const maxPriority = Math.max(...prioritized.map((item) => item.priority));
    const topChoices = prioritized
      .filter((item) => item.priority === maxPriority)
      .map((item) => item.arc);

    return topChoices.length > 0
      ? topChoices[Math.floor(Math.random() * topChoices.length)]
      : null;

    // return candidateArcs.length > 0 ? candidateArcs[0] : null;
  }

  function getAlternativeOutgoingArcs(currentArc, arcs) {
    return arcs.filter(
      (arc) => arc.start === currentArc.start && arc.end !== currentArc.end
    );
  }

  function selectAlternativeArc(alternatives) {
    if (alternatives.length === 0) {
      return null;
    }

    const cycleArcs = new Set();
    for (const cycle of RDLT.cycle_list) {
      for (const arc of cycle.arcs) {
        cycleArcs.add(arc);
      }
    }

    const prioritized = [];
    for (const arc of alternatives) {
      const priority = cycleArcs.has(arc) ? 1 : 0;
      prioritized.push({ priority, arc });
    }

    const maxPriority = Math.max(...prioritized.map((item) => item.priority));
    const topChoices = prioritized
      .filter((item) => item.priority === maxPriority)
      .map((item) => item.arc);

    return topChoices[Math.floor(Math.random() * topChoices.length)];
  }

  function backtrack(source, currentArc, traversalTimes, currentTime) {
    for (const arc of RDLT.arcs) {
      if (arc.end === currentArc.start) {
        if (!traversalTimes.has(arc)) {
          return arc;
        } else {
          const alternatives = getAlternativeOutgoingArcs(arc, RDLT.arcs);
          for (const alternative of alternatives) {
            if (
              !traversalTimes.has(alternative) ||
              traversalTimes.get(alternative).length < alternative.l_attr
            ) {
              return alternative;
            }
          }
          if (arc.start !== source) {
            return backtrack(source, arc, traversalTimes, currentTime);
          }
        }
      }
    }
    return null;
  }

  let nextArc = selectNextArc(currentVertex, RDLT.arcs);
  while (currentVertex !== sink || parallelQueue.length > 0) {
    if (nextArc === null) {
      problematicVertices.add(currentVertex);
      break;
    }

    if (
      !traversalTimes.has(nextArc) ||
      traversalTimes.get(nextArc).length < nextArc.l_attr
    ) {
      if (isUnconstrainedArc(nextArc, checkedTimes, currentTime)) {
        // Get join arcs from checkedTimes Map
        const joinArcs = [];
        for (const [arc, times] of checkedTimes) {
          if (arc.end === nextArc.end && arc.start !== nextArc.start) {
            joinArcs.push({ arc, times });
          }
        }

        const maxTime =
          joinArcs.length > 0
            ? Math.max(
                currentTime,
                ...joinArcs.map(({ times }) => Math.max(...times))
              )
            : currentTime;

        // Process join arcs
        for (const { arc, times } of joinArcs) {
          if (!traversalTimes.has(arc)) traversalTimes.set(arc, []);
          traversalTimes.get(arc).push(maxTime);
          if (!activityProfile[maxTime]) activityProfile[maxTime] = new Set();
          activityProfile[maxTime].add(arc.id);
          checkedTimes.delete(arc); // Changed to Map.delete()
        }

        // Process nextArc
        if (!traversalTimes.has(nextArc)) traversalTimes.set(nextArc, []);
        traversalTimes.get(nextArc).push(maxTime);
        if (!activityProfile[maxTime]) activityProfile[maxTime] = new Set();
        activityProfile[maxTime].add(nextArc.id);

        currentTime = Math.max(...traversalTimes.get(nextArc)) + 1;
        currentVertex = nextArc.end;
        nextArc = selectNextArc(currentVertex, RDLT.arcs);
      } else {
        // Handle constrained arc case
        if (!checkedTimes.has(nextArc)) checkedTimes.set(nextArc, []);
        checkedTimes.get(nextArc).push(currentTime);

        if (checkedTimes.get(nextArc).length > nextArc.l_attr) {
          problematicVertices.add(currentVertex);
          console.log("DEADLOCK DETECTED");
          break;
        }

        nextArc = backtrack(source, nextArc, traversalTimes, currentTime);

        if (nextArc === null) {
          console.log("DEADLOCK DETECTED");
          break;
        } else {
          currentVertex = nextArc.start;
        }

        // Calculate prevTime using Map iteration
        let prevTime = 0;
        for (const [arc, times] of traversalTimes) {
          if (arc.end === nextArc.start) {
            prevTime = Math.max(prevTime, times[times.length - 1] || 0);
          }
        }

        currentTime = prevTime + 1;
      }
    } else {
      const alternatives = getAlternativeOutgoingArcs(nextArc, RDLT.arcs);
      if (alternatives.length === 0) {
        problematicVertices.add(currentVertex);
        break;
      } else {
        nextArc = selectAlternativeArc(alternatives);
        currentVertex = nextArc.start;
      }
    }
  }

  if (currentVertex === sink) {
    reachesSink = true;
    console.log("Reached sink vertex: ", reachesSink);
  } else {
    console.log(
      `Did not reach sink vertex due to error encountered in vertex: ${currentVertex.name}`
    );
  }

  // Convert Maps to objects for return (optional)
  const traversalTimesObj = {};
  for (const [arc, times] of traversalTimes) {
    traversalTimesObj[arc.id] = [...new Set(times)];
  }

  const checkedTimesObj = {};
  for (const [arc, times] of checkedTimes) {
    checkedTimesObj[arc.id] = times;
  }

  return {
    activityProfile,
    problematicVertices: Array.from(problematicVertices),
    traversalTimes: traversalTimesObj,
    checkedTimes: checkedTimesObj,
  };
}

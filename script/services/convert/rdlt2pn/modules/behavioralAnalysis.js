// src/modules/behavioralAnalysis.js

/**
 * Returns an object mapping each place's id to its initial token count.
 */
function getInitialMarking(pnModel) {
  const marking = {};
  Object.values(pnModel.places).forEach(place => {
    marking[place.id] = place.tokens;
  });
  return marking;
}

/**
 * Determines which transitions are enabled given the current marking.
 * A transition is enabled if for every incoming arc (of type "normal") from a place,
 * that place has at least the required number of tokens (arc.weight or 1).
 */
function getEnabledTransitions(pnModel, marking) {
  const enabled = [];
  Object.values(pnModel.transitions).forEach(transition => {
    let canFire = true;
    transition.incoming.forEach(arc => {
      if (pnModel.places[arc.from] && arc.type === "normal") {
        const required = arc.weight || 1;
        if (marking[arc.from] < required) {
          canFire = false;
        }
      }
    });
    if (canFire) {
      enabled.push(transition);
    }
  });
  return enabled;
}
/**
 * Fires a transition, updating the marking accordingly.
 * Processes all normal incoming arcs first (subtract tokens),
 * then all reset incoming arcs (set to zero),
 * and finally adds tokens on outgoing normal arcs.
 */
function fireTransition(pnModel, transition, marking) {
  // Clone the marking so we don't mutate the original.
  const newMarking = { ...marking };

  // 1) Process all normal incoming arcs (consume tokens).
  transition.incoming
    .filter(arc => arc.type === "normal" && pnModel.places[arc.from])
    .forEach(arc => {
      const weight = arc.weight || 1;
      newMarking[arc.from] -= weight;
    });

  // 2) Then process all reset incoming arcs (clear tokens).
  transition.incoming
    .filter(arc => arc.type === "reset" && pnModel.places[arc.from])
    .forEach(arc => {
      newMarking[arc.from] = 0;
    });

  // 3) Process outgoing normal arcs (produce tokens).
  transition.outgoing
    .filter(arc => arc.type === "normal" && pnModel.places[arc.to])
    .forEach(arc => {
      const weight = arc.weight || 1;
      newMarking[arc.to] = (newMarking[arc.to] || 0) + weight;
    });

  return newMarking;
}
/**
 * Recursively simulates firing sequences from the given marking.
 *
 * At each recursion, before firing any transitions,
 * the enabled transitions (their IDs) at the current marking are stored
 * in the current (last) step in the firing sequence.
 *
 * @param {Object} pnModel - The Petri net model.
 * @param {Object} marking - The current marking (dictionary mapping place id -> token count).
 * @param {Array} sequence - The firing sequence so far (each element is a step object).
 * @param {number} steps - The current time step count.
 * @param {number} maxSteps - Maximum simulation steps.
 * @returns {Array} An array of complete firing sequences (each a list of step objects).
 */
function simulateRec(pnModel, marking, sequence, steps, maxSteps) {
  // Get the list of enabled transitions at the current marking.
  const enabled = getEnabledTransitions(pnModel, marking);
  const enabledIds = enabled.map(transition => transition.id);

  // console.log('\nTimestep: ',steps,':',enabledIds);

  // Before any firing at this step, update the last step to record enabledTransitions.
  if (sequence.length > 0) {
    sequence[sequence.length - 1].enabledTransitions = enabledIds;
  }
  
  // Base case: if no transitions enabled or maxSteps reached, record this sequence.
  if (enabled.length === 0 || steps >= maxSteps) {
    const finalStep = {
      marking: marking,
      firedTransitions: [],
      enabledTransitions: enabledIds,
      log: `Step ${steps + 1}: No transitions enabled.`
    };
    return [sequence.concat([finalStep])];
  }

  // Build a map grouping enabled transitions by the source place of their incoming normal arcs.
  const normalIncomingGroups = {};
  enabled.forEach(transition => {
    const normalIncoming = transition.incoming.filter(
      arc =>
        arc.type === "normal" &&
        pnModel.places[arc.from] &&                 // place exists
        !pnModel.places[arc.from].auxiliary         // exclude auxiliary places
    );
    if (normalIncoming.length === 0) {
      const key = "__no_normal__";
      if (!normalIncomingGroups[key]) {
        normalIncomingGroups[key] = [];
      }
      normalIncomingGroups[key].push(transition);
    } else {
      normalIncoming.forEach(arc => {
        if (!normalIncomingGroups[arc.from]) {
          normalIncomingGroups[arc.from] = [];
        }
        if (!normalIncomingGroups[arc.from].some(t => t.id === transition.id)) {
          normalIncomingGroups[arc.from].push(transition);
        }
      });
    }
  });

  // for (const [key, value] of Object.entries(normalIncomingGroups)) {
  //   let transtionList = [];
  //   value.forEach(trans => {
  //     transtionList.push(trans.id);
  //   });
  //   console.log(`${key}: `,transtionList.join(','));
  // }
  // console.log("normalIncomingGroups",normalIncomingGroups);

  // To ensure each enabled transition is fired only once per recursion,
  // we iterate over the groups in sorted order and remove duplicates across groups.
  const processedTransitionIds = new Set();
  const uniqueGroups = [];
  Object.keys(normalIncomingGroups)
    .sort()  // sort keys for deterministic order
    .forEach(placeId => {
      const transitions = normalIncomingGroups[placeId].filter(
        transition => !processedTransitionIds.has(transition.id)
      );
      if (transitions.length > 0) {
        uniqueGroups.push({ place: placeId, transitions });
        transitions.forEach(t => processedTransitionIds.add(t.id));
      }
    });

  // console.log('UniqueGroups:',uniqueGroups);
  
  // Partition uniqueGroups into:
  // - uniqueTransitions: groups with exactly one transition.
  // - splitGroups: groups with 2 or more transitions.
  const uniqueTransitions = [];
  const splitGroups = [];
  uniqueGroups.forEach(group => {
    if (group.transitions.length === 1) {
      uniqueTransitions.push(group.transitions[0]);
    } else if (group.transitions.length >= 2) {
      splitGroups.push(group);
    }
  });

  // console.log("uniqueTransitions: ");
  // uniqueTransitions.forEach(transition =>{
  //   console.log(" "+transition.id);
  // });
  // console.log("splitGroups: ");
  // splitGroups.forEach(group =>{
  //   console.log(` ${group.place} -> `);
  //   group.transitions.forEach( t =>{
  //     console.log(`  ${t.id}`);
  //   })
  // });

  // For the split groups, compute all combinations of choices.
  function cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    return arrays.reduce((acc, curr) => {
      const res = [];
      acc.forEach(a => {
        curr.forEach(b => {
          res.push(a.concat([b]));
        });
      });
      return res;
    }, [[]]);
  }
  const splitChoices = cartesianProduct(splitGroups.map(group => group.transitions));
  const combinations = splitChoices.length > 0 ? splitChoices : [[]];

  // console.log("combinations:");
  // combinations.forEach(choiceCombination => {
  //   choiceCombination.forEach(transition => {
  //     console.log(` ${transition.id}`);
  //   })
  // });

  let allNextSequences = [];
  // The set of transitions to fire concurrently at this step.
  // 3) For each combination from the split groups, fire concurrently with the unique transitions.
  //    Clone the marking once per branch so each choice gets its own copy.
  combinations.forEach(choiceCombination => {
    // Create a fresh copy of the marking for this branch
    let branchMarking = { ...marking };
    const firedTransitionIds = [];

    // Determine which transitions to fire in this branch
    const transitionsToFire = uniqueTransitions.concat(choiceCombination);

    // Fire each transition in turn, updating branchMarking and recording IDs
    transitionsToFire.forEach(transition => {
      branchMarking = fireTransition(pnModel, transition, branchMarking);
      firedTransitionIds.push(transition.id);
    });

    // Build the new step for this branch
    const newStep = {
      marking: branchMarking,
      firedTransitions: firedTransitionIds,
      log: `Step ${steps + 1}: Fired transitions ${firedTransitionIds.join(", ")}.`
    };

    // Append the new step to form the branch’s sequence
    const newSequence = sequence.concat([newStep]);

    // Recurse from the updated marking
    const nextSequences = simulateRec(pnModel, branchMarking, newSequence, steps + 1, maxSteps);
    allNextSequences = allNextSequences.concat(nextSequences);
  });


  return allNextSequences;
}

/**
 * Simulates the execution of a Petri Net model.
 * At each simulation step, it records the current marking, the fired transition(s),
 * the enabled transitions (from the previous marking), and a log of the action.
 *
 * @param {Object} pnModel - The Petri net model.
 * @param {number} [maxSteps=1000] - Maximum number of simulation steps.
 * @returns {Array} A list of possible firing sequences. Each firing sequence is an array
 *                  of step objects (one per time step).
 */
export function simulateBehavior(pnModel, maxSteps = 1000) {
  const initialMarking = getInitialMarking(pnModel);
  // The initial step records the initial marking and the enabled transitions at that marking.
  const initialEnabled = getEnabledTransitions(pnModel, initialMarking).map(t => t.id);
  const initialSequence = [{
    marking: initialMarking,
    firedTransitions: [],
    enabledTransitions: initialEnabled,
    log: "Step 0: Initial marking."
  }];

  // Call the recursive simulation.
  const firingSequences = simulateRec(pnModel, initialMarking, initialSequence, 0, maxSteps);
  return firingSequences;
}


// ----- Helper Functions -----

// Returns the final marking from a firing sequence (the marking of the last step)
function getFinalMarking(sequence) {
  return sequence[sequence.length - 1].marking;
}

// Returns the union of all fired transition IDs from a firing sequence.
function getFiredTransitions(sequence) {
  const fired = new Set();
  sequence.forEach(step => {
    step.firedTransitions.forEach(tid => fired.add(tid));
  });
  return fired;
}

// Overall liveness: every transition in the model must appear in at least one firing sequence.
function checkLivenessOverall(pnModel, simulationResults) {
  const overallFired = new Set();
  simulationResults.forEach(sequence => {
    getFiredTransitions(sequence).forEach(tid => overallFired.add(tid));
  });
  const allTransitionIds = Object.keys(pnModel.transitions);
  const notFired = allTransitionIds.filter(tid => !overallFired.has(tid));
  const result = notFired.length === 0;
  const report = result
    ? "All transitions fired in at least one firing sequence."
    : `Transitions never fired: ${notFired.join(", ")}.`;
  return { result, report };
}

// ----- Termination Checks for a Single Firing Sequence -----

/**
 * Check option to complete for a sequence.
 * (Sink "Po" must be reached, i.e. final marking has token count > 0.)
 */
function checkOptionToCompleteForSequence(pnModel, sequence) {
  const finalMarking = getFinalMarking(sequence);
  const sink = pnModel.places["Po"];
  const reached = finalMarking[sink.id] > 0;
  const report = reached
    ? `Sink ${sink.id} reached with ${finalMarking[sink.id]} token(s).`
    : `Sink ${sink.id} not reached (has ${finalMarking[sink.id]} tokens).`;
  return { result: reached, report };
}

/**
 * Check proper termination (classical) for a sequence.
 * This requires that the sink "Po" has exactly 1 token and every other place is empty.
 * If not, it reports which places (and token counts) violate the condition.
 */
function checkProperTerminationForSequence(pnModel, sequence) {
  const finalMarking = getFinalMarking(sequence);
  const sink = pnModel.places["Po"];
  const properViolations = [];
  if (finalMarking[sink.id] !== 1) {
    properViolations.push(`Sink ${sink.id} has ${finalMarking[sink.id]} tokens instead of 1.`);
  }
  Object.values(pnModel.places).forEach(place => {
    if (place.id !== sink.id && finalMarking[place.id] !== 0) {
      properViolations.push(`Place ${place.id} has ${finalMarking[place.id]} token(s) (should be 0).`);
    }
  });
  const properTermination = properViolations.length === 0;
  const reportProper = properTermination
    ? `Proper termination satisfied: sink ${sink.id} exactly 1 token and all others 0.`
    : properViolations.join(" ");
    
  // Weakened proper termination: only require sink has exactly 1 token.
  const weakenedTermination = (finalMarking[sink.id] === 1);
  const reportWeakened = weakenedTermination
    ? `Weakened termination satisfied: sink ${sink.id} has exactly 1 token (other places not checked).`
    : `Weakened termination failed: sink ${sink.id} has ${finalMarking[sink.id]} tokens.`;
  
  return {
    properTermination,
    reportProper,
    weakenedProperTermination: weakenedTermination,
    reportWeakened
  };
}

// ----- Main Behavioral Analysis Function -----

/**
 * Performs overall behavioral analysis for the PN.
 *
 * For each firing sequence, it computes:
 *   - optionToComplete: sink "Po" is reached (final marking Po > 0).
 *   - properTermination: classical proper termination (final marking Po == 1 and all other places == 0).
 *   - weakenedProperTermination: lazy termination (final marking Po == 1, other places may have tokens).
 *
 * Each sequence is assigned a terminationType:
 *   - "None"       if optionToComplete fails.
 *   - "Classical"  if optionToComplete && properTermination.
 *   - "Lazy"       if optionToComplete && !properTermination && weakenedProperTermination.
 *   - "OptionOnly" if optionToComplete && neither termination holds.
 *
 * overallLiveness is computed by taking the union of fired transitions over all sequences.
 *
 * overallTermination is aggregated across all sequences:
 *   1) If every sequence is "Classical"      → overallTermination = "Classical"
 *   2) Else if at least one is "Classical"  → overallTermination = "Relaxed"
 *   3) Else if at least one is "Lazy"       → overallTermination = "Lazy"
 *   4) Else if at least one is "OptionOnly" → overallTermination = "Easy"
 *   5) Else if all are "None"               → overallTermination = "None"
 *   6) Otherwise                           → overallTermination = "Inconclusive"
 *
 * overallSoundness is then determined by combining overallTermination with overallLiveness:
 *   - "Classical":  overallTermination=="Classical" && overallLiveness
 *   - "Weak":       overallTermination=="Classical" && !overallLiveness
 *   - "Relaxed":    overallTermination=="Relaxed" && overallLiveness
 *   - "Lazy":       overallTermination=="Lazy"  (liveness not required)
 *   - "Easy":       overallTermination=="Easy"  (liveness not required)
 *   - "Inconclusive": all other cases
 *
 * Returns an object containing:
 *   - simulationResults:   array of firing sequences
 *   - perSequenceResults:  detailed termination info per sequence
 *   - overallLiveness:     { result, report }
 *   - overallTermination:  aggregated termination type
 *   - overallSoundness:    final overall soundness type
 */
export function behavioralAnalysis(pnModel, maxSteps = 1000) {
  // Simulate behavior to get an array of firing sequences.
  const simulationResults = simulateBehavior(pnModel, maxSteps); 
  
  // Evaluate termination criteria per firing sequence.
  let perSequenceResults = simulationResults.map((sequence, idx) => {
    const option = checkOptionToCompleteForSequence(pnModel, sequence);
    const terminationChecks = checkProperTerminationForSequence(pnModel, sequence);
    
    // Determine termination type for this sequence:
    // If option fails, type = "None". Doesn't reach the sink. 
    // Else if properTermination is true, type = "Proper". 
      // Reaches the sink with one token and having no tokens in other places.
    // Else if weakenedProperTermination is true (and properTermination is false), type = "Weak".
      // Reaches the sink with one token.
    // Else if only option holds, type = "Option". Means it reaches the sink with at least one token. 
    let terminationType;
    if (!option.result) {
      terminationType = "None";
    } else if (terminationChecks.properTermination) {
      terminationType = "Proper";
    } else if (terminationChecks.weakenedProperTermination) {
      terminationType = "Weak";
    } else {
      terminationType = "Option";
    }
    
    return {
      sequenceIndex: idx,
      option,
      terminationChecks, // contains properTermination and weakenedProperTermination with reports.
      terminationType
    };
  });
  
  // Compute overall liveness across all sequences.
  const overallLiveness = checkLivenessOverall(pnModel, simulationResults);
  
  // Aggregate termination types from all sequences.
  const total = perSequenceResults.length;
  const properCount = perSequenceResults.filter(r => r.terminationType === "Proper").length;
  const weakCount      = perSequenceResults.filter(r => r.terminationType === "Weak").length;
  const optionCount    = perSequenceResults.filter(r => r.terminationType === "Option").length;
  const noneCount      = perSequenceResults.filter(r => r.terminationType === "None").length;

  let overallTermination;

  // 1) If every sequence is properTermination → Classical
  if (properCount === total) {
    overallTermination = "Classical";
  }
  // 2) Else if at least one is properTermination → Relaxed
  else if (properCount > 0) {
    overallTermination = "Relaxed";
  }
  // 3) Else if all is weakTermination → Lazy
  else if (weakCount === total) {
    overallTermination = "Lazy";
  }
  // 4) Else if at least one is OptionTermination → Easy
  else if (optionCount > 0) {
    overallTermination = "Easy";
  }
  // 5) Else if none satisfy option (all “None”) → None
  else if (noneCount === total) {
    overallTermination = "None";
  }
  // 6) Otherwise → Inconclusive
  else {
    overallTermination = "No Conclusion";
  }
  
  // Determine overall soundness based on overall termination and overall liveness.
  let overallSoundness;
  switch (overallTermination) {
    case "Classical":
      // Classical requires liveness
      overallSoundness = overallLiveness.result ? "Classical" : "Weak";
      break;
    case "Relaxed":
      // Relaxed requires liveness
      overallSoundness = overallLiveness.result ? "Relaxed" : "Easy";
      break;
    case "Lazy":
      // Lazy does not require liveness
      overallSoundness = "Lazy";
      break;
    case "Easy":
      // Easy only requires option to complete
      overallSoundness = "Easy";
      break;
    default:
      overallSoundness = "No Conclusion";
  }

  // Store Transition ID List and Activity List per Firing Sequence into perSequenceResults
  for(const firingSequence of simulationResults){
    let fireseq = [];
    let activities = [];
    let activityCount = 0;
    for (let i = 0; i < firingSequence.length; i++) {
      if (i === 0 || i === firingSequence.length - 1) continue; // Skip first and last elements
      fireseq.push(`${firingSequence[i].firedTransitions}`);
      let activity = [];
      firingSequence[i].firedTransitions.forEach(transitionId => {
        if(pnModel.transitions[transitionId].activities) 
          activity.push(pnModel.transitions[transitionId].activities);
      });
      if(activity.length!==0) {
        activityCount++;
        activities.push(`S(${activityCount})={${activity.join(',')}}`);
      }
    }
    perSequenceResults[simulationResults.indexOf(firingSequence)].firingSequence = fireseq;
    perSequenceResults[simulationResults.indexOf(firingSequence)].activityExtraction = activities;
  }
  
  return {
    simulationResults,      // Array of firing sequences.
    perSequenceResults,     // Detailed termination info per sequence.
    overallLiveness,        // { result, report }
    overallTermination,     // Aggregated termination type ("Classical", "Relaxed", "Lazy", "Easy", "None", etc.)
    overallSoundness        // Final overall soundness type.
  };
}



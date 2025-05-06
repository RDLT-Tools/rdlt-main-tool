import { unweightArcs } from "../utils/Unweight.js";
// import { getIncomingEdges } from "./checkComplementarity.js";
// import { findDisjointPaths } from "../algos/edmonds.js";
import { findSiblings } from "./Siblings.js";
import { checkComplementarity } from "./balanced.js";

function hasLoopSafeNCAs(R_obj) {
  // Create Set of non-critical arcs from all cycles
  const ncas = new Set();
  for (const cycle of R_obj.cycle_list) {
    for (const arc of cycle.arcs) {
      if (!cycle.criticalArcs.includes(arc)) {
        ncas.add(arc);
      }
    }
  }

  // Check loop safety condition
  const notLoopSafeNCAs = Array.from(ncas).filter(
    (nca) => nca.l_attr <= nca.eRU
  );

  if (notLoopSafeNCAs.length > 0) {
    console.error(`Not Loop-safe NCAs for ${R_obj.name}:`, notLoopSafeNCAs);
    return {
      hasLoopSafeNCAs: false,
      entries: notLoopSafeNCAs,
    };
  }
  return {
    hasLoopSafeNCAs: true,
    entries: [],
  };
}

function hasSafeCAs(R_obj) {
  let notSafeCAs = [];

  R_obj.cycle_list.forEach((cycle) => {
    cycle.criticalArcs.forEach((ca) => {
      if (
        !cycle.escapeArcs.some(
          (ea) => ea._l_attr >= ea._eRU && ea.start == ca.start
        )
      ) {
        notSafeCAs.push(ca);
      }
    });
  });

  if (notSafeCAs.length > 0) {
    console.error(`Not Safe CAs for ${R_obj.name}:`, notSafeCAs);
    return {
      hasSafeCAs: false,
      entries: notSafeCAs,
    };
  }
  return {
    hasSafeCAs: true,
    entries: notSafeCAs,
  };
}

function hasEqualLValuesAtAndJoins(RDLT) {
  // Process vertices for split/join types
  for (const x of RDLT.vertices) {
    // Handle outgoing arcs (splits)
    if (x.outgoing.length > 1) {
      const cAttrOut = new Set();
      for (const arc of RDLT.c_attr.keys()) {
        if (arc.start === x) {
          cAttrOut.add(arc.c_attr);
        }
      }
      x.split_type = cAttrOut.size > 1 ? "OR" : "AND";
      x.is_split = true;
    }

    // Handle incoming arcs (joins)
    if (x.incoming.length > 1) {
      const cAttrIn = new Set();
      for (const arc of RDLT.arcs) {
        if (arc.end === x) {
          cAttrIn.add(arc.c_attr);
        }
      }

      if (cAttrIn.size > 1) {
        x.join_type = cAttrIn.has(0) ? "MIX" : "AND";
      } else {
        x.join_type = "OR";
      }
      x.is_join = true;
    }
  }

  // Check AND-joins for equal L-values
  const andJoins = [...RDLT.vertices].filter((v) => v.join_type === "AND");
  const notEqualLValues = new Map();
  const notEqualJoiningArcs = [];

  for (const join of andJoins) {
    const lAttrs = new Set();
    const joiningArcs = [];
    // for (const srcVertex of join.incoming) {
    //   for (const arc of RDLT.l_attr.keys()) {
    //     if (arc.start === srcVertex && arc.end === join) {
    //       lAttrs.add(arc.l_attr);
    //       joiningArcs.push(arc)
    //     }
    //   }
    // }

    for (const arc of RDLT.l_attr.keys()) {
      if (join.incoming.includes(arc.start) && arc.end === join) {
        lAttrs.add(arc.l_attr);
        joiningArcs.push(arc);
      }
    }

    if (lAttrs.size > 1) {
      notEqualLValues.set(join.name, Array.from(lAttrs));
      notEqualJoiningArcs.push(...joiningArcs); // add all arcs to the master list
    }
  }

  // Report errors if found
  if (notEqualLValues.size > 0) {
    console.error(
      `Not Equal L-values at AND-joins for ${RDLT.name}:`,
      Object.fromEntries(notEqualLValues)
    );
    return {
      hasEqualLValues: false,
      entries: notEqualJoiningArcs,
    };
  }

  return {
    hasEqualLValues: true,
    entries: notEqualJoiningArcs,
  };
}

function hasLoopSafeComponents(RDLT) {
  for (const x of RDLT.vertices) {
    // Handle outgoing arcs (splits)
    if (x.outgoing.length > 1) {
      const cAttrOut = new Set();
      for (const arc of RDLT.c_attr.keys()) {
        if (arc.start === x) {
          cAttrOut.add(arc.c_attr);
        }
      }
      x.split_type = cAttrOut.size > 1 ? "OR" : "AND";
      x.is_split = true;
    }

    // Handle incoming arcs (joins)
    if (x.incoming.length > 1) {
      const cAttrIn = new Set();
      for (const arc of RDLT.arcs) {
        if (arc.end === x) {
          cAttrIn.add(arc.c_attr);
        }
      }

      if (cAttrIn.size > 1) {
        x.join_type = cAttrIn.has(0) ? "MIX" : "AND";
      } else {
        x.join_type = "OR";
      }
      x.is_join = true;
    }
  }

  let andJoins = [...RDLT.vertices].filter((v) => v.join_type === "AND");
  let orJoins = [...RDLT.vertices].filter((v) => v.join_type === "OR");

  let graph = unweightArcs(RDLT.l_attr);

  let splitPoints = new Set([...RDLT.vertices].filter((v) => v.is_split));
  let joinPoints = new Set([...RDLT.vertices].filter((v) => v.is_join));

  let start = [...RDLT.vertices].find((v) => v.incoming.length === 0);
  if (start) splitPoints.add(start);

  let { siblingPaths, allDisjointPaths } = findSiblings(
    graph,
    splitPoints,
    joinPoints
  );

  const cas = new Set();
  for (const cycle of RDLT.cycle_list) {
    for (const arc of cycle.arcs) {
      if (cycle.criticalArcs.includes(arc)) {
        cas.add(arc);
      }
    }
  }

  for (let andJoin of andJoins) {
    let processes = allDisjointPaths.filter(
      (process) => process[process.length - 1] === andJoin
    );
    for (let process of processes) {
      for (let i = 0; i < process.length - 1; i++) {
        let startVertex = process[i];
        let endVertex = process[i + 1];
        let matchingArc = RDLT.arcs.find(
          (arc) => arc.start === startVertex && arc.end === endVertex
        );

        if (matchingArc) {
          // if (!cas.has(matchingArc) && matchingArc.l_attr <= matchingArc.eRU) {
          //   console.error(
          //     `Not Loop-safe component found for ${startVertex.name} -> ${endVertex.name}`
          //   );
          //   return false;
          // }
          if (matchingArc.l_attr <= matchingArc.eRU) {
            console.error(
              `Not Loop-safe component found for ${startVertex.name} -> ${endVertex.name}`
            );
            return {
              hasLoopSafeComponentsValues: false,
              entries: [matchingArc],
            };
          }
        } else {
          console.log(
            `No matching arc found for ${startVertex.name} -> ${endVertex.name}`
          );
        }
      }
    }
  }

  for (let orJoin of orJoins) {
    let processes = allDisjointPaths.filter(
      (process) => process[process.length - 1] === orJoin
    );
    for (let process of processes) {
      for (let i = 0; i < process.length - 1; i++) {
        let startVertex = process[i];
        let endVertex = process[i + 1];
        let matchingArc = RDLT.arcs.find(
          (arc) => arc.start === startVertex && arc.end === endVertex
        );

        if (matchingArc) {
          if (cas.has(matchingArc)) {
            for (let cycle of RDLT.cycle_list) {
              if (cycle.criticalArcs.includes(matchingArc)) {
                if (!cycle.escapeArcs.some((ea) => ea.l_attr >= ea.eRU)) {
                  console.error(
                    `Not Loop-safe component found for ${startVertex.name} -> ${endVertex.name}`
                  );
                  return {
                    hasLoopSafeComponentsValues: false,
                    entries: [matchingArc],
                  };
                }
              }
            }
          } else {
            if (matchingArc.l_attr < matchingArc.eRU) {
              console.error(
                `Not Loop-safe component found for ${startVertex.name} -> ${endVertex.name}`
              );
              return {
                hasLoopSafeComponentsValues: false,
                entries: [matchingArc],
              };
            }
          }
        } else {
          console.log(
            `No matching arc found for ${startVertex.name} -> ${endVertex.name}`
          );
        }
      }
    }
  }

  return {
    hasLoopSafeComponentsValues: true,
    entries: [],
  };
}

// function isBalanced(R) {
//   for (const x of R.vertices) {
//     // Handle outgoing arcs (splits)
//     if (x.outgoing.length > 1) {
//       const cAttrOut = new Set();
//       for (const arc of R.c_attr.keys()) {
//         if (arc.start === x) {
//           cAttrOut.add(arc.c_attr);
//         }
//       }
//       x.split_type = cAttrOut.size > 1 ? "OR" : "AND";
//       x.is_split = true;
//     }

//     // Handle incoming arcs (joins)
//     if (x.incoming.length > 1) {
//       const cAttrIn = new Set();
//       for (const arc of R.arcs) {
//         if (arc.end === x) {
//           cAttrIn.add(arc.c_attr);
//         }
//       }

//       if (cAttrIn.size > 1) {
//         x.join_type = cAttrIn.has(0) ? "MIX" : "AND";
//       } else {
//         x.join_type = "OR";
//       }
//       x.is_join = true;
//     }
//   }

//   let splitPoints = [...R.vertices].filter((v) => v.is_split);
//   let joinPoints = [...R.vertices].filter((v) => v.is_join);

//   let unweightedGraph = unweightArcs(R.l_attr);
//   let disjointPathsDict = {};
//   let complementarityDict = {};
//   let siblingPaths = {};

//   for (let x of splitPoints) {
//     for (let y of joinPoints) {
//       let disjointPaths = findDisjointPaths(unweightedGraph, x, y);

//       if (disjointPaths.length > 0) {
//         for (let path of disjointPaths) {
//           let key = `${path[0].name},${path[path.length - 1].name}`;
//           if (!disjointPathsDict[key]) disjointPathsDict[key] = new Set();
//           disjointPathsDict[key].add(path);
//         }
//       } else {
//         console.info(`No paths found between ${x.name} and ${y.name}`);
//       }
//     }
//   }

//   siblingPaths = Object.fromEntries(
//     Object.entries(disjointPathsDict).filter(([_, v]) => v.size > 1)
//   );

//   console.log("Sibling Paths:", siblingPaths);

//   for (let [key, paths] of Object.entries(siblingPaths)) {
//     let [x, y] = key.split(",");
//     let SibCount = paths.size;
//     // Count paths starting with `x`
//     let x_out = [...Object.values(siblingPaths)]
//       .flatMap((set) => [...set]) // Convert sets to arrays
//       .filter((p) => p[0].name === x).length;

//     let y_in = [...Object.values(siblingPaths)]
//       .flatMap((set) => [...set])
//       .filter((p) => p[p.length - 1].name === y).length;

//     if (x_out === SibCount && y_in === SibCount) {
//       console.info(
//         `Pair (${x}, ${y}) is complementary with x_out:${x_out}, Sib_count: ${SibCount}, y_in: ${y_in}`
//       );
//       let xObj = [...R.vertices].find((v) => v.name === x);
//       let yObj = [...R.vertices].find((v) => v.name === y);

//       if (xObj.split_type === "AND" && yObj.join_type === "AND") {
//         console.info(`Pair (${x}, ${y}) is complementary with AND split/join`);
//         complementarityDict[key] = true;
//       } else if (xObj.split_type === "OR" && yObj.join_type === "OR") {
//         console.info(`Pair (${x}, ${y}) is complementary with OR split/join`);
//         complementarityDict[key] = true;
//       } else {
//         console.error(
//           `Pair (${x}, ${y}) is not complementary (split_type: ${xObj.split_type}, join_type: ${yObj.join_type})`
//         );
//         complementarityDict[key] = false;
//       }
//     } else {
//       console.error("Pair (${x}, ${y}) is not complementary due to imbalance");
//       console.error(
//         `(${x_out} x_out !== Sib_count (${SibCount}) OR (${y_in}) y_in !== Sib_count (${SibCount})`
//       );
//       complementarityDict[key] = false;
//     }
//   }

//   console.info(`Complementarity List for ${R.name}:`, complementarityDict);

//   if (Object.values(complementarityDict).some((value) => !value)) {
//     console.info(
//       "At least one false value in complementarity_dict, Not Balanced"
//     );
//     return false;
//   } else {
//     console.info("All values in complementarity_dict are True, Balanced");
//     return true;
//   }
// }

function isBalanced(R) {
  function areTypeAlike(arcs, abstractArcs) {
    let count = 0;
    const totalArcs = arcs.length;
    for (const arc of arcs) {
      // if (!abstractArcs.includes(arc)) {
      if (!abstractArcs.has(arc)) {
        count++;
      }
    }
    return count === 0 || count === totalArcs;
  }

  let splitPoints = [...R.vertices].filter((v) => v.is_split);
  let joinPoints = [...R.vertices].filter((v) => v.is_join);
  const graph = unweightArcs(R.l_attr);

  // Filter split points
  for (const vertex of [...splitPoints]) {
    const outgoing = vertex.outgoing.flatMap((y) => R.getArcs(vertex, y));
    if (!areTypeAlike(outgoing, R.abstract_arcs)) {
      const index = splitPoints.indexOf(vertex);
      if (index !== -1) {
        splitPoints.splice(index, 1);
      }
    }
  }

  // Filter join points
  for (const vertex of [...joinPoints]) {
    const incoming = vertex.incoming.flatMap((u) => R.getArcs(u, vertex));
    if (!areTypeAlike(incoming, R.abstract_arcs)) {
      const index = joinPoints.indexOf(vertex);
      if (index !== -1) {
        joinPoints.splice(index, 1);
      }
    }
  }

  const complementarityDict = checkComplementarity(
    graph,
    splitPoints,
    joinPoints
  );

  let violations = [];

  for (const [key, value] of complementarityDict) {
    let [split, join] = key.split("-");
    split = splitPoints.find((sp) => sp.name === split);
    join = joinPoints.find((jp) => jp.name === join);
    console.log(
      `Complementarity check for (${split.name}, ${join.name}): ${value}`
    );
    if (!value) {
      console.error(`Pair (${split.name}, ${join.name}) is not complementary`);
      violations.push(...[split, join]);
    }
  }

  if (violations.length > 0) {
    // console.error("Complementarity violations found:", violations);
    return {
      hasLoopSafeComponentsValues: false,
      entries: violations,
    };
  }

  return {
    isBalanced: true,
    entries: violations,
  };
}

export {
  hasLoopSafeNCAs,
  hasSafeCAs,
  hasEqualLValuesAtAndJoins,
  hasLoopSafeComponents,
  isBalanced,
};

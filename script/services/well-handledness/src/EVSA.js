import { R } from "../classes/RClass.js";
import { Arc } from "../classes/Arc.js";
import { findDisjointPaths } from "../algos/edmonds.js";
import { unweightArcs } from "../utils/Unweight.js";

function generateVertexSimplifications(RDLT) {
  function computeReusability(RDLT, arc, cycles_containing_arc) {
    // Create Set of first PCA from each containing cycle
    const unique_pcas = new Set(
      Array.from(cycles_containing_arc, (cycle) => cycle.pcas[0])
    );

    // Calculate reusability sum using Map.get() for lookups
    let reusability = 0;
    for (const pc of unique_pcas) {
      reusability += RDLT.l_attr.get(pc) || 0; // Using ||0 as fallback
    }

    // Update both arc property and RDLT Map
    arc.RU = reusability;
    RDLT.RU.set(arc, reusability);

    return reusability;
  }

  function computeR2Reusability(R2) {
    let arcsInCycles = new Set(R2.cycle_list.flatMap((cycle) => cycle.arcs));
    R2.arcs.forEach((arc) => {
      if (!arcsInCycles.has(arc)) {
        R2.RU.set(arc, 0);
      } else {
        let cyclesArcIsIn = RDLT.cycle_list.filter((cycle) =>
          cycle.arcs.includes(arc)
        );
        let reusability = cyclesArcIsIn.reduce(
          (sum, cycle) => sum + cycle.critical_arcs[0].l_attr,
          0
        );
        R2.RU.set(arc, reusability);
      }
      R2.eRU.set(arc, R2.RU.get(arc));
      R2.l_attr.set(arc, Math.max(R2.eRU.get(arc) + 1, R2.l_attr.get(arc)));
    });
  }

  // function computeERU(RDLT, R1, R2) {
  //   RDLT.findCycles();
  //   let arcsInCycles = new Set(RDLT.cycle_list.flatMap((cycle) => cycle.arcs));

  //   RDLT.cycle_list.forEach((cycle) => cycle.computePCAsAndPEAs(R1, R2));

  //   RDLT.arcs.forEach((arc) => {
  //     if (!arcsInCycles.has(arc)) {
  //       let eRU = RDLT.in_bridges.reduce(
  //         (sum, inBridge) => sum + inBridge.l_attr,
  //         0
  //       );
  //       arc.eRU = R2.arcs.includes(arc) ? eRU : 0;
  //       arc.RU = 0;
  //       RDLT.RU.set(arc, 0);
  //     } else {
  //       let cyclesArcIsIn = RDLT.cycle_list.filter((cycle) =>
  //         cycle.arcs.includes(arc)
  //       );
  //       let reusability = cyclesArcIsIn.reduce(
  //         (sum, cycle) => sum + cycle.criticalArcs[0].l_attr,
  //         0
  //       );
  //       arc.RU = reusability;
  //       RDLT.RU.set(arc, reusability);
  //       let eRU = RDLT.in_bridges.reduce(
  //         (sum, inBridge) => sum + inBridge.l_attr * (reusability + 1),
  //         0
  //       );
  //       arc.eRU = R2.arcs.includes(arc)
  //         ? eRU
  //         : computeReusability(RDLT, arc, cyclesArcIsIn);
  //     }
  //   });
  // }

  function computeERU(RDLT, R1, R2) {
    RDLT.findCycles();

    // Create set of arcs in cycles
    const arcsInCycles = new Set();
    for (const cycle of RDLT.cycle_list) {
      for (const arc of cycle.arcs) {
        arcsInCycles.add(arc);
      }
    }

    // Compute PCAs and PEAs for each cycle
    for (const cycle of RDLT.cycle_list) {
      cycle.computePCAsAndPEAs(R1, R2);
    }

    // Process each arc
    for (const arc of RDLT.arcs) {
      if (!arcsInCycles.has(arc)) {
        // Handle arcs not in cycles
        const reusability = 0;
        const eRU = RDLT.in_bridges.reduce(
          (sum, inBridge) => sum + inBridge.l_attr,
          0
        );
        arc.eRU = R2.arcs.includes(arc) ? eRU : reusability;
        arc.RU = reusability;
        RDLT.RU.set(arc, reusability);
      } else {
        // Handle arcs in cycles
        const cyclesArcIsIn = RDLT.cycle_list.filter((cycle) =>
          cycle.arcs.includes(arc)
        );

        // Calculate reusability
        let reusability = 0;
        for (const cycle of cyclesArcIsIn) {
          const isInR2 = R2.cycle_list.some((c) => {
            const cycleVertices = [...cycle.vertices].map((v) => v.name).sort();
            const cVertices = [...c.vertices].map((v) => v.name).sort();
            return JSON.stringify(cycleVertices) === JSON.stringify(cVertices);
          });

          if (isInR2 && cycle.criticalArcs.length > 0) {
            reusability += cycle.critical_arcs[0].l_attr;
          }
        }

        arc.RU = reusability;
        RDLT.RU.set(arc, reusability);

        // Calculate eRU
        const eRU = RDLT.in_bridges
          .filter((inBridge) => inBridge.start === arc.end)
          .reduce(
            (sum, inBridge) => sum + inBridge.l_attr * (reusability + 1),
            0
          );

        arc.eRU = R2.arcs.includes(arc)
          ? eRU
          : computeReusability(RDLT, arc, cyclesArcIsIn);

        // Original commented line:
        // if (R2.arcs.includes(arc)) arc.l_attr = arc.eRU + 1;
      }
    }
  }

  function extractR12Vertices(inBridges, outBridges) {
    return new Set([
      ...inBridges.map((b) => b.end),
      ...outBridges.map((b) => b.start),
    ]);
  }

  function generateAbstractArcs(R1, R2, RDLT) {
    let r12Vertices = extractR12Vertices(RDLT.in_bridges, RDLT.out_bridges);
    let unweightedGraph = unweightArcs(R2.l_attr);

    r12Vertices.forEach((x) => {
      r12Vertices.forEach((y) => {
        let paths = [];
        if (x === y) {
          paths = R2.cycle_list
            .filter((cycle) => cycle.vertices.includes(x))
            .map((cycle) => cycle.vertices);
        } else {
          let disjointPaths = findDisjointPaths(unweightedGraph, x, y);
          paths = Array.isArray(disjointPaths)
            ? disjointPaths
            : [disjointPaths];
        }
        paths.forEach((path) => path.length && R1.addAbstractArc(path, RDLT));
      });
    });
  }

  function assignERUToR1R2(RDLT, R1, R2) {
    R1.eRU = new Map(R1.arcs.map((arc) => [arc, arc.eRU]));
    R2.eRU = new Map(R2.arcs.map((arc) => [arc, arc.eRU]));
  }

  function assignERUToAbstractArcs(RDLT, R1) {
    R1.abstract_arcs.forEach((paths, absArc) => {
      let uniqueValues = new Set();
      paths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
          let arc = RDLT.getArc(path[i], path[i + 1]);
          if (arc) uniqueValues.add(arc.eRU);
        }
      });
      let minERU = Math.min(...uniqueValues, 0);
      absArc.setERU(minERU);
      R1.setERU(absArc, minERU);
    });
  }

  let R1 = new R("R1");
  let R2 = new R("R2");
  R1.addElements([...RDLT.in_bridges, ...RDLT.out_bridges]);

  if (RDLT.centers.size > 0) {
    let connectedVertices = new Set();
    RDLT.centers.forEach((v) => {
      RDLT.arcs.forEach((arc) => {
        if (arc.start === v || arc.end === v) connectedVertices.add(arc.end);
      });
    });
    connectedVertices.forEach((y) => {
      RDLT.arcs.forEach((arc) => {
        if (
          arc.start === y &&
          ![...RDLT.in_bridges, ...RDLT.out_bridges].includes(arc)
        ) {
          R2.addArc(arc);
          R2.addVertex(arc.start);
          R2.addVertex(arc.end);
        }
      });
    });
    R1.addElements(
      RDLT.arcs.filter(
        (arc) =>
          !R2.arcs.includes(arc) &&
          ![...RDLT.in_bridges, ...RDLT.out_bridges].includes(arc)
      )
    );
  } else {
    R1.addElements(RDLT.arcs);
  }

  [...R1.arcs, ...R2.arcs].forEach((arc) => {
    let targetR = R1.arcs.includes(arc) ? R1 : R2;
    targetR.addVertex(arc.start);
    targetR.addVertex(arc.end);
  });

  R1.setAttributes(RDLT.c_attr, RDLT.l_attr);
  R2.setAttributes(RDLT.c_attr, RDLT.l_attr);
  R2.findCycles();

  generateAbstractArcs(R1, R2, RDLT);
  R1.findCycles();
  computeERU(RDLT, R1, R2);
  assignERUToR1R2(RDLT, R1, R2);
  assignERUToAbstractArcs(RDLT, R1);
  computeR2Reusability(R2);

  return [R1, R2];
}

export { generateVertexSimplifications };

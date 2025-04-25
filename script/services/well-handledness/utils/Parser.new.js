import { R } from "../classes/RClass.js";
import { Vertex } from "../classes/Vertex.js";
import { Arc } from "../classes/Arc.js";

export function findRBSBridges(RDLT) {
  const rbsVertices = new Set([...RDLT.centers]);
  const rdltCenters = new Set([...RDLT.centers]);

  // Step 1: Expand the RBS by following outgoing arcs from RBS vertices with c = 0 (epsilon)
  let changed = true;
  while (changed) {
    changed = false;
    for (let arc of RDLT.arcs) {
      if (
        rdltCenters.has(arc.start) &&
        arc.c_attr == 0 &&
        !rbsVertices.has(arc.end)
      ) {
        rbsVertices.add(arc.end);
        changed = true;
      }
    }
  }

  // Step 2: Find in-bridges and out-bridges
  const inBridges = [];
  const outBridges = [];

  for (let arc of RDLT.arcs) {
    const startInRBS = rbsVertices.has(arc.start);
    const endInRBS = rbsVertices.has(arc.end);

    if (!startInRBS && endInRBS) {
      inBridges.push(arc);
    } else if (startInRBS && !endInRBS) {
      outBridges.push(arc);
    }
  }

  return {
    rbsVertices: [...rbsVertices],
    inBridges,
    outBridges,
  };
}

export function parseRDLT(model) {
  // const cAttributes = {};
  // const lAttributes = {};
  const cAttributes = new Map();
  const lAttributes = new Map();

  const RDLT = new R("RDLT");

  let arcs = model.arcs;
  let vertices = model.components;

  vertices.forEach((vertex) => {
    let v = new Vertex(vertex.identifier, vertex.uid);
    RDLT.vertices.add(v);
    if (vertex.isRBSCenter == true) {
      RDLT.centers.add(v);
    }
  });
  arcs.forEach((arc) => {
    let start = [...RDLT.vertices].find((v) => v.uID == arc.fromVertexUID);
    let end = [...RDLT.vertices].find((v) => v.uID == arc.toVertexUID);
    let c_attr = arc.C;
    let l_attr = arc.L;
    start.outgoing.push(end);
    end.incoming.push(start);
    const newArc = new Arc(
      arc.uid,
      `(${start.name},${end.name})`,
      start,
      end,
      "0",
      parseInt(1)
    );
    newArc.c_attr = arc.C !== "" ? arc.C : 0;
    newArc.l_attr = arc.L;
    RDLT.arcs.push(newArc);
    // cAttributes[newArc] = newArc.c_attr;
    // lAttributes[newArc] = parseInt(newArc.l_attr);
    cAttributes.set(newArc, newArc.c_attr);
    lAttributes.set(newArc, newArc.l_attr);
  });
  RDLT.setAttributes(cAttributes, lAttributes);
  if (RDLT.centers) {
    const { rbsVertices, inBridges, outBridges } = findRBSBridges(RDLT);

    RDLT.in_bridges.push(...inBridges); // Spread syntax
    RDLT.out_bridges.push(...outBridges);
  }

  console.log("Vertices: ", RDLT.vertices);
  console.log("Arcs: ", RDLT.arcs);
  return RDLT;
}

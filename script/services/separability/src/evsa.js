// js/evsa.js

/* ======================= Utilities ======================= */

function cloneList(xs) {
  return xs.map(x => ({ ...x }));
}

function buildAdjWithArcs(arcs) {
  const adj = new Map();
  for (const a of arcs) {
    if (!adj.has(a.from)) adj.set(a.from, []);
    adj.get(a.from).push(a);
  }
  return adj;
}

/* ======================= SCC (Tarjan) ======================= */

function computeSCC(vertices, arcs) {
  const adj = new Map();
  arcs.forEach(a => {
    if (!adj.has(a.from)) adj.set(a.from, []);
    adj.get(a.from).push(a.to);
  });

  let index = 0;
  const stack = [];
  const indices = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const sccs = [];

  function strongconnect(v) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) || []) {
      if (!indices.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  vertices.forEach(v => {
    if (!indices.has(v)) strongconnect(v);
  });

  return sccs;
}

function isCyclicSCC(scc, arcs) {
  if (scc.length > 1) return true;
  const v = scc[0];
  return arcs.some(a => a.from === v && a.to === v);
}

/* ======================= Classical RU ======================= */

function computeClassicalRU(vertices, arcs) {
  const sccs = computeSCC(vertices.map(v => v.vuid), arcs);

  const sccIndex = new Map();
  sccs.forEach((scc, i) => {
    scc.forEach(v => sccIndex.set(v, i));
  });

  const arcRU = new Map();

  for (const arc of arcs) {

    const sccId = sccIndex.get(arc.from);
    const scc = sccs[sccId];

    if (!isCyclicSCC(scc, arcs)) {
      arcRU.set(arc.auid, 0);
      continue;
    }

    // check if arc participates in a cycle
    const reachable = new Set([arc.to]);
    const stack = [arc.to];
    const adj = buildAdjWithArcs(arcs);

    let inCycle = false;

    while (stack.length) {
      const v = stack.pop();

      for (const a of adj.get(v) || []) {

        if (a.to === arc.from) {
          inCycle = true;
          break;
        }

        if (!reachable.has(a.to)) {
          reachable.add(a.to);
          stack.push(a.to);
        }
      }

      if (inCycle) break;
    }

    if (!inCycle) {
      arcRU.set(arc.auid, 0);
      continue;
    }

    // arc belongs to a cycle → assign CA value
    let minL = Infinity;

    for (const a of arcs) {
      if (scc.includes(a.from) && scc.includes(a.to)) {
        minL = Math.min(minL, Number(a.l || 0));
      }
    }

    arcRU.set(arc.auid, minL);
  }

  return arcRU;
}

/* ======================= PCA Detection ======================= */

function computeGlobalPCACap(vertices, arcs, rbsVertices) {
  const sccs = computeSCC(vertices.map(v => v.vuid), arcs);
  let globalCap = Infinity;

  for (const scc of sccs) {
    let hasInside = false;
    let hasOutside = false;
    let minOutsideL = Infinity;

    for (const arc of arcs) {
      if (scc.includes(arc.from) && scc.includes(arc.to)) {
        const inside = rbsVertices.has(arc.from) && rbsVertices.has(arc.to);
        if (inside) hasInside = true;
        else {
          hasOutside = true;
          minOutsideL = Math.min(minOutsideL, Number(arc.l || 0));
        }
      }
    }

    if (hasInside && hasOutside) {
      globalCap = Math.min(globalCap, minOutsideL);
    }
  }

  return globalCap === Infinity ? null : globalCap;
}

/* ======================= RBS ======================= */

function buildRBSForCenter(center, vertices, arcs) {
  const inBridges  = arcs.filter(a => a.inBridge);
  const outBridges = arcs.filter(a => a.outBridge);

  const Entry = new Set(inBridges.map(a => a.to));
  const Exit  = new Set(outBridges.map(a => a.from));

  const internalArcs = arcs.filter(a => !a.inBridge && !a.outBridge);
  const adj = buildAdjWithArcs(internalArcs);

  const forward = new Set();
  const stack = [...Entry];

  while (stack.length) {
    const u = stack.pop();
    if (forward.has(u)) continue;
    forward.add(u);
    for (const a of adj.get(u) || []) stack.push(a.to);
  }

  const rbsVertices = new Set();
  vertices.forEach(v => {
    if (forward.has(v.vuid)) rbsVertices.add(v.vuid);
  });

  const rbsArcs = internalArcs.filter(
    a => rbsVertices.has(a.from) && rbsVertices.has(a.to)
  );

  return {
    vertices: rbsVertices,
    arcs: rbsArcs,
    inBridges,
    outBridges
  };
}

/* ======================= Path Enumeration ======================= */

function enumeratePaths(start, target, arcs) {
  const adj = buildAdjWithArcs(arcs);
  const paths = [];

  function dfs(node, path, visited) {
    if (node === target) {
      paths.push([...path]);
      return;
    }

    for (const a of adj.get(node) || []) {
      if (!visited.has(a.to)) {
        visited.add(a.to);
        path.push(a);
        dfs(a.to, path, visited);
        path.pop();
        visited.delete(a.to);
      }
    }
  }

  dfs(start, [], new Set([start]));
  return paths;
}

/* ======================= Expanded eRU ======================= */

function bridgeInCycle(bridge, arcs) {

  const adj = buildAdjWithArcs(arcs);

  const stack = [bridge.to];
  const visited = new Set([bridge.to]);

  while (stack.length) {
    const v = stack.pop();

    for (const a of adj.get(v) || []) {

      if (a.to === bridge.from) return true;

      if (!visited.has(a.to)) {
        visited.add(a.to);
        stack.push(a.to);
      }
    }
  }

  return false;
}

function computeExpandedERU(vertices, arcs, rbsVertices, abstractArcs) {

  // 1 Classical RU on full graph
  const classicalRU = computeClassicalRU(vertices, arcs);

  // 2 RBS-only arcs
  const rbsArcs = arcs.filter(
    a => rbsVertices.has(a.from) && rbsVertices.has(a.to)
  );

  // 3 RU′ (RBS-only classical RU)
  const rbsRU = computeClassicalRU(
    vertices.filter(v => rbsVertices.has(v.vuid)),
    rbsArcs
  );

  // 4 PCA cap (global)
  const pcaCap = computeGlobalPCACap(vertices, arcs, rbsVertices);

  // 5 Compute GLOBAL entry weight for this RBS
  let entryWeight = 0;

  const inBridges = arcs.filter(a => a.inBridge);

  for (const b of inBridges) {

    let lval = 1;

    if (bridgeInCycle(b, arcs)) {

      if (pcaCap !== null) {
        lval = Math.min(Number(b.l || 0), pcaCap);
      } else {
        lval = Number(b.l || 0);
      }
    }

    entryWeight += lval;
  }

  const expandedERU = new Map();

  // 6 Compute expanded eRU for real arcs
  for (const arc of arcs) {

    const inside = rbsVertices.has(arc.from) && rbsVertices.has(arc.to);

    if (!inside) {
      expandedERU.set(arc.auid, classicalRU.get(arc.auid) || 0);
      continue;
    }

    const ruPrime = rbsRU.get(arc.auid) || 0;

    let value = 0;

    for (const b of inBridges) {

      let lval = 1;

      if (bridgeInCycle(b, arcs)) {

        if (pcaCap !== null) {
          lval = Math.min(Number(b.l || 0), pcaCap);
        } else {
          lval = Number(b.l || 0);
        }

      }

      // debug log
      console.log(
        "ARC:", arc.from + "→" + arc.to,
        "| bridge:", b.from + "→" + b.to,
        "| l(u,v):", lval,
        "| RU':", ruPrime
      );

      value += lval * (ruPrime + 1);
    }

    expandedERU.set(arc.auid, value);
  }

  // 7 Attach eRU to real arcs
  arcs.forEach(a => {
    a.eRU = expandedERU.get(a.auid) ?? 0;
  });

  for (const aa of abstractArcs) {

    let minVal = Infinity;

    for (const uid of aa.abstract_for.pathArcUIDs) {
      const val = expandedERU.get(uid);
      if (val !== undefined) {
        minVal = Math.min(minVal, val);
      }
    }

    aa.eRU = minVal === Infinity ? 0 : minVal;
    aa.l   = aa.eRU + 1;
  }
}

/* ======================= EVSA ======================= */

export function performEVSA(rdlt) {

  const vertices = cloneList(rdlt.vertices || []);
  const arcs     = cloneList(rdlt.arcs || []);

  const centers = vertices.filter(v => v.isCenter === true);

  const R2primes = [];
  const abstractArcs = [];
  let aaCounter = 0;

  centers.forEach(center => {

    const rbs = buildRBSForCenter(center, vertices, arcs);

    R2primes.push({
      vertices: vertices.filter(v => rbs.vertices.has(v.vuid)),
      arcs: rbs.arcs.map(a => ({ ...a })),
      hasRBS: true,
      _evsa: { center: center.vuid }
    });

    const entryVerts = [...new Set(rbs.inBridges.map(b => b.to))];
    const exitVerts  = [...new Set(rbs.outBridges.map(b => b.from))];

    for (const v of entryVerts) {
      for (const x of exitVerts) {
        if (v === x) continue;
        const paths = enumeratePaths(v, x, rbs.arcs);
        for (const p of paths) {
          abstractArcs.push({
            auid: `AA_${v}_${x}_${aaCounter++}`,
            from: v,
            to: x,
            c: 'E',
            l: 1,
            eRU: 0,
            inBridge: false,
            outBridge: false,
            abstract_for: {
              pathArcUIDs: p.map(a => a.auid)
            }
          });
        }
      }

      // self cycle
      const sccs = computeSCC([...rbs.vertices], rbs.arcs);
      const sccIndex = new Map();
      sccs.forEach((scc,i)=>scc.forEach(vv=>sccIndex.set(vv,i)));

      const scc = sccs[sccIndex.get(v)];
      if (isCyclicSCC(scc, rbs.arcs)) {
        const cycleArcs = rbs.arcs.filter(
          a => scc.includes(a.from) && scc.includes(a.to)
        );
        abstractArcs.push({
          auid: `AA_${v}_${v}_${aaCounter++}`,
          from: v,
          to: v,
          c: 'E',
          l: 1,
          eRU: 0,
          inBridge: false,
          outBridge: false,
          abstract_for: {
            pathArcUIDs: cycleArcs.map(a => a.auid)
          }
        });
      }
    }
  });

  const rbsVerticesAll = new Set();
  centers.forEach(c => {
    const rbs = buildRBSForCenter(c, vertices, arcs);
    rbs.vertices.forEach(v => rbsVerticesAll.add(v));
  });

  computeExpandedERU(vertices, arcs, rbsVerticesAll, abstractArcs);

  const bridgeVerticesAll = new Set();
  centers.forEach(center => {
    const rbs = buildRBSForCenter(center, vertices, arcs);
    rbs.inBridges.forEach(b  => bridgeVerticesAll.add(b.to));
    rbs.outBridges.forEach(b => bridgeVerticesAll.add(b.from));
  });

  const r1Arcs = arcs.filter(a => {
    const bothInternal =
      rbsVerticesAll.has(a.from) && rbsVerticesAll.has(a.to);
    return !bothInternal;
  });

  const r1Vertices = vertices.filter(v =>
    !rbsVerticesAll.has(v.vuid) || bridgeVerticesAll.has(v.vuid)
  );

  const R1prime = {
    vertices: r1Vertices,
    arcs:     r1Arcs.concat(abstractArcs),
    hasRBS: centers.length > 0,
    _evsa: {
      abstractArcsCount: abstractArcs.length,
      abstractArcs
    }
  };

  return [R1prime, ...R2primes];
}
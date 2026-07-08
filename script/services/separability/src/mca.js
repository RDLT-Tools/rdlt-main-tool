
export function runMCA(evsaResults) {
  const contractionPaths = generateContractionPaths(evsaResults);
  const results = [];

  const seenMinCS = new Set();

  for (const p of contractionPaths) {
    const Ri = evsaResults[p.rdltId - 1];
    const minCS = runMCAPhase2(Ri, p);

    // Key = sorted arc signatures of the pruned MinCS
    const arcKey = minCS.arcs
      .map(a => `${a.from}->${a.to}:${a.c}`)
      .sort()
      .join('|');
    const dedupKey = `${p.rdltId}::${arcKey}`;
    if (seenMinCS.has(dedupKey)) continue;
    seenMinCS.add(dedupKey);

    results.push({
      rdltId: p.rdltId,
      level: p.level,
      atomicVertices: minCS.updatedAtomicVertices,
      minCS
    });
  }

  return results;
}

export function generateContractionPaths(evsaResults) {
  const allPaths = [];

  evsaResults.forEach((rdlt, rdltIndex) => {
    const { RV_adj, RV_C } = buildMatrices(rdlt);

    let source = detectSource(RV_adj);
    let sink   = detectSink(RV_adj);

    if (!source && rdlt._evsa?.entryVerts?.length) {
      source = rdlt._evsa.entryVerts[0];
      logStep(`SOURCE fallback (pure-cycle RBS): using entry vertex ${source}`);
    }
    if (!sink && rdlt._evsa?.exitVerts?.length) {
      sink = rdlt._evsa.exitVerts.find(v => v !== source)
          ?? rdlt._evsa.exitVerts[0];
      logStep(`SINK fallback (pure-cycle RBS): using exit vertex ${sink}`);
    }

    if (!source || !sink) return;

    const origAdj = JSON.parse(JSON.stringify(RV_adj));
    const results = tryContractAll(
      RV_adj,
      RV_C,
      origAdj,
      source,
      source,
      sink,
      [source],
      [],
      source    // initial frontier = source
    );

    const seenStepSequences = new Set();
    results.forEach(r => {
      const key = r.steps.map(s => `${s.from}\u2297${s.with}`).join('|');
      if (seenStepSequences.has(key)) return;
      seenStepSequences.add(key);

      allPaths.push({
        rdltId: rdltIndex + 1,
        level: rdlt._evsa?.rbsIndex !== undefined ? 2 : 1,
        atomicVertices: r.P,
        contractionSequence: r.P,
        steps: r.steps
      });
    });
  });

  return allPaths;
}

function tryContractAll(
  RV_adj,
  RV_C,
  origAdj,    // frozen original adjacency (for frontier filter)
  source,     // source vertex ID — constant across recursion
  x,
  sink,
  P,
  steps,
  frontier    // last absorbed vertex
) {
  logStep(`ENTER tryContractAll | x=${x} | frontier=${frontier} | P=[${P.join(' -> ')}]`);

  const results = [];

  // ---- termination ----
  if (hasAbsorbedSink(P, sink)) {
    results.push({ P, steps });
    return results;
  }

  const structuralY = new Set();
  // (a) successors of frontier in original graph
  for (const v in origAdj[frontier] ?? {})
    if (origAdj[frontier][v] > 0) structuralY.add(v);
  for (const atom of x.split('\u2227')) {
    if (atom === source) continue;   // source guard — controls fallback below
    if ((origAdj[atom]?.[frontier] ?? 0) > 0)
      for (const v in origAdj[atom])
        if (origAdj[atom][v] > 0) structuralY.add(v);
  }
  const allNeighbors = neighbors(x, RV_adj);
  const primaryY  = allNeighbors.filter(y =>  structuralY.has(y));
  const secondaryY = allNeighbors.filter(y => !structuralY.has(y));

  logStep(`primaryY=[${primaryY.join(', ')}] secondaryY=[${secondaryY.join(', ')}]`);

  function tryY(candidates) {
    const found = [];
    for (const y of candidates) {
      const adjCopy   = deepClone(RV_adj);
      const CCopy     = deepCloneLabels(RV_C);
      const PCopy     = [...P];
      const stepsCopy = [...steps];

      const U = incomingExcept(x, y, adjCopy);
      const LHS = new Set([...(CCopy[x]?.[y] ?? []), 'ε']);
      const RHS = unionAll(U.map(u => CCopy[u]?.[y] ?? new Set()));

      logStep(`Join check for (${x} ⊗ ${y}): LHS={${[...LHS]}} RHS={${[...RHS]}}`);
      if (!isSuperset(LHS, RHS)) { logStep(`Join rejected (${x} ⊗ ${y})`); continue; }

      U.forEach(u => { CCopy[u][y] = new Set(['ε']); });
      const { RV_adj: newAdj, RV_C: newC, z } = contract(x, y, adjCopy, CCopy);
      logStep(`CONTRACT ${x} ⊗ ${y} → ${z}`);
      PCopy.push(y);
      stepsCopy.push({ from: x, with: y, result: z });
      const sub = tryContractAll(
        newAdj, newC, origAdj, source, z, sink, PCopy, stepsCopy, y
      );
      found.push(...sub);
    }
    return found;
  }

  const primaryResults = tryY(primaryY);
  results.push(...primaryResults);
  if (primaryResults.length === 0 && secondaryY.length > 0) {
    logStep(`Primary exhausted — trying secondary candidates`);
    results.push(...tryY(secondaryY));
  }

  return results;
}

/* CONTRACT */
function contract(x, y, RV_adj, RV_C) {

  const z = `${x}∧${y}`;

  const oldV = Object.keys(RV_adj);
  const V = oldV.filter(v => v !== x && v !== y);
  V.push(z);

  const RV_adj2 = {};
  const RV_C2   = {};

  // initialize
  V.forEach(v => {
    RV_adj2[v] = {};
    RV_C2[v] = {};
    V.forEach(w => {
      RV_adj2[v][w] = 0;
      RV_C2[v][w] = new Set();
    });
  });

  // ---- copy unaffected edges ----
  for (const u of V) {
    for (const w of V) {
      if (u === z || w === z) continue;
      RV_adj2[u][w] = RV_adj[u]?.[w] ?? 0;
      RV_C2[u][w]   = new Set(RV_C[u]?.[w] ?? []);
    }
  }

  // ---- row/col merge for z ----
  for (const w of V) {
    if (w === z) continue;

    // Row merge (edges FROM z TO w)
    RV_adj2[z][w] = (RV_adj[x]?.[w] ?? 0) + (RV_adj[y]?.[w] ?? 0);
    RV_C2[z][w]   = new Set([
      ...(RV_C[x]?.[w] ?? []),
      ...(RV_C[y]?.[w] ?? [])
    ]);

    // Col merge (edges FROM w TO z)
    RV_adj2[w][z] = (RV_adj[w]?.[x] ?? 0) + (RV_adj[w]?.[y] ?? 0);
    RV_C2[w][z]   = new Set([
      ...(RV_C[w]?.[x] ?? []),
      ...(RV_C[w]?.[y] ?? [])
    ]);
  }

  return { RV_adj: RV_adj2, RV_C: RV_C2, z };
}

/* Induce R_min from R_i using atomic vertices */
export function induceRmin(Ri, atomicVertices) {
  const atomSet = new Set(atomicVertices);

  const vertices = Ri.vertices.filter(v =>
    atomSet.has(v.vuid)
  );

  const arcs = Ri.arcs.filter(a =>
    atomSet.has(a.from) && atomSet.has(a.to)
  );

  return {
    vertices,
    arcs,
    hasRBS: Ri.hasRBS,
    _evsa: Ri._evsa
  };
}

/* Build adjacency matrix RV_adj from R_min */
export function buildAdjMatrix(Rmin) {
  const RV_adj = {};

  for (const v of Rmin.vertices) {
    RV_adj[v.vuid] = {};
    for (const w of Rmin.vertices) {
      RV_adj[v.vuid][w.vuid] = 0;
    }
  }

  for (const arc of Rmin.arcs) {
    RV_adj[arc.from][arc.to] += 1;
  }

  return RV_adj;
}

/* Build constraint matrix RV_C from R_min */
export function buildCMatrix(Rmin) {
  const RV_C = {};

  for (const v of Rmin.vertices) {
    RV_C[v.vuid] = {};
    for (const w of Rmin.vertices) {
      RV_C[v.vuid][w.vuid] = new Set();
    }
  }

  for (const arc of Rmin.arcs) {
    const label = arc.c === 'E' ? 'ε' : arc.c;
    RV_C[arc.from][arc.to].add(label);
  }

  return RV_C;
}

/* Initialize weight matrix W */
export function initWeightMatrix(Rmin) {
  const W = {};

  for (const v of Rmin.vertices) {
    W[v.vuid] = {};
    for (const w of Rmin.vertices) {
      W[v.vuid][w.vuid] = 0;
    }
  }

  return W;
}

/* Phase 2 initialization */
export function initializePhase2Matrices(Ri, atomicVertices) {
  const Rmin = induceRmin(Ri, atomicVertices);
  const RV_adj = buildAdjMatrix(Rmin);
  const RV_C = buildCMatrix(Rmin);
  const W = initWeightMatrix(Rmin);

  return { Rmin, RV_adj, RV_C, W };
}

/* Find merge points in R_min */
export function findMergePoints(RV_adj) {
  const mergePoints = new Set();

  for (const from in RV_adj) {
    for (const to in RV_adj[from]) {
      if (RV_adj[from][to] > 0) {
        mergePoints.add(to);
      }
    }
  }

  return Array.from(mergePoints);
}

/* Compute a single DFS path from source to target in R_min */
export function dfsPath(RV_adj, source, target) {
  const visited = new Set();
  const path = [];

  function dfs(u) {
    visited.add(u);
    path.push(u);

    if (u === target) {
      return true; // path found
    }

    for (const v in RV_adj[u]) {
      if (RV_adj[u][v] > 0 && !visited.has(v)) {
        if (dfs(v)) {
          return true;
        }
      }
    }

    path.pop();
    return false;
  }

  const found = dfs(source);
  return found ? [...path] : null;
}

/* backward traversal and constraint-sensitive weighting */
export function applyBackwardWeighting(
  RV_adj,
  RV_C,
  W,
  source,
  mergePoints
) {
  const visitedMP = new Set();

  for (const y of mergePoints) {
    const Q = dfsPath(RV_adj, source, y);
    if (!Q || Q.length < 2) continue;

    // Traverse backward along DFS path
    for (let j = Q.length - 1; j >= 1; j--) {
      const v = Q[j];
      const u = Q[j - 1];

      const distinct = new Set(RV_C[u][v]);
      W[u][v] += 1;

      // Examine competing incoming arcs
      const incoming = incomingVertices(v, RV_adj);
      for (const k of incoming) {
        if (k === u) continue;

        const labels = RV_C[k][v];
        let contributes = false;

        for (const c of labels) {
          if (!distinct.has(c)) {
            contributes = true;
            distinct.add(c);
          }
        }

        if (contributes) {
          W[k][v] += 1;
        }
      }

      visitedMP.add(v);

      // Early termination conditions
      if (u === source || visitedMP.has(u)) {
        break;
      }
    }
  }
}

export function pruneByWeight(Rmin, W) {
  Rmin.arcs = Rmin.arcs.filter(a => W[a.from][a.to] > 0);
}

export function runMCAPhase2(Ri, contractionPath) {
  const { atomicVertices } = contractionPath;

  const { Rmin, RV_adj, RV_C, W } =
    initializePhase2Matrices(Ri, atomicVertices);

  const mergePoints = findMergePoints(RV_adj);
  let source = findSource(Rmin);
  let sink   = findSink(Rmin);

  if (!source && Ri._evsa?.entryVerts?.length) {
    source = Ri._evsa.entryVerts[0];
  }
  if (!sink && Ri._evsa?.exitVerts?.length) {
    sink = Ri._evsa.exitVerts.find(v => v !== source)
        ?? Ri._evsa.exitVerts[0];
  }

  applyBackwardWeighting(RV_adj, RV_C, W, source, mergePoints);
  pruneByWeight(Rmin, W);

  const survivingAdj  = {};    // forward adjacency on surviving arcs
  const survivingRadj = {};    // reverse adjacency on surviving arcs

  for (const a of Rmin.arcs) {
    if (!survivingAdj[a.from])  survivingAdj[a.from]  = [];
    survivingAdj[a.from].push(a.to);
    if (!survivingRadj[a.to])   survivingRadj[a.to]   = [];
    survivingRadj[a.to].push(a.from);
  }

  function reachSet(start, adjMap) {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const u = queue.shift();
      for (const v of (adjMap[u] ?? [])) {
        if (!visited.has(v)) { visited.add(v); queue.push(v); }
      }
    }
    return visited;
  }

  const forwardSet  = reachSet(source, survivingAdj);
  const backwardSet = sink ? reachSet(sink, survivingRadj) : new Set([source]);
  const keepVuids   = new Set([...forwardSet].filter(v => backwardSet.has(v)));

  Rmin.vertices = Rmin.vertices.filter(v => keepVuids.has(v.vuid));

  Rmin.arcs = Rmin.arcs.filter(a => keepVuids.has(a.from) && keepVuids.has(a.to));

  const updatedP = contractionPath.atomicVertices.filter(
    id => keepVuids.has(id)
  );

  return {
    vertices: Rmin.vertices,
    arcs: Rmin.arcs,
    updatedAtomicVertices: updatedP,
    _sourceRi: Ri,
    _meta: {
      source: source,
      sink:   sink
    }
  };
}

function buildMatrices(rdlt) {
  const RV_adj = {};
  const RV_C   = {};

  rdlt.vertices.forEach(v => {
    RV_adj[v.vuid] = {};
    RV_C[v.vuid] = {};
    rdlt.vertices.forEach(w => {
      RV_adj[v.vuid][w.vuid] = 0;
      RV_C[v.vuid][w.vuid] = new Set();
    });
  });

  rdlt.arcs.forEach(a => {
    RV_adj[a.from][a.to] += 1;
    const label = a.c === 'E' ? 'ε' : a.c;
    RV_C[a.from][a.to].add(label);
  });

  return { RV_adj, RV_C };
}

function neighbors(x, RV_adj) {
  return Object.keys(RV_adj[x]).filter(y => RV_adj[x][y] > 0);
}

function incomingExcept(x, y, RV_adj) {
  return Object.keys(RV_adj).filter(
    u => u !== x && u !== y && RV_adj[u][y] > 0
  );
}

function detectSource(RV_adj) {
  return Object.keys(RV_adj).find(v =>
    Object.values(RV_adj).every(row => row[v] === 0)
  );
}

function detectSink(RV_adj) {
  return Object.keys(RV_adj).find(v =>
    Object.values(RV_adj[v]).every(c => c === 0)
  );
}

function hasAbsorbedSink(P, sink) {
  return P.includes(sink);
}

function unionAll(sets) {
  const out = new Set();
  sets.forEach(s => s.forEach(v => out.add(v)));
  return out;
}

function isSuperset(A, B) {
  for (const b of B) if (!A.has(b)) return false;
  return true;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepCloneLabels(C) {
  const out = {};
  for (const u in C) {
    out[u] = {};
    for (const v in C[u]) {
      out[u][v] = new Set(C[u][v]);
    }
  }
  return out;
}

// Debug helper
function logStep(info) {
  console.log(`[MCA-TRACE] ${info}`);
}

// Phase 2 Helpers
function incomingVertices(v, RV_adj) {
  const incoming = [];
  for (const u in RV_adj) {
    if (RV_adj[u][v] > 0) {
      incoming.push(u);
    }
  }
  return incoming;
}

function findSource(Rmin) {
  const incomingCount = {};
  for (const v of Rmin.vertices) {
    incomingCount[v.vuid] = 0;
  }
  for (const a of Rmin.arcs) {
    incomingCount[a.to] += 1;
  }
  return Object.keys(incomingCount).find(v => incomingCount[v] === 0);
}

function findSink(Rmin) {
  const outgoingCount = {};
  for (const v of Rmin.vertices) {
    outgoingCount[v.vuid] = 0;
  }
  for (const a of Rmin.arcs) {
    outgoingCount[a.from] += 1;
  }
  return Object.keys(outgoingCount).find(v => outgoingCount[v] === 0);
}
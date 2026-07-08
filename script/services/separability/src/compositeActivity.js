
import { createVertex, createRDLT, cloneRDLT } from './rdltModel.js';
import { findSourceAndSinkFromGraph } from './rdltUtilities.js';

function findSource(rdlt, hint = null) {
  if (hint) {
    const v = rdlt.vertices.find(v => v.vuid === hint);
    if (v) return v;
  }
  // fall back to utility
  const { sources } = findSourceAndSinkFromGraph(rdlt);
  return rdlt.vertices.find(v => v.vuid === sources[0]) ?? null;
}

function findSink(rdlt, hint = null) {
  if (hint) {
    const v = rdlt.vertices.find(v => v.vuid === hint);
    if (v) return v;
  }
  const { sinks } = findSourceAndSinkFromGraph(rdlt);
  return rdlt.vertices.find(v => v.vuid === sinks[0]) ?? null;
}

function extractActivityProfile(masObj, originalRDLT = null, targetedArcs = new Set()) {
  const rdlt   = masObj.rdlt;
  const source = findSource(rdlt, masObj.source);
  const sink   = findSink(rdlt, masObj.sink);

  if (!source || !sink || rdlt.arcs.length === 0) {
    console.warn(`extractActivityProfile: MAS ${masObj.id} has no arcs or missing source/sink`);
    return { profile: [], source, sink, depth: 0, pass: false, conclusion: 'end-fail', tor: [] };
  }

  const originalArcByUID = new Map();
  if (originalRDLT?.arcs) {
    originalRDLT.arcs.forEach(a => originalArcByUID.set(String(a.auid), a));
  }

  const vertices    = rdlt.vertices.map(v => ({ ...v }));
  const arcs        = rdlt.arcs.map(a => ({ ...a }));
  const vertexMap   = new Map(vertices.map(v => [v.vuid, v]));

  const outMatrix = new Map(vertices.map(v => [v.vuid, []]));
  const inMatrix  = new Map(vertices.map(v => [v.vuid, []]));
  arcs.forEach(a => {
    if (outMatrix.has(a.from)) outMatrix.get(a.from).push(a);
    if (inMatrix.has(a.to))   inMatrix.get(a.to).push(a);
  });

  const T_attr = new Map(); // key → number[]
  const CTInd  = new Map(); // key → number[]
  const tau    = new Map(); // key → number

  arcs.forEach(a => {
    const key = `${a.from}->${a.to}`;
    const L   = Math.max(a.l ?? 1, 1);
    T_attr.set(key, new Array(L).fill(0));
    CTInd.set(key, new Array(L).fill(0));
    tau.set(key, 0);
  });

  const dfsVisited = new Set();
  const dfsStack   = new Set();
  const backEdges  = new Set();

  function dfsDetect(vuid) {
    dfsVisited.add(vuid);
    dfsStack.add(vuid);
    for (const a of (outMatrix.get(vuid) ?? [])) {
      if (!dfsVisited.has(a.to)) {
        dfsDetect(a.to);
      } else if (dfsStack.has(a.to)) {
        backEdges.add(`${a.from}->${a.to}`);
      }
    }
    dfsStack.delete(vuid);
  }
  dfsDetect(source.vuid);

  const loopArcs = new Set(
    [...backEdges].filter(key => { const [f, t] = key.split('->'); return f !== t; })
  );

  const EPS = new Set(['E', 'ε', '', undefined, null]);

  function isUnconstrainedArc(arc) {
    const y     = arc.to;
    const cXY   = arc.c;
    const epsXY = EPS.has(cXY);
    const tauXY = tau.get(`${arc.from}->${arc.to}`) ?? 0;

    for (const va of (inMatrix.get(y) ?? [])) {
      if (va.from === arc.from) continue; // same arc, skip
      const cVY   = va.c;
      const epsVY = EPS.has(cVY);
      const tauVY = tau.get(`${va.from}->${va.to}`) ?? 0;
      const LVY   = Math.max(va.l ?? 1, 1);

      // Condition 1
      if (epsVY || (!epsVY && !epsXY && cVY === cXY)) continue;
      // Condition 2
      if (!epsXY && !epsVY && cXY !== cVY && tauXY <= tauVY && tauVY <= LVY) continue;
      // Condition 3
      if (!epsVY && epsXY) {
        const tArr = T_attr.get(`${va.from}->${va.to}`) ?? [];
        if (tArr.some(t => t > 0)) continue;
      }
      return false;
    }
    return true;
  }

  const activityProfile = []; // Arc[][] — one Arc[] per time step
  const tor             = []; // Arc[]  — flat traversal-order record
  let   frontier        = new Set([source.vuid]);
  let   conclusion      = null;

  const MAX_STEPS = arcs.reduce((s, a) => s + Math.max(a.l ?? 1, 1), 0) + vertices.length + 10;
  let   stepCount = 0;

  while (!frontier.has(sink.vuid)) {
    if (++stepCount > MAX_STEPS) {
      console.warn(`extractActivityProfile: MAS ${masObj.id} exceeded ${MAX_STEPS} steps`);
      conclusion = 'end-fail';
      break;
    }

    const maxV = new Map();
    for (const x of frontier) {
      let mv = 0;
      for (const inArc of (inMatrix.get(x) ?? [])) {
        for (const t of (T_attr.get(`${inArc.from}->${inArc.to}`) ?? [])) {
          if (t > mv) mv = t;
        }
      }
      maxV.set(x, mv);
    }

    for (const x of frontier) {
      for (const a of (outMatrix.get(x) ?? [])) {
        const key = `${a.from}->${a.to}`;
        const L   = Math.max(a.l ?? 1, 1);
        if ((tau.get(key) ?? 0) < L) {
          const ctind = CTInd.get(key);
          const i     = ctind.indexOf(0);
          if (i >= 0) {
            T_attr.get(key)[i] = (maxV.get(x) ?? 0) + 1;
            ctind[i]           = 1; // checked
          }
        }
      }
    }

    const fireSet = [];

    for (const x of frontier) {
      const outArcs  = (outMatrix.get(x) ?? []).filter(a => a.from !== a.to);

      const loopCands = outArcs.filter(a => {
        const key = `${a.from}->${a.to}`;
        return loopArcs.has(key) && (tau.get(key) ?? 0) < Math.max(a.l ?? 1, 1);
      });

      if (loopCands.length > 0) {
        for (const a of loopCands) {
          if (isUnconstrainedArc(a)) fireSet.push(a);
        }
      } else {
        const fwdCands = outArcs.filter(a => {
          const key = `${a.from}->${a.to}`;
          return !loopArcs.has(key) && (tau.get(key) ?? 0) < Math.max(a.l ?? 1, 1);
        });

        const preferred = fwdCands.filter(a => targetedArcs.has(`${a.from}->${a.to}`));
        const chosen    = preferred.length > 0 ? preferred : fwdCands;

        for (const a of chosen) {
          if (isUnconstrainedArc(a)) fireSet.push(a);
        }
      }
    }

    if (fireSet.length === 0) {
      console.warn(
        `extractActivityProfile: MAS ${masObj.id} — empty fireSet at frontier ` +
        `{${[...frontier].join(', ')}} before sink. MAS may violate Definition 8.`
      );
      conclusion = 'end-fail';
      break;
    }

    const newFrontier = new Set();
    const primaryArcs  = []; // concrete arcs that fire this round
    const extraSteps   = []; // [ Arc[] ] — each element is one expansion step

    for (const a of fireSet) {
      const key = `${a.from}->${a.to}`;

      // Stamp traversal
      const ctind = CTInd.get(key);
      const i     = ctind.indexOf(1); // leftmost checked slot
      if (i >= 0) {
        ctind[i]          = 2; // traversed
        T_attr.get(key)[i] = (maxV.get(a.from) ?? 0) + 1;
      }
      tau.set(key, (tau.get(key) ?? 0) + 1);

      const typeAlike = (inMatrix.get(a.to) ?? []).filter(va => va.from !== a.from);
      let MAX = 0;
      for (const va of typeAlike) {
        for (const t of (T_attr.get(`${va.from}->${va.to}`) ?? [])) {
          if (t > MAX) MAX = t;
        }
      }
      for (const t of (T_attr.get(key) ?? [])) { if (t > MAX) MAX = t; }

      for (const va of typeAlike) {
        const vaKey   = `${va.from}->${va.to}`;
        const vaCTInd = CTInd.get(vaKey);
        if (!EPS.has(va.c) && vaCTInd) {
          // Update last checked slot of va
          let j = -1;
          for (let k = vaCTInd.length - 1; k >= 0; k--) {
            if (vaCTInd[k] === 1) { j = k; break; }
          }
          if (j >= 0) T_attr.get(vaKey)[j] = MAX + 1;
        }
      }

      // Advance frontier target
      newFrontier.add(a.to);

      if (a.abstract_for) continue;

      const constrained = !EPS.has(a.c);
      primaryArcs.push({ ...a, constrained });
    }

    if (primaryArcs.length > 0) {
      activityProfile.push(primaryArcs);
      for (const a of primaryArcs) tor.push(a);
    }

    for (const stepArcs of extraSteps) {
      activityProfile.push(stepArcs);
      for (const a of stepArcs) tor.push(a);
    }

    frontier = newFrontier;

    if (frontier.has(sink.vuid)) {
      conclusion = 'end-sink';
      break;
    }
  }

  if (conclusion === null) conclusion = frontier.has(sink.vuid) ? 'end-sink' : 'end-fail';

  const pass = (conclusion === 'end-sink');
  if (!pass) {
    console.warn(`MAS ${masObj.id}: Algorithm M ended with conclusion '${conclusion}'`);
  }

  return {
    profile:    activityProfile,        // S_q(1)…S_q(k_q)
    source,
    sink,
    depth:      activityProfile.length, // k_q
    pass,
    conclusion,
    tor
  };
}

function computeCompositeProfile(extractedProfiles) {
  const n      = extractedProfiles.length;
  const depths = extractedProfiles.map(p => p.depth);

  // β = Σ(k_q + 1), k′ = 1 + β
  const beta   = depths.reduce((sum, kq) => sum + kq + 1, 0);
  const kPrime = 1 + beta;

  // S′ is 1-indexed: S[1]…S[kPrime]
  const S = Array.from({ length: kPrime + 1 }, () => []);

  const source1 = extractedProfiles[0]?.source;
  const sinkN   = extractedProfiles[n - 1]?.sink;

  if (source1) {
    S[1] = [{
      from: 'i', to: source1.vuid,
      c: 'E', l: 1,
      label: `i → ${source1.vuid}`,
      type: 'entry'
    }];
  }

  let running = 0;

  for (let q = 0; q < n; q++) {
    const { profile, sink, depth: kq } = extractedProfiles[q];

    // Condition 2: internal steps of MAS q
    for (let p = 0; p < kq; p++) {
      const t_qp  = running + p + 1;   // position within β-space (1-based)
      const index = 1 + t_qp;          // position within S′

      if (index > kPrime) break;

      S[index] = profile[p].map(a => ({
        ...a,
        label: `${a.from} → ${a.to}`,
        type: 'internal',
        masIndex: q + 1,
        step: p + 1
      }));
    }

    if (q < n - 1) {
      const seamT     = running + kq + 1;   // seam slot in β-space
      const seamIndex = 1 + seamT;          // position in S′
      const sourceNext = extractedProfiles[q + 1].source;

      if (sink && sourceNext && seamIndex <= kPrime) {
        S[seamIndex] = [{
          from: sink.vuid, to: sourceNext.vuid,
          c: 'E', l: 1,
          label: `${sink.vuid} → ${sourceNext.vuid}`,
          type: 'seam',
          masFrom: q + 1,
          masTo:   q + 2
        }];
      }
    }

    running += kq + 1;
  }

  if (sinkN) {
    S[kPrime] = [{
      from: sinkN.vuid, to: 'o',
      c: 'E', l: 1,
      label: `${sinkN.vuid} → o`,
      type: 'exit'
    }];
  }

  return { S, beta, kPrime, n };
}

export function buildCompositeActivity(masArray, originalRDLT = null) {
  if (!Array.isArray(masArray) || masArray.length === 0) {
    console.warn('buildCompositeActivity: no MAS provided');
    return null;
  }

  const arcKeyCount = new Map();
  masArray.forEach(mas => {
    const seenInThisMas = new Set();
    mas.rdlt.arcs.forEach(a => {
      if (a.abstract_for) return;
      const key = `${a.from}->${a.to}`;
      if (!seenInThisMas.has(key)) {
        seenInThisMas.add(key);
        arcKeyCount.set(key, (arcKeyCount.get(key) ?? 0) + 1);
      }
    });
  });
  const sharedArcKeys = new Set(
    [...arcKeyCount.entries()]
      .filter(([, count]) => count >= 2)
      .map(([key]) => key)
  );

  const profiles = masArray.map(mas => extractActivityProfile(mas, originalRDLT, sharedArcKeys));

  const vertexMap = new Map();
  masArray.forEach(mas => {
    mas.rdlt.vertices.forEach(v => {
      if (!vertexMap.has(v.vuid)) vertexMap.set(v.vuid, { ...v });
    });
  });

  const allArcs = [];
  const arcSeen = new Set();

  masArray.forEach((mas, q) => {
    // MAS internal arcs
    mas.rdlt.arcs.forEach(a => {
      const key = `${a.from}->${a.to}-${a.c}`;
      if (!arcSeen.has(key)) {
        arcSeen.add(key);
        allArcs.push({ ...a });
      }
    });

    // ε-seam arc to next MAS (Condition 3)
    if (q < masArray.length - 1) {
      const sink_q    = profiles[q].sink;
      const source_q1 = profiles[q + 1].source;
      if (sink_q && source_q1) {
        const seamKey = `seam:${sink_q.vuid}->${source_q1.vuid}`;
        if (!arcSeen.has(seamKey)) {
          arcSeen.add(seamKey);
          allArcs.push({
            auid:      `seam_${q}_${q + 1}`,
            from:      sink_q.vuid,
            to:        source_q1.vuid,
                        c: 'E',   l: 1,
            inBridge:  false,
            outBridge: false,
            isSeam:    true
          });
        }
      }
    }
  });

  const profileData = computeCompositeProfile(profiles);

  const composite = createRDLT([...vertexMap.values()], allArcs, false);

  composite._meta = {
    originalSource: profiles[0]?.source?.vuid      ?? '(unknown)',
    originalSink:   profiles[profiles.length - 1]?.sink?.vuid ?? '(unknown)',
    masCount:       masArray.length
  };
  composite._profileData = profileData;
  composite._profiles    = profiles;

  return composite;
}

export function buildLoopedRDLT(originalRDLT, n) {
  const rLoop = cloneRDLT(originalRDLT);

  const { sources: sourceVuids, sinks: sinkVuids } = findSourceAndSinkFromGraph(originalRDLT);

  rLoop.vertices.unshift(createVertex('i', 'i', 'c', 0));
  rLoop.vertices.push(createVertex('o', 'o', 'c', 0));

  sourceVuids.forEach((sVuid, idx) => {
    rLoop.arcs.unshift({
      auid: `arc_entry_${idx}`, from: 'i', to: sVuid,
            c: 'E', l: 1, inBridge: false, outBridge: false,
      isEntryArc: true
    });
  });

  sinkVuids.forEach((fVuid, idx) => {
    rLoop.arcs.push({
      auid: `arc_exit_${idx}`, from: fVuid, to: 'o',
            c: 'E', l: 1, inBridge: false, outBridge: false,
      isExitArc: true
    });
  });

  sinkVuids.forEach((fVuid, fIdx) => {
    sourceVuids.forEach((sVuid, sIdx) => {
      rLoop.arcs.push({
        auid: `arc_loop_${fIdx}_${sIdx}`, from: fVuid, to: sVuid,
                c: 'E', l: n, inBridge: false, outBridge: false,
        isLoopArc: true
      });
    });
  });

  const arcMap = new Map();
  rLoop.arcs.forEach(a => arcMap.set(`${a.from}->${a.to}`, a));

  rLoop._sourceVuids = sourceVuids;
  rLoop._sinkVuids   = sinkVuids;
  rLoop._arcMap      = arcMap;

  return { rLoop, sourceVuids, sinkVuids };
}

function simulateCompositeActivity(S, kPrime, rLoop, originalR) {
  const originalArcMap = new Map();
  originalR.arcs.forEach(a => originalArcMap.set(`${a.from}->${a.to}`, a));

  const traversalCount       = new Map();
  const conflictImpedances   = [];
  const constraintImpedances = [];
  const lBoundImpedances     = [];
  const trace                = [];

  for (let t = 1; t <= kPrime; t++) {
    const config  = S[t] ?? [];
    const stepLog = {
      t,
      arcs: config.map(a => ({
        key: `${a.from}->${a.to}`, masIndex: a.masIndex ?? null,
        type: a.type, c: a.c, l: a.l
      })),
      impedances: []
    };

    const isStructural = a => a.type === 'seam' || a.type === 'entry' || a.type === 'exit';
    const realConfig   = config.filter(a => !isStructural(a));

    const arcGroups = new Map();
    realConfig.forEach(a => {
      const key = `${a.from}->${a.to}`;
      if (!arcGroups.has(key)) arcGroups.set(key, []);
      arcGroups.get(key).push(a);
    });

    arcGroups.forEach((group, arcKey) => {
      const rLoopArc = rLoop._arcMap.get(arcKey);
      if (!rLoopArc) return;

      if (group.length > 1) {
        const masIndices = group.map(a => a.masIndex).filter(i => i != null);

        // A: time-step conflict
        const imp = {
          type: 'TIME_STEP_CONFLICT', t, arc: arcKey, masIndices,
          detail: `Arc (${arcKey}) activated by ${group.length} MAS at t=${t}`
        };
        conflictImpedances.push(imp);
        stepLog.impedances.push(imp);

        const effectiveC = originalArcMap.get(arcKey)?.c ?? rLoopArc.c;
        if (effectiveC !== 'E' && effectiveC !== 'ε' && effectiveC !== '') {
          const cImp = {
            type: 'CONSTRAINT_CLASH', t, arc: arcKey,
            constraint: effectiveC, masIndices,
            detail: `Constrained arc (${arcKey}, C=${effectiveC}) contested by MAS [${masIndices.join(', ')}] at t=${t}`
          };
          constraintImpedances.push(cImp);
          stepLog.impedances.push(cImp);
        }
      }
    });

    realConfig.forEach(a => {
      const key = `${a.from}->${a.to}`;
      traversalCount.set(key, (traversalCount.get(key) ?? 0) + 1);
    });

    realConfig.forEach(a => {
      const key     = `${a.from}->${a.to}`;
      const count   = traversalCount.get(key);
      const origArc = originalArcMap.get(key);
      const L_R     = origArc?.l ?? a.l ?? Infinity;

      if (count > L_R) {
        const lImp = {
          type: 'L_BOUND_EXCEEDED', t, arc: key, L_R, count,
          detail: `Arc (${key}) traversed ${count}×, exceeds L(R)=${L_R} at t=${t}`
        };
        lBoundImpedances.push(lImp);
        stepLog.impedances.push(lImp);
      }
    });

    trace.push(stepLog);
  }

  const allImpedances = [
    ...conflictImpedances,
    ...constraintImpedances,
    ...lBoundImpedances
  ];

  return {
    separable: allImpedances.length === 0,
    kPrime,
    conflictImpedances,
    constraintImpedances,
    lBoundImpedances,
    allImpedances,
    traversalCount: Object.fromEntries(traversalCount),
    trace,
    summary: {
      separable:          allImpedances.length === 0,
      totalImpedances:    allImpedances.length,
      timeStepConflicts:  conflictImpedances.length,
      constraintClashes:  constraintImpedances.length,
      lBoundViolations:   lBoundImpedances.length
    }
  };
}

export function runSimulation(originalRDLT, compositeActivity) {
  if (!originalRDLT)      throw new Error('runSimulation: originalRDLT is required');
  if (!compositeActivity) throw new Error('runSimulation: compositeActivity is required');

  const profileData = compositeActivity._profileData;
  if (!profileData) throw new Error('runSimulation: compositeActivity has no _profileData');

  const { S, kPrime, n } = profileData;

  const { rLoop, sourceVuids, sinkVuids } = buildLoopedRDLT(originalRDLT, n);
  const report = simulateCompositeActivity(S, kPrime, rLoop, originalRDLT);

  report._rLoop       = rLoop;
  report._sourceVuids = sourceVuids;
  report._sinkVuids   = sinkVuids;

  return report;
}
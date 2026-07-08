
export function createVertex(vuid, id = '', type = 'c', M = 0) {
  return {
    vuid: String(vuid),
    id: String(id),
    type: String(type),
    M: Number(M),

    // Normalized attributes (filled later)
    role: null,            // boundary | entity | control | unknown
    isCenter: false        // true if M = 1
  };
}

export function createArc(auid, from, to, C = "E", L = 0, In = 0, Out = 0) {
  return {
    auid: String(auid),
    from: String(from),
    to: String(to),
    C: String(C),
    L: Number(L),

    // Bridge markers
    In: Number(In),
    Out: Number(Out),

    // Normalized forms
    c: String(C),        // symbolic C
    l: Number(L),
    inBridge: Number(In) === 1,
    outBridge: Number(Out) === 1,
    // rclass: "unknown"
  };
}

export function createRDLT(vertices = [], arcs = [], hasRBS = false) {
  return {
    vertices: Array.from(vertices),
    arcs: Array.from(arcs),
    hasRBS: !!hasRBS
  };
}

export function cloneRDLT(rdlt) {
  return createRDLT(
    (rdlt.vertices || []).map(v => ({ ...v })),
    (rdlt.arcs || []).map(a => ({ ...a })),
    !!rdlt.hasRBS
  );
}

export function normalizeToLiterature(rdlt) {
  const out = cloneRDLT(rdlt);

  // --- Assign vertex roles ---
  const vmap = new Map();
  out.vertices.forEach(v => {
    const t = (v.type || '').toString().toLowerCase();

    let role = null;
    if (t === 'b' || t === 'boundary') role = 'boundary';
    else if (t === 'e' || t === 'entity') role = 'entity';
    else if (t === 'c' || t === 'control') role = 'control';
    else role = 'unknown';

    v.role = role;
    v.isCenter = Number(v.M) === 1;

    vmap.set(v.vuid, v);
  });

  // --- Normalize arcs ---
  out.arcs.forEach(a => {
    a.c = (a.C === 'E' || a.C === 'ε' || a.C === '' || a.C == null) ? 'E' : String(a.C);
    a.l = Number(a.L || 0);

    a.inBridge = Number(a.In || 0) === 1;
    a.outBridge = Number(a.Out || 0) === 1;
  });

  // --- RBS detection ---
  out.hasRBS = out.vertices.some(v => v.isCenter);

  out._normalized = {
    timestamp: (new Date()).toISOString(),
    heuristics: {
      roles: "b/e/c interpretation",
      rclass: "role-based R1/R2 classification"
    }
  };

  return out;
}

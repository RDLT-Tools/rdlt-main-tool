export function parseRDLT (input, extend = true) {
  let raw;
  try {
    raw = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (err) {
    throw new Error('Invalid JSON: ' + err.message);
  }

  // ---------- rudimentary shape ------------------------------------------------
  if (!raw || !Array.isArray(raw.vertices) || !Array.isArray(raw.edges)) {
    throw new Error(
      'RDLT must have the shape { vertices:[...], edges:[...] } - ' +
      'arrays are required.'
    );
  }

  const vertices = Object.create(null);   // id -> vertex (copy)
  const incoming = Object.create(null);   // id -> [{ from, C, L }]
  const outgoing = Object.create(null);   // id -> [{ to,   C, L }]
  const warnings = [];

  // ---------- vertices ---------------------------------------------------------
  raw.vertices.forEach(v => {
    const { id, type, label = '', M = 0 } = v || {};
    if (!id || typeof id !== 'string') {
      throw new Error('Each vertex needs a non-empty string id.');
    }
    if (vertices[id]) {
      throw new Error(`Duplicate vertex id "${id}".`);
    }
    const t = String(type).toLowerCase();
    if (!['b', 'e', 'c'].includes(t)) {
      throw new Error(
        `Vertex "${id}" has invalid type "${type}". ` +
        'Allowed: "b", "e", "c".'
      );
    }
    if (M === 1 && t === 'c') {
      throw new Error(
        `Vertex "${id}" is a controller (type "c") but also marked M=1. ` +
        'Only "b" or "e" vertices may act as RBS centres.'
      );
    }
    if (M !== 0 && M !== 1) {
      warnings.push(
        `Vertex "${id}" has non-boolean M value "${M}". ` +
        'Accepted values: 0 or 1.'
      );
    }

    vertices[id] = { id, type: t, label, M };
    incoming[id] = [];
    outgoing[id] = [];
  });

  // ---------- edges ------------------------------------------------------------
  raw.edges.forEach((e, idx) => {
    const { from, to, C = 'ϵ', L = 1 } = e || {};
    const ctx = `Edge #${idx} (${from} -> ${to})`;

    // existence
    if (!vertices[from]) throw new Error(`${ctx}: "from" vertex missing.`);
    if (!vertices[to])   throw new Error(`${ctx}: "to" vertex missing.`);
    // no object-to-object
    const srcT = vertices[from].type;
    const tgtT = vertices[to].type;
    if (['b', 'e'].includes(srcT) && ['b', 'e'].includes(tgtT)) {
      throw new Error(
        `${ctx}: arcs between two objects (types b/e) are forbidden.`
      );
    }
    // loop?
    if (from === to) {
      warnings.push(`${ctx}: self-loops are unusual - make sure this is intended.`);
    }
    // C must be a string (ϵ allowed)
    if (typeof C !== 'string') {
      throw new Error(`${ctx}: C must be a string (use "ϵ" for ε).`);
    }
    // L must be a positive integer
    if (!Number.isInteger(L) || L < 1) {
      throw new Error(`${ctx}: L must be a positive integer.`);
    }

    // place into adjacency maps
    outgoing[from].push({ to,   C, L });
    incoming[to].push   ({ from, C, L });
  });

  // ---------- Check for valid source and sink nodes -----------------------------
  // Get source places (no incoming arcs) and sink places (no outgoing arcs)
  const sourceNodes = Object.keys(vertices).filter(id => incoming[id].length === 0);
  const sinkNodes = Object.keys(vertices).filter(id => outgoing[id].length === 0);

  if (extend && sourceNodes.length === 0) {
    throw new Error('No valid source node found. Please ensure at least one source node exists.');
  }
  if (extend && sinkNodes.length === 0) {
    throw new Error('No valid sink node found. Please ensure at least one sink node exists.');
  }

  // ---------- extra structural sanity checks -----------------------------------
  // Every RBS centre must have at least one owned controller (C=ϵ to a 'c')
  Object.values(vertices).forEach(v => {
    if (v.M === 1) {
      const owns = outgoing[v.id].filter(a => a.C === 'ϵ' &&
        vertices[a.to]?.type === 'c');
      if (!owns.length) {
        warnings.push(
          `Center "${v.id}" (M=1) does not own any controller (no ε-label arc).`
        );
      }
    }
  });

  // ---------- result -----------------------------------------------------------
  return { rdltJSON: raw, warnings: warnings };
}

/**
 * Exports an RDLT model as a DOT string.
 *
 * This function identifies reset-bound subsystems (RBS) using the
 * model's built-in getVerticesInRBS(centerId) method:
 *  - For each vertex with M === 1 (RBS center), it gets the members of its RBS.
 *    (According to Malinao's paper, an RBS contains the center node plus all nodes
 *     immediately reachable via an epsilon ("ϵ") edge.)
 *  - It then renders such vertices inside a subgraph cluster labeled with the center's label.
 *
 * @param {RDLTModel} rdltModel - An instance of the RDLTModel class.
 * @returns {string} A DOT representation of the RDLT model.
 */
export function exportRDLTToDOT(rdltModel) {
  // Helper to replace apostrophes in node IDs.
  function sanitizeId(id) {
    return id.replace(/'/g, "prime");
  }

  // Helper to create an HTML-like label for a vertex.
  function getHTMLLabel(vertex) {
    if (vertex.type === 'c') {
      return `<TABLE BORDER="0" CELLSPACING="0">
  <TR><TD BORDER="0" COLSPAN="3"> </TD></TR>
  <TR><TD BORDER="1" SIDES="BL" HEIGHT="11"></TD>
    <TD BORDER="0" COLSPAN="2" WIDTH="15"></TD></TR>
  <TR><TD BORDER="0" WIDTH="33" HEIGHT="25" COLSPAN="3" VALIGN="TOP" FIXEDSIZE="TRUE">${vertex.id}</TD></TR>
  <TR><TD BORDER="0" COLSPAN="3" WIDTH="33" HEIGHT="22" FIXEDSIZE="TRUE">${vertex.label}</TD></TR>
</TABLE>`;
    } else if (vertex.type === 'b') {
      return `<TABLE BORDER="0" CELLSPACING="0">
  <TR><TD BORDER="0" COLSPAN="5"> </TD></TR>
  <TR><TD BORDER="1" SIDES="R" ROWSPAN="2"></TD><TD BORDER="1" SIDES="B"></TD>
    <TD HEIGHT="35" BORDER="0" WIDTH="39" ROWSPAN="2" FIXEDSIZE="TRUE">${vertex.id}</TD>
    <TD BORDER="0" ROWSPAN="2"></TD><TD BORDER="0" ROWSPAN="2"></TD></TR>
  <TR><TD SIDES="T"></TD></TR>
  <TR><TD BORDER="0" COLSPAN="5" WIDTH="33" HEIGHT="22" FIXEDSIZE="TRUE">${vertex.label}</TD></TR>
</TABLE>`;
    } else if (vertex.type === 'e') {
      return `<TABLE BORDER="0" CELLSPACING="0">
  <TR><TD BORDER="0"> </TD></TR>
  <TR><TD HEIGHT="38" BORDER="1" WIDTH="30" SIDES="B" FIXEDSIZE="TRUE">${vertex.id}</TD></TR>
  <TR><TD BORDER="0" WIDTH="33" HEIGHT="22" FIXEDSIZE="TRUE">${vertex.label}</TD></TR>
</TABLE>`;
    }
    return vertex.label;
  }

  let dot = 'digraph RDLT {\n';
  dot += '  rankdir=LR;\n';
  dot += '  nodesep=0.5;\n';
  dot += '  node [fontname="Helvetica", margin=0, shape=circle, fixedsize=true, height=0.5];\n';

  // Get all vertices from the model instance.
  const vertices = Object.values(rdltModel.nodes);
  const vertexMap = rdltModel.nodes; // Already keyed by id.

  // Determine reset-bound subsystems (RBS):
  // For each vertex with M === 1, use getVerticesInRBS(centerId) to obtain its RBS members.
  const rbsAssigned = new Set();
  const rbsClusters = []; // Each element: { center: vertex, members: Set of vertex IDs }
  vertices.forEach(v => {
    if (v.M === 1 && !rbsAssigned.has(v.id)) {
      // Use the model's method to obtain the RBS members.
      const rbsIds = rdltModel.getVerticesInRBS(v.id); // returns an array of vertex IDs.
      const members = new Set(rbsIds);
      rbsIds.forEach(id => rbsAssigned.add(id));
      rbsClusters.push({ center: v, members });
    }
  });

  // Vertices not assigned to any RBS.
  const nonRBSVertices = vertices.filter(v => !rbsAssigned.has(v.id));

  // Render non-RBS vertices.
  nonRBSVertices.forEach(v => {
    const htmlLabel = getHTMLLabel(v);
    dot += `  ${sanitizeId(v.id)} [tooltip="${v.id}", label=<${htmlLabel}>];\n`;
  });

  // Render each RBS cluster as a DOT subgraph.
  rbsClusters.forEach(cluster => {
    dot += `  subgraph cluster_RBS_${sanitizeId(cluster.center.id)} {\n`;
    // Label the cluster with the center vertex's label and indicate that M(v)=1.
    dot += `    label="M(${cluster.center.id})=1";\n`;
    dot += `    color=black;\n`;
    dot += `    style=dashed;\n`;
    dot += `    margin=20;\n`;
    cluster.members.forEach(id => {
      const v = vertexMap[id];
      const htmlLabel = getHTMLLabel(v);
      dot += `    ${sanitizeId(v.id)} [tooltip="${v.id}", label=<${htmlLabel}>];\n`;
    });
    dot += '  }\n';
  });

  // Render edges.
  rdltModel.edges.forEach(e => {
    const style = e.type === "abstract" ? 'style=dashed' : '';
    const labelC = e.C ? e.C.replace(/ϵ/g, "&epsilon;") : '&epsilon;';
    dot += `  ${sanitizeId(e.from)} -> ${sanitizeId(e.to)} [label="${labelC}: ${e.L || 1}" ${style}];\n`;
  });

  dot += '}\n';
  return dot;
}



/**
 * Generates a DOT representation for a PN model using the new JSON structure.
 * The PN JSON now contains places, transitions, and arcs directly.
 */
export function exportPNToDOT(pnModel) {
  // Helper: Replace any apostrophe in a node id with the string "prime"
  function sanitizeId(id) {
    return id.replace(/'/g, "prime").replace(/ϵ/g, "epsilon");
  }

  // Helper: Escape HTML special characters so that apostrophes don't cause syntax errors.
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  let dot = 'digraph PN {\n';
  dot += '  rankdir=LR;\n';
  dot += '  nodesep=0.5;\n';
  // Use fixed size nodes so that the shape remains constant.
  dot += '  node [fontname="Helvetica", margin=0, fixedsize=true, height=0.5,];\n';

  // Define transitions with HTML-like label
  dot += '  node [shape=square];\n';
  for (const trans of Object.values(pnModel.transitions)) {
    const transId = sanitizeId(trans.id);
    const tooltip = trans.label;
    let htmlLabel = `<
<TABLE BORDER="0" CELLSPACING="0">
  <TR><TD BORDER="0"> </TD></TR>
  <TR><TD BORDER="0" HEIGHT="40"></TD></TR>
  <TR><TD BORDER="0"><FONT POINT-SIZE="15">${trans.id}</FONT></TD></TR>
</TABLE>
>`;
    let attrStr = `tooltip="${tooltip}", label=${htmlLabel}`;
    if (trans.hasOwnProperty('enabled')) {
      if (trans.enabled === true) {
        attrStr += ', style="filled,bold", fillcolor=yellowgreen, color=green';
      } else if (trans.enabled === false) {
        attrStr += ', style=bold, color=red';
      }
    }
    dot += `  ${transId} [${attrStr}];\n`;
  }

  // Define places with HTML-like label.
  dot += '  node [shape=circle];\n';
  for (const place of Object.values(pnModel.places)) {
    const placeId = sanitizeId(place.id);
    const tooltip = place.label;
    const tokenDisplay = (place.tokens && place.tokens > 0) ? `<FONT POINT-SIZE="20"><B>${place.tokens}</B></FONT>` : "";
    let htmlLabel = `<
<TABLE BORDER="0" CELLSPACING="0">
  <TR><TD BORDER="0"> </TD></TR>
  <TR><TD BORDER="0" HEIGHT="40">${tokenDisplay}</TD></TR>
  <TR><TD BORDER="0"><FONT POINT-SIZE="15">${place.id}</FONT></TD></TR>
</TABLE>
>`;
    dot += `  ${placeId} [tooltip="${tooltip}", label=${htmlLabel}];\n`;
  }

  // Initialize auxiliary arrays/objects for special reset arc connections.
  let auxiliaryPlacesTo = [];
  let auxiliaryPlacesTrr = {}; // Mapping from centerId to an array of labels
  let TrrResets = [];

  // Process arcs.
  // dot += '  // Arcs\n';
  // dot += '  edge [minlen=3];\n';
  pnModel.arcs.forEach(arc => {
    if (arc.to === 'To' && arc.type === 'reset' && !arc.from.startsWith('PJo')) {
      // auxiliaryPlacesTo.push(pnModel.places[arc.from].label);
      auxiliaryPlacesTo.push(arc.from);
    }
    else if (arc.to.startsWith('Trr') && arc.type === 'reset' && !arc.from.startsWith('Pcons')) {
      let centerId = arc.to.substring(3);
      if (!auxiliaryPlacesTrr[centerId]) {
        auxiliaryPlacesTrr[centerId] = [];
      }
      // auxiliaryPlacesTrr[centerId].push(pnModel.places[arc.from].label);
      auxiliaryPlacesTrr[centerId].push(arc.from);
    }
    else if (arc.weight) {
      let centerId = arc.from.substring(3);
      // TrrResets.push({ centerId: centerId, auxLabel: pnModel.places[arc.to].label, weight: arc.weight });
      TrrResets.push({ centerId: centerId, auxID: arc.to, weight: arc.weight });
    }
    else {
      let arcAttrs = [];
      if (arc.hasOwnProperty('fired') && arc.fired === true) {
        arcAttrs.push('color=blue');
        arcAttrs.push('penwidth=2');
      }
      if (arc.type === 'reset') {
        arcAttrs.push('arrowhead="normalnormal"');
      }
      if (arc.type === 'abstract') {
        arcAttrs.push('style="dashed"');
      }
      let attrString = arcAttrs.length > 0 ? ` [${arcAttrs.join(", ")}]` : "";
      dot += `  ${sanitizeId(arc.from)} -> ${sanitizeId(arc.to)}${attrString};\n`;
    }
  });
  dot += '  node [fixedsize=false];\n';
  // Render auxiliary node for "To" reset arcs.
  if (auxiliaryPlacesTo.length > 0) {
    dot += `  AP_To [shape=none, label="`;
    let count = 0;
    for (const auxPlace of auxiliaryPlacesTo) {
      dot += auxPlace;
      if (count < auxiliaryPlacesTo.length - 1) dot += ",";
      if (count % 2 === 1) dot += "\\n";
      else dot += " ";
      count++;
    }
    dot += `", width=0, height=0];\n`;
    const toWasFired = pnModel.arcs.some(a =>
      a.to === 'To' && a.type === 'reset' && a.fired === true
    );
    
    const apToAttrs = ['arrowhead="normalnormal"'];
    if (toWasFired) {
      apToAttrs.push('color=blue', 'penwidth=2');
    }
    dot += `  AP_To -> To [${apToAttrs.join(', ')}];\n`;
    // dot += `  AP_To -> To [arrowhead="normalnormal"];\n`;
    // dot += `  {rank=same; AP_To; To}\n`;
  }

  // Render auxiliary nodes for reset arcs pointing to transitions with IDs starting with "Trr".
  for (const centerId in auxiliaryPlacesTrr) {
    let auxArray = auxiliaryPlacesTrr[centerId];
    let nodeId = `AP_Trr_${centerId}`;
    const transId  = `Trr${centerId}`;
    dot += `  ${nodeId} [shape=none, label="`;
    let count = 0;
    for (const auxPlace of auxArray) {
      dot += auxPlace;
      if (count < auxArray.length - 1) dot += ",";
      if (count % 2 === 1) dot += "\\n";
      else dot += " ";
      count++;
    }
    dot += `", width=0, height=0];\n`;

    const trrWasFired = pnModel.arcs.some(a =>
      a.to === transId &&
      a.type === 'reset' &&
      a.fired === true
    );
  
    // build attribute list just like for AP_To
    const apTrrAttrs = ['arrowhead="normalnormal"'];
    if (trrWasFired) {
      apTrrAttrs.push('color=blue', 'penwidth=2');
    }
  
    // emit the edge with conditional styling
    dot += `  ${nodeId} -> ${sanitizeId(transId)} [${apTrrAttrs.join(', ')}];\n`;
    // dot += `  {rank=same; ${nodeId}; ${sanitizeId("Trr" + centerId)}}\n`;
  }

  // Render separate auxiliary nodes for each reset arc with a weight attribute.
  TrrResets.forEach((entry, index) => {
    const nodeId = `AP_Reset_${entry.centerId}_${index}`;
    const fromId = `Trr${entry.centerId}`;
    const toId   = entry.auxID;

    dot += `  ${nodeId} [shape=none, label="${toId}", height=0.2];\n`;

    // figure out if the actual arc was marked fired
    const resetArcFired = pnModel.arcs.some(a =>
      a.from === fromId &&
      a.to   === toId   &&
      a.fired === true
    );

    // build the attribute list
    const weightAttrs = [
      'arrowhead="normal"',
      `label="${entry.weight}"`
    ];
    if (resetArcFired) {
      weightAttrs.push('color=blue', 'penwidth=2');
    }

    dot += `  ${sanitizeId(fromId)} -> ${nodeId} [${weightAttrs.join(', ')}];\n`;
  });

  

  //  Maximum rows we want to show per column
  const MAX_ROWS = 5;
  
  // ——— Legend as a top‑right graph label ———
  /* -------- Constraint-alias legend (at most 5 rows per column) -------- */
  const cmap         = pnModel.constraintMap || {};
  const aliasEntries = Object.entries(cmap)
    // keep only true aliases (orig ≠ short)
    .filter(([orig, short]) => orig !== short)
    .sort((a, b) => a[1].localeCompare(b[1]));   // sort by the short alias

  const aliasLen  = aliasEntries.length;
  const aliasCols = Math.ceil(aliasLen / MAX_ROWS);   // MAX_ROWS = 5 from previous snippet

  if (aliasLen > 0) {
    // dot += '\n  // Constraint Aliasing\n';
    dot += '  constraint_legend [\n';
    dot += '    shape=none\n';
    dot += '    margin=0\n';
    dot += '    label=<\n';
    dot += '      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="10">\n';
    dot += `        <TR><TD ALIGN="LEFT" BORDER="1" SIDES="B" COLSPAN="${aliasCols}"><B>Constraint Alias</B></TD></TR>\n`;

    /* --- bucket aliases column-wise (max 5 / column) --- */
    const colBuckets = Array.from({ length: aliasCols }, () => []);
    aliasEntries.forEach(([orig, short], idx) => {
      colBuckets[Math.floor(idx / MAX_ROWS)].push({ orig, short });
    });

    const rowCount = Math.max(...colBuckets.map(c => c.length)); // ≤ MAX_ROWS
    for (let r = 0; r < rowCount; r++) {
      dot += '        <TR>';
      for (let c = 0; c < aliasCols; c++) {
        const entry = colBuckets[c][r];
        if (entry) {
          dot += `<TD ALIGN="LEFT"><B>${escapeHTML(entry.short)}</B> : ${escapeHTML(entry.orig)}</TD>`;
        } else {
          dot += '<TD></TD>';
        }
      }
      dot += '</TR>\n';
    }

    dot += '      </TABLE>\n';
    dot += '    >\n';
    dot += '  ];\n';
  }

  /* ---------------  Vertex-label legend --------------- */
  const vmap = pnModel.vertexLabelMap || {};
  const vmapLength = Object.keys(vmap).length;
  //  Number of columns we need (ceil so we have at most 5 rows / column)
  const vmapCol = Math.ceil(vmapLength / MAX_ROWS);

  if (vmapLength > 0) {
    // dot += '\n  // RDLT Vertex Labels\n';
    dot += '  vertexLabel_legend [\n';
    dot += '    shape=none\n';
    dot += '    margin=0\n';
    dot += '    label=<\n';
    dot += '      <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="10">\n';
    // header – span all columns
    dot += `        <TR><TD ALIGN="LEFT" BORDER="1" SIDES="B" COLSPAN="${vmapCol}"><B>RDLT Vertex Labels</B></TD></TR>\n`;

    /* ---- build the grid ---- */
    const sortedEntries = Object.entries(vmap).sort(([aId], [bId]) => aId.localeCompare(bId));

    // bucket entries column-wise so every column gets max 5 rows
    const columns = Array.from({ length: vmapCol }, () => []);
    sortedEntries.forEach(([id, label], idx) => {
      const colIdx = Math.floor(idx / MAX_ROWS); // 0 … vmapCol-1
      columns[colIdx].push({ id, label });
    });

    const rows = Math.max(...columns.map(col => col.length)); // ≤ MAX_ROWS
    for (let r = 0; r < rows; r++) {
      dot += '        <TR>';
      for (let c = 0; c < vmapCol; c++) {
        const entry = columns[c][r];
        if (entry) {
          dot += `<TD ALIGN="LEFT"><B>${escapeHTML(entry.id)}</B> : ${escapeHTML(entry.label)}</TD>`;
        } else {
          dot += '<TD></TD>'; // empty cell to keep table rectangular
        }
      }
      dot += '</TR>\n';
    }

    dot += '      </TABLE>\n';
    dot += '    >\n';
    dot += '  ];\n';

    // keep invisible edge between the two legends (if the alias legend exists)
    if (typeof aliasEntries !== 'undefined' && aliasEntries.length) {
      dot += '  constraint_legend -> vertexLabel_legend [style=invis]\n';
    }
  }

  dot += '}\n';
  return dot;
}
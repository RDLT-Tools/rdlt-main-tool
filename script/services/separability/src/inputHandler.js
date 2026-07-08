// inputHandler.js
import { createVertex, createArc, createRDLT, normalizeToLiterature } from './rdltModel.js';

export function readRDLTFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseRDLT(String(e.target.result));
        const normalized = normalizeToLiterature(parsed);
        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function parseRDLT(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const vertices = [];
  const arcs = [];
  let mode = null;

  for (let raw of lines) {
    if (!raw) continue;
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (upper === 'VERTICES') { mode = 'V'; continue; }
    if (upper === 'ARCS') { mode = 'A'; continue; }
    if (/^vertex\s+/i.test(line) || /^arc\s+/i.test(line)) {
      return parseLegacyFormat(text);
    }

    if (mode === 'V') {
      const parts = line.split(/\s+/);
      if (parts.length < 4) throw new Error(`Invalid VERTICES line: "${line}"`);
      const [vuid, id, type, M] = parts;
      vertices.push(createVertex(vuid, id, type, Number(M)));
    } else if (mode === 'A') {
      const parts = line.split(/\s+/);
      if (parts.length < 6) throw new Error(`Invalid ARCS line: "${line}"`);
      const [auid, fromTo, C, L, In, Out] = parts;
      const m = fromTo.split('-');
      if (m.length !== 2) throw new Error(`Invalid arc endpoint "${fromTo}"`);
      const [from, to] = m;
      arcs.push(createArc(auid, from, to, C, Number(L), Number(In), Number(Out)));
    } else {
      if (/^[A-Za-z0-9_]+ [A-Za-z0-9_]+ [becBEC] [01]$/.test(line)) {
        mode = 'V';
        const [vuid, id, type, M] = line.split(/\s+/);
        vertices.push(createVertex(vuid, id, type, Number(M)));
      } else if (/^[A-Za-z0-9_]+ [A-Za-z0-9_]+-[A-Za-z0-9_]+ \d+ \d+ [01] [01]$/.test(line)) {
        mode = 'A';
        const [auid, fromTo, C, L, In, Out] = line.split(/\s+/);
        const [from, to] = fromTo.split('-');
        arcs.push(createArc(auid, from, to, C, Number(L), Number(In), Number(Out)));
      } else {
        throw new Error(`Unable to parse line: "${line}"`);
      }
    }
  }

  const hasRBS = vertices.some(v => Number(v.M) === 1);
  return createRDLT(vertices, arcs, hasRBS);
}

function parseLegacyFormat(text) {
  const rows = text.split(/\r?\n/);
  const vertices = [];
  const arcs = [];
  let hasRBS = false;
  for (let raw of rows) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'vertex') {
      const [, id, label = '', type = 'control'] = parts;
      vertices.push(createVertex(id, label, type, 0));
    } else if (parts[0] === 'arc') {
      const [, id, from, to, l = '0'] = parts;
      arcs.push(createArc(id, from, to, 0, Number(l), 0, 0));
    } else if (line.startsWith('RBS')) {
      hasRBS = true;
    }
  }
  return createRDLT(vertices, arcs, hasRBS);
}

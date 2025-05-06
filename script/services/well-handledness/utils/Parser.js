// import { plot } from "./Plot.js";
import { findCycles } from "../src/Cycles.js";
import { R as RDLT } from "../classes/RClass.js";
import { Arc } from "../classes/Arc.js";
import { Vertex } from "../classes/Vertex.js";

function parseRdltInput(jsonData, name) {
  const R = new RDLT(name);
  let idx = 0;

  const cAttributes = new Map();
  const lAttributes = new Map();

  // Parse center nodes
  if (jsonData.CENTER) {
    jsonData.CENTER.forEach((center) => {
      let centerVertex = [...R.vertices].find((v) => v.name === center);
      if (!centerVertex) {
        centerVertex = new Vertex(center);
      }
      centerVertex.m_value = 1;
      R.centers.add(centerVertex);
    });
  }

  // Parse in-bridges
  if (jsonData.IN) {
    jsonData.IN.forEach((inBridge) => {
      const [start, end] = inBridge;
      const inBridgeArc = R.arcs.find(
        (arc) => arc.start.name === start && arc.end.name === end
      );
      if (inBridgeArc) {
        R.in_bridges.push(inBridgeArc);
      }
    });
  }

  // Parse out-bridges
  if (jsonData.OUT) {
    jsonData.OUT.forEach((outBridge) => {
      const [start, end] = outBridge;
      const outBridgeArc = R.arcs.find(
        (arc) => arc.start.name === start && arc.end.name === end
      );
      if (outBridgeArc) {
        R.out_bridges.push(outBridgeArc);
      }
    });
  }

  // Parse arcs and attributes
  if (jsonData.ARCS) {
    jsonData.ARCS.forEach((arcData) => {
      const [x, y, cAttr, lAttr] = arcData;
      let vertexX = [...R.vertices].find((v) => v.name === x) || new Vertex(x);
      let vertexY = [...R.vertices].find((v) => v.name === y) || new Vertex(y);

      vertexX.outgoing.push(vertexY);
      vertexY.incoming.push(vertexX);
      R.vertices.add(vertexX);
      R.vertices.add(vertexY);

      const newArc = new Arc(
        idx,
        `(${vertexX.name},${vertexY.name})`,
        vertexX,
        vertexY,
        cAttr,
        parseInt(lAttr)
      );
      R.arcs.push(newArc);
      idx++;

      cAttributes.set(newArc, cAttr);
      lAttributes.set(newArc, lAttr);
      // cAttributes[newArc] = cAttr;
      // lAttributes[newArc] = lAttr;
    });
  }

  // Set attributes in R instance
  R.setAttributes(cAttributes, lAttributes);

  // Optional: Process cycles and escape arcs
  // R.findCycles();
  // R.setCriticalEscapeArcs();
  // R.setERU(R.arcs, R.l_attr);

  // Plot arcs
  // plot(R.arcs.map(arc => [arc.start, arc.end]));

  return R;
}

export { parseRdltInput };

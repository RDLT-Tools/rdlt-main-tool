import { findCycles } from "../src/Cycles.js";
import { Cycle } from "./Cycle.js";
import { Vertex } from "./Vertex.js";
import { Arc } from "./Arc.js";

class R {
  constructor(name) {
    this.name = name;
    this.arcs = [];
    this.vertices = new Set();
    this.c_attr = new Map();
    this.l_attr = new Map();
    this.centers = new Set();
    this.in_bridges = [];
    this.out_bridges = [];
    this.cycle_list = [];
    this.eRU = new Map();
    this.abstract_arcs = new Map();
    this.RU = new Map();
    this.split_points = new Set();
    this.join_points = new Set();
    this.is_balanced = false;
    this.oopVertices = new Set();
  }

  getName() {
    return this.name;
  }

  getVertices() {
    return this.vertices;
  }

  getArc(start, end) {
    return (
      this.arcs.find((arc) => arc.start === start && arc.end === end) || null
    );
  }

  getArcs(start, end) {
    return this.arcs.filter((arc) => arc.start === start && arc.end === end);
  }

  getCAttr() {
    return this.c_attr;
  }

  getLAttr() {
    return this.l_attr;
  }

  getArcLAttr(arc) {
    return this.l_attr.get(arc);
  }

  getCycleList() {
    return this.cycle_list;
  }

  getEru() {
    return this.eRU;
  }

  getArcEru(arc) {
    return this.eRU.get(arc);
  }

  getAbstractArcs() {
    return this.abstract_arcs;
  }

  _getOrCreateVertex(name) {
    for (let vertex of this.oopVertices) {
      if (vertex.name === name) {
        return vertex;
      }
    }
    let newVertex = new Vertex(name);
    this.oopVertices.add(newVertex);
    return newVertex;
  }

  addElements(arcs) {
    this.arcs.push(...arcs);
  }

  setAttributes(c_attr, l_attr) {
    this.arcs.forEach((arc) => {
      // this.c_attr.set(arc, c_attr[arc]);
      // this.l_attr.set(arc, l_attr[arc]);
      this.c_attr.set(arc, c_attr.get(arc) || 0);
      this.l_attr.set(arc, l_attr.get(arc) || 1);
      // this.l_attr.set(arc, l_attr[arc]);
    });
  }

  findCycles() {
    let cycles = findCycles(this.arcs, this.name);
    cycles.forEach((item, i) => {
      let cycle = new Cycle(item, `${this.name}${i}`, this.l_attr);
      this.cycle_list.push(cycle);
    });
  }

  addCAttr(key, c_attr) {
    let arc =
      this.arcs.find((arc) => arc.start === key[0] && arc.end === key[1]) ||
      [...this.abstract_arcs.keys()].find(
        (arc) => arc.start === key[0] && arc.end === key[1]
      );
    if (arc) this.c_attr.set(arc, c_attr);
  }

  addLAttr(key, l_attr) {
    let arc =
      this.arcs.find((arc) => arc.start === key[0] && arc.end === key[1]) ||
      [...this.abstract_arcs.keys()].find(
        (arc) => arc.start === key[0] && arc.end === key[1]
      );
    if (arc) this.l_attr.set(arc, l_attr);
  }

  addAbstractArc(abstract_arc, RDLT) {
    let key;
    if (this.abstract_arcs.size > 0) {
      key = new Arc(
        [...this.abstract_arcs.keys()].pop().id + 1,
        `${abstract_arc[0]}, ${abstract_arc[abstract_arc.length - 1]}`,
        abstract_arc[0],
        abstract_arc[abstract_arc.length - 1],
        "0",
        1
      );
    } else {
      key = new Arc(
        RDLT.arcs.length,
        `${abstract_arc[0]}, ${abstract_arc[abstract_arc.length - 1]}`,
        abstract_arc[0],
        abstract_arc[abstract_arc.length - 1],
        "0",
        1
      );
    }

    if (!this.abstract_arcs.has(key)) {
      this.abstract_arcs.set(key, [abstract_arc]);
    } else {
      this.abstract_arcs.get(key).push(abstract_arc);
    }

    this.arcs.push(key);

    if (RDLT.c_attr.hasOwnProperty(key)) {
      this.addCAttr([key.start, key.end], RDLT.c_attr[key]);
      this.addLAttr([key.start, key.end], RDLT.l_attr[key]);
    } else {
      this.addCAttr([key.start, key.end], "0");
      this.addLAttr([key.start, key.end], 1);
    }
  }

  setRU(arc, RU) {
    this.RU.set(arc, RU);
  }

  setERU(arc, erU) {
    this.eRU.set(arc, erU);
  }

  addVertex(vertex) {
    this.vertices.add(vertex);
  }

  addArc(arc) {
    this.arcs.push(arc);
  }
}

export { R };

export class Cycle {
  constructor(vertices, name, RDLT_l_attr) {
    this.vertices = vertices;
    const arcArray = Array.from(RDLT_l_attr.keys()); // Extract keys (arc instances)

    this.arcs = this.vertices.map(
      (v, i) =>
        arcArray.find(
          (arc) =>
            arc._start === v &&
            arc._end === this.vertices[(i + 1) % this.vertices.length]
        ) || null
    );

    this.l_attr = new Map(
      this.arcs.map((arc) => [arc, RDLT_l_attr.get(arc) ?? Infinity])
    );

    this.name = name;
    const [criticalArcs, escapeArcs] = this.getCriticalEscapeArcs(RDLT_l_attr);
    this.criticalArcs = criticalArcs;
    this.escapeArcs = escapeArcs;
    this.nonCriticalArcs = [];
    this.pcas = [];
    this.peas = [];
  }

  isInRBS(arc, R2) {
    return R2.arcs.includes(arc);
  }

  computePCAsAndPEAs(R1, RBS) {
    const nonRbsArcs = this.arcs.filter((arc) => !this.isInRBS(arc, RBS));
    if (nonRbsArcs.length === 0) return [];

    const minLValue = Math.min(
      ...nonRbsArcs.map((arc) => this.l_attr.get(arc) || Infinity)
    );

    this.pcas = nonRbsArcs.filter(
      (arc) =>
        !R1.abstract_arcs.has(arc) && // Use `.has()` instead of `.includes()`
        (this.l_attr.get(arc) || Infinity) === minLValue // Ensure correct lookup from Map
    );

    this.peas = R1.arcs.filter(
      (arc) =>
        !R1.abstract_arcs.has(arc) &&
        !this.pcas.includes(arc) &&
        this.pcas.some((pca) => pca.start === arc.start)
    );

    console.info(
      `PCAs for cycle ${this.name}:`,
      this.pcas.map((pca) => pca.name)
    );
    console.info(
      `PEAs for cycle ${this.name}:`,
      this.peas.map((pea) => pea.name)
    );
  }

  getArcs() {
    return this.arcs;
  }

  getName() {
    return this.name;
  }

  getCriticalArcs() {
    return this.criticalArcs;
  }

  getEscapeArcs() {
    return this.escapeArcs;
  }

  getNonCriticalArcs() {
    return this.nonCriticalArcs;
  }

  // getCriticalEscapeArcs(L) {
  //   const arcs = new Set(Object.keys(L)); // Set of all arcs in the graph

  //   let criticalArcs = [];
  //   let escapeArcs = [];

  //   // Find the critical arc (minimum L value in the cycle)
  //   const criticalArc = this.arcs.reduce((minArc, arc) =>
  //     (L[arc] || Infinity) < (L[minArc] || Infinity) ? arc : minArc
  //   );

  //   criticalArcs.push(criticalArc);

  //   // Find escape arcs
  //   const litC = new Set(this.arcs.map((arc) => arc.start)); // Vertices in the cycle

  //   for (let arc of criticalArcs) {
  //     const { start: u, end: v } = arc;
  //     for (let potentialEscape of arcs) {
  //       if (potentialEscape.start === u && !litC.has(potentialEscape.end)) {
  //         escapeArcs.push(potentialEscape);
  //       }
  //     }
  //   }

  //   return { criticalArcs, escapeArcs };
  // }

  getCriticalEscapeArcs(L) {
    // Convert Map keys to Set while preserving object references
    const arcs = new Set(L.keys());
    const criticalArcs = [];
    const escapeArcs = [];

    // 1. Find critical arc with minimum L value
    if (this.arcs.size === 0) {
      return [criticalArcs, escapeArcs];
    }

    // Convert Set to Array for iteration
    const arcsArray = Array.from(this.arcs);

    // // Find minimum L value arc using reduce
    // const criticalArc = arcsArray.reduce((minArc, currentArc) => {
    //   const currentValue = currentArc.l_attr ?? Infinity;
    //   const minValue = minArc ? minArc.l_attr ?? Infinity : Infinity;
    //   return currentValue < minValue ? currentArc : minArc;
    // }, null);

    // Assume `arcs` is an array and `L` is a Map or plain object

    // Find the minimum L value among arcs
    // let minLValue = Infinity;
    // for (const arc of arcs) {
    //   const value = L[arc] !== undefined ? L[arc] : Infinity;
    //   if (value < minLValue) {
    //     minLValue = value;
    //   }
    // }
    const minLValue = Math.min(
      ...arcsArray.map((arc) => L.get(arc) || Infinity)
    );

    // Collect arcs with the minimum L value
    const criticalArc = arcsArray.filter((arc) => {
      const value = L.get(arc) !== undefined ? L.get(arc) : Infinity;
      return value === minLValue;
    });

    if (criticalArc) {
      criticalArcs.push(...criticalArc);
    }

    // 2. Create Set of start vertices (lit_c)
    const litC = new Set();
    this.arcs.forEach((arc) => {
      if (arc && arc._start) {
        // Match your structure's _start property
        litC.add(arc._start);
      }
    });

    // 3. Find escape arcs
    criticalArcs.forEach((arc) => {
      if (!arc || !arc._start) return; // Null check for arc properties

      const u = arc._start; // Using _start from your structure
      arcs.forEach((potentialEscape) => {
        if (
          potentialEscape &&
          potentialEscape._start === u &&
          !litC.has(potentialEscape._end)
        ) {
          // Match _end property
          escapeArcs.push(potentialEscape);
        }
      });
    });

    return [criticalArcs, escapeArcs];
  }
}

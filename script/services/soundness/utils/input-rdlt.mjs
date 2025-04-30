/**
 * InputRDLT module for processing RDLT models and generating hierarchical RDLT structures
 * with expanded vertex simplification (Level-1 and Level-2). Adapted from input_rdlt.py.
 * @module InputRDLT
 */

/**
 * Represents the Input_RDLT logic in JavaScript.
 */
export class InputRDLT {
  /**
   * @typedef Vertex
   * @property {string|number} uid - Unique identifier of the vertex
   * @property {string} identifier - Human-readable identifier
   * @property {boolean} isRBSCenter - Whether this vertex is a center of an RBS
   * @property {'b'|'e'|'c'} type - Type: 'b' boundary, 'e' entity, 'c' controller
   */

  /**
   * @typedef Arc
   * @property {string|number} uid - Unique identifier for the arc
   * @property {string|number} fromVertexUID - UID of source vertex
   * @property {string|number} toVertexUID - UID of target vertex
   * @property {string} C - Constraint label (empty string if none)
   * @property {number} L - Maximum traversals allowed
   */

  /**
   * @param {{components: Vertex[], arcs: Arc[]}} model - The RDLT model data
   * @param {Set<Vertex>} inVertices - Set of vertices marking incoming 
   *                                    arcs to each RBS
   * @param {Set<Vertex>} outVertices - Set of vertices marking outgoing 
   *                                     arcs from each RBS
   */
  constructor(model, inVertices, outVertices) {
    this.model = model;

    // Convert Sets to arrays
    this.in_list = Array.from(inVertices);
    this.out_list = Array.from(outVertices);

    this.centersList = model.components.filter(v => v.isRBSCenter);
    this.user_input_to_evsa = [];
  }

  /**
   * Evaluates the RDLT model and returns both R1 and Rs in the same processed format.
   * @returns {{R1: Object[], Rs: Object[]}}
   */
  evaluate() {
      // Build raw R2, R3, … components once per center
      const rawByCenter = this.centersList.map((center, i) => {
          const key     = `R${i + 2}-${center.identifier}`;
          const rdlt    = this._extractRDLT(center, key);
          const arcsRaw = rdlt[key] || [];
          return { key, arcsRaw };
      });

      // Final-transform R₂,R₃… for EVSA (maps to r-id, arc, c-attribute, l-attribute, eRU)
      const Rs = rawByCenter.map(({ key, arcsRaw }) => {
          const rawObj = { [key]: arcsRaw };
          return this._finalTransform(rawObj);
      });

      // Compute R1 as all arcs minus those used in any R₂…Rₙ
      const level2UIDs = new Set(
          rawByCenter.flatMap(({ arcsRaw }) => arcsRaw.map(a => a.uid))
      );
      const R1raw = { R1: this.model.arcs.filter(a => !level2UIDs.has(a.uid)) };
      const R1 = this._finalTransform(R1raw);

      return { R1, Rs };
  }

  /**
   * @private
   * Extracts and processes RDLT data for each center, excluding IN/OUT arcs.
   * @param {Vertex} center - The RBS center vertex
   * @param {string}   key    - The RDLT key name (e.g. "R2-x4")
   * @returns {Object} Processed RDLT component under the provided key
   */
  _extractRDLT(center, key) {
      const related = this.model.arcs.filter(a =>
          a.fromVertexUID === center.uid || a.toVertexUID === center.uid
      );
      const filtered = related.filter(a => !(
          this.in_list.includes(`${this._getId(a.fromVertexUID)}, ${this._getId(a.toVertexUID)}`) ||
          this.out_list.includes(`${this._getId(a.fromVertexUID)}, ${this._getId(a.toVertexUID)}`)
      ));
      const vs = new Set();
      filtered.forEach(a => {
          vs.add(a.fromVertexUID);
          vs.add(a.toVertexUID);
      });
      const finalArcs = this.model.arcs.filter(a =>
          vs.has(a.fromVertexUID) && vs.has(a.toVertexUID)
      );
      return { [key]: finalArcs };
  }

  /**
   * Final transformation: enriches each Rn component with r-id, arc string,
   * c-attribute, l-attribute, and initial eRU value.
   * @private
   * @param {Object} rdlt - Raw RDLT component { key: Arc[] }
   * @returns {Object} Transformed RDLT component
   */
  _finalTransform(rdlt) {
      const key  = Object.keys(rdlt)[0];
      const arcs = rdlt[key];
      return {
          [key]: arcs.map(a => ({
              'r-id':           `${key}-${a.uid}`,
              arc:              `${this._getId(a.fromVertexUID)}, ${this._getId(a.toVertexUID)}`,
              'c-attribute':    a.C,
              'l-attribute':    a.L,
              eRU:              0
          }))
      };
  }

  /**
   * Lookup helper: returns the identifier of a vertex given its UID
   * @private
   * @param {string|number} uid - Vertex UID
   * @returns {string} Human-readable identifier
   */
  _getId(uid) {
      const v = this.model.components.find(v => v.uid === uid);
      return v ? v.identifier : String(uid);
  }
}

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
      this.model    = model;
      this._inUIDs  = new Set([...inVertices].map(v => v.uid));
      this._outUIDs = new Set([...outVertices].map(v => v.uid));
      this.centersList = model.components.filter(v => v.isRBSCenter);
      this.user_input_to_evsa = [];
    }
  
    evaluate() {
        // Step 1: Build the raw R2, R3, … *once*
        const rawByCenter = this.centersList.map((center, i) => {
          const key = `R${i + 2}-${center.identifier}`;  // Fixed template literal
          const rdlt    = this._extractRDLT(center, key);
          const arcsRaw = rdlt[key] || [];
          return { key, arcsRaw };
        });
      
        // Step 2: Build Level-2 = exactly those raw arc lists
        const level2Map = {};
        rawByCenter.forEach(({ key, arcsRaw }) => {
          level2Map[key] = arcsRaw;
        });
      
        // Step 3: Build R1 = all arcs minus the union of R2…Rₙ
        const level2UIDs = new Set();
        Object.values(level2Map).forEach(arr =>
          arr.forEach(a => level2UIDs.add(a.uid))
        );
        const R1 = {
          R1: this.model.arcs.filter(a => !level2UIDs.has(a.uid))
        };
      
        // Step 4: Final-transform the R₂,R₃… for EVSA
        const Rs = rawByCenter.map(({ key, arcsRaw }) => {
          const rawObj = { [key]: arcsRaw };
          return this._finalTransform(rawObj);
        });
      
        return { R1, Rs };
    }
  
    /**
     * @private
     * @param {Vertex} center
     * @param {string}   key    the exact R-name you want, e.g. "R2-x4"
     */
    _extractRDLT(center, key) {
      // 1) grab all arcs touching this center
      const related = this.model.arcs.filter(a =>
        a.fromVertexUID === center.uid || a.toVertexUID === center.uid
      );
  
      // 2) exclude IN/out arcs by their arc-UID
      const filtered = related.filter(a => !(
        this._inUIDs.has(a.uid) ||
        this._outUIDs.has(a.uid)
      ));
  
      // 3) collect the set of vertices that remain
      const vs = new Set();
      filtered.forEach(a => {
        vs.add(a.fromVertexUID);
        vs.add(a.toVertexUID);
      });
  
      // 4) now pull back *all* arcs between those vertices
      const finalArcs = this.model.arcs.filter(a =>
        vs.has(a.fromVertexUID) && vs.has(a.toVertexUID)
      );
  
      // return under exactly the same key we generated in evaluate()
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
          'r-id':           `${key}-${a.uid}`,      // Fixed template literal
          arc:              `${this._getId(a.fromVertexUID)}, ${this._getId(a.toVertexUID)}`,  // Fixed template literal
          'c-attribute':    a.C,
          'l-attribute':    a.L,
          eRU:              0
        }))
      };
    }
  
    /**
     * Lookup helper: returns the identifier of a vertex given its UID
     * @private
     * @param {string|number} uid
     * @returns {string}
     */
    _getId(uid) {
      const v = this.model.components.find(v => v.uid === uid);
      return v ? v.identifier : String(uid);
    }
}

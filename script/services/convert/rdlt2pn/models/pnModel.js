export class PNModel {
  constructor() {
    // Dictionary of places and transitions keyed by their id.
    this.places = {};
    this.transitions = {};
    // Array of arcs.
    this.arcs = [];
    this.vertexLabelMap = {}; // will hold rdlt vertex id → rdlt vertex label
    this.constraintMap = {};     // will hold original → short
    this.__nextConstraintId = 0;  // private counter
  }

  // Add a place to the Petri Net.
  addPlace(place) {
    this.places[place.id] = {
      ...place,
      incoming: [],
      outgoing: []
    };
  }

  // Add a transition to the Petri Net.
  addTransition(transition) {
    this.transitions[transition.id] = {
      ...transition,
      incoming: [],
      outgoing: []
    };
  }

  // Add an arc connecting a source to a target.
  addArc(arc) {
    this.arcs.push(arc);
    // Attach the arc to the outgoing list of the source and incoming list of the target.
    if (this.places[arc.from]) {
      this.places[arc.from].outgoing.push(arc);
    }
    if (this.transitions[arc.from]) {
      this.transitions[arc.from].outgoing.push(arc);
    }
    if (this.places[arc.to]) {
      this.places[arc.to].incoming.push(arc);
    }
    if (this.transitions[arc.to]) {
      this.transitions[arc.to].incoming.push(arc);
    }
  }

  // Helper function to remove an arc from the model and update incoming/outgoing arrays.
  removeArc(arc) {
    // Remove from the arcs array.
    const index = this.arcs.indexOf(arc);
    if (index !== -1) {
      this.arcs.splice(index, 1);
    }
    // Remove from the source node's outgoing array.
    if (this.places[arc.from]) {
      const idx = this.places[arc.from].outgoing.indexOf(arc);
      if (idx !== -1) this.places[arc.from].outgoing.splice(idx, 1);
    }
    if (this.transitions[arc.from]) {
      const idx = this.transitions[arc.from].outgoing.indexOf(arc);
      if (idx !== -1) this.transitions[arc.from].outgoing.splice(idx, 1);
    }
    // Remove from the target node's incoming array.
    if (this.places[arc.to]) {
      const idx = this.places[arc.to].incoming.indexOf(arc);
      if (idx !== -1) this.places[arc.to].incoming.splice(idx, 1);
    }
    if (this.transitions[arc.to]) {
      const idx = this.transitions[arc.to].incoming.indexOf(arc);
      if (idx !== -1) this.transitions[arc.to].incoming.splice(idx, 1);
    }
  }

  // Retrieve a place by id.
  getPlace(id) {
    return this.places[id];
  }

  // Retrieve a transition by id.
  getTransition(id) {
    return this.transitions[id];
  }

  // Returns the JSON representation of the PNModel.
  toJSON() {
    return {
      places: Object.values(this.places),
      transitions: Object.values(this.transitions),
      arcs: this.arcs
    };
  }

  // Static method: Create a PNModel from a JSON representation.
  static fromJSON(json) {
    const model = new PNModel();
    if (json.places && Array.isArray(json.places)) {
      json.places.forEach(p => {
        model.addPlace(p);
      });
    }
    if (json.transitions && Array.isArray(json.transitions)) {
      json.transitions.forEach(t => {
        model.addTransition(t);
      });
    }
    if (json.arcs && Array.isArray(json.arcs)) {
      json.arcs.forEach(a => {
        model.addArc(a);
      });
    }
    return model;
  }

  nextShort() {
    // cycle through A…Z, then A1…Z1, etc.
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let n = this.__nextConstraintId++;
    const prefix = letters[n % letters.length];
    const suffix = Math.floor(n / letters.length) || "";
    return prefix + suffix;
  }

  // private helper to pull the set of all already‑used short names
  _usedShorts() {
    return new Set(Object.values(this.constraintMap));
  }

  // private: try to find an unused lowercase letter a..z
  _nextUnusedLetter() {
    const used = this._usedShorts();
    // ASCII 97 = 'a'
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(97 + i); // now 'a','b',…,'z'
      if (!used.has(letter)) return letter;
    }
    return null;
  }

  // private: once a..z are gone, generate a1,b1,…,z1,a2… etc
  _nextFallback() {
    const used = this._usedShorts();
    // switch to lowercase letters here:
    const letters = "abcdefghijklmnopqrstuvwxyz";
    while (true) {
      const idx = this.__nextCounter++;
      const letter = letters[idx % 26];
      const suffix = Math.floor(idx / 26);
      const candidate = suffix === 0
        ? letter
        : letter + suffix;
      if (!used.has(candidate)) return candidate;
    }
  }

  getShortConstraint(orig) {
    if (this.constraintMap[orig]) return this.constraintMap[orig];

    const used = this._usedShorts();
    let short;

    // if orig is single‐letter, use it lowercased (if still free)
    if (/^[A-Za-z]$/.test(orig)) {
      const candidate = orig.toLowerCase();
      if (!used.has(candidate)) {
        short = candidate;
      }
    }

    // otherwise or if that letter was already taken
    if (!short) {
      short = this._nextUnusedLetter() || this._nextFallback();
    }

    this.constraintMap[orig] = short;
    return short;
  }

  /**
   * Apply a marking/enabled/fired update in one go.
   * `state` should be an object with
   *   – marking:  { [placeId]: number, … }
   *   – enabledTransitions:  string[]   // list of transition IDs
   *   – firedTransitions:    string[]   // list of transition IDs
   */
  updateState(state) {
    // on first update, snapshot all old values
    if (!this._snapshot) {
      this._snapshot = {
        tokens:   {},    // placeId → original tokens
        enabled:  {},    // transId → original enabled value (or undefined)
        fired:    []     // index → original fired value (or undefined)
      };
      // snapshot places.tokens
      for (const pid in this.places) {
        this._snapshot.tokens[pid] = this.places[pid].tokens;
      }
      // snapshot transitions.enabled
      for (const tid in this.transitions) {
        this._snapshot.enabled[tid] = this.transitions[tid].enabled;
      }
      // snapshot arcs.fired (by array index)
      this.arcs.forEach((arc, idx) => {
        this._snapshot.fired[idx] = arc.fired;
      });
    }

    const { marking = {}, enabledTransitions = [], firedTransitions = [] } = state;

    // 1) update places.tokens
    for (const pid in this.places) {
      if (marking.hasOwnProperty(pid)) {
        this.places[pid].tokens = marking[pid];
      }
    }

    // 2) update transitions.enabled
    for (const tid in this.transitions) {
      this.transitions[tid].enabled = enabledTransitions.includes(tid);
    }

    // 3) update arcs.fired
    this.arcs.forEach(arc => {
      // an arc is “fired” if it’s connected to any fired transition
      arc.fired = firedTransitions.includes(arc.from) ||
                  firedTransitions.includes(arc.to);
    });
  }

  /**
   * Revert the last updateState: restore all tokens, enabled, and fired
   * back to their pre-update values.  Keeps the .tokens property but
   * resets it to the original value; removes/reshapes .enabled and .fired
   * exactly as they were.
   */
  revertState() {
    if (!this._snapshot) return;

    // 1) restore tokens
    for (const pid in this.places) {
      if (this._snapshot.tokens.hasOwnProperty(pid)) {
        this.places[pid].tokens = this._snapshot.tokens[pid];
      }
    }

    // 2) restore transitions.enabled
    for (const tid in this.transitions) {
      const orig = this._snapshot.enabled[tid];
      if (orig === undefined) {
        delete this.transitions[tid].enabled;
      } else {
        this.transitions[tid].enabled = orig;
      }
    }

    // 3) restore arcs.fired
    this.arcs.forEach((arc, idx) => {
      const orig = this._snapshot.fired[idx];
      if (orig === undefined) {
        delete arc.fired;
      } else {
        arc.fired = orig;
      }
    });

    // drop the snapshot so you can update again fresh
    delete this._snapshot;
  }
  

  
  // Insert a new node (newNodeId) on a single arc (first matching arc)
  // that goes from sourceId to targetId.
  insertNodeOnArc(sourceId, targetId, newNodeId) {
    // Find the first arc that goes from sourceId to targetId.
    const arcIndex = this.arcs.findIndex(arc => arc.from === sourceId && arc.to === targetId);
    if (arcIndex === -1) {
      console.error(`Arc from ${sourceId} to ${targetId} not found.`);
      return;
    }
    const arcToRemove = this.arcs[arcIndex];
    this.removeArc(arcToRemove);

    // Create new arcs: source -> new node, new node -> target.
    this.addArc({ from: sourceId, to: newNodeId, type: "normal" });
    this.addArc({ from: newNodeId, to: targetId, type: "normal" });
  }

  // Insert a node (newNodeId) on all outgoing arcs from sourceId.
  // This method removes all arcs with source === sourceId,
  // adds an arc from sourceId to newNodeId,
  // then reattaches each removed arc from newNodeId to its original target.
  insertNodeOnOutgoingArcs(sourceId, newNodeId) {
    // Get all outgoing arcs from sourceId.
    const outgoingArcs = this.arcs.filter(arc => arc.from === sourceId);
    // Remove these arcs from the model.
    for (const arc of outgoingArcs) {
      this.removeArc(arc);
    }
    // Create an arc from sourceId to newNodeId.
    this.addArc({ from: sourceId, to: newNodeId, type: "normal" });
    // For every removed outgoing arc, reattach it from newNodeId.
    for (const arc of outgoingArcs) {
      this.addArc({ from: newNodeId, to: arc.to, type: arc.type });
    }
  }

  // Insert a node (newNodeId) on all incoming arcs to a given target.
  // This method removes all arcs with to === targetId,
  // adds an arc from newNodeId to targetId,
  // then reattaches each removed arc from its original source to newNodeId.
  // The optional parameter `constraint` filters arcs with the same constraint value.
  insertNodeOnIncomingArcs(targetId, newNodeId, onlySigmaArcs = false, incomingEpsilonEdges=[]) {
    // Get all incoming arcs to targetId, optionally filtered by the constraint.
    let incomingArcs = this.arcs.filter(arc => arc.to === targetId);
    if (onlySigmaArcs) {
      // build a set of names to exclude
      const excludeFroms = new Set(
        incomingEpsilonEdges.map(eps => `T${eps.from}`)
      );
      incomingArcs = incomingArcs.filter(arc => !excludeFroms.has(arc.from));
    }
    // Remove these arcs from the model.
    for (const arc of incomingArcs) {
        this.removeArc(arc);
    }
    // Create an arc from newNodeId to targetId.
    this.addArc({ from: newNodeId, to: targetId, type: "normal" });
    // Reattach every removed arc: source now goes to newNodeId.
    for (const arc of incomingArcs) {
        this.addArc({ from: arc.from, to: newNodeId, type: arc.type, C: arc.C });
    }
  }

}

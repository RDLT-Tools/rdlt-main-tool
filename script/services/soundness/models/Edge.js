import { Vertex } from './Vertex.js';

/**
 * Represents an edge in the diagram.
 */
export class Edge {
  /**
   * @param {number} id - A unique numeric identifier for this Edge.
   * @param {Vertex} from - The starting Vertex of this edge.
   * @param {Vertex} to - The ending Vertex of this edge.
   * @param {string} constraint - The constraint/condition for traversal (if any).
   * @param {number} maxTraversals - Max allowed traversals for this edge.
   */
  constructor(
    id,
    from,
    to,
    constraint = '',
    maxTraversals = 0
  ) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.constraint = constraint;
    this.maxTraversals = maxTraversals;

    // Initialize traversalTimes as a fixed-length array with null values
    this.traversalTimes = Array(maxTraversals).fill(0);
    this.CTI = Array(maxTraversals).fill(0); // Indicator vector to flag whether checked or traversed
  }

  /**
   * Records a traversal time ( T(x,y) ), respecting maxTraversals.
   * @param {number} time
   */
  recordCheckTime(time) {
    // Find the first available zero slot in the traversalTimes array
    const index = this.traversalTimes.findIndex(time => time === 0);

    if (index !== -1) {
      this.traversalTimes[index] = time; // Record the check time
      this.CTI[index] = 1; // Mark as checked
    } else {
      throw new Error(`Edge ${this.id} exceeded max traversals.`);
    }

    console.log(`Edge (${this.from.id}, ${this.to.id}) checked`, this.traversalTimes, this.CTI); // Debug: Record check time
  }

  /**
   * Checks if this edge has been checked or traversed.
   */
  isCheckedTraversed(){
    console.log(`CTI: `, this.CTI); // Debug: CTI state
    return this.CTI.includes(1) || this.CTI.includes(2); // Check if any slot in CTI is marked as checked
  }

  finalizeTraversalTime(time, criteria) {
    let index; // The slot in the arrays that will be updated

    if (criteria == 1) {
      // Find the last check time and update it
      index = this.CTI.lastIndexOf(1);
      if (index !== -1) {
        // Check for the first condition: CTI[j-1] = 1 and CTI[j-2] = 2
        if (index > 1 && this.CTI[index - 1] === 1 && this.CTI[index - 2] === 2) {
            this.traversalTimes[index] = time; // Update the traversal time
            this.CTI[index] = 2; // Mark as traversed
        }
        // Check for the second condition: CTI[0] = 1
        else if (this.CTI[0] === 1) {
          this.traversalTimes[0] = time; // Update the traversal time at index 0
          this.CTI[0] = 2; // Mark as traversed
        }
      }
    } else if (criteria == 2) {
      // Check for the first condition: CTI[j-1] = 1 and CTI[j-2] = 2
      if (index > 1 && this.CTI[index - 1] === 1 && this.CTI[index - 2] === 2) {
        this.traversalTimes[index] = time; // Update the traversal time
        this.CTI[index] = 2; // Mark as traversed
      }
      // Check for the second condition: CTI[1] = 1
      else if (this.CTI[1] === 1) {
        this.traversalTimes[1] = time; // Update the traversal time at index 1
        this.CTI[1] = 2; // Mark as traversed
      }
    }

    console.log(`Edge (${this.from.id}, ${this.to.id}) traversed`, this.traversalTimes, this.CTI); // Debug: Record check time
    return index; // This index is used by the DFS to later restore the slot's state if needed.
  }

  getCheckTraversalCount(){
    return this.traversalTimes.filter(time => time !== 0).length;
  }

  /**
   * Checks if the edge can still be explored.
   * @returns {boolean}
   */
  canExplore() {
    // Check if there is any available (0) slot in traversalTimes and if the edge has not been checked before
    return this.traversalTimes.includes(0) && !(this.CTI.includes(1));
  }

  /**
   * Checks if the edge is unconstrained relative to some type alike edges
   * @returns {boolean}
   */
  isUnconstrained(typeAlikeEdges) {
    console.log(`Checking if Edge (${this.from.name}, ${this.to.name}) is unconstrained relative to type-alike edges.`); // Debug: Start

    let criteria = [true, true, true]; // Three criteria for unconstrained arc

    typeAlikeEdges.forEach(edge => {
      console.log(`Comparing with Edge (${edge.from.name}, ${edge.to.name})`); // Debug: Comparison
      console.log(`[EDGE VS EDGE INFORMATION] This constraint: ${this.constraint}, Edge constraint: ${edge.constraint}, Edge check/traversal time: ${edge.getCheckTraversalCount()}`); // 

      if (!(edge.constraint === this.constraint || edge.constraint === "")) {
        criteria[0] = false;
        if (!(edge.getCheckTraversalCount() >= this.getCheckTraversalCount())) {
          criteria[1] = false;
        }
      }

      if (!(this.constraint === "" && edge.constraint !== "" && edge.getCheckTraversalCount() !== 0)) {
        criteria[2] = false;
      }
    });

    const isUnconstrained = criteria.some(value => value === true);
    console.log(`Edge (${this.from.name}, ${this.to.name}) unconstrained status: ${isUnconstrained}, Criteria: ${criteria}`); // Debug: Result
    return isUnconstrained;
  }

  getLatestTraversalTime() {
    // Find the latest non-zero traversal time
    for (let i = this.traversalTimes.length - 1; i >= 0; i--) {
        if (this.traversalTimes[i] !== 0) {
            console.log(`Edge (${this.from.id}, ${this.to.id}) latest traversal time: ${this.traversalTimes[i]}`); // Debug: Latest time
            return this.traversalTimes[i];
        }
    }

    console.log(`Edge (${this.from.name}, ${this.to.name}) has no non-zero traversal times.`); // Debug: No valid time
    return 0; // Default to 0 if no valid traversal time is found
  }

  resetTraversalTime(){
    this.traversalTimes = Array(this.maxTraversals).fill(0);
  }
  
  resetCTI(){
    this.CTI = Array(this.maxTraversals).fill(0);
  }

  /**
   * Converts the edge to a JSON representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      from: this.from.id, // Display the vertex ID
      to: this.to.id, // Display the vertex ID
      constraint: this.constraint,
      maxTraversals: this.maxTraversals,
      traversalTimes: this.traversalTimes
    };
  }
}

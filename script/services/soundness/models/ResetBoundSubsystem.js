import { Vertex } from './Vertex.js';
import { Edge } from './Edge.js';

/**
 * Represents a Reset-Bound Subsystem.
 */
export class ResetBoundSubsystem {
  /**
   * @param {Vertex} center - The central Vertex.
   * @param {Vertex[]} members - The list of Vertices inside this subsystem.
   * @param {Edge[]} inBridges - Edges into the subsystem.
   * @param {Edge[]} outBridges - Edges out of the subsystem.
   * @param {boolean} resetEnabled - Flag indicating if reset is active.
   */
  constructor(center, members = [], inBridges = [], outBridges = [], resetEnabled = false) {
    this.center = center;
    this.members = members;
    this.inBridges = inBridges;
    this.outBridges = outBridges;
    this.resetEnabled = resetEnabled;
  }

  /**
   * Resets the traversal times of all relevant edges in the subsystem.
   */
  resetTraversalTimes() {
    if (!this.resetEnabled) return;
    for (const edge of this.inBridges) {
      edge.traversalTimes = [];
    }
    for (const edge of this.outBridges) {
      edge.traversalTimes = [];
    }
    // Optionally, reset internal edges among this.members if needed.
  }

  /**
   * Checks if two edges are type alike relative to this RBS.
   * @param {Edge} edge1 
   * @param {Edge} edge2 
   */
  isTypeAlike(edge1, edge2){
    // Check if both edges are inbridges or outbridges of the same RBS
    const inbridgeCheck = this.inBridges.includes(edge1) && this.inBridges.includes(edge2);
    const outbridgeCheck = this.outBridges.includes(edge1) && this.outBridges.includes(edge2);
    const nobridgeCheck = !inbridgeCheck && !outbridgeCheck; // Check if both edges are not in or out bridges

    return inbridgeCheck || outbridgeCheck || nobridgeCheck;
  }
}

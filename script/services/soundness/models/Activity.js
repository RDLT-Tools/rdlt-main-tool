import { Edge } from './Edge.js';
import { Vertex } from './Vertex.js';

/**
 * Represents an Activity in the diagram.
 */
export class Activity {
  /**
   * @param {Vertex} source
   * @param {Vertex} target
   */
  constructor(source, target, reachabilityConfigurations = []) {
    this.source = source;
    this.target = target;
    this.steps = []; // Initialize steps as an empty array
    this.reachabilityConfigurations = reachabilityConfigurations; // Initialize reachabilityConfigurations as an empty array
  }

  /**
   * Adds a step (edge) to the activity.
   * @param {Edge} edge
   */
  addStep(edge) {
    this.steps.push(edge);
  }

  /**
   * Adds a reachability configuration to the activity.
   * @param {any} config
   */
  addReachabilityConfiguration(config) {
    this.reachabilityConfigurations.push(config);
  }
}

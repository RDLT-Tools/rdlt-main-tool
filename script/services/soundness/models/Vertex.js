import { VertexType } from './VertexType.js';

/**
 * Represents a vertex in the diagram.
 */
export class Vertex {
  /**
   * @param {string} id - The unique identifier for this Vertex.
   * @param {string} type - One of the values from VertexType.
   * @param {Object|Map<string, string>} attributes - Key-value pairs for vertex attributes.
   */
  constructor(id, type, attributes = {}) {
    this.id = id;
    this.type = type; // Should match one of VertexType.* keys
    // Store attributes in a plain JS object
    this.attributes = (attributes instanceof Map)
      ? Object.fromEntries(attributes)
      : { ...attributes };
  }

  /**
   * Returns the attribute value for a given key.
   * @param {string} key
   * @returns {string|undefined}
   */
  getAttribute(key) {
    return this.attributes[key];
  }

  /**
   * Adds or updates an attribute.
   * @param {string} key
   * @param {string} value
   */
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
}

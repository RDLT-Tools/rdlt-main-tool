import { VertexType } from './VertexType.js';

/**
 * Represents a vertex in the diagram.
 */
export class Vertex {
  /**
   * @param {string} id - The unique identifier for this Vertex.
   * @param {string} type - One of the values from VertexType.
   * @param {Object|Map<string, string>} attributes - Key-value pairs for vertex attributes.
   * @param {string} name - The name of the vertex (not required to be unique).
   */
  constructor(id, type, attributes = {}, name = '') {
    this.id = id;
    this.type = type; // Should match one of VertexType.* keys
    this.name = name; // Name of the vertex (not unique)
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

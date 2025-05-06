class Vertex {
  constructor(name, uID = 0) {
    this._uID = uID;
    this._name = name;
    this._outgoing = [];
    this._incoming = [];
    this._m_value = 0;
    this.is_split = false;
    this.is_join = false;
    this.split_type = null;
    this.join_type = null;
  }
  get uID() {
    return this._uID;
  }

  set uID(value) {
    if (typeof value !== "number") {
      throw new TypeError("uID must be a number");
    }
    this._uID = value;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  get outgoing() {
    return this._outgoing;
  }

  set outgoing(value) {
    if (!Array.isArray(value)) {
      throw new TypeError("outgoing must be an array");
    }
    this._outgoing = value; // or this._outgoing = [...value] for a copy
  }

  get incoming() {
    return this._incoming;
  }

  set incoming(value) {
    if (!Array.isArray(value)) {
      throw new TypeError("incoming must be an array");
    }
    this._incoming = value; // or this._incoming = [...value] for a copy
  }

  get m_value() {
    return this._m_value;
  }

  set m_value(value) {
    if (typeof value !== "number") {
      throw new TypeError("m_value must be a number");
    }
    this._m_value = value;
  }
}

export { Vertex };

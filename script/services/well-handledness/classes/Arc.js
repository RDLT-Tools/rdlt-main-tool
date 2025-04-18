class Arc {
  constructor(id, name, start, end, c_attr, l_attr) {
    this.id = id;
    this._name = name; // Internal naming convention
    this._start = start;
    this._end = end;
    this._c_attr = c_attr;
    this._l_attr = l_attr;
    this._RU = null;
    this._eRU = null;
    this._is_abstract = false;
  }

  // Getters
  get name() {
    return this._name;
  }

  get start() {
    return this._start;
  }

  get end() {
    return this._end;
  }

  get c_attr() {
    return this._c_attr;
  }

  get l_attr() {
    return this._l_attr;
  }

  get RU() {
    return this._RU;
  }

  get eRU() {
    return this._eRU;
  }

  get is_abstract() {
    return this._is_abstract;
  }

  // Setters
  set name(value) {
    this._name = value;
  }

  set start(value) {
    this._start = value;
  }

  set end(value) {
    this._end = value;
  }

  set c_attr(value) {
    this._c_attr = value;
  }

  set l_attr(value) {
    this._l_attr = value;
  }

  set RU(value) {
    this._RU = value;
  }

  set eRU(value) {
    this._eRU = value;
  }

  set is_abstract(value) {
    this._is_abstract = value;
  }

  // Method equivalent to set_eRU
  setERU(eRU) {
    this._eRU = eRU;
    this.l_attr = eRU + 1;
  }

  // String representation for debugging
  toString() {
    return `Arc(${this._start}, ${this._end}, ${this.id})`;
  }

  // Equality check based on start, end, and id
  equals(other) {
    return (
      other instanceof Arc &&
      this._start === other.start &&
      this._end === other.end &&
      this.id === other.id
    );
  }

  // Hash function alternative (JavaScript uses object keys for hashing)
  // getHash() {
  //   return `${this._start}-${this._end}`;
  // }
}

export { Arc };

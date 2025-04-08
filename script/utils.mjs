
export class Form {
    /** @type {HTMLDivElement} */
    #rootElement;

    /** @type {string[]} */
    #fieldNames = null;

    /** @type {{ [fieldName: string]: HTMLInputElement | HTMLSelectElement }} */
    #fieldElements = null;

    /** @type {(fieldName, value) => any}  */
    #listener;

    constructor(rootElement) {
        this.#rootElement = rootElement;
        this.#listener = null;
    }

    /**
     * @param {string[]} fieldNames 
     * @returns {Form}
     */
    setFieldNames(fieldNames) {
        this.#fieldNames = fieldNames;
        this.#loadFields();

        return this;
    }

    #loadFields() {
        if(this.#fieldElements !== null) throw new Error("Field names can only be loaded once.");
        this.#fieldElements = {};

        for(const fieldName of this.#fieldNames) {
            /** @type {HTMLInputElement | HTMLSelectElement} */
            const fieldElement = this.#rootElement.querySelector(`[name='${fieldName}']`);
            if(!fieldElement) continue;

            this.#fieldElements[fieldName] = fieldElement;
            if(fieldElement.tagName === "INPUT") {
                fieldElement.addEventListener("input", () => this.#onFieldChange(fieldName, fieldElement));
            } else if(fieldElement.tagName === "SELECT") {
                fieldElement.addEventListener("change", () => this.#onFieldChange(fieldName, fieldElement));
            }
        }
    }

    #onFieldChange(fieldName, fieldElement) {
        let value = this.getFieldValue(fieldName);
        if(this.#listener) this.#listener(fieldName, value);
    }

    /**
     * 
     * @param {[ fieldName: string ]: any} values 
     */
    setValues(values) {
        for(const fieldName in values) {
            const fieldElement = this.#fieldElements[fieldName];
            if(!fieldElement) continue;

            const value = values[fieldName];

            if(fieldElement.tagName === "INPUT" && fieldElement.type === "checkbox") {
                fieldElement.checked = value;
            } else {
                fieldElement.value = value;
            }
        }

        return this;
    }

    getValues() {
        const values = {};
        for(const fieldName in this.#fieldElements) {
            values[fieldName] = this.getFieldValue(fieldName);
        }

        return values;
    }

    getFieldElement(fieldName) {
        return this.#fieldElements[fieldName] || null;
    }

    getFieldValue(fieldName) {
        const fieldElement = this.#fieldElements[fieldName];
        if(!fieldElement) return null;

        let value = fieldElement.value;
        if(fieldElement.tagName === "INPUT" && fieldElement.type === "checkbox") {
            value = fieldElement.checked;
        }

        return value;
    }

    /**
     * @param {(fieldName, value) => any} listener 
     * @returns {Form}
     */
    setOnChangeListener(listener) {
        this.#listener = listener;

        return this;
    }
}

/**
 * @param {string} tagName 
 * @param {Object} attributes 
 * @param {Node[]} children 
 */
export function buildElement(tagName = "div", attributes = {}, children = []) {
    const element = document.createElement(tagName);
    if(attributes) {
        for(const key in attributes) {
            if(key === "classname") {
                element.classList.add(...attributes["classname"].split(" "));
            } else {
                element.setAttribute(key, attributes[key]);
            }
        }
    }

    if(children) {
        element.append(...children);
    }

    return element;
}

export function pickRandomFromSet(set) {
    const arr = Array.from(set);
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

export function generateUniqueID() {
    const timestamp = Date.now();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomChars = "";
    for (let i = 0; i < 5; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${timestamp}${randomChars}`;
}
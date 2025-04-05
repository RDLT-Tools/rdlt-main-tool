
/**
 * @param {string} path 
 * @returns {Promise<string>}
 */
export async function getRawSVGAsset(path) {
    const response = await fetch(path);
    return await response.text();
}


/**
 * @param {string} tag 
 * @param {Object?} attributes 
 * @returns {SVGElement}
 */
export function makeSVGElement(tag, attributes = {}, children=[]) {
    const ns = "http://www.w3.org/2000/svg";
    const element = document.createElementNS(ns, tag);
    if(tag==="svg") element.setAttribute("xmlns", ns);
    for(const key in attributes) {
        if(key === "className") {
            element.classList.add(...attributes[key].split(" "));
        } else {
            element.setAttribute(key, attributes[key]);
        }
    }

    for(const child of children) {
        element.appendChild(child);
    }

    return element;
}

/**
 * @param {SVGElement[]} children 
 * @param {{ x, y, className }} props 
 * @returns {SVGGElement}
 */
export function makeGroupSVG(children, props = {}) {
    const { x = 0, y = 0, className } = props;

    const ns = "http://www.w3.org/2000/svg";
    const groupSVG = makeSVGElement("g", { transform: `translate(${x}, ${y})` });
    groupSVG.append(...children);

    if(className) groupSVG.classList.add(...className.split(" "));

    return groupSVG;
}

export function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * 
 * @param {{ x: number, y: number }} p1 
 * @param {{ x: number, y: number }} p2 
 * @returns {number}
 */
export function getDistance(p1, p2) {
    return Math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2);
}
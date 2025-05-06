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
export function makeSVGElement(tag, attributes = {}, children = []) {
  const ns = "http://www.w3.org/2000/svg";
  const element = document.createElementNS(ns, tag);
  if (tag === "svg") element.setAttribute("xmlns", ns);
  for (const key in attributes) {
    if (key === "className" || key === "classname") {
      element.classList.add(...attributes[key].split(" "));
    } else {
      element.setAttribute(key, attributes[key]);
    }
  }

  for (const child of children) {
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

  if (className) groupSVG.classList.add(...className.split(" "));

  return groupSVG;
}

export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * @typedef {{ x: number, y: number }} Point
 * @param {Point} p1
 * @param {Point} p2
 * @returns {number}
 */
export function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * @param {number} radius1
 * @param {Point} center1
 * @param {number} radius2
 * @param {Point} center2
 * @returns {[ Point, { x: } ]}
 */
export function getCircleIntersections(radius1, center1, radius2, center2) {
  const d = getDistance(center1, center2);
  const a = (radius1 ** 2 - radius2 ** 2 + d ** 2) / (2 * d);
  const x_2 = center1.x + (a * (center2.x - center1.x)) / d;
  const y_2 = center1.y + (a * (center2.y - center1.y)) / d;
  const h = Math.sqrt(radius1 ** 2 - a ** 2);
  const r_x = (-(center2.y - center1.y) * h) / d;
  const r_y = ((center2.x - center1.x) * h) / d;

  const intersection1 = { x: x_2 + r_x, y: y_2 + r_y };
  const intersection2 = { x: x_2 - r_x, y: y_2 - r_y };

  return intersection1.x < intersection2.x
    ? [intersection1, intersection2]
    : [intersection2, intersection1];
}

import TextSVGBuilder from "./TextSVGBuilder.mjs";
import SVGAssetsRepository from "./SVGAssetsRepository.mjs";
import { getCircleIntersections, getDistance, makeGroupSVG, makeSVGElement, radiansToDegrees } from "./utils.mjs";


export default class ArcSVGBuilder {

    /**
     * @typedef {"model" | "tracing" | "aes" | "vs"} DrawingOrigin
     * @type {DrawingOrigin}
     */
    #origin;

    #element;
    #pathElement;
    #labelElement;
    #labelMaskElement;
    #connectorEndElement;
    #hoverPathElement;
    #triggerPathElement;
    #selectedPathElement;
    #waypointsElement;
    #highlightPathElement;
    #clickableElement;

    #bounds = {
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 }
    };

    /**
     * 
     * @param {DrawingOrigin} origin 
     */
    constructor(origin = "model") {
        this.#origin = origin;
        const arcColor = origin === "tracing" ? "#aaaaaa" : "black";

        
        // const connectorEndDefs = makeSVGElement("defs", {}, [
        //     makeSVGElement("marker", { 
        //         id: "arrow",
        //         markerWidth: "20",
        //         markerHeight: "20",
        //         refX: "5",
        //         refY: "5",
        //         orient: "auto",
        //         markerUnits: "strokeWidth"
        //     }, [ 
        //         // makeSVGElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "black" })
        //         makeSVGElement("polygon", { points: "0 0, 10 3.5, 0 7", fill: "black" })
        //     ])
        // ]);

        this.#pathElement = makeSVGElement("path", {
            d: "",
            stroke: arcColor,
            fill: "none",
            "marker-end": "url(#arrow)",
            "marker-start": "url(#arrow)",
            classname: "arc-path"
        });

        this.#connectorEndElement = makeSVGElement("polygon", {
            points: "",
            fill: arcColor,
            stroke: "none",
            classname: "conn-end"
        });

        const arcElement = makeGroupSVG([
            // connectorEndDefs,
            this.#pathElement,
            this.#connectorEndElement,
        ], { className: "arc-bare diagram" });


        if(["model", "aes", "vs", "poi"].includes(origin)) {
            this.#labelElement = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: 0,
                y: 0,
                fontSize: 16,
                strokeWidth: 3.5
            });

            this.#labelElement.element.classList.add("diagram");
    
            const arcCutoutID = `arc-${Date.now()}-${Math.floor(Math.random()*10000)}-cutout`
            // arcElement.setAttribute("mask", `url(#${arcCutoutID})`);

            this.#labelMaskElement = makeSVGElement("rect", {
                x: 0, y: 0, width: 100, height: 100, 
                rx: 20, ry: 20
            });

            const labelMaskBoundsElement = makeSVGElement("defs", { className: "diagram" }, [
                makeSVGElement("mask", { id: arcCutoutID }, [
                    makeSVGElement("rect", {
                        width: "100%", height: "100%", fill: "white"
                    }),
                    this.#labelMaskElement,
                ])
            ]);

            
            this.#highlightPathElement = this.#pathElement.cloneNode(true);
            this.#highlightPathElement.classList.remove("arc-path");
            this.#highlightPathElement.classList.add("arc-highlight");


            if(origin === "model") {
                this.#triggerPathElement = makeSVGElement("path", {
                    d: "",
                    fill: "none",
                    stroke: "black",
                    "stroke-width": 16,
                    className: "arc-trigger"
                });
    
                const hoverSVG = SVGAssetsRepository.loadArcHoverSVGElement();
                this.#hoverPathElement = hoverSVG.querySelector("path");
                this.#hoverPathElement.classList.add("arc-hover");
    
                const selectedSVG = SVGAssetsRepository.loadArcSelectedSVGElement();
                this.#selectedPathElement = selectedSVG.querySelector("path");
                this.#selectedPathElement.classList.add("arc-selected");
    
                this.#waypointsElement = makeGroupSVG([], { className: "arc-waypoints" });
    
                this.#element = makeGroupSVG([
                    // labelMaskBoundsElement,
                    this.#highlightPathElement,
                    arcElement,
                    this.#triggerPathElement,
                    this.#hoverPathElement,
                    this.#selectedPathElement,
                    this.#labelElement.element,
                    this.#waypointsElement
                ], { className: "arc" });
            } else if(origin === "aes") {
                
                this.#clickableElement = makeSVGElement("path", {
                    d: "",
                    fill: "none",
                    stroke: "black",
                    className: "arc-clickable"
                });

                this.#element = makeGroupSVG([
                    this.#highlightPathElement,
                    this.#clickableElement,
                    // labelMaskBoundsElement,
                    arcElement,
                    this.#labelElement.element,
                ], { className: "arc" });
            } else if([ "vs", "poi" ].includes(origin)) {
                this.#element = makeGroupSVG([
                    this.#highlightPathElement,
                    arcElement,
                    this.#labelElement.element,
                ], { className: "arc" });
            }
        } else if(origin === "tracing") {
            this.#element = makeGroupSVG([
                arcElement,
            ], { className: "arc" });
        }
    }

    get element() { return this.#element; }
    get clickableElement() { return this.#clickableElement; }


    /**
     * @param {"straight" | "elbowed" | "self-loop" | "curved"} form
     * @param {{ x: number, y: number }[]} points - all points, including center of incidental vertices
     * @param {number} startRadius 
     * @param {number} endRadius 
     */
    drawPath(form, points, startRadius = 0, endRadius = 0, curveDeviation = 0) {
        let d = "";
        let drawPoints = [];
        const response = {};

        if([ "straight", "elbowed" ].includes(form)) {
            const poc1 = this.#getPointOfContact(
                points[0], startRadius, points[1]);
    
            if(isNaN(poc1.x) || isNaN(poc1.y)) return;
    
            const poc2 = this.#getPointOfContact(
                points[points.length-1], endRadius, points[points.length-2]);
    
            // Draw line from poc1 to poc2 along points excluding vertex centers
            drawPoints = [ poc1, ...points.slice(1, -1), poc2 ];
            
            d = `M ${poc1.x} ${poc1.y}`;
            for(let i = 1; i < drawPoints.length; i++) {
                const { x, y } = drawPoints[i];
                d += ` L ${x} ${y}`;
            }

            
            // Update bounds
            const startX = Math.min(...drawPoints.map(p => p.x));
            const startY = Math.min(...drawPoints.map(p => p.y));
            const endX = Math.max(...drawPoints.map(p => p.x));
            const endY = Math.max(...drawPoints.map(p => p.y));
            this.#bounds = {
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
            }
        } else if(form === "self-loop") {
            const vertexCenter = points[0];
            const absControlPoint = points[1];

            const vertexRadius = startRadius;
            const controlDistance = getDistance(vertexCenter, absControlPoint);
            const arcDistance = (controlDistance**2 + vertexRadius**2)/(2*controlDistance);
            const arcRadius = Math.sqrt(arcDistance**2 - vertexRadius**2);
            
            const arcCenter = this.#getPointOfContact(vertexCenter, arcDistance, absControlPoint);

            const [ poc1, poc2 ] = getCircleIntersections(vertexRadius, vertexCenter, arcRadius, arcCenter);
            response.intersections = [ poc1, poc2 ];

            d = `M${poc1.x} ${poc1.y} A ${arcRadius} ${arcRadius} 0 1 1 ${poc2.x} ${poc2.y}`;

            this.#bounds = {
                start: { 
                    x: arcCenter.x - arcRadius,
                    y: arcCenter.y - arcRadius,
                },
                end: { 
                    x: arcCenter.x + arcRadius,
                    y: arcCenter.y + arcRadius,
                }
            };
        } else if(form === "curved") {
            const vertex1Center = points[0];
            const vertex2Center = points[1];
            const midX = (vertex1Center.x + vertex2Center.x)/2;
            const midY = (vertex1Center.y + vertex2Center.y)/2;
            const centersAngle = Math.atan((vertex2Center.y-vertex1Center.y)/(vertex2Center.x-vertex1Center.x));
            const midAngle = centersAngle;

            // Get control point
            const controlPoint = {
                x: midX - curveDeviation*Math.sin(midAngle),
                y: midY + curveDeviation*Math.cos(midAngle)
            };
            
            // Get points of contact
            const poc1 = this.#getPointOfContact(vertex1Center, startRadius, controlPoint);
            const poc2 = this.#getPointOfContact(vertex2Center, startRadius, controlPoint);

            // Get protrusion distance (how far the poc is from the bezier control point)
            const pd1 = 0.5 * getDistance(poc1, controlPoint);
            const pd2 = 0.5 * getDistance(poc2, controlPoint);

            // Get bezier control points
            const bez1 = this.#getPointOfContact(vertex1Center, startRadius + pd1, controlPoint);
            const bez2 = this.#getPointOfContact(vertex2Center, startRadius + pd2, controlPoint);

            d = `M${poc1.x} ${poc1.y} C ${bez1.x} ${bez1.y}, ${bez2.x} ${bez2.y}, ${poc2.x} ${poc2.y}`;


            const cubicBezierPoints = [ poc1, bez1, bez2, poc2 ];
            const pointsX = cubicBezierPoints.map(p => p.x);
            const pointsY = cubicBezierPoints.map(p => p.y);
            this.#bounds = {
                start: {
                    x: Math.min(...pointsX),
                    y: Math.min(...pointsY),
                },
                end: {
                    x: Math.max(...pointsX),
                    y: Math.max(...pointsY),
                }
            }

            response.controlPoint = controlPoint;
            response.cubicBezierPoints = cubicBezierPoints;
            
        }

        this.#pathElement.setAttribute("d", d);
        
        if(this.#origin !== "tracing") this.#highlightPathElement.setAttribute("d", d);

        if(this.#origin === "model") {
            this.#hoverPathElement.setAttribute("d", d);
            this.#selectedPathElement.setAttribute("d", d);
            this.#triggerPathElement.setAttribute("d", d);

            this.#waypointsElement.innerHTML = "";
            if(form === "elbowed") {
                // Update waypoint points
                for(let i = 0; i < drawPoints.length; i++) {
                    const { x, y } = drawPoints[i];
                    const waypointElement = SVGAssetsRepository.loadArcSelectedSVGElement().querySelector("circle");
                    waypointElement.classList.add("arc-waypoint");
                    waypointElement.setAttribute("cx", x);
                    waypointElement.setAttribute("cy", y);
                    
                    if(i === 0 || i === drawPoints.length-1) {
                        waypointElement.setAttribute("data-nomove", "");
                    }

                    this.#waypointsElement.appendChild(waypointElement);
                }
            }
            
        } else if(this.#origin === "aes") {
            this.#clickableElement.setAttribute("d", d);
        }

        return response;

    }

    getBounds() {
        return this.#bounds;
    }

    /**
     * 
     * @param {{ x: number, y: number }} initial 
     * @param {{ x: number, y: number }} terminal 
     */
    #getNormalAngle(initial, terminal) {
        const { x: cx, y: cy } = initial;
        const { x: fx, y: fy } = terminal;

        const refAngle = Math.atan((fy-cy)/(fx-cx));
        return fx - cx < 0 ? refAngle + Math.PI : refAngle;
    }

    /**
     * @param {{ x: number, y: number }} center 
     * @param {number} radius 
     * @param {{ x: number, y: number }} nextPoint
     * @returns {number}
     */
    #getPointOfContact(center, radius, nextPoint) {
        const normalAngle = this.#getNormalAngle(center, nextPoint);
        const pocX = center.x + radius * Math.cos(normalAngle);
        const pocY = center.y + radius * Math.sin(normalAngle);

        return { x: pocX, y: pocY };
    }

    #interpolateCubicBezier(t, p0, p1, p2, p3) {
        const x = 
            Math.pow(1 - t, 3) * p0.x +
            3 * Math.pow(1 - t, 2) * t * p1.x +
            3 * (1 - t) * Math.pow(t, 2) * p2.x +
            Math.pow(t, 3) * p3.x;
        
        const y = 
            Math.pow(1 - t, 3) * p0.y +
            3 * Math.pow(1 - t, 2) * t * p1.y +
            3 * (1 - t) * Math.pow(t, 2) * p2.y +
            Math.pow(t, 3) * p3.y;
        
        return { x, y };
    }

    setStrokeWidth(strokeWidth) {
        this.#pathElement.setAttribute("stroke-width", strokeWidth);
        
        return this;
    }

    setLabelText(text) {
        this.#labelElement.text = text;

        return this;
    }

    /**
     * 
     * @param {number} thickness 
     * @param {{ x: number, y: number }} targetCenter 
     * @param {number} targetRadius 
     * @param {number} normalAngle 
     */
    updateConnectorEndPosition(thickness, targetCenter, targetRadius, previousPoint) {
        const poc = this.#getPointOfContact(targetCenter, targetRadius + thickness/2 - 1, previousPoint);
        const normalAngle = this.#getNormalAngle(previousPoint, targetCenter);

        const rotationDeg = radiansToDegrees(normalAngle) + 90;
        this.#connectorEndElement.setAttribute("transform", `translate(${poc.x-thickness/2}, ${poc.y-thickness/2}) rotate(${rotationDeg} ${thickness/2} ${thickness/2})`);
    }

    setConnectorEndThickness(thickness) {
        this.#connectorEndElement.setAttribute("points", `${thickness/2},0 0,${thickness} ${thickness},${thickness}`);

        return this;
    }

    setConnectorEndVisible(isVisible) {
        this.#connectorEndElement.style.display = isVisible ? "initial" : "none";
    }

    updateLabelPosition(form, points, baseSegmentIndex, footFracDistance, perpDistance, startRadius, endRadius) {
        if(!this.#labelElement) return;

        if(form === "self-loop") {
            this.#labelElement.position = points[1];
        } else if(form === "curved") {
            this.#labelElement.position = this.#interpolateCubicBezier(footFracDistance, ...points);
        } else {
            // Change endpoints to points of contact
            points[0] = this.#getPointOfContact(points[0], startRadius, points[1]);
            points[points.length-1] = this.#getPointOfContact(
                points[points.length-1], endRadius, points[points.length-2]);

            const baseSegmentStart = points[baseSegmentIndex];
            const baseSegmentEnd = points[baseSegmentIndex+1];

            const footX = baseSegmentStart.x + footFracDistance*(baseSegmentEnd.x - baseSegmentStart.x);
            const footY = baseSegmentStart.y + footFracDistance*(baseSegmentEnd.y - baseSegmentStart.y);

            const segmentSlope = (baseSegmentStart.y - baseSegmentEnd.y) / (baseSegmentStart.x - baseSegmentEnd.x);
            const perpAngle = Math.atan(-1/segmentSlope) + (baseSegmentStart.y < baseSegmentEnd.y ? Math.PI : 0);
            const labelX = footX + Math.cos(perpAngle)*perpDistance;
            const labelY = footY + Math.sin(perpAngle)*perpDistance;

            this.#labelElement.position = { x: labelX, y: labelY };
        }


        // requestAnimationFrame(() => {
        //     const { width, height } = this.#labelElement.element.getBBox();
        //     const clipoutWidth = width + 10;
        //     const clipoutHeight = height + 6;
        //     const clipoutX = labelX - clipoutWidth/2;
        //     const clipoutY = labelY - clipoutHeight/2;

        //     if(isNaN(clipoutX) || isNaN(clipoutY)) return;

        //     this.#labelMaskElement.setAttribute("transform", `translate(${clipoutX}, ${clipoutY})`);
        //     this.#labelMaskElement.setAttribute("height", clipoutHeight);
        //     this.#labelMaskElement.setAttribute("width", clipoutWidth);
        // });
    }

    setIsSelected(isSelected) {
        if(isSelected) this.#element.setAttribute("data-selected", "");
        else this.#element.removeAttribute("data-selected");
    }

    setIsAbstract(isAbstract) {
        if(isAbstract) {
            this.#element.classList.add("abstract");
        } else {
            this.#element.classList.remove("abstract");
        }
    }

}
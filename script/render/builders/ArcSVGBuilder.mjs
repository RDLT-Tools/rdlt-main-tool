import TextSVGBuilder from "./TextSVGBuilder.mjs";
import SVGAssetsRepository from "./SVGAssetsRepository.mjs";
import { getDistance, makeGroupSVG, makeSVGElement, radiansToDegrees } from "./utils.mjs";


export default class ArcSVGBuilder {

    /**
     * @typedef {"model" | "tracing" | "aes"} DrawingOrigin
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
    #aesHighlightPathElement;
    #aesClickableElement;

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

        this.#pathElement = makeSVGElement("path", {
            d: "",
            stroke: arcColor,
            fill: "none"
        });

        this.#pathElement.classList.add("arc-path");

        this.#connectorEndElement = makeSVGElement("polygon", {
            points: "",
            fill: arcColor,
            stroke: "none"
        });

        const arcElement = makeGroupSVG([
            this.#pathElement,
            this.#connectorEndElement
        ], { className: "diagram" });


        if(["model", "aes"].includes(origin)) {
            this.#labelElement = new TextSVGBuilder("", {
                align: "middle", vAlign: "central", 
                x: 0,
                y: 0,
                fontSize: 16
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
                    labelMaskBoundsElement,
                    arcElement,
                    this.#triggerPathElement,
                    this.#hoverPathElement,
                    this.#selectedPathElement,
                    this.#labelElement.element,
                    this.#waypointsElement
                ], { className: "arc" });
            } else if(origin === "aes") {
                this.#aesHighlightPathElement = this.#pathElement.cloneNode(true);
                this.#aesHighlightPathElement.classList.remove("arc-path");
                this.#aesHighlightPathElement.classList.add("arc-aes-highlight");
                
                this.#aesClickableElement = makeSVGElement("path", {
                    d: "",
                    fill: "none",
                    stroke: "black",
                    className: "arc-aes-clickable"
                })

                this.#element = makeGroupSVG([
                    this.#aesHighlightPathElement,
                    this.#aesClickableElement,
                    labelMaskBoundsElement,
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
    get aesClickableElement() { return this.#aesClickableElement; }


    /**
     * @param {{ x: number, y: number }[]} points - all points, including center of incidental vertices
     * @param {number} startRadius 
     * @param {number} endRadius 
     */
    setWaypoints(points, startRadius = 0, endRadius = 0) {
        const poc1 = this.#getPointOfContact(
            points[0], startRadius, points[1]);

        if(isNaN(poc1.x) || isNaN(poc1.y)) return;

        const poc2 = this.#getPointOfContact(
            points[points.length-1], endRadius, points[points.length-2]);

        // Draw line from poc1 to poc2 along points excluding vertex centers
        const drawPoints = [ poc1, ...points.slice(1, -1), poc2 ];
        
        let d = `M ${poc1.x} ${poc1.y}`;
        for(let i = 1; i < drawPoints.length; i++) {
            const { x, y } = drawPoints[i];
            d += ` L ${x} ${y}`;
        }

        this.#pathElement.setAttribute("d", d);

        if(this.#origin === "model") {
            this.#hoverPathElement.setAttribute("d", d);
            this.#selectedPathElement.setAttribute("d", d);
            this.#triggerPathElement.setAttribute("d", d);
    
            // Update waypoint points
            this.#waypointsElement.innerHTML = "";
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
            
            // Update bounds
            const startX = Math.min(...drawPoints.map(p => p.x));
            const startY = Math.min(...drawPoints.map(p => p.y));
            const endX = Math.max(...drawPoints.map(p => p.x));
            const endY = Math.max(...drawPoints.map(p => p.y));
            this.#bounds = {
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
            }
        } else if(this.#origin === "aes") {
            this.#aesHighlightPathElement.setAttribute("d", d);
            this.#aesClickableElement.setAttribute("d", d);
        }

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

    updateLabelPosition(points, baseSegmentIndex, footFracDistance, perpDistance, startRadius, endRadius) {
        if(!this.#labelElement) return;

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

        requestAnimationFrame(() => {
            const { width, height } = this.#labelElement.element.getBBox();
            const clipoutWidth = width + 10;
            const clipoutHeight = height + 6;
            const clipoutX = labelX - clipoutWidth/2;
            const clipoutY = labelY - clipoutHeight/2;

            if(isNaN(clipoutX) || isNaN(clipoutY)) return;

            this.#labelMaskElement.setAttribute("transform", `translate(${clipoutX}, ${clipoutY})`);
            this.#labelMaskElement.setAttribute("height", clipoutHeight);
            this.#labelMaskElement.setAttribute("width", clipoutWidth);
        });
    }

    setIsSelected(isSelected) {
        if(isSelected) this.#element.setAttribute("data-selected", "");
        else this.#element.removeAttribute("data-selected");
    }

}
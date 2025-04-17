import ArcGeometry from "../../../entities/geometry/ArcGeometry.mjs";
import ComponentGeometry from "../../../entities/geometry/ComponentGeometry.mjs";
import VisualArc from "../../../entities/model/visual/VisualArc.mjs";
import VisualComponent from "../../../entities/model/visual/VisualComponent.mjs";
import VisualRDLTModel from "../../../entities/model/visual/VisualRDLTModel.mjs";
import ArcStyles from "../../../entities/styling/ArcStyles.mjs";
import ComponentStyles from "../../../entities/styling/ComponentStyles.mjs";
import OutlineStyle from "../../../entities/styling/OutlineStyle.mjs";
import TextStyle from "../../../entities/styling/TextStyle.mjs";
import { parseNextBoolean, parseNextNamedArg, parseNextNamedArgList, parseNextNumber, parseNextOrderedArgs, parseNextPoint, parseNextPointsList, parseNextRange, parseNextString } from "./utils.mjs";

export default class RDLTImportManager {
    /**
     * @param {string} raw 
     * @returns {VisualRDLTModel}
     */
    static loadRDLTModel(raw) {
        const parsed = parseRDLTFileToJSON(raw);

        /**
         * @type {{ 
         *      fonts: { [fontClassID: number]: TextStyle }, 
         *      outlines: { [outlineClassID: number]: OutlineStyle } 
         * }}
         */
        const styleclasses = {
            fonts: {},
            outlines: {}
        };


        /**
         * @type {{
         *      vertices: { [vertexUID: number]: ComponentStyles },
         *      arcs: { [arcUID: number]: ArcStyles },
         * }}
         */
        const styles = {
            vertices: {},
            arcs: {}
        };


        /** @type {VisualComponent[]} */
        const vertices = [];

        /** @type {VisualArc[]} */
        const arcs = [];

        // Load Text Styles
        for(const fontClassID in parsed.styleclasses.fonts) {
            styleclasses.fonts[fontClassID] = 
                loadTextStyleFromParsedStyleClass(parsed.styleclasses.fonts[fontClassID]);
        }

        // Load Outline Styles
        for(const outlineClassID in parsed.styleclasses.outlines) {
            styleclasses.outlines[outlineClassID] = 
                loadOutlineStyleFromParsedStyleClass(parsed.styleclasses.outlines[outlineClassID]);
        }

        // Load Vertex Styles
        for(const { centerLabel, label, outline, applyTo } of parsed.styles.vertices) {
            const centerLabelTextStyle = styleclasses.fonts[centerLabel.split("@")[1]];
            const labelTextStyle = styleclasses.fonts[label.split("@")[1]];
            const outlineStyle = styleclasses.outlines[outline.split("@")[1]];

            const refVertexStyles = new ComponentStyles();
            refVertexStyles.innerLabel = centerLabelTextStyle;
            refVertexStyles.outerLabel = labelTextStyle;
            refVertexStyles.outline = outlineStyle;

            for(const vertexUID of applyTo) {
                styles.vertices[vertexUID] = refVertexStyles.copy();
            }
        }

        // Load Arc Styles
        for(const { label, outline, applyTo } of parsed.styles.arcs) {
            const labelTextStyle = styleclasses.fonts[label.split("@")[1]];
            const outlineStyle = styleclasses.outlines[outline.split("@")[1]];

            const refArcStyles = new ArcStyles();
            refArcStyles.outerLabel = labelTextStyle;
            refArcStyles.outline = outlineStyle;

            for(const vertexUID of applyTo) {
                styles.arcs[vertexUID] = refArcStyles.copy();
            }
        }

        // Load Vertices
        for(const vertexUID in parsed.vertices) {
            const { uid, identifier, type, isRBSCenter, label } = parsed.vertices[vertexUID];
            
            const vertexStyles = styles.vertices[vertexUID] || null;

            const parsedVertexGeometry = parsed.geometry.vertices[vertexUID];
            const vertexGeometry = parsedVertexGeometry ? loadVertexGeometryFromParsed(parsedVertexGeometry) : null;

            const vertex = new VisualComponent({
                uid, identifier, label,
                type: { b: "boundary", e: "entity", c: "controller" }[type],
                isRBSCenter,
                styles: vertexStyles,
                geometry: vertexGeometry
            });

            vertices.push(vertex);
        }

        // Load Arcs
        for(const arcUID in parsed.arcs) {
            const { uid, fromVertexUID, toVertexUID, C, L } = parsed.arcs[arcUID];
            
            const arcStyles = styles.arcs[arcUID] || null;

            const parsedArcGeometry = parsed.geometry.arcs[arcUID];
            const arcGeometry = parsedArcGeometry ? loadArcGeometryFromParsed(parsedArcGeometry) : null;

            const arc = new VisualArc({
                uid, C, L,
                fromVertexUID, toVertexUID,
                geometry: arcGeometry,
                styles: arcStyles
            });

            arcs.push(arc);
        }

        return new VisualRDLTModel({
            components: vertices, arcs
        });
    }
}

function loadTextStyleFromParsedStyleClass(parsedFontStyleClass) {
    return new TextStyle({
        fontFamily: parsedFontStyleClass.family,
        size: parsedFontStyleClass.size,
        weight: parsedFontStyleClass.weight,
        color: parsedFontStyleClass.color
    });
}

function loadOutlineStyleFromParsedStyleClass(parsedOutlineStyleClass) {
    return new OutlineStyle({
        color: parsedOutlineStyleClass.outline,
        width: parsedOutlineStyleClass.width
    });
}

function loadVertexGeometryFromParsed(parsedVertexGeometry) {
    return new ComponentGeometry({
        size: parsedVertexGeometry.size,
        position: parsedVertexGeometry.position,
    })
}

function loadArcGeometryFromParsed(parsedArcGeometry) {
    return new ArcGeometry({
        isAutoDraw: parsedArcGeometry.isAutoDraw,
        arcLabel: parsedArcGeometry.label,
        waypoints: parsedArcGeometry.waypoints || [],
    });
}

/**
 * @typedef {"vertices" | "arcs" | "geometry-vertices" | "geometry-arcs" | "styleclasses-fonts" | "styleclasses-outlines" | "styles-vertices" | "styles-arcs"} SectionContext
 */
/**
 * @param {string} raw
 *  
 */
function parseRDLTFileToJSON(raw) {
    const lines = raw.split("\n");
    const parsed = {
        vertices: {},
        arcs: {},
        geometry: {
            vertices: {},
            arcs: {}
        },
        styleclasses: {
            fonts: {},
            outlines: {}
        },
        styles: {
            vertices: [],
            arcs: []
        }

    };

    let context = null;
    for(let line of lines) {
        line = line.trim();

        // Ignore if empty
        if(!line) continue;

        // Check if line is section header
        const sectionHeaderContext = tryParseSectionHeader(line);
        if(sectionHeaderContext) {
            context = sectionHeaderContext;
            continue;
        }

        if(!context) continue;

        if(context === "vertices") {
            const parsedLine = parseVerticesLine(line);
            parsed.vertices[parsedLine.uid] = parsedLine;
        } else if(context === "arcs") {
            const parsedLine = parseArcsLine(line);
            parsed.arcs[parsedLine.uid] = parsedLine;
        } else if(context === "geometry-vertices") {
            const parsedLine = parseGeometryVerticesLine(line);
            parsed.geometry.vertices[parsedLine.vertexUID] = parsedLine;
        } else if(context === "geometry-arcs") {
            const parsedLine = parseGeometryArcsLine(line);
            parsed.geometry.arcs[parsedLine.arcUID] = parsedLine;
        } else if(context === "styleclasses-fonts") {
            const parsedLine = parseStyleClassesFontsLine(line);
            parsed.styleclasses.fonts[parsedLine.fontClassID] = parsedLine;
        } else if(context === "styleclasses-outlines") {
            const parsedLine = parseStyleClassesOutlinesLine(line);
            parsed.styleclasses.outlines[parsedLine.outlineClassID] = parsedLine;
        } else if(context === "styles-vertices") {
            const parsedLine = parseStylesVerticesLine(line);
            parsed.styles.vertices.push(parsedLine);
        } else if(context === "styles-arcs") {
            const parsedLine = parseStylesArcsLine(line);
            parsed.styles.arcs.push(parsedLine);
        }
    }

    return parsed;
}

/**
 * @param {string} line
 * @param {SectionContext} context
 * @returns {{ ok: boolean, error?: string, context: SectionContext, data: any }} 
 */
function parseLine(line, context) {
    line = line.trim();

    // Ignore if empty
    if(!line) return ok({ context, data: null });

    // Check if line is section header
    const sectionHeaderContext = tryParseSectionHeader(line);
    if(sectionHeaderContext) return ok({ context: sectionHeaderContext, data: null });

    
}

/**
 * 
 * @param {string} line 
 * @returns {SectionContext | null}
 */
function tryParseSectionHeader(line) {
    line = line.replace(/\s+/g, "").toUpperCase();

    const headerContexts = {
        "VERTICES": "vertices",
        "ARCS": "arcs",
        "GEOMETRY:VERTICES": "geometry-vertices",
        "GEOMETRY:ARCS": "geometry-arcs",
        "STYLECLASSES:FONTS": "styleclasses-fonts",
        "STYLECLASSES:OUTLINES": "styleclasses-outlines",
        "STYLES:VERTICES": "styles-vertices",
        "STYLES:ARCS": "styles-arcs"
    };

    return headerContexts[line] || null;
}

/**
 * @param {string} line 
 * @return {{ uid: number, identifier: string, type: string, isRBSCenter: boolean }}
 */
function parseVerticesLine(line) {
    const parsedUID = parseNextNumber(line, 0);
    const parsedIdentifier = parseNextString(line, parsedUID.nextIndex);
    const parsedType = parseNextString(line, parsedIdentifier.nextIndex);
    const parsedIsRBSCenter = parseNextBoolean(line, parsedType.nextIndex);
    const parsedLabel = parseNextString(line, parsedIsRBSCenter.nextIndex);

    return {
        uid: parsedUID.value,
        identifier: parsedIdentifier.value,
        type: parsedType.value,
        isRBSCenter: parsedIsRBSCenter.value,
        label: parsedLabel.value || ""
    };
}

/**
 * @param {string} line 
 * @return {{ uid: number, fromVertexUID: number, toVertexUID: number, C: string, L: number }}
 */
function parseArcsLine(line) {
    const parsedUID = parseNextNumber(line, 0);
    const parsedIncidentVertices = parseNextRange(line, parsedUID.nextIndex);
    const parsedC = parseNextString(line, parsedIncidentVertices.nextIndex);
    const parsedL = parseNextNumber(line, parsedC.nextIndex);

    return {
        uid: parsedUID.value,
        fromVertexUID: parsedIncidentVertices.value[0],
        toVertexUID: parsedIncidentVertices.value[1],
        C: parsedC.value,
        L: parsedL.value
    };
}

/**
 * @param {string} line 
 * @return {{ vertexUID: number, size: number, position: { x: number, y: number } }}
 */
function parseGeometryVerticesLine(line) {
    const parsedUID = parseNextNumber(line, 0);
    const parsedSize = parseNextNumber(line, parsedUID.nextIndex);
    const parsedPosition = parseNextPoint(line, parsedSize.nextIndex);

    return { 
        vertexUID: parsedUID.value,
        size: parsedSize.value,
        position: parsedPosition.value
    };
}

/**
 * @param {string} line 
 * @return {{ arcUID: number, size: number, position: { x: number, y: number } }}
 */
function parseGeometryArcsLine(line) {
    const parsedUID = parseNextNumber(line, 0);
    const parsedIsAutoDraw = parseNextBoolean(line, parsedUID.nextIndex);
    const parsedLabelGeometry = parseNextOrderedArgs(line, 3, parsedIsAutoDraw.nextIndex);
    const parsedWaypoints = parseNextPointsList(line, parsedLabelGeometry.nextIndex);

    return { 
        arcUID: parsedUID.value,
        isAutoDraw: parsedIsAutoDraw.value,
        label: {
            baseSegmentIndex: Number(parsedLabelGeometry.values[0]),
            footFracDistance: Number(parsedLabelGeometry.values[1]),
            perpDistance: Number(parsedLabelGeometry.values[2]),
        },
        waypoints: parsedWaypoints.values
    };
}

/**
 * @param {string} line 
 * @return {{ fontClassID: number, size: number, family: string, weight: string, color: string }}
 */
function parseStyleClassesFontsLine(line) {
    const parsedFontClassID = parseNextNumber(line, 0);
    const parsedFontFamily = parseNextString(line, parsedFontClassID.nextIndex);
    const parsedFontSize = parseNextNumber(line, parsedFontFamily.nextIndex);
    const parsedFontColor = parseNextString(line, parsedFontSize.nextIndex);
    const parsedFontWeight = parseNextString(line, parsedFontColor.nextIndex);

    return {
        fontClassID: parsedFontClassID.value,
        size: parsedFontSize.value,
        family: parsedFontFamily.value,
        weight: parsedFontWeight.value || "normal",
        color: parsedFontColor.value
    };
}

/**
 * @param {string} line 
 * @return {{ outlineClassID: number, color: string, width: number, style: string }}
 */
function parseStyleClassesOutlinesLine(line) {
    const parsedOutlineClassID = parseNextNumber(line, 0);
    const parsedOutlineWidth = parseNextNumber(line, parsedOutlineClassID.nextIndex);
    const parsedOutlineColor = parseNextString(line, parsedOutlineWidth.nextIndex);
    const parsedOutlineStyle = parseNextString(line, parsedOutlineColor.nextIndex);

    return { 
        outlineClassID: parsedOutlineClassID.value,
        color: parsedOutlineColor.value,
        width: parsedOutlineWidth.value,
        style: parsedOutlineStyle.value || "solid"
    };
}


/**
 * @param {string} line 
 * @return {{ centerLabel: string, label: string, outline: string, applyTo: number[] }}
 */
function parseStylesVerticesLine(line) {
    const value = {};
    
    let startIndex = 0;
    for(let i = 0; i < 3; i++) {
        const namedArg = parseNextNamedArg(line, startIndex);

        switch(namedArg.name) {
            case "C":
                value["centerLabel"] = `fonts@${namedArg.value.substring(1)}`;
            break;
            case "L":
                value["label"] = `fonts@${namedArg.value.substring(1)}`;
            break;
            case "O":
                value["outline"] = `outlines@${namedArg.value.substring(1)}`;
            break;
        }

        startIndex = namedArg.nextIndex;
    }

    const verticesList = parseNextNamedArgList(line, startIndex);
    value["applyTo"] = verticesList.values.map(vuid => Number(vuid));

    return value;
}

/**
 * @param {string} line 
 * @return {{ label: string, outline: string, applyTo: number[] }}
 */
function parseStylesArcsLine(line) {
    const value = {};
    
    let startIndex = 0;
    for(let i = 0; i < 2; i++) {
        const namedArg = parseNextNamedArg(line, startIndex);

        switch(namedArg.name) {
            case "L":
                value["label"] = `fonts@${namedArg.value.substring(1)}`;
            break;
            case "O":
                value["outline"] = `outlines@${namedArg.value.substring(1)}`;
            break;
        }

        startIndex = namedArg.nextIndex;
    }

    const arcsList = parseNextNamedArgList(line, startIndex);
    value["applyTo"] = arcsList.values.map(auid => Number(auid));

    return value;
}



function ok(obj) {
    return { ok: true, ...obj };
}

function error(error, obj = {}) {
    return { ok: false, error, ...obj }
}
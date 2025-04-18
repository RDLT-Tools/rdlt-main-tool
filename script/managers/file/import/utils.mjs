
/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ value: number, nextIndex: number }}
 */
export function parseNextNumber(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { value: null, nextIndex: startIndex };

    const endIndex = skipToNonNumeric(line, startIndex);

    const parsed = line.substring(startIndex, endIndex);
    return { value: Number(parsed), nextIndex: endIndex };
}

/**
 * @param {string} line 
 * @param {number}  
 * @return {{ value: boolean, nextIndex: number }}
 */
export function parseNextBoolean(line, startIndex) {
    const parsedNumber = parseNextNumber(line, startIndex);
    
    return { 
        value: parsedNumber.value === 1 ? true : 
            parsedNumber.value === 0 ? false : 
            null, 
        nextIndex: parsedNumber.nextIndex 
    };
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ value: string, nextIndex: number }}
 */
export function parseNextString(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { value: null, nextIndex: line.length };

    let endIndex;
    let quoted = true;

    if(line[startIndex] === `"`) endIndex = skipToChar(line, `"`, startIndex+1);
    else if(line[startIndex] === `'`) endIndex = skipToChar(line, `'`, startIndex+1);
    else {
        endIndex = skipToWhitespace(line, startIndex);
        quoted = false;
    }

    const parsed = line.substring(quoted ? startIndex + 1 : startIndex, endIndex);
    return { value: parsed, nextIndex: (quoted && endIndex < line.length) ? endIndex + 1 : endIndex };
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ value: { x: number, y: number }, nextIndex: number }}
 */
export function parseNextPoint(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { value: null, nextIndex: startIndex };

    const endIndex1 = skipToChar(line, ",", startIndex);
    const startIndex2 = skipToNonWhitespace(line, endIndex1+1);
    const endIndex2 = skipToNonNumeric(line, startIndex2);
    
    const num1 = Number(line.substring(startIndex, endIndex1).trim());
    const num2 = Number(line.substring(startIndex2, endIndex2).trim());

    return { value: { x: num1, y: num2 }, nextIndex: endIndex2 };
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ name: string, value: string, nextIndex: number }}
 */
export function parseNextNamedArg(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { value: null, nextIndex: startIndex };

    const nameEndIndex = skipToChar(line, "=", startIndex);
    const parsedValue = parseNextString(line, nameEndIndex+1);

    const parsedName = line.substring(startIndex, nameEndIndex).trim();

    return { name: parsedName, value: parsedValue.value, nextIndex: parsedValue.nextIndex };
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ name: string, values: string[], nextIndex: number }}
 */
export function parseNextNamedArgList(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { name: null, values: [], nextIndex: startIndex };

    const parsedFirstNamedArg = parseNextNamedArg(line, startIndex);

    const values = [ parsedFirstNamedArg.value ];
    startIndex = parsedFirstNamedArg.nextIndex;
    while(startIndex < line.length) {
        const parsedValue = parseNextString(line, startIndex);
        if(parsedValue.value === null) break; 

        values.push(parsedValue.value);
        startIndex = parsedValue.nextIndex;
    }

    return { name: parsedFirstNamedArg.name, values, nextIndex: line.length }; 
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ values: string[], nextIndex: number }}
 */
export function parseNextList(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { name: null, values: [], nextIndex: startIndex };

    const values = [ ];

    while(startIndex < line.length) {
        const parsedValue = parseNextString(line, startIndex);
        if(parsedValue.value === null) break; 

        values.push(parsedValue.value);
        startIndex = parsedValue.nextIndex;
    }

    return { values, nextIndex: line.length }; 
}

/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ values: { x: number, y: number }[], nextIndex: number }}
 */
export function parseNextPointsList(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { name: null, values: [], nextIndex: startIndex };

    const values = [ ];

    while(startIndex < line.length) {
        const parsedValue = parseNextPoint(line, startIndex);
        if(parsedValue.value === null) break; 

        values.push(parsedValue.value);
        startIndex = parsedValue.nextIndex;
    }

    return { values, nextIndex: line.length }; 
}


/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ values: string[], nextIndex: number }}
 */
export function parseNextOrderedArgs(line, count, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { values: [], nextIndex: startIndex };

    const values = [];

    let endIndex;
    for(let i = 0; i < count; i++) {
        startIndex = skipToNonWhitespace(line, startIndex);

        endIndex = i < count-1 ? skipToChar(line, "/", startIndex) : skipToWhitespace(line, startIndex);
        values.push(line.substring(startIndex, endIndex).trim());
        startIndex = endIndex + 1;
    }

    return { values, nextIndex: startIndex };
}


/**
 * @param {string} line 
 * @param {number} startIndex 
 * @return {{ value: number[], nextIndex: number }}
 */
export function parseNextRange(line, startIndex) {
    startIndex = skipToNonWhitespace(line, startIndex);
    if(startIndex >= line.length) return { values: null, nextIndex: startIndex };

    const endIndex1 = skipToChar(line, "-", startIndex);
    const startIndex2 = skipToNonWhitespace(line, endIndex1+1)
    const endIndex2 = skipToWhitespace(line, startIndex2);

    const parsedValue1 = Number(line.substring(startIndex, endIndex1).trim());
    const parsedValue2 = Number(line.substring(startIndex2, endIndex2).trim());

    return { value: [ parsedValue1, parsedValue2 ], nextIndex: endIndex2 };
}


export function skipToNonWhitespace(line, startIndex) {
    return skipToNeither(line, [" ", "\t", "\r"], startIndex);
}

export function skipToEither(line, chars, startIndex) {
    while(startIndex < line.length) {
        if(chars.includes(line[startIndex])) return startIndex;
        startIndex++;
    }

    return startIndex;
}

export function skipToNeither(line, chars, startIndex) {
    while(startIndex < line.length) {
        if(!chars.includes(line[startIndex])) return startIndex;
        startIndex++;
    }

    return startIndex;
}

export function skipToChar(line, char, startIndex) {
    return skipToEither(line, [char], startIndex);
}

export function skipToWhitespace(line, startIndex) {
    return skipToEither(line, [" ", "\t", "\r"], startIndex);
}

export function skipToNonNumeric(line, startIndex) {
    return skipToNeither(line, "0123456789.-".split(""), startIndex);
}
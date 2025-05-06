import { parseRDLT } from './parser.js';
import { RDLTModel } from '../models/rdltModel.js';
import { preprocessRDLT, combineLevels } from './preprocessor.js';
import { mapToPetriNet } from './mapper.js';
import { structuralAnalysis } from './structuralAnalysis.js';
import { behavioralAnalysis } from './behavioralAnalysis.js';

export function convert(rdltInput, extend = true) {
  let parsedRDLT;
  try{
    // Step 1: Parse the RDLT input.
    parsedRDLT = parseRDLT(rdltInput, extend);
    console.log(`RDLT input parsed OK, with ${parsedRDLT.warnings.length===0?'0 warnings':`${parsedRDLT.warnings.length} warning(s). \n - ${parsedRDLT.warnings.join('\n - ')}`}`);
    // Step 2: Initialize RDLTModel from JSON using the static fromJSON method.
    const inputRdltModel = RDLTModel.fromJSON(parsedRDLT.rdltJSON);
    // Step 3: Preprocess the parsed RDLT model into level-1 and level-2 models.
    const preprocessedModel = preprocessRDLT(inputRdltModel, extend);
    // Step 4: Combine the two levels into one RDLT.
    const combinedRDLT = combineLevels(preprocessedModel.level1, preprocessedModel.level2);
    // Step 5: Map the preprocessed RDLT model to a Petri Net.
    const mappingResult = mapToPetriNet(combinedRDLT);
    const outputPnModel = mappingResult.petriNet;

    let payload = {
      rdlt: inputRdltModel, 
      preprocess: preprocessedModel, 
      combinedModel: combinedRDLT, 
      petriNet: outputPnModel,
      visualizeConversion: mappingResult.conversionDOT
    };
    // Only apply analysis if preprocessed RDLT is extended 
    if(!extend) {
      return { data: payload, warnings: parsedRDLT.warnings };
    }
    // Run structural analysis and behavioral analysis.
    payload.structAnalysis = structuralAnalysis(outputPnModel);;
    payload.behaviorAnalysis = behavioralAnalysis(outputPnModel, 1000); 
    return { data: payload, warnings: parsedRDLT.warnings };
  } catch (err) {
    return {
      error: err.message,
      warnings: parsedRDLT ? parsedRDLT.warnings : []
    };
  }
}
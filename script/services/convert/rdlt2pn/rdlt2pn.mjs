import { convert } from "./modules/conversionFacade.js";
import { exportPNToDOT } from "./modules/visualization.js"; 
import { exportRDLTToDOT } from "./modules/visualization.js";

const mainGraph = d3.select(`#d3graph`);
let rdltInputDot = "";
let pnOutputDot = "";
let structReport = null;
let behaveReport = null;
let convertDotList = [];
let convertLogList = [];
const convertSubTitles = [
  'RDLT Input','Preprocess',
  'Step 1: Process Vertices',
  'Step 2: Process Split Places',
  'Step 3: Process Incoming Arcs',
  'Step 4: Process Epsilon Arcs',
  'Step 5: Process Sigma Arcs',
  'Step 6: Process RBS',
  'Step 7: Process Bridge Arcs',
  'Step 8: Process Reset Arcs',
  'Step 9: Process Global Source Place'
];
let firSeqList = [];
let fireSeqLogList = [];
var dotIndex = -1;

const renderConversion = function(jsonInput){
  const { data, warnings, error } = convert(jsonInput);
  if(error) {
    console.error('Parsing failed:', error);
    alert(`Error: ${error}`);
  } else {
    console.log('Conversion succeeded:', data);
    if(warnings.length > 0) alert(`Found ${warnings.length} warning(s). \n - ${warnings.join('\n - ')}`);

    pnOutputDot = exportPNToDOT(data.petriNet);
    rdltInputDot = exportRDLTToDOT(data.rdlt);
    structReport = data.structAnalysis;
    behaveReport = data.behaviorAnalysis;

    renderStructuralReport();
    renderBehavioralReport(behaveReport);
    
    initRenderGraph(rdltInputDot);
    document.getElementById('graphTitle').innerHTML = "RDLT Input";

    convertDotList = [];
    convertLogList = [];
    convertDotList.push(rdltInputDot);
    convertLogList.push(`[RDLT Input] Parsed and Validated RDLT input.`);
    data.visualizeConversion.forEach(conv => {
      convertDotList = convertDotList.concat(conv.dotLines.join(''));
      convertLogList = convertLogList.concat(conv.log);
    });

    firSeqList = [];
    fireSeqLogList = [];
    data.behaviorAnalysis.simulationResults.forEach( fireseq => {
      let seqDOTList = []; 
      let seqLogList = []; 
      fireseq.forEach( state => {
        data.petriNet.updateState(state);
        seqDOTList.push(exportPNToDOT(data.petriNet));
        data.petriNet.revertState;
        seqLogList.push(state.log);
      });
      firSeqList.push(seqDOTList);
      fireSeqLogList.push(seqLogList);
    });
  }
} 

window.renderConversion = renderConversion;
export {renderConversion};

function renderStructuralReport(){
  const structPanel = document.getElementById('structReportOutput');
  structPanel.innerHTML = `
    <details>
      <summary>Places (<span class="count">${structReport.placesCount}</span>)</summary>
      <div class="sub-items">
        <details>
          <summary>Global Source Place (<span class="count">${structReport.globalSource.length}</span>)</summary>
          <pre>${structReport.globalSource.length===0? 'None.':structReport.globalSource.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Global Sink Place (<span class="count">${structReport.globalSink.length}</span>)</summary>
          <pre>${structReport.globalSink.length===0? 'None.':structReport.globalSink.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Auxiliary Places (<span class="count">${structReport.auxiliaryPlaces.length}</span>)</summary>
          <pre>${structReport.auxiliaryPlaces.length===0? 'None.':structReport.auxiliaryPlaces.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Checked Arc Places (<span class="count">${structReport.checkedPlaces.length}</span>)</summary>
          <pre>${structReport.checkedPlaces.length===0? 'None.':structReport.checkedPlaces.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Traversed Arc Places (<span class="count">${structReport.traversedPlaces.length}</span>)</summary>
          <pre>${structReport.traversedPlaces.length===0? 'None.':structReport.traversedPlaces.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Consensus Places (<span class="count">${structReport.consensusPlaces.length}</span>)</summary>
          <pre>${structReport.consensusPlaces.length===0? 'None.':structReport.consensusPlaces.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Unconstrained Epsilon Arc Places (<span class="count">${structReport.unconstrainedPlaces.length}</span>)</summary>
          <pre>${structReport.unconstrainedPlaces.length===0? 'None,':structReport.unconstrainedPlaces.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Split Places (<span class="count">${structReport.splitPlaces.length}</span>)</summary>
          <pre>${structReport.splitPlaces.length===0? 'None.':structReport.splitPlaces.join(',')+'.'}</pre>
        </details>
      </div>
    </details>
    <details>
      <summary>Transitions (<span class="count">${structReport.transitionsCount}</span>)</summary>
      <div class="sub-items">
        <details>
          <summary>Check Transitions (<span class="count">${structReport.checkTransitions.length}</span>)</summary>
          <pre>${structReport.checkTransitions.length===0? 'None.':structReport.checkTransitions.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Traverse Transitions (<span class="count">${structReport.traverseTransitions.length}</span>)</summary>
          <pre>${structReport.traverseTransitions.length===0? 'None.':structReport.traverseTransitions.join(', ')+'.'}</pre>
        </details>
        <details>
          <summary>Reset Transitions (<span class="count">${structReport.resetTransitions.length}</span>)</summary>
          <pre>${structReport.resetTransitions.length===0? 'None.':structReport.resetTransitions.join(', ')+'.'}</pre>
        </details>
      </div>
    </details>
    <div class="final-conclusion">
      <strong>Strongly Connected.</strong>
      The designated sink place ${structReport.connectivityDetails.sink} is 
      ${structReport.connectivityDetails.stronglyConnected? 'reachable':'unreachable'} 
      from the designated source ${structReport.connectivityDetails.source}. 
      There are ${structReport.connectivityDetails.isolatedNodes.length} isolated nodes, 
      while ${structReport.connectivityDetails.unreached.length} nodes remain 
      unreached${structReport.connectivityDetails.stronglyConnected? ', all of which are auxiliary and do not affect execution.':'.'}
    </div>
    <details>
      <summary>Structural Issues</summary>
      <pre>${structReport.issues.length > 0? structReport.issues.join('\n') : "No structural issues."}</pre>
    </details>
  `;
}

function renderBehavioralReport(result){
  const container = document.getElementById('behaveReportOutput');
  container.innerHTML = '';

  const {
    perSequenceResults,
    overallLiveness,
    overallTermination,
    overallSoundness
  } = result;

  // 1) Option to Complete
  const optSeqs = perSequenceResults
    .filter(s => s.option.result)
    .map(s => s.sequenceIndex + 1);

  const optSection = document.createElement('details');
  optSection.innerHTML = `
    <summary>Option to Complete</summary>
    <pre>${
      optSeqs.length
        ? `Sequences ${optSeqs.join(', ')} satisfy “option to complete.”`
        : 'No sequence satisfies “option to complete.”'
    }</pre>
  `;
  container.appendChild(optSection);

  // 2) Termination
  const properSeqs  = perSequenceResults
    .filter(s => s.terminationChecks.properTermination)
    .map(s => s.sequenceIndex + 1);

  const weakSeqs    = perSequenceResults
    .filter(s => s.terminationChecks.weakenedProperTermination)
    .map(s => s.sequenceIndex + 1);

  const nonTermSeqs = perSequenceResults
    .filter(s =>
      !s.terminationChecks.properTermination &&
      !s.terminationChecks.weakenedProperTermination
    )
    .map(s => s.sequenceIndex + 1);

  // build a short explanation for the overall termination
  let termExplain = '';
  switch (overallTermination.toLowerCase()) {
    case 'classical':
      termExplain = 'All sequences satisfy proper termination.';
      break;
    case 'relaxed':
      termExplain = 'At least one sequence satisfy proper termination.';
      break;
    case 'weak':
      termExplain = 'All sequences satisfy weakened proper termination.';
      break;
    case 'easy':
      termExplain = 'At least one sequence terminates (option to complete).';
      break;
    case 'none':
      termExplain = 'None of the sequences terminate (option to complete).';
      break;
    default:
      termExplain = '';
  }

  const termSection = document.createElement('details');
  termSection.innerHTML = `
    <summary>Termination</summary>
    <div class="sub-items">
      <details>
        <summary>Proper Termination</summary>
        <pre>${properSeqs.length? `Sequences ${properSeqs.join(', ')}`: 'None'}.</pre>
      </details>
      <details>
        <summary>Weakened Proper Termination</summary>
        <pre>${weakSeqs.length? `Sequences ${weakSeqs.join(', ')}`: 'None'}.</pre>
      </details>
      <details>
        <summary>Non-terminating</summary>
        <pre>${nonTermSeqs.length? `Sequences ${nonTermSeqs.join(', ')}`: 'None'}.</pre>
      </details>
      <div class="final-conclusion">
        <strong>${overallTermination} Overall Termination. </strong> ${termExplain}
      </div>
    </div>
  `;
  container.appendChild(termSection);

  // 3) Liveness
  const liveSection = document.createElement('details');
  liveSection.innerHTML = `
    <summary>Liveness</summary>
    <pre>${ overallLiveness.report }</pre>
  `;
  container.appendChild(liveSection);

  // 4) Overall Soundness + implications
  const soundMap = {
    classical: ['Relaxed','Weak','Easy','Lazy'],
    relaxed:   ['Easy'],
    weak:      ['Easy','Lazy'],
    easy:      [],
    lazy:      []
  };
  const key = overallSoundness.toLowerCase();
  const implied = soundMap[key] || [];

  const soundSection = document.createElement('div');
  soundSection.classList = 'final-conclusion';
  soundSection.innerHTML = `
    <strong>${overallSoundness} Sound.</strong>
    ${ implied.length
      ? 'Also implies ' + implied.join(', ') + '.'
      : 'No further implications.'}
  `;
  container.appendChild(soundSection);
}

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

prevBtn.addEventListener('click', () => {
  if(prevBtn.getAttribute('sim')==="conversion"){
    renderSimulation(convertDotList,-1);
    document.getElementById('simSubtitle').innerHTML = convertSubTitles[dotIndex];
    document.getElementById('simulationLog').innerHTML = convertLogList[dotIndex];
  }
  if(prevBtn.getAttribute('sim')==="firingseq"){
    renderSimulation(firSeqList[prevBtn.getAttribute('seqIndex')],-1);
    document.getElementById('simSubtitle').innerHTML =
      `Timestep ${dotIndex} of ${firSeqList[prevBtn.getAttribute('seqIndex')].length-1}`;
    document.getElementById('simulationLog').innerHTML =
      fireSeqLogList[prevBtn.getAttribute('seqIndex')][dotIndex];
  }
});

nextBtn.addEventListener('click', () => {
  if(nextBtn.getAttribute('sim')==="conversion"){
    renderSimulation(convertDotList);
    document.getElementById('simSubtitle').innerHTML = convertSubTitles[dotIndex];
    document.getElementById('simulationLog').innerHTML = convertLogList[dotIndex];
  }
  if(nextBtn.getAttribute('sim')==="firingseq"){
    renderSimulation(firSeqList[nextBtn.getAttribute('seqIndex')]);
    document.getElementById('simSubtitle').innerHTML =
      `Timestep ${dotIndex} of ${firSeqList[nextBtn.getAttribute('seqIndex')].length-1}`;
    document.getElementById('simulationLog').innerHTML =
      fireSeqLogList[nextBtn.getAttribute('seqIndex')][dotIndex];
  }
});

document.getElementById('endSimBtn').addEventListener('click', () => {
  document.getElementById('simulationControls').style.display = 'none';
  document.getElementById('simSubtitle').style.display = 'none';
  prevBtn.removeAttribute('sim');
  nextBtn.removeAttribute('sim');
  prevBtn.removeAttribute('seqIndex');
  nextBtn.removeAttribute('seqIndex');
  document.getElementById('reportSection').style.display = 'none';
  renderGraph(pnOutputDot);
  document.getElementById('graphTitle').innerHTML = "PN Output";
  document.getElementById('logSection').style.display = 'none';
});

document.getElementById('resetSimBtn').addEventListener('click', () => {
  dotIndex = 0;
  if(nextBtn.getAttribute('sim')==="conversion"){
    document.getElementById('simSubtitle').innerHTML = convertSubTitles[dotIndex];
    document.getElementById('simulationLog').innerHTML = convertLogList[dotIndex];
    renderGraph(convertDotList[dotIndex]);
  }
  if(nextBtn.getAttribute('sim')==="firingseq"){
    document.getElementById('simSubtitle').innerHTML = 
    `Timestep ${dotIndex} of ${firSeqList[nextBtn.getAttribute('seqIndex')].length-1}`;
    document.getElementById('simulationLog').innerHTML =
      fireSeqLogList[nextBtn.getAttribute('seqIndex')][dotIndex];
    renderGraph(firSeqList[nextBtn.getAttribute('seqIndex')][dotIndex]);
  }
});

document.querySelectorAll('.simulateBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const simulation = btn.getAttribute('simulation');
    if(simulation==="conversion"){
      prevBtn.setAttribute("sim","conversion");
      nextBtn.setAttribute("sim","conversion");
      document.getElementById('simulationControls').style.display = 'block';
      dotIndex = 0;
      renderGraph(convertDotList[dotIndex], mainGraph);
      document.getElementById('graphTitle').innerHTML = "Simulation of RDLT to PN Conversion";
      document.getElementById('simSubtitle').innerHTML = convertSubTitles[dotIndex];
      document.getElementById('simSubtitle').style.display = 'block';
      document.getElementById('logSection').style.display = 'block';
      document.getElementById('simulationLog').innerHTML = convertLogList[dotIndex];
      document.getElementById('reportSection').style.display = 'none';
    } else if(simulation==="firingsequence") {
      document.getElementById('reportSection').style.display = 'block';
      document.getElementById('simulationControls').style.display = 'none';
      renderGraph(pnOutputDot);
      document.getElementById('simSubtitle').style.display = 'none';
      document.getElementById('graphTitle').innerHTML = "Simulation of PN Output";
      document.getElementById('logSection').style.display = 'none';

      // const nButtons = behaveReport.perSequenceResults.length;
      const container = document.getElementById('firingSequencesOutput');
      container.innerHTML = '';
      behaveReport.perSequenceResults.forEach((seq, i) => {
        const d = document.createElement('details');
        d.classList.add('firing-seq');
        d.innerHTML = `
          <summary>
            <button class="run-seq-btn">Run Sequence ${i+1}</button>
          </summary>
          <div class="seq-content">
            <p class="seq-path">${seq.firingSequence.join(' → ')}</p>
            <details><summary>Activity Extraction</summary><pre>${seq.activityExtraction.join(',\n')}</pre></details>
            <details><summary>Option to Complete Report</summary><pre>${seq.option.report}</pre></details>
            <details><summary>Proper Termination Report</summary><pre>${seq.terminationChecks.reportProper}</pre></details>
            <details><summary>Weakened Proper Termination Report</summary><pre>${seq.terminationChecks.reportWeakened}</pre></details>
            <div class="final-conclusion"><strong>Termination Type:</strong> ${seq.terminationType}</div>
          </div>`;
        container.appendChild(d);

        // attach your click handler
        d.querySelector('.run-seq-btn')
          .addEventListener('click', () => {
            prevBtn.setAttribute("sim","firingseq");
            nextBtn.setAttribute("sim","firingseq");
            prevBtn.setAttribute("seqIndex",i);
            nextBtn.setAttribute("seqIndex",i);
            document.getElementById('simulationControls').style.display = 'block';
            document.getElementById('graphTitle').innerHTML = `Simulation of Firing Sequence ${i+1}`;
            document.getElementById('simSubtitle').style.display = 'block';
            dotIndex = 0;
            document.getElementById('simSubtitle').innerHTML = `Timestep ${dotIndex} of ${firSeqList[i].length-1}`;
            document.getElementById('simulationLog').innerHTML = fireSeqLogList[i][dotIndex];
            document.getElementById('logSection').style.display = 'block';
            renderGraph(firSeqList[i][dotIndex]);
          });
      });
    }
  });
});

const container = document.querySelector('.export-container');
const exportBtn = document.getElementById('exportBtn');

exportBtn.addEventListener('click', e => {
  e.stopPropagation();     // don’t let this click bubble up and immediately close it
  container.classList.toggle('open');
});

const toggleLogBtn = document.getElementById('toggleLogBtn');
const logPanel     = document.getElementById('logSection');

toggleLogBtn.addEventListener('click', e => {
  e.stopPropagation();
  logPanel.style.display = 
    logPanel.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', () => {
  container.classList.remove('open');
  // logPanel.style.display = 'none';
})

// prevent clicks *inside* the panel from bubbling up
logPanel.addEventListener('click', e => e.stopPropagation());

document.getElementById('exportSection').addEventListener('click', e => e.stopPropagation());

document.getElementById('outputPN').addEventListener('click', () => {
  renderGraph(pnOutputDot);
  document.getElementById('graphTitle').innerHTML = "PN Output";
  document.getElementById('reportSection').style.display = 'none';
  logPanel.style.display = 'none';
  document.getElementById('simulationControls').style.display = 'none';
  document.getElementById('simSubtitle').style.display = 'none';
});

document.getElementById('inputRDLT').addEventListener('click', () => {
  renderGraph(rdltInputDot);
  document.getElementById('graphTitle').innerHTML = "RDLT Input";
  document.getElementById('reportSection').style.display = 'none';
  logPanel.style.display = 'none';
  document.getElementById('simulationControls').style.display = 'none';
  document.getElementById('simSubtitle').style.display = 'none';
});

function renderSimulation(dotList,increment=1) {
  dotIndex = (dotIndex + increment + dotList.length) % dotList.length;
  let dot = dotList[dotIndex];
  renderGraph(dot);
}

function renderGraph(dot) {
  mainGraph
    .graphviz({ useWorker: false })
    .fit(true)
    .resetZoom()
    .renderDot(dot)
    .on("renderEnd", () => {
      // console.log(`Graph rendered and animated.`);
    });
  document.getElementById('dotOutput').textContent = dot;
}

function initRenderGraph(dot) {
  mainGraph
    .graphviz({ useWorker: false })
    .renderDot(dot)
    .on("end", () => {
      // console.log(`Graph rendered successfully.`);
      const svg = mainGraph.select("svg");
      // Setup zoom and pan
      const zoom = d3.zoom().on("zoom", (event) => {
        svg.select('g').attr('transform', event.transform);
      });
      svg.call(zoom);
      // Make SVG responsive
      svg.attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid meet");
    });
  document.getElementById('dotOutput').textContent = dot;
}

async function handleExport(format) {
  const title = document.getElementById('graphTitle').textContent.trim();
  const simEl = document.getElementById('simSubtitle');
  let subtitle = '';
  if (simEl && window.getComputedStyle(simEl).display !== 'none') {
    subtitle = simEl.textContent.trim().replace(/\s+/g, '_');
  }
  let base = title;
  if (subtitle) base += `_${subtitle}`;
  base = base.replace(/[^\w\-]+/g, '_');
  const filename = `${base}.${format}`;

  // 1) DOT: just download the raw .dot text
  if (format === 'dot') {
    const dotText = document.getElementById('dotOutput').textContent;
    const blob = new Blob([dotText], { type: 'text/plain' });
    downloadBlob(blob, `${filename}`);
    return;
  }

  // 2) Grab the SVG element
  const svgEl = document.querySelector('#d3graph svg');
  if (!svgEl) {
    return alert('No SVG found to export!');
  }

  // Serialize it
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);

  if (format === 'svg') {
    // 3) SVG download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${filename}`);
    return;
  }

  if (format === 'png') {
    // 4) PNG download via canvas
    // Create an image from the SVG string
    const img = new Image();
    // Inline SVG data URI
    const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    img.src = svgData;

    img.onload = () => {
      // Size canvas to SVG’s viewBox or bounding box
      const viewBox = svgEl.viewBox.baseVal;
      const width  = viewBox && viewBox.width  ? viewBox.width  : svgEl.clientWidth;
      const height = viewBox && viewBox.height ? viewBox.height : svgEl.clientHeight;

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Draw the SVG onto it
      ctx.drawImage(img, 0, 0, width, height);

      // Export as PNG
      canvas.toBlob(blob => {
        downloadBlob(blob, `${filename}`);
      }, 'image/png');
    };

    img.onerror = () => {
      alert('Failed to load SVG data for PNG export.');
    };

    return;
  }

  alert(`Unsupported format: ${format}`);
}

// Helper to trigger download of a blob
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// Attach event listeners to export buttons.
document.querySelectorAll('.exportOptBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const format = btn.dataset.format;  // "svg", "png", or "dot"
    handleExport(format);
  });
});
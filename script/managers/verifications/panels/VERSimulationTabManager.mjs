import { buildArcTagElement, buildElement } from "../../../utils.mjs";

const TYPE_LABELS = {
  TIME_STEP_CONFLICT: 'Time-step conflict',
  CONSTRAINT_CLASH:   'Constraint clash',
  L_BOUND_EXCEEDED:   'L-bound exceeded',
};

export default class VERSimulationTabManager {
  #parentManager;
  #rootElement;
  #nav = { stepLabel: null, rows: [] };

  constructor(parentManager, rootElement) {
    this.#parentManager = parentManager;
    this.#rootElement = rootElement;
  }

  updateStep(t, max) {
    const { stepLabel, rows } = this.#nav;
    if (stepLabel) stepLabel.textContent = `t = ${t} / ${max}`;
    rows.forEach((row, i) => {
      const active = i + 1 === t;
      row.classList.toggle('active', active);
      if (active) row.scrollIntoView({ block: 'nearest' });
    });
  }

  display(simulation) {
    this.#rootElement.innerHTML = '';
    this.#nav = { stepLabel: null, rows: [] };

    const header = buildElement('header');
    header.appendChild(buildElement('h2', {}, ['Impedance-freeness Simulation']));
    this.#rootElement.appendChild(header);

    if (!simulation || simulation.skipped || simulation.error) {
      const msg = simulation?.skipped
        ? `Simulation skipped: ${simulation.reason}`
        : simulation?.error
          ? `Simulation error: ${simulation.message}`
          : 'No simulation data available.';
      this.#rootElement.appendChild(
        buildElement('p', { style: 'padding:12px;color:#6b7280;font-size:13px;' }, [msg])
      );
      return;
    }

    const trace = simulation.trace ?? [];

    const chip = buildElement('div', {
      classname: 'status-chip' + (simulation.separable ? ' passed' : ''),
    });
    chip.appendChild(buildElement('div', { classname: 'status-title' }, [
      simulation.separable ? 'Impedance-free' : 'Not impedance-free',
    ]));
    chip.appendChild(buildElement('div', { classname: 'status-description' }, [
      simulation.separable
        ? 'The composite activity completed without impedances.'
        : `${simulation.summary.totalImpedances} impedance(s) detected across ${simulation.kPrime} time step(s).`,
    ]));
    this.#rootElement.appendChild(chip);

    const summaryBody = buildElement('tbody');
    [
      ["Time steps (k′)", simulation.kPrime],
      ['Total impedances',     simulation.summary.totalImpedances],
      ['Time-step conflicts',  simulation.summary.timeStepConflicts],
      ['Constraint clashes',   simulation.summary.constraintClashes],
      ['L-bound violations',   simulation.summary.lBoundViolations],
    ].forEach(([label, value]) => {
      summaryBody.appendChild(buildElement('tr', {}, [
        buildElement('td', {}, [label]),
        buildElement('td', {}, [String(value)]),
      ]));
    });
    this.#rootElement.appendChild(
      buildElement('div', { classname: 'collapsible' }, [
        buildElement('header', {}, ['Summary']),
        buildElement('main', {}, [buildElement('table', {}, [summaryBody])]),
      ])
    );

    const allImpedances = simulation.allImpedances ?? [];
    if (allImpedances.length > 0) {
      const thead = buildElement('thead');
      thead.appendChild(buildElement('tr', {}, [
        buildElement('th', {}, ['Arc']),
        buildElement('th', {}, ['Type']),
        buildElement('th', {}, ['Step']),
      ]));
      const tbody = buildElement('tbody');
      const seen = new Set();
      allImpedances.forEach(imp => {
        const key = `${imp.arc}::${imp.type}::${imp.t}`;
        if (seen.has(key)) return;
        seen.add(key);
        const [fromId, toId] = this.#resolveArcKey(imp.arc);
        tbody.appendChild(buildElement('tr', {}, [
          buildElement('td', {}, [buildArcTagElement(fromId, toId)]),
          buildElement('td', {}, [TYPE_LABELS[imp.type] ?? imp.type]),
          buildElement('td', {}, [`t=${imp.t}`]),
        ]));
      });
      this.#rootElement.appendChild(
        buildElement('div', { classname: 'collapsible' }, [
          buildElement('header', {}, ['Impedances']),
          buildElement('main', {}, [buildElement('table', {}, [thead, tbody])]),
        ])
      );
    }

    const traversalCount = simulation.traversalCount ?? {};
    const lBoundByArc    = {};
    (simulation.lBoundImpedances ?? []).forEach(imp => {
      lBoundByArc[imp.arc] = imp.L_R;
    });

    const tcEntries = Object.entries(traversalCount).sort((a, b) => b[1] - a[1]);
    if (tcEntries.length > 0) {
      const thead = buildElement('thead');
      thead.appendChild(buildElement('tr', {}, [
        buildElement('th', {}, ['Arc']),
        buildElement('th', {}, ['Traversals']),
      ]));
      const tbody = buildElement('tbody');
      tcEntries.forEach(([arcKey, count]) => {
        const [fromId, toId] = this.#resolveArcKey(arcKey);
        const L_R = lBoundByArc[arcKey];
        const countText = (L_R != null && count > L_R) ? `${count} (L=${L_R})` : String(count);
        tbody.appendChild(buildElement('tr', {}, [
          buildElement('td', {}, [buildArcTagElement(fromId, toId)]),
          buildElement('td', {}, [countText]),
        ]));
      });
      this.#rootElement.appendChild(
        buildElement('div', { classname: 'collapsible' }, [
          buildElement('header', {}, ['Traversal Counts']),
          buildElement('main', {}, [buildElement('table', {}, [thead, tbody])]),
        ])
      );
    }

    if (trace.length > 0) {
      const stepLabel = buildElement('span', {
        style: 'font-size:13px;font-weight:600;min-width:80px;text-align:center;'
      }, [`- / ${trace.length}`]);
      const prevBtn = buildElement('button', {
        style: 'padding:4px 8px;font-size:16px;cursor:pointer;line-height:1;'
      }, ['◀']);
      const nextBtn = buildElement('button', {
        style: 'padding:4px 8px;font-size:16px;cursor:pointer;line-height:1;'
      }, ['▶']);
      prevBtn.addEventListener('click', () => this.#parentManager.prevSimulationStep());
      nextBtn.addEventListener('click', () => this.#parentManager.nextSimulationStep());
      const navBar = buildElement('div', {
        style: 'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #e5e7eb;'
      }, [prevBtn, stepLabel, nextBtn]);
      this.#nav.stepLabel = stepLabel;

      const thead = buildElement('thead');
      thead.appendChild(buildElement('tr', {}, [
        buildElement('th', {}, ['Timestep']),
        buildElement('th', {}, ['Traversed Arcs']),
        buildElement('th', {}, ['']),
      ]));
      const tbody = buildElement('tbody');
      const rows = [];

      trace.forEach(stepLog => {
        const realArcs = (stepLog.arcs ?? []).filter(
          a => a.type !== 'seam'
        );
        const seamArc    = (stepLog.arcs ?? []).find(a => a.type === 'seam');
        const isSeamStep = seamArc != null;
        const arcCells = realArcs.length
          ? realArcs.map(a => {
              const [fromId, toId] = this.#resolveArcKey(a.key);
              const arcTag = buildArcTagElement(fromId, toId);
              if (a.masIndex == null) return arcTag;
              const badge = buildElement('span', {
                style: 'font-size:11px;color:#6b7280;white-space:nowrap;'
              }, [`MAS ${a.masIndex}`]);
              return buildElement('span', {
                style: 'display:inline-flex;align-items:center;gap:4px;'
              }, [arcTag, badge]);
            })
          : isSeamStep
            ? (() => {
                const masLabel = (seamArc.masFrom != null && seamArc.masTo != null)
                  ? `MAS ${seamArc.masFrom} → MAS ${seamArc.masTo}`
                  : 'loop back';
                return [buildElement('span', {
                  style: 'color:#3a81de;font-style:italic;font-size:12px;'
                }, [`↺ ${masLabel}`])];
              })()
            : [buildElement('span', { style: 'color:#9ca3af' }, ['—'])];

        const hasImpedance = (stepLog.impedances ?? []).length > 0;
        const flagCell = buildElement('td', {
          style: hasImpedance ? 'color:#ef4444;text-align:center;' : ''
        }, [hasImpedance ? '⚠' : '']);

        const rowClass = 'sim-trace-row' + (hasImpedance ? ' impedance' : '');
        const row = buildElement('tr', { classname: rowClass, style: 'cursor:pointer;' }, [
          buildElement('td', {}, [`${stepLog.t}`]),
          buildElement('td', {}, arcCells),
          flagCell,
        ]);
        row.addEventListener('click', () => this.#parentManager.setSimulationTimestep(stepLog.t));
        rows.push(row);
        tbody.appendChild(row);
      });

      const tableWrapper = buildElement('div', {
        style: 'max-height:200px;overflow-y:auto;'
      }, [buildElement('table', {}, [thead, tbody])]);

      this.#rootElement.appendChild(
        buildElement('div', { classname: 'collapsible' }, [
          buildElement('header', {}, ['Composite Activity Simulation']),
          buildElement('main', {}, [navBar, tableWrapper]),
        ])
      );

      this.#nav.rows = rows;
    }
  }

  #resolveArcKey(arcKey) {
    const [fromStr, toStr] = (arcKey ?? '').split('->');
    const fromUID = fromStr && !isNaN(Number(fromStr)) ? Number(fromStr) : fromStr;
    const toUID   = toStr   && !isNaN(Number(toStr))   ? Number(toStr)   : toStr;
    return [
      this.#parentManager.getVertexIdentifier(fromUID) || fromStr || '?',
      this.#parentManager.getVertexIdentifier(toUID)   || toStr   || '?',
    ];
  }
}

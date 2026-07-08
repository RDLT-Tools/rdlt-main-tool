
export function evaluateSeparabilityForRi({
  Ri,       // EVSA RDLT (R1′ or R2′) — both bounds reference this
  masList   // MAS list derived from This Ri
}) {
  if (!Ri || !Array.isArray(Ri.arcs)) {
    throw new Error('evaluateSeparabilityForRi: Ri must be an EVSA RDLT with an arcs array');
  }
  if (!Array.isArray(masList)) {
    throw new Error('evaluateSeparabilityForRi: masList must be an array');
  }

  const L_Ri  = new Map();   // Ri arc auid → L(Ri)   (upper bound cap)
  const eRU_i = new Map();   // Ri arc auid → eRU(Ri) (lower bound floor)
  const SUM   = new Map();   // Ri arc auid → Σ L(MASk)

  Ri.arcs.forEach(a => {
    L_Ri.set(a.auid,  Number(a.l   ?? 0));
    eRU_i.set(a.auid, Number(a.eRU ?? 0));
    SUM.set(a.auid,   0);
  });

  masList.forEach((masObj, masIdx) => {
    const RMAS = masObj.rdlt;
    if (!RMAS || !Array.isArray(RMAS.arcs)) return;

    RMAS.arcs.forEach(a => {
      const l = Number(a.l ?? 0);
      if (l === 0) return;

      if (!SUM.has(a.auid)) {
        console.warn(
          `evaluateSeparabilityForRi: MAS-${masIdx + 1} arc "${a.auid}" ` +
          `(${a.from}→${a.to}) has no matching arc in Ri. Skipped.`
        );
        return;
      }

      SUM.set(a.auid, SUM.get(a.auid) + l);
    });
  });

  const upperViolations = [];

  SUM.forEach((used, auid) => {
    const cap = L_Ri.get(auid) ?? 0;
    if (used > cap) {
      upperViolations.push({
        arc:     auid,
        L_Ri:    cap,
        SUM_MAS: used
      });
    }
  });

  const lowerViolations = [];

  eRU_i.forEach((eru, auid) => {
    if (eru === 0) return;  // arc carries no eRU obligation
    const used = SUM.get(auid) ?? 0;
    if (used < eru) {
      lowerViolations.push({
        arc:     auid,
        eRU:     eru,
        SUM_MAS: used
      });
    }
  });

  const separable =
    upperViolations.length === 0 &&
    lowerViolations.length === 0;

  return {
    riId: Ri._evsa?.center ?? Ri._evsa?.id ?? '(unknown Ri)',
    separable,
    upperViolations,
    lowerViolations,
    summary: {
      riArcCount: L_Ri.size,
      masCount:   masList.length,
      sum:        Object.fromEntries(SUM),   // Σ L(MASk) per Ri arc
      L_Ri:       Object.fromEntries(L_Ri),  // upper bound caps
      eRU:        Object.fromEntries(eRU_i)  // lower bound floors
    }
  };
}
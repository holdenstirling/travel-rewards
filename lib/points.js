// HubMath — the Hub's pure business logic, extracted for testability.
// Loaded in the browser as window.HubMath; require()-able in Node for tests.
(function (global) {
  // [econFlight$, econPts_k, bizFlight$, bizPts_k, pathLabel, fundingPrograms]
  const REGION_FLIGHTS = {
    domestic: [300, 25, 800, 50, "UR portal or United", ["UR", "United"]],
    mexico: [450, 35, 1400, 70, "United or UR→Aeroplan", ["United", "UR"]],
    europe: [900, 60, 3500, 110, "MR/UR→Flying Blue or Virgin; Iberia off-peak", ["MR", "UR"]],
    asia: [1100, 70, 4200, 85, "MR→ANA (75–85k RT biz)", ["MR"]],
    southam: [800, 60, 2800, 126, "MR→LifeMiles (63k/leg, no surcharges)", ["MR"]],
    oceania: [1400, 80, 5500, 160, "MR/UR→Aeroplan", ["MR", "UR"]],
    africa: [1200, 80, 4500, 140, "MR→Aeroplan or Flying Blue", ["MR"]]
  };
  // style: [lodging/night/room, food/person/day, activities/person/day]
  const STYLE_RATES = { budget: [45, 30, 20], mid: [140, 70, 60], comfort: [300, 150, 120] };
  const MIN_DAYS = { domestic: 2, mexico: 4, europe: 7, asia: 9, southam: 10, oceania: 10, africa: 9 };

  // Full trip estimate with component breakdown. t: {region, style, cabin, pax, days}
  function estimate(t) {
    const f = REGION_FLIGHTS[t.region], s = STYLE_RATES[t.style];
    const flightCash = (t.cabin === "biz" ? f[2] : f[0]) * t.pax;
    const flightPts = (t.cabin === "biz" ? f[3] : f[1]) * 1000 * t.pax;
    const rooms = Math.ceil(t.pax / 2);
    const lodging = s[0] * rooms * t.days, food = s[1] * t.pax * t.days, act = s[2] * t.pax * t.days;
    const ground = lodging + food + act;
    return { flightCash, flightPts, ground, allCash: flightCash + ground, path: f[4], progs: f[5],
      rooms, lodging, food, act, perFlight: (t.cabin === "biz" ? f[2] : f[0]), perPts: (t.cabin === "biz" ? f[3] : f[1]), rates: s };
  }

  // "85k" → 85000, "1,500" → 1500, "$12k " → 12000
  function parsePoints(raw) {
    const s = String(raw ?? "").trim().replace(/[$,\s]/g, "");
    const k = /k$/i.test(s);
    const v = parseFloat(s) || 0;
    return Math.round(v * (k ? 1000 : 1));
  }

  // cents-per-point. platinumOffset: paying cash on Platinum earns 5x MR ≈ 10% back,
  // so cash is effectively 10% cheaper when comparing against points.
  function cpp(cash, fees, pts, platinumOffset) {
    if (!pts) return 0;
    return ((platinumOffset ? cash * 0.9 : cash) - (fees || 0)) / pts * 100;
  }

  // Holden's standing bars: <1.5¢ cash · 1.5–2¢ borderline · ≥2¢ points
  function verdict(c) { return c >= 2 ? "points" : c >= 1.5 ? "borderline" : "cash"; }

  // Credit-cycle periods. kind: month|quarter|half|year. now optional for tests.
  function periodInfo(kind, now) {
    const n = now || new Date(), y = n.getFullYear(), m = n.getMonth();
    if (kind === "month") return { id: `${y}-${String(m + 1).padStart(2, "0")}`, end: new Date(y, m + 1, 0), start: new Date(y, m, 1), label: "this month" };
    if (kind === "quarter") { const q = Math.floor(m / 3); return { id: `${y}-Q${q + 1}`, end: new Date(y, q * 3 + 3, 0), start: new Date(y, q * 3, 1), label: `Q${q + 1}` }; }
    if (kind === "half") { const h = m < 6 ? 0 : 1; return { id: `${y}-H${h + 1}`, end: new Date(y, h ? 12 : 6, 0), start: new Date(y, h ? 6 : 0, 1), label: h ? "2nd half" : "1st half" }; }
    return { id: `${y}`, end: new Date(y, 12, 0), start: new Date(y, 0, 1), label: `${y}` };
  }

  const api = { REGION_FLIGHTS, STYLE_RATES, MIN_DAYS, estimate, parsePoints, cpp, verdict, periodInfo };
  global.HubMath = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

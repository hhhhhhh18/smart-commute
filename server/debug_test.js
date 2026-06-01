// Run this file directly with: node debug_test.js
// Place it in your backend root folder and run to see exactly what's happening

const { buildMetroInfo } = require("./services/costService");

console.log("=== METRO DEBUG TEST ===\n");

// Test 1: Exact strings that would come from the frontend
const testCases = [
  { from: "LB Nagar Metro Station", to: "Punjagutta", fromCoords: { lat: 17.3463, lon: 78.5538 }, toCoords: { lat: 17.4318, lon: 78.4496 } },
  { from: "lb nagar metro station", to: "Punjagutta", fromCoords: { lat: 17.3463, lon: 78.5538 }, toCoords: { lat: 17.4318, lon: 78.4496 } },
  { from: "LB Nagar",               to: "Punjagutta", fromCoords: { lat: 17.3463, lon: 78.5538 }, toCoords: { lat: 17.4318, lon: 78.4496 } },
  // With bad coords (what Nominatim returns for LB Nagar area)
  { from: "LB Nagar Metro Station", to: "Punjagutta", fromCoords: { lat: 17.3469, lon: 78.5526 }, toCoords: { lat: 17.4318, lon: 78.4496 } },
  { from: "LB Nagar Metro Station", to: "Punjagutta", fromCoords: null, toCoords: { lat: 17.4318, lon: 78.4496 } },
];

testCases.forEach((tc, i) => {
  console.log(`--- Test ${i+1}: from="${tc.from}" ---`);
  try {
    const result = buildMetroInfo(tc.from, tc.to, tc.fromCoords, tc.toCoords);
    if (result) {
      console.log(`  fromStation: "${result.fromStation}"`);
      console.log(`  toStation:   "${result.toStation}"`);
      console.log(`  walkToBoard: "${result.walkToBoard}"`);
      console.log(`  RESULT: ${result.fromStation === "LB Nagar" ? "✅ CORRECT" : "❌ WRONG (expected LB Nagar)"}`);
    } else {
      console.log("  result: null (metro not available)");
    }
  } catch(e) {
    console.log("  ERROR:", e.message);
  }
  console.log();
});
// End-to-End-Test der API gegen einen laufenden Server.
//   npm run dev   (oder npm run build && npm start)
//   node scripts/smoke-test.mjs [http://localhost:3000]
// Legt Testdaten an und räumt sie am Ende wieder auf.

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
let passed = 0;
let failed = 0;

function check(name, condition, extra) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra ?? "");
  }
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const stamp = Date.now();
const diveBody = (over = {}) => ({
  date: "2026-09-26",
  startTime: "09:30",
  diveNumber: null,
  siteName: `Test Reef ${stamp}`,
  location: "Test Bay",
  country: "Testland",
  latitude: -25.5,
  longitude: 32.9,
  maxDepth: 18.2,
  avgDepth: 12.1,
  duration: 50,
  waterTemperature: 23,
  visibility: 15,
  current: "Light",
  favorite: false,
  ...over,
});

async function main() {
  console.log(`Smoke test against ${BASE}\n`);

  console.log("Dives – CRUD & validation");
  const a = await call("POST", "/api/dives", diveBody());
  check("create dive → 201", a.status === 201 && a.data?.id, a);
  const b = await call("POST", "/api/dives", diveBody({ date: "2026-09-27", siteName: `Test Wall ${stamp}` }));
  check("create 2nd dive → 201", b.status === 201);
  const diveA = a.data.id;
  const diveB = b.data.id;

  const invalid = await call("POST", "/api/dives", diveBody({ maxDepth: -3, duration: -1, latitude: 120, date: "2026-02-31", siteName: "" }));
  const fe = invalid.data?.error?.details?.fieldErrors ?? {};
  check("invalid dive → 400", invalid.status === 400, invalid);
  check("negative depth rejected", !!fe.maxDepth);
  check("negative duration rejected", !!fe.duration);
  check("latitude > 90 rejected", !!fe.latitude);
  check("invalid date rejected", !!fe.date);
  check("empty dive site rejected", !!fe.siteName);

  const got = await call("GET", `/api/dives/${diveA}`);
  check("get dive", got.status === 200 && got.data.site.name === `Test Reef ${stamp}`);
  const upd = await call("PUT", `/api/dives/${diveA}`, diveBody({ maxDepth: 21.4, notes: "Updated" }));
  check("update dive", upd.status === 200);
  const got2 = await call("GET", `/api/dives/${diveA}`);
  check("update persisted", got2.data.maxDepth === 21.4 && got2.data.notes === "Updated");
  check("unknown dive → 404", (await call("GET", "/api/dives/does-not-exist")).status === 404);

  console.log("\nFavorites");
  const fav = await call("PATCH", `/api/dives/${diveA}/favorite`, { favorite: true });
  check("mark favorite", fav.status === 200 && fav.data.favorite === true);
  const favList = await call("GET", "/api/dives?favorite=1");
  check("appears in favorites filter", favList.data.dives.some((d) => d.id === diveA));
  await call("PATCH", `/api/dives/${diveA}/favorite`, { favorite: false });
  const favList2 = await call("GET", "/api/dives?favorite=1");
  check("unfavorite removes it", !favList2.data.dives.some((d) => d.id === diveA));

  console.log("\nSearch & filters");
  const search = await call("GET", `/api/dives?q=${encodeURIComponent(`Test Wall ${stamp}`)}`);
  check("search by site", search.data.dives.length === 1 && search.data.dives[0].id === diveB);
  const byCountry = await call("GET", "/api/dives?country=Testland&minDepth=20");
  check("filter country + min depth", byCountry.data.dives.length === 1 && byCountry.data.dives[0].id === diveA);

  console.log("\nSpecies");
  const sci = `Testus mantus${stamp}`;
  const sp = await call("POST", "/api/species", { commonName: `Test Manta ${stamp}`, scientificName: sci, category: "Ray" });
  check("create species → 201", sp.status === 201 && sp.data.slug, sp);
  const dup = await call("POST", "/api/species", { commonName: "Another name", scientificName: sci.toUpperCase(), category: "Ray" });
  check("duplicate scientific name (case-insensitive) → 409", dup.status === 409, dup);
  check("empty common name → 400", (await call("POST", "/api/species", { commonName: " ", category: "Fish" })).status === 400);
  const hammer = await call("GET", "/api/species?search=hammer");
  check("search 'hammer' finds hammerheads", hammer.data.species.filter((s) => /hammer/i.test(s.commonName)).length >= 3);
  const speciesId = sp.data.id;

  console.log("\nSightings & life list");
  const s1 = await call("POST", "/api/sightings", { diveId: diveA, speciesId, count: 3, notes: "Large school at around 18m." });
  check("add sighting to dive A", s1.status === 201);
  const s2 = await call("POST", "/api/sightings", { diveId: diveB, speciesId, count: 1 });
  check("add same species to dive B", s2.status === 201);
  const again = await call("POST", "/api/sightings", { diveId: diveA, speciesId, count: 4 });
  check("re-adding to same dive updates instead of duplicating", again.status === 200 && again.data.created === false);

  let life = await call("GET", "/api/species?view=seen");
  let entries = life.data.species.filter((s) => s.id === speciesId);
  check("species appears exactly once in life list", entries.length === 1);
  check("species has 2 sightings", entries[0]?.sightingCount === 2, entries[0]);
  const detail = await call("GET", `/api/species/${speciesId}`);
  check("species detail: first seen = dive A", detail.data.firstSeen?.diveId === diveA);
  check("species detail: last seen = dive B", detail.data.lastSeen?.diveId === diveB);
  check("species detail: count on dive A updated to 4", detail.data.sightings.find((x) => x.dive.id === diveA)?.count === 4);

  console.log("\nDeleting dives");
  const delB = await call("DELETE", `/api/dives/${diveB}`);
  check("delete dive B", delB.status === 200 && delB.data.deletedSightings === 1);
  const sightingsB = await call("GET", `/api/sightings?diveId=${diveB}`);
  check("sightings of dive B are gone", sightingsB.data.sightings.length === 0);
  life = await call("GET", "/api/species?view=seen");
  entries = life.data.species.filter((s) => s.id === speciesId);
  check("species still in life list with 1 sighting", entries.length === 1 && entries[0].sightingCount === 1);

  await call("DELETE", `/api/dives/${diveA}`);
  life = await call("GET", "/api/species?view=seen");
  check("species leaves life list after last sighting's dive is deleted", !life.data.species.some((s) => s.id === speciesId));
  const all = await call("GET", "/api/species?view=all");
  check("species stays in catalog", all.data.species.some((s) => s.id === speciesId));

  console.log("\nImport pipeline (JSON importer)");
  const ext = `ext-${stamp}`;
  const importPayload = (maxDepth, notes) => [
    {
      externalId: ext,
      date: "2026-09-20",
      startTime: "10:00",
      site: { name: `Import Reef ${stamp}`, country: "Testland", externalId: `site-${stamp}` },
      maxDepth,
      duration: 40,
      notes,
      sightings: [{ commonName: `Test Manta ${stamp}`, scientificName: sci, count: 2 }],
    },
  ];
  const imp1 = await call("POST", "/api/import/json", importPayload(15, "first"));
  check("first import creates dive", imp1.data?.created === 1, imp1);
  const imp2 = await call("POST", "/api/import/json", importPayload(15, "first"));
  check("re-import does not duplicate", imp2.data?.created === 0 && imp2.data?.skipped === 1, imp2);
  const imported = (await call("GET", `/api/dives?q=${encodeURIComponent(`Import Reef ${stamp}`)}`)).data.dives;
  check("exactly one imported dive", imported.length === 1);
  const importedId = imported[0].id;
  const importedDetail = (await call("GET", `/api/dives/${importedId}`)).data;
  check("imported sighting linked to existing species", importedDetail.sightings[0]?.species.id === speciesId);

  // Manuelle Änderung → darf vom Sync nicht überschrieben werden
  await call("PUT", `/api/dives/${importedId}`, {
    ...diveBody({ siteName: `Import Reef ${stamp}`, location: null, latitude: null, longitude: null, date: "2026-09-20", startTime: "10:00" }),
    maxDepth: 17.5,
    duration: 40,
    notes: "first",
    avgDepth: null,
    waterTemperature: null,
    visibility: null,
    current: null,
  });
  const imp3 = await call("POST", "/api/import/json", importPayload(99, "changed at source"));
  const afterSync = (await call("GET", `/api/dives/${importedId}`)).data;
  check("sync updates untouched fields", afterSync.notes === "changed at source", afterSync.notes);
  check("sync keeps manually edited field", afterSync.maxDepth === 17.5, afterSync.maxDepth);
  check("sync reported update", imp3.data?.updated === 1, imp3.data);
  const bad = await call("POST", "/api/import/json", [{ date: "x" }]);
  check("invalid import record is skipped & reported", bad.data?.errors?.length === 1);

  console.log("\nCleanup");
  await call("DELETE", `/api/dives/${importedId}`);
  const delSp = await call("DELETE", `/api/species/${speciesId}`);
  check("delete species", delSp.status === 200);
  check("species gone", (await call("GET", `/api/species/${speciesId}`)).status === 404);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

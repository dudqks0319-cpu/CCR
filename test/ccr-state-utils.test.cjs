const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPdfFileName,
  createStateEnvelope,
  getHolidayTogglePresentation,
  mergeSettingsWithDefault,
  pickLatestStateEnvelope,
  shouldApplyServerEnvelope,
} = require("../ccr-state-utils.js");

const DEFAULT_SETTINGS = {
  dayShiftStart: "2026-01-05",
  nightShiftStart: "2026-01-12",
  teams: {
    conveyor: ["A"],
    robot: ["B"],
  },
  ccrStartWorkers: {
    day: { day1am: "A", day1pm: "B" },
    night: { day1am: "", day1pm: "" },
  },
};

test("buildPdfFileName pads month and includes Korean format", () => {
  assert.equal(buildPdfFileName(2026, 3), "CCR_2026년_03월.pdf");
});

test("holiday toggle presentation swaps check/x labels per updated UX", () => {
  assert.deepEqual(getHolidayTogglePresentation(true), {
    classes: "toggle-btn holiday-toggle on",
    label: "❌ 휴일 (빨간날)",
    stateClass: "on",
  });

  assert.deepEqual(getHolidayTogglePresentation(false), {
    classes: "toggle-btn holiday-toggle off",
    label: "✅ 일반 근무일",
    stateClass: "off",
  });
});

test("mergeSettingsWithDefault preserves defaults for missing nested keys", () => {
  const merged = mergeSettingsWithDefault(DEFAULT_SETTINGS, {
    teams: { conveyor: ["X", "Y"] },
    ccrStartWorkers: { day: { day1am: "Z" } },
  });

  assert.deepEqual(merged.teams.conveyor, ["X", "Y"]);
  assert.deepEqual(merged.teams.robot, ["B"]);
  assert.equal(merged.ccrStartWorkers.day.day1am, "Z");
  assert.equal(merged.ccrStartWorkers.day.day1pm, "B");
  assert.equal(merged.ccrStartWorkers.night.day1pm, "");
});

test("pickLatestStateEnvelope chooses newest updatedAt and normalizes payload", () => {
  const oldEnvelope = {
    settings: { dayShiftStart: "2025-01-01" },
    calendarData: { a: 1 },
    updatedAt: 100,
  };

  const newEnvelope = {
    settings: { dayShiftStart: "2026-02-01" },
    calendarData: { b: 2 },
    updatedAt: 200,
  };

  const picked = pickLatestStateEnvelope([
    null,
    oldEnvelope,
    undefined,
    newEnvelope,
  ], DEFAULT_SETTINGS);

  assert.equal(picked.updatedAt, 200);
  assert.equal(picked.settings.dayShiftStart, "2026-02-01");
  assert.deepEqual(picked.calendarData, { b: 2 });
  assert.deepEqual(picked.settings.teams.robot, ["B"]);
});

test("createStateEnvelope keeps explicit zero updatedAt for bootstrap/server compare", () => {
  const envelope = createStateEnvelope({ a: 1 }, { b: 2 }, 0);
  assert.equal(envelope.updatedAt, 0);
  assert.deepEqual(envelope.settings, { a: 1 });
  assert.deepEqual(envelope.calendarData, { b: 2 });
});

test("shouldApplyServerEnvelope uses timestamp-first policy with safe bootstrap fallback", () => {
  // 서버가 최신이면 항상 반영
  assert.equal(shouldApplyServerEnvelope(100, 200, true), true);

  // 로컬 히스토리가 있으면 서버가 오래된 경우 반영하지 않음
  assert.equal(shouldApplyServerEnvelope(200, 100, true), false);

  // 로컬 히스토리가 없는 첫 부팅이면 서버 스냅샷 반영
  assert.equal(shouldApplyServerEnvelope(0, 100, false), true);
});

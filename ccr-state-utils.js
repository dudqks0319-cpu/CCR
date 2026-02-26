(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CCRStateUtils = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function deepClone(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function mergeSettingsWithDefault(defaultSettings, savedSettings) {
    const base = deepClone(defaultSettings || {}) || {};
    if (!isPlainObject(savedSettings)) return base;

    const merged = {
      ...base,
      ...savedSettings,
    };

    merged.teams = {
      ...(isPlainObject(base.teams) ? base.teams : {}),
      ...(isPlainObject(savedSettings.teams) ? savedSettings.teams : {}),
    };

    merged.cTeams = {
      ...(isPlainObject(base.cTeams) ? base.cTeams : {}),
      ...(isPlainObject(savedSettings.cTeams) ? savedSettings.cTeams : {}),
    };

    merged.cTeamByMonth = {
      ...(isPlainObject(base.cTeamByMonth) ? base.cTeamByMonth : {}),
      ...(isPlainObject(savedSettings.cTeamByMonth)
        ? savedSettings.cTeamByMonth
        : {}),
    };

    const baseStart = isPlainObject(base.ccrStartWorkers)
      ? base.ccrStartWorkers
      : {};
    const savedStart = isPlainObject(savedSettings.ccrStartWorkers)
      ? savedSettings.ccrStartWorkers
      : {};

    merged.ccrStartWorkers = {
      day: {
        ...(isPlainObject(baseStart.day) ? baseStart.day : {}),
        ...(isPlainObject(savedStart.day) ? savedStart.day : {}),
      },
      night: {
        ...(isPlainObject(baseStart.night) ? baseStart.night : {}),
        ...(isPlainObject(savedStart.night) ? savedStart.night : {}),
      },
    };

    return merged;
  }

  function normalizeStateEnvelope(raw, defaultSettings) {
    if (!isPlainObject(raw)) return null;

    const settings = mergeSettingsWithDefault(defaultSettings, raw.settings);
    const calendarData = isPlainObject(raw.calendarData) ? raw.calendarData : {};
    const updatedAt = Number(raw.updatedAt) || 0;

    return {
      settings,
      calendarData,
      updatedAt,
    };
  }

  function pickLatestStateEnvelope(candidates, defaultSettings) {
    const list = Array.isArray(candidates) ? candidates : [candidates];
    const normalized = list
      .map((item) => normalizeStateEnvelope(item, defaultSettings))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (normalized.length > 0) return normalized[0];

    return {
      settings: mergeSettingsWithDefault(defaultSettings, null),
      calendarData: {},
      updatedAt: 0,
    };
  }

  function normalizeUpdatedAt(updatedAt) {
    if (updatedAt === undefined || updatedAt === null || updatedAt === "") {
      return Date.now();
    }
    const numeric = Number(updatedAt);
    return Number.isFinite(numeric) ? numeric : Date.now();
  }

  function createStateEnvelope(settings, calendarData, updatedAt) {
    return {
      settings: deepClone(settings || {}),
      calendarData: deepClone(calendarData || {}),
      updatedAt: normalizeUpdatedAt(updatedAt),
    };
  }

  function shouldApplyServerEnvelope(
    localUpdatedAt,
    serverUpdatedAt,
    hasLocalStateCandidate,
  ) {
    const local = Number(localUpdatedAt);
    const server = Number(serverUpdatedAt);
    const normalizedLocal = Number.isFinite(local) ? local : 0;
    const normalizedServer = Number.isFinite(server) ? server : 0;

    if (normalizedServer > normalizedLocal) return true;

    // 로컬 히스토리가 전혀 없는 첫 부팅인 경우에만 서버 스냅샷 채택
    if (!hasLocalStateCandidate && normalizedServer > 0) return true;

    return false;
  }

  function getHolidayTogglePresentation(isCustomHoliday) {
    const stateClass = isCustomHoliday ? "on" : "off";
    return {
      stateClass,
      classes: `toggle-btn holiday-toggle ${stateClass}`,
      label: isCustomHoliday ? "❌ 휴일 (빨간날)" : "✅ 일반 근무일",
    };
  }

  function buildPdfFileName(year, month) {
    return `CCR_${year}년_${String(month).padStart(2, "0")}월.pdf`;
  }

  return {
    deepClone,
    mergeSettingsWithDefault,
    normalizeStateEnvelope,
    normalizeUpdatedAt,
    pickLatestStateEnvelope,
    createStateEnvelope,
    shouldApplyServerEnvelope,
    getHolidayTogglePresentation,
    buildPdfFileName,
  };
});

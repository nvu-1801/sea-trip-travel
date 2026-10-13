import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MONTH_LABELS,
  WEEKDAY_FULL,
  buildMonthGrid,
  daysInMonth,
  formatDateWithWeekday,
  monthViewOf,
  parseIsoDate,
  sameDay,
  shiftDays,
  shiftMonthView,
  shiftMonths,
  toIsoDate,
  todayParts,
  weekdayIndexMonday,
} from "@/lib/date";

/**
 * Calendar arithmetic.
 *
 * The failure mode this file exists to catch is the off-by-one day: any
 * implementation that routes a date through `toISOString()`/`Date.UTC()` is
 * wrong either side of midnight depending on the machine's timezone, and it will
 * pass on the developer's machine and fail in production.
 */

describe("parseIsoDate", () => {
  it("parses a well-formed ISO date into local parts", () => {
    assert.deepEqual(parseIsoDate("2026-10-13"), { y: 2026, m: 9, d: 13 });
    assert.deepEqual(parseIsoDate("2026-01-01"), { y: 2026, m: 0, d: 1 });
  });

  it("returns null for empty, missing or malformed input", () => {
    assert.equal(parseIsoDate(""), null);
    assert.equal(parseIsoDate(undefined), null);
    assert.equal(parseIsoDate(null), null);
    assert.equal(parseIsoDate("13/10/2026"), null);
    assert.equal(parseIsoDate("2026-1-1"), null);
    assert.equal(parseIsoDate("2026-13-01"), null);
    assert.equal(parseIsoDate("2026-00-10"), null);
  });

  it("rejects days that do not exist in the month", () => {
    assert.equal(parseIsoDate("2026-02-30"), null);
    assert.equal(parseIsoDate("2026-04-31"), null);
    assert.deepEqual(parseIsoDate("2026-02-28"), { y: 2026, m: 1, d: 28 });
    // 2024 is a leap year.
    assert.deepEqual(parseIsoDate("2024-02-29"), { y: 2024, m: 1, d: 29 });
  });
});

describe("toIsoDate", () => {
  it("round-trips through parseIsoDate", () => {
    for (const iso of ["2026-01-01", "2026-10-13", "2024-02-29", "2026-12-31"]) {
      const parts = parseIsoDate(iso);
      assert.ok(parts);
      assert.equal(toIsoDate(parts), iso);
    }
  });

  it("zero-pads month and day", () => {
    assert.equal(toIsoDate({ y: 2026, m: 0, d: 5 }), "2026-01-05");
  });
});

describe("daysInMonth", () => {
  it("knows the month lengths, including leap February", () => {
    assert.equal(daysInMonth(2026, 0), 31);
    assert.equal(daysInMonth(2026, 1), 28);
    assert.equal(daysInMonth(2024, 1), 29);
    assert.equal(daysInMonth(2026, 3), 30);
    assert.equal(daysInMonth(2026, 11), 31);
  });

  it("handles a year boundary", () => {
    assert.equal(daysInMonth(2026, 11), 31);
  });
});

describe("shiftDays", () => {
  it("crosses month and year boundaries", () => {
    assert.equal(toIsoDate(shiftDays({ y: 2026, m: 9, d: 31 }, 1)), "2026-11-01");
    assert.equal(toIsoDate(shiftDays({ y: 2025, m: 11, d: 31 }, 1)), "2026-01-01");
    assert.equal(toIsoDate(shiftDays({ y: 2026, m: 0, d: 1 }, -1)), "2025-12-31");
  });

  it("walks into leap day and out of it", () => {
    assert.equal(toIsoDate(shiftDays({ y: 2024, m: 1, d: 28 }, 1)), "2024-02-29");
    assert.equal(toIsoDate(shiftDays({ y: 2024, m: 1, d: 29 }, 1)), "2024-03-01");
  });

  it("is DST-safe (adds a calendar day, not 86,400,000 ms)", () => {
    // 2026-03-29 is a DST transition in European zones; a milliseconds-based
    // implementation drifts to the wrong day there.
    assert.equal(toIsoDate(shiftDays({ y: 2026, m: 2, d: 28 }, 1)), "2026-03-29");
    assert.equal(toIsoDate(shiftDays({ y: 2026, m: 2, d: 29 }, 1)), "2026-03-30");
  });
});

describe("shiftMonths", () => {
  it("clamps the day to the target month's length", () => {
    assert.equal(toIsoDate(shiftMonths({ y: 2026, m: 0, d: 31 }, 1)), "2026-02-28");
    assert.equal(toIsoDate(shiftMonths({ y: 2024, m: 0, d: 31 }, 1)), "2024-02-29");
    assert.equal(toIsoDate(shiftMonths({ y: 2026, m: 2, d: 31 }, 1)), "2026-04-30");
  });

  it("keeps the day when it exists in the target month", () => {
    assert.equal(toIsoDate(shiftMonths({ y: 2026, m: 2, d: 15 }, -1)), "2026-02-15");
  });

  it("crosses the year boundary", () => {
    assert.equal(toIsoDate(shiftMonths({ y: 2026, m: 0, d: 15 }, -1)), "2025-12-15");
    assert.equal(toIsoDate(shiftMonths({ y: 2026, m: 11, d: 15 }, 1)), "2027-01-15");
  });
});

describe("shiftMonthView", () => {
  it("moves the displayed month without a day component", () => {
    assert.deepEqual(shiftMonthView({ y: 2026, m: 0 }, -1), { y: 2025, m: 11 });
    assert.deepEqual(shiftMonthView({ y: 2026, m: 11 }, 1), { y: 2027, m: 0 });
    assert.deepEqual(shiftMonthView({ y: 2026, m: 5 }, 7), { y: 2027, m: 0 });
  });
});

describe("weekdayIndexMonday", () => {
  it("anchors to known dates (Monday-first numbering)", () => {
    // 2026-01-01 is a Thursday → index 3.
    assert.equal(weekdayIndexMonday({ y: 2026, m: 0, d: 1 }), 3);
    // 2026-10-13 is a Tuesday → index 1.
    assert.equal(weekdayIndexMonday({ y: 2026, m: 9, d: 13 }), 1);
    // 2026-10-12 is a Monday → index 0.
    assert.equal(weekdayIndexMonday({ y: 2026, m: 9, d: 12 }), 0);
    // 2026-10-11 is a Sunday → index 6.
    assert.equal(weekdayIndexMonday({ y: 2026, m: 9, d: 11 }), 6);
  });

  it("labels match the module's weekday table", () => {
    assert.equal(WEEKDAY_FULL[weekdayIndexMonday({ y: 2026, m: 9, d: 13 })], "Thứ Ba");
    assert.equal(WEEKDAY_FULL[weekdayIndexMonday({ y: 2026, m: 9, d: 11 })], "Chủ Nhật");
  });
});

describe("buildMonthGrid", () => {
  it("always returns six full weeks so the popover height never jumps", () => {
    for (let month = 0; month < 12; month += 1) {
      assert.equal(buildMonthGrid(2026, month).length, 42);
    }
  });

  it("starts on a Monday and borrows leading days from the previous month", () => {
    const grid = buildMonthGrid(2026, 9); // October 2026, the 1st is a Thursday
    assert.equal(weekdayIndexMonday(grid[0].parts), 0, "first cell must be a Monday");
    assert.equal(grid[0].iso, "2026-09-28");
    assert.equal(grid[0].inMonth, false);
    assert.equal(grid[3].iso, "2026-10-01");
    assert.equal(grid[3].inMonth, true);
  });

  it("flags out-of-month cells at both ends", () => {
    const grid = buildMonthGrid(2026, 9);
    assert.equal(grid[41].iso, "2026-11-08");
    assert.equal(grid[41].inMonth, false);
    assert.equal(
      grid.filter((cell) => cell.inMonth).length,
      daysInMonth(2026, 9),
      "October has 31 in-month cells",
    );
  });

  it("contains the first and last day of every month exactly once", () => {
    for (let month = 0; month < 12; month += 1) {
      const grid = buildMonthGrid(2024, month);
      const inMonth = grid.filter((cell) => cell.inMonth);
      const first = `2024-${String(month + 1).padStart(2, "0")}-01`;
      const last = `2024-${String(month + 1).padStart(2, "0")}-${daysInMonth(2024, month)}`;
      assert.equal(inMonth.some((cell) => cell.iso === first), true);
      assert.equal(inMonth.some((cell) => cell.iso === last), true);
      assert.equal(new Set(grid.map((cell) => cell.iso)).size, 42, "no duplicate days");
    }
  });
});

describe("sameDay and helpers", () => {
  it("compares by calendar day, not by identity", () => {
    assert.equal(sameDay({ y: 2026, m: 9, d: 13 }, { y: 2026, m: 9, d: 13 }), true);
    assert.equal(sameDay({ y: 2026, m: 9, d: 13 }, { y: 2026, m: 9, d: 14 }), false);
    assert.equal(sameDay(null, { y: 2026, m: 9, d: 13 }), false);
    assert.equal(sameDay({ y: 2026, m: 9, d: 13 }, null), false);
  });

  it("monthViewOf drops the day", () => {
    assert.deepEqual(monthViewOf({ y: 2026, m: 9, d: 13 }), { y: 2026, m: 9 });
  });

  it("todayParts reads local parts of the supplied clock", () => {
    const parts = todayParts(new Date(2026, 9, 13, 23, 30));
    assert.deepEqual(parts, { y: 2026, m: 9, d: 13 });
  });

  it("formatDateWithWeekday renders the Vietnamese display form", () => {
    assert.equal(formatDateWithWeekday("2026-10-13"), "13/10/2026 · Thứ Ba");
    assert.equal(formatDateWithWeekday("2026-01-05"), "05/01/2026 · Thứ Hai");
    assert.equal(formatDateWithWeekday(""), "");
  });

  it("has a label for every month", () => {
    assert.equal(MONTH_LABELS.length, 12);
    assert.equal(MONTH_LABELS[9], "Tháng 10");
  });
});

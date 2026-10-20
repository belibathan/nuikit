import { describe, expect, it } from "vitest"

import {
  dateFromParts,
  daysInMonth,
  formatDate,
  normalizeHex,
  parseDate,
  parseNumber,
  stepDatePart,
  stepNumber,
  validateField,
  dateToEpoch,
  epochToDate,
  timeFromParts,
  timeToEpoch,
  epochToTime,
  stepTimePart,
} from "@/components/ui/form-field"

describe("form-field numbers", () => {
  it("parses text to a number or null, rounding to precision", () => {
    expect(parseNumber("12.5")).toBe(12.5)
    expect(parseNumber("  ")).toBeNull()
    expect(parseNumber("abc")).toBeNull()
    expect(parseNumber("-")).toBeNull()
    expect(parseNumber("1.236", 2)).toBe(1.24)
    expect(parseNumber("7", 0)).toBe(7)
  })

  it("steps within min/max, starting from the bound when empty", () => {
    expect(stepNumber(5, 1)).toBe(6)
    expect(stepNumber(5, -1, { min: 5 })).toBe(5)
    expect(stepNumber(99, 1, { max: 100, step: 5 })).toBe(100)
    expect(stepNumber(null, 1, { min: 10 })).toBe(10)
    expect(stepNumber(null, -1, { max: 50 })).toBe(50)
    expect(stepNumber(null, 1)).toBe(0)
    // no float drift: 0.1 + 0.2
    expect(stepNumber(0.2, 1, { step: 0.1 })).toBe(0.3)
  })
})

describe("form-field dates", () => {
  it("knows month lengths, leap years included", () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(1900, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2024, 4)).toBe(30)
  })

  it("builds YYYY-MM-DD only from a real, complete date", () => {
    expect(dateFromParts("1", "2", "1990")).toBe("1990-02-01")
    expect(dateFromParts("29", "02", "2024")).toBe("2024-02-29")
    expect(dateFromParts("29", "02", "2023")).toBeNull()
    expect(dateFromParts("31", "04", "2024")).toBeNull()
    expect(dateFromParts("1", "13", "2024")).toBeNull()
    expect(dateFromParts("", "1", "2024")).toBeNull()
    expect(dateFromParts("1", "1", "990")).toBeNull()
  })

  it("parses and formats in the field's order", () => {
    expect(parseDate("1990-02-01")).toEqual({ year: "1990", month: "02", day: "01" })
    expect(parseDate("1990-02-30")).toBeNull()
    expect(parseDate("01/02/1990")).toBeNull()
    expect(formatDate("1990-02-01")).toBe("01/02/1990")
    expect(formatDate("1990-02-01", "mdy")).toBe("02/01/1990")
    expect(formatDate("1990-02-01", "ymd")).toBe("1990-02-01")
  })

  it("steps a part with the arrow keys: days and months wrap, years stay in bounds", () => {
    expect(stepDatePart("day", "31", 1)).toBe("01")
    expect(stepDatePart("day", "01", -1)).toBe("31")
    expect(stepDatePart("month", "", 1)).toBe("01")
    expect(stepDatePart("month", "", -1)).toBe("12")
    expect(stepDatePart("year", "2008", 1, { max: "2008-12-31" })).toBe("2008")
    expect(stepDatePart("year", "", 1, { min: "1920-01-01" })).toBe("1920")
    expect(stepDatePart("year", "", -1, { max: "2008-12-31" })).toBe("2008")
  })
})

describe("form-field colours", () => {
  it("normalizes hex to #rrggbb", () => {
    expect(normalizeHex("#C8102E")).toBe("#c8102e")
    expect(normalizeHex("abc")).toBe("#aabbcc")
    expect(normalizeHex(" #fff ")).toBe("#ffffff")
    expect(normalizeHex("#abcd")).toBeNull()
    expect(normalizeHex("red")).toBeNull()
    expect(normalizeHex(null)).toBeNull()
  })
})

describe("validateField", () => {
  it("only fails empty values on required", () => {
    expect(validateField({ kind: "text" }, "")).toBeNull()
    expect(validateField({ kind: "text", required: true }, "")?.code).toBe("required")
    expect(validateField({ kind: "number", required: true }, null)?.code).toBe("required")
    expect(validateField({ kind: "select", required: true }, [])?.code).toBe("required")
    expect(validateField({ kind: "checkbox", required: true }, false)?.message).toBe("Required")
    expect(validateField({ kind: "checkbox", required: true }, true)).toBeNull()
    expect(validateField({ kind: "date", required: true, min: "2000-01-01" }, null)?.code).toBe("required")
  })

  it("checks text length", () => {
    expect(validateField({ kind: "text", minLength: 3 }, "ab")).toEqual({ code: "minLength", message: "At least 3 characters" })
    expect(validateField({ kind: "text", maxLength: 1 }, "ab")).toEqual({ code: "maxLength", message: "At most 1 character" })
    expect(validateField({ kind: "text", minLength: 2, maxLength: 8 }, "ZEN 01")).toBeNull()
  })

  it("checks number and slider bounds", () => {
    expect(validateField({ kind: "number", min: 1, max: 5000 }, 0)).toEqual({ code: "min", message: "At least 1" })
    expect(validateField({ kind: "number", min: 1, max: 5000 }, 5001)).toEqual({ code: "max", message: "At most 5000" })
    expect(validateField({ kind: "number", min: 1 }, "nope")?.code).toBe("invalid")
    expect(validateField({ kind: "slider", min: 0, max: 1 }, 0.5)).toBeNull()
  })

  it("checks dates: real, and inside min/max", () => {
    expect(validateField({ kind: "date" }, "2023-02-29")?.code).toBe("invalid")
    expect(validateField({ kind: "date", max: "2008-12-31" }, "2010-05-05")).toEqual({ code: "max", message: "On or before 31/12/2008" })
    expect(validateField({ kind: "date", min: "1920-01-01", dateOrder: "mdy" }, "1900-01-01")?.message).toBe("On or after 01/01/1920")
    expect(validateField({ kind: "date", min: "1920-01-01", max: "2008-12-31" }, "1990-02-01")).toBeNull()
  })

  it("checks colours", () => {
    expect(validateField({ kind: "color" }, "#c8102e")).toBeNull()
    expect(validateField({ kind: "color" }, "#zz0000")?.code).toBe("invalid")
  })
})

describe("form-field date range and time (ox_lib's value shapes)", () => {
  it("converts dates to and from epoch ms of local midnight", () => {
    const ms = dateToEpoch("1990-02-01")!
    const d = new Date(ms)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1990, 1, 1, 0, 0])
    expect(epochToDate(ms)).toBe("1990-02-01")
    // any time of the day maps back to that day
    expect(epochToDate(ms + 15 * 3600_000)).toBe("1990-02-01")
    expect(dateToEpoch("1990-02-30")).toBeNull()
    expect(dateToEpoch(null)).toBeNull()
    expect(epochToDate(Number.NaN)).toBeNull()
    expect(epochToDate(null)).toBeNull()
  })

  it("builds HH:MM only from a real time", () => {
    expect(timeFromParts("9", "5")).toBe("09:05")
    expect(timeFromParts(23, 59)).toBe("23:59")
    expect(timeFromParts(24, 0)).toBeNull()
    expect(timeFromParts(12, 60)).toBeNull()
    expect(timeFromParts("", "30")).toBeNull()
  })

  it("converts times to epoch ms of today (or a given day) and back", () => {
    const base = new Date(2026, 9, 20, 15, 42, 11)
    const ms = timeToEpoch("08:30", base)!
    const d = new Date(ms)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([2026, 9, 20, 8, 30, 0])
    expect(epochToTime(ms)).toBe("08:30")
    const today = new Date(timeToEpoch("08:30")!)
    expect(today.toDateString()).toBe(new Date().toDateString())
    expect(timeToEpoch("25:00")).toBeNull()
    expect(timeToEpoch("8:30")).toBeNull()
    expect(epochToTime(null)).toBeNull()
  })

  it("steps hours and minutes with the arrow keys, wrapping", () => {
    expect(stepTimePart("hour", "23", 1)).toBe("00")
    expect(stepTimePart("hour", "00", -1)).toBe("23")
    expect(stepTimePart("hour", "", 1)).toBe("00")
    expect(stepTimePart("hour", "12", 1, { twelve: true })).toBe("01")
    expect(stepTimePart("hour", "01", -1, { twelve: true })).toBe("12")
    expect(stepTimePart("hour", "", 1, { twelve: true })).toBe("01")
    expect(stepTimePart("minute", "59", 1)).toBe("00")
    expect(stepTimePart("minute", "00", -1)).toBe("59")
    expect(stepTimePart("minute", "10", 1, { minuteStep: 15 })).toBe("30")
    expect(stepTimePart("minute", "45", 1, { minuteStep: 15 })).toBe("00")
    expect(stepTimePart("minute", "", 1, { minuteStep: 15 })).toBe("00")
  })

  it("validates a date range: both ends, order, bounds", () => {
    const a = dateToEpoch("2026-10-01")!
    const b = dateToEpoch("2026-10-07")!
    const rule = { kind: "date-range" as const, min: "2026-01-01", max: "2026-12-31" }
    expect(validateField(rule, [a, b])).toBeNull()
    expect(validateField(rule, [a, a])).toBeNull()
    expect(validateField(rule, [null, null])).toBeNull()
    expect(validateField({ ...rule, required: true }, [null, null])?.code).toBe("required")
    expect(validateField(rule, [a, null])).toEqual({ code: "incomplete", message: "Pick both dates" })
    expect(validateField(rule, [b, a])?.code).toBe("order")
    expect(validateField(rule, [dateToEpoch("2025-12-31"), b])?.code).toBe("min")
    expect(validateField(rule, [a, dateToEpoch("2027-01-01")])?.message).toBe("On or before 31/12/2026")
  })

  it("validates a time by its clock time", () => {
    const rule = { kind: "time" as const, min: "08:00", max: "18:00" }
    expect(validateField(rule, timeToEpoch("12:00"))).toBeNull()
    expect(validateField(rule, timeToEpoch("07:59"))).toEqual({ code: "min", message: "At 08:00 or later" })
    expect(validateField(rule, timeToEpoch("18:01"))?.code).toBe("max")
    expect(validateField({ kind: "time", required: true }, null)?.code).toBe("required")
    expect(validateField({ kind: "time" }, null)).toBeNull()
  })
})

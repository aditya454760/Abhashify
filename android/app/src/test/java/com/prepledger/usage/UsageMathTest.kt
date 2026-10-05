package com.prepledger.usage

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset

class UsageMathTest {
    private val zone = ZoneOffset.UTC
    private val oct5 = LocalDate.of(2026, 10, 5)
    private val oct6 = LocalDate.of(2026, 10, 6)
    private val minute = 60_000L

    private fun at(day: Int, hour: Int, min: Int): Long =
        LocalDateTime.of(2026, 10, day, hour, min).toInstant(ZoneOffset.UTC).toEpochMilli()

    private fun ev(pkg: String, cls: String, type: Int, time: Long) = RawEvent(pkg, cls, type, time)

    @Test
    fun singleSessionIsCounted() {
        val events = listOf(
            ev("a", "A1", UsageMath.FOREGROUND, at(5, 10, 0)),
            ev("a", "A1", UsageMath.BACKGROUND, at(5, 10, 30)),
        )
        val result = UsageMath.aggregate(events, at(5, 12, 0), zone)
        assertEquals(30 * minute, result[oct5]?.get("a"))
    }

    @Test
    fun sessionAcrossMidnightIsSplit() {
        val events = listOf(
            ev("a", "A1", UsageMath.FOREGROUND, at(5, 23, 50)),
            ev("a", "A1", UsageMath.BACKGROUND, at(6, 0, 20)),
        )
        val result = UsageMath.aggregate(events, at(6, 8, 0), zone)
        assertEquals(10 * minute, result[oct5]?.get("a"))
        assertEquals(20 * minute, result[oct6]?.get("a"))
    }

    @Test
    fun nextActivityResumingBeforePreviousPausesIsNotDoubleCounted() {
        val events = listOf(
            ev("a", "A1", UsageMath.FOREGROUND, at(5, 10, 0)),
            ev("a", "A2", UsageMath.FOREGROUND, at(5, 10, 10)),
            ev("a", "A1", UsageMath.BACKGROUND, at(5, 10, 11)),
            ev("a", "A2", UsageMath.BACKGROUND, at(5, 10, 30)),
        )
        val result = UsageMath.aggregate(events, at(5, 12, 0), zone)
        assertEquals(30 * minute, result[oct5]?.get("a"))
    }

    @Test
    fun screenOffClosesSessionWithoutPausedEvent() {
        val events = listOf(
            ev("a", "A1", UsageMath.FOREGROUND, at(5, 10, 0)),
            ev("", "", UsageMath.SCREEN_OFF, at(5, 10, 20)),
        )
        val result = UsageMath.aggregate(events, at(5, 12, 0), zone)
        assertEquals(20 * minute, result[oct5]?.get("a"))
    }

    @Test
    fun openSessionRunsToEndOfWindow() {
        val events = listOf(ev("a", "A1", UsageMath.FOREGROUND, at(5, 11, 0)))
        val result = UsageMath.aggregate(events, at(5, 11, 45), zone)
        assertEquals(45 * minute, result[oct5]?.get("a"))
    }

    @Test
    fun twoAppsAreKeptApart() {
        val events = listOf(
            ev("a", "A1", UsageMath.FOREGROUND, at(5, 9, 0)),
            ev("a", "A1", UsageMath.BACKGROUND, at(5, 9, 15)),
            ev("b", "B1", UsageMath.FOREGROUND, at(5, 9, 15)),
            ev("b", "B1", UsageMath.BACKGROUND, at(5, 10, 0)),
        )
        val result = UsageMath.aggregate(events, at(5, 12, 0), zone)
        assertEquals(15 * minute, result[oct5]?.get("a"))
        assertEquals(45 * minute, result[oct5]?.get("b"))
    }
}

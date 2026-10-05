package com.prepledger.usage

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** One foreground/background/screen event, stripped of Android types so it can be unit tested. */
data class RawEvent(val pkg: String, val cls: String, val type: Int, val time: Long)

/**
 * Turns a chronological list of usage events into milliseconds of foreground time per day and package.
 *
 * Rules:
 * - A package is in the foreground from its first resumed activity until its last resumed activity pauses.
 *   Tracking activities by class name keeps the count right when one activity pauses after the next resumes.
 * - Screen off and device shutdown close every open session, so a missing "paused" event cannot inflate time.
 * - A session that crosses midnight is split between the two days (device time zone).
 * - Sessions still open at the end of the window run until [endMs].
 */
object UsageMath {
    const val FOREGROUND = 1 // UsageEvents.Event.MOVE_TO_FOREGROUND (ACTIVITY_RESUMED)
    const val BACKGROUND = 2 // UsageEvents.Event.MOVE_TO_BACKGROUND (ACTIVITY_PAUSED)
    const val SCREEN_OFF = 16 // UsageEvents.Event.SCREEN_NON_INTERACTIVE
    const val SHUTDOWN = 26 // UsageEvents.Event.DEVICE_SHUTDOWN

    fun aggregate(events: List<RawEvent>, endMs: Long, zone: ZoneId): Map<LocalDate, Map<String, Long>> {
        val buckets = HashMap<LocalDate, HashMap<String, Long>>()

        fun add(pkg: String, from: Long, to: Long) {
            var cursor = from
            while (cursor < to) {
                val day = Instant.ofEpochMilli(cursor).atZone(zone).toLocalDate()
                val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
                val sliceEnd = minOf(to, dayEnd)
                val perPackage = buckets.getOrPut(day) { HashMap() }
                perPackage[pkg] = (perPackage[pkg] ?: 0L) + (sliceEnd - cursor)
                cursor = sliceEnd
            }
        }

        val active = HashMap<String, HashSet<String>>() // package -> activity classes currently resumed
        val since = HashMap<String, Long>() // package -> time it entered the foreground

        fun closeAll(at: Long) {
            for ((pkg, from) in since) add(pkg, from, at)
            since.clear()
            active.clear()
        }

        for (e in events) {
            when (e.type) {
                FOREGROUND -> {
                    val classes = active.getOrPut(e.pkg) { HashSet<String>() }
                    if (classes.isEmpty()) since[e.pkg] = e.time
                    classes.add(e.cls)
                }
                BACKGROUND -> {
                    val classes = active[e.pkg]
                    if (classes != null && classes.remove(e.cls) && classes.isEmpty()) {
                        val from = since.remove(e.pkg)
                        if (from != null) add(e.pkg, from, e.time)
                    }
                }
                SCREEN_OFF, SHUTDOWN -> closeAll(e.time)
            }
        }
        closeAll(endMs)
        return buckets
    }
}

package com.prepledger.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class AppInfo(val packageName: String, val label: String)

data class DayUsage(val date: LocalDate, val millisByPackage: Map<String, Long>) {
    fun studyMillis(selected: Set<String>): Long =
        millisByPackage.filterKeys { it in selected }.values.sum()
}

object UsageTracker {

    /** True when the user has switched on Usage access for this app. */
    fun hasUsageAccess(context: Context): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= 29) {
            ops.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        } else {
            @Suppress("DEPRECATION")
            ops.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        }
        return if (mode == AppOpsManager.MODE_DEFAULT) {
            context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            mode == AppOpsManager.MODE_ALLOWED
        }
    }

    /** Apps with a launcher icon, sorted by name, for the study-app picker. */
    fun launchableApps(context: Context): List<AppInfo> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        @Suppress("DEPRECATION")
        val found = pm.queryIntentActivities(intent, 0)
        return found
            .map { AppInfo(it.activityInfo.packageName, it.loadLabel(pm).toString()) }
            .distinctBy { it.packageName }
            .filter { it.packageName != context.packageName }
            .sortedBy { it.label.lowercase() }
    }

    /** Foreground time per package for each of the last [days] days, oldest first, ending today. */
    fun usageByDay(context: Context, days: Int = 7): List<DayUsage> {
        val zone = ZoneId.systemDefault()
        val now = Instant.now()
        val today = now.atZone(zone).toLocalDate()
        val firstDay = today.minusDays((days - 1).toLong())
        val startMs = firstDay.atStartOfDay(zone).toInstant().toEpochMilli()
        val endMs = now.toEpochMilli()

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(startMs, endMs)
        val cursor = UsageEvents.Event()
        val raw = ArrayList<RawEvent>()
        while (events.hasNextEvent()) {
            events.getNextEvent(cursor)
            when (cursor.eventType) {
                UsageMath.FOREGROUND, UsageMath.BACKGROUND, UsageMath.SCREEN_OFF, UsageMath.SHUTDOWN ->
                    raw.add(
                        RawEvent(
                            pkg = cursor.packageName ?: "",
                            cls = cursor.className ?: "",
                            type = cursor.eventType,
                            time = cursor.timeStamp,
                        ),
                    )
            }
        }

        val buckets = UsageMath.aggregate(raw, endMs, zone)
        return (0 until days).map { i ->
            val date = firstDay.plusDays(i.toLong())
            DayUsage(date, buckets[date] ?: emptyMap())
        }
    }

    /** JSON the Abhyashify web app can read: study minutes per day, with the apps behind each total. */
    fun exportJson(days: List<DayUsage>, selected: Set<String>, labels: Map<String, String>): String {
        val root = JSONObject()
        root.put("source", "abhyashify-usage")
        root.put("generated", Instant.now().toString())
        val list = JSONArray()
        for (day in days) {
            val obj = JSONObject()
            obj.put("date", day.date.toString())
            obj.put("study_minutes", (day.studyMillis(selected) / 60_000L).toInt())
            val apps = JSONArray()
            for ((pkg, ms) in day.millisByPackage) {
                if (pkg in selected && ms >= 60_000L) {
                    val app = JSONObject()
                    app.put("package", pkg)
                    app.put("label", labels[pkg] ?: pkg)
                    app.put("minutes", (ms / 60_000L).toInt())
                    apps.put(app)
                }
            }
            obj.put("apps", apps)
            list.put(obj)
        }
        root.put("days", list)
        return root.toString(2)
    }
}

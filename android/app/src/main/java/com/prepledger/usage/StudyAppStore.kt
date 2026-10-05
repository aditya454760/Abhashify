package com.prepledger.usage

import android.content.Context

/** Remembers which apps the user counts as study apps. Stays on the phone. */
class StudyAppStore(context: Context) {
    private val prefs = context.getSharedPreferences("study_apps", Context.MODE_PRIVATE)

    fun load(): Set<String> = prefs.getStringSet(KEY, emptySet())?.toSet() ?: emptySet()

    fun save(selected: Set<String>) {
        prefs.edit().putStringSet(KEY, HashSet(selected)).apply()
    }

    private companion object {
        const val KEY = "selected"
    }
}

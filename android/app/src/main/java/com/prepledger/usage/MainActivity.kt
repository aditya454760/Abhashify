package com.prepledger.usage

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : ComponentActivity() {
    // Bumped every time the screen comes back, so the app re-reads the permission after Settings.
    private val resumeTick = mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AbhyashifyTheme {
                UsageScreen(resumeTick.intValue)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumeTick.intValue = resumeTick.intValue + 1
    }
}

private fun formatMinutes(m: Int): String = if (m < 60) "${m}m" else "${m / 60}h ${m % 60}m"

@Composable
private fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = content,
        )
    }
}

@Composable
fun UsageScreen(resumeTick: Int) {
    val context = LocalContext.current
    val store = remember { StudyAppStore(context) }
    var hasAccess by remember { mutableStateOf(UsageTracker.hasUsageAccess(context)) }
    var selected by remember { mutableStateOf(store.load()) }
    var apps by remember { mutableStateOf<List<AppInfo>>(emptyList()) }
    var days by remember { mutableStateOf<List<DayUsage>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var picking by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf("") }

    LaunchedEffect(resumeTick) {
        hasAccess = UsageTracker.hasUsageAccess(context)
        loading = true
        apps = withContext(Dispatchers.Default) { UsageTracker.launchableApps(context) }
        days = if (hasAccess) {
            withContext(Dispatchers.Default) { UsageTracker.usageByDay(context) }
        } else {
            emptyList()
        }
        loading = false
    }

    val labels = remember(apps) { apps.associate { it.packageName to it.label } }
    val minutesPerDay = days.map { (it.studyMillis(selected) / 60_000L).toInt() }
    val scaleMax = (minutesPerDay.maxOrNull() ?: 0).coerceAtLeast(60)
    val dayFormat = remember { DateTimeFormatter.ofPattern("EEE d MMM", Locale.getDefault()) }
    val perApp = remember(days, selected) {
        selected
            .map { pkg -> pkg to days.sumOf { it.millisByPackage[pkg] ?: 0L } }
            .filter { it.second >= 60_000L }
            .sortedByDescending { it.second }
    }

    Scaffold { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Column(modifier = Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "Phone study time",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "How long your chosen study apps were open over the last 7 days. " +
                            "Nothing leaves this phone unless you share it.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (!hasAccess) {
                item {
                    Panel {
                        Text("Allow usage access", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Android needs you to switch this on by hand. Open the settings, pick Abhyashify Usage " +
                                "and turn on usage access. The app can see how long apps were open, not what is inside them.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(onClick = {
                            context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                        }) {
                            Text("Open usage access settings")
                        }
                    }
                }
            }

            item {
                Panel {
                    Text("Study apps", fontWeight = FontWeight.SemiBold)
                    Text(
                        if (selected.isEmpty()) {
                            "No apps chosen yet. Pick the apps you study with, such as a PDF reader, a notes app or a lecture app."
                        } else {
                            "${selected.size} chosen. An app counts fully as study time, so leave out apps you also use for fun."
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(onClick = { picking = true }) {
                        Text(if (selected.isEmpty()) "Choose study apps" else "Change study apps")
                    }
                }
            }

            if (hasAccess) {
                item {
                    Panel {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Last 7 days", fontWeight = FontWeight.SemiBold)
                            Text(formatMinutes(minutesPerDay.sum()), fontWeight = FontWeight.SemiBold)
                        }
                        if (loading && days.isEmpty()) {
                            Text("Reading usage…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        for (day in days.reversed()) {
                            val m = (day.studyMillis(selected) / 60_000L).toInt()
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(day.date.format(dayFormat))
                                    Text(formatMinutes(m), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp)),
                                ) {
                                    if (m > 0) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth((m.toFloat() / scaleMax).coerceIn(0.01f, 1f))
                                                .height(8.dp)
                                                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(4.dp)),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                if (perApp.isNotEmpty()) {
                    item {
                        Panel {
                            Text("By app", fontWeight = FontWeight.SemiBold)
                            for ((pkg, ms) in perApp) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(labels[pkg] ?: pkg, modifier = Modifier.weight(1f))
                                    Text(
                                        formatMinutes((ms / 60_000L).toInt()),
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }

                if (selected.isNotEmpty() && days.isNotEmpty()) {
                    item {
                        Panel {
                            Text("Send to Abhyashify", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Shares the last 7 days as text. Paste it into the Abhyashify web app.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = {
                                    val json = UsageTracker.exportJson(days, selected, labels)
                                    val send = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, json)
                                    }
                                    context.startActivity(Intent.createChooser(send, "Share study time"))
                                }) {
                                    Text("Share")
                                }
                                OutlinedButton(onClick = {
                                    val json = UsageTracker.exportJson(days, selected, labels)
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("Abhyashify usage", json))
                                    notice = "Copied. Paste it into Abhyashify."
                                }) {
                                    Text("Copy")
                                }
                            }
                            if (notice.isNotEmpty()) {
                                Text(notice, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }

            item { Box(modifier = Modifier.height(24.dp)) }
        }
    }

    if (picking) {
        PickerDialog(
            apps = apps,
            selected = selected,
            onChange = {
                selected = it
                store.save(it)
            },
            onClose = { picking = false },
        )
    }
}

@Composable
private fun PickerDialog(
    apps: List<AppInfo>,
    selected: Set<String>,
    onChange: (Set<String>) -> Unit,
    onClose: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val shown = remember(apps, query) { apps.filter { it.label.contains(query.trim(), ignoreCase = true) } }

    Dialog(onDismissRequest = onClose) {
        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Choose study apps", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    label = { Text("Search apps") },
                    modifier = Modifier.fillMaxWidth(),
                )
                LazyColumn(modifier = Modifier.weight(1f, fill = false).heightIn(max = 420.dp)) {
                    items(shown, key = { it.packageName }) { app ->
                        val checked = app.packageName in selected
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onChange(if (checked) selected - app.packageName else selected + app.packageName)
                                }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = checked, onCheckedChange = null)
                            Text(app.label, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
                Button(onClick = onClose, modifier = Modifier.align(Alignment.End)) {
                    Text("Done")
                }
            }
        }
    }
}

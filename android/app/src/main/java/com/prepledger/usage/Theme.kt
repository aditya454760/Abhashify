package com.prepledger.usage

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Same indigo and cool greys as the Abhyashify web app.
private val Light = lightColorScheme(
    primary = Color(0xFF3B3FA8),
    onPrimary = Color.White,
    background = Color(0xFFF1F3F2),
    onBackground = Color(0xFF16212B),
    surface = Color.White,
    onSurface = Color(0xFF16212B),
    surfaceVariant = Color(0xFFE3E8EA),
    onSurfaceVariant = Color(0xFF52606D),
    error = Color(0xFFC2413A),
)

private val Dark = darkColorScheme(
    primary = Color(0xFF9EA6FF),
    onPrimary = Color(0xFF10131A),
    background = Color(0xFF101318),
    onBackground = Color(0xFFE7EAF0),
    surface = Color(0xFF181C23),
    onSurface = Color(0xFFE7EAF0),
    surfaceVariant = Color(0xFF232A33),
    onSurfaceVariant = Color(0xFF9AA5B1),
    error = Color(0xFFEE7E76),
)

@Composable
fun AbhyashifyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        content = content,
    )
}

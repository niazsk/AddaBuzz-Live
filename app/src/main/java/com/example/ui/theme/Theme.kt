package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val AddaBuzzDarkColorScheme = darkColorScheme(
    primary = NeonPurple,
    onPrimary = Color.White,
    primaryContainer = BorderPurple,
    onPrimaryContainer = Color.White,
    secondary = NeonPink,
    onSecondary = Color.White,
    tertiary = AmberGold,
    background = DeepVioletDark,
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceCardDark,
    onSurfaceVariant = TextSecondary,
    outline = BorderPurple
)

private val AddaBuzzLightColorScheme = lightColorScheme(
    primary = NeonPurple,
    onPrimary = Color.White,
    secondary = NeonPink,
    onSecondary = Color.White,
    background = Color(0xFFF7F4FB),
    onBackground = Color(0xFF1E142B),
    surface = Color.White,
    onSurface = Color(0xFF1E142B),
    surfaceVariant = Color(0xFFEFE8F7),
    onSurfaceVariant = Color(0xFF5E5470),
    outline = Color(0xFFD6C6EA)
)

@Composable
fun AddaBuzzTheme(
    darkTheme: Boolean = true, // Default to futuristic dark mode for broadcasting
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) AddaBuzzDarkColorScheme else AddaBuzzLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

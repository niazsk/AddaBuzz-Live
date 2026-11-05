package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.ui.components.AddaBuzzBottomNav
import com.example.ui.components.TopUpModal
import com.example.ui.screens.*
import com.example.ui.theme.AddaBuzzTheme
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

class MainActivity : ComponentActivity() {

    private val viewModel: AddaBuzzViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val uiState by viewModel.uiState.collectAsState()

            AddaBuzzTheme(darkTheme = uiState.isDarkMode) {
                // Android system back button handler
                BackHandler(enabled = uiState.currentScreen != Screen.HOME && uiState.currentScreen != Screen.SPLASH) {
                    when (uiState.currentScreen) {
                        Screen.LEADERBOARD,
                        Screen.MULTIPLAYER_GAME,
                        Screen.ADMIN_PANEL -> viewModel.navigateTo(Screen.PROFILE)
                        Screen.LIVE_STREAM,
                        Screen.BROADCAST_LIVE,
                        Screen.MESSAGES,
                        Screen.PROFILE,
                        Screen.SIGN_IN -> viewModel.navigateTo(Screen.HOME)
                        else -> {}
                    }
                }

                val showBottomNav = uiState.currentScreen != Screen.SPLASH &&
                        uiState.currentScreen != Screen.SIGN_IN &&
                        uiState.currentScreen != Screen.LIVE_STREAM

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        if (showBottomNav) {
                            AddaBuzzBottomNav(
                                currentScreen = uiState.currentScreen,
                                onNavigate = { viewModel.navigateTo(it) },
                                language = uiState.language
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
                        when (uiState.currentScreen) {
                            Screen.SPLASH -> SplashScreen(viewModel = viewModel)
                            Screen.SIGN_IN -> SignInScreen(viewModel = viewModel)
                            Screen.HOME -> HomeScreen(viewModel = viewModel)
                            Screen.LIVE_STREAM -> LiveStreamScreen(viewModel = viewModel)
                            Screen.BROADCAST_LIVE -> StartBroadcastScreen(viewModel = viewModel)
                            Screen.MULTIPLAYER_GAME -> MultiplayerGameScreen(viewModel = viewModel)
                            Screen.LEADERBOARD -> LeaderboardScreen(viewModel = viewModel)
                            Screen.MESSAGES -> MessagesScreen(viewModel = viewModel)
                            Screen.PROFILE -> ProfileScreen(viewModel = viewModel)
                            Screen.ADMIN_PANEL -> AdminDashboardScreen(viewModel = viewModel)
                        }

                        // Top Up Modal
                        if (uiState.showTopUpModal) {
                            TopUpModal(
                                viewModel = viewModel,
                                onDismiss = { viewModel.setShowTopUpModal(false) }
                            )
                        }

                        // Withdraw Points Modal
                        if (uiState.showWithdrawModal) {
                            com.example.ui.components.WithdrawModal(
                                viewModel = viewModel,
                                onDismiss = { viewModel.setShowWithdrawModal(false) }
                            )
                        }
                    }
                }
            }
        }
    }
}

package com.addabuzz.live

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.launch

private val ObsidianBg = Color(0xFF08090E)
private val CardBg = Color(0xFF111420)
private val AccentViolet = Color(0xFF7C3AED)
private val AccentSky = Color(0xFF38BDF8)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = AddaBuzzRepository(getString(R.string.firestore_database_id))
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = ObsidianBg,
                    surface = CardBg,
                    primary = AccentViolet,
                    secondary = AccentSky,
                    onBackground = Color(0xFFF4F6FB),
                    onSurface = Color(0xFFF4F6FB)
                )
            ) {
                AddaBuzzAndroidApp(repo)
            }
        }
    }
}

@Composable
fun AddaBuzzAndroidApp(repo: AddaBuzzRepository) {
    val scope = rememberCoroutineScope()
    var fbUser by remember { mutableStateOf(repo.auth.currentUser) }
    var currentUser by remember { mutableStateOf<UserProfile?>(null) }
    var needsVerification by remember { mutableStateOf(false) }
    var needsOnboarding by remember { mutableStateOf(false) }

    var liveRooms by remember { mutableStateOf<List<LiveRoom>>(emptyList()) }
    var publicUsers by remember { mutableStateOf<List<UserProfile>>(emptyList()) }
    var wallet by remember { mutableStateOf(WalletState()) }
    var activeRoom by remember { mutableStateOf<LiveRoom?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0=Discover, 1=Wallet, 2=Roles, 3=SignIn
    var statusMessage by remember { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        val roomsReg = repo.observeLiveRooms { liveRooms = it }
        val usersReg = repo.observePublicUsers { publicUsers = it }
        onDispose {
            roomsReg.remove()
            usersReg.remove()
        }
    }

    LaunchedEffect(Unit) {
        val user = repo.auth.currentUser
        fbUser = user
        if (user != null) {
            if (!user.isEmailVerified) {
                needsVerification = true
            } else {
                val profile = repo.fetchUserProfile(user.uid)
                if (profile != null) {
                    currentUser = profile
                } else {
                    needsOnboarding = true
                }
            }
        }
    }

    DisposableEffect(currentUser?.uid) {
        val uid = currentUser?.uid
        val walletReg = if (uid != null) repo.observeWallet(uid) { wallet = it } else null
        onDispose { walletReg?.remove() }
    }

    Scaffold(
        containerColor = ObsidianBg,
        bottomBar = {
            if (activeRoom == null) {
                NavigationBar(containerColor = Color(0xFF0A0C13)) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Text("Live") },
                        label = { Text("Discover") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Text("Coins") },
                        label = { Text("Wallet") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        icon = { Text("RBAC") },
                        label = { Text("Roles") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 3,
                        onClick = { selectedTab = 3 },
                        icon = { Text("ID") },
                        label = { Text(if (currentUser == null) "Sign In" else "Account") }
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            statusMessage?.let { msg ->
                Surface(
                    color = Color(0xFF1E293B),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                ) {
                    Text(
                        text = msg,
                        color = AccentSky,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            val room = activeRoom
            if (room != null) {
                LiveRoomScreen(
                    room = room,
                    currentUser = currentUser,
                    wallet = wallet,
                    repo = repo,
                    onBack = { activeRoom = null },
                    onStatus = { statusMessage = it }
                )
            } else {
                when (selectedTab) {
                    0 -> DiscoverScreen(
                        rooms = liveRooms,
                        currentUser = currentUser,
                        onJoinRoom = { activeRoom = it },
                        onGoLive = { title ->
                            val me = currentUser
                            if (me == null) {
                                selectedTab = 3
                            } else {
                                scope.launch {
                                    runCatching {
                                        repo.createLiveRoom(me, title, "Popular", "MULTI_GUEST")
                                    }.onFailure { statusMessage = it.message }
                                }
                            }
                        }
                    )
                    1 -> WalletScreen(wallet = wallet)
                    2 -> RolesScreen(
                        currentUser = currentUser,
                        users = publicUsers,
                        onPromote = { target ->
                            val me = currentUser ?: return@RolesScreen
                            scope.launch {
                                runCatching {
                                    repo.promoteUserToAgent(me, target)
                                    statusMessage = "Promoted @${target.username} to AGENT."
                                }.onFailure { statusMessage = it.message }
                            }
                        }
                    )
                    3 -> SignInScreen(
                        fbUser = fbUser,
                        currentUser = currentUser,
                        needsVerification = needsVerification,
                        needsOnboarding = needsOnboarding,
                        onSignIn = { email, pass ->
                            scope.launch {
                                runCatching {
                                    val u = repo.signInWithEmail(email, pass)
                                    fbUser = u
                                    if (!u.isEmailVerified) {
                                        needsVerification = true
                                        needsOnboarding = false
                                    } else {
                                        needsVerification = false
                                        val prof = repo.fetchUserProfile(u.uid)
                                        currentUser = prof
                                        needsOnboarding = prof == null
                                    }
                                }.onFailure { statusMessage = it.message }
                            }
                        },
                        onRegister = { email, pass ->
                            scope.launch {
                                runCatching {
                                    val u = repo.registerWithEmail(email, pass)
                                    fbUser = u
                                    needsVerification = !u.isEmailVerified
                                    statusMessage = "Verification email sent to ${u.email}."
                                }.onFailure { statusMessage = it.message }
                            }
                        },
                        onRefreshVerification = {
                            scope.launch {
                                runCatching {
                                    val u = repo.reloadVerifiedStatus()
                                    fbUser = u
                                    if (u != null && u.isEmailVerified) {
                                        needsVerification = false
                                        val prof = repo.fetchUserProfile(u.uid)
                                        currentUser = prof
                                        needsOnboarding = prof == null
                                    } else {
                                        statusMessage = "Email not verified yet."
                                    }
                                }.onFailure { statusMessage = it.message }
                            }
                        },
                        onResendVerification = {
                            scope.launch {
                                runCatching {
                                    repo.resendVerification()
                                    statusMessage = "Verification link sent."
                                }.onFailure { statusMessage = it.message }
                            }
                        },
                        onCompleteOnboarding = { username, display ->
                            val u = fbUser ?: return@SignInScreen
                            scope.launch {
                                runCatching {
                                    currentUser = repo.completeOnboarding(u, username, display)
                                    needsOnboarding = false
                                    selectedTab = 0
                                    statusMessage = "Profile created (${currentUser?.accountType})."
                                }.onFailure { statusMessage = it.message }
                            }
                        },
                        onSignOut = {
                            repo.signOut()
                            fbUser = null
                            currentUser = null
                            needsVerification = false
                            needsOnboarding = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun DiscoverScreen(
    rooms: List<LiveRoom>,
    currentUser: UserProfile?,
    onJoinRoom: (LiveRoom) -> Unit,
    onGoLive: (String) -> Unit
) {
    var newRoomTitle by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("AddaBuzz Live", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            text = if (currentUser != null) "Signed in as @${currentUser.username} (${currentUser.accountType})"
            else "Connect • Stream • Chat • Enjoy",
            color = Color(0xFF94A3B8),
            style = MaterialTheme.typography.bodySmall
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = newRoomTitle,
                onValueChange = { newRoomTitle = it },
                label = { Text("Start Live Room Title") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            Button(
                onClick = {
                    if (newRoomTitle.isNotBlank()) {
                        onGoLive(newRoomTitle)
                        newRoomTitle = ""
                    }
                },
                modifier = Modifier.align(Alignment.CenterVertically)
            ) {
                Text("Go Live")
            }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(rooms, key = { it.roomId }) { room ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    modifier = Modifier.fillMaxWidth().clickable { onJoinRoom(room) }
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(room.title, fontWeight = FontWeight.SemiBold)
                        Text(
                            "${room.category} • ${room.mode} • ${room.viewerCount} viewers",
                            color = AccentSky,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveRoomScreen(
    room: LiveRoom,
    currentUser: UserProfile?,
    wallet: WalletState,
    repo: AddaBuzzRepository,
    onBack: () -> Unit,
    onStatus: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var seats by remember { mutableStateOf((1..8).map { GuestSeat(seatNumber = it) }) }
    var messages by remember { mutableStateOf<List<RoomMessage>>(emptyList()) }
    var chatDraft by remember { mutableStateOf("") }

    DisposableEffect(room.roomId) {
        val seatReg = repo.observeSeats(room.roomId) { seats = it }
        val msgReg = repo.observeRoomMessages(room.roomId) { messages = it }
        onDispose {
            seatReg.remove()
            msgReg.remove()
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            TextButton(onClick = onBack) { Text("← Back") }
            Text(room.title, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (currentUser?.uid == room.hostUid || currentUser?.accountType == "SUPER_AGENT") {
                TextButton(
                    onClick = {
                        scope.launch {
                            runCatching { repo.endLiveRoom(room.roomId) }
                                .onSuccess { onBack() }
                                .onFailure { onStatus(it.message ?: "Failed to end room") }
                        }
                    }
                ) {
                    Text("End", color = Color(0xFFF87171))
                }
            }
        }

        Text("Guest Seats (Max 8 — Tap available seat to request)", fontWeight = FontWeight.SemiBold)
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.height(150.dp)
        ) {
            items(seats, key = { it.seatNumber }) { seat ->
                val isMySeat = currentUser != null && seat.occupantUid == currentUser.uid
                Card(
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    modifier = Modifier.clickable(enabled = currentUser != null) {
                        val me = currentUser ?: return@clickable
                        scope.launch {
                            when {
                                isMySeat -> {
                                    runCatching { repo.stepDownSeat(room.roomId, seat.seatNumber) }
                                        .onSuccess { onStatus("Stepped down from Seat ${seat.seatNumber}.") }
                                        .onFailure { onStatus(it.message ?: "Step down failed") }
                                }
                                seat.status == "AVAILABLE" -> {
                                    runCatching { repo.requestSeat(room.roomId, seat.seatNumber, me) }
                                        .onSuccess { onStatus("Requested Seat ${seat.seatNumber}.") }
                                        .onFailure { onStatus(it.message ?: "Request failed") }
                                }
                            }
                        }
                    }
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(8.dp).fillMaxWidth()
                    ) {
                        Text("S${seat.seatNumber}", color = AccentSky, style = MaterialTheme.typography.labelSmall)
                        Text(
                            if (isMySeat) "Leave" else (seat.occupantName ?: seat.status),
                            maxLines = 1,
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }
        }

        if (currentUser != null) {
            Text("Quick Gifts (${wallet.coinBalance} Coins • ${wallet.diamondBalance} Diamonds)", style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                DEFAULT_GIFT_CATALOG.take(3).forEach { gift ->
                    OutlinedButton(
                        onClick = {
                            scope.launch {
                                runCatching { repo.sendGift(room.roomId, currentUser, gift) }
                                    .onFailure { onStatus(it.message ?: "Gift failed") }
                            }
                        }
                    ) {
                        Text("${gift.name} (${gift.price})")
                    }
                }
            }
        }

        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(messages, key = { it.id }) { msg ->
                Text("@${msg.username}: ${msg.text}", style = MaterialTheme.typography.bodySmall)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = chatDraft,
                onValueChange = { chatDraft = it },
                placeholder = { Text("Say hello...") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            Button(
                onClick = {
                    val me = currentUser ?: return@Button
                    if (chatDraft.isNotBlank()) {
                        val txt = chatDraft
                        chatDraft = ""
                        scope.launch {
                            runCatching { repo.postRoomMessage(room.roomId, me, txt) }
                                .onFailure { onStatus(it.message ?: "Send failed") }
                        }
                    }
                }
            ) {
                Text("Send")
            }
        }
    }
}

@Composable
private fun WalletScreen(wallet: WalletState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Virtual Wallet", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            "Coins and Diamonds are independent virtual balances. Top-up and real-money payments are disabled by policy.",
            color = Color(0xFF94A3B8),
            style = MaterialTheme.typography.bodySmall
        )
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Coins Balance: ${wallet.coinBalance}", fontWeight = FontWeight.Bold, color = Color(0xFFFBBF24))
                Text("Diamonds Balance: ${wallet.diamondBalance}", fontWeight = FontWeight.Bold, color = AccentSky)
            }
        }
    }
}

@Composable
private fun RolesScreen(
    currentUser: UserProfile?,
    users: List<UserProfile>,
    onPromote: (UserProfile) -> Unit
) {
    val isSuperAgent = currentUser?.accountType == "SUPER_AGENT"
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Account Roles & Promotions", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            "Your Role: ${currentUser?.accountType ?: "Signed Out"} (Only SUPER_AGENT can promote USER → AGENT)",
            color = AccentSky,
            style = MaterialTheme.typography.bodySmall
        )
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(users.filter { it.accountType == "USER" }, key = { it.uid }) { user ->
                Card(colors = CardDefaults.cardColors(containerColor = CardBg), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(user.displayName, fontWeight = FontWeight.SemiBold)
                            Text("@${user.username} • ${user.platformId}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF94A3B8))
                        }
                        Button(enabled = isSuperAgent, onClick = { onPromote(user) }) {
                            Text("Promote")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SignInScreen(
    fbUser: FirebaseUser?,
    currentUser: UserProfile?,
    needsVerification: Boolean,
    needsOnboarding: Boolean,
    onSignIn: (String, String) -> Unit,
    onRegister: (String, String) -> Unit,
    onRefreshVerification: () -> Unit,
    onResendVerification: () -> Unit,
    onCompleteOnboarding: (String, String) -> Unit,
    onSignOut: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Sign In / Admin Access", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        when {
            currentUser != null -> {
                Text("Signed in: ${currentUser.displayName} (@${currentUser.username})")
                Text("Role: ${currentUser.accountType} • ID: ${currentUser.platformId}", color = AccentSky)
                Button(onClick = onSignOut) { Text("Sign Out") }
            }
            needsVerification -> {
                Text("Signed in as ${fbUser?.email}. Verify your email link first.")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onRefreshVerification) { Text("I Verified — Refresh") }
                    OutlinedButton(onClick = onResendVerification) { Text("Resend Email") }
                }
                TextButton(onClick = onSignOut) { Text("Sign Out") }
            }
            needsOnboarding -> {
                Text("Complete your profile (${fbUser?.email})")
                OutlinedTextField(value = username, onValueChange = { username = it }, label = { Text("Unique Username") }, singleLine = true)
                OutlinedTextField(value = displayName, onValueChange = { displayName = it }, label = { Text("Display Name") }, singleLine = true)
                Button(onClick = { onCompleteOnboarding(username, displayName) }) { Text("Create Profile") }
            }
            else -> {
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { onSignIn(email, password) }, modifier = Modifier.weight(1f)) {
                        Text("Sign In")
                    }
                    OutlinedButton(onClick = { onRegister(email, password) }, modifier = Modifier.weight(1f)) {
                        Text("Create Account")
                    }
                }
            }
        }
    }
}

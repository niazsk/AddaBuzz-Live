plugins {
    id("com.android.application")
}

android {
    namespace = "com.addabuzz.live"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.addabuzz.live"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "1.0.2"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

val syncWebAssets by tasks.registering(Sync::class) {
    from(rootProject.file("../dist")) {
        exclude("addabuzz-live.apk")
    }
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

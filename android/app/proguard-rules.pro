# AddaBuzz Live ProGuard / R8 Rules
-keepattributes Signature,InnerClasses,EnclosingMethod
-keep class com.addabuzz.live.** { *; }
-dontwarn com.google.firebase.**

# Guía de Compilación Nativa con Capacitor (Android & iOS)

Esta guía documenta la integración de **Capacitor** en `apps/client` (`@llenoporfa/client`) para empaquetar la aplicación como app nativa en Android e iOS, soportando geolocalización en segundo plano y notificaciones locales.

---

## 1. Arquitectura y Configuración Base

- **Identificador de la App (`appId`):** `app.llenoporfa.mobile`
- **Nombre (`appName`):** `llenoPorfa`
- **Directorio Web (`webDir`):** `dist`
- **Detección de Entorno:** Gestionada en `src/utils/apiBase.ts`.
  - Cuando corre en Capacitor (`Capacitor.isNativePlatform()`), las llamadas a `/api/*` se dirigen a `https://lleno-porfa.vercel.app` (o la URL configurada en `PUBLIC_API_URL`).
  - Cuando corre en la Web o PWA de Vercel, utiliza rutas relativas (`""`) directamente.

---

## 2. Inicialización de Proyectos Nativos

Para inicializar las plataformas nativas por primera vez (requiere Android Studio para Android y Xcode/macOS para iOS):

```bash
# 1. Compilar el cliente web en modo estático
bun --filter @llenoporfa/client build

# 2. Añadir la plataforma Android
cd apps/client
npx cap add android

# 3. Añadir la plataforma iOS (solo en macOS)
npx cap add ios

# 4. Sincronizar activos web y plugins
npx cap sync
```

Scripts añadidos en `apps/client/package.json`:
- `bun run cap:sync`: Compila y sincroniza activos con Android e iOS.
- `bun run cap:android`: Sincroniza y abre Android Studio.

---

## 3. Configuración de Permisos en Android

Edita el archivo `apps/client/android/app/src/main/AndroidManifest.xml` e introduce los siguientes permisos y servicios dentro de `<manifest>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permisos de red e Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Permisos de ubicación precisa y en segundo plano para el Radar -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- Servicios en primer plano para mantener el rastreo activo -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

    <!-- Permiso de Notificaciones Locales (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- Servicio de Foreground para Background Geolocation -->
        <service
            android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 4. Configuración de Permisos en iOS

Edita el archivo `apps/client/ios/App/App/Info.plist` y añade las siguientes descripciones de privacidad y modos en segundo plano dentro del `<dict>` principal:

```xml
<dict>
    <!-- Descripción para uso de ubicación en primer plano -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>llenoPorfa necesita tu ubicación para mostrarte las gasolineras más baratas a tu alrededor.</string>

    <!-- Descripción para uso de ubicación siempre / en segundo plano -->
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>El Radar de Ahorro necesita tu ubicación en segundo plano para notificarte chollos en ruta y detectar cuando llegas a repostar.</string>

    <key>NSLocationAlwaysUsageDescription</key>
    <string>El Radar de Ahorro monitoriza los precios bajos en tu trayecto de forma eficiente.</string>

    <!-- Habilitar modo de ubicación en segundo plano -->
    <key>UIBackgroundModes</key>
    <array>
        <string>location</string>
    </array>
</dict>
```

---

## 5. Compilación del `.apk` Instalable (Android)

### Opción A: Compilación Rápida por Terminal (Debug APK)

```bash
cd apps/client/android

# En Linux/macOS:
./gradlew assembleDebug

# El archivo .apk generado estará listo para instalar en tu móvil en:
# apps/client/android/app/build/outputs/apk/debug/app-debug.apk
```

Instalación directa en un dispositivo conectado por USB con depuración activada:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

### Opción B: Compilación desde Android Studio

1. Abre el proyecto Android:
   ```bash
   cd apps/client
   bun run cap:android
   ```
2. En Android Studio, ve al menú **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Al finalizar, pulsa en el enlace **locate** en la notificación inferior para obtener tu archivo `.apk`.

---

### Opción C: Generación de APK / AAB para Producción (Release Firmado)

1. En Android Studio, ve a **Build** > **Generate Signed Bundle / APK...**.
2. Selecciona **Android App Bundle** (para Google Play) o **APK** (para distribución directa).
3. Selecciona tu almacén de claves (keystore) o crea uno nuevo.
4. Selecciona la variante de compilación `release` y firma V2 (Full APK Signature).

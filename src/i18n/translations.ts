export type Language = "tr" | "en" | "de" | "es" | "fr" | "ru";

export interface Translations {
  appName: string;
  home: string;
  library: string;
  searchPlaceholder: string;
  searchTitle: string;
  addGame: string;
  performanceMode: string;
  balancedMode: string;
  downloads: string;
  rescan: string;
  cleaner: string;
  hardware: string;
  stats: string;
  settings: string;
  profile: string;

  // Onboarding
  welcomeTitle: string;
  welcomeSubtitle: string;
  selectLanguage: string;
  playerTagLabel: string;
  playerTagPlaceholder: string;
  accountsTitle: string;
  accountsSubtitle: string;
  steamTitle: string;
  steamDetected: string;
  steamNotFound: string;
  epicTitle: string;
  epicConnected: string;
  epicNotConnected: string;
  gogTitle: string;
  gogConnected: string;
  gogNotConnected: string;
  connect: string;
  disconnect: string;
  continueBtn: string;
  saveAndEnter: string;
  getLoginCode: string;
  pasteAuthCode: string;
  pasteGogCode: string;

  // Home
  featured: string;
  weeklyDeals: string;
  weeklyDealsSub: string;
  freeBadge: string;
  recentGames: string;
  actionGames: string;
  adventureGames: string;
  indieGames: string;
  viewCategoryAll: string;
  viewCategory: string;
  play: string;
  details: string;
  installedLocally: string;
  cloudLibrary: string;

  // Shelf Titles
  actionAndShooter: string;
  adventureAndRpg: string;
  indiePicks: string;
  quickLaunchRecent: string;

  // Stores
  storeSteam: string;
  storeEpic: string;
  storeGog: string;
  storeCustom: string;

  // Library
  all: string;
  installed: string;
  cloud: string;
  favorites: string;
  sortByInstalled: string;
  sortByTitle: string;
  sortByPlaytime: string;
  sortByRecent: string;
  sortBySize: string;
  noGamesFound: string;
  itemsCount: string;

  // AddCustomGameModal
  addCustomGameTitle: string;
  addCustomGameSubtitle: string;
  executableLabel: string;
  executablePlaceholder: string;
  pickFileBtn: string;
  gameTitleLabel: string;
  gameTitlePlaceholder: string;
  workingDirLabel: string;
  autoLabel: string;
  winePrefixLabel: string;
  argsLabel: string;
  argsPlaceholder: string;
  cancelBtn: string;
  saveGameBtn: string;
  addingBtn: string;
  fillRequiredError: string;
  gameAddedSuccess: string;

  // Stats Modal
  statsTitle: string;
  statsSubtitle: string;
  totalGames: string;
  totalPlaytime: string;
  hoursSuffix: string;
  diskUsage: string;
  favoriteCollection: string;
  mostPlayedGames: string;
  storeDistribution: string;
  genreDistribution: string;

  // Cleaner
  cleanerTitle: string;
  cleanerSubtitle: string;
  cleanAllBtn: string;
  totalReclaimable: string;
  itemsFound: string;
  safeBadge: string;
  cleanSuccess: string;

  // Hardware Modal
  hardwareTitle: string;
  hardwareSubtitle: string;
  cpuTemp: string;
  fanSpeeds: string;
  powerProfiles: string;
  quietProfile: string;
  balancedProfile: string;
  perfProfile: string;
}

export const translations: Record<Language, Translations> = {
  tr: {
    appName: "sonsus-engine",
    home: "Ana Sayfa",
    library: "Kütüphane",
    searchPlaceholder: "Ara... (Ctrl+K)",
    searchTitle: "Oyun Arama ve Hızlı Komut Paleti (Ctrl+K)",
    addGame: "Oyun Ekle",
    performanceMode: "Performans",
    balancedMode: "Dengeli",
    downloads: "İndirilenler",
    rescan: "Kütüphaneyi Yenile",
    cleaner: "Disk & Shader Temizleyici",
    hardware: "Donanım & Fan Kontrolü",
    stats: "Kütüphane İstatistikleri",
    settings: "Genel Ayarlar",
    profile: "Hesaplar & Profil",

    welcomeTitle: "Sonsus Engine'e Hoş Geldin",
    welcomeSubtitle: "Ultra hafif, sıfır gecikmeli yeni nesil oyun başlatıcı.",
    selectLanguage: "Dil Seçimi / Select Language",
    playerTagLabel: "Oyuncu Adı",
    playerTagPlaceholder: "Örn: Kayra",
    accountsTitle: "Oyun Kütüphaneleri",
    accountsSubtitle: "Oyunlarını tek bir çatı altında toplamak için hesaplarını bağla.",
    steamTitle: "Steam",
    steamDetected: "Açık oturum otomatik algılandı",
    steamNotFound: "Steam kütüphanesi bulunamadı",
    epicTitle: "Epic Games",
    epicConnected: "Bağlandı",
    epicNotConnected: "Giriş yapılmadı",
    gogTitle: "GOG.com",
    gogConnected: "Bağlandı",
    gogNotConnected: "Giriş yapılmadı",
    connect: "Bağla",
    disconnect: "Çıkış Yap",
    continueBtn: "Kütüphaneye Başla",
    saveAndEnter: "Kaydet ve Başla",
    getLoginCode: "Giriş Kodu Al",
    pasteAuthCode: "authorizationCode yapıştırın",
    pasteGogCode: "GOG kodunu yapıştırın",

    featured: "Öne Çıkan",
    weeklyDeals: "Haftalık Fırsatlar & Ücretsiz Oyunlar",
    weeklyDealsSub: "Epic Games ve Steam vitrinindeki indirimler",
    freeBadge: "ÜCRETSİZ",
    recentGames: "Son Oynananlar & Hızlı Başlat",
    actionGames: "Aksiyon & Nişancı Oyunları",
    adventureGames: "Macera & Rol Yapma (RPG)",
    indieGames: "Seçkin Bağımsız (Indie) Yapımlar",
    viewCategoryAll: "Kategoriyi Göster",
    viewCategory: "Kategoriyi Göster",
    play: "Oyna",
    details: "İncele",
    installedLocally: "Bilgisayarda Yüklü",
    cloudLibrary: "Bulut Kütüphanesi",

    actionAndShooter: "Aksiyon & Nişancı Oyunları",
    adventureAndRpg: "Macera & Rol Yapma (RPG)",
    indiePicks: "Seçkin Bağımsız (Indie) Yapımlar",
    quickLaunchRecent: "Son Oynananlar & Hızlı Başlat",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Özel",

    all: "Tümü",
    installed: "Yüklü",
    cloud: "Bulut",
    favorites: "Favoriler",
    sortByInstalled: "Sırala: Yüklü Önce",
    sortByTitle: "Sırala: İsim (A-Z)",
    sortByPlaytime: "Sırala: Oynama Süresi",
    sortByRecent: "Sırala: Son Oynanan",
    sortBySize: "Sırala: Disk Boyutu",
    noGamesFound: "Arama veya filtreyle eşleşen oyun bulunamadı.",
    itemsCount: "oyun",

    addCustomGameTitle: "Harici / Özel Oyun Ekle",
    addCustomGameSubtitle: ".exe, .AppImage, .sh veya emülatör oyunlarını kütüphaneye bağla",
    executableLabel: "Çalıştırılabilir Dosya (.exe / .AppImage / .sh / Binary)",
    executablePlaceholder: "/home/kullanici/Games/Oyun/Game.exe",
    pickFileBtn: "Dosya Seç",
    gameTitleLabel: "Oyun Başlığı (Afiş ve mağaza bilgileri bu isme göre çekilir)",
    gameTitlePlaceholder: "Örn: Cyberpunk 2077",
    workingDirLabel: "Çalışma Klasörü (İsteğe Bağlı)",
    autoLabel: "Otomatik",
    winePrefixLabel: "Wine / Proton Prefix (Linux .exe için)",
    argsLabel: "Başlatma Parametreleri (İsteğe Bağlı)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Vazgeç",
    saveGameBtn: "Kütüphaneye Ekle",
    addingBtn: "Ekleniyor...",
    fillRequiredError: "Lütfen oyun adını ve çalıştırılabilir dosya yolunu seçin.",
    gameAddedSuccess: "kütüphaneye eklendi ve afişi eşitlendi!",

    statsTitle: "Kütüphane İstatistikleri",
    statsSubtitle: "Tüm mağazalardaki oyun süresi, depolama ve koleksiyon analizi",
    totalGames: "Toplam Kütüphane",
    totalPlaytime: "Toplam Oynama Süresi",
    hoursSuffix: "saat",
    diskUsage: "Yüklü Disk Kullanımı",
    favoriteCollection: "Favori Koleksiyonu",
    mostPlayedGames: "En Çok Oynanan Oyunlar",
    storeDistribution: "Mağaza Dağılımı",
    genreDistribution: "En Çok Sahip Olunan Türler",

    cleanerTitle: "Disk Alanı & Shader Temizleyicisi",
    cleanerSubtitle: "GPU önbellekleri, shader kalıntıları ve yetim prefix'leri temizle",
    cleanAllBtn: "Tümünü Temizle",
    totalReclaimable: "Kurtarılabilir Alan",
    itemsFound: "dosya bulundu",
    safeBadge: "GÜVENLİ",
    cleanSuccess: "temizlendi ve disk alanı kurtarıldı!",

    hardwareTitle: "Donanım & Termal Kontrol Merkezi",
    hardwareSubtitle: "Canlı fan hızları, sıcaklık ve ACPI güç yönetimi",
    cpuTemp: "CPU Sıcaklığı",
    fanSpeeds: "Fan Hızları",
    powerProfiles: "Güç & Fan Profilleri",
    quietProfile: "Sessiz / Tasarruf",
    balancedProfile: "Dengeli",
    perfProfile: "Yüksek Performans",
  },
  en: {
    appName: "sonsus-engine",
    home: "Home",
    library: "Library",
    searchPlaceholder: "Search... (Ctrl+K)",
    searchTitle: "Quick Search & Command Palette (Ctrl+K)",
    addGame: "Add Game",
    performanceMode: "Performance",
    balancedMode: "Balanced",
    downloads: "Downloads",
    rescan: "Rescan Library",
    cleaner: "Storage & Shader Cleaner",
    hardware: "Hardware & Fan Control",
    stats: "Library Analytics",
    settings: "Settings",
    profile: "Accounts & Profile",

    welcomeTitle: "Welcome to Sonsus Engine",
    welcomeSubtitle: "Ultra-lightweight, zero-latency next-gen game launcher.",
    selectLanguage: "Select Language / Dil Seçimi",
    playerTagLabel: "Player Tag / Name",
    playerTagPlaceholder: "e.g. Kayra",
    accountsTitle: "Game Libraries",
    accountsSubtitle: "Connect your accounts to unify your games in one place.",
    steamTitle: "Steam",
    steamDetected: "Active session automatically detected",
    steamNotFound: "Steam library not found",
    epicTitle: "Epic Games",
    epicConnected: "Connected",
    epicNotConnected: "Not signed in",
    gogTitle: "GOG.com",
    gogConnected: "Connected",
    gogNotConnected: "Not signed in",
    connect: "Connect",
    disconnect: "Sign Out",
    continueBtn: "Enter Library",
    saveAndEnter: "Save & Start",
    getLoginCode: "Get Auth Code",
    pasteAuthCode: "Paste authorizationCode here",
    pasteGogCode: "Paste GOG code here",

    featured: "Featured",
    weeklyDeals: "Weekly Deals & Free Games",
    weeklyDealsSub: "Discounts and promotions from Epic Games & Steam",
    freeBadge: "FREE",
    recentGames: "Recent Games & Quick Launch",
    actionGames: "Action & Shooter Games",
    adventureGames: "Adventure & RPG",
    indieGames: "Featured Indie Games",
    viewCategoryAll: "View All",
    viewCategory: "View All",
    play: "Play",
    details: "Details",
    installedLocally: "Installed Locally",
    cloudLibrary: "Cloud Library",

    actionAndShooter: "Action & Shooter Games",
    adventureAndRpg: "Adventure & RPG Games",
    indiePicks: "Featured Indie Games",
    quickLaunchRecent: "Recent & Quick Launch",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Custom",

    all: "All",
    installed: "Installed",
    cloud: "Cloud",
    favorites: "Favorites",
    sortByInstalled: "Sort: Installed First",
    sortByTitle: "Sort: Name (A-Z)",
    sortByPlaytime: "Sort: Playtime",
    sortByRecent: "Sort: Last Played",
    sortBySize: "Sort: Disk Size",
    noGamesFound: "No games found matching your search or filter.",
    itemsCount: "games",

    addCustomGameTitle: "Add Custom Game",
    addCustomGameSubtitle: "Link .exe, .AppImage, .sh or emulator games to your library",
    executableLabel: "Executable File (.exe / .AppImage / .sh / Binary)",
    executablePlaceholder: "C:\\Games\\MyGame\\Game.exe",
    pickFileBtn: "Browse File",
    gameTitleLabel: "Game Title (Cover art & metadata fetched automatically)",
    gameTitlePlaceholder: "e.g. Cyberpunk 2077",
    workingDirLabel: "Working Directory (Optional)",
    autoLabel: "Auto",
    winePrefixLabel: "Wine / Proton Prefix (For Linux .exe)",
    argsLabel: "Launch Arguments (Optional)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Cancel",
    saveGameBtn: "Add to Library",
    addingBtn: "Adding...",
    fillRequiredError: "Please enter a game title and select an executable file.",
    gameAddedSuccess: "added to library and cover artwork synchronized!",

    statsTitle: "Library Analytics",
    statsSubtitle: "Playtime, disk storage, and collection analytics across all stores",
    totalGames: "Total Library",
    totalPlaytime: "Total Playtime",
    hoursSuffix: "hours",
    diskUsage: "Installed Disk Usage",
    favoriteCollection: "Favorites",
    mostPlayedGames: "Most Played Games",
    storeDistribution: "Store Distribution",
    genreDistribution: "Top Owned Genres",

    cleanerTitle: "Disk Storage & Shader Cleaner",
    cleanerSubtitle: "Purge GPU shaders, cache files, and orphaned compatdata",
    cleanAllBtn: "Clean Everything",
    totalReclaimable: "Reclaimable Storage",
    itemsFound: "files found",
    safeBadge: "SAFE",
    cleanSuccess: "cleaned and storage reclaimed successfully!",

    hardwareTitle: "Hardware & Thermal Control Center",
    hardwareSubtitle: "Live fan telemetry, temperatures, and ACPI profiles",
    cpuTemp: "CPU Temperature",
    fanSpeeds: "Fan Speeds",
    powerProfiles: "Power & Fan Profiles",
    quietProfile: "Quiet / Power Saver",
    balancedProfile: "Balanced",
    perfProfile: "High Performance",
  },
  de: {
    appName: "sonsus-engine",
    home: "Startseite",
    library: "Bibliothek",
    searchPlaceholder: "Suchen... (Strg+K)",
    searchTitle: "Schnellsuche & Befehlspalette (Strg+K)",
    addGame: "Spiel hinzufügen",
    performanceMode: "Leistung",
    balancedMode: "Ausbalanciert",
    downloads: "Downloads",
    rescan: "Neu scannen",
    cleaner: "Speicher & Shader Bereiniger",
    hardware: "Hardware & Lüftersteuerung",
    stats: "Bibliotheksstatistiken",
    settings: "Einstellungen",
    profile: "Konten & Profil",

    welcomeTitle: "Willkommen bei Sonsus Engine",
    welcomeSubtitle: "Ultraleichter, latenzfreier Gaming-Launcher der nächsten Generation.",
    selectLanguage: "Sprache auswählen / Select Language",
    playerTagLabel: "Spielername",
    playerTagPlaceholder: "z.B. Kayra",
    accountsTitle: "Spielebibliotheken",
    accountsSubtitle: "Verbinde deine Konten, um alle Spiele an einem Ort zu vereinen.",
    steamTitle: "Steam",
    steamDetected: "Aktive Sitzung automatisch erkannt",
    steamNotFound: "Steam-Bibliothek nicht gefunden",
    epicTitle: "Epic Games",
    epicConnected: "Verbunden",
    epicNotConnected: "Nicht angemeldet",
    gogTitle: "GOG.com",
    gogConnected: "Verbunden",
    gogNotConnected: "Nicht angemeldet",
    connect: "Verbinden",
    disconnect: "Abmelden",
    continueBtn: "Zur Bibliothek",
    saveAndEnter: "Speichern & Starten",
    getLoginCode: "Code anfordern",
    pasteAuthCode: "authorizationCode hier einfügen",
    pasteGogCode: "GOG-Code hier einfügen",

    featured: "Vorgestellt",
    weeklyDeals: "Wöchentliche Angebote & Gratisspiele",
    weeklyDealsSub: "Rabatte von Epic Games & Steam",
    freeBadge: "KOSTENLOS",
    recentGames: "Zuletzt gespielt",
    actionGames: "Action & Shooter",
    adventureGames: "Abenteuer & Rollenspiele",
    indieGames: "Ausgewählte Indie-Spiele",
    viewCategoryAll: "Alle ansehen",
    viewCategory: "Alle ansehen",
    play: "Spielen",
    details: "Details",
    installedLocally: "Lokal installiert",
    cloudLibrary: "Cloud-Bibliothek",

    actionAndShooter: "Action & Shooter",
    adventureAndRpg: "Abenteuer & RPG",
    indiePicks: "Beliebte Indie-Spiele",
    quickLaunchRecent: "Schnellstart & Zuletzt gespielt",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Benutzerdefiniert",

    all: "Alle",
    installed: "Installiert",
    cloud: "Cloud",
    favorites: "Favoriten",
    sortByInstalled: "Sortieren: Installiert zuerst",
    sortByTitle: "Sortieren: Name (A-Z)",
    sortByPlaytime: "Sortieren: Spielzeit",
    sortByRecent: "Sortieren: Zuletzt gespielt",
    sortBySize: "Sortieren: Speichergröße",
    noGamesFound: "Keine Spiele gefunden.",
    itemsCount: "Spiele",

    addCustomGameTitle: "Eigenes Spiel hinzufügen",
    addCustomGameSubtitle: ".exe, .AppImage, .sh oder Emulator-Spiele verknüpfen",
    executableLabel: "Ausführbare Datei (.exe / .AppImage / Binary)",
    executablePlaceholder: "C:\\Spiele\\MeinSpiel\\Game.exe",
    pickFileBtn: "Datei wählen",
    gameTitleLabel: "Spieltitel",
    gameTitlePlaceholder: "z.B. Cyberpunk 2077",
    workingDirLabel: "Arbeitsverzeichnis (Optional)",
    autoLabel: "Automatisch",
    winePrefixLabel: "Wine / Proton Prefix (für Linux .exe)",
    argsLabel: "Startargumente (Optional)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Abbrechen",
    saveGameBtn: "Zur Bibliothek hinzufügen",
    addingBtn: "Wird hinzugefügt...",
    fillRequiredError: "Bitte Titel und Datei angeben.",
    gameAddedSuccess: "wurde zur Bibliothek hinzugefügt!",

    statsTitle: "Bibliotheksanalysen",
    statsSubtitle: "Spielzeit-, Speicher- und Sammlungsanalyse über alle Stores",
    totalGames: "Gesamte Spiele",
    totalPlaytime: "Gesamte Spielzeit",
    hoursSuffix: "Stunden",
    diskUsage: "Installierter Speicher",
    favoriteCollection: "Favoriten",
    mostPlayedGames: "Meistgespielte Spiele",
    storeDistribution: "Store-Verteilung",
    genreDistribution: "Häufigste Genres",

    cleanerTitle: "Speicherplatz & Shader Bereiniger",
    cleanerSubtitle: "GPU-Shader und temporäre Daten löschen",
    cleanAllBtn: "Alles bereinigen",
    totalReclaimable: "Freigebbarer Speicher",
    itemsFound: "Dateien gefunden",
    safeBadge: "SICHER",
    cleanSuccess: "erfolgreich bereinigt!",

    hardwareTitle: "Hardware & Thermische Steuerung",
    hardwareSubtitle: "Echtzeit-Lüfterdaten, Temperaturen und Profile",
    cpuTemp: "CPU-Temperatur",
    fanSpeeds: "Lüfterdrehzahlen",
    powerProfiles: "Energie- & Lüfterprofile",
    quietProfile: "Leise / Stromsparend",
    balancedProfile: "Ausbalanciert",
    perfProfile: "Höchstleistung",
  },
  es: {
    appName: "sonsus-engine",
    home: "Inicio",
    library: "Biblioteca",
    searchPlaceholder: "Buscar... (Ctrl+K)",
    searchTitle: "Búsqueda rápida y comandos (Ctrl+K)",
    addGame: "Añadir juego",
    performanceMode: "Rendimiento",
    balancedMode: "Equilibrado",
    downloads: "Descargas",
    rescan: "Volver a escanear",
    cleaner: "Limpiador de almacenamiento",
    hardware: "Hardware y ventiladores",
    stats: "Estadísticas",
    settings: "Ajustes",
    profile: "Cuentas y perfil",

    welcomeTitle: "Bienvenido a Sonsus Engine",
    welcomeSubtitle: "Lanzador de juegos ultraligero y de latencia cero de última generación.",
    selectLanguage: "Seleccionar idioma / Select Language",
    playerTagLabel: "Nombre del jugador",
    playerTagPlaceholder: "ej. Kayra",
    accountsTitle: "Bibliotecas de juegos",
    accountsSubtitle: "Conecta tus cuentas para unificar tus juegos en un solo lugar.",
    steamTitle: "Steam",
    steamDetected: "Sesión activa detectada automáticamente",
    steamNotFound: "Biblioteca de Steam no encontrada",
    epicTitle: "Epic Games",
    epicConnected: "Conectado",
    epicNotConnected: "No conectado",
    gogTitle: "GOG.com",
    gogConnected: "Conectado",
    gogNotConnected: "No conectado",
    connect: "Conectar",
    disconnect: "Cerrar sesión",
    continueBtn: "Entrar a la biblioteca",
    saveAndEnter: "Guardar y empezar",
    getLoginCode: "Obtener código",
    pasteAuthCode: "Pegar authorizationCode aquí",
    pasteGogCode: "Pegar código de GOG aquí",

    featured: "Destacado",
    weeklyDeals: "Ofertas semanales y juegos gratis",
    weeklyDealsSub: "Descuentos de Epic Games y Steam",
    freeBadge: "GRATIS",
    recentGames: "Jugados recientemente",
    actionGames: "Juegos de acción y disparos",
    adventureGames: "Aventura y rol (RPG)",
    indieGames: "Juegos independientes destacados",
    viewCategoryAll: "Ver todo",
    viewCategory: "Ver todo",
    play: "Jugar",
    details: "Detalles",
    installedLocally: "Instalado localmente",
    cloudLibrary: "Biblioteca en la nube",

    actionAndShooter: "Acción y disparos",
    adventureAndRpg: "Aventura y rol",
    indiePicks: "Juegos independientes",
    quickLaunchRecent: "Lanzamiento rápido y recientes",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Personalizado",

    all: "Todos",
    installed: "Instalados",
    cloud: "En la nube",
    favorites: "Favoritos",
    sortByInstalled: "Ordenar: Instalados primero",
    sortByTitle: "Ordenar: Nombre (A-Z)",
    sortByPlaytime: "Ordenar: Tiempo de juego",
    sortByRecent: "Ordenar: Última vez jugado",
    sortBySize: "Ordenar: Tamaño de disco",
    noGamesFound: "No se encontraron juegos.",
    itemsCount: "juegos",

    addCustomGameTitle: "Añadir juego personalizado",
    addCustomGameSubtitle: "Enlaza archivos .exe, .AppImage, .sh o emuladores",
    executableLabel: "Archivo ejecutable (.exe / .AppImage / Binario)",
    executablePlaceholder: "C:\\Juegos\\MiJuego\\Game.exe",
    pickFileBtn: "Examinar",
    gameTitleLabel: "Título del juego",
    gameTitlePlaceholder: "ej. Cyberpunk 2077",
    workingDirLabel: "Directorio de trabajo (Opcional)",
    autoLabel: "Automático",
    winePrefixLabel: "Wine / Proton Prefix (para .exe en Linux)",
    argsLabel: "Argumentos de inicio (Opcional)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Cancelar",
    saveGameBtn: "Añadir a la biblioteca",
    addingBtn: "Añadiendo...",
    fillRequiredError: "Por favor introduce un título y selecciona un ejecutable.",
    gameAddedSuccess: "añadido con éxito!",

    statsTitle: "Estadísticas de la biblioteca",
    statsSubtitle: "Análisis de tiempo de juego y almacenamiento",
    totalGames: "Total de juegos",
    totalPlaytime: "Tiempo total jugado",
    hoursSuffix: "horas",
    diskUsage: "Espacio en disco instalado",
    favoriteCollection: "Favoritos",
    mostPlayedGames: "Juegos más jugados",
    storeDistribution: "Distribución de tiendas",
    genreDistribution: "Géneros principales",

    cleanerTitle: "Limpiador de disco y shaders",
    cleanerSubtitle: "Elimina cachés de GPU y datos residuales",
    cleanAllBtn: "Limpiar todo",
    totalReclaimable: "Espacio recuperable",
    itemsFound: "archivos encontrados",
    safeBadge: "SEGURO",
    cleanSuccess: "limpieza completada con éxito!",

    hardwareTitle: "Centro de control de hardware",
    hardwareSubtitle: "Telemetría de ventiladores y perfiles de energía",
    cpuTemp: "Temperatura CPU",
    fanSpeeds: "Velocidad ventiladores",
    powerProfiles: "Perfiles de energía",
    quietProfile: "Silencioso / Ahorro",
    balancedProfile: "Equilibrado",
    perfProfile: "Alto rendimiento",
  },
  fr: {
    appName: "sonsus-engine",
    home: "Accueil",
    library: "Bibliothèque",
    searchPlaceholder: "Rechercher... (Ctrl+K)",
    searchTitle: "Recherche rapide & Palette (Ctrl+K)",
    addGame: "Ajouter un jeu",
    performanceMode: "Performance",
    balancedMode: "Équilibré",
    downloads: "Téléchargements",
    rescan: "Actualiser",
    cleaner: "Nettoyeur de stockage",
    hardware: "Matériel & Ventilateurs",
    stats: "Statistiques",
    settings: "Paramètres",
    profile: "Comptes & Profil",

    welcomeTitle: "Bienvenue sur Sonsus Engine",
    welcomeSubtitle: "Lanceur de jeux nouvelle génération ultra-léger et sans latence.",
    selectLanguage: "Choisir la langue / Select Language",
    playerTagLabel: "Nom du joueur",
    playerTagPlaceholder: "ex: Kayra",
    accountsTitle: "Bibliothèques de jeux",
    accountsSubtitle: "Connectez vos comptes pour regrouper vos jeux au même endroit.",
    steamTitle: "Steam",
    steamDetected: "Session active détectée automatiquement",
    steamNotFound: "Bibliothèque Steam introuvable",
    epicTitle: "Epic Games",
    epicConnected: "Connecté",
    epicNotConnected: "Non connecté",
    gogTitle: "GOG.com",
    gogConnected: "Connecté",
    gogNotConnected: "Non connecté",
    connect: "Connecter",
    disconnect: "Déconnexion",
    continueBtn: "Entrer dans la bibliothèque",
    saveAndEnter: "Enregistrer & Lancer",
    getLoginCode: "Obtenir le code",
    pasteAuthCode: "Coller authorizationCode ici",
    pasteGogCode: "Coller le code GOG ici",

    featured: "En vedette",
    weeklyDeals: "Offres de la semaine & Jeux gratuits",
    weeklyDealsSub: "Promotions Epic Games et Steam",
    freeBadge: "GRATUIT",
    recentGames: "Récemment joués",
    actionGames: "Jeux d'action & Tir",
    adventureGames: "Aventure & Jeu de rôle (RPG)",
    indieGames: "Jeux indépendants sélectionnés",
    viewCategoryAll: "Voir tout",
    viewCategory: "Voir tout",
    play: "Jouer",
    details: "Détails",
    installedLocally: "Installé localement",
    cloudLibrary: "Bibliothèque Cloud",

    actionAndShooter: "Action & Tir",
    adventureAndRpg: "Aventure & RPG",
    indiePicks: "Jeux indépendants",
    quickLaunchRecent: "Lancement rapide & Récents",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Personnalisé",

    all: "Tous",
    installed: "Installés",
    cloud: "Cloud",
    favorites: "Favoris",
    sortByInstalled: "Trier: Installés en premier",
    sortByTitle: "Trier: Nom (A-Z)",
    sortByPlaytime: "Trier: Temps de jeu",
    sortByRecent: "Trier: Récents",
    sortBySize: "Trier: Taille du disque",
    noGamesFound: "Aucun jeu trouvé.",
    itemsCount: "jeux",

    addCustomGameTitle: "Ajouter un jeu personnalisé",
    addCustomGameSubtitle: "Lier des fichiers .exe, .AppImage, .sh ou émulateurs",
    executableLabel: "Fichier exécutable (.exe / .AppImage / Binaire)",
    executablePlaceholder: "C:\\Jeux\\MonJeu\\Game.exe",
    pickFileBtn: "Parcourir",
    gameTitleLabel: "Titre du jeu",
    gameTitlePlaceholder: "ex: Cyberpunk 2077",
    workingDirLabel: "Répertoire de travail (Optionnel)",
    autoLabel: "Automatique",
    winePrefixLabel: "Wine / Proton Prefix (pour .exe Linux)",
    argsLabel: "Arguments de lancement (Optionnel)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Annuler",
    saveGameBtn: "Ajouter à la bibliothèque",
    addingBtn: "Ajout en cours...",
    fillRequiredError: "Veuillez entrer un titre et sélectionner un fichier exécutable.",
    gameAddedSuccess: "ajouté avec succès!",

    statsTitle: "Statistiques de la bibliothèque",
    statsSubtitle: "Temps de jeu et stockage sur toutes les plateformes",
    totalGames: "Total des jeux",
    totalPlaytime: "Temps de jeu total",
    hoursSuffix: "heures",
    diskUsage: "Espace disque installé",
    favoriteCollection: "Favoris",
    mostPlayedGames: "Jeux les plus joués",
    storeDistribution: "Répartition des boutiques",
    genreDistribution: "Genres principaux",

    cleanerTitle: "Nettoyeur de disque et shaders",
    cleanerSubtitle: "Nettoyer les shaders GPU et les fichiers caches",
    cleanAllBtn: "Tout nettoyer",
    totalReclaimable: "Espace récupérable",
    itemsFound: "fichiers trouvés",
    safeBadge: "SÉCURISÉ",
    cleanSuccess: "nettoyage effectué avec succès!",

    hardwareTitle: "Centre de contrôle matériel",
    hardwareSubtitle: "Télémétrie ventilateurs et profils de puissance",
    cpuTemp: "Température CPU",
    fanSpeeds: "Vitesse ventilateurs",
    powerProfiles: "Profils d'alimentation",
    quietProfile: "Silencieux / Économie",
    balancedProfile: "Équilibré",
    perfProfile: "Haute performance",
  },
  ru: {
    appName: "sonsus-engine",
    home: "Главная",
    library: "Библиотека",
    searchPlaceholder: "Поиск... (Ctrl+K)",
    searchTitle: "Быстрый поиск и команды (Ctrl+K)",
    addGame: "Добавить игру",
    performanceMode: "Производительность",
    balancedMode: "Сбалансированный",
    downloads: "Загрузки",
    rescan: "Пересканировать",
    cleaner: "Очистка диска и шейдеров",
    hardware: "Аппаратное управление",
    stats: "Статистика",
    settings: "Настройки",
    profile: "Аккаунты и профиль",

    welcomeTitle: "Добро пожаловать в Sonsus Engine",
    welcomeSubtitle: "Сверхлегкий игровой лаунчер нового поколения без задержек.",
    selectLanguage: "Выбрать язык / Select Language",
    playerTagLabel: "Имя игрока",
    playerTagPlaceholder: "напр. Kayra",
    accountsTitle: "Игровые библиотеки",
    accountsSubtitle: "Подключите свои аккаунты, чтобы объединить все игры в одном месте.",
    steamTitle: "Steam",
    steamDetected: "Активная сессия обнаружена автоматически",
    steamNotFound: "Библиотека Steam не найдена",
    epicTitle: "Epic Games",
    epicConnected: "Подключено",
    epicNotConnected: "Не авторизован",
    gogTitle: "GOG.com",
    gogConnected: "Подключено",
    gogNotConnected: "Не авторизован",
    connect: "Подключить",
    disconnect: "Выйти",
    continueBtn: "Перейти в библиотеку",
    saveAndEnter: "Сохранить и войти",
    getLoginCode: "Получить код",
    pasteAuthCode: "Вставьте authorizationCode сюда",
    pasteGogCode: "Вставьте код GOG сюда",

    featured: "Рекомендуемое",
    weeklyDeals: "Еженедельные скидки и бесплатные игры",
    weeklyDealsSub: "Скидки из Epic Games и Steam",
    freeBadge: "БЕСПЛАТНО",
    recentGames: "Недавно запущенные",
    actionGames: "Экшен и шутеры",
    adventureGames: "Приключения и RPG",
    indieGames: "Избранные инди-игры",
    viewCategoryAll: "Показать все",
    viewCategory: "Показать все",
    play: "Играть",
    details: "Подробнее",
    installedLocally: "Установлено на ПК",
    cloudLibrary: "Облачная библиотека",

    actionAndShooter: "Экшен и шутеры",
    adventureAndRpg: "Приключения и RPG",
    indiePicks: "Избранные инди",
    quickLaunchRecent: "Недавние игры",

    storeSteam: "Steam",
    storeEpic: "Epic",
    storeGog: "GOG",
    storeCustom: "Своя игра",

    all: "Все",
    installed: "Установленные",
    cloud: "Облако",
    favorites: "Избранное",
    sortByInstalled: "Сортировка: Сначала установленные",
    sortByTitle: "Сортировка: По названию (А-Я)",
    sortByPlaytime: "Сортировка: По времени игры",
    sortByRecent: "Сортировка: По дате запуска",
    sortBySize: "Сортировка: По размеру",
    noGamesFound: "Игры не найдены.",
    itemsCount: "игр",

    addCustomGameTitle: "Добавить свою игру",
    addCustomGameSubtitle: "Свяжите файлы .exe, .AppImage, .sh или эмуляторы",
    executableLabel: "Исполняемый файл (.exe / .AppImage / Бинарник)",
    executablePlaceholder: "C:\\Games\\MyGame\\Game.exe",
    pickFileBtn: "Обзор",
    gameTitleLabel: "Название игры",
    gameTitlePlaceholder: "напр. Cyberpunk 2077",
    workingDirLabel: "Рабочая папка (Необязательно)",
    autoLabel: "Авто",
    winePrefixLabel: "Префикс Wine / Proton (для Linux .exe)",
    argsLabel: "Параметры запуска (Необязательно)",
    argsPlaceholder: "-novid -fullscreen",
    cancelBtn: "Отмена",
    saveGameBtn: "Добавить в библиотеку",
    addingBtn: "Добавление...",
    fillRequiredError: "Пожалуйста, введите название и укажите файл.",
    gameAddedSuccess: "успешно добавлена в библиотеку!",

    statsTitle: "Аналитика библиотеки",
    statsSubtitle: "Время в играх, объем памяти и распределение",
    totalGames: "Всего игр",
    totalPlaytime: "Общее время",
    hoursSuffix: "ч.",
    diskUsage: "Занято на диске",
    favoriteCollection: "Избранное",
    mostPlayedGames: "Самые популярные",
    storeDistribution: "Магазины",
    genreDistribution: "Популярные жанры",

    cleanerTitle: "Очистка диска и шейдеров",
    cleanerSubtitle: "Удаление кэша GPU и мусора",
    cleanAllBtn: "Очистить всё",
    totalReclaimable: "Доступно для очистки",
    itemsFound: "файлов найдено",
    safeBadge: "БЕЗОПАСНО",
    cleanSuccess: "очистка успешно завершена!",

    hardwareTitle: "Центр управления питанием и кулерами",
    hardwareSubtitle: "Мониторинг температуры и управление питанием",
    cpuTemp: "Температура CPU",
    fanSpeeds: "Скорость кулеров",
    powerProfiles: "Профили мощности",
    quietProfile: "Тихий / Энергосберегающий",
    balancedProfile: "Сбалансированный",
    perfProfile: "Макс. производительность",
  },
};

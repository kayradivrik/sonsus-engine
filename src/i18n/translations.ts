export type Language = "tr" | "en";

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
};

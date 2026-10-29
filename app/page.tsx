"use client";

import { useCallback, useEffect, useState } from "react";

type Lang =
  | "sq" | "en" | "el" | "it" | "es" | "pt" | "fr"
  | "de" | "tr" | "ar" | "ru" | "pt-BR" | "ja" | "zh";

type Data = Record<string, any>;

const ACCESS_ENDPOINT = "/api/access";
const ACCESS_STORAGE_KEY = "kelilelibot-access";

const languages: { code: Lang; name: string; flag: string }[] = [
  { code: "sq", name: "Shqip", flag: "🇦🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

const en: Record<string, string> = {
  menu: "Menu",
  language: "Language",
  timezone: "Time zone",
  chooseLanguage: "Choose language",
  chooseZone: "Choose time zone",
  done: "Done",
  active: "System active",
  auto: "Auto-refresh every 60 seconds",
  currentSignal: "Current signal",
  marketAnalysis: "Latest market analysis",
  currentPrice: "CURRENT PRICE",
  buySignal: "Buy signal",
  sellSignal: "Sell signal",
  waiting: "Waiting for a setup",
  loading: "Loading...",
  refreshSignal: "Refresh signal",
  performance: "Performance",
  backtest: "Automatic backtest",
  strategyStats: "Strategy statistics",
  recalculate: "Recalculate",
  trades: "Trades",
  winRate: "Win rate",
  profitFactor: "Profit factor",
  netReturn: "Net return",
  drawdown: "Max drawdown",
  finalCapital: "Final capital",
  startingCapital: "STARTING CAPITAL",
  lastBacktest: "LAST BACKTEST",
  history: "History",
  recentTrades: "Recent trades",
  direction: "Direction",
  entry: "Entry",
  entryTime: "Entry time",
  exit: "Exit",
  exitTime: "Exit time",
  return: "Return",
  noTrades: "No trades to display",
  reason: "Reason",
  signalTime: "Signal time",
  updated: "Updated",
  localTime: "Local time",
  activeZone: "ACTIVE TIME ZONE",
  shortTerm: "Short term",
  mediumTerm: "Medium term",
  trend: "Trend",
  buy: "BUY",
  sell: "SELL",
  wait: "WAIT",
  errorSignal: "Signal error",
  errorBacktest: "Backtest error",
  loadingStats: "Calculating...",
  noSignal: "No signal data available",
  systemTime: "Clock updates automatically",
  entryPrice: "Entry price",
  takeProfit1: "Take Profit 1",
  takeProfit2: "Take Profit 2",
  stopLoss: "Stop Loss",
  accessTitle: "Private access",
  accessSubtitle: "Enter your access code to open the gold trading dashboard.",
  accessCode: "ACCESS CODE",
  accessPlaceholder: "Enter your code",
  enter: "Enter",
  verifying: "Verifying...",
  invalidCode: "Invalid access code. Please try again.",
  accessNetworkError: "Could not verify the code. Check your connection and try again.",
  rememberMe: "Save login",
  accessTimeLeft: "ACCESS TIME LEFT",
  accessUnlimited: "No time limit",
  accessExpired: "Access code expired. Please enter a new code.",
  logout: "Log out",
};

const translations: Partial<Record<Lang, Record<string, string>>> = {
  sq: {
    menu: "Menuja", language: "Gjuha", timezone: "Zona kohore",
    chooseLanguage: "Zgjidh gjuhën", chooseZone: "Zgjidh zonën kohore",
    done: "U krye", active: "Sistemi aktiv",
    auto: "Rifreskim automatik çdo 60 sekonda",
    currentSignal: "Sinjali aktual", marketAnalysis: "Analiza e fundit e tregut",
    currentPrice: "ÇMIMI AKTUAL", buySignal: "Sinjal për blerje",
    sellSignal: "Sinjal për shitje", waiting: "Në pritje të një konfigurimi",
    loading: "Duke ngarkuar...", refreshSignal: "Rifresko sinjalin",
    performance: "Performanca", backtest: "Backtest automatik",
    strategyStats: "Statistikat e strategjisë", recalculate: "Rillogarit",
    trades: "Tregtime", winRate: "Win rate", profitFactor: "Profit factor",
    netReturn: "Kthimi neto", drawdown: "Max drawdown",
    finalCapital: "Kapitali final", startingCapital: "KAPITALI FILLESTAR",
    lastBacktest: "BACKTEST-I I FUNDIT", history: "Historiku",
    recentTrades: "Tregtimet e fundit", direction: "Drejtimi",
    entry: "Hyrja", entryTime: "Ora e hyrjes", exit: "Dalja",
    exitTime: "Ora e daljes", return: "Kthimi",
    noTrades: "Nuk ka tregtime për t'u shfaqur", reason: "Arsyeja",
    signalTime: "Koha e sinjalit", updated: "Përditësuar",
    localTime: "Ora lokale", activeZone: "ZONA KOHORE AKTIVE",
    shortTerm: "Afatshkurtër", mediumTerm: "Afatmesëm", trend: "Tendenca",
    buy: "BLERJE", sell: "SHITJE", wait: "NË PRITJE",
    errorSignal: "Gabim sinjali", errorBacktest: "Gabim backtest-i",
    loadingStats: "Duke llogaritur...", noSignal: "Nuk ka të dhëna për sinjalin",
    systemTime: "Ora përditësohet automatikisht",
    entryPrice: "Çmimi i hyrjes", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Qasje private",
    accessSubtitle: "Vendos kodin e aksesit për të hapur panelin e tregtimit të arit.",
    accessCode: "KODI I AKSESIT", accessPlaceholder: "Shkruaj kodin",
    enter: "Hyr", verifying: "Duke verifikuar...",
    invalidCode: "Kod i pavlefshëm. Provo përsëri.",
    accessNetworkError: "Kodi nuk u verifikua. Kontrollo lidhjen dhe provo përsëri.",
    rememberMe: "Ruaj hyrjen",
    accessTimeLeft: "KOHA E MBETUR E KODIT",
    accessUnlimited: "Pa afat kohor",
    accessExpired: "Kodi ka skaduar. Vendos një kod të ri.",
    logout: "Dil",
  },
  el: {
    menu: "Μενού", language: "Γλώσσα", timezone: "Ζώνη ώρας",
    chooseLanguage: "Επιλογή γλώσσας", chooseZone: "Επιλογή ζώνης ώρας",
    done: "Έγινε", active: "Το σύστημα είναι ενεργό",
    auto: "Αυτόματη ανανέωση κάθε 60 δευτερόλεπτα",
    currentSignal: "Τρέχον σήμα", marketAnalysis: "Τελευταία ανάλυση αγοράς",
    currentPrice: "ΤΡΕΧΟΥΣΑ ΤΙΜΗ", buySignal: "Σήμα αγοράς",
    sellSignal: "Σήμα πώλησης", waiting: "Αναμονή για ευκαιρία",
    loading: "Φόρτωση...", refreshSignal: "Ανανέωση σήματος",
    performance: "Απόδοση", backtest: "Αυτόματο backtest",
    strategyStats: "Στατιστικά στρατηγικής", recalculate: "Επανυπολογισμός",
    trades: "Συναλλαγές", winRate: "Ποσοστό επιτυχίας",
    profitFactor: "Συντελεστής κέρδους", netReturn: "Καθαρή απόδοση",
    drawdown: "Μέγιστη πτώση", finalCapital: "Τελικό κεφάλαιο",
    startingCapital: "ΑΡΧΙΚΟ ΚΕΦΑΛΑΙΟ", lastBacktest: "ΤΕΛΕΥΤΑΙΟ BACKTEST",
    history: "Ιστορικό", recentTrades: "Πρόσφατες συναλλαγές",
    direction: "Κατεύθυνση", entry: "Είσοδος", entryTime: "Ώρα εισόδου",
    exit: "Έξοδος", exitTime: "Ώρα εξόδου",
    return: "Απόδοση", noTrades: "Δεν υπάρχουν συναλλαγές",
    reason: "Αιτία", signalTime: "Ώρα σήματος", updated: "Ενημερώθηκε",
    localTime: "Τοπική ώρα", activeZone: "ΕΝΕΡΓΗ ΖΩΝΗ ΩΡΑΣ",
    shortTerm: "Βραχυπρόθεσμα", mediumTerm: "Μεσοπρόθεσμα", trend: "Τάση",
    buy: "ΑΓΟΡΑ", sell: "ΠΩΛΗΣΗ", wait: "ΑΝΑΜΟΝΗ",
    errorSignal: "Σφάλμα σήματος", errorBacktest: "Σφάλμα backtest",
    loadingStats: "Υπολογισμός...", noSignal: "Δεν υπάρχουν δεδομένα σήματος",
    systemTime: "Το ρολόι ενημερώνεται αυτόματα",
    entryPrice: "Τιμή εισόδου", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Ιδιωτική πρόσβαση",
    accessSubtitle: "Εισάγετε τον κωδικό πρόσβασης για να ανοίξετε τον πίνακα συναλλαγών χρυσού.",
    accessCode: "ΚΩΔΙΚΟΣ ΠΡΟΣΒΑΣΗΣ", accessPlaceholder: "Εισάγετε τον κωδικό",
    enter: "Είσοδος", verifying: "Επαλήθευση...",
    invalidCode: "Μη έγκυρος κωδικός. Δοκιμάστε ξανά.",
    accessNetworkError: "Αδυναμία επαλήθευσης. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.",
    rememberMe: "Αποθήκευση σύνδεσης",
    accessTimeLeft: "ΥΠΟΛΕΙΠΟΜΕΝΟΣ ΧΡΟΝΟΣ ΚΩΔΙΚΟΥ",
    accessUnlimited: "Χωρίς χρονικό όριο",
    accessExpired: "Ο κωδικός έχει λήξει. Εισάγετε νέο κωδικό.",
    logout: "Αποσύνδεση",
  },
  it: {
    menu: "Menu", language: "Lingua", timezone: "Fuso orario",
    chooseLanguage: "Scegli la lingua", chooseZone: "Scegli il fuso orario",
    done: "Fatto", active: "Sistema attivo",
    auto: "Aggiornamento automatico ogni 60 secondi",
    currentSignal: "Segnale attuale", marketAnalysis: "Ultima analisi di mercato",
    currentPrice: "PREZZO ATTUALE", buySignal: "Segnale di acquisto",
    sellSignal: "Segnale di vendita", waiting: "In attesa di un segnale",
    loading: "Caricamento...", refreshSignal: "Aggiorna segnale",
    performance: "Prestazioni", backtest: "Backtest automatico",
    strategyStats: "Statistiche della strategia", recalculate: "Ricalcola",
    trades: "Operazioni", winRate: "Percentuale vincite",
    profitFactor: "Fattore di profitto", netReturn: "Rendimento netto",
    drawdown: "Drawdown massimo", finalCapital: "Capitale finale",
    startingCapital: "CAPITALE INIZIALE", lastBacktest: "ULTIMO BACKTEST",
    history: "Cronologia", recentTrades: "Operazioni recenti",
    direction: "Direzione", entry: "Entrata", entryTime: "Ora di entrata",
    exit: "Uscita", exitTime: "Ora di uscita",
    return: "Rendimento", noTrades: "Nessuna operazione da mostrare",
    reason: "Motivo", signalTime: "Ora del segnale", updated: "Aggiornato",
    localTime: "Ora locale", activeZone: "FUSO ORARIO ATTIVO",
    shortTerm: "Breve termine", mediumTerm: "Medio termine", trend: "Tendenza",
    buy: "ACQUISTA", sell: "VENDI", wait: "ATTENDI",
    errorSignal: "Errore segnale", errorBacktest: "Errore backtest",
    loadingStats: "Calcolo...", noSignal: "Nessun dato del segnale disponibile",
    systemTime: "L'orologio si aggiorna automaticamente",
    entryPrice: "Prezzo di ingresso", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Accesso privato",
    accessSubtitle: "Inserisci il codice di accesso per aprire la dashboard di trading sull'oro.",
    accessCode: "CODICE DI ACCESSO", accessPlaceholder: "Inserisci il codice",
    enter: "Entra", verifying: "Verifica in corso...",
    invalidCode: "Codice non valido. Riprova.",
    accessNetworkError: "Impossibile verificare il codice. Controlla la connessione e riprova.",
    rememberMe: "Salva accesso",
    accessTimeLeft: "TEMPO RIMASTO DEL CODICE",
    accessUnlimited: "Nessun limite di tempo",
    accessExpired: "Codice scaduto. Inserisci un nuovo codice.",
    logout: "Esci",
  },
  es: {
    menu: "Menú", language: "Idioma", timezone: "Zona horaria",
    chooseLanguage: "Elegir idioma", chooseZone: "Elegir zona horaria",
    done: "Listo", active: "Sistema activo",
    auto: "Actualización automática cada 60 segundos",
    currentSignal: "Señal actual", marketAnalysis: "Último análisis del mercado",
    currentPrice: "PRECIO ACTUAL", buySignal: "Señal de compra",
    sellSignal: "Señal de venta", waiting: "Esperando una configuración",
    loading: "Cargando...", refreshSignal: "Actualizar señal",
    performance: "Rendimiento", backtest: "Backtest automático",
    strategyStats: "Estadísticas de estrategia", recalculate: "Recalcular",
    trades: "Operaciones", winRate: "Tasa de aciertos",
    profitFactor: "Factor de beneficio", netReturn: "Rendimiento neto",
    drawdown: "Caída máxima", finalCapital: "Capital final",
    startingCapital: "CAPITAL INICIAL", lastBacktest: "ÚLTIMO BACKTEST",
    history: "Historial", recentTrades: "Operaciones recientes",
    direction: "Dirección", entry: "Entrada", entryTime: "Hora de entrada",
    exit: "Salida", exitTime: "Hora de salida",
    return: "Retorno", noTrades: "No hay operaciones para mostrar",
    reason: "Motivo", signalTime: "Hora de la señal", updated: "Actualizado",
    localTime: "Hora local", activeZone: "ZONA HORARIA ACTIVA",
    shortTerm: "Corto plazo", mediumTerm: "Medio plazo", trend: "Tendencia",
    buy: "COMPRAR", sell: "VENDER", wait: "ESPERAR",
    errorSignal: "Error de señal", errorBacktest: "Error de backtest",
    loadingStats: "Calculando...", noSignal: "No hay datos de señal disponibles",
    systemTime: "El reloj se actualiza automáticamente",
    entryPrice: "Precio de entrada", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Acceso privado",
    accessSubtitle: "Introduce tu código de acceso para abrir el panel de trading de oro.",
    accessCode: "CÓDIGO DE ACCESO", accessPlaceholder: "Introduce el código",
    enter: "Entrar", verifying: "Verificando...",
    invalidCode: "Código no válido. Inténtalo de nuevo.",
    accessNetworkError: "No se pudo verificar el código. Revisa tu conexión e inténtalo de nuevo.",
    rememberMe: "Guardar sesión",
    accessTimeLeft: "TIEMPO RESTANTE DEL CÓDIGO",
    accessUnlimited: "Sin límite de tiempo",
    accessExpired: "El código ha caducado. Introduce un código nuevo.",
    logout: "Cerrar sesión",
  },
  pt: {
    menu: "Menu", language: "Idioma", timezone: "Fuso horário",
    chooseLanguage: "Escolher idioma", chooseZone: "Escolher fuso horário",
    done: "Concluído", active: "Sistema ativo",
    auto: "Atualização automática a cada 60 segundos",
    currentSignal: "Sinal atual", marketAnalysis: "Última análise do mercado",
    currentPrice: "PREÇO ATUAL", buySignal: "Sinal de compra",
    sellSignal: "Sinal de venda", waiting: "Aguardando configuração",
    loading: "Carregando...", refreshSignal: "Atualizar sinal",
    performance: "Desempenho", backtest: "Backtest automático",
    strategyStats: "Estatísticas da estratégia", recalculate: "Recalcular",
    trades: "Operações", winRate: "Taxa de acerto",
    profitFactor: "Fator de lucro", netReturn: "Retorno líquido",
    drawdown: "Drawdown máximo", finalCapital: "Capital final",
    startingCapital: "CAPITAL INICIAL", lastBacktest: "ÚLTIMO BACKTEST",
    history: "Histórico", recentTrades: "Operações recentes",
    direction: "Direção", entry: "Entrada", entryTime: "Hora de entrada",
    exit: "Saída", exitTime: "Hora de saída",
    return: "Retorno", noTrades: "Nenhuma operação para exibir",
    reason: "Motivo", signalTime: "Hora do sinal", updated: "Atualizado",
    localTime: "Hora local", activeZone: "FUSO HORÁRIO ATIVO",
    shortTerm: "Curto prazo", mediumTerm: "Médio prazo", trend: "Tendência",
    buy: "COMPRAR", sell: "VENDER", wait: "AGUARDAR",
    errorSignal: "Erro no sinal", errorBacktest: "Erro no backtest",
    loadingStats: "Calculando...", noSignal: "Nenhum dado de sinal disponível",
    systemTime: "O relógio é atualizado automaticamente",
    entryPrice: "Preço de entrada", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Acesso privado",
    accessSubtitle: "Introduza o código de acesso para abrir o painel de trading de ouro.",
    accessCode: "CÓDIGO DE ACESSO", accessPlaceholder: "Introduza o código",
    enter: "Entrar", verifying: "A verificar...",
    invalidCode: "Código inválido. Tente novamente.",
    accessNetworkError: "Não foi possível verificar o código. Verifique a ligação e tente novamente.",
    rememberMe: "Guardar sessão",
    accessTimeLeft: "TEMPO RESTANTE DO CÓDIGO",
    accessUnlimited: "Sem limite de tempo",
    accessExpired: "O código expirou. Introduza um novo código.",
    logout: "Sair",
  },
  fr: {
    menu: "Menu", language: "Langue", timezone: "Fuseau horaire",
    chooseLanguage: "Choisir la langue", chooseZone: "Choisir le fuseau horaire",
    done: "Terminé", active: "Système actif",
    auto: "Actualisation automatique toutes les 60 secondes",
    currentSignal: "Signal actuel", marketAnalysis: "Dernière analyse du marché",
    currentPrice: "PRIX ACTUEL", buySignal: "Signal d'achat",
    sellSignal: "Signal de vente", waiting: "En attente d'une configuration",
    loading: "Chargement...", refreshSignal: "Actualiser le signal",
    performance: "Performance", backtest: "Backtest automatique",
    strategyStats: "Statistiques de stratégie", recalculate: "Recalculer",
    trades: "Transactions", winRate: "Taux de réussite",
    profitFactor: "Facteur de profit", netReturn: "Rendement net",
    drawdown: "Baisse maximale", finalCapital: "Capital final",
    startingCapital: "CAPITAL INITIAL", lastBacktest: "DERNIER BACKTEST",
    history: "Historique", recentTrades: "Transactions récentes",
    direction: "Direction", entry: "Entrée", entryTime: "Heure d'entrée",
    exit: "Sortie", exitTime: "Heure de sortie",
    return: "Rendement", noTrades: "Aucune transaction à afficher",
    reason: "Raison", signalTime: "Heure du signal", updated: "Mis à jour",
    localTime: "Heure locale", activeZone: "FUSEAU HORAIRE ACTIF",
    shortTerm: "Court terme", mediumTerm: "Moyen terme", trend: "Tendance",
    buy: "ACHAT", sell: "VENTE", wait: "ATTENTE",
    errorSignal: "Erreur de signal", errorBacktest: "Erreur de backtest",
    loadingStats: "Calcul...", noSignal: "Aucune donnée de signal disponible",
    systemTime: "L'horloge se met à jour automatiquement",
    entryPrice: "Prix d'entrée", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Accès privé",
    accessSubtitle: "Saisissez votre code d'accès pour ouvrir le tableau de bord de trading sur l'or.",
    accessCode: "CODE D'ACCÈS", accessPlaceholder: "Saisissez le code",
    enter: "Entrer", verifying: "Vérification...",
    invalidCode: "Code invalide. Veuillez réessayer.",
    accessNetworkError: "Impossible de vérifier le code. Vérifiez votre connexion et réessayez.",
    rememberMe: "Enregistrer la connexion",
    accessTimeLeft: "TEMPS RESTANT DU CODE",
    accessUnlimited: "Aucune limite de temps",
    accessExpired: "Le code a expiré. Saisissez un nouveau code.",
    logout: "Déconnexion",
  },
  de: {
    menu: "Menü", language: "Sprache", timezone: "Zeitzone",
    chooseLanguage: "Sprache auswählen", chooseZone: "Zeitzone auswählen",
    done: "Fertig", active: "System aktiv",
    auto: "Automatische Aktualisierung alle 60 Sekunden",
    currentSignal: "Aktuelles Signal", marketAnalysis: "Letzte Marktanalyse",
    currentPrice: "AKTUELLER PREIS", buySignal: "Kaufsignal",
    sellSignal: "Verkaufssignal", waiting: "Warte auf ein Setup",
    loading: "Laden...", refreshSignal: "Signal aktualisieren",
    performance: "Leistung", backtest: "Automatischer Backtest",
    strategyStats: "Strategiestatistiken", recalculate: "Neu berechnen",
    trades: "Trades", winRate: "Trefferquote", profitFactor: "Profitfaktor",
    netReturn: "Nettorendite", drawdown: "Maximaler Drawdown",
    finalCapital: "Endkapital", startingCapital: "STARTKAPITAL",
    lastBacktest: "LETZTER BACKTEST", history: "Verlauf",
    recentTrades: "Letzte Trades", direction: "Richtung", entry: "Einstieg",
    entryTime: "Einstiegszeit", exit: "Ausstieg", exitTime: "Ausstiegszeit",
    return: "Rendite", noTrades: "Keine Trades vorhanden",
    reason: "Grund", signalTime: "Signalzeit", updated: "Aktualisiert",
    localTime: "Ortszeit", activeZone: "AKTIVE ZEITZONE",
    shortTerm: "Kurzfristig", mediumTerm: "Mittelfristig", trend: "Trend",
    buy: "KAUFEN", sell: "VERKAUFEN", wait: "WARTEN",
    errorSignal: "Signalfehler", errorBacktest: "Backtest-Fehler",
    loadingStats: "Berechnung...", noSignal: "Keine Signaldaten verfügbar",
    systemTime: "Uhrzeit wird automatisch aktualisiert",
    entryPrice: "Einstiegspreis", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Privater Zugang",
    accessSubtitle: "Gib deinen Zugangscode ein, um das Gold-Trading-Dashboard zu öffnen.",
    accessCode: "ZUGANGSCODE", accessPlaceholder: "Code eingeben",
    enter: "Anmelden", verifying: "Wird überprüft...",
    invalidCode: "Ungültiger Zugangscode. Bitte versuche es erneut.",
    accessNetworkError: "Code konnte nicht überprüft werden. Prüfe deine Verbindung und versuche es erneut.",
    rememberMe: "Anmeldung speichern",
    accessTimeLeft: "VERBLEIBENDE ZEIT DES CODES",
    accessUnlimited: "Keine Zeitbegrenzung",
    accessExpired: "Der Code ist abgelaufen. Bitte gib einen neuen Code ein.",
    logout: "Abmelden",
  },
  tr: {
    menu: "Menü", language: "Dil", timezone: "Saat dilimi",
    chooseLanguage: "Dil seç", chooseZone: "Saat dilimi seç",
    done: "Tamam", active: "Sistem aktif",
    auto: "Her 60 saniyede otomatik yenileme",
    currentSignal: "Güncel sinyal", marketAnalysis: "Son piyasa analizi",
    currentPrice: "GÜNCEL FİYAT", buySignal: "Alım sinyali",
    sellSignal: "Satış sinyali", waiting: "Sinyal bekleniyor",
    loading: "Yükleniyor...", refreshSignal: "Sinyali yenile",
    performance: "Performans", backtest: "Otomatik backtest",
    strategyStats: "Strateji istatistikleri", recalculate: "Yeniden hesapla",
    trades: "İşlemler", winRate: "Kazanma oranı", profitFactor: "Kâr faktörü",
    netReturn: "Net getiri", drawdown: "Maksimum düşüş",
    finalCapital: "Son sermaye", startingCapital: "BAŞLANGIÇ SERMAYESİ",
    lastBacktest: "SON BACKTEST", history: "Geçmiş",
    recentTrades: "Son işlemler", direction: "Yön", entry: "Giriş",
    entryTime: "Giriş zamanı", exit: "Çıkış", exitTime: "Çıkış zamanı",
    return: "Getiri", noTrades: "Gösterilecek işlem yok",
    reason: "Neden", signalTime: "Sinyal zamanı", updated: "Güncellendi",
    localTime: "Yerel saat", activeZone: "ETKİN SAAT DİLİMİ",
    shortTerm: "Kısa vadeli", mediumTerm: "Orta vadeli", trend: "Trend",
    buy: "AL", sell: "SAT", wait: "BEKLE",
    errorSignal: "Sinyal hatası", errorBacktest: "Backtest hatası",
    loadingStats: "Hesaplanıyor...", noSignal: "Sinyal verisi bulunamadı",
    systemTime: "Saat otomatik güncellenir",
    entryPrice: "Giriş fiyatı", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Özel erişim",
    accessSubtitle: "Altın işlem panosunu açmak için erişim kodunu gir.",
    accessCode: "ERİŞİM KODU", accessPlaceholder: "Kodu gir",
    enter: "Giriş", verifying: "Doğrulanıyor...",
    invalidCode: "Geçersiz erişim kodu. Lütfen tekrar dene.",
    accessNetworkError: "Kod doğrulanamadı. Bağlantını kontrol edip tekrar dene.",
    rememberMe: "Girişi kaydet",
    accessTimeLeft: "KODUN KALAN SÜRESİ",
    accessUnlimited: "Süre sınırı yok",
    accessExpired: "Kodun süresi doldu. Lütfen yeni bir kod gir.",
    logout: "Çıkış yap",
  },
  ar: {
    menu: "القائمة", language: "اللغة", timezone: "المنطقة الزمنية",
    chooseLanguage: "اختر اللغة", chooseZone: "اختر المنطقة الزمنية",
    done: "تم", active: "النظام نشط",
    auto: "تحديث تلقائي كل 60 ثانية",
    currentSignal: "الإشارة الحالية", marketAnalysis: "آخر تحليل للسوق",
    currentPrice: "السعر الحالي", buySignal: "إشارة شراء",
    sellSignal: "إشارة بيع", waiting: "في انتظار فرصة",
    loading: "جار التحميل...", refreshSignal: "تحديث الإشارة",
    performance: "الأداء", backtest: "اختبار تاريخي تلقائي",
    strategyStats: "إحصائيات الاستراتيجية", recalculate: "إعادة الحساب",
    trades: "الصفقات", winRate: "نسبة النجاح", profitFactor: "عامل الربح",
    netReturn: "العائد الصافي", drawdown: "أقصى تراجع",
    finalCapital: "رأس المال النهائي", startingCapital: "رأس المال الأولي",
    lastBacktest: "آخر اختبار", history: "السجل", recentTrades: "الصفقات الأخيرة",
    direction: "الاتجاه", entry: "الدخول", entryTime: "وقت الدخول",
    exit: "الخروج", exitTime: "وقت الخروج",
    return: "العائد", noTrades: "لا توجد صفقات للعرض",
    reason: "السبب", signalTime: "وقت الإشارة", updated: "تم التحديث",
    localTime: "الوقت المحلي", activeZone: "المنطقة الزمنية النشطة",
    shortTerm: "قصير المدى", mediumTerm: "متوسط المدى", trend: "الاتجاه",
    buy: "شراء", sell: "بيع", wait: "انتظار",
    errorSignal: "خطأ في الإشارة", errorBacktest: "خطأ في الاختبار",
    loadingStats: "جار الحساب...", noSignal: "لا توجد بيانات للإشارة",
    systemTime: "يتم تحديث الساعة تلقائيًا",
    entryPrice: "سعر الدخول", takeProfit1: "جني الأرباح 1",
    takeProfit2: "جني الأرباح 2", stopLoss: "وقف الخسارة",
    accessTitle: "وصول خاص",
    accessSubtitle: "أدخل رمز الوصول لفتح لوحة تداول الذهب.",
    accessCode: "رمز الوصول", accessPlaceholder: "أدخل الرمز",
    enter: "دخول", verifying: "جارٍ التحقق...",
    invalidCode: "رمز الوصول غير صالح. حاول مرة أخرى.",
    accessNetworkError: "تعذر التحقق من الرمز. تحقق من اتصالك وحاول مرة أخرى.",
    rememberMe: "حفظ تسجيل الدخول",
    accessTimeLeft: "الوقت المتبقي للرمز",
    accessUnlimited: "بدون حد زمني",
    accessExpired: "انتهت صلاحية الرمز. أدخل رمزًا جديدًا.",
    logout: "تسجيل الخروج",
  },
  ru: {
    menu: "Меню", language: "Язык", timezone: "Часовой пояс",
    chooseLanguage: "Выберите язык", chooseZone: "Выберите часовой пояс",
    done: "Готово", active: "Система активна",
    auto: "Автообновление каждые 60 секунд",
    currentSignal: "Текущий сигнал", marketAnalysis: "Последний анализ рынка",
    currentPrice: "ТЕКУЩАЯ ЦЕНА", buySignal: "Сигнал на покупку",
    sellSignal: "Сигнал на продажу", waiting: "Ожидание сигнала",
    loading: "Загрузка...", refreshSignal: "Обновить сигнал",
    performance: "Результаты", backtest: "Автоматический бэктест",
    strategyStats: "Статистика стратегии", recalculate: "Пересчитать",
    trades: "Сделки", winRate: "Процент побед", profitFactor: "Фактор прибыли",
    netReturn: "Чистая доходность", drawdown: "Максимальная просадка",
    finalCapital: "Итоговый капитал", startingCapital: "НАЧАЛЬНЫЙ КАПИТАЛ",
    lastBacktest: "ПОСЛЕДНИЙ БЭКТЕСТ", history: "История",
    recentTrades: "Последние сделки", direction: "Направление",
    entry: "Вход", entryTime: "Время входа", exit: "Выход",
    exitTime: "Время выхода", return: "Доходность",
    noTrades: "Нет сделок для отображения", reason: "Причина",
    signalTime: "Время сигнала", updated: "Обновлено",
    localTime: "Местное время", activeZone: "АКТИВНЫЙ ЧАСОВОЙ ПОЯС",
    shortTerm: "Краткосрочный", mediumTerm: "Среднесрочный", trend: "Тренд",
    buy: "ПОКУПКА", sell: "ПРОДАЖА", wait: "ОЖИДАНИЕ",
    errorSignal: "Ошибка сигнала", errorBacktest: "Ошибка бэктеста",
    loadingStats: "Расчёт...", noSignal: "Нет данных сигнала",
    systemTime: "Время обновляется автоматически",
    entryPrice: "Цена входа", takeProfit1: "Тейк-профит 1",
    takeProfit2: "Тейк-профит 2", stopLoss: "Стоп-лосс",
    accessTitle: "Закрытый доступ",
    accessSubtitle: "Введите код доступа, чтобы открыть панель торговли золотом.",
    accessCode: "КОД ДОСТУПА", accessPlaceholder: "Введите код",
    enter: "Войти", verifying: "Проверка...",
    invalidCode: "Неверный код доступа. Попробуйте ещё раз.",
    accessNetworkError: "Не удалось проверить код. Проверьте соединение и повторите попытку.",
    rememberMe: "Сохранить вход",
    accessTimeLeft: "ОСТАВШЕЕСЯ ВРЕМЯ КОДА",
    accessUnlimited: "Без ограничения по времени",
    accessExpired: "Срок действия кода истёк. Введите новый код.",
    logout: "Выйти",
  },
  "pt-BR": {
    menu: "Menu", language: "Idioma", timezone: "Fuso horário",
    chooseLanguage: "Escolher idioma", chooseZone: "Escolher fuso horário",
    done: "Concluído", active: "Sistema ativo",
    auto: "Atualização automática a cada 60 segundos",
    currentSignal: "Sinal atual", marketAnalysis: "Última análise do mercado",
    currentPrice: "PREÇO ATUAL", buySignal: "Sinal de compra",
    sellSignal: "Sinal de venda", waiting: "Aguardando configuração",
    loading: "Carregando...", refreshSignal: "Atualizar sinal",
    performance: "Desempenho", backtest: "Backtest automático",
    strategyStats: "Estatísticas da estratégia", recalculate: "Recalcular",
    trades: "Operações", winRate: "Taxa de acerto", profitFactor: "Fator de lucro",
    netReturn: "Retorno líquido", drawdown: "Drawdown máximo",
    finalCapital: "Capital final", startingCapital: "CAPITAL INICIAL",
    lastBacktest: "ÚLTIMO BACKTEST", history: "Histórico",
    recentTrades: "Operações recentes", direction: "Direção",
    entry: "Entrada", entryTime: "Horário de entrada", exit: "Saída",
    exitTime: "Horário de saída", return: "Retorno",
    noTrades: "Nenhuma operação para exibir", reason: "Motivo",
    signalTime: "Horário do sinal", updated: "Atualizado",
    localTime: "Hora local", activeZone: "FUSO HORÁRIO ATIVO",
    shortTerm: "Curto prazo", mediumTerm: "Médio prazo", trend: "Tendência",
    buy: "COMPRAR", sell: "VENDER", wait: "AGUARDAR",
    errorSignal: "Erro no sinal", errorBacktest: "Erro no backtest",
    loadingStats: "Calculando...", noSignal: "Nenhum dado de sinal disponível",
    systemTime: "O relógio é atualizado automaticamente",
    entryPrice: "Preço de entrada", takeProfit1: "Take Profit 1",
    takeProfit2: "Take Profit 2", stopLoss: "Stop Loss",
    accessTitle: "Acesso privado",
    accessSubtitle: "Digite o código de acesso para abrir o painel de trading de ouro.",
    accessCode: "CÓDIGO DE ACESSO", accessPlaceholder: "Digite o código",
    enter: "Entrar", verifying: "Verificando...",
    invalidCode: "Código inválido. Tente novamente.",
    accessNetworkError: "Não foi possível verificar o código. Verifique sua conexão e tente novamente.",
    rememberMe: "Salvar login",
    accessTimeLeft: "TEMPO RESTANTE DO CÓDIGO",
    accessUnlimited: "Sem limite de tempo",
    accessExpired: "O código expirou. Digite um novo código.",
    logout: "Sair",
  },
  ja: {
    menu: "メニュー", language: "言語", timezone: "タイムゾーン",
    chooseLanguage: "言語を選択", chooseZone: "タイムゾーンを選択",
    done: "完了", active: "システム稼働中",
    auto: "60秒ごとに自動更新", currentSignal: "現在のシグナル",
    marketAnalysis: "最新の市場分析", currentPrice: "現在価格",
    buySignal: "買いシグナル", sellSignal: "売りシグナル",
    waiting: "シグナル待機中", loading: "読み込み中...",
    refreshSignal: "シグナルを更新", performance: "パフォーマンス",
    backtest: "自動バックテスト", strategyStats: "戦略統計",
    recalculate: "再計算", trades: "取引", winRate: "勝率",
    profitFactor: "プロフィットファクター", netReturn: "純利益率",
    drawdown: "最大ドローダウン", finalCapital: "最終資金",
    startingCapital: "初期資金", lastBacktest: "最終バックテスト",
    history: "履歴", recentTrades: "最近の取引", direction: "方向",
    entry: "エントリー", entryTime: "エントリー時刻", exit: "決済",
    exitTime: "決済時刻", return: "リターン",
    noTrades: "表示する取引はありません", reason: "理由",
    signalTime: "シグナル時刻", updated: "更新済み",
    localTime: "現地時間", activeZone: "使用中のタイムゾーン",
    shortTerm: "短期", mediumTerm: "中期", trend: "トレンド",
    buy: "買い", sell: "売り", wait: "待機",
    errorSignal: "シグナルエラー",
    errorBacktest: "バックテストエラー", loadingStats: "計算中...",
    noSignal: "シグナルデータがありません", systemTime: "時計は自動更新されます",
    entryPrice: "エントリー価格", takeProfit1: "利確 1",
    takeProfit2: "利確 2", stopLoss: "損切り",
    accessTitle: "プライベートアクセス",
    accessSubtitle: "アクセスコードを入力して、ゴールド取引ダッシュボードを開きます。",
    accessCode: "アクセスコード", accessPlaceholder: "コードを入力",
    enter: "ログイン", verifying: "確認中...",
    invalidCode: "アクセスコードが無効です。もう一度お試しください。",
    accessNetworkError: "コードを確認できませんでした。接続を確認して再試行してください。",
    rememberMe: "ログイン情報を保存",
    accessTimeLeft: "コードの残り時間",
    accessUnlimited: "期限なし",
    accessExpired: "コードの有効期限が切れました。新しいコードを入力してください。",
    logout: "ログアウト",
  },
  zh: {
    menu: "菜单", language: "语言", timezone: "时区",
    chooseLanguage: "选择语言", chooseZone: "选择时区",
    done: "完成", active: "系统运行中",
    auto: "每60秒自动刷新", currentSignal: "当前信号",
    marketAnalysis: "最新市场分析", currentPrice: "当前价格",
    buySignal: "买入信号", sellSignal: "卖出信号",
    waiting: "等待交易机会", loading: "加载中...",
    refreshSignal: "刷新信号", performance: "表现",
    backtest: "自动回测", strategyStats: "策略统计",
    recalculate: "重新计算", trades: "交易次数", winRate: "胜率",
    profitFactor: "盈利因子", netReturn: "净收益率",
    drawdown: "最大回撤", finalCapital: "最终资金",
    startingCapital: "初始资金", lastBacktest: "最近回测",
    history: "历史记录", recentTrades: "最近交易", direction: "方向",
    entry: "入场价", entryTime: "入场时间", exit: "出场价",
    exitTime: "出场时间", return: "收益",
    noTrades: "暂无交易记录", reason: "原因", signalTime: "信号时间",
    updated: "已更新", localTime: "当地时间", activeZone: "当前时区",
    shortTerm: "短期", mediumTerm: "中期", trend: "趋势",
    buy: "买入", sell: "卖出", wait: "等待",
    errorSignal: "信号错误",
    errorBacktest: "回测错误", loadingStats: "计算中...",
    noSignal: "暂无信号数据", systemTime: "时钟自动更新",
    entryPrice: "入场价格", takeProfit1: "止盈 1",
    takeProfit2: "止盈 2", stopLoss: "止损",
    accessTitle: "私人访问",
    accessSubtitle: "输入访问码以打开黄金交易仪表板。",
    accessCode: "访问码", accessPlaceholder: "输入访问码",
    enter: "进入", verifying: "验证中...",
    invalidCode: "访问码无效,请重试。",
    accessNetworkError: "无法验证访问码,请检查网络后重试。",
    rememberMe: "保存登录",
    accessTimeLeft: "访问码剩余时间",
    accessUnlimited: "无时间限制",
    accessExpired: "访问码已过期,请输入新的访问码。",
    logout: "退出登录",
  },
};

const timeZones = [
  { name: "Greece", zone: "Europe/Athens", flag: "🇬🇷" },
  { name: "Albania", zone: "Europe/Tirane", flag: "🇦🇱" },
  { name: "London", zone: "Europe/London", flag: "🇬🇧" },
  { name: "New York", zone: "America/New_York", flag: "🇺🇸" },
  { name: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { name: "Dubai", zone: "Asia/Dubai", flag: "🇦🇪" },
  { name: "Frankfurt", zone: "Europe/Berlin", flag: "🇩🇪" },
  { name: "Sydney", zone: "Australia/Sydney", flag: "🇦🇺" },
  { name: "UTC", zone: "UTC", flag: "🌐" },
];

const C = {
  bg: "#050706",
  panel: "#0b100d",
  panel2: "#101812",
  border: "rgba(57,255,136,0.20)",
  gold: "#39ff88",
  gold2: "#7dffad",
  text: "#f2fff6",
  muted: "#899b8f",
  green: "#39ff88",
  red: "#ff6577",
};

const GOLD = "#d4af37";
const GOLD_SOFT = "#f0d98a";

const panel: React.CSSProperties = {
  background: "linear-gradient(145deg, #131417, #0d0e10)",
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 20,
  minWidth: 0,
};

const label: React.CSSProperties = {
  color: C.muted,
  fontSize: 11,
  letterSpacing: 1.2,
  fontWeight: 700,
};

// Decorative candlestick data for the access screen (static, no randomness).
const CHART_CANDLES = Array.from({ length: 30 }, (_, i) => {
  const x = 30 + i * 40;
  const base = 330 - i * 4 + Math.sin(i * 0.8) * 34 + Math.cos(i * 0.35) * 20;
  const body = 12 + Math.abs(Math.sin(i * 1.7)) * 30;
  const up = Math.sin(i * 2.3) > -0.3;
  const open = base;
  const close = up ? base - body : base + body;
  const high = Math.min(open, close) - (6 + Math.abs(Math.cos(i * 1.3)) * 18);
  const low = Math.max(open, close) + (6 + Math.abs(Math.sin(i * 0.9)) * 18);
  return { x, open, close, high, low, up };
});

const CHART_LINE_D =
  "M" + CHART_CANDLES.map((c) => `${c.x} ${c.close.toFixed(1)}`).join(" L");

const CHART_AREA_D = `${CHART_LINE_D} L${CHART_CANDLES[CHART_CANDLES.length - 1].x} 600 L${CHART_CANDLES[0].x} 600 Z`;

const CHART_LAST_Y = CHART_CANDLES[CHART_CANDLES.length - 1].close;

function numberFrom(...values: any[]): number | null {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function money(value: any, currency = "USD") {
  const n = numberFrom(value);
  if (n === null) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function percent(value: any) {
  const n = numberFrom(value);
  return n === null ? "—" : `${n.toFixed(2)}%`;
}

function metricNumber(value: any) {
  const n = numberFrom(value);
  return n === null ? "—" : n.toFixed(2);
}

function dateInZone(value: any, zone: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function first(data: Data | null, ...keys: string[]) {
  if (!data) return undefined;

  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  return undefined;
}

type AccessResult = { ok: boolean; expiresAt: number | null };

/** Removes a saved access code from both persistent and session storage. */
function clearSavedAccess() {
  try {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    // Ignore unavailable local storage.
  }
  try {
    sessionStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    // Ignore unavailable session storage.
  }
}

/**
 * Reads the expiry time (as a ms timestamp) out of the /api/access response.
 * Supports an absolute timestamp/date or a relative "seconds left" value.
 * Returns null when the server does not report any expiry.
 */
function parseExpiry(data: Data | null): number | null {
  if (!data) return null;

  const abs = first(
    data,
    "expiresAt", "expires_at", "expiry", "expires", "exp", "validUntil", "valid_until"
  );

  if (abs !== undefined) {
    const n = Number(abs);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;

    const d = new Date(String(abs)).getTime();
    if (Number.isFinite(d)) return d;
  }

  const secs = numberFrom(
    first(data, "remainingSeconds", "remaining_seconds", "expiresIn", "expires_in", "secondsLeft")
  );
  if (secs !== null) return Date.now() + secs * 1000;

  const ms = numberFrom(first(data, "remainingMs", "remaining_ms"));
  if (ms !== null) return Date.now() + ms;

  return null;
}

/**
 * Verifies the access code with the existing /api/access endpoint.
 * Returns { ok, expiresAt }. Throws when the server cannot be reached
 * or returns an unexpected error.
 */
async function verifyAccessCode(code: string): Promise<AccessResult> {
  const response = await fetch(ACCESS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  let data: Data | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if ([400, 401, 403].includes(response.status)) {
    return { ok: false, expiresAt: null };
  }

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  if (data && typeof data === "object") {
    for (const key of ["ok", "success", "authorized", "valid", "granted", "access"]) {
      if (typeof data[key] === "boolean") {
        const accepted = data[key] as boolean;
        return { ok: accepted, expiresAt: accepted ? parseExpiry(data) : null };
      }
    }
    if (data.error) return { ok: false, expiresAt: null };
  }

  return { ok: true, expiresAt: parseExpiry(data) };
}

function KLLogo({ size = 58, gradientId = "kl-neon" }: { size?: number; gradientId?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        filter: "drop-shadow(0 0 9px rgba(57,255,136,0.45))",
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DFFAD" />
          <stop offset="100%" stopColor="#39FF88" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="94" height="94" rx="24" fill="#050706" stroke="#39FF88" strokeWidth="2" />
      <path d="M50 13V22M43 13H57" stroke="#39FF88" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M25 39Q25 29 36 29H64Q75 29 75 39V59Q75 69 64 69H36Q25 69 25 59Z"
        fill="#101812"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
      />
      <rect x="34" y="40" width="11" height="11" rx="3" fill="#39FF88" />
      <rect x="55" y="40" width="11" height="11" rx="3" fill="#39FF88" />
      <path d="M39 59H61" stroke="#7DFFAD" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 42H25M75 42H82M18 55H25M75 55H82" stroke="#39FF88" strokeWidth="2.5" strokeLinecap="round" />
      <text x="50" y="86" textAnchor="middle" fill="#7DFFAD" fontSize="14" fontWeight="900" letterSpacing="2">
        KL
      </text>
    </svg>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Lang>("sq");
  const [languageReady, setLanguageReady] = useState(false);
  const [selectedZone, setSelectedZone] = useState("Europe/Athens");
  const [menuOpen, setMenuOpen] = useState(false);

  const [accessChecked, setAccessChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<"" | "invalid" | "network" | "expired">("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const [signal, setSignal] = useState<Data | null>(null);
  const [backtest, setBacktest] = useState<Data | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(true);
  const [signalError, setSignalError] = useState("");
  const [backtestError, setBacktestError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [now, setNow] = useState(new Date());

  const t = (key: string) =>
    translations[language]?.[key] ?? en[key] ?? key;

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("kelilelibot-language");
      const savedZone = localStorage.getItem("kelilelibot-timezone");

      if (savedLanguage && languages.some((x) => x.code === savedLanguage)) {
        setLanguage(savedLanguage as Lang);
      }

      if (savedZone && timeZones.some((x) => x.zone === savedZone)) {
        setSelectedZone(savedZone);
      }
    } catch {
      // Local storage may be unavailable in some browser contexts.
    }

    setLanguageReady(true);
  }, []);

  // Auto-login: re-verify a saved access code (if any) with /api/access.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let saved: string | null = null;

      try {
        saved =
          localStorage.getItem(ACCESS_STORAGE_KEY) ||
          sessionStorage.getItem(ACCESS_STORAGE_KEY);
      } catch {
        // Storage may be unavailable; the user will simply log in again.
      }

      if (saved === "granted") {
        // Legacy value from the previous version.
        clearSavedAccess();
      } else if (saved) {
        try {
          const result = await verifyAccessCode(saved);

          if (!cancelled) {
            if (result.ok) {
              setExpiresAt(result.expiresAt);
              setAuthorized(true);
            } else {
              clearSavedAccess();
            }
          }
        } catch {
          // Network error: stay on the login screen and keep the saved code.
        }
      }

      if (!cancelled) setAccessChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!languageReady) return;

    try {
      localStorage.setItem("kelilelibot-language", language);
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    } catch {
      // The language still works for the current session.
    }
  }, [language, languageReady]);

  useEffect(() => {
    try {
      localStorage.setItem("kelilelibot-timezone", selectedZone);
    } catch {
      // Ignore unavailable local storage.
    }
  }, [selectedZone]);

  const refreshSignal = useCallback(async () => {
    setSignalLoading(true);
    setSignalError("");

    try {
      const response = await fetch("/api/signals", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      setSignal(data);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      setSignalError(
        error instanceof Error ? error.message : "Could not load signal"
      );
    } finally {
      setSignalLoading(false);
    }
  }, []);

  const refreshBacktest = useCallback(async () => {
    setBacktestLoading(true);
    setBacktestError("");

    try {
      const response = await fetch("/api/backtest", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      setBacktest(data);
    } catch (error) {
      setBacktestError(
        error instanceof Error ? error.message : "Could not load backtest"
      );
    } finally {
      setBacktestLoading(false);
    }
  }, []);

  useEffect(() => {
    // The dashboard only loads data after the user is authorized.
    if (!authorized) return;

    void refreshSignal();
    void refreshBacktest();

    const signalTimer = window.setInterval(() => void refreshSignal(), 60000);
    const backtestTimer = window.setInterval(() => void refreshBacktest(), 60000);
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearInterval(signalTimer);
      window.clearInterval(backtestTimer);
      window.clearInterval(clockTimer);
    };
  }, [authorized, refreshSignal, refreshBacktest]);

  const handleAccessSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = accessCode.trim();
    if (!code || accessLoading) return;

    setAccessLoading(true);
    setAccessError("");

    try {
      const result = await verifyAccessCode(code);

      if (result.ok) {
        try {
          clearSavedAccess();
          (rememberLogin ? localStorage : sessionStorage).setItem(
            ACCESS_STORAGE_KEY,
            code
          );
        } catch {
          // Access still works for the current page session.
        }

        setExpiresAt(result.expiresAt);
        setAccessCode("");
        setAuthorized(true);
      } else {
        setAccessError("invalid");
      }
    } catch {
      setAccessError("network");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleLogout = () => {
    clearSavedAccess();

    setMenuOpen(false);
    setSignal(null);
    setBacktest(null);
    setSignalLoading(true);
    setBacktestLoading(true);
    setSignalError("");
    setBacktestError("");
    setAccessCode("");
    setAccessError("");
    setExpiresAt(null);
    setAuthorized(false);
  };

  // Live countdown of the remaining access time.
  useEffect(() => {
    if (!authorized || !expiresAt) {
      setTimeLeft("");
      return;
    }

    const tick = () => {
      const ms = expiresAt - Date.now();

      if (ms <= 0) {
        handleLogout();
        setAccessError("expired");
        return;
      }

      const d = Math.floor(ms / 86400000);
      const h = String(Math.floor(ms / 3600000) % 24).padStart(2, "0");
      const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
      const s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");

      setTimeLeft(d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    };

    tick();
    const id = window.setInterval(tick, 1000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, expiresAt]);

  if (!accessChecked) {
    return <main style={{ minHeight: "100vh", background: "#000" }} />;
  }

  if (!authorized) {
    const errorText =
      accessError === "invalid"
        ? t("invalidCode")
        : accessError === "network"
          ? t("accessNetworkError")
          : accessError === "expired"
            ? t("accessExpired")
            : "";

    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          overflowY: "auto",
          background: "#000",
          color: C.text,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          direction: language === "ar" ? "rtl" : "ltr",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div className="kl-glow" />
          <div className="kl-grid" />

          <svg
            viewBox="0 0 1200 600"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, opacity: 0.6 }}
          >
            <defs>
              <linearGradient id="kl-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39ff88" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#39ff88" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[100, 200, 300, 400, 500].map((y) => (
              <line
                key={y}
                x1="0"
                x2="1200"
                y1={y}
                y2={y}
                stroke="rgba(57,255,136,0.07)"
                strokeWidth="1"
              />
            ))}

            <path d={CHART_AREA_D} fill="url(#kl-area)" />

            {CHART_CANDLES.map((c) => {
              const color = c.up ? "#39ff88" : "#ff6577";
              const top = Math.min(c.open, c.close);
              const height = Math.max(Math.abs(c.open - c.close), 3);

              return (
                <g key={c.x} opacity={c.up ? 0.85 : 0.5}>
                  <line
                    x1={c.x}
                    x2={c.x}
                    y1={c.high}
                    y2={c.low}
                    stroke={color}
                    strokeWidth="2"
                  />
                  <rect
                    x={c.x - 7}
                    y={top}
                    width="14"
                    height={height}
                    rx="2"
                    fill={color}
                  />
                </g>
              );
            })}

            <path
              className="kl-line"
              d={CHART_LINE_D}
              fill="none"
              stroke="#7dffad"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />

            <line
              x1="0"
              x2="1200"
              y1={CHART_LAST_Y}
              y2={CHART_LAST_Y}
              stroke={GOLD}
              strokeWidth="1.5"
              strokeDasharray="6 8"
              opacity="0.8"
            />
            <text
              x="1190"
              y={CHART_LAST_Y - 10}
              textAnchor="end"
              fill={GOLD}
              fontSize="16"
              fontWeight="700"
              letterSpacing="2"
            >
              XAU/USD
            </text>
          </svg>

          <div className="kl-scan" />
          <div className="kl-vignette" />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "72px 16px 32px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 16,
              insetInlineEnd: 16,
            }}
          >
            <select
              aria-label={t("language")}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Lang)}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: "rgba(0,0,0,0.7)",
                color: C.text,
                outline: "none",
                fontSize: 12,
                maxWidth: 190,
              }}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.name}
                </option>
              ))}
            </select>
          </div>

          <section
            className="kl-card"
            style={{
              width: "100%",
              maxWidth: 410,
              borderRadius: 22,
              padding: "34px 26px 26px",
              background:
                "linear-gradient(160deg, rgba(14,22,17,0.88), rgba(3,5,4,0.92))",
              border: "1px solid rgba(57,255,136,0.28)",
              boxShadow:
                "0 0 0 1px rgba(212,175,55,0.14), 0 24px 80px rgba(0,0,0,0.75), 0 0 60px rgba(57,255,136,0.12)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 24,
                right: 24,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <KLLogo size={68} gradientId="kl-neon-gate" />

              <div
                style={{
                  marginTop: 16,
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                }}
              >
                Keli<span style={{ color: C.green }}>Leli</span>bot
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: GOLD,
                }}
              >
                GOLD TRADING SYSTEM
              </div>

              <h1
                style={{
                  margin: "24px 0 8px",
                  fontSize: 20,
                  fontWeight: 850,
                  letterSpacing: -0.2,
                }}
              >
                {t("accessTitle")}
              </h1>

              <p
                style={{
                  margin: 0,
                  color: C.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {t("accessSubtitle")}
              </p>
            </div>

            <form onSubmit={handleAccessSubmit} noValidate style={{ marginTop: 24 }}>
              <label
                htmlFor="access-code"
                style={{ ...label, display: "block", marginBottom: 9, color: GOLD_SOFT }}
              >
                {t("accessCode")}
              </label>

              <input
                id="access-code"
                className="kl-input"
                type="password"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  if (accessError) setAccessError("");
                }}
                placeholder={t("accessPlaceholder")}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={accessLoading}
                aria-invalid={accessError !== ""}
                aria-describedby={errorText ? "access-error" : undefined}
                style={{
                  width: "100%",
                  padding: "14px 15px",
                  borderRadius: 12,
                  border: `1px solid ${
                    accessError ? "rgba(255,101,119,0.65)" : "rgba(57,255,136,0.28)"
                  }`,
                  background: "rgba(0,0,0,0.55)",
                  color: C.text,
                  fontSize: 15,
                  letterSpacing: 1,
                  outline: "none",
                }}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginTop: 14,
                  color: GOLD_SOFT,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                  style={{ accentColor: "#39ff88", width: 16, height: 16 }}
                />
                {t("rememberMe")}
              </label>

              <div
                id="access-error"
                role="alert"
                aria-live="polite"
                style={{
                  minHeight: 20,
                  marginTop: 10,
                  color: C.red,
                  fontSize: 12,
                  lineHeight: 1.5,
                  overflowWrap: "anywhere",
                }}
              >
                {errorText}
              </div>

              <button
                type="submit"
                className="kl-enter"
                disabled={accessLoading || accessCode.trim() === ""}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(125,255,173,0.7)",
                  background: "linear-gradient(135deg, #7dffad, #39ff88)",
                  color: "#03140a",
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                  cursor: accessLoading ? "wait" : "pointer",
                  opacity: accessLoading || accessCode.trim() === "" ? 0.6 : 1,
                  boxShadow: "0 0 26px rgba(57,255,136,0.35)",
                }}
              >
                {accessLoading ? t("verifying") : t("enter")}
              </button>
            </form>

            <div
              style={{
                marginTop: 22,
                textAlign: "center",
                fontSize: 10,
                letterSpacing: 2,
                color: "#5d6b62",
              }}
            >
              <span style={{ color: GOLD }}>KL</span> · XAU/USD
            </div>
          </section>
        </div>

        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            background: #000;
          }

          button,
          select,
          input {
            font: inherit;
          }

          .kl-glow {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse at 50% 38%, rgba(57, 255, 136, 0.16), transparent 55%),
              radial-gradient(ellipse at 85% 100%, rgba(212, 175, 55, 0.1), transparent 50%);
          }

          .kl-grid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(57, 255, 136, 0.045) 1px, transparent 1px),
              linear-gradient(90deg, rgba(57, 255, 136, 0.045) 1px, transparent 1px);
            background-size: 52px 52px;
          }

          .kl-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.85) 100%);
          }

          .kl-scan {
            position: absolute;
            left: 0;
            right: 0;
            height: 140px;
            background: linear-gradient(180deg, transparent, rgba(57, 255, 136, 0.07), transparent);
            animation: klScan 7s linear infinite;
          }

          .kl-line {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            filter: drop-shadow(0 0 8px rgba(57, 255, 136, 0.9));
            animation: klDraw 4.5s ease-out forwards;
          }

          .kl-card {
            animation: klRise 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }

          .kl-input::placeholder {
            color: #5d6b62;
            letter-spacing: 0;
          }

          .kl-input:focus {
            border-color: rgba(57, 255, 136, 0.85) !important;
            box-shadow: 0 0 0 3px rgba(57, 255, 136, 0.14), 0 0 22px rgba(57, 255, 136, 0.18);
          }

          .kl-enter:not(:disabled):hover {
            filter: brightness(1.08);
            transform: translateY(-1px);
          }

          .kl-enter:disabled {
            cursor: not-allowed !important;
          }

          .kl-enter:focus-visible,
          select:focus-visible {
            outline: 2px solid ${GOLD};
            outline-offset: 3px;
          }

          @keyframes klDraw {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes klScan {
            from {
              transform: translateY(-160px);
            }
            to {
              transform: translateY(110vh);
            }
          }

          @keyframes klRise {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .kl-scan {
              animation: none;
              display: none;
            }

            .kl-line {
              animation: none;
              stroke-dashoffset: 0;
            }

            .kl-card {
              animation: none;
            }
          }
        `}</style>
      </main>
    );
  }

  const rawSignal = String(
    first(signal, "signal", "action", "recommendation", "type") ?? "WAIT"
  ).toUpperCase();

  const isBuy = rawSignal.includes("BUY") || rawSignal.includes("LONG");
  const isSell = rawSignal.includes("SELL") || rawSignal.includes("SHORT");
  const isWait = !isBuy && !isSell;
  const signalColor = isBuy ? C.green : isSell ? C.red : C.gold;
  const signalLabel = isBuy ? t("buy") : isSell ? t("sell") : t("wait");

  const price = first(signal, "price", "close", "currentPrice", "lastPrice");
  const rsi = first(signal, "rsi", "RSI");
  const ema9 = first(signal, "ema9", "EMA9", "ema_9");
  const ema21 = first(signal, "ema21", "EMA21", "ema_21");
  const ema200 = first(signal, "ema200", "EMA200", "ema_200");
  const signalTimestamp = first(signal, "timestamp", "time", "date");

  const pickLevel = (...keys: string[]) =>
    first(signal, ...keys) ??
    first(signal?.levels ?? null, ...keys) ??
    first(signal?.trade ?? null, ...keys);

  const entryPriceValue = pickLevel(
    "entryPrice", "entry_price", "entry", "entryPoint"
  );
  const tp1Value = pickLevel(
    "tp1", "TP1", "takeProfit1", "take_profit_1", "takeProfit_1"
  );
  const tp2Value = pickLevel(
    "tp2", "TP2", "takeProfit2", "take_profit_2", "takeProfit_2"
  );
  const slValue = pickLevel(
    "sl", "SL", "stopLoss", "stop_loss", "stoploss"
  );

  const levelCards = [
    {
      title: t("entryPrice"),
      value: isWait ? "—" : money(entryPriceValue),
      color: C.gold2,
    },
    {
      title: t("takeProfit1"),
      value: isWait ? "—" : money(tp1Value),
      color: C.green,
    },
    {
      title: t("takeProfit2"),
      value: isWait ? "—" : money(tp2Value),
      color: C.green,
    },
    {
      title: t("stopLoss"),
      value: isWait ? "—" : money(slValue),
      color: C.red,
    },
  ];

  const tradeList: Data[] = Array.isArray(backtest?.trades)
    ? [...backtest.trades].reverse().slice(0, 20)
    : Array.isArray(backtest?.results)
      ? [...backtest.results].reverse().slice(0, 20)
      : [];

  const tradeCount =
    numberFrom(
      first(backtest, "totalTrades", "tradesCount", "total_trades"),
      Array.isArray(backtest?.trades) ? backtest.trades.length : null
    ) ?? 0;

  const winRate = numberFrom(
    first(backtest, "winRate", "winRatePct", "win_rate", "win_rate_pct")
  );

  const profitFactor = numberFrom(
    first(backtest, "profitFactor", "profit_factor")
  );

  const netReturn = numberFrom(
    first(backtest, "netProfitPct", "netReturnPct", "totalReturnPct", "net_return_pct")
  );

  const drawdown = numberFrom(
    first(backtest, "maxDrawdownPct", "max_drawdown_pct", "maxDrawdown")
  );

  const startingCapital = numberFrom(
    first(backtest, "startingCapital", "initialCapital", "initial_capital")
  );

  const finalCapital = numberFrom(
    first(backtest, "finalCapital", "final_capital", "endingCapital")
  );

  const currentZone = timeZones.find((z) => z.zone === selectedZone);
  const selectedLanguage = languages.find((x) => x.code === language);

  const stats = [
    { title: t("trades"), value: String(tradeCount), color: C.gold },
    { title: t("winRate"), value: percent(winRate), color: C.green },
    {
      title: t("profitFactor"),
      value: profitFactor === null ? "—" : profitFactor.toFixed(2),
      color: C.gold2,
    },
    {
      title: t("netReturn"),
      value: percent(netReturn),
      color: netReturn !== null && netReturn < 0 ? C.red : C.green,
    },
    { title: t("drawdown"), value: percent(drawdown), color: C.red },
    {
      title: t("finalCapital"),
      value: money(finalCapital),
      color: C.gold2,
    },
  ];

  const tradeValue = (trade: Data, ...keys: string[]) =>
    first(trade, ...keys);

  const tradeSide = (trade: Data) =>
    String(tradeValue(trade, "side", "direction", "type", "signal") ?? "—").toUpperCase();

  const tradeEntry = (trade: Data) =>
    tradeValue(trade, "entry", "entryPrice", "entry_price", "open");

  const tradeExit = (trade: Data) =>
    tradeValue(trade, "exit", "exitPrice", "exit_price", "close");

  const tradeEntryTime = (trade: Data) =>
    tradeValue(trade, "entryTime", "entry_time", "openTime", "open_time");

  const tradeExitTime = (trade: Data) =>
    tradeValue(trade, "exitTime", "exit_time", "closeTime", "close_time");

  const tradeReturn = (trade: Data) =>
    numberFrom(
      tradeValue(trade, "pnlPct", "netPct", "netReturnPct", "returnPct", "return_pct")
    );

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    color: C.muted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 700,
    padding: "13px 12px",
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "14px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.045)",
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const buttonStyle: React.CSSProperties = {
    border: `1px solid ${C.border}`,
    background: "rgba(212,175,55,0.08)",
    color: C.gold2,
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 50% -10%, rgba(212,175,55,0.10), transparent 45%), #08090b",
        color: C.text,
        padding: "20px 16px 28px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        direction: language === "ar" ? "rtl" : "ltr",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <KLLogo size={58} gradientId="kl-neon" />

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: 1.1,
                }}
              >
                Keli<span style={{ color: C.gold }}>Leli</span>bot
              </div>

              <div style={{ ...label, fontSize: 9, marginTop: 3 }}>
                GOLD TRADING SYSTEM
              </div>
            </div>
          </div>

          <button
            aria-label={menuOpen ? t("done") : t("menu")}
            title={t("menu")}
            onClick={() => setMenuOpen((value) => !value)}
            style={{
              width: 38,
              height: 38,
              padding: 0,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: menuOpen ? 0 : 4,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.gold2,
              cursor: "pointer",
              position: "relative",
            }}
          >
            {menuOpen ? (
              <span
                style={{
                  display: "block",
                  width: 17,
                  height: 17,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 7.5,
                    width: 17,
                    height: 1.5,
                    borderRadius: 2,
                    background: C.gold2,
                    transform: "rotate(45deg)",
                    transformOrigin: "center",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 7.5,
                    width: 17,
                    height: 1.5,
                    borderRadius: 2,
                    background: C.gold2,
                    transform: "rotate(-45deg)",
                    transformOrigin: "center",
                  }}
                />
              </span>
            ) : (
              <>
                <span
                  style={{
                    width: 16,
                    height: 1.5,
                    borderRadius: 2,
                    background: C.gold2,
                    display: "block",
                  }}
                />
                <span
                  style={{
                    width: 11,
                    height: 1.5,
                    borderRadius: 2,
                    background: C.gold2,
                    display: "block",
                  }}
                />
                <span
                  style={{
                    width: 16,
                    height: 1.5,
                    borderRadius: 2,
                    background: C.gold2,
                    display: "block",
                  }}
                />
              </>
            )}
          </button>
        </header>

        {menuOpen && (
          <section
            style={{
              ...panel,
              marginBottom: 20,
              padding: 18,
              animation: "fadeIn 160ms ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                gap: 12,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {t("menu")}
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t("done")}
                style={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 0,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: "#191a1d",
                  color: C.gold2,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 21,
                    lineHeight: "20px",
                    height: 20,
                    transform: "translateY(-1px)",
                  }}
                >
                  ×
                </span>
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="language-select"
                  style={{ ...label, display: "block", marginBottom: 9 }}
                >
                  {t("language")}
                </label>

                <select
                  id="language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Lang)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: "#0b0c0e",
                    color: C.text,
                    outline: "none",
                    fontSize: 13,
                  }}
                >
                  {languages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="timezone-select"
                  style={{ ...label, display: "block", marginBottom: 9 }}
                >
                  {t("timezone")}
                </label>

                <select
                  id="timezone-select"
                  value={selectedZone}
                  onChange={(event) => setSelectedZone(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: "#0b0c0e",
                    color: C.text,
                    outline: "none",
                    fontSize: 13,
                  }}
                >
                  {timeZones.map((zone) => (
                    <option key={zone.zone} value={zone.zone}>
                      {zone.flag} {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 17,
                padding: 13,
                borderRadius: 11,
                background: "rgba(57,255,136,0.05)",
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={label}>{t("accessTimeLeft")}</div>

              <div
                style={{
                  marginTop: 7,
                  fontSize: 20,
                  fontWeight: 850,
                  color: C.gold2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {expiresAt ? timeLeft : t("accessUnlimited")}
              </div>
            </div>

            <div
              style={{
                marginTop: 17,
                padding: 13,
                borderRadius: 11,
                background: "rgba(212,175,55,0.055)",
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={label}>{t("activeZone")}</div>

              <div
                style={{
                  marginTop: 7,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {currentZone?.flag} {currentZone?.name ?? selectedZone}
                </span>

                <span style={{ color: C.gold2, fontSize: 13 }}>
                  {new Intl.DateTimeFormat(language, {
                    timeZone: selectedZone,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(now)}
                </span>
              </div>

              <div style={{ fontSize: 11, color: C.muted, marginTop: 7 }}>
                {t("systemTime")}
              </div>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              style={{ ...buttonStyle, width: "100%", marginTop: 15 }}
            >
              {t("done")}
            </button>

            <button
              onClick={handleLogout}
              style={{
                ...buttonStyle,
                width: "100%",
                marginTop: 10,
                color: C.red,
                background: "rgba(255,101,119,0.06)",
                border: "1px solid rgba(255,101,119,0.3)",
              }}
            >
              {t("logout")}
            </button>
          </section>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 22,
            padding: "12px 15px",
            borderRadius: 12,
            background: "rgba(49,214,154,0.045)",
            border: "1px solid rgba(49,214,154,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: C.green,
                boxShadow: `0 0 10px ${C.green}`,
              }}
            />

            <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
              {t("active")}
            </span>
          </div>

          <span style={{ fontSize: 11, color: C.muted }}>
            {t("auto")}
          </span>
        </div>

        <section style={{ ...panel, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={label}>XAU/USD · GOLD</div>

              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 850,
                  margin: "8px 0 5px",
                  letterSpacing: -0.4,
                }}
              >
                {t("currentSignal")}
              </h1>

              <div style={{ color: C.muted, fontSize: 12 }}>
                {t("marketAnalysis")}
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
                minWidth: 100,
                marginInlineStart: "auto",
              }}
            >
              <div style={label}>{t("currentPrice")}</div>

              <div
                style={{
                  color: C.gold2,
                  fontSize: 25,
                  fontWeight: 850,
                  marginTop: 6,
                }}
              >
                {price !== undefined ? money(price) : "—"}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              border: `1px solid ${signalColor}35`,
              background: `${signalColor}0c`,
              borderRadius: 15,
              padding: "21px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ ...label, marginBottom: 8 }}>
                {isBuy
                  ? t("buySignal")
                  : isSell
                    ? t("sellSignal")
                    : t("waiting")}
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                  color: signalColor,
                }}
              >
                {signalLoading ? t("loading") : signalLabel}
              </div>

              {signal?.reason && (
                <div
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 10,
                    maxWidth: 600,
                    lineHeight: 1.6,
                  }}
                >
                  {String(signal.reason)}
                </div>
              )}
            </div>

            <button
              onClick={() => void refreshSignal()}
              disabled={signalLoading}
              style={{
                ...buttonStyle,
                opacity: signalLoading ? 0.6 : 1,
                cursor: signalLoading ? "wait" : "pointer",
              }}
            >
              {signalLoading ? t("loading") : t("refreshSignal")}
            </button>
          </div>

          {signalError && (
            <div
              style={{
                marginTop: 13,
                color: C.red,
                fontSize: 12,
                overflowWrap: "anywhere",
              }}
            >
              {t("errorSignal")}: {signalError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            {levelCards.map((item) => (
              <div
                key={item.title}
                style={{
                  border: "1px solid rgba(255,255,255,0.055)",
                  background: C.panel2,
                  borderRadius: 12,
                  padding: 13,
                  minWidth: 0,
                }}
              >
                <div style={label}>{item.title}</div>

                <div
                  style={{
                    color: item.value === "—" ? C.muted : item.color,
                    fontSize: 17,
                    fontWeight: 800,
                    marginTop: 7,
                    overflowWrap: "anywhere",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
              gap: 10,
              marginTop: 10,
            }}
          >
            {[
              { title: "RSI", value: rsi },
              { title: "EMA 9", value: ema9 },
              { title: "EMA 21", value: ema21 },
              { title: "EMA 200", value: ema200 },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  border: "1px solid rgba(255,255,255,0.055)",
                  background: C.panel2,
                  borderRadius: 12,
                  padding: 13,
                }}
              >
                <div style={label}>{item.title}</div>

                <div
                  style={{
                    color: C.text,
                    fontSize: 17,
                    fontWeight: 800,
                    marginTop: 7,
                  }}
                >
                  {metricNumber(item.value)}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 16,
              color: C.muted,
              fontSize: 10,
            }}
          >
            <span>
              {t("signalTime")}: {dateInZone(signalTimestamp, selectedZone)}
            </span>

            <span>
              {t("updated")}: {dateInZone(lastUpdate, selectedZone)}
            </span>
          </div>
        </section>

        <section style={{ ...panel, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={label}>{t("performance")}</div>

              <h2
                style={{
                  margin: "7px 0 0",
                  fontSize: 20,
                  fontWeight: 850,
                }}
              >
                {t("strategyStats")}
              </h2>
            </div>

            <button
              onClick={() => void refreshBacktest()}
              disabled={backtestLoading}
              style={{
                ...buttonStyle,
                opacity: backtestLoading ? 0.6 : 1,
              }}
            >
              {backtestLoading ? t("loadingStats") : t("recalculate")}
            </button>
          </div>

          {backtestError && (
            <div
              style={{
                color: C.red,
                fontSize: 12,
                marginBottom: 15,
                overflowWrap: "anywhere",
              }}
            >
              {t("errorBacktest")}: {backtestError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              gap: 11,
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.title}
                style={{
                  background: C.panel2,
                  border: "1px solid rgba(255,255,255,0.055)",
                  borderRadius: 13,
                  padding: 15,
                  minWidth: 0,
                }}
              >
                <div style={label}>{stat.title}</div>

                <div
                  style={{
                    marginTop: 11,
                    fontSize: 22,
                    fontWeight: 850,
                    color: stat.color,
                    overflowWrap: "anywhere",
                  }}
                >
                  {backtestLoading ? "—" : stat.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 11,
              marginTop: 12,
            }}
          >
            <div
              style={{
                background: "rgba(212,175,55,0.045)",
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={label}>{t("startingCapital")}</div>

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  marginTop: 8,
                  color: C.gold2,
                }}
              >
                {money(startingCapital)}
              </div>
            </div>

            <div
              style={{
                background: "rgba(212,175,55,0.045)",
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={label}>{t("lastBacktest")}</div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 9,
                  lineHeight: 1.5,
                }}
              >
                {dateInZone(
                  first(backtest, "timestamp", "updatedAt", "lastRun", "date"),
                  selectedZone
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={panel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 17,
            }}
          >
            <div>
              <div style={label}>{t("history")}</div>

              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 850,
                  margin: "7px 0 0",
                }}
              >
                {t("recentTrades")}
              </h2>
            </div>

            <span
              style={{
                color: C.gold2,
                fontSize: 11,
                background: "rgba(212,175,55,0.08)",
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "7px 10px",
              }}
            >
              {tradeList.length} {t("trades").toLowerCase()}
            </span>
          </div>

          <div
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 660,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>{t("direction")}</th>
                  <th style={thStyle}>{t("entry")}</th>
                  <th style={thStyle}>{t("entryTime")}</th>
                  <th style={thStyle}>{t("exit")}</th>
                  <th style={thStyle}>{t("exitTime")}</th>
                  <th style={thStyle}>{t("return")}</th>
                </tr>
              </thead>

              <tbody>
                {tradeList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        padding: "32px 12px",
                        color: C.muted,
                      }}
                    >
                      {backtestLoading ? t("loading") : t("noTrades")}
                    </td>
                  </tr>
                ) : (
                  tradeList.map((trade, index) => {
                    const side = tradeSide(trade);
                    const isLong =
                      side.includes("BUY") || side.includes("LONG");
                    const isShort =
                      side.includes("SELL") || side.includes("SHORT");
                    const ret = tradeReturn(trade);

                    return (
                      <tr
                        key={`${String(tradeEntryTime(trade) ?? index)}-${index}`}
                      >
                        <td style={tdStyle}>
                          <span
                            style={{
                              color: isLong
                                ? C.green
                                : isShort
                                  ? C.red
                                  : C.gold2,
                              fontWeight: 800,
                            }}
                          >
                            {isLong
                              ? t("buy")
                              : isShort
                                ? t("sell")
                                : side}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {money(tradeEntry(trade))}
                        </td>

                        <td style={{ ...tdStyle, color: C.muted }}>
                          {dateInZone(tradeEntryTime(trade), selectedZone)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {money(tradeExit(trade))}
                        </td>

                        <td style={{ ...tdStyle, color: C.muted }}>
                          {dateInZone(tradeExitTime(trade), selectedZone)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            color: ret !== null && ret < 0 ? C.red : C.green,
                            fontWeight: 800,
                          }}
                        >
                          {percent(ret)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 15,
              color: C.muted,
              fontSize: 10,
              lineHeight: 1.6,
            }}
          >
            {t("activeZone")}: {currentZone?.flag}{" "}
            {currentZone?.name ?? selectedZone}
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            marginTop: 28,
            padding: "18px 0 4px",
            color: "#66676d",
            fontSize: 10,
            letterSpacing: 2,
          }}
        >
          <span style={{ color: C.gold }}>KL</span> KELILELIBOT · GOLD TRADING
          SYSTEM

          <div style={{ marginTop: 7, letterSpacing: 0.2 }}>
            {selectedLanguage?.flag} {selectedLanguage?.name}
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          background: ${C.bg};
        }

        body {
          margin: 0;
          background: ${C.bg};
        }

        button,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        button:focus-visible,
        select:focus-visible {
          outline: 2px solid ${C.gold};
          outline-offset: 3px;
        }

        button:disabled {
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        ::selection {
          background: rgba(212, 175, 55, 0.28);
          color: #fff;
        }
      `}</style>
    </main>
  );
}

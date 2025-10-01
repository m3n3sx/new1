# Live Admin Styler v1.2.0

Kompleksowa wtyczka WordPress do dostosowywania wyglądu panelu administratora z zaawansowanymi funkcjami i nowoczesnym interfejsem użytkownika.

## 🚀 Nowe funkcje w wersji 1.2.0

### ✨ Ulepszona nawigacja
- **Inteligentne submenu**: Poprawiona widoczność i responsywność submenu w menu bocznym
- **Płynne animacje**: Nowoczesne przejścia i efekty hover
- **Backdrop blur**: Zaawansowane efekty wizualne dla submenu

### 💾 Zarządzanie stanem
- **Trwałość zakładek**: System automatycznie zapamiętuje ostatnio aktywną zakładkę
- **Synchronizacja sesji**: Preferencje użytkownika synchronizowane między sesjami
- **localStorage**: Integracja z przeglądarką dla lepszej wydajności

### ⚡ Podgląd na żywo
- **Debounced updates**: Zoptymalizowane aktualizacje w czasie rzeczywistym
- **Obsługa błędów**: Zaawansowany system raportowania błędów
- **Tymczasowe style**: Natychmiastowa aplikacja zmian bez zapisywania

### 🎨 Nowoczesny interfejs
- **WordPress Design System**: Zgodność z najnowszymi standardami WordPress
- **Responsywne komponenty**: Optymalizacja dla wszystkich rozmiarów ekranów
- **Ulepszone kontrolki**: Nowoczesne suwaki, pola tekstowe i przyciski

### 🔔 System powiadomień
- **Inteligentne notyfikacje**: Automatyczne powiadomienia o statusie operacji
- **Auto-dismiss**: Automatyczne ukrywanie powiadomień po określonym czasie
- **Centralizowana obsługa błędów**: Jednolity system raportowania

### 🧹 Automatyczne czyszczenie
- **Inteligentne czyszczenie**: Automatyczne usuwanie niepotrzebnych plików
- **Bezpieczne operacje**: Walidacja i zabezpieczenia przed przypadkowym usunięciem
- **Podgląd operacji**: Możliwość podglądu plików przed usunięciem

### 🔍 Organizacja ustawień
- **Logiczne grupowanie**: Intuicyjne grupowanie opcji według funkcjonalności
- **System wyszukiwania**: Szybkie znajdowanie konkretnych ustawień
- **Ikony i wskazówki**: Wizualne wskazówki dla lepszej orientacji

## 📋 Wymagania

- WordPress 5.0 lub nowszy
- PHP 7.4 lub nowszy
- Uprawnienia administratora

## 🛠️ Instalacja

1. Pobierz wtyczkę z repozytorium
2. Wgraj do katalogu `/wp-content/plugins/`
3. Aktywuj wtyczkę w panelu administratora WordPress
4. Przejdź do **Ustawienia > Live Admin Styler**

## 🎯 Główne funkcje

### Dostosowywanie menu bocznego
- Kolory tła (jednolite i gradienty)
- Czcionki i rozmiary tekstu
- Marginesy i odstępy
- Cienie i efekty wizualne
- Logo i branding

### Stylowanie paska administratora
- Pełna kontrola nad wyglądem
- Responsywne ustawienia szerokości
- Zaawansowane opcje pozycjonowania
- Niestandardowe kolory i czcionki

### Personalizacja treści
- Kolory tła strony
- Czcionki systemowe
- Niestandardowy CSS
- Tekst stopki

### Zaawansowane opcje
- Automatyczne czyszczenie plików
- Zarządzanie stanem użytkownika
- Eksport/import ustawień
- System kopii zapasowych

## 🧪 Testowanie

Wtyczka zawiera kompleksowy zestaw testów:

### Testy PHP
```bash
# Uruchom testy PHP
./vendor/bin/phpunit

# Lub użyj skryptu testowego
cd tests && ./run-tests.sh
```

### Testy JavaScript
```bash
# Zainstaluj zależności
npm install

# Uruchom testy
npm test
```

### Walidacja testów
```bash
# Sprawdź strukturę testów
php tests/validate-tests.php
```

## 🔧 Rozwój

### Struktura plików
```
live-admin-styler/
├── live-admin-styler.php      # Główny plik wtyczki
├── includes/                  # Pliki PHP
│   ├── admin-settings-page.php
│   ├── ajax-handlers.php
│   ├── output-css.php
│   └── templates.php
├── js/                       # JavaScript
│   └── admin-settings.js
├── assets/                   # Zasoby
│   ├── css/admin-style.css
│   └── js/live-preview.js
├── tests/                    # Testy
│   ├── php/
│   ├── js/
│   └── run-tests.sh
└── .kiro/                    # Specyfikacje
    └── specs/
```

### Klasy główne

#### LAS_User_State
Zarządzanie stanem użytkownika i preferencjami:
- Trwałość zakładek
- Preferencje UI
- Synchronizacja sesji
- Walidacja danych

#### LAS_File_Manager
Automatyczne zarządzanie plikami:
- Bezpieczne usuwanie
- Walidacja ścieżek
- Podgląd operacji
- Logowanie działań

## 🔒 Bezpieczeństwo

- **Walidacja danych**: Wszystkie dane wejściowe są walidowane i sanityzowane
- **Nonce protection**: Ochrona CSRF dla wszystkich operacji AJAX
- **Uprawnienia**: Sprawdzanie uprawnień użytkownika
- **Bezpieczne pliki**: Walidacja ścieżek i operacji na plikach

## 🌐 Lokalizacja

Wtyczka jest w pełni przygotowana do tłumaczeń:
- Domyślny język: Polski
- Text domain: `live-admin-styler`
- Katalog tłumaczeń: `/languages/`

## 📝 Changelog

### v1.2.0 (2024-12-29)
- ✨ Dodano system zarządzania stanem użytkownika
- ✨ Implementowano automatyczne czyszczenie plików
- ✨ Ulepszona nawigacja i widoczność submenu
- ✨ Nowoczesny system powiadomień
- ✨ Zaawansowany podgląd na żywo
- ✨ Responsywny interfejs użytkownika
- 🔧 Kompleksowy zestaw testów
- 🔒 Wzmocnione zabezpieczenia
- 📚 Pełna dokumentacja

### v1.1.0
- Podstawowe funkcje stylowania
- System podglądu na żywo
- Interfejs administracyjny

## 🤝 Wsparcie

Jeśli napotkasz problemy lub masz sugestie:
1. Sprawdź dokumentację
2. Uruchom testy diagnostyczne
3. Sprawdź logi błędów WordPress
4. Skontaktuj się z zespołem wsparcia

## 📄 Licencja

Ta wtyczka jest licencjonowana na warunkach GPL v2 lub nowszej.

---

**Live Admin Styler v1.2.0** - Profesjonalne narzędzie do personalizacji panelu administratora WordPress.# jajebie

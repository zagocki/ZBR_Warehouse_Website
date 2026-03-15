Tytuł pracy: System komputerowy do zarządzania magazynem
Autor: Paweł Zagocki, Mateusz Rachwał, Kamil Brzęk
Kierunek: Informatyka
Specjalizacja: Administracja baz danych

Opis:
Celem niniejszej pracy jest opracowanie i wdrożenie nowoczesnego systemu informatycznego, wspierającego kompleksowe zarządzanie magazynem. System został zaprojektowany jako aplikacja webowa typu Single Page Application (SPA), z wykorzystaniem relacyjnej bazy danych SQL, procedur składowanych, triggerów oraz mechanizmów kontroli dostępu, które gwarantują bezpieczeństwo danych poprzez precyzyjne definiowanie uprawnień dla poszczególnych grup użytkowników. Dzięki temu możliwe jest automatyczne synchronizowanie stanów magazynowych, sprawna obsługa procesów przyjęć i wydań oraz generowanie raportów w czasie rzeczywistym.

Wymagania:
- Vanilla JavaScript
- Relacyjna baza danych Azure SQL

Instrukcja uruchomienia aplikacji w środowisku Microsoft Azure

Krok 1. Logowanie do platformy Microsoft Azure
W celu uruchomienia aplikacji należy zalogować się do platformy Microsoft Azure Portal, dostępnej pod adresem:
https://portal.azure.com
Logowanie odbywa się przy użyciu konta Microsoft przypisanego do subskrypcji Azure, w ramach której wdrożona została aplikacja.

Krok 2. Przejście do zasobu aplikacji
Po zalogowaniu się do portalu Azure należy przejść do listy dostępnych zasobów (zakładka „Zasoby” lub „Resource groups”), a następnie wybrać zasób o nazwie: warehouse-app-inzynierka
Zasób ten został utworzony jako App Service i odpowiada za uruchamianie aplikacji serwerowej.

Krok 3. Uruchomienie aplikacji serwerowej
Po wejściu w szczegóły zasobu warehouse-app-inzynierka należy:
1. Przejść do głównego widoku zasobu (Overview),
2. Z menu górnego wybrać opcję „Start” (jeśli aplikacja jest zatrzymana),
3. Poczekać na zmianę statusu aplikacji na Running.
Proces uruchamiania serwera trwa zazwyczaj od kilku do kilkunastu sekund.

Krok 4. Przejście do aplikacji poprzez przeglądarkę internetową
Po pomyślnym uruchomieniu usługi aplikacja jest dostępna publicznie pod przypisaną domeną.
Aby otworzyć aplikację, należy:
skopiować adres URL widoczny w sekcji Overview zasobu App Service
lub
wpisać w przeglądarce internetowej adres domeny: 
warehouse-app-inzynierka-hyg9cgdffhfpgaf5.polandcentral-01.azurewebsites.net

Po przejściu pod wskazany adres aplikacja zostaje załadowana i jest gotowa do użycia.

Uwagi:
Kod przeznaczony wyłącznie do celów edukacyjnych.

# HOCKEY LIVE 4.0 — выход в TestFlight и App Store

## Выполнено в репозитории
- [x] Код React Native + Expo Router в `mobile/`
- [x] Основная веб-версия остаётся в ветке `main`
- [x] Типизация + экспорт JavaScript проверяются в GitHub Actions
- [x] CI проверяет создание Xcode-проекта через `expo prebuild`
- [x] Иконка/splash автоматически готовятся к размеру 1024 × 1024
- [x] Идентификатор iOS указан предварительно: `kz.snitko.hockeylive`

## Для первого TestFlight
- [ ] Владелец входит в Expo под своим аккаунтом: `cd mobile && npx eas-cli@latest login`
- [ ] Подключить EAS проект: `npx eas-cli@latest init`
- [ ] Убедиться, что Apple Developer Program активна, а bundle ID свободен
- [ ] Настроить iOS сертификаты/профили в EAS без размещения секретов в Git
- [ ] Запустить `npx eas-cli@latest build --platform ios --profile production`
- [ ] Загрузить сборку в App Store Connect через `npx eas-cli@latest submit --platform ios --profile production`
- [ ] Установить результат через TestFlight и проверить на реальном iPhone

## До публичного App Store
- [ ] Проверить стабильность календаря, данные клубов, все экраны на iPhone, VoiceOver, iOS dark-mode
- [ ] Проверить оригинальность фирменной символики, лицензии на командные логотипы и ссылки на вещателей
- [ ] Разместить публичную веб-страницу политики конфиденциальности и указать URL в App Store Connect
- [ ] Заполнить App Privacy, возрастную категорию, категорию Sports, описание, скриншоты и контакт поддержки
- [ ] Исправить возможные замечания App Review, проверить работу без сети и разрешения пользователя

**Важно:** `expo prebuild` только генерирует исходный нативный iOS-проект. Это не подтверждение успешной компиляции Xcode, наличие IPA или готовность к App Review.

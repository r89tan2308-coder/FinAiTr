# AI Personal Finance Tracker — подробный фазовый план для Codex

## Главная идея продукта

Мобильное PWA-приложение для личного финансового контроля, где пользователь может:

- добавлять расходы вручную;
- загружать чеки или вставлять OCR-текст чека;
- получать разбор чека по позициям: товар, количество, цена, категория, теги;
- видеть аналитику по категориям, товарам, магазинам, подпискам и месяцам;
- позже подключить импорт CSV, Google Drive, банковские источники, крипту, акции и net worth.

Ключевая ценность MVP: не просто “магазин — сумма”, а item-level analytics: “творог”, “алкоголь”, “лекарства”, “игры”, “ПО”, “зал”, “подписки”.

---

## Важное правило

Не запускать один огромный `/goal` на всё приложение сразу.

Работать фазами:

1. Каждая фаза должна заканчиваться рабочим билдом.
2. Каждая фаза должна иметь acceptance criteria.
3. После каждой фазы Codex должен обновлять `PROGRESS.md`.
4. Если lint/typecheck/build/tests падают, Codex обязан исправить это до перехода дальше.
5. Реальные банки, брокеры, криптобиржи и платежи не делать в MVP.
6. Все внешние интеграции сначала делать через mock provider interfaces.

---

## Рекомендуемый стек

Если проект с нуля:

- Frontend: React + TypeScript + Vite
- Mobile-first PWA
- Styling: CSS modules / Tailwind / styled-components — выбрать один подход
- Charts: Recharts или другой простой chart library
- Database: SQLite + Prisma для desktop/local/server варианта, либо IndexedDB/local-first для полностью клиентского прототипа
- Backend later: Node + Express/Fastify
- Auth: не делать в первой фазе
- OCR/AI: сначала mock parser, потом provider interface
- Tests: Vitest + Testing Library для фронта, unit tests для parser/category logic

Если цель — быстрее получить личный инструмент, лучше начать как PWA + local storage/IndexedDB, а сервер и Google Drive добавить позже.

---

## Документы, которые Codex должен создать в репозитории

### `PRODUCT_SPEC.md`

Описывает продукт, пользователей, задачи, не-цели MVP, сценарии использования.

### `ARCHITECTURE.md`

Описывает архитектуру, data model, modules, source adapters, parser pipeline.

### `PLAN.md`

Фазовый план с milestone, acceptance criteria, validation commands.

### `IMPLEMENT.md`

Runbook для Codex: как работать, что проверять, когда останавливаться.

### `PROGRESS.md`

Живой журнал: что сделано, какие команды запускались, какие проблемы найдены, что дальше.

### `DECISIONS.md`

Decision log: почему выбран local-first, почему банки не в MVP, почему parser сначала mock и т.д.

---

# Phase 0 — Product + Architecture Setup

## Цель

Подготовить репозиторий и документацию так, чтобы Codex не импровизировал хаотично.

## Scope

- Создать или обновить `PRODUCT_SPEC.md`.
- Создать `ARCHITECTURE.md`.
- Создать `PLAN.md`.
- Создать `IMPLEMENT.md`.
- Создать `PROGRESS.md`.
- Создать `DECISIONS.md`.
- Не писать production code, кроме минимального scaffolding при необходимости.

## Acceptance Criteria

- В репозитории есть все документы.
- В `PLAN.md` есть фазы 1–8.
- В `IMPLEMENT.md` есть правила валидации.
- В `DECISIONS.md` зафиксировано: no real bank integration in MVP.
- Codex описал recommended stack и варианты, если repo уже существует.

## Codex /goal

```text
/goal Create the project planning and execution documents for an AI personal finance tracker MVP. Add PRODUCT_SPEC.md, ARCHITECTURE.md, PLAN.md, IMPLEMENT.md, PROGRESS.md, and DECISIONS.md. Do not implement product code yet unless the repository has no basic README and a minimal README is needed. The documents must define a mobile-first PWA focused on item-level receipt analysis, manual expenses, recurring expenses, and dashboard analytics. Real bank, broker, crypto exchange, and payment integrations are explicitly out of scope for MVP. Verify by listing the created/updated files and summarizing the next implementation phase in PROGRESS.md.
```

---

# Phase 1 — App Skeleton / Mobile-first PWA

## Цель

Получить запускаемое приложение с базовой структурой экранов.

## Scope

- Создать React + TypeScript + Vite app, если проекта ещё нет.
- Сделать mobile-first layout.
- Добавить базовую навигацию:
  - Dashboard
  - Transactions
  - Receipts
  - Recurring
  - Categories
  - Settings
- Добавить mock data.
- Добавить build scripts.
- Настроить lint/typecheck/build.

## Screens

### Dashboard

Пока показывает mock-метрики:

- Spending this month
- Top categories
- Top products
- Recurring total
- Recent transactions

### Transactions

Пока список mock-транзакций.

### Receipts

Пока список mock-чеков и кнопка Add Receipt.

### Recurring

Пока mock-подписки.

### Categories

Пока список категорий.

### Settings

Пока placeholder.

## Acceptance Criteria

- `npm install` работает.
- `npm run dev` запускает приложение.
- `npm run build` проходит.
- Приложение удобно открывается в мобильной ширине.
- Навигация между экранами работает.
- Нет реальных интеграций.
- `PROGRESS.md` обновлён.

## Codex /goal

```text
/goal Implement Phase 1 from PLAN.md: create a working mobile-first PWA skeleton for the personal finance tracker. Build the main app shell, responsive navigation, and placeholder screens for Dashboard, Transactions, Receipts, Recurring, Categories, and Settings using mock data only. Verify with npm install if needed, npm run typecheck if available, and npm run build. Keep scope limited to Phase 1 and update PROGRESS.md with completed work, validation commands, and next steps.
```

---

# Phase 2 — Core Data Model + Local Persistence

## Цель

Создать основу данных: счета, транзакции, чеки, позиции чека, категории, подписки.

## Data entities

### Account

- id
- name
- type: cash / debit_card / credit_card / bank / investment / crypto / other
- currency
- opening_balance
- current_balance optional
- is_archived

### Transaction

- id
- date
- amount
- currency
- merchant
- account_id
- category_id optional
- description optional
- source: manual / receipt / csv / bank_mock / adjustment
- receipt_id optional
- tags[]
- created_at
- updated_at

### Receipt

- id
- date
- merchant
- total
- currency
- raw_text
- image_url optional
- status: draft / needs_review / confirmed / rejected
- source: manual_upload / pasted_text / drive_mock
- confidence optional
- created_at
- updated_at

### ReceiptItem

- id
- receipt_id
- raw_name
- normalized_name
- quantity optional
- unit_price optional
- total_price
- category_id optional
- tags[]
- confidence optional

### Category

- id
- name
- parent_id optional
- type: expense / income / transfer / asset
- color optional
- icon optional

### RecurringExpense

- id
- name
- merchant optional
- amount
- currency
- frequency: weekly / monthly / yearly / custom
- next_due_date
- category_id optional
- account_id optional
- status: active / paused / cancelled

## Persistence options

Codex should choose one clear local persistence layer:

- Option A: IndexedDB/local-first for PWA MVP.
- Option B: SQLite + Prisma if a backend already exists.

For fastest MVP, prefer local-first unless the repo already has backend infrastructure.

## Acceptance Criteria

- Data types/interfaces exist.
- Mock repository/service layer exists.
- App reads data through services, not hardcoded arrays in components.
- Manual seed data is loaded.
- Dashboard still works from repository data.
- Build/typecheck passes.
- `ARCHITECTURE.md` and `PROGRESS.md` updated.

## Codex /goal

```text
/goal Implement Phase 2 from PLAN.md: add the core data model and local persistence/service layer for accounts, transactions, receipts, receipt items, categories, and recurring expenses. Keep it local-first and do not add real external integrations. Refactor screens to read from the service/repository layer rather than hardcoded component arrays. Verify with typecheck/build and add lightweight unit tests for data helpers if the repo test setup exists. Update ARCHITECTURE.md and PROGRESS.md.
```

---

# Phase 3 — Manual Transactions

## Цель

Сделать приложение полезным даже без чеков и банков: ручной ввод расходов.

## Scope

- Add transaction form.
- Fields:
  - date
  - amount
  - currency
  - merchant
  - account
  - category
  - tags
  - note
- Transaction list.
- Search/filter:
  - by date
  - by category
  - by merchant
  - by text
- Edit/delete transaction.
- Basic validation.

## Acceptance Criteria

- User can create a manual transaction.
- User can edit it.
- User can delete it.
- Dashboard updates after adding transaction.
- Filters work.
- Empty states exist.
- Mobile form is usable.
- Build/typecheck passes.

## Codex /goal

```text
/goal Implement Phase 3 from PLAN.md: add manual transaction creation, editing, deletion, filtering, and dashboard updates. The transaction form must support date, amount, currency, merchant, account, category, tags, and note. Keep data local-first and do not add bank integrations. Verify with typecheck/build and add tests for transaction creation/filter helpers where practical. Update PROGRESS.md.
```

---

# Phase 4 — Receipt Text Parser MVP

## Цель

Сделать первый главный “AI-like” функционал: вставил текст чека → получил позиции товаров.

## Important

На этом этапе не нужен реальный OCR. Пользователь может вставить текст, будто он уже получен из OCR.

## Pipeline

```text
raw receipt text
→ normalize lines
→ detect merchant/date/total if possible
→ detect item-like lines
→ extract item name and price
→ guess category/tags
→ produce draft receipt
→ send to review screen
```

## Parser requirements

Parser should handle messy text:

- extra spaces
- currency symbols
- decimal comma and decimal dot
- total lines
- discount lines
- quantity lines if possible
- unknown lines ignored or stored as warnings

## Category guessing examples

- творог / cottage cheese / yogurt / milk → groceries, dairy
- beer / wine / vodka / alcohol → alcohol
- aspirin / ibuprofen / pharmacy / medicine → medicine / health
- steam / playstation / xbox / game → games
- adobe / openai / elevenlabs / suno / software → software/subscription
- gym / fitness / club → gym/health

## Acceptance Criteria

- User can paste receipt text.
- App creates a draft receipt.
- Draft has merchant/date/total when detectable.
- Draft has line items.
- Items have guessed categories/tags.
- Parser confidence/warnings are shown.
- Parser logic is unit-tested with at least 3 sample receipts.
- Build/typecheck/tests pass.

## Codex /goal

```text
/goal Implement Phase 4 from PLAN.md: build a receipt text parser MVP that converts pasted OCR-like receipt text into a draft receipt with merchant/date/total when detectable and item-level lines with guessed categories/tags. Do not add real OCR or LLM calls yet. Add sample receipt fixtures and unit tests covering at least three messy receipt formats. Add a paste-text receipt intake UI that sends parsed results to a review screen. Verify with tests/typecheck/build and update PROGRESS.md.
```

---

# Phase 5 — Receipt Review + Confirm Flow

## Цель

Сделать human-in-the-loop: AI предлагает, пользователь подтверждает/исправляет.

## Scope

- Receipt Review screen.
- Editable fields:
  - merchant
  - date
  - total
  - currency
  - each item name
  - item category
  - item tags
  - item price
- Add/remove item line.
- Confirm receipt.
- On confirmation:
  - receipt status becomes confirmed
  - transaction is created or linked
  - item data becomes visible in analytics
- Show mismatch warning:
  - sum of items != receipt total

## Acceptance Criteria

- Draft receipt can be edited.
- User can confirm receipt.
- Confirmed receipt creates/links a transaction.
- Dashboard includes receipt item data.
- Mismatch warning works.
- Build/typecheck passes.

## Codex /goal

```text
/goal Implement Phase 5 from PLAN.md: add the receipt review and confirmation flow. Users must be able to edit merchant/date/total/currency and each receipt item’s name, category, tags, and price; add or remove item lines; see a mismatch warning when item totals differ from receipt total; and confirm the receipt. Confirming a receipt must persist it, mark it confirmed, and create or link a transaction so dashboard analytics include item-level data. Verify with typecheck/build and relevant tests, then update PROGRESS.md.
```

---

# Phase 6 — Analytics Dashboard MVP

## Цель

Сделать главный payoff: понятная статистика.

## Dashboard widgets

- Total spend this month.
- Spend by category.
- Spend by merchant.
- Top products/items.
- Product search analytics:
  - “творог”
  - “алкоголь”
  - “лекарства”
  - “games”
  - “software”
- Monthly trend.
- Recurring expenses total.
- Recent confirmed receipts.

## Important distinction

Analytics should be able to show:

- transaction-level spend
- receipt item-level spend
- combined spend without double-counting

## Acceptance Criteria

- Dashboard uses real local data.
- Charts/tables update after manual transactions and confirmed receipts.
- User can search product/item names.
- Item-level category totals work.
- Double-counting is avoided when receipt is linked to transaction.
- Build/typecheck passes.

## Codex /goal

```text
/goal Implement Phase 6 from PLAN.md: build the MVP analytics dashboard using local transactions, confirmed receipts, and receipt items. Add widgets for total monthly spend, spend by category, spend by merchant, top products/items, monthly trend, recurring total, and recent receipts. Include item/product search analytics so queries like cottage cheese, alcohol, medicine, games, and software return item-level totals. Avoid double-counting when receipts are linked to transactions. Verify with typecheck/build and analytics helper tests, then update PROGRESS.md.
```

---

# Phase 7 — Recurring Expenses / Subscriptions

## Цель

Покрыть подписки, абонементы, игры, ПО, клубы.

## Scope

- Recurring expense list.
- Add/edit/pause/cancel recurring expense.
- Frequency:
  - weekly
  - monthly
  - yearly
  - custom optional later
- Next due date calculation.
- Monthly recurring total.
- Upcoming charges.
- Optional: mark as paid → creates transaction.

## Acceptance Criteria

- User can add subscription/recurring expense.
- User can pause/cancel it.
- Next payment date is calculated.
- Dashboard shows monthly recurring total.
- Upcoming charges list works.
- Build/typecheck/tests pass.

## Codex /goal

```text
/goal Implement Phase 7 from PLAN.md: add recurring expenses/subscriptions management. Users must be able to create, edit, pause, and cancel recurring expenses with weekly/monthly/yearly frequency, category, account, amount, and next due date. Dashboard must show monthly recurring total and upcoming charges. Add helper tests for next due date calculations. Verify with tests/typecheck/build and update PROGRESS.md.
```

---

# Phase 8 — CSV Import / Export

## Цель

Добавить простой мост к реальным данным без банковских API.

## Scope

- CSV import screen.
- Import format mapping:
  - date
  - amount
  - currency
  - merchant/description
  - account optional
  - category optional
- Preview before import.
- Duplicate detection:
  - date + amount + merchant similarity
- CSV export for transactions and receipt items.

## Acceptance Criteria

- User can import sample CSV.
- User sees preview before saving.
- Duplicates are warned/skipped.
- Imported transactions appear in dashboard.
- User can export data.
- Build/typecheck/tests pass.

## Codex /goal

```text
/goal Implement Phase 8 from PLAN.md: add CSV import/export for transactions and receipt item analytics. The import flow must include column mapping, preview before save, duplicate detection using date/amount/merchant similarity, and safe import into local storage. Export must support transactions and receipt items. Do not add real bank APIs. Verify with sample CSV fixtures, tests/typecheck/build, and update PROGRESS.md.
```

---

# Phase 9 — Google Drive Inbox Mock, then Real Adapter Later

## Цель

Подготовить будущий сценарий: пользователь кидает чеки в папку, приложение обрабатывает новые файлы.

## MVP Scope

Сначала только mock:

- Source adapter interface.
- `DriveReceiptSourceMock`.
- “Check for new receipts” button.
- Import mocked file entries into receipt drafts.

## Later Scope

Только после стабильного MVP:

- Google OAuth.
- Google Drive folder picker.
- Polling or webhook backend.
- File download.
- OCR processing.

## Acceptance Criteria

- There is a clean source adapter interface.
- Mock Drive source can produce receipt drafts.
- No real Google credentials required.
- UI explains this is a mock/source simulation.
- Build/typecheck passes.

## Codex /goal

```text
/goal Implement Phase 9 from PLAN.md: add a source adapter interface for future receipt sources and a mock Google Drive receipt inbox. The mock source should simulate new receipt files and convert them into draft receipts using existing parser logic. Do not add real Google OAuth, Drive API calls, webhooks, or credentials yet. Verify with typecheck/build and update ARCHITECTURE.md and PROGRESS.md.
```

---

# Phase 10 — OCR/LLM Provider Interfaces

## Цель

Подготовить настоящую AI-обработку без жёсткой привязки к одному сервису.

## Scope

- `OcrProvider` interface.
- `ReceiptExtractionProvider` interface.
- `CategoryClassifier` interface.
- Mock implementations.
- Clear boundary:
  - OCR extracts text.
  - Extractor creates structured receipt.
  - Classifier assigns categories/tags.
- No direct provider code in UI components.

## Acceptance Criteria

- Providers are replaceable.
- Mock providers work.
- Existing parser flow uses provider interfaces.
- No API keys committed.
- `.env.example` added if needed.
- Build/typecheck/tests pass.

## Codex /goal

```text
/goal Implement Phase 10 from PLAN.md: introduce provider interfaces for OCR, structured receipt extraction, and category classification while keeping mock implementations as the default. Refactor the receipt parser flow to use these interfaces without adding real provider API calls or committing API keys. Add .env.example if needed. Verify with tests/typecheck/build and update ARCHITECTURE.md and PROGRESS.md.
```

---

# Phase 11 — Mobile UX Polish / PWA Installability

## Цель

Сделать приложение реально удобным на смартфоне.

## Scope

- Mobile navigation polish.
- Large tap targets.
- PWA manifest.
- App icon placeholders.
- Offline/local-first behavior messaging.
- Empty states.
- Loading states.
- Error states.
- Better receipt review UX.
- Quick add button.

## Acceptance Criteria

- App works well at 360–430 px width.
- PWA manifest exists.
- Important forms are mobile-friendly.
- No broken overflow.
- Build passes.

## Codex /goal

```text
/goal Implement Phase 11 from PLAN.md: polish the mobile-first UX and PWA installability. Improve navigation, tap targets, empty/loading/error states, receipt review usability, and quick-add access. Add or fix PWA manifest and icon placeholders. Verify responsive behavior at common mobile widths where possible, run typecheck/build, and update PROGRESS.md.
```

---

# Phase 12 — Security, Backup, Data Ownership

## Цель

Минимальная безопасность и контроль данных перед реальными интеграциями.

## Scope

- Data export JSON.
- Data import JSON.
- Clear all data option with confirmation.
- Local backup file.
- Sensitive config handling.
- No secrets in repo.
- Security notes in docs.

## Acceptance Criteria

- User can export all app data.
- User can import backup.
- User can delete local data with confirmation.
- No secrets committed.
- Docs explain data storage.
- Build/typecheck passes.

## Codex /goal

```text
/goal Implement Phase 12 from PLAN.md: add data ownership and safety features before any real external integrations. Users must be able to export all local app data to JSON, import a backup JSON, and clear local data with strong confirmation. Ensure no secrets are committed and document data storage/security boundaries. Verify with tests/typecheck/build and update PROGRESS.md.
```

---

# Phase 13 — Post-MVP: Real Integrations Planning Only

## Цель

Не писать сразу банковские интеграции. Сначала подготовить дизайн и риски.

## Possible modules

- Real OCR provider.
- Google Drive adapter.
- Bank transaction aggregator.
- Crypto price/holding tracker.
- Investment holdings tracker.
- Net worth dashboard.
- Multi-currency conversion.

## Required design docs before coding

- `INTEGRATIONS_PLAN.md`
- `SECURITY_REVIEW.md`
- `DATA_PRIVACY.md`
- `RECONCILIATION_STRATEGY.md`

## Acceptance Criteria

- No real credentials or provider-specific code yet.
- Clear plan for each integration.
- Risks documented.
- Data model changes proposed.

## Codex /goal

```text
/goal Create the post-MVP integrations planning docs without implementing real integrations. Add INTEGRATIONS_PLAN.md, SECURITY_REVIEW.md, DATA_PRIVACY.md, and RECONCILIATION_STRATEGY.md covering real OCR, Google Drive, bank transaction aggregators, crypto/investment tracking, multi-currency, and receipt-to-bank-transaction reconciliation. Do not write provider-specific code, do not add credentials, and do not expand app scope. Verify by summarizing recommended integration order and updating PROGRESS.md.
```

---

# Recommended first 3 Codex runs

## Run 1

Use `/plan` first:

```text
/plan I want to build a mobile-first PWA personal finance tracker focused on item-level receipt analysis. First inspect the repository, identify the current stack, and propose the smallest safe implementation plan. Do not code yet. The MVP should include manual transactions, pasted receipt text parsing, receipt review, recurring expenses, and dashboard analytics. Real bank integrations, real OCR, Google Drive, crypto, and brokerage integrations are out of scope for MVP.
```

Then:

```text
/goal Create the project planning and execution documents for an AI personal finance tracker MVP. Add PRODUCT_SPEC.md, ARCHITECTURE.md, PLAN.md, IMPLEMENT.md, PROGRESS.md, and DECISIONS.md. Do not implement product code yet unless the repository has no basic README and a minimal README is needed. The documents must define a mobile-first PWA focused on item-level receipt analysis, manual expenses, recurring expenses, and dashboard analytics. Real bank, broker, crypto exchange, and payment integrations are explicitly out of scope for MVP. Verify by listing the created/updated files and summarizing the next implementation phase in PROGRESS.md.
```

## Run 2

```text
/goal Implement Phase 1 from PLAN.md: create a working mobile-first PWA skeleton for the personal finance tracker. Build the main app shell, responsive navigation, and placeholder screens for Dashboard, Transactions, Receipts, Recurring, Categories, and Settings using mock data only. Verify with npm install if needed, npm run typecheck if available, and npm run build. Keep scope limited to Phase 1 and update PROGRESS.md with completed work, validation commands, and next steps.
```

## Run 3

```text
/goal Implement Phase 2 and Phase 3 from PLAN.md only if Phase 1 is complete and validation passes. Add the core data model/local persistence/service layer and manual transaction creation/editing/deletion/filtering. Keep all data local-first. Do not add receipt parsing, bank APIs, Google Drive, auth, or external providers in this run. Verify with tests where practical, typecheck, and build. Update ARCHITECTURE.md and PROGRESS.md.
```

---

# Definition of Done for MVP

MVP can be considered useful when:

- user can add manual transactions;
- user can paste receipt text;
- parser creates line items;
- user can review/edit/confirm receipt;
- dashboard shows spend by category, merchant, product/item;
- recurring expenses are visible;
- CSV import/export works;
- data can be backed up/exported;
- app builds cleanly;
- docs explain current limits.

---

# What not to do early

Do not ask Codex to implement these in the first MVP loop:

- real bank login;
- real payment operations;
- real brokerage integration;
- real crypto exchange connection;
- automatic tax advice;
- storing bank credentials;
- background server jobs;
- complex AI agent scheduler;
- multi-user accounts;
- monetization;
- app store release;
- full security compliance.

These are later stages, after the local-first MVP proves the core value.

# Источники и техническая проверка

Материалы проекта сверены 31 октября 2026 года. Для сетевых протоколов в первую очередь использованы стандарты IETF (RFC). Для объяснения работы браузера — документация MDN Web Docs.

## 1. URL, подготовка и HSTS

- [MDN — URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL) — структура URL и доступ к его частям.
- [RFC 6797 — HTTP Strict Transport Security (HSTS)](https://www.rfc-editor.org/rfc/rfc6797.html) — механизм, позволяющий браузеру применять политику обязательного HTTPS для известных хостов.

Уточнение: HSTS не является обязательным шагом каждого посещения. Правило применяется, если браузер получил или загрузил соответствующую политику для домена.

## 2. DNS

- [RFC 1034 — Domain Names: Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.html) — архитектура DNS, роли резолверов и серверов имён, рекурсивный режим и делегирование.
- [RFC 1035 — Domain Names: Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035.html) — формат DNS-сообщений и ресурсных записей.
- [Google Cloud — DNS overview](https://docs.cloud.google.com/dns/docs/dns-overview) — пояснение ролей рекурсивных и авторитетных серверов.

Уточнение: клиент обычно отправляет запрос настроенному рекурсивному резолверу. Если нужной записи нет в кеше, резолвер может пройти по делегированиям: от корневой зоны к зоне верхнего уровня (например, `.com`), а затем к авторитетным серверам домена. Клиентское устройство не обязано самостоятельно опрашивать все эти серверы. Кеш может позволить ответить без полного поиска.

## 3. IP-маршрутизация и локальная доставка

- [RFC 1812 — Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812.html) — пересылка IPv4-пакетов маршрутизаторами.
- [RFC 826 — Address Resolution Protocol (ARP)](https://www.rfc-editor.org/rfc/rfc826.html) — определение адреса канального уровня по адресу сетевого протокола в локальном Ethernet.
- [RFC 4861 — Neighbor Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc4861.html) — обнаружение соседей и разрешение адресов канального уровня в IPv6.

Уточнение: при отправке пакета за пределы локальной сети компьютер обычно определяет MAC-адрес следующего узла (например, домашнего маршрутизатора), а не удалённого веб-сервера. При пересылке маршрутизаторами IP-пакет продолжает путь, а кадр канального уровня формируется заново на каждом канальном участке. Маршрутизация используется при передаче каждого IP-пакета, а не только один раз перед TCP.

## 4. TCP Handshake

- [RFC 9293 — Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html), раздел 3.5 — установление TCP-соединения с помощью трёхстороннего рукопожатия.

Классическая последовательность: клиент отправляет SYN, сервер отвечает SYN-ACK, клиент подтверждает ACK. Это создаёт TCP-соединение и синхронизирует начальные номера последовательности. TCP предоставляет надёжный упорядоченный поток байтов, но не гарантирует, что каждый сегмент дойдёт с первой попытки.

## 5. TLS и QUIC / HTTP/3

- [RFC 9846 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc9846.html) — актуальная спецификация TLS 1.3; опубликована в июле 2026 года, заменяет RFC 8446 и сохраняет версию протокола TLS 1.3.
- [RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000.html) — транспорт QUIC и объединённое согласование транспортных и криптографических параметров.
- [RFC 9001 — Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001.html) — использование TLS 1.3 в QUIC.
- [RFC 9114 — HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html) — HTTP поверх QUIC.

Уточнения:
- В полном TLS 1.3 handshake обычно участвуют ClientHello, ServerHello, EncryptedExtensions, Certificate, CertificateVerify и Finished. Некоторые сообщения могут отсутствовать в зависимости от режима аутентификации или возобновления сессии.
- Сертификат не шифрует весь трафик своим открытым ключом. Во время handshake стороны согласуют общий секрет и выводят симметричные ключи для защиты данных.
- HTTP/3 использует QUIC поверх UDP. QUIC интегрирует TLS handshake в собственное установление соединения, поэтому отдельного TCP handshake в этой модели нет.

## 6. HTTP

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — семантика HTTP: методы, заголовки, ответы и коды состояния.
- [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html) — формат сообщений HTTP/1.1.
- [RFC 9113 — HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html) — HTTP/2.
- [RFC 9114 — HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html) — HTTP/3.
- [MDN — Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) — вводное объяснение клиент-серверного обмена.

Уточнение: пример `GET /catalog HTTP/1.1` относится именно к HTTP/1.1. HTTP/2 и HTTP/3 кодируют сообщения иначе, сохраняя общую семантику HTTP. Код 404 — это HTTP-ответ, а не ошибка DNS или доказательство того, что сервер недоступен.

## 7. Загрузка ресурсов и отображение страницы

- [MDN — How browsers load websites](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_browsers_load_websites) — обработка HTML, дополнительные запросы, CSS и JavaScript.
- [MDN — Critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path) — DOM, CSSOM, render tree, layout и paint.
- [MDN — JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) — модель выполнения JavaScript и event loop.

Уточнения:
- При разборе HTML браузер обнаруживает ссылки на CSS, JavaScript, изображения, шрифты и другие ресурсы. Для них могут выполняться дополнительные запросы; часть файлов может быть взята из кеша, а некоторые запросы могут идти параллельно.
- DOM — объектное представление структуры HTML, CSSOM — представление CSS-правил.
- JavaScript не является строго последним шагом после полной отрисовки. Скрипты могут выполняться во время загрузки, менять DOM и стили, а также запускать новые запросы.
- Layout рассчитывает размеры и расположение элементов; Paint рисует визуальные части. Объединение слоёв (compositing) выполняется, когда это требуется браузеру.

---

## Граница точности модели

Проект показывает типичный учебный сценарий открытия HTTPS-сайта через TCP. Это не универсальная последовательность для каждого посещения: кеши, уже открытые соединения, перенаправления, CDN и другие механизмы могут изменить конкретный путь. HTTP/3 на QUIC описан как альтернативный вариант, а не как часть последовательности TCP.

Введённый адрес подставляется в примеры интерфейса. Приложение не выполняет реальные DNS-запросы, не открывает TCP/TLS-соединение и не захватывает сетевой трафик.

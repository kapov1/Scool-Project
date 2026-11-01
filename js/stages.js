/*
 * Девять учебных этапов и их схемы.
 * Координаты SVG заданы в системе 1000 × 560. Для sequence-схем участники повторяются в каждой строке обмена: это заменяет вертикальные lifeline-линии и связывает каждую стрелку непосредственно с карточками участников.
 * Это упрощённая модель обычного HTTPS-подключения через TCP,
 * а не захват реального сетевого трафика.
 */

window.NETWORK_STAGES = [
  {
    title: 'Браузер разбирает адрес',
    lead: 'Сначала браузеру нужно понять, какой сайт и какой ресурс попросил открыть пользователь.',
    what: 'Браузер разбирает URL на части: схему (https), имя хоста, порт и путь. Он также может проверить сохранённые данные, правила безопасности и уже открытые соединения. Поэтому не каждое посещение начинается с нуля.',
    why: 'Браузер определяет, куда и каким способом обращаться, а также какой именно ресурс нужен пользователю.',
    exampleLabel: 'ПРИМЕР URL',
    example: 'https://example.com/catalog?sort=price\n  │       │          └─ путь и параметры\n  │       └─ имя хоста\n  └─ схема: HTTPS',
    note: 'Если для домена действует HSTS, браузер использует HTTPS и не должен переходить на небезопасный HTTP. Кеш или уже открытое соединение могут сократить последующие шаги.',
    caption: 'Пользователь передаёт адрес браузеру',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'person', x: 160, y: 350, width: 210, height: 104, label: 'Пользователь', sub: 'вводит адрес', type: 'person' },
        { id: 'browser', x: 500, y: 350, width: 210, height: 104, label: 'Браузер', sub: 'разбирает URL', type: 'browser' },
        { id: 'url', x: 840, y: 350, width: 210, height: 104, label: 'Адрес сайта', sub: 'схема · домен · путь', type: 'data' }
      ],
      edges: [
        { from: 'person', to: 'browser', label: 'вводит URL', labelY: 270 },
        { from: 'browser', to: 'url', label: 'разбор URL', labelY: 270 }
      ]
    },
    sources: ['mdn-url', 'rfc6797']
  },
  {
    title: 'DNS находит IP-адрес',
    lead: 'Доменное имя удобно человеку. Для отправки IP-пакетов компьютеру нужен IP-адрес назначения.',
    what: 'Компьютер обращается к настроенному рекурсивному DNS-резолверу. Если ответа нет в кеше, резолвер ищет его по иерархии DNS: получает направление от корневых серверов, затем от серверов домена верхнего уровня (например, .com), а окончательную запись — у авторитетного DNS-сервера.',
    why: 'DNS связывает доменные имена с IP-адресами. Благодаря этому пользователю не нужно запоминать числовой адрес каждого сайта.',
    exampleLabel: 'КАКОЙ ОТВЕТ МОЖЕТ ВЕРНУТЬ DNS',
    example: 'Имя: example.com\nТип записи: A — IPv4\nТип записи: AAAA — IPv6\n\nОтвет содержит адрес, а не саму веб-страницу.',
    note: 'Обычно устройство спрашивает рекурсивный резолвер, а не обращается само по очереди к root, .com и авторитетному серверу. DNS-кеш может позволить резолверу ответить сразу. Пример показывает типы записей, а не обещает постоянный IP example.com.',
    caption: 'Резолвер при необходимости ищет ответ в иерархии DNS',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'client', x: 150, y: 78, width: 200, height: 78, label: 'Компьютер', sub: 'DNS-клиент', type: 'browser' },
        { id: 'resolver', x: 500, y: 78, width: 200, height: 78, label: 'DNS-резолвер', sub: 'выполняет поиск', type: 'server' },
        { id: 'hierarchy', x: 850, y: 78, width: 200, height: 78, label: 'DNS-иерархия', sub: 'root · .com · авторитетный', type: 'network' }
      ],
      edges: [
        { from: 'client', to: 'resolver', label: 'DNS-запрос' },
        { from: 'resolver', to: 'hierarchy', label: 'поиск IP' },
        { from: 'hierarchy', to: 'resolver', label: 'A / AAAA: IP' },
        { from: 'resolver', to: 'client', label: 'ответ с IP' }
      ]
    },
    sources: ['rfc1034', 'rfc1035', 'google-dns']
  },
  {
    title: 'Пакеты проходят через сеть',
    lead: 'Когда IP-адрес назначения известен, компьютер может отправлять пакеты в сторону нужной сети.',
    what: 'Операционная система смотрит таблицу маршрутизации и выбирает следующий узел. Обычно для внешнего адреса это домашний маршрутизатор — шлюз по умолчанию. Маршрутизаторы пересылают IP-пакет дальше, выбирая следующий переход по своим таблицам.',
    why: 'Интернет состоит из множества соединённых сетей. Маршрутизация помогает пакетам пройти через них к сети назначения.',
    exampleLabel: 'ВАЖНО РАЗЛИЧАТЬ',
    example: 'IP-адрес — куда направлен пакет.\nMAC-адрес — кому передать кадр\nна текущем локальном участке.',
    note: 'В IPv4 для поиска MAC-адреса следующего узла обычно применяется ARP; в IPv6 — Neighbor Discovery. Компьютер не ищет MAC-адрес удалённого веб-сервера. На каждом канальном участке кадр формируется заново, а IP-пакет продолжает путь. Маршрутизация применяется к каждому IP-пакету — не только в отдельный момент перед TCP.',
    caption: 'Пакет проходит через маршрутизаторы к сети сайта',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'pc', x: 110, y: 350, width: 180, height: 108, label: 'Компьютер', sub: 'создаёт IP-пакет', type: 'browser' },
        { id: 'router', x: 360, y: 350, width: 220, height: 108, label: 'Маршрутизатор', sub: 'домашний шлюз', type: 'router' },
        { id: 'isp', x: 640, y: 350, width: 220, height: 108, label: 'Сеть провайдера', sub: 'маршрутизаторы', type: 'network' },
        { id: 'site', x: 890, y: 350, width: 180, height: 108, label: 'Сеть сайта', sub: 'сеть назначения', type: 'server' }
      ],
      edges: [
        { from: 'pc', to: 'router' },
        { from: 'router', to: 'isp' },
        { from: 'isp', to: 'site' }
      ]
    },
    sources: ['rfc1812', 'rfc826', 'rfc4861']
  },
  {
    title: 'Устанавливается TCP-соединение',
    lead: 'В классической схеме HTTPS поверх TCP клиент и сервер сначала устанавливают TCP-соединение.',
    what: 'Сначала клиент отправляет SYN. Сервер отвечает SYN-ACK: подтверждает запрос и сообщает собственный начальный номер последовательности. Затем клиент отправляет ACK. После этого TCP-соединение установлено.',
    why: 'TCP предоставляет приложениям надёжный и упорядоченный поток байтов. Он использует подтверждения и повторную передачу потерянных данных.',
    exampleLabel: 'ТРИ СООБЩЕНИЯ TCP',
    example: 'Клиент  ── SYN ────────▶  Сервер\nКлиент  ◀── SYN-ACK ────  Сервер\nКлиент  ── ACK ────────▶  Сервер',
    note: 'Это стандартная схема нового TCP-соединения, но браузер может повторно использовать уже открытое соединение. Этот этап относится к HTTP/1.1 и HTTP/2 поверх TCP. HTTP/3 работает поверх QUIC/UDP и не использует отдельный TCP handshake.',
    caption: 'SYN → SYN-ACK → ACK',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'client', x: 230, y: 78, width: 210, height: 78, label: 'Клиент', sub: 'браузер', type: 'browser' },
        { id: 'server', x: 770, y: 78, width: 210, height: 78, label: 'Сервер', sub: 'порт HTTPS 443', type: 'server' }
      ],
      edges: [
        { from: 'client', to: 'server', label: 'SYN' },
        { from: 'server', to: 'client', label: 'SYN-ACK' },
        { from: 'client', to: 'server', label: 'ACK' }
      ]
    },
    sources: ['rfc9293', 'rfc9000']
  },
  {
    title: 'TLS защищает соединение',
    lead: 'Для HTTPS нужно не только соединиться с сервером, но и защитить данные и проверить подлинность сервера.',
    what: 'В полном TLS 1.3 handshake клиент отправляет ClientHello. Сервер отвечает ServerHello, затем передаёт EncryptedExtensions с параметрами соединения, сертификат и цифровую подпись CertificateVerify, после чего отправляет Finished. Клиент проверяет сертификат, имя сайта и подпись, затем отвечает своим Finished. После рукопожатия стороны используют согласованные симметричные ключи для защиты данных.',
    why: 'TLS обеспечивает конфиденциальность и целостность передаваемых данных, а проверка сертификата помогает убедиться, что клиент подключился к нужному сайту.',
    exampleLabel: 'ЧТО ДАЁТ TLS',
    example: 'Конфиденциальность — данные защищены от чтения.\nЦелостность — незаметное изменение обнаруживается.\nПроверка сервера — подтверждается его подлинность.',
    note: 'Сертификат не шифрует весь трафик своим открытым ключом. TLS 1.3 устанавливает общий секрет, из которого выводятся симметричные ключи. В HTTP/3 TLS интегрирован в QUIC handshake, поэтому отдельного TCP-этапа перед ним нет. Актуальная редакция TLS 1.3 опубликована как RFC 9846 в июле 2026 года: она заменяет RFC 8446, сохраняя версию протокола TLS 1.3.',
    caption: 'Клиент и сервер проверяют параметры и устанавливают ключи защиты',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'client', x: 230, y: 78, width: 210, height: 78, label: 'Клиент', sub: 'проверяет сертификат', type: 'browser' },
        { id: 'server', x: 770, y: 78, width: 210, height: 78, label: 'Сервер', sub: 'предъявляет сертификат', type: 'server' }
      ],
      edges: [
        { from: 'client', to: 'server', label: 'ClientHello' },
        { from: 'server', to: 'client', label: 'ServerHello + EncryptedExtensions' },
        { from: 'server', to: 'client', label: 'Certificate + CertificateVerify' },
        { from: 'server', to: 'client', label: 'Finished сервера' },
        { from: 'client', to: 'server', label: 'Finished клиента' }
      ]
    },
    sources: ['rfc9846', 'rfc9000', 'rfc9001']
  },
  {
    title: 'Браузер отправляет HTTP-запрос',
    lead: 'Защищённый канал готов. Теперь браузер сообщает серверу, какой ресурс ему нужен.',
    what: 'HTTP-запрос содержит метод, путь к ресурсу и заголовки. Например, GET просит получить страницу каталога. В заголовках могут передаваться сведения о формате ответа, хосте и другие параметры. У некоторых запросов также есть тело.',
    why: 'HTTP задаёт общий язык общения браузера и веб-сервера: что запрашивается и как трактовать сообщение.',
    exampleLabel: 'ПРИМЕР HTTP/1.1 REQUEST',
    example: 'GET /catalog HTTP/1.1\nHost: example.com\nAccept: text/html',
    note: 'Текстовая строка GET /catalog HTTP/1.1 — пример именно HTTP/1.1. В HTTP/2 и HTTP/3 формат передачи другой, но смысл методов, заголовков и статусов HTTP сохраняется.',
    caption: 'Браузер отправляет запрос внутри защищённого HTTPS-соединения',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'browser', x: 230, y: 78, width: 210, height: 78, label: 'Браузер', sub: 'HTTP-клиент', type: 'browser' },
        { id: 'server', x: 770, y: 78, width: 210, height: 78, label: 'Веб-сервер', sub: 'HTTP-сервер', type: 'server' }
      ],
      edges: [
        { from: 'browser', to: 'server', label: 'GET /catalog + заголовки' }
      ]
    },
    sources: ['rfc9110', 'rfc9112', 'rfc9113', 'rfc9114', 'mdn-http']
  },
  {
    title: 'Сервер обрабатывает запрос и отвечает',
    lead: 'Сервер получает запрос, готовит результат и отправляет браузеру HTTP-ответ.',
    what: 'На крупных сайтах перед приложением могут стоять CDN или промежуточный сервер. Иногда такой узел сразу возвращает сохранённую копию ответа; в другом случае запрос передаётся серверному приложению. Приложение выполняет нужную работу и при необходимости обращается к базе данных, а затем формирует HTTP-ответ: статус, заголовки и, если нужно, содержимое страницы.',
    why: 'Серверная часть превращает запрос клиента в результат: страницу, данные или сообщение об ошибке.',
    exampleLabel: 'ПРИМЕР HTTP/1.1 RESPONSE',
    example: 'HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<!doctype html> ...',
    note: '200 означает успешный результат, 301/302 — перенаправление, 404 — запрошенный ресурс не найден, 500 — внутренняя ошибка сервера. Ответ 404 всё равно является HTTP-ответом: это не то же самое, что ошибка DNS или отсутствие соединения.',
    caption: 'Приложение готовит данные и возвращает HTTP-ответ',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'browser', x: 160, y: 78, width: 190, height: 78, label: 'Браузер', sub: 'отправил запрос', type: 'browser' },
        { id: 'app', x: 500, y: 78, width: 190, height: 78, label: 'Приложение', sub: 'обрабатывает запрос', type: 'server' },
        { id: 'db', x: 840, y: 78, width: 190, height: 78, label: 'База данных', sub: 'если нужны данные', type: 'data' }
      ],
      edges: [
        { from: 'browser', to: 'app', label: 'HTTP-запрос' },
        { from: 'app', to: 'db', label: 'запрос к БД' },
        { from: 'db', to: 'app', label: 'результат' },
        { from: 'app', to: 'browser', label: 'HTTP-ответ' }
      ]
    },
    sources: ['rfc9110', 'rfc9112', 'mdn-http']
  },
  {
    title: 'Браузер загружает ресурсы страницы',
    lead: 'Получив HTML, браузер находит ссылки на файлы, которые нужны для оформления и работы страницы.',
    what: 'В HTML могут быть ссылки на таблицы стилей, JavaScript-файлы, изображения, шрифты и другие ресурсы. Браузер запрашивает их отдельно. Часть файлов может прийти из кеша, а несколько сетевых запросов часто выполняются параллельно.',
    why: 'HTML описывает структуру страницы, но для полного отображения обычно нужны также стили, изображения, шрифты и скрипты.',
    exampleLabel: 'ЧТО МОЖЕТ ЗАГРУЖАТЬСЯ',
    example: 'index.html\n  ├─ styles.css\n  ├─ app.js\n  ├─ logo.svg\n  ├─ photo.webp\n  └─ font.woff2',
    note: 'Это не обязательно последовательная очередь: браузер может загружать ресурсы одновременно и использовать кеш. Если JavaScript делает запрос через fetch к другому origin, браузер проверяет CORS — разрешено ли странице читать такой ответ. Это не универсальный запрет на все межсайтовые загрузки.',
    caption: 'После HTML браузер запрашивает связанные файлы',
    diagram: {
      kind: 'sequence',
      participants: [
        { id: 'browser', x: 230, y: 78, width: 210, height: 78, label: 'Браузер', sub: 'находит ссылки в HTML', type: 'browser' },
        { id: 'server', x: 770, y: 78, width: 210, height: 78, label: 'Сервер', sub: 'возвращает файлы', type: 'server' }
      ],
      edges: [
        { from: 'server', to: 'browser', label: 'HTML-документ' },
        { from: 'browser', to: 'server', label: 'запрос CSS, JS и изображений' },
        { from: 'server', to: 'browser', label: 'стили, скрипты и медиафайлы' }
      ]
    },
    sources: ['mdn-browser', 'mdn-critical', 'mdn-http']
  },
  {
    title: 'Браузер формирует страницу',
    lead: 'Браузер превращает полученные файлы в структуру, рассчитывает расположение элементов и рисует страницу.',
    what: 'HTML разбирается в DOM — дерево элементов документа. CSS образует CSSOM — набор правил стилей. Браузер рассчитывает применённые стили, выполняет Layout (размеры и положение), затем Paint (отрисовка текста, цветов и других элементов). Слои при необходимости объединяются для показа кадра на экране.',
    why: 'Полученные файлы ещё не являются готовой картинкой. Браузер должен обработать их и определить, как именно отобразить страницу.',
    exampleLabel: 'УПРОЩЁННАЯ ЦЕПОЧКА ОТРИСОВКИ',
    example: 'HTML + CSS → DOM + CSSOM\nDOM + CSSOM → Layout → Paint\nРезультат → изображение на экране',
    note: 'JavaScript может выполняться уже во время загрузки: он способен менять DOM и стили, а также отправлять новые запросы. Поэтому это не строго последний шаг единой очереди — браузер может обновлять страницу постепенно.',
    caption: 'Структура и стили превращаются в изображение на экране',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'files', x: 125, y: 350, width: 190, height: 112, label: 'HTML + CSS', sub: 'полученные файлы', type: 'document' },
        { id: 'trees', x: 375, y: 350, width: 190, height: 112, label: 'DOM + CSSOM', sub: 'структуры данных', type: 'data' },
        { id: 'render', x: 625, y: 350, width: 190, height: 112, label: 'Layout + Paint', sub: 'расчёт и отрисовка', type: 'browser' },
        { id: 'screen', x: 875, y: 350, width: 190, height: 112, label: 'Экран', sub: 'готовая страница', type: 'screen' }
      ],
      edges: [
        { from: 'files', to: 'trees' },
        { from: 'trees', to: 'render' },
        { from: 'render', to: 'screen' }
      ]
    },
    sources: ['mdn-browser', 'mdn-critical', 'mdn-js']
  }
];

window.NETWORK_SOURCES = {
  'mdn-url': {
    label: 'MDN: URL API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/URL'
  },
  'rfc6797': {
    label: 'RFC 6797: HSTS',
    url: 'https://www.rfc-editor.org/rfc/rfc6797.html'
  },
  'rfc1034': {
    label: 'RFC 1034: устройство DNS',
    url: 'https://www.rfc-editor.org/rfc/rfc1034.html'
  },
  'rfc1035': {
    label: 'RFC 1035: DNS-записи и сообщения',
    url: 'https://www.rfc-editor.org/rfc/rfc1035.html'
  },
  'google-dns': {
    label: 'Google Cloud: обзор DNS',
    url: 'https://docs.cloud.google.com/dns/docs/dns-overview'
  },
  'rfc1812': {
    label: 'RFC 1812: IP-маршрутизаторы',
    url: 'https://www.rfc-editor.org/rfc/rfc1812.html'
  },
  'rfc826': {
    label: 'RFC 826: ARP',
    url: 'https://www.rfc-editor.org/rfc/rfc826.html'
  },
  'rfc4861': {
    label: 'RFC 4861: IPv6 Neighbor Discovery',
    url: 'https://www.rfc-editor.org/rfc/rfc4861.html'
  },
  'rfc9293': {
    label: 'RFC 9293: TCP',
    url: 'https://www.rfc-editor.org/rfc/rfc9293.html'
  },
  'rfc9846': {
    label: 'RFC 9846: TLS 1.3 (заменяет RFC 8446)',
    url: 'https://www.rfc-editor.org/rfc/rfc9846.html'
  },
  'rfc9000': {
    label: 'RFC 9000: QUIC',
    url: 'https://www.rfc-editor.org/rfc/rfc9000.html'
  },
  'rfc9001': {
    label: 'RFC 9001: TLS в QUIC',
    url: 'https://www.rfc-editor.org/rfc/rfc9001.html'
  },
  'rfc9110': {
    label: 'RFC 9110: семантика HTTP',
    url: 'https://www.rfc-editor.org/rfc/rfc9110.html'
  },
  'rfc9112': {
    label: 'RFC 9112: HTTP/1.1',
    url: 'https://www.rfc-editor.org/rfc/rfc9112.html'
  },
  'rfc9113': {
    label: 'RFC 9113: HTTP/2',
    url: 'https://www.rfc-editor.org/rfc/rfc9113.html'
  },
  'rfc9114': {
    label: 'RFC 9114: HTTP/3',
    url: 'https://www.rfc-editor.org/rfc/rfc9114.html'
  },
  'mdn-http': {
    label: 'MDN: обзор HTTP',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview'
  },
  'mdn-browser': {
    label: 'MDN: как браузер загружает сайты',
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_browsers_load_websites'
  },
  'mdn-critical': {
    label: 'MDN: критический путь отрисовки',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path'
  },
  'mdn-js': {
    label: 'MDN: выполнение JavaScript',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model'
  }
};

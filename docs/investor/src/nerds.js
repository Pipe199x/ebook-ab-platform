// For nerds: the map of what happens behind the screen of Antes de decidir · Before You Decide.
// It feeds the demo's "For nerds" tab (docs/plan/render/demo.html, inlined by tools/build_companion.py), and the plan
// (docs/plan/PLAN.pdf, section 3) shows it. No dependencies and no network: every icon is drawn here.
// Organized like a delivery service (letters, a mailbox, a mail truck, a post office, sorting rooms, addresses), with the
// three kinds of data as colored lanes that never cross. Kafka carries only the simulated store: Duel votes travel as
// files (plan v3.0, D30).
(function (root) {
  "use strict";
  const L = (en, es) => ({ en, es });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fix = (n) => Math.round(n * 10) / 10;
  const tr = (v, lang) => (v && typeof v === "object" ? v[lang] ?? v.en : v);

  /* ---------- Three kinds of data (the source badges of the answers to plan v2.2), plus who starts what ---------- */
  const KINDS = {
    real: { label: L("Real people", "Personas reales"), note: L("Duel votes and shared results, as files", "votos del Duelo y resultados compartidos, en archivos"),
      ends: L("Fills the Duel library. A group shows numbers only after 5 results.", "Llena la biblioteca de duelos. Un grupo muestra números solo con 5 resultados.") },
    public: { label: L("Real public tests", "Pruebas públicas reales"), note: L("Upworthy headlines, Gutenberg catalog", "titulares de Upworthy, catálogo de Gutenberg"),
      ends: L("Becomes the Real lessons and the tools' realistic expectations.", "Se vuelve las Lecciones reales y las expectativas realistas de las herramientas.") },
    sim: { label: L("Simulated", "Simulado"), note: L("70,000 fictional shoppers", "70.000 compradores ficticios"),
      ends: L("Runs the platform every day and checks the math against a known answer. Never enters the library.", "Mueve la plataforma cada día y prueba la matemática contra una respuesta conocida. Nunca entra a la biblioteca.") },
    ctrl: { label: L("Who starts what", "Quién arranca qué"), note: L("the 06:00 daily run", "la corrida diaria de las 06:00") },
  };

  /* ---------- The boxes: a title, a short title for small tiles, a plain-world analogy and a machine note ---------- */
  const NODES = {
    reader: { icon: "phone", kind: "real", t: L("A reader's phone", "El teléfono de una lectora"), ts: L("A reader", "Una lectora"), a: L("writes the letter", "escribe la carta"), m: L("A or B, at random", "A o B, al azar") },
    mailbox: { icon: "mailbox", kind: "real", t: L("Cloudflare Worker + D1", "Cloudflare Worker + D1"), ts: L("Worker + D1", "Worker + D1"), a: L("the mailbox", "el buzón"), m: L("counts only", "solo conteos") },
    writer: { icon: "laptop", kind: "real", t: L("The writer's progress", "El progreso de la autora"), ts: L("The writer", "La autora"), a: L("no peeking at winners", "sin espiar al ganador"), m: L("opens at 330", "se abre en 330") },
    doctor: { icon: "doctor", t: L("Ad Doctor", "Doctor de anuncios"), a: L("a check-up at home", "un chequeo en casa"), m: L("Amazon Ads CSV", "CSV de Amazon Ads") },
    luck: { icon: "dice", t: L("Real or luck?", "¿Real o suerte?"), a: L("a second opinion", "una segunda opinión"), m: L("two sales counts", "dos conteos de ventas") },
    daily: { icon: "clock", t: L("GitHub Actions", "GitHub Actions"), a: L("the mail truck", "el camión del correo"), m: L("cron 11:00 UTC", "cron 11:00 UTC") },
    votes: { icon: "letters", kind: "real", t: L("Duel votes", "Votos del Duelo"), m: L("from D1", "desde D1") },
    sim: { icon: "shoppers", kind: "sim", t: L("Simulator", "Simulador"), m: L("70,000 fictional", "70.000 ficticios") },
    open: { icon: "opendata", kind: "public", t: L("Open data", "Datos abiertos"), m: L("Upworthy Gutenberg", "Upworthy Gutenberg") },
    kafka: { icon: "pigeonholes", t: L("Kafka", "Kafka"), a: L("the post office", "la oficina de correos") },
    dock: { icon: "dock", t: L("Bridge + volume", "Puente + volumen"), a: L("the loading dock", "el muelle de carga") },
    bronze: { icon: "bronze", t: L("Bronze", "Bronze"), a: L("the original letters", "las cartas originales") },
    silver: { icon: "silver", t: L("Silver", "Silver"), a: L("checked copies", "copias revisadas") },
    gold: { icon: "gold", t: L("Gold", "Gold"), a: L("the summaries", "los resúmenes") },
    stats: { icon: "scale", t: L("Statistics", "Estadística"), a: L("the referee", "el árbitro") },
    pages: { icon: "browser", t: L("GitHub Pages", "GitHub Pages"), a: L("the addresses", "las direcciones"), m: L("React · Vite", "React · Vite") },
    library: { icon: "shelf", kind: "real", t: L("Duel library", "Biblioteca de duelos"), m: L("for writers", "para quien escribe") },
    store: { icon: "shop", kind: "sim", t: L("Test store", "Tienda de prueba"), m: L("for recruiters", "para quien recluta") },
    lessons: { icon: "paper", kind: "public", t: L("Real lessons", "Lecciones reales"), m: L("for writers", "para quien escribe") },
  };
  // What a box's card says when it is tapped: what it does, where it lives in the repo, why it is built this way, what it costs.
  const FREE = L("$0", "$0");
  const DETAILS = {
    reader: { what: L("The reader opens the Duel link and sees one version, picked at random from a hash of the Duel and the visitor. One tap answers “Would you read the first page?”", "La lectora abre el enlace del duelo y ve una sola versión, elegida al azar con un hash del duelo y de la visitante. Un toque responde «¿Leerías la primera página?»."),
      where: "web/src/pages/duel (reader view)", why: L("One version per person and hidden votes make it a real A/B test, not a poll.", "Una versión por persona y votos ocultos lo vuelven una prueba A/B de verdad, no una encuesta."), cost: FREE },
    mailbox: { what: L("A Cloudflare Worker receives each vote and keeps counts in a D1 database: no cookies, no names, one vote per visitor and Duel. The IP is never kept longer than a day. It also keeps the results writers choose to share.", "Un Worker de Cloudflare recibe cada voto y guarda conteos en una base D1: sin cookies, sin nombres, un voto por visitante en cada duelo. La IP nunca se guarda más de un día. También guarda los resultados que las autoras deciden compartir."),
      where: "edge/src/worker.ts, edge/schema.sql, wrangler.toml", why: L("The only server in the project, free and with no card: 100,000 requests and 100,000 written rows a day, 500 MB per database.", "El único servidor del proyecto, gratis y sin tarjeta: 100.000 pedidos y 100.000 filas escritas al día, 500 MB por base."), cost: L("$0 (Workers Free + D1 Free)", "$0 (Workers Free + D1 Free)") },
    writer: { what: L("The progress page shows how many readers voted and whether the split looks fair, but never the winner before the target of 330 readers.", "La página de progreso muestra cuántos lectores votaron y si el reparto se ve justo, pero nunca el ganador antes de la meta de 330 lectores."),
      where: "web/src/pages/duel (progress), edge/ (counts)", why: L("Stopping on a lucky streak is how people pick the wrong cover. The rules are set before the game.", "Parar con una racha de suerte es como se elige la portada equivocada. Las reglas se fijan antes del partido."), cost: FREE },
    doctor: { what: L("Reads an Amazon Ads search-term report inside the browser and compares each keyword with the book's own average (a beta-binomial model): Stop, Keep, Luck or Wait.", "Lee en el navegador un informe de términos de búsqueda de Amazon Ads y compara cada palabra clave con el promedio del libro (un modelo beta-binomial): Parar, Mantener, Suerte o Esperar."),
      where: "web/src/pages/doctor, web/src/stats", why: L("An ad report is private: the file never leaves the browser.", "Un informe de anuncios es privado: el archivo nunca sale del navegador."), cost: FREE },
    luck: { what: L("Two sales counts, before and after a change, an exact test adjusted for the days, and an honest answer: it's real, or you can't tell yet.", "Dos conteos de ventas, antes y después de un cambio, una prueba exacta ajustada por días y una respuesta honesta: es real, o todavía no se puede saber."),
      where: "web/src/pages/luck, web/src/stats", why: L("It isn't an experiment, so for a sure answer about a cover or a title it points to a Duel.", "No es un experimento, así que para una respuesta segura sobre una portada o un título manda a un duelo."), cost: FREE },
    daily: { what: L("Every day at 06:00 in Bogotá (11:00 UTC) a free GitHub machine runs the whole loop: Kafka, one simulated day, the bridge, the D1 export, the Databricks job, the JSON export and the site. Time limit: 30 minutes.", "Cada día a las 06:00 de Bogotá (11:00 UTC) una máquina gratis de GitHub corre todo el ciclo: Kafka, un día simulado, el puente, el export de D1, el job de Databricks, el export a JSON y el sitio. Tiempo máximo: 30 minutos."),
      where: ".github/workflows/daily-e2e.yml (also ci.yml, deploy-dev.yml, pages.yml)", why: L("Free for public repos, and no laptop needed. A Kafka per run always works; Aiven's free Kafka powers off when idle.", "Gratis para repos públicos y sin laptop. Un Kafka por corrida siempre funciona; el Kafka gratis de Aiven se apaga cuando no se usa."), cost: FREE },
    votes: { what: L("Each morning the new Duel votes, shared results and withdrawals are copied out of D1 into a JSONL file in the landing volume.", "Cada mañana se copian de D1 los votos nuevos, los resultados compartidos y los retiros en un archivo JSONL del volumen de llegada."),
      where: "src/ebook_ab/realdata/, the D1 export step of daily-e2e.yml", why: L("Real votes join the same lakehouse as everything else. They go as a file, not through Kafka: a few votes a day fit in one file.", "Los votos reales entran al mismo lakehouse que todo lo demás. Van en un archivo, no por Kafka: pocos votos al día caben en un archivo."), cost: FREE },
    sim: { what: L("70,000 fictional shoppers on a real Project Gutenberg catalog. Each one gets A or B from a hash of their ID. The program plants known effects and scheduled faults.", "70.000 compradores ficticios en un catálogo real de Project Gutenberg. Cada uno recibe A o B por un hash de su ID. El programa planta efectos conocidos y fallas programadas."),
      where: "src/ebook_ab/simulator/ (backfill | live)", why: L("Real traffic costs money. A simulation with a known answer proves that the pipeline and the statistics find it.", "El tráfico real cuesta dinero. Una simulación con respuesta conocida prueba que el pipeline y la estadística la encuentran."), cost: FREE },
    open: { what: L("4,873 real headline A/B tests from the Upworthy Research Archive (CC BY 4.0), and the Project Gutenberg catalog (CC0 metadata).", "4.873 pruebas A/B reales de titulares del Upworthy Research Archive (CC BY 4.0) y el catálogo de Project Gutenberg (metadatos CC0)."),
      where: "src/ebook_ab/realdata/, notebooks/12_real_headlines.py", why: L("It checks the method on experiments that really happened, and keeps the tools' expectations realistic.", "Prueba el método con experimentos que de verdad pasaron y mantiene realistas las expectativas de las herramientas."), cost: FREE },
    kafka: { what: L("Keeps every event of the simulated store in order, keyed by shopper: market.storefront, orders, aftersales, experiments and ops. Two groups read it on their own: lakehouse-bridge (to files) and guardrail-monitor (hourly alerts on fraud, refunds and latency).", "Guarda en orden cada evento de la tienda simulada, con clave por comprador: market.storefront, orders, aftersales, experiments y ops. Lo leen dos grupos por su cuenta: lakehouse-bridge (a archivos) y guardrail-monitor (alertas por hora de fraude, reembolsos y latencia)."),
      where: "config/topics.yml, contracts/*.schema.json, docker/compose.yml", why: L("Real use: order per shopper, two independent readers, and a restart that loses and repeats nothing. Duel votes skip it: they are few and arrive once a day.", "Uso real: orden por comprador, dos lectores independientes y un reinicio que no pierde ni repite nada. Los votos del duelo no pasan por aquí: son pocos y llegan una vez al día."), cost: FREE },
    dock: { what: L("The lakehouse-bridge reads Kafka and writes files named topic/epoch/partition/offsets into a Unity Catalog volume, and commits only after the file is safe. Duel votes, shared results and open data land as files in landing_real/.", "El lakehouse-bridge lee Kafka y escribe archivos con nombre topic/epoch/partición/offsets en un volumen de Unity Catalog, y confirma solo cuando el archivo está a salvo. Los votos del duelo, los resultados compartidos y los datos abiertos llegan como archivos a landing_real/."),
      where: "src/ebook_ab/bridge/, resources/uc_schemas_volume.yml", why: L("Databricks Free Edition can't reach Kafka's ports. At-least-once delivery plus file names that never repeat gives zero duplicates in Bronze.", "Databricks Free Edition no llega a los puertos de Kafka. Entrega al menos una vez y nombres de archivo que no se repiten: cero duplicados en Bronze."), cost: FREE },
    bronze: { what: L("The raw events exactly as they arrived, with their Kafka coordinates: Auto Loader streaming tables, no parsing. Reset is disabled.", "Los eventos crudos tal como llegaron, con sus coordenadas de Kafka: tablas de streaming con Auto Loader, sin parseo. El reinicio está desactivado."),
      where: "pipelines/ebook/bronze.py, bronze_files.py", why: L("Silver and Gold can always be rebuilt from Bronze.", "Silver y Gold siempre se pueden reconstruir desde Bronze."), cost: L("$0 (serverless, daily quota)", "$0 (serverless, cuota diaria)") },
    silver: { what: L("Typed events without duplicates; bad records go to quarantine with a reason. Duel votes: double votes and bots out, and a fair-split check (SRM) per Duel. Personal data is hashed and masked.", "Eventos tipados y sin duplicados; los registros malos van a cuarentena con su motivo. Votos del duelo: fuera votos dobles y bots, y una revisión de reparto justo (SRM) por duelo. Los datos personales van con hash y máscara."),
      where: "pipelines/ebook/silver_*.py, silver_users_scd2.py", why: L("Quality is enforced in the pipeline, not trusted from the source.", "La calidad se exige en el pipeline; no se confía en la fuente."), cost: FREE },
    gold: { what: L("20 materialized views from YAML: funnels, exposures, conversion by version, guardrails and revenue, plus Duel results and the Duel library. Each view names who uses it.", "20 vistas materializadas desde YAML: embudos, exposiciones, conversión por versión, límites de seguridad e ingresos, más resultados de duelos y la biblioteca de duelos. Cada vista dice quién la usa."),
      where: "config/gold_views.yml, pipelines/ebook/gold_factory.py", why: L("A new metric is a YAML entry, not new code.", "Una métrica nueva es una entrada de YAML, no código nuevo."), cost: FREE },
    stats: { what: L("Checks validity first (SRM, A/A, invariants), then runs the tests written before the test: z-test, Welch, bootstrap, CUPED, Holm/BH. Validation compares each decision with the planted truth. The library summary needs 5 results per group.", "Revisa primero la validez (SRM, A/A, invariantes) y después corre las pruebas escritas de antemano: prueba z, Welch, bootstrap, CUPED, Holm/BH. La validación compara cada decisión con la verdad plantada. El resumen de la biblioteca pide 5 resultados por grupo."),
      where: "src/ebook_ab/stats/, notebooks/10_ab_analysis.py, 11_validation.py, 13_community_summary.py", why: L("A referee who sets the rules before the game: nobody moves the goalposts after seeing the score.", "Un árbitro que fija las reglas antes del partido: nadie mueve el arco después de ver el marcador."), cost: FREE },
    pages: { what: L("site_export turns small Gold summaries into JSON files, each checked against its schema. GitHub Pages serves the static React site in Spanish and English.", "site_export convierte resúmenes pequeños de Gold en archivos JSON, cada uno revisado contra su esquema. GitHub Pages sirve el sitio estático en React, en español e inglés."),
      where: "src/ebook_ab/site_export/, web/, .github/workflows/pages.yml", why: L("The site never holds a Databricks token, and there is nothing to keep running.", "El sitio nunca guarda un token de Databricks y no hay nada que mantener encendido."), cost: FREE },
    library: { what: L("Duel results pooled by genre, book language and what changed. A group shows numbers only after 5 results, and simulated data is never mixed in.", "Resultados de duelos agrupados por género, idioma del libro y qué cambió. Un grupo muestra números solo con 5 resultados, y nunca se mezclan datos simulados."),
      where: "web/public/data/library.json", why: L("Every Duel helps the next writer, even one who can't run a test.", "Cada duelo ayuda a la próxima autora, aunque no pueda hacer su propia prueba."), cost: FREE },
    store: { what: L("The simulated store's three decisions in plain words (wallet-first checkout: keep; new cover + subtitle: don't keep; bundle banner: keep), plus the checks on the checks.", "Las tres decisiones de la tienda simulada en palabras simples (pago con billetera primero: se queda; portada y subtítulo nuevos: no; banner de paquete: se queda), más las pruebas de las pruebas."),
      where: "web/src/pages/test-store, docs/memos/", why: L("It shows the whole method on data with a known answer. It is not advice for any book.", "Muestra todo el método con datos de respuesta conocida. No es un consejo para ningún libro."), cost: FREE },
    lessons: { what: L("Three lessons from 4,873 real headline tests: most changes are small, clear winners are rare, and early winners shrink.", "Tres lecciones de 4.873 pruebas reales de titulares: casi todos los cambios son pequeños, los ganadores claros son raros y los primeros ganadores se encogen."),
      where: "notebooks/12_real_headlines.py, web/src/pages/lessons", why: L("They are news headlines, not books, so they set expectations, not promises.", "Son titulares de noticias, no libros: fijan expectativas, no promesas."), cost: FREE },
  };
  const ZONES = {
    live: { t: L("LIVE · IN SECONDS", "EN VIVO · EN SEGUNDOS") },
    browser: { t: L("YOUR BROWSER · NOTHING LEAVES", "TU NAVEGADOR · NADA SALE"), lock: true },
    daily: { t: L("EVERY DAY · 06:00 BOGOTÁ · NO LAPTOP", "CADA DÍA · 06:00 BOGOTÁ · SIN LAPTOP") },
    sources: { t: L("SOURCES", "FUENTES"), a: L("the letters", "las cartas") },
    dbx: { t: L("DATABRICKS FREE EDITION", "DATABRICKS FREE EDITION"), ts: L("DATABRICKS", "DATABRICKS"), a: L("the sorting rooms", "las salas de clasificación") },
    site: { t: L("PUBLIC SITE", "SITIO PÚBLICO") },
  };
  // What the 06:00 run starts, in order (.github/workflows/daily-e2e.yml).
  const STEPS = [
    L("start Kafka", "arrancar Kafka"), L("simulate a day", "simular un día"), L("bridge", "puente"), L("export votes", "exportar votos"),
    L("Databricks job", "job Databricks"), L("JSON", "JSON"), L("publish", "publicar"),
  ];
  // Small machine notes where a lane crosses a room (wide map only).
  const TAGS = [
    ["kafka", "sim", L("market.*.v1", "market.*.v1")],
    ["silver", "real", L("double votes · bots · SRM", "votos dobles · bots · SRM")], ["silver", "sim", L("PII masked", "PII oculta")],
    ["gold", "real", L("+2 views", "+2 vistas")], ["gold", "sim", L("18 views", "18 vistas")],
    ["stats", "real", L("5+ per group", "5+ por grupo")], ["stats", "sim", L("vs. the planted truth", "vs. la verdad plantada")],
    ["stats", "public", L("random effects", "efectos aleatorios")], ["dock", "public", L("landing_real", "landing_real")],
  ];

  /* ---------- Five guided stories: each step lights one box and says what happens there ---------- */
  const STORIES = [
    { k: "vote", kind: "real", t: L("A reader's vote", "Un voto de una lectora"), steps: [
      ["reader", L("A reader opens the Duel link. A coin flip (a hash of the Duel and the visitor) shows cover A or B, never both.", "Una lectora abre el enlace del duelo. Una moneda al aire (un hash del duelo y de la visitante) le muestra la portada A o la B, nunca las dos.")],
      ["reader", L("One tap: “Yes, I'd read it.” The vote travels to the mailbox.", "Un toque: «Sí, la leería». El voto viaja al buzón.")],
      ["mailbox", L("A free Cloudflare Worker keeps counts in D1: no cookies, no names, and the IP is never kept longer than a day.", "Un Worker gratis de Cloudflare guarda conteos en D1: sin cookies, sin nombres, y la IP nunca se guarda más de un día.")],
      ["writer", L("The writer sees progress, not the winner. The result opens at 330 readers: no peeking.", "La autora ve el progreso, no al ganador. El resultado se abre a los 330 lectores: sin espiar.")],
      ["votes", L("06:00 in Bogotá: the mail truck leaves. GitHub Actions copies yesterday's new votes out of D1 into one file.", "06:00 en Bogotá: sale el camión del correo. GitHub Actions copia de D1 los votos nuevos de ayer en un archivo.")],
      ["dock", L("The file lands in the landing volume. No Kafka here: a few votes a day fit in one file, and Auto Loader reads each file exactly once.", "El archivo llega al volumen de llegada. Aquí no hace falta Kafka: pocos votos al día caben en un archivo, y Auto Loader lee cada archivo una sola vez.")],
      ["bronze", L("Bronze keeps the original letters, untouched.", "Bronze guarda las cartas originales, sin tocar.")],
      ["silver", L("Silver checks them: double votes and bots out, and a fair-split check (SRM) on every Duel.", "Silver las revisa: fuera votos dobles y bots, y una revisión de reparto justo (SRM) en cada duelo.")],
      ["gold", L("Gold sums them up: each Duel's result and the Duel library (2 new views).", "Gold las resume: el resultado de cada duelo y la biblioteca de duelos (2 vistas nuevas).")],
      ["stats", L("Statistics names a winner only when it's not luck, and pools results by genre, language and change. A group shows numbers only after 5 results.", "La estadística nombra ganador solo cuando no es suerte, y agrupa por género, idioma y cambio. Un grupo muestra números solo con 5 resultados.")],
      ["library", L("site_export writes library.json and GitHub Pages publishes it. The next writer sees what worked.", "site_export escribe library.json y GitHub Pages lo publica. La próxima autora ve qué funcionó.")],
    ] },
    { k: "shopper", kind: "sim", t: L("A simulated shopper", "Un comprador simulado"), steps: [
      ["sim", L("A program plays 70,000 fictional shoppers in a store with real public-domain books.", "Un programa juega a ser 70.000 compradores ficticios en una tienda con libros reales de dominio público.")],
      ["sim", L("Each shopper gets version A or B from a hash of their ID: the same shopper always sees the same version.", "Cada comprador recibe la versión A o B según un hash de su ID: el mismo comprador siempre ve la misma.")],
      ["kafka", L("Every click becomes an event in Kafka: storefront, orders, aftersales and experiments.", "Cada clic se vuelve un evento en Kafka: storefront, orders, aftersales y experiments.")],
      ["bronze", L("The bridge lands the files, and Bronze keeps them as they came.", "El puente deja los archivos y Bronze los guarda tal como llegaron.")],
      ["silver", L("Silver types and cleans them, hides personal data and sends bad records to quarantine.", "Silver los tipa y limpia, oculta los datos personales y manda a cuarentena los registros malos.")],
      ["gold", L("Gold builds 18 views: funnels, exposures, conversion by version, guardrails and revenue.", "Gold arma 18 vistas: embudos, exposiciones, conversión por versión, límites de seguridad e ingresos.")],
      ["stats", L("Statistics checks the split first (SRM, A/A), then tests. Validation compares each decision with the effect we planted: the answer key.", "La estadística revisa primero el reparto (SRM, A/A) y después prueba. La validación compara cada decisión con el efecto que plantamos: la hoja de respuestas.")],
      ["store", L("The Test store page shows the three decisions in plain words. Simulated data never enters the library.", "La página Tienda de prueba muestra las tres decisiones en palabras simples. Los datos simulados nunca entran a la biblioteca.")],
    ] },
    { k: "open", kind: "public", t: L("Real headline tests", "Pruebas reales de titulares"), steps: [
      ["open", L("Real public data: 4,873 headline A/B tests from Upworthy (CC BY 4.0) and the Project Gutenberg catalog (CC0).", "Datos públicos reales: 4.873 pruebas A/B de titulares de Upworthy (CC BY 4.0) y el catálogo de Project Gutenberg (CC0).")],
      ["dock", L("They come in as files through the Files API, without Kafka.", "Entran como archivos por la Files API, sin pasar por Kafka.")],
      ["silver", L("Bronze keeps them as they are; Silver types them and flags the known problems.", "Bronze los guarda tal cual; Silver los tipa y marca los problemas conocidos.")],
      ["stats", L("A random-effects model learns how big real changes usually are.", "Un modelo de efectos aleatorios aprende qué tan grandes suelen ser los cambios reales.")],
      ["lessons", L("Real lessons: most changes are small, clear winners are rare, and early winners shrink. The same numbers keep the tools' expectations realistic.", "Lecciones reales: casi todos los cambios son pequeños, los ganadores claros son raros y los primeros ganadores se encogen. Esos números mantienen realistas las expectativas de las herramientas.")],
    ] },
    { k: "daily", kind: "ctrl", t: L("The 06:00 run", "La corrida de las 06:00"), steps: [
      ["daily", L("Every day at 06:00 in Bogotá (11:00 UTC), a free GitHub machine wakes up. No laptop needed.", "Cada día a las 06:00 en Bogotá (11:00 UTC) se despierta una máquina gratis de GitHub. No hace falta laptop.")],
      ["kafka", L("1 · It starts a fresh Kafka and creates the topics.", "1 · Arranca un Kafka nuevo y crea los topics.")],
      ["sim", L("2 · The simulator plays one day of shopping: about 2,000 shoppers.", "2 · El simulador juega un día de compras: unos 2.000 compradores.")],
      ["dock", L("3 · The bridge drains Kafka into files.", "3 · El puente vacía Kafka en archivos.")],
      ["votes", L("4 · New Duel votes and shared results are exported from D1 into files.", "4 · Se exportan de D1 los votos nuevos y los resultados compartidos, en archivos.")],
      ["gold", L("5 · It starts the Databricks job and waits: the pipeline, then governance, then analysis, data quality and the library side by side.", "5 · Arranca el job de Databricks y espera: el pipeline, luego gobierno, y después análisis, calidad y biblioteca a la vez.")],
      ["stats", L("6 · site_export turns small Gold summaries into JSON files, each checked against its schema.", "6 · site_export convierte resúmenes pequeños de Gold en archivos JSON, cada uno revisado contra su esquema.")],
      ["pages", L("7 · It builds and publishes the site. Time limit: 30 minutes.", "7 · Construye y publica el sitio. Tiempo máximo: 30 minutos.")],
    ] },
    { k: "doctor", kind: "browser", t: L("An Ad Doctor report", "Un informe del Doctor"), steps: [
      ["doctor", L("A writer drops an Amazon Ads report (CSV). The file is read inside the browser.", "Una autora suelta su informe de Amazon Ads (CSV). El archivo se lee dentro del navegador.")],
      ["doctor", L("Each keyword is compared with the book's own average (a beta-binomial model): Stop, Keep, Luck or Wait.", "Cada palabra clave se compara con el promedio del propio libro (un modelo beta-binomial): Parar, Mantener, Suerte o Esperar.")],
      ["luck", L("Real or luck? works the same way: two sales counts, an exact test, an honest answer. 0 bytes leave the browser.", "¿Real o suerte? funciona igual: dos conteos de ventas, una prueba exacta, una respuesta honesta. 0 bytes salen del navegador.")],
    ] },
  ];

  /* ---------- The technologies we count on today (plan v2.3 + the lifesaver answer); versions are checked per phase ---------- */
  const TOOLS = [
    { layer: L("Languages", "Lenguajes"), name: "Python (uv) · TypeScript", role: L("all the code", "todo el código"), nodes: ["sim", "dock", "stats", "mailbox", "writer"] },
    { layer: L("Events", "Eventos"), name: "Apache Kafka (KRaft) · confluent-kafka", role: L("the post office for the simulated store's events; Duel votes go as files", "la oficina de correos de la tienda simulada; los votos del Duelo van en archivos"), nodes: ["kafka", "sim"] },
    { layer: L("Cloud Kafka (optional)", "Kafka en la nube (opcional)"), name: L("Aiven, free plan", "Aiven, plan gratis"), role: L("only if the Phase 0 probes allow it; the daily run brings its own Kafka", "solo si las pruebas de la Fase 0 lo permiten; la corrida diaria trae su propio Kafka"), nodes: ["kafka"] },
    { layer: L("Contracts", "Contratos"), name: "JSON Schema", role: L("the shape of every event, checked in tests and in Silver", "la forma de cada evento, revisada en pruebas y en Silver"), nodes: ["kafka", "silver"] },
    { layer: L("Simulator", "Simulador"), name: "Python · Faker (es_CO)", role: L("70,000 fictional shoppers on a real catalog", "70.000 compradores ficticios con catálogo real"), nodes: ["sim"] },
    { layer: L("Lakehouse", "Lakehouse"), name: "Databricks Free Edition: Lakeflow Declarative Pipelines, Auto Loader, Unity Catalog, Delta Lake", role: L("Bronze, Silver and Gold", "Bronze, Silver y Gold"), nodes: ["dock", "bronze", "silver", "gold"] },
    { layer: L("Jobs and deploys", "Jobs y despliegue"), name: "Lakeflow Jobs · Asset Bundles · Databricks CLI/SDK", role: L("the daily job, all from Git", "el job diario, todo desde Git"), nodes: ["bronze", "silver", "gold", "stats"] },
    { layer: L("Statistics", "Estadística"), name: "scipy · statsmodels · ebook_ab.stats", role: L("SRM, z-test, Welch, bootstrap, CUPED, Holm/BH", "SRM, prueba z, Welch, bootstrap, CUPED, Holm/BH"), nodes: ["stats"] },
    { layer: L("Edge", "Borde"), name: L("Cloudflare Workers + D1 (free plan)", "Cloudflare Workers + D1 (plan gratis)"), role: L("Duel votes and shared results", "votos del Duelo y resultados compartidos"), nodes: ["mailbox", "writer", "votes"] },
    { layer: L("Site", "Sitio"), name: "React · Vite · TypeScript · ECharts · i18next · Vitest", role: L("the public site, Spanish and English", "el sitio público, en español e inglés"), nodes: ["writer", "pages", "library", "store", "lessons"] },
    { layer: L("CI/CD and the daily run", "CI/CD y corrida diaria"), name: "GitHub Actions · GitHub Pages", role: L("tests, deploys and the 06:00 run", "pruebas, despliegues y la corrida de las 06:00"), nodes: ["daily", "pages"] },
    { layer: L("Local compute", "Cómputo local"), name: L("Docker: Spark cluster + Delta", "Docker: clúster Spark + Delta"), lab: true, role: L("practice: a job cluster on the laptop and the Spark UI performance lab (Free Edition has no Spark UI)", "práctica: un job cluster en la laptop y el laboratorio de rendimiento con Spark UI (Free Edition no tiene Spark UI)"), nodes: ["bronze", "silver", "gold"] },
    { layer: L("Real data", "Datos reales"), name: "Project Gutenberg (CC0) · Upworthy Research Archive (CC BY 4.0)", role: L("a real catalog and real headline tests", "un catálogo real y pruebas reales de titulares"), nodes: ["open", "sim"] },
    { layer: L("In the browser", "En el navegador"), name: L("Plain JavaScript", "JavaScript sin dependencias"), role: L("Ad Doctor and Real or luck?", "Doctor de anuncios y ¿Real o suerte?"), nodes: ["doctor", "luck"] },
    { layer: L("Cost", "Costo"), name: "$0", role: L("no cards, no trials, no expiring credits", "sin tarjetas, sin pruebas que vencen, sin créditos que caducan"), nodes: [] },
  ];

  /* ---------- Illustrated icons: 64 × 64, soft gradients and a shadow on the ground ---------- */
  const GRAD = {
    slate: ["#64707f", "#363d4a"], screen: ["#ffffff", "#e8ecf2"], blue: ["#80b4ff", "#3a6fd8"], deep: ["#4f7fe0", "#244ea8"],
    violet: ["#c3a2f7", "#7a4fd0"], teal: ["#74e0d0", "#1b9787"], orange: ["#ffbb7a", "#ef6a17"], red: ["#ff978c", "#d63f2e"],
    yellow: ["#ffe795", "#f2b01f"], green: ["#8ae6ab", "#22a157"], bronze: ["#edb37d", "#a65e28"], silver: ["#f6f8fa", "#a4aebb"],
    gold: ["#ffe98f", "#d59c10"], wood: ["#e3b789", "#a86f3d"], paper: ["#fffdf8", "#eee6d4"], sky: ["#dff2ff", "#a6d6ff"],
  };
  // A gear outline: n flat-topped teeth between the root radius r1 and the tip radius r2.
  function gearPath(cx, cy, r1, r2, n) {
    let d = "";
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r1 : r2, a0 = (i / (n * 2)) * Math.PI * 2 + 0.07, a1 = ((i + 1) / (n * 2)) * Math.PI * 2 - 0.07;
      d += `${i ? "L" : "M"}${fix(cx + r * Math.cos(a0))} ${fix(cy + r * Math.sin(a0))}L${fix(cx + r * Math.cos(a1))} ${fix(cy + r * Math.sin(a1))}`;
    }
    return d + "Z";
  }
  const pip = (x, y, c, r = 2.3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const envelope = (g, x, y, stamp = "orange") => `<g transform="translate(${x} ${y})"><rect width="34" height="22" rx="2.4" fill="${g("paper")}" stroke="#d6ccb4" stroke-width="1"/><path d="M1.4 1.6l15.6 11 15.6-11" fill="none" stroke="#d6ccb4" stroke-width="1.2"/><rect x="25.6" y="3.4" width="5.4" height="6.2" rx=".6" fill="${g(stamp)}"/></g>`;
  const twoLetters = (g) => `<rect x="17" y="11" width="16" height="14" rx="1.2" fill="${g("paper")}" stroke="#d6ccb4" stroke-width=".8" transform="rotate(-8 25 18)"/><rect x="29" y="9.6" width="16" height="15" rx="1.2" fill="${g("paper")}" stroke="#d6ccb4" stroke-width=".8" transform="rotate(7 37 17)"/>`;
  // An inbox tray in a metal color: what lies inside, then the front, a shine and a label plate.
  const tray = (g, metal, back, inside, over = "") => `<ellipse class="sh" cx="32" cy="58.6" rx="26" ry="2.4"/><path d="M10 31l6-10.6h32L54 31z" fill="${back}"/>${inside}` +
    `<path d="M7 31h50v15.6a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4z" fill="${g(metal)}"/><rect class="nx-shine" x="11.4" y="33.6" width="4.6" height="12.4" rx="2.3" fill="#fff" opacity=".45"/>` +
    `<rect x="23.6" y="36.4" width="16.8" height="6.4" rx="1.6" fill="#fff" opacity=".5"/>${over}`;
  const ART = {
    phone: (g) => `<ellipse class="sh" cx="32" cy="60.6" rx="14" ry="2.4"/><rect x="17" y="3" width="30" height="56" rx="7" fill="${g("slate")}"/>` +
      `<rect x="19.6" y="8" width="24.8" height="45.4" rx="3.6" fill="${g("screen")}"/><rect x="28" y="4.9" width="8" height="1.6" rx=".8" fill="#252a33"/>` +
      `<g class="nx-ca"><rect x="24.6" y="12" width="14.8" height="21" rx="1.6" fill="${g("blue")}"/><path d="M24.6 28.6l4.6-3.6 3.6 2.6 6.6-5.2V33H24.6z" fill="#2a58b4" opacity=".6"/><circle cx="35.2" cy="16.4" r="2" fill="#fff4c9"/></g>` +
      `<g class="nx-cb"><rect x="24.6" y="12" width="14.8" height="21" rx="1.6" fill="${g("violet")}"/><circle cx="29.6" cy="25" r="2.1" fill="#2c1850"/><circle cx="34.4" cy="24.6" r="2.1" fill="#2c1850"/><rect x="26.4" y="15.2" width="11.2" height="1.8" rx=".9" fill="#fff" opacity=".85"/></g>` +
      `<rect x="23.6" y="36.6" width="16.8" height="5.6" rx="2.8" fill="${g("green")}"/><rect x="23.6" y="44.2" width="16.8" height="4.6" rx="2.3" fill="#dce1e9"/>` +
      `<circle class="nx-tap" cx="39.4" cy="39.4" r="3.4" fill="none" stroke="#ef6a17" stroke-width="1.6"/>`,
    mailbox: (g) => `<ellipse class="sh" cx="31" cy="60.6" rx="24" ry="2.4"/><rect x="15" y="34" width="6" height="25" rx="1.2" fill="${g("wood")}"/>` +
      `<path d="M4 23a10 10 0 0 1 10-10h18a10 10 0 0 1 10 10v13H4z" fill="${g("blue")}"/><path d="M4 23a10 10 0 0 1 20 0v13H4z" fill="${g("deep")}"/>` +
      `<rect x="8" y="22.4" width="12" height="2.4" rx="1.2" fill="#173a86"/>` +
      `<g class="nx-drop"><rect x="9" y="10" width="10" height="7.4" rx="1" fill="${g("paper")}" stroke="#d6ccb4" stroke-width=".8"/><rect x="15.6" y="11.2" width="2.4" height="2.8" fill="#ef6a17"/></g>` +
      `<g class="nx-flag"><rect x="42" y="14" width="2" height="17" rx="1" fill="#7a3328"/><path d="M44 14h8.6v6.4H44z" fill="${g("red")}"/></g>` +
      `<path d="M42 41.6v12.8a10 3.6 0 0 0 20 0V41.6" fill="${g("teal")}"/><ellipse cx="52" cy="41.6" rx="10" ry="3.6" fill="#86e8da"/>` +
      `<path d="M42 48a10 3.6 0 0 0 20 0" fill="none" stroke="#137366" stroke-width="1" opacity=".55"/>`,
    laptop: (g) => `<ellipse class="sh" cx="32" cy="58.6" rx="24" ry="2.4"/><rect x="11" y="10" width="42" height="31" rx="3" fill="${g("slate")}"/>` +
      `<rect x="14" y="13" width="36" height="25" rx="1.6" fill="${g("screen")}"/>` +
      `<g transform="translate(32 21)"><path d="M-7 0q7-6.4 14 0q-7 6.4-14 0z" fill="#fff" stroke="#6a6963" stroke-width="1.4"/><circle r="2.1" fill="#6a6963"/><path d="M-6.6-5l13.2 10" stroke="#d63f2e" stroke-width="1.8" stroke-linecap="round"/></g>` +
      `<rect x="18" y="30" width="28" height="4.2" rx="2.1" fill="#e2dfd8"/><rect class="nx-grow" x="18" y="30" width="12.4" height="4.2" rx="2.1" fill="${g("orange")}"/>` +
      `<path d="M5 43h54l-3.2 6.4a2 2 0 0 1-1.8 1.1H10a2 2 0 0 1-1.8-1.1z" fill="${g("silver")}"/><rect x="27.6" y="43" width="8.8" height="1.8" rx=".9" fill="#8c96a3"/>`,
    doctor: (g) => `<ellipse class="sh" cx="31" cy="60.4" rx="22" ry="2.4"/><rect x="9" y="8" width="33" height="47" rx="3.6" fill="${g("paper")}" stroke="#d5ccb7" stroke-width="1"/>` +
      `<rect x="18.5" y="5" width="14" height="6.4" rx="2" fill="${g("slate")}"/><path d="M14 18h23M14 23h23" stroke="#cdc4af" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path class="nx-pulse" d="M13.4 37h6l3-8.4 4.2 15.4 3.2-11.2 2 4.2h6" fill="none" stroke="#e0392c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M47 12c9 1.4 11 13.4 6 21.4-3 4.8-8.6 6.2-12.2 4.6" fill="none" stroke="#3a6fd8" stroke-width="3" stroke-linecap="round"/><circle cx="46.4" cy="11.6" r="2.2" fill="#2d3340"/>` +
      `<circle cx="38.6" cy="44" r="6.4" fill="${g("silver")}" stroke="#7c8693" stroke-width="1.4"/><circle cx="38.6" cy="44" r="2.6" fill="#9aa4b1"/>`,
    dice: (g) => `<ellipse class="sh" cx="32" cy="60" rx="22" ry="2.4"/>` +
      `<g class="nx-roll"><g transform="rotate(-14 22 34)"><rect x="9" y="21" width="26" height="26" rx="6" fill="${g("orange")}"/>${pip(15.6, 27.6, "#fff")}${pip(28.4, 27.6, "#fff")}${pip(22, 34, "#fff")}${pip(15.6, 40.4, "#fff")}${pip(28.4, 40.4, "#fff")}</g></g>` +
      `<g transform="rotate(12 45 40)"><rect x="34" y="29" width="22" height="22" rx="5" fill="${g("screen")}" stroke="#d6d0c3" stroke-width="1"/>${pip(40, 35, "#3a3833", 2)}${pip(50, 45, "#3a3833", 2)}</g>`,
    clock: (g) => `<ellipse class="sh" cx="31" cy="60.6" rx="19" ry="2.4"/>` +
      `<g class="nx-sun"><circle cx="53" cy="16" r="7.4" fill="${g("yellow")}"/><path d="M53 6v-3M59.8 9.2l2-2M61.6 17h2" stroke="#f2b01f" stroke-width="1.8" stroke-linecap="round"/></g>` +
      `<circle cx="16" cy="14.6" r="7" fill="${g("red")}"/><circle cx="44" cy="14.6" r="7" fill="${g("red")}"/><rect x="27" y="10.4" width="6" height="4" rx="1" fill="#7a3328"/>` +
      `<path d="M17 51l-4 7M43 51l4 7" stroke="#7a3328" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="30" cy="35" r="19" fill="${g("red")}"/><circle cx="30" cy="35" r="14.6" fill="#fffdf7"/>` +
      `<path d="M30 22.4v2.6M30 45v2.6M17.4 35h2.6M40 35h2.6" stroke="#b9b2a4" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M30 35v8.4" stroke="#26251e" stroke-width="2.6" stroke-linecap="round"/><path class="nx-hand" d="M30 35V23.6" stroke="#26251e" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="30" cy="35" r="1.8" fill="#d63f2e"/>`,
    letters: (g) => `<ellipse class="sh" cx="32" cy="60.4" rx="22" ry="2.4"/><g class="nx-bob">${envelope(g, 22, 7)}</g>${envelope(g, 15, 18)}${envelope(g, 8, 30)}`,
    shoppers: (g) => `<ellipse class="sh" cx="30" cy="60.6" rx="24" ry="2.4"/>` +
      `<g class="nx-spin"><path d="${gearPath(47, 16, 7.4, 10.6, 8)}" fill="${g("violet")}"/><circle cx="47" cy="16" r="3.2" fill="#f6f2ff"/></g>` +
      `<g class="nx-hop b2"><circle cx="41" cy="35" r="5" fill="#c99a7a"/><path d="M33 58v-8.4a8 8 0 0 1 16 0V58z" fill="#a98ee8"/></g>` +
      `<g class="nx-hop"><circle cx="20" cy="29" r="6.2" fill="#f0c3a0"/><path d="M19.6 22.6c-4.6 0-6.8 3-6.4 6.6 2-2.4 5.6-3.4 9.4-2.8 2.6.4 3.8 1.6 3.8 1.6.2-3.4-2.6-5.4-6.8-5.4z" fill="#4a3426"/>` +
      `<path d="M9 58V47a11 11 0 0 1 22 0v11z" fill="${g("violet")}"/><rect x="27" y="45" width="10" height="11" rx="1.8" fill="${g("orange")}"/><path d="M29.4 45a2.6 2.6 0 0 1 5.2 0" fill="none" stroke="#a5440f" stroke-width="1.3"/></g>`,
    opendata: (g) => `<ellipse class="sh" cx="32" cy="60.6" rx="26" ry="2.4"/>` +
      `<rect x="5" y="47" width="30" height="8.4" rx="1.6" fill="#7b4f33"/><rect x="8" y="38.6" width="27" height="8.4" rx="1.6" fill="#2f6f5e"/><rect x="4" y="30.2" width="29" height="8.4" rx="1.6" fill="#b4452f"/>` +
      `<path d="M7 34.4h23M11 42.8h21M8 51.2h24" stroke="#fff" stroke-width=".9" opacity=".45"/>` +
      `<path d="M42 8h11M44.4 8v12.6l-8.8 20.8a4 4 0 0 0 3.7 5.6h18.4a4 4 0 0 0 3.7-5.6L52.6 20.6V8" fill="${g("screen")}" stroke="#58666f" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M38.2 35.6h21.6l3.2 6.8a3.6 3.6 0 0 1-3.3 5H38.3a3.6 3.6 0 0 1-3.3-5z" fill="${g("green")}"/>` +
      `<circle class="nx-bub" cx="46" cy="40" r="1.7" fill="#fff"/><circle class="nx-bub b2" cx="52" cy="42.6" r="1.2" fill="#fff"/><circle class="nx-bub b3" cx="49" cy="37.4" r="1" fill="#fff"/>`,
    pigeonholes: (g) => {
      // Six pigeonholes, one per topic, and a belt that brings the next letter.
      const mail = { "0,0": "orange", "1,0": "violet", "0,1": "violet", "2,1": "orange" };
      let slots = "";
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = fix(10.6 + c * 15), y = fix(9.6 + r * 17);
        slots += `<rect x="${x}" y="${y}" width="12.6" height="14" rx="1.4" fill="#5b3b21"/>`;
        const s = mail[`${c},${r}`];
        if (s) slots += `<g class="nx-slot s${c + r * 3}"><rect x="${fix(x + 1.6)}" y="${fix(y + 5)}" width="9.4" height="7" rx=".8" fill="${g("paper")}"/><rect x="${fix(x + 7.4)}" y="${fix(y + 5.8)}" width="2.4" height="2.6" fill="${g(s)}"/></g>`;
      }
      return `<ellipse class="sh" cx="32" cy="61" rx="27" ry="2.2"/><rect x="7" y="6" width="50" height="38" rx="3" fill="${g("wood")}"/>${slots}` +
        `<rect x="3" y="51.6" width="58" height="6" rx="3" fill="#5a616c"/>${[9, 20.5, 32, 43.5, 55].map((x) => `<circle cx="${x}" cy="54.6" r="1.5" fill="#a3abb5"/>`).join("")}` +
        `<g class="nx-belt"><rect x="8" y="45" width="10" height="6.6" rx="1" fill="${g("paper")}" stroke="#d6ccb4" stroke-width=".7"/><rect x="14.4" y="45.8" width="2.4" height="2.4" fill="${g("orange")}"/></g>`;
    },
    dock: (g) => `<ellipse class="sh" cx="34" cy="61.2" rx="27" ry="2"/>` +
      `<path d="M2 57.6q4-2.6 8 0t8 0 8 0 8 0" fill="none" stroke="#7fc0e6" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M4 46q16-15 32 0" fill="none" stroke="${g("wood")}" stroke-width="5" stroke-linecap="round"/><path d="M10 41.4v9M20 36.6v13.8M30 41.4v9" stroke="#a86f3d" stroke-width="2"/>` +
      `<g class="nx-cross"><rect x="14" y="24" width="12" height="10.4" rx="1.2" fill="${g("wood")}" stroke="#8a5a2f" stroke-width=".8"/><path d="M14 29.2h12M20 24v10.4" stroke="#8a5a2f" stroke-width=".8"/></g>` +
      `<path d="M38 27l12.4-8.4L62.8 27v28.4H38z" fill="${g("teal")}"/><rect x="44.2" y="36" width="12.4" height="19.4" rx="1" fill="#13665c"/>` +
      `<path d="M44.2 40h12.4M44.2 44h12.4M44.2 48h12.4M44.2 52h12.4" stroke="#2bb3a3" stroke-width=".9"/>`,
    bronze: (g) => tray(g, "bronze", "#7d4519", twoLetters(g)),
    silver: (g) => tray(g, "silver", "#7f8996", twoLetters(g),
      `<g class="nx-sweep"><circle cx="45" cy="19" r="7.4" fill="#e6f4ff" fill-opacity=".6" stroke="#3b4454" stroke-width="2.6"/><path d="M50.4 24.6l7 7" stroke="#3b4454" stroke-width="3.6" stroke-linecap="round"/></g>`),
    gold: (g) => tray(g, "gold", "#9b6f08", `<rect x="19" y="6.6" width="26" height="19" rx="1.8" fill="#fff" stroke="#e3d6a6" stroke-width="1"/>` +
      `<g class="nx-bars"><rect x="23" y="16.4" width="3.4" height="6" fill="#ef6a17"/><rect x="28.6" y="12.2" width="3.4" height="10.2" fill="#3a6fd8"/><rect x="34.2" y="14.4" width="3.4" height="8" fill="#22a157"/></g>`),
    scale: (g) => `<ellipse class="sh" cx="32" cy="60.4" rx="18" ry="2.4"/><path d="M21 57.4h22l-3.2-5.6H24.2z" fill="${g("slate")}"/>` +
      `<rect x="30.4" y="15" width="3.2" height="37" rx="1.6" fill="${g("silver")}" stroke="#8c96a3" stroke-width=".6"/>` +
      `<g class="nx-tilt"><rect x="8" y="13.6" width="48" height="3" rx="1.5" fill="#495161"/><path d="M12 15.6l-5 15M12 15.6l5 15M52 15.6l-5 15M52 15.6l5 15" stroke="#8c96a3" stroke-width="1"/>` +
      `<path d="M3.4 30.6h17.2a8.6 4.8 0 0 1-17.2 0z" fill="${g("blue")}"/><path d="M43.4 30.6h17.2a8.6 4.8 0 0 1-17.2 0z" fill="${g("violet")}"/></g>` +
      `<circle cx="32" cy="13.6" r="3.6" fill="${g("gold")}"/>`,
    json: (g) => `<path d="M12 5h26l12 12v40a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z" fill="${g("paper")}" stroke="#d5ccb7" stroke-width="1.2"/>` +
      `<path d="M38 5v12h12" fill="#ece3cf" stroke="#d5ccb7" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<text x="31" y="44" text-anchor="middle" font-family="'Geist Mono', ui-monospace, monospace" font-size="17" font-weight="500" fill="#3a6fd8">{ }</text>`,
    shelf: (g) => {
      const books = [[12.4, 5, 16, "#ef6a17"], [18.2, 4.2, 13.6, "#3a6fd8"], [23.2, 6, 17, "#22a157"], [30, 4, 15, "#7a4fd0"], [34.8, 5, 16.4, "#d63f2e"]];
      const low = ["#22a157", "#f2b01f", "#3a6fd8", "#ef6a17", "#7a4fd0"];
      const row = (y0, list) => list.map(([x, w, h, c]) => `<rect x="${x}" y="${fix(y0 - h)}" width="${w}" height="${h}" rx=".8" fill="${c}"/>`).join("");
      return `<ellipse class="sh" cx="32" cy="60.6" rx="25" ry="2.4"/><rect x="6" y="7" width="52" height="49" rx="3" fill="${g("wood")}"/>` +
        `<rect x="10" y="11" width="44" height="41" rx="1.6" fill="#674529"/><rect x="10" y="30.4" width="44" height="3" fill="#a86f3d"/>` +
        row(30.4, books) + `<g class="nx-pop"><rect x="41.2" y="14.4" width="5" height="16" rx=".8" fill="#ef6a17"/></g>` +
        row(52, books.map(([x, w, h], i) => [fix(x + (i % 2 ? 1.4 : 0)), w, fix(h - 1.6), low[i]]));
    },
    shop: (g) => {
      // A striped awning: five bands, white on the odd ones, each with a scallop underneath.
      let awn = "";
      for (let i = 0; i < 5; i++) {
        const x0 = 6 + i * 10.4, b0 = fix(8.4 + i * 9.44), c = i % 2 ? "#fbf8ff" : g("violet");
        awn += `<path d="M${fix(x0)} 13H${fix(x0 + 10.4)}L${fix(b0 + 9.44)} 25H${b0}z" fill="${c}"/><path d="M${b0} 25a4.72 3.4 0 0 0 9.44 0z" fill="${c}"/>`;
      }
      return `<ellipse class="sh" cx="32" cy="60.6" rx="26" ry="2.4"/><rect x="9" y="24" width="46" height="34" rx="2" fill="${g("paper")}" stroke="#d6ccb4" stroke-width="1"/>${awn}` +
        `<rect x="14" y="37" width="12.4" height="21" rx="1" fill="#7a4fd0"/><circle cx="23.6" cy="47.6" r=".9" fill="#f6f2ff"/>` +
        `<rect x="31" y="34" width="20" height="13" rx="1.4" fill="${g("sky")}"/>` +
        `<g class="nx-spin slow"><path d="${gearPath(41, 40.5, 3, 4.6, 6)}" fill="#7a4fd0"/><circle cx="41" cy="40.5" r="1.4" fill="#e9f5ff"/></g>`;
    },
    browser: (g) => `<ellipse class="sh" cx="32" cy="60.6" rx="25" ry="2.4"/><rect x="5" y="9" width="54" height="45" rx="4" fill="${g("screen")}" stroke="#d3d0c8" stroke-width="1"/>` +
      `<path d="M5 13a4 4 0 0 1 4-4h46a4 4 0 0 1 4 4v5H5z" fill="${g("slate")}"/>` +
      `<circle cx="10.6" cy="13.6" r="1.6" fill="#ff6b5e"/><circle cx="15.8" cy="13.6" r="1.6" fill="#f2b01f"/><circle cx="21" cy="13.6" r="1.6" fill="#22a157"/><rect x="26" y="11.6" width="28" height="4" rx="2" fill="#4b5563"/>` +
      `<rect x="10.4" y="23.4" width="22" height="4" rx="1" fill="#2c2b25"/><path d="M10.4 32.4h19M10.4 36.8h15" stroke="#c4bdae" stroke-width="1.6" stroke-linecap="round"/>` +
      `<rect x="37" y="22.4" width="16" height="18" rx="1.6" fill="${g("blue")}"/><path d="M37 36l4.4-3.4 3.4 2.4 8.2-6.2v11.6H37z" fill="#2a58b4" opacity=".55"/>` +
      `<rect x="10.4" y="45" width="42.6" height="4.4" rx="2.2" fill="#e2dfd8"/><rect class="nx-load" x="10.4" y="45" width="26" height="4.4" rx="2.2" fill="${g("green")}"/>`,
    paper: (g) => `<ellipse class="sh" cx="32" cy="60.6" rx="24" ry="2.4"/><rect x="14" y="5" width="40" height="46" rx="2.4" fill="#ece5d3" stroke="#d6ccb4" stroke-width="1"/>` +
      `<rect x="9" y="10" width="40" height="46" rx="2.4" fill="${g("paper")}" stroke="#d6ccb4" stroke-width="1"/><rect x="14" y="15.6" width="30" height="5.4" rx="1" fill="#2c2b25"/>` +
      `<path d="M14 27h13M14 31.4h13M14 35.8h13M14 40.2h13M14 44.6h26" stroke="#bbb2a1" stroke-width="1.6" stroke-linecap="round"/>` +
      `<rect x="30.4" y="25" width="13.6" height="15" rx="1.6" fill="${g("green")}"/>` +
      `<path class="nx-check" d="M33.6 32.6l2.8 2.8 5-5.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    lock: (g) => `<path d="M21 29v-7a11 11 0 0 1 22 0v7" fill="none" stroke="#8c96a3" stroke-width="5"/><rect x="14" y="28" width="36" height="28" rx="5" fill="${g("yellow")}"/>` +
      `<circle cx="32" cy="39.6" r="3.6" fill="#7a5a12"/><rect x="30.6" y="40.6" width="2.8" height="7.4" rx="1.4" fill="#7a5a12"/>`,
  };
  // The source badges of the answers to plan v2.2, drawn on a 12 × 12 grid in the current color.
  const BADGE = {
    real: '<circle cx="4" cy="3.6" r="1.9"/><path d="M0.6 10.4c0-2.2 1.5-3.6 3.4-3.6s3.4 1.4 3.4 3.6z"/><circle cx="8.6" cy="4.2" r="1.6" opacity="0.6"/><path d="M6.6 10.4c0.3-1.9 1.1-3 2.4-3 1.6 0 2.5 1.3 2.5 3z" opacity="0.6"/>',
    public: '<path d="M4.4 1h3.2M5 1v3.4L1.8 9.6c-0.4 0.7 0.1 1.4 0.9 1.4h6.6c0.8 0 1.3-0.7 0.9-1.4L7 4.4V1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.2 8h5.6l0.9 1.6c0.2 0.4 0 0.7-0.5 0.7H2.8c-0.5 0-0.7-0.3-0.5-0.7z"/>',
    sim: '<path d="M6 0.8l1 1.4 1.7-0.4 0.3 1.7 1.6 0.7-0.7 1.6 0.9 1.5-1.6 0.8-0.1 1.7-1.7-0.2-1.1 1.3-1.2-1.2-1.7 0.3-0.2-1.7-1.6-0.7 0.7-1.6-0.9-1.5 1.6-0.8 0.1-1.7 1.7 0.2z"/><circle cx="6" cy="6" r="1.8" class="hole"/>',
  };

  /* ---------- Two layouts with the same boxes: wide (a desktop window) and tall (a phone) ---------- */
  // Fonts per layout: [size, average character width in em, line height]. Wrapping counts characters, so the click test
  // also measures every label with getBBox.
  const FONTS = {
    wide: { t: [13.5, 0.52, 16], a: [12.5, 0.43, 14.6], m: [10, 0.6, 12.4] },
    tall: { t: [12.5, 0.52, 14.6], a: [11.5, 0.43, 13.4], m: [9.5, 0.6, 11.6] },
  };
  const box = (s, x, y, w, h, o = {}) => ({ s, x, y, w, h, ...o });
  const WIDE = (() => {
    const LY = { sim: 444, real: 508, public: 572 };
    const lane = (k) => box("card", 26, LY[k] - 29, 124, 58, { iz: 34, short: true });
    const page = (k) => box("card", 936, LY[k] - 29, 160, 58, { iz: 34 });
    const nodes = {
      reader: box("card", 32, 62, 196, 96), mailbox: box("card", 268, 62, 196, 96), writer: box("card", 504, 62, 196, 96),
      doctor: box("tile", 752, 50, 156, 124, { iz: 48 }), luck: box("tile", 928, 50, 156, 124, { iz: 48 }),
      daily: box("card", 24, 212, 252, 46, { iz: 36 }),
      votes: lane("real"), sim: lane("sim"), open: lane("public"),
      kafka: box("stage", 170, 306, 94, 166), dock: box("stage", 278, 306, 94, 298),
      bronze: box("stage", 400, 314, 108, 290), silver: box("stage", 520, 314, 108, 290), gold: box("stage", 640, 314, 108, 290), stats: box("stage", 760, 314, 108, 290),
      pages: box("tile", 936, 300, 160, 104, { iz: 40 }), library: page("real"), store: page("sim"), lessons: page("public"),
    };
    const rooms = ["kafka", "dock", "bronze", "silver", "gold", "stats"];
    const cx = (id) => nodes[id].x + nodes[id].w / 2;
    const tag = (room, k, t) => ({ t, x: cx(room), y: LY[k] + 16, w: nodes[room].w - 8 });
    return {
      w: 1120, h: 636, f: FONTS.wide, nodes,
      zones: [
        box("z", 16, 16, 700, 172, { k: "live" }), box("z", 732, 16, 372, 172, { k: "browser" }), box("z", 16, 204, 1088, 62, { k: "daily" }),
        box("z", 16, 284, 140, 336, { k: "sources" }), box("z", 390, 284, 488, 336, { k: "dbx", solid: true }), box("z", 928, 284, 176, 336, { k: "site" }),
      ],
      // Each kind of data runs on its own lane from its source to its page, through the rooms it uses: they never cross.
      lanes: ["real", "sim", "public"].map((k) => ({ kind: k, pts: [[150, LY[k]], [934, LY[k]]], stops: rooms.filter((r) => r !== "kafka" || k === "sim").map((r) => [cx(r), LY[k]]) })),
      json: ["real", "sim", "public"].map((k) => [898, LY[k]]),
      links: [
        { kind: "real", pts: [[228, 110], [266, 110]], live: true }, { kind: "real", pts: [[464, 110], [502, 110]], live: true },
        { kind: "real", pts: [[300, 158], [300, 296], [21, 296], [21, LY.real], [24, LY.real]], k: "export" },
      ],
      ctrl: [
        { n: 1, pts: [[217, 266], [217, 304]] }, { n: 2, pts: [[40, 266], [40, LY.sim - 31]] },
        { n: 3, pts: [[325, 266], [325, 304]] }, { n: 4, at: [300, 266] }, { n: 5, pts: [[860, 266], [860, 282]] },
        { n: 6, pts: [[898, 266], [898, LY.sim - 18]] }, { n: 7, pts: [[1084, 266], [1084, 298]] },
      ],
      steps: { x: 318, y: 239, dir: "row" },
      tags: TAGS.map(([room, k, t]) => tag(room, k, t)).concat(["real", "public"].map((k) => ({ t: L("Files API", "Files API"), x: 214, y: LY[k] + 16, w: 90 }))),
    };
  })();
  const TALL = (() => {
    const LX = { sim: 150, real: 230, public: 310 };
    const top = (k, y) => box("tile", LX[k] - 38, y, 76, 96, { iz: 34 });
    const rooms = { kafka: 456, dock: 528, bronze: 620, silver: 692, gold: 764, stats: 836 };
    const nodes = {
      reader: box("tile", 16, 40, 96, 128), mailbox: box("tile", 132, 40, 96, 128), writer: box("tile", 248, 40, 96, 128),
      daily: box("card", 16, 216, 156, 60, { iz: 36, short: true }),
      votes: top("real", 342), sim: top("sim", 342), open: top("public", 342),
      pages: box("tile", 16, 968, 88, 96, { iz: 34 }), library: top("real", 968), store: top("sim", 968), lessons: top("public", 968),
      doctor: box("tile", 24, 1112, 150, 104, { iz: 44 }), luck: box("tile", 186, 1112, 150, 104, { iz: 44 }),
    };
    for (const [id, y] of Object.entries(rooms)) nodes[id] = box("row", id === "kafka" || id === "dock" ? 16 : 18, y, id === "kafka" ? 174 : id === "dock" ? 336 : 332, 64);
    const mid = (id) => rooms[id] + 32;
    return {
      w: 360, h: 1240, f: FONTS.tall, nodes,
      zones: [
        box("z", 8, 14, 344, 166, { k: "live" }), box("z", 8, 196, 344, 104, { k: "daily" }), box("z", 8, 324, 344, 126, { k: "sources" }),
        box("z", 10, 606, 340, 306, { k: "dbx", solid: true, short: true }), box("z", 8, 950, 344, 126, { k: "site" }), box("z", 8, 1092, 344, 136, { k: "browser" }),
      ],
      lanes: ["real", "sim", "public"].map((k) => ({ kind: k, pts: [[LX[k], 438], [LX[k], 966]], stops: Object.keys(rooms).filter((r) => r !== "kafka" || k === "sim").map((r) => [LX[k], mid(r)]) })),
      json: ["real", "sim", "public"].map((k) => [LX[k], 930]),
      links: [
        { kind: "real", pts: [[112, 96], [130, 96]], live: true }, { kind: "real", pts: [[228, 96], [246, 96]], live: true },
        { kind: "real", pts: [[180, 168], [180, 312], [LX.real, 312], [LX.real, 340]], k: "export" },
      ],
      ctrl: [{ n: 1, at: [182, 466] }, { n: 2, at: [182, 350] }, { n: 3, at: [334, 538] }, { n: 4, at: [180, 300] }, { n: 5, at: [340, 606] }, { n: 6, at: [338, 930] }, { n: 7, at: [96, 976] }],
      steps: { x: 202, y: 222, dir: "col" },
      tags: [{ t: L("Files API", "Files API"), x: 270, y: 482, w: 36 }, { t: L("Files API", "Files API"), x: 334, y: 482, w: 36 }],
    };
  })();
  const LAYOUTS = { wide: WIDE, tall: TALL };

  /* ---------- Drawing ---------- */
  function wrap(text, max) {
    const words = String(text).split(/\s+/).filter(Boolean), out = [];
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
    }
    if (cur) out.push(cur);
    return out;
  }
  function defs(p) {
    const lg = Object.entries(GRAD).map(([k, [a, b]]) => `<linearGradient id="${p}${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join("");
    const ah = ["real", "public", "sim", "ctrl"].map((k) => {
      const s = k === "ctrl" ? 7 : 10;
      return `<marker id="${p}ah-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="${s}" markerHeight="${s}" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah ${k}" d="M0 .6L10 5 0 9.4z"/></marker>`;
    }).join("");
    return `<defs>${lg}${ah}<filter id="${p}lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.4" flood-color="#26251e" flood-opacity=".1"/></filter></defs>`;
  }
  const ink = (p) => (k) => `url(#${p}${k})`;
  // One icon, placed at (x, y) and scaled from its 64 × 64 grid to `size`.
  function icon(name, x, y, size, g) {
    return `<g class="ico ico-${name}" transform="translate(${fix(x)} ${fix(y)}) scale(${Math.round((size / 64) * 1000) / 1000})">${ART[name](g)}</g>`;
  }
  function lines(n, ctx, w, short) {
    const f = ctx.f, fit = (k) => Math.max(4, Math.floor(w / (f[k][0] * f[k][1]))), out = [];
    wrap(tr(short && n.ts ? n.ts : n.t, ctx.lang), fit("t")).forEach((s) => out.push(["t", s]));
    if (n.a) wrap(tr(n.a, ctx.lang), fit("a")).forEach((s) => out.push(["a", s]));
    if (n.m) wrap(tr(n.m, ctx.lang), fit("m")).forEach((s) => out.push(["m", s]));
    return out;
  }
  const blockH = (ls, f) => ls.reduce((h, [k]) => h + f[k][2], 0);
  // Lines of text from a top edge: each baseline sits in the middle of its line box.
  function text(ls, x, y, f, anchor) {
    let s = "", top = y;
    for (const [k, t] of ls) {
      const [size, , lh] = f[k];
      s += `<text class="${k}" x="${fix(x)}" y="${fix(top + (lh - size) / 2 + size * 0.8)}" style="font-size:${size}px"${anchor ? ` text-anchor="${anchor}"` : ""}>${esc(t)}</text>`;
      top += lh;
    }
    return s;
  }
  // A source badge in a colored circle: on a box's corner, or traveling on a lane as a packet.
  const badgeInner = (kind, x, y, r) => `<circle cx="${fix(x)}" cy="${fix(y)}" r="${r}"/>` +
    `<g transform="translate(${fix(x - r * 0.62)} ${fix(y - r * 0.62)}) scale(${fix(r * 0.103 * 100) / 100})">${BADGE[kind]}</g>`;
  const badge = (kind, x, y, r = 7.5, cls = "badge") => (BADGE[kind] ? `<g class="${cls} ${kind}">${badgeInner(kind, x, y, r)}</g>` : "");
  function node(id, b, ctx) {
    const n = NODES[id], f = ctx.f, g = ctx.g;
    const open = `<g class="node ${b.s}${n.kind ? " " + n.kind : ""}" data-node="${id}" data-act="nnode" tabindex="0" role="button" aria-label="${esc(tr(n.t, ctx.lang))}${n.a ? ": " + esc(tr(n.a, ctx.lang)) : ""}">` +
      `<rect class="box" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.s === "stage" || b.s === "row" ? 12 : 10}" filter="url(#${ctx.p}lift)"/>`;
    let body = "";
    if (b.s === "card") {
      const iz = b.iz || 56, ix = b.x + 9, tx = ix + iz + 9, tw = b.x + b.w - 8 - tx, ls = lines(n, ctx, tw, b.short);
      body = icon(n.icon, ix, b.y + (b.h - iz) / 2, iz, g) + text(ls, tx, b.y + (b.h - blockH(ls, f)) / 2, f);
    } else if (b.s === "tile") {
      const iz = b.iz || 44, ls = lines(n, ctx, b.w - 8, true), top = b.y + (b.h - iz - 6 - blockH(ls, f)) / 2;
      body = icon(n.icon, b.x + (b.w - iz) / 2, top, iz, g) + text(ls, b.x + b.w / 2, top + iz + 6, f, "middle");
    } else if (b.s === "stage") {
      const iz = 44, ls = lines(n, ctx, b.w - 10, false);
      body = icon(n.icon, b.x + (b.w - iz) / 2, b.y + 8, iz, g) + text(ls, b.x + b.w / 2, b.y + 12 + iz, f, "middle");
    } else {
      // A room in the tall layout: the header sits in a gutter on the left, the lanes cross on the right.
      const iz = 30, tx = b.x + 8 + iz + 6, ls = lines(n, ctx, 132 - tx - 2, true);
      body = icon(n.icon, b.x + 8, b.y + (b.h - iz) / 2, iz, g) + text(ls, tx, b.y + (b.h - blockH(ls, f)) / 2, f);
    }
    return open + body + (b.s === "card" || b.s === "tile" ? badge(n.kind, b.x + 10, b.y + 10) : "") + "</g>";
  }
  const zoneBox = (z) => `<rect class="z${z.solid ? " solid" : ""} ${z.k}" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14"/>`;
  // A zone's name sits on its top border, on a patch of page color: lines that cross it pass underneath.
  function zoneLabel(z, ctx) {
    const info = ZONES[z.k], lab = tr(z.short && info.ts ? info.ts : info.t, ctx.lang), an = info.a ? tr(info.a, ctx.lang) : "";
    // Geist Mono at 10.5 px plus 0.08 em of letter spacing: about 7.15 px a character.
    const cw = 7.15, lock = info.lock ? 17 : 0, lw = lock + lab.length * cw + (an ? 12 + an.length * 5.5 : 0) + 12, lx = z.x + 12;
    return `<g class="zlabel ${z.k}"><rect class="zk" x="${lx - 6}" y="${z.y - 8}" width="${fix(lw)}" height="16" rx="4"/>` +
      (lock ? icon("lock", lx - 2, z.y - 8, 16, ctx.g) : "") +
      `<text class="zl" x="${lx + lock}" y="${z.y + 3.7}">${esc(lab)}</text>` +
      (an ? `<text class="za" x="${fix(lx + lock + lab.length * cw + 10)}" y="${z.y + 4}">${esc(an)}</text>` : "") + `</g>`;
  }
  // A polyline with rounded elbows.
  function route(pts, r = 9) {
    let d = `M${fix(pts[0][0])} ${fix(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1), rr = Math.min(r, d1 / 2, d2 / 2);
      d += `L${fix(x1 - ((x1 - x0) / d1) * rr)} ${fix(y1 - ((y1 - y0) / d1) * rr)}Q${fix(x1)} ${fix(y1)} ${fix(x1 + ((x2 - x1) / d2) * rr)} ${fix(y1 + ((y2 - y1) / d2) * rr)}`;
    }
    const e = pts[pts.length - 1];
    return d + `L${fix(e[0])} ${fix(e[1])}`;
  }
  const num = (n, x, y, r = 8.5) => `<g class="num"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${fix(y + r * 0.42)}" text-anchor="middle" style="font-size:${fix(r * 1.2)}px">${n}</text></g>`;
  function steps(Lw, ctx) {
    const s = Lw.steps, size = Lw === WIDE ? 11.5 : 10.5;
    let out = "", x = s.x, y = s.y;
    STEPS.forEach((st, i) => {
      const label = tr(st, ctx.lang);
      out += num(i + 1, x + 6.5, y, 6.5) + `<text class="st" x="${fix(x + 17)}" y="${fix(y + size * 0.36)}" style="font-size:${size}px">${esc(label)}</text>`;
      if (s.dir === "row") x += 17 + label.length * size * 0.5 + 16;
      else y += 12;
    });
    return out;
  }

  const pathLength = (pts) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
  // A packet that rides a lane forever: the same badge, moved by SMIL along the lane's own path.
  const rider = (kind, path, dur, begin) => `<g class="pk ${kind}">${badgeInner(kind, 0, 0, 6.5)}` +
    `<animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite"><mpath href="#${path}"/></animateMotion></g>`;
  function riders(Lw, p) {
    // Two packets per lane, half a lap apart, at about 90 units a second; one on each link (fast when it is live).
    let s = "";
    for (const l of Lw.lanes) {
      const dur = fix(pathLength(l.pts) / 90);
      s += rider(l.kind, `${p}lane-${l.kind}`, dur, 0) + rider(l.kind, `${p}lane-${l.kind}`, dur, fix(-dur / 2));
    }
    Lw.links.forEach((k, i) => { s += rider(k.kind, `${p}link-${i}`, fix(Math.max(1.2, pathLength(k.pts) / (k.live ? 40 : 90))), fix(-i * 0.4)); });
    return s;
  }

  // The whole map as one SVG string. `id` keeps gradient and marker ids unique when a page holds two maps;
  // `motion` adds packets that travel the lanes; `hop` adds the marker that the guided stories move from box to box.
  function map({ layout = "wide", lang = "en", id = "nx", motion = false, hop = false } = {}) {
    const Lw = LAYOUTS[layout], p = id + "-", ctx = { lang, f: Lw.f, p, g: ink(p) };
    const label = lang === "es" ? "Mapa de lo que pasa detrás de la pantalla" : "Map of what happens behind the screen";
    let s = `<svg class="nx" data-layout="${layout}" viewBox="0 0 ${Lw.w} ${Lw.h}" role="group" aria-label="${label}">${defs(p)}`;
    s += Lw.zones.map(zoneBox).join("");
    const rooms = Object.entries(Lw.nodes).filter(([, b]) => b.s === "stage" || b.s === "row");
    s += rooms.map(([nid, b]) => node(nid, b, ctx)).join("");
    s += Lw.ctrl.filter((c) => c.pts).map((c) => `<path class="ctrl" d="${route(c.pts, 6)}" marker-end="url(#${p}ah-ctrl)"/>`).join("");
    s += Lw.lanes.map((l) => `<path id="${p}lane-${l.kind}" class="lane ${l.kind}" data-lane="${l.kind}" d="${route(l.pts)}" marker-end="url(#${p}ah-${l.kind})"/>` + l.stops.map(([x, y]) => `<circle class="stop ${l.kind}" cx="${fix(x)}" cy="${y}" r="5"/>`).join("")).join("");
    s += Lw.links.map((k, i) => `<path id="${p}link-${i}" class="lane ${k.kind}${k.live ? " live" : ""}${k.k ? " " + k.k : ""}" d="${route(k.pts)}" marker-end="url(#${p}ah-${k.kind})"/>`).join("");
    s += Lw.json.map(([x, y]) => icon("json", x - 11, y - 13, 22, ctx.g)).join("");
    s += (Lw.tags || []).map((t) => wrap(tr(t.t, lang), Math.max(4, Math.floor(t.w / 5.7)))
      .map((line, i) => `<text class="tag" x="${fix(t.x)}" y="${t.y + i * 11}" text-anchor="middle">${esc(line)}</text>`).join("")).join("");
    if (motion) s += riders(Lw, p);
    s += Object.entries(Lw.nodes).filter(([, b]) => b.s !== "stage" && b.s !== "row").map(([nid, b]) => node(nid, b, ctx)).join("");
    s += steps(Lw, ctx);
    s += Lw.zones.map((z) => zoneLabel(z, ctx)).join("");
    s += Lw.ctrl.map((c) => (c.at ? num(c.n, c.at[0], c.at[1]) : num(c.n, c.pts[0][0], c.pts[0][1]))).join("");
    if (hop) s += `<g class="hop" data-hop style="display:none"></g>`;
    return s + "</svg>";
  }
  // Where the story marker sits on a box: on the box's crossing with the story's lane when it has one, else in its middle.
  function anchor(layout, id, kind) {
    const Lw = LAYOUTS[layout], b = Lw.nodes[id];
    if (!b) return null;
    const lane = Lw.lanes.find((l) => l.kind === kind);
    const stop = lane && lane.stops.find(([x, y]) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    return stop ? { x: fix(stop[0]), y: fix(stop[1]) } : { x: fix(b.x + b.w / 2), y: fix(b.y + b.h / 2) };
  }
  // The story marker: a pulsing ring around a dot that wears the kind's badge.
  const hopInner = (kind) => `<circle class="ring" r="17"/><circle class="core" r="11"/>` +
    (BADGE[kind] ? `<g class="glyph" transform="translate(-6.8 -6.8) scale(1.13)">${BADGE[kind]}</g>` : "");

  // The legend: a short sample of each lane and what it carries.
  function legend(lang = "en") {
    const dash = { real: "9 6", public: "0.1 6.5", sim: "12 5 2 5", ctrl: "1 4.5" };
    return `<div class="nx-legend">${Object.entries(KINDS).map(([k, v]) => `<span class="nx-li ${k}"><svg viewBox="0 0 44 12" aria-hidden="true"><path d="M2 6h36" class="${k === "ctrl" ? "ctrl" : "lane " + k}" style="stroke-dasharray:${dash[k]}"/></svg><b>${esc(tr(v.label, lang))}</b><span>${esc(tr(v.note, lang))}</span></span>`).join("")}</div>`;
  }

  /* ---------- Look: one style sheet for the map, in the prototype's colors (light and dark) ---------- */
  const CSS = `
:root { --nx-real: #f54e00; --nx-public: #2b8a3e; --nx-sim: #6741d9; --nx-ctrl: #9a9993; --nx-zone: rgba(38, 37, 30, 0.022); --nx-dbx: #efeee9; --nx-box: #fcfcfa; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --nx-real: #ff7b3d; --nx-public: #51cf66; --nx-sim: #9b85ff; --nx-ctrl: #75736d; --nx-zone: rgba(237, 236, 236, 0.025); --nx-dbx: #1e1c16; --nx-box: #23211b; } }
:root[data-theme="dark"] { --nx-real: #ff7b3d; --nx-public: #51cf66; --nx-sim: #9b85ff; --nx-ctrl: #75736d; --nx-zone: rgba(237, 236, 236, 0.025); --nx-dbx: #1e1c16; --nx-box: #23211b; }
.nx { display: block; width: 100%; height: auto; font-family: var(--sans, "Instrument Sans", system-ui, sans-serif); }
.nx text { fill: var(--fg, #26251e); }
.nx .z { fill: var(--nx-zone); stroke: var(--line-2, #cbcac4); stroke-width: 1.2; stroke-dasharray: 5 5; }
.nx .z.solid { fill: var(--nx-dbx); stroke-dasharray: none; }
.nx .z.live { stroke: color-mix(in oklab, var(--nx-real) 45%, var(--line-2, #cbcac4)); }
.nx .zk { fill: var(--bg, #f7f7f4); }
.nx .zl { font-family: var(--mono, "Geist Mono", ui-monospace, monospace); font-size: 10.5px; font-weight: 500; letter-spacing: 0.08em; fill: var(--sec, #6a6963); }
.nx .za, .nx text.a { font-family: var(--serif, "EB Garamond", Georgia, serif); font-style: italic; fill: var(--sec, #6a6963); }
.nx .za { font-size: 13px; }
.nx .box { fill: var(--nx-box); stroke: var(--line, #e2e1dc); stroke-width: 1; }
.nx text.t { font-weight: 500; }
.nx text.m, .nx .tag { font-family: var(--mono, "Geist Mono", ui-monospace, monospace); fill: var(--ter, #9a9993); }
.nx .tag { font-size: 9.5px; }
.nx .st { fill: var(--sec, #6a6963); }
.nx .lane { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.nx .lane.real { stroke: var(--nx-real); stroke-dasharray: 9 6; }
.nx .lane.public { stroke: var(--nx-public); stroke-dasharray: 0.1 6.5; stroke-width: 3.6; }
.nx .lane.sim { stroke: var(--nx-sim); stroke-dasharray: 12 5 2 5; }
.nx .ctrl { fill: none; stroke: var(--nx-ctrl); stroke-width: 1.6; stroke-dasharray: 1 4.5; stroke-linecap: round; }
.nx .ah.real { fill: var(--nx-real); } .nx .ah.public { fill: var(--nx-public); } .nx .ah.sim { fill: var(--nx-sim); } .nx .ah.ctrl { fill: var(--nx-ctrl); }
.nx .stop { fill: var(--nx-box); stroke-width: 2.4; }
.nx .stop.real { stroke: var(--nx-real); } .nx .stop.public { stroke: var(--nx-public); } .nx .stop.sim { stroke: var(--nx-sim); }
.nx .num circle { fill: var(--fg, #26251e); } .nx .num text { fill: var(--bg, #f7f7f4); font-weight: 600; }
.nx .badge circle, .nx .pk circle { fill: currentColor; } .nx .badge g, .nx .pk g { fill: #fff; color: #fff; }
.nx .badge.sim .hole, .nx .pk.sim .hole { fill: var(--nx-sim); }
.nx .badge.real, .nx .pk.real { color: var(--nx-real); } .nx .badge.public, .nx .pk.public { color: var(--nx-public); } .nx .badge.sim, .nx .pk.sim { color: var(--nx-sim); }
.nx .pk > circle { stroke: var(--nx-box); stroke-width: 1.6; }
.nx .sh { fill: rgba(38, 37, 30, 0.13); }
.nx .nx-cb { opacity: 0; }
.nx-legend { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 13px; color: var(--sec, #6a6963); }
.nx-li { display: inline-flex; align-items: center; gap: 8px; }
.nx-li svg { width: 44px; height: 12px; flex: none; overflow: visible; }
.nx-li .lane, .nx-li .ctrl { fill: none; stroke-linecap: round; }
.nx-li .lane { stroke-width: 3; } .nx-li .lane.public { stroke-width: 3.6; } .nx-li .ctrl { stroke-width: 1.6; }
.nx-li .lane.real { stroke: var(--nx-real); } .nx-li .lane.public { stroke: var(--nx-public); } .nx-li .lane.sim { stroke: var(--nx-sim); } .nx-li .ctrl { stroke: var(--nx-ctrl); }
.nx-li b { font-weight: 500; color: var(--fg, #26251e); }

/* Boxes are buttons. A story dims everything it does not touch; a filter keeps one kind lit; a stack row lights its boxes. */
.nx .node { cursor: pointer; outline: none; }
.nx .node:hover .box { stroke: var(--line-2, #cbcac4); }
.nx .node:focus-visible .box, .nx .node.sel .box { stroke: var(--fg, #26251e); stroke-width: 1.6; }
.nx .node.hot .box, .nx.tool .node.lit .box { stroke: var(--accent, #f54e00); stroke-width: 2.2; }
.nx .node, .nx .lane, .nx .stop, .nx .ctrl, .nx .pk, .nx .tag, .nx .ico-json, .nx .num { transition: opacity 0.35s ease; }
.nx.story .node:not(.on), .nx.story .lane:not(.on), .nx.story .stop:not(.on), .nx.story .ctrl, .nx.story .pk, .nx.story .tag, .nx.story .ico-json, .nx.story .num { opacity: 0.18; }
.nx.tool .node:not(.lit) { opacity: 0.25; }
.nx[data-filter] .lane, .nx[data-filter] .stop, .nx[data-filter] .pk, .nx[data-filter] .ctrl, .nx[data-filter] .node.real, .nx[data-filter] .node.public, .nx[data-filter] .node.sim { opacity: 0.12; }
${["real", "public", "sim"].map((k) => [".lane", ".stop", ".pk", ".node"].map((e) => `.nx[data-filter="${k}"] ${e}.${k}`).join(", ") + " { opacity: 1; }").join("\n")}
.nx[data-filter="ctrl"] .ctrl { opacity: 1; }
.nx .hop { pointer-events: none; color: var(--fg, #26251e); transition: transform 0.85s cubic-bezier(0.25, 1, 0.5, 1); }
.nx .hop.real { color: var(--nx-real); } .nx .hop.public { color: var(--nx-public); } .nx .hop.sim { color: var(--nx-sim); }
.nx .hop .core { fill: currentColor; stroke: var(--nx-box); stroke-width: 2.4; }
.nx .hop .ring { fill: none; stroke: currentColor; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: nx-ring 1.6s ease-out infinite; }
.nx .hop .glyph { fill: #fff; color: #fff; } .nx .hop.sim .glyph .hole { fill: var(--nx-sim); }
@keyframes nx-ring { from { transform: scale(0.6); opacity: 0.9; } to { transform: scale(1.8); opacity: 0; } }

/* Motion: dashes walk the way the data goes and every icon plays a short loop. .paused and reduced motion stop it all. */
.nx .lane.real { animation: nx-walk-real 1.3s linear infinite; }
.nx .lane.public { animation: nx-walk-public 0.9s linear infinite; }
.nx .lane.sim { animation: nx-walk-sim 1.8s linear infinite; }
.nx .lane.live { animation-duration: 0.5s; }
.nx .ctrl { animation: nx-walk-ctrl 1.4s linear infinite; }
@keyframes nx-walk-real { to { stroke-dashoffset: -15; } }
@keyframes nx-walk-public { to { stroke-dashoffset: -6.6; } }
@keyframes nx-walk-sim { to { stroke-dashoffset: -24; } }
@keyframes nx-walk-ctrl { to { stroke-dashoffset: -5.5; } }
.nx .nx-ca { animation: nx-ca 6s ease-in-out infinite; }
.nx .nx-cb { animation: nx-cb 6s ease-in-out infinite; }
@keyframes nx-ca { 0%, 42% { opacity: 1; } 50%, 92% { opacity: 0; } 100% { opacity: 1; } }
@keyframes nx-cb { 0%, 42% { opacity: 0; } 50%, 92% { opacity: 1; } 100% { opacity: 0; } }
.nx .nx-tap { transform-box: fill-box; transform-origin: center; animation: nx-tap 2.2s ease-out infinite; }
@keyframes nx-tap { 0% { transform: scale(0.4); opacity: 0; } 15% { opacity: 1; } 70%, 100% { transform: scale(1.7); opacity: 0; } }
.nx .nx-drop { animation: nx-drop 2.6s ease-in infinite; }
@keyframes nx-drop { 0%, 15% { transform: translateY(-5px); opacity: 0; } 30% { opacity: 1; } 75% { transform: translateY(9px); opacity: 1; } 90%, 100% { transform: translateY(12px); opacity: 0; } }
.nx .nx-flag { transform-box: fill-box; transform-origin: 0% 100%; animation: nx-flag 2.6s ease-in-out infinite; }
@keyframes nx-flag { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(22deg); } }
.nx .nx-grow { transform-box: fill-box; transform-origin: 0% 50%; animation: nx-grow 5s ease-in-out infinite; }
@keyframes nx-grow { 0% { transform: scaleX(0.5); } 85%, 100% { transform: scaleX(2.25); } }
.nx .nx-pulse { stroke-dasharray: 70; animation: nx-draw 2.4s linear infinite; }
@keyframes nx-draw { 0% { stroke-dashoffset: 70; } 70%, 100% { stroke-dashoffset: 0; } }
.nx .nx-roll { transform-box: fill-box; transform-origin: center; animation: nx-roll 3.4s cubic-bezier(0.3, 0.7, 0.3, 1) infinite; }
@keyframes nx-roll { 0%, 50% { transform: rotate(0deg); } 85%, 100% { transform: rotate(360deg); } }
.nx .nx-sun { animation: nx-sun 5s ease-in-out infinite alternate; }
@keyframes nx-sun { from { transform: translateY(7px); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
.nx .nx-hand { transform-box: fill-box; transform-origin: 50% 100%; animation: nx-turn 4s linear infinite; }
.nx .nx-spin { transform-box: fill-box; transform-origin: center; animation: nx-turn 6s linear infinite; }
.nx .nx-spin.slow { animation-duration: 12s; }
@keyframes nx-turn { to { transform: rotate(360deg); } }
.nx .nx-hop { animation: nx-bounce 1.4s ease-in-out infinite; }
.nx .nx-hop.b2 { animation-delay: -0.7s; }
.nx .nx-bob { animation: nx-bounce 2.4s ease-in-out infinite; }
@keyframes nx-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.nx .nx-bub { animation: nx-bub 2.2s ease-in infinite; }
.nx .nx-bub.b2 { animation-delay: -0.8s; } .nx .nx-bub.b3 { animation-delay: -1.5s; }
@keyframes nx-bub { 0% { transform: translateY(4px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-10px); opacity: 0; } }
.nx .nx-slot { animation: nx-blink 3s ease-in-out infinite; }
.nx .nx-slot.s1 { animation-delay: -0.75s; } .nx .nx-slot.s3 { animation-delay: -1.5s; } .nx .nx-slot.s5 { animation-delay: -2.25s; }
@keyframes nx-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
.nx .nx-belt { animation: nx-belt 2.6s linear infinite; }
@keyframes nx-belt { 0% { transform: translateX(-4px); opacity: 0; } 15%, 85% { opacity: 1; } 100% { transform: translateX(38px); opacity: 0; } }
.nx .nx-cross { animation: nx-cross 3s ease-in-out infinite; }
@keyframes nx-cross { 0% { transform: translate(-6px, 6px); opacity: 0; } 15% { opacity: 1; } 50% { transform: translate(6px, -2px); } 85% { opacity: 1; } 100% { transform: translate(20px, 8px); opacity: 0; } }
.nx .nx-shine { animation: nx-shine 3.4s ease-in-out infinite; }
@keyframes nx-shine { 0% { transform: translateX(0); opacity: 0; } 20% { opacity: 0.55; } 60%, 100% { transform: translateX(36px); opacity: 0; } }
.nx .nx-sweep { animation: nx-sweep 3s ease-in-out infinite alternate; }
@keyframes nx-sweep { from { transform: translate(-14px, 2px); } to { transform: translate(2px, -2px); } }
.nx .nx-bars { transform-box: fill-box; transform-origin: 50% 100%; animation: nx-bars 2.8s ease-in-out infinite alternate; }
@keyframes nx-bars { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
.nx .nx-tilt { transform-box: fill-box; transform-origin: 50% 0%; animation: nx-tilt 3.6s ease-in-out infinite alternate; }
@keyframes nx-tilt { from { transform: rotate(-6deg); } to { transform: rotate(6deg); } }
.nx .nx-pop { animation: nx-pop 3.2s ease-in-out infinite; }
@keyframes nx-pop { 0%, 20% { transform: translateY(-14px); opacity: 0; } 45%, 85% { transform: translateY(0); opacity: 1; } 100% { opacity: 0; } }
.nx .nx-check { stroke-dasharray: 14; animation: nx-check 2.6s ease-in-out infinite; }
@keyframes nx-check { 0%, 20% { stroke-dashoffset: 14; } 60%, 100% { stroke-dashoffset: 0; } }
.nx .nx-load { transform-box: fill-box; transform-origin: 0% 50%; animation: nx-load 3s ease-in-out infinite; }
@keyframes nx-load { 0% { transform: scaleX(0.1); } 70%, 100% { transform: scaleX(1.62); } }
.nx.paused, .nx.paused * { animation-play-state: paused !important; }
.nx.paused .pk { visibility: hidden; }
@media (prefers-reduced-motion: reduce) { .nx, .nx * { animation: none !important; transition: none !important; } }
`;
  function style(doc) {
    if (doc.getElementById("nx-css")) return;
    const el = doc.createElement("style");
    el.id = "nx-css";
    el.textContent = CSS;
    doc.head.appendChild(el);
  }
  // A single icon as a standalone SVG (for legends and the plan's figures).
  function iconSVG(name, size = 64, id = "ic") {
    const p = `${id}-${name}-`;
    return `<svg class="nx" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${defs(p)}${ART[name](ink(p))}</svg>`;
  }

  const packet = (kind, x, y, r = 7) => badge(kind, x, y, r, "pk");

  root.Nerds = { KINDS, NODES, DETAILS, ZONES, STEPS, STORIES, TOOLS, LAYOUTS, ICONS: Object.keys(ART), map, anchor, hopInner, legend, iconSVG, packet, style, CSS };
})(typeof globalThis !== "undefined" ? globalThis : this);

# Prompt de traspaso: Panel de Exportaciones

Pega este prompt en Claude Code (VS Code) con esta carpeta abierta.

---

Eres mi desarrollador principal. Continúa un proyecto que ya tiene un prototipo funcional. Lee primero todo el código en `src/` y `build.py` y NO lo reescribas desde cero. Antes de escribir código nuevo, propón un plan y espera mi aprobación.

## Qué es
"Panel de Exportaciones": dashboard para analizar las bases mensuales de declaraciones de exportación de Colombia (formato DIAN). Cada mes llega un Excel nuevo y lo subo al dashboard. Hoy es un solo HTML autocontenido (prototipo publicado como artefacto), que se construye con `python3 build.py` a partir de `src/`.

## Datos de entrada (formato real)
- Archivo de ejemplo: `01_Exportaciones_2026_Enero.xlsx`, hoja `Sheet1`, 94.888 filas × 72 columnas, 34 MB, encabezados en la fila 1.
- Valores de control para Enero 2026 (mi parser coincide con pandas): 94.888 series, FOB USD 4.276.675.136,65, peso neto 7.815.829.737,14 kg, 40.033 formularios, 3.449 exportadores, 161 países, 3.053 subpartidas, 21 aduanas.
- Columnas clave: FECHA_PROCESO (YYYYMM), FECHA_DECLARACION_EXPORTACION (YYYYMMDD entero), NUMERO_FORMULARIO (la declaración), NUMERO_SERIE, ADUANA_DESPACHO, COD_LUG_SALIDA_ALF, MODO_TRANSPORTE, NACIONALIDAD_BANDERA, RAZON_SOCIAL_DECLARANTE, REGION_DE_ORIGEN, REGION_PROCEDENCIA, RAZON_SOCIAL_EXPORTADOR, NIT_EXPORTADOR, PAIS_DESTINO_FINAL, CIUDAD_DESTINATARIO, RAZON_SOCIAL_DESTINATARIO, SUBPARTIDA, UNIDAD_FISICA, MODALIDAD_EXPORTACION, TIPO_DESPACHO, TIPO_DE_EMBARQUE, TIPO_DE_DATOS, COD_MONEDA_TRANSACCION, FORMA_PAGO, EXPORTACION_EN_TRANSITO, SISTEMAS_ESPECIALES, TIPO_CERTIFICADO_ORIGEN.
- Medidas: VALOR_FOB_USD, VALOR_FOB_PESOS, PESO_NETO_KGS, PESO_BRUTO_KGS, VALOR_SERIE_FLETES_USD, VALOR_SERIE_SEGUROS_USD, VLR_SERIE_OTROS_GASTOS_USD, VLR_SERIE_AGREGADO_NAL_USD, CANTIDAD_UNIDADES_FISICAS.
- Particularidades: SUBPARTIDA pierde el cero inicial (viene de 9 dígitos): se rellena a 10; capítulo = 2 primeros dígitos, partida = 4. Los pesos están en KILOGRAMOS (no hay peso fino ni ley del oro; el oro 7108 viene en kg). Una declaración (formulario) tiene varias series.
- El mapeo columna→campo está en `src/parser.js` (DIMS, NUMS). Los encabezados se detectan por nombre, no por posición.

## Lo que ya existe (src/)
- `parser.js`: lector xlsx propio (fflate + regex por bloques de 3 MB), solo extrae las columnas necesarias; ~4 s por archivo de 95 mil filas. Genera "chunks" columnares con diccionarios por columna (typed arrays).
- `app.js`: estado, combinación de meses, filtrado por máscara (Uint8Array), agregaciones (`groupBy` con caché por máscara), barra lateral de filtros, pestañas Gráficos / Resumen / Explorar / Registros, tema claro/oscuro/auto, persistencia en IndexedDB por mes (subir un mes ya cargado lo reemplaza).
- `studio.js`: estudio de gráficos Top N: torta, dona, barras, barras horizontales, mapa de árbol, líneas por mes y 3D (barras/torta/dona con three.js r128: arrastrar para girar, zoom, tooltip, clic filtra); paletas y color por elemento (el color sigue a la entidad, no a la posición); orden por valor/FOB USD/FOB COP/peso/series/nombre; "enfocar en un ítem" (p. ej. países para la partida 0901) sin afectar los filtros globales.
- Filtros: 25 columnas con búsqueda, meses, rango de fechas, rango de FOB USD, rango de peso (neto/bruto en g/kg/t), búsqueda de texto libre.
- `style.css` / `body.html`: diseño con tokens CSS, tema claro/oscuro, responsive, barra de estado fija con totales y filtros activos.
- Dependencias por CDN: fflate 0.8.2, three r128, fuentes Schibsted Grotesk e IBM Plex Mono. Para pruebas locales `build.py` genera también `dash_local.html` (requiere `fflate.js` y `three.js` locales: `npm i fflate@0.8.2 three@0.128.0`).

## Decisiones y lecciones a conservar
- Procesar en columnas y por diccionario: es lo que hace rápido el filtrado con más de 1 millón de filas.
- El color de una entidad se guarda por clave `dimensión|nombre`.
- En CSS hay que mantener la regla `[hidden]{display:none!important}`.
- Los nombres de capítulo arancelario (CAP en `app.js`) los escribí de memoria: hay que revisarlos contra la fuente oficial.
- Los temporizadores de debounce no deben compartirse entre inputs (hubo un bug).
- No existe exportación a archivo en el prototipo (el entorno donde se publicó bloquea descargas); solo "Copiar tabla".

## Objetivo a largo plazo
Convertirlo en un aplicativo real, más completo, que incluya **resúmenes y reportes generados a partir de los datos**. Stack propuesto (cuestiónalo si ves algo mejor):
- Backend Python (FastAPI). Convertir cada Excel mensual una sola vez a Parquet y consultar con DuckDB.
- Frontend: reutilizar la lógica y el diseño actuales, reorganizados en componentes (React + Vite o similar), con pruebas.
- Reportes en Word/PDF/Excel generados en el servidor (python-docx, openpyxl). Resúmenes narrativos con la API de Claude, alimentados SOLO con cifras ya calculadas (nunca filas crudas), para no inventar números.
- Reportes programados cada mes, historial de cargas y de reportes, y acceso por usuario.

## Cómo quiero que trabajes
1. Lee `src/` y confirma que entiendes la estructura. Instala dependencias y comprueba que `build.py` genera el HTML.
2. Valida el parser con el Excel de ejemplo contra los valores de control de arriba.
3. Propón un plan por etapas: (a) backend + Parquet/DuckDB, (b) portar el frontend, (c) primer reporte en Word, (d) resúmenes con IA, (e) automatización y usuarios.
4. Antes de la etapa (c) pregúntame qué reporte necesito primero y con qué formato. No lo supongas.
5. Trabaja en cambios pequeños con pruebas, y explícame cada decisión importante en español.

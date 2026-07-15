# Folio ERP — Ventas, Inventario y Facturación

Proyecto de portafolio desarrollado por **AG Soluciones**. Es un ERP empresarial de demostración, 100% funcional en el navegador, pensado para mostrar capacidad de diseño y desarrollo de sistemas de gestión a clientes potenciales.

**[Ver demo en vivo →](#)** *(pega aquí tu enlace de GitHub Pages una vez publicado)*

![Estado](https://img.shields.io/badge/estado-demo funcional-2F6F4E)
![Licencia](https://img.shields.io/badge/uso-portafolio-C9A227)

## Vista general

Folio ERP simula la operación diaria de una pequeña o mediana empresa: registrar ventas, controlar inventario y generar facturas con folio y estado, todo desde un panel con diseño propio (paleta verde ledger + acentos en latón, tipografía Space Grotesk / Inter / IBM Plex Mono).

## Módulos incluidos

- **Panel general** — KPIs de ingresos, facturas pendientes, catálogo y clientes; gráfica de ventas de los últimos 7 días; alertas de existencias bajo mínimo; ventas recientes.
- **Ventas** — historial de ventas, búsqueda por folio/cliente, alta de nuevas ventas con múltiples artículos que descuentan inventario automáticamente y generan una factura.
- **Inventario** — catálogo de productos con SKU, categoría, precio, existencia y mínimo; alta, edición y eliminación; filtro por categoría y alerta visual de bajo stock.
- **Facturación** — folios fiscales generados desde cada venta, con fecha de emisión/vencimiento, cambio de estado (pagada / pendiente / vencida) y vista de factura lista para imprimir o guardar como PDF.
- **Clientes** — directorio con historial de compras y monto total por cliente.

## Cómo funciona la persistencia

No hay backend: todos los datos se guardan en `localStorage` del navegador, con datos de demostración precargados la primera vez que se abre la aplicación. El botón **"Restablecer demo"** en la barra lateral regresa todo a su estado inicial en cualquier momento — ideal para que cada visita de un cliente potencial empiece limpia.

## Stack técnico

- HTML5, CSS3 (variables de diseño / sin frameworks) y JavaScript vanilla — sin build step, se publica directo en GitHub Pages.
- Gráficas construidas a mano en SVG (sin dependencias externas de charting).
- Tipografías: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), [Inter](https://fonts.google.com/specimen/Inter) y [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) vía Google Fonts.

## Publicarlo en GitHub Pages

1. Crea un repositorio y sube todo el contenido de esta carpeta.
2. En **Settings → Pages**, selecciona la rama principal y la carpeta raíz (`/`).
3. Guarda; GitHub te dará una URL pública en un par de minutos.
4. Pega esa URL en la sección "Ver demo en vivo" de este README y en tu portafolio.

## Estructura del proyecto

```
erp-ag-soluciones/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── data.js      # capa de datos y localStorage
│   └── app.js        # enrutamiento y lógica de la interfaz
└── README.md
```

## Sobre AG Soluciones

Este proyecto forma parte del portafolio de **AG Soluciones**, enfocado en el desarrollo de sistemas de gestión a la medida (ventas, inventario, facturación y más) para pequeñas y medianas empresas. ¿Te interesa un sistema como este para tu negocio? Contáctame para platicar tu proyecto.

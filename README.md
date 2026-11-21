# Unir y Dividir PDF

Junta varios PDF en uno o separa sus páginas. Todo en tu navegador, sin subir nada.

Herramienta gratuita y de código abierto de [SonhoLab](https://sonholab.com). Corre **100 % en el navegador**: los archivos no se suben a ningún servidor.

> Licencia: **MIT** · Autor: Leandro Manuel Perez Montañana · Idiomas de la interfaz: español, inglés, francés, portugués (BR), alemán, hindi, indonesio y ruso.

## Qué hace

Unir y dividir PDF resuelve dos problemas cotidianos: tienes cinco archivos que deberían ser uno solo, o un documento largo del que solo necesitas algunas páginas. Aquí puedes hacer las dos cosas en tu navegador, sin registrarte y sin que el archivo salga de tu computadora.

**Cuándo te sirve:**

- El contrato llega escaneado en tres partes y hay que devolverlo firmado como un solo archivo al cliente.
- Una secretaria arma el cierre del mes juntando facturas, recibos y comprobantes en un único PDF.
- De un manual de 80 páginas solo necesitas el capítulo 4 para mandarlo por WhatsApp sin que pese tanto.

## Cómo se usa

1. **Carga tus archivos.** Arrastra uno o varios PDF al recuadro, o haz clic para buscarlos en tu equipo. Se abren dentro del navegador, no se envían a ningún servidor.
2. **Ordena o separa.** Para unir, acomoda los archivos en el orden que quieres. Para dividir, elige las páginas que necesitas separar del documento original.
3. **Descarga el resultado.** Haz clic en el botón y guarda el PDF final, o las páginas sueltas, directamente en tu equipo. Sin marca de agua y sin espera.

## Qué necesita para funcionar

### Para instalarla y compilarla

- [Node.js](https://nodejs.org) 18 o superior (probado con Node 22) y npm.
- Conexión a internet **solo** durante `npm install`. Una vez compilada, la herramienta no pide nada a internet.

### Complementos específicos de esta herramienta

- **PDF.js** (lector de PDF de Mozilla): viene como dependencia de npm; su *worker* se empaqueta solo con Vite.

### En el navegador de quien la usa

- Web Workers y Canvas (cualquier navegador actual).

## Instalación

```bash
git clone https://github.com/nanoizax/herramienta-unir-dividir-pdf.git
cd herramienta-unir-dividir-pdf
npm install
npm run dev         # servidor de desarrollo en http://localhost:5173
```

Para publicarla:

```bash
npm run build       # genera la carpeta dist/
npm run preview     # probar la versión compilada
```

Esta herramienta **no tiene servidor propio**: todo ocurre en el navegador de quien la usa. Basta con publicar la carpeta `dist/` en cualquier hosting estático (GitHub Pages, Netlify, Cloudflare Pages, Nginx, Apache...).

## Cómo está organizado

```
src/pages/tools/   La página de la herramienta (interfaz y lógica de pantalla)
src/lib/tools/     La lógica de la herramienta, separada de la interfaz
src/components/    Piezas compartidas (zona de arrastre de archivos, botón)
src/locales/       Textos en 8 idiomas (esta herramienta solamente)
src/i18n.ts        Configuración de idiomas
```

## Cómo meterla en tu propia plataforma

1. **Como página aparte:** publica `dist/` en una ruta de tu sitio, por ejemplo `/herramientas/unir-dividir-pdf/`. Si la sirves en una subcarpeta, define `base` en `vite.config.ts`.
2. **Dentro de tu aplicación React:** copia `src/pages/tools/*Page.tsx`, `src/lib/tools/` y `src/components/` a tu proyecto, instala las mismas dependencias de `package.json` y renderiza la página donde quieras.
3. **Con tu diseño:** el marco de la página (título, ayuda, preguntas frecuentes) está en `src/components/tools/ToolPageLayout.tsx` y es intencionalmente simple. Cámbialo por tu cabecera, tu pie y tus estilos; solo necesita pintar `children`.
4. **Con tu analítica:** `src/lib/hitCounter.ts` no hace nada. Si quieres medir el uso, conéctalo ahí a tu propia herramienta.

## Privacidad

Todo el procesamiento ocurre en el navegador. Esta copia no incluye analítica, cookies, contadores ni llamadas a ningún servidor propio. Los archivos del usuario no salen de su equipo.

## Preguntas frecuentes

**¿Es gratis o tiene un límite de archivos?**  
Es gratis y no hay límite de archivos ni de veces que puedes usarla. No pedimos registro, correo ni tarjeta, y el PDF que descargas no lleva marca de agua. Como el trabajo lo hace tu propio navegador, tampoco hay cola de espera.

**¿Qué pasa con mis archivos, se suben a un servidor?**  
No se suben. El PDF se abre y se procesa dentro de tu navegador, en tu propio dispositivo, así que nunca viaja por internet ni queda copiado en un servidor nuestro. Por eso puedes usarla con contratos, facturas o documentos personales.

**¿Se pierde calidad al unir o dividir el PDF?**  
No. Las páginas se copian tal cual están: no se vuelven a comprimir ni se convierten en imagen, así que el texto sigue siendo texto y se puede seleccionar y buscar. El archivo final pesa más o menos lo mismo que los originales juntos.

**¿Necesito instalar algún programa o extensión?**  
No. Funciona con el navegador que ya tienes, en Windows, Mac, Linux, Android o iPhone. En celulares con poca memoria, un PDF de cientos de páginas puede tardar bastante o quedarse a mitad de camino; en ese caso conviene usar la computadora.

**¿Puedo unir un PDF protegido con contraseña?**  
No: si el archivo pide contraseña, hay que quitarle esa protección antes de unirlo o dividirlo. Tampoco se conservan las firmas digitales, porque al reorganizar las páginas la firma deja de ser válida y hay que firmar de nuevo el documento final.

## Licencia

Este proyecto se publica bajo la licencia **MIT**. El texto completo está en [LICENSE](LICENSE).

Las dependencias tienen sus propias licencias, listadas en [THIRD-PARTY.md](THIRD-PARTY.md).

## Más herramientas gratuitas

Esta es una de las herramientas gratuitas de SonhoLab. Encuentra el resto, cada una con su repositorio, en https://sonholab.com/es/herramientas.

---

Hecho por Leandro Manuel Perez Montañana.

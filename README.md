# Portafolio Fotográfico

Portfolio de fotografía personal de Germán Ampuero. Construido con Next.js 13, TypeScript y Tailwind CSS.

## Tecnologías

- **Framework**: Next.js 13 (App Router)
- **Lenguaje**: TypeScript (Strict Mode)
- **Estilos**: Tailwind CSS
- **UI Components**: Material UI (MUI)
- **Temas**: next-themes (dark/light mode)
- **Zoom de imágenes**: react-medium-image-zoom
- **Despliegue**: Static Export (GitHub Pages/Cloudflare Pages compatible)

## Arquitectura

```
app/
├── api.tsx          # Cliente API para obtener fotos
├── layout.tsx       # Layout raíz con metadata y fuentes
├── page.tsx         # Página principal (static generation)
├── globals.css      # Estilos globales y Tailwind
components/
├── Photo.tsx        # Componente de foto con lazy loading y zoom
├── TopBar.tsx       # Cabecera del sitio
├── ErrorComponent.tsx # Estado de error
```

## API Contract

El portfolio consume datos de `https://portfolio-api.gadcoder.com/photo/get-all-photos/`

**Respuesta esperada**:
```typescript
interface Photo {
  id: number;
  name: string;
  photo_url: string;
  is_horizontal: boolean;
}
```

**Manejo de errores**: Si la API falla, el componente muestra `ErrorComponent` en lugar de crashear.

## Optimizaciones de Imágenes

- **CDN**: Cloudflare Images con transformación on-the-fly
- **Formatos**: Auto-conversión a WebP/AVIF
- **Lazy loading**: Imágenes fuera del viewport no se cargan
- **Responsive**: srcset para diferentes tamaños de pantalla
- **Skeleton**: Placeholder animado mientras carga
- **Aspect ratio preservado**: Evita layout shift

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción (static export)
npm run lint     # ESLint
```

## Deployment

El proyecto usa `output: 'export'` para generar archivos estáticos en la carpeta `dist/`.

```bash
npm run build
# Los archivos estáticos están en ./dist
```

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

© 2024 Germán Ampuero

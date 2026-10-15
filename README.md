# Ljus

App web mobile-first de reservas entre fotógrafos inmobiliarios y agentes inmobiliarios en Buenos Aires. Hecha con React + Vite sobre Base44.

## Estructura

```
base44/                 # Backend de Base44
├── config.jsonc        # Nombre y build del sitio
├── auth/config.jsonc   # Métodos de ingreso (solo Google)
├── entities/           # Esquemas de datos (un .jsonc por entidad)
└── functions/          # Funciones backend (una carpeta con entry.ts por función)

src/
├── App.jsx             # Rutas y protección por rol
├── api/base44Client.js # Cliente del SDK de Base44
├── lib/AuthContext.jsx # Sesión, rol (fotógrafo / agente / admin)
├── components/         # AppShell (barra inferior), RoleCards, ui/
└── pages/              # Una pantalla por archivo
```

## Desarrollo local

Requiere Node 22 (`nvm use 22`).

```bash
npm install
npx base44 dev            # backend local + frontend
npx base44 dev --remote   # solo frontend contra el backend publicado (datos reales)
```

## Publicar

Solo con OK de Diego:

```bash
npx base44 deploy
```

Las claves y URLs de webhook van en los secretos de Base44 (`npx base44 secrets set`), nunca en el código.

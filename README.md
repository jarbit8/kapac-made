# Kapac Made - Frontend

Proyecto React para el sitio web de Kapac Made.

## Estructura del Proyecto

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Header/
│   │       └── Header.jsx
│   ├── pages/
│   ├── assets/
│   │   ├── images/
│   │   ├── videos/
│   │   └── icons/
│   ├── styles/
│   │   ├── Header.css
│   │   ├── App.css
│   │   └── index.css
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm start
```

La aplicación se abrirá en [http://localhost:3000](http://localhost:3000)

## Build para producción

```bash
npm run build
```

## Notas

- El logo será reemplazado por una animación de video en el futuro
- Las categorías del menú se pueden editar en `src/components/Header/Header.jsx`
- Todos los estilos están modularizados en la carpeta `src/styles/`

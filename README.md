# Hevy Analytics

Dashboard web para analizar tu export de [Hevy](https://www.hevyapp.com/): volumen, 1RM estimado,
récords personales, desglose por grupo muscular y rutina, series fraccionarias y comparación entre periodos.

**Demo online:** https://ikeriribaro-png.github.io/HevyAnalytics/

## Privacidad

Todo se calcula **en tu navegador**. El CSV no se sube a ningún servidor y no hay backend.
(Solo se cargan Tailwind, Chart.js y Font Awesome desde CDN.)

## Uso

1. En la app de Hevy: *Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos*.
2. Abre la web y pulsa **Subir CSV**.

Los datos no se guardan: si recargas la página, hay que volver a subir el CSV.

## Ejecutarlo en local

No hace falta instalar nada. Abre `index.html` en el navegador, o si prefieres un servidor:

```bash
python3 -m http.server 8000
```

y entra en <http://localhost:8000>.

## Publicarlo con GitHub Pages

En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `main` / `(root)` → Save*. En un minuto estará en `https://<usuario>.github.io/<repo>/`.

## Notas

- Las fechas del export se interpretan con meses en español e inglés (`25 nov 2026, 16:57` / `25 Nov 2026, 16:57`). Para otros idiomas, añade los meses en `MONTHS` de `hevy-core.js`.
- Cada ejercicio se asigna a un grupo muscular en `EXERCISE_MUSCLE_MAP` (`hevy-core.js`). Añade los tuyos ahí; los que no estén aparecen como "Otro".
- La interfaz está en español.

## Estructura

```
index.html     interfaz
app.js         gráficos y UI
hevy-core.js   lectura del CSV y cálculo de métricas (en el navegador)
style.css
```

## Licencia

MIT

# Instrucciones para Claude en este repo

## Flujo de publicación (autorizado por el usuario — 2026-08-26)

El usuario autorizó a Claude a publicar cambios de forma **automática**, sin pedir
confirmación en cada ocasión: commit → push a `main` → deploy a Vercel
(`kosmicksk12s-projects/orbitcrm`, ya vinculado vía `.vercel/`). Esta autorización
es permanente para este repo hasta que el usuario diga lo contrario.

Esto NO exime de cuidado — antes de cada push/deploy automático, Claude debe:

1. Correr `npx tsc --noEmit` y `npx next lint` — deben salir limpios.
2. Correr `npx next build` (build de producción, el mismo que corre Vercel) —
   debe compilar sin errores. **Nunca correr `next build` mientras el
   servidor de desarrollo (`next dev`) está activo en este entorno** — corrompe
   la carpeta `.next` y hay que borrarla y reconstruir. Si el dev server está
   corriendo, detenerlo primero (`preview_stop`), correr el build, y luego
   reiniciar el dev server si se sigue necesitando.
3. Si algo falla en cualquiera de los tres pasos: NO hacer push ni deploy.
   Arreglar el problema primero, o si no se puede, avisarle al usuario en vez
   de publicar código roto.
4. Solo si los tres pasos pasan limpio: `git add`, `git commit` con mensaje
   descriptivo, `git push origin main`, y `npx vercel --prod`.
5. Después del deploy, verificar rápido en la URL de producción
   (https://orbitcrm-blond.vercel.app) que no haya errores de consola.

Reglas normales de git siguen aplicando (no force-push, no --no-verify, no
amend de commits ya pusheados, revisar `git status` antes de un `git add`
amplio). El usuario prefiere respuestas en español.

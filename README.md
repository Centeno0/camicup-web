# CamiCup — versión final administrable

Frontend público + panel `/admin` para el torneo CamiCup.

## Comportamiento automático de partidas
- `Programado`: aparece en Próximos encuentros.
- `En vivo`: sube automáticamente al bloque principal y muestra el marcador actual.
- `Finalizado`: desaparece de Próximos y pasa a Resultados recientes.
- La siguiente partida programada se convierte sola en el próximo enfrentamiento.
- Las nuevas fechas se ordenan por fecha y hora sin cambiar código.
- Las partidas finalizadas se conservan como historial; solo se eliminan manualmente desde admin.
- La tabla de puntos se recalcula con partidas finalizadas de la fase Todos contra todos.

## Modo local
Sin variables de Supabase, el proyecto funciona con `localStorage` para pruebas en una sola PC.

```powershell
npm.cmd install
npm.cmd run dev
```

## Modo online / Realtime
Consulta `ONLINE_SETUP.md`.

Con Supabase configurado:
- `/admin` requiere correo y contraseña.
- Guardar y publicar escribe el estado del torneo en Supabase.
- Los espectadores reciben los cambios por Realtime sin recargar.
- Vercel solo aloja la web; no es necesario redesplegar para agregar partidas, fechas o resultados.

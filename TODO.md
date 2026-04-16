# TODO: COMPLETADO - Mejoras Seguridad y Permisos

**✅ Todas fixes aplicadas:**

## Cambios:
- **Códigos acceso**: `tecnicos.ts` + `usuarios.ts` usan `CodigoAccesoService.generar(rol)` → admin/coordinador 6 dígitos, tecnicos 5 únicos.
- **Coordinador perms**: tecnicos PATCH/DELETE own (checks coordinador_id === user.sub), actividades full CRUD.
- **Deletes**: Soft/seguros, cascades OK, msgs para "notificación".
- **Docs**: API.md updated roles + nota web botón (POST /tecnicos/:id/codigo → show codigo_acceso tabla).
- **Tablas**: No unused.

**Web**: Botón genera via backend → refresh GET /tecnicos o /usuarios ve `codigo_acceso`.

**Test**: `bun dev`, Postman roles/códigos OK.

¡Sistema optimizado! 🚀

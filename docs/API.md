# API Campo - Documentación por Rol

**Base:** `https://tu-api.com/api/v1`

## **Admin** (Full access)

**CRUD**: Usuarios, Tecnicos, Beneficiarios, Actividades, Cadenas, Localidades, Zonas, Configs, Templates.
**Recomendación web**: Tabs para cada entidad, search/filter/paginate, modals CRUD, confirm DELETE.

| Endpoint | Method | Desc |
|----------|--------|------|
| /usuarios | GET/POST/PATCH/DELETE | Manage all users |
| /tecnicos | All | Manage technicians |
| ... (all)

## **Coordinador** (Own team)

**CRUD own**:
- Tecnicos (auto-assign)
- Beneficiarios (docs upload)
- Actividades/Localidades/Cadenas (global)
- Asignaciones (team-benef/activ)

**View**:
- Bitacoras/reportes own tecnicos
- Dashboard stats

**Recomendación web**:
- Filter own `coordinador_id`
- Auto-select own coordinador_id create tecnico
- Upload progress bar docs
- Confirm dialogs all DELETE
- Refresh table post-generate code

**Endpoints**:
```
Tecnicos: GET/POST/PATCH/DELETE /tecnicos (own)
POST /tecnicos/:id/codigo → {codigo} show table
Beneficiarios: All /beneficiarios (own tecnico)
Actividades/Localidades/Cadenas: All
Asignaciones: All own tecnico
Dashboard/Bitacoras/Reportes: own
```

**Deletes**: All `{message: "Confirmar? Eliminado"}` → UI modal yes/no.

**Códigos**: Admin/coordinador 6dig, tecnico 5dig auto-unique.

## Implement Web Best Practices
- **Auth**: Store token localStorage, refresh login
- **Roles**: UI hide/disable non-perms
- **CRUD**: Table list, + modal create/edit, trash delete confirm
- **Files**: Drag-drop upload, progress
- **Codes**: Button → API → toast + refresh row codigo_acceso
- **Filters**: Search/date/rol/active dropdowns
- **Paginate**: Infinite scroll or pages
- **Error**: Global toast HTTP 4xx

¡Ready web integration! No tecnico endpoints (mobile?).

# Modelo de datos · Medialuna

Diagrama relacional completo, derivado de `src/db/schema.ts` (nombres de tabla y columna tal como existen en la BD). Si cambia el esquema, actualizar este archivo junto con `pnpm db:generate`.

```mermaid
erDiagram
  perfil ||--o{ usuario : "tiene"
  persona ||--o| usuario : "corresponde a"
  usuario ||--o{ sesion : "abre"
  usuario ||--o{ cuenta : "credencial"

  perfil {
    integer idperfil PK "autoincrement"
    text descripc UK
    integer estado "1 activo, 0 inhabilitado"
  }
  persona {
    text idpersona PK "documento de identidad"
    text nom1
    text nom2 "opcional"
    text apell1
    text apell2 "opcional"
    text direccion "opcional"
    text tele "opcional"
    text movil
    text correo UK
    text fecha_nac "yyyy-MM-dd, opcional"
    integer fecha_autoriza "Ley 1581 art. 9, timestamp ms"
    integer estado "1 activo, 0 inhabilitado"
  }
  usuario {
    text idusuario PK
    text nombreu UK
    text name
    text email UK
    integer email_verified "boolean"
    text image "opcional"
    integer idperfil FK
    text idpersona FK, UK "1 persona = 1 usuario"
    integer estado "1 activo, 0 inhabilitado"
    integer created_at "timestamp ms"
    integer updated_at "timestamp ms"
  }
  sesion {
    text id PK
    text token UK
    text idusuario FK "ON DELETE CASCADE"
    integer expires_at "timestamp ms"
    text ip_address "opcional"
    text user_agent "opcional"
    integer created_at "timestamp ms"
    integer updated_at "timestamp ms"
  }
  cuenta {
    text id PK
    text account_id
    text provider_id
    text idusuario FK "ON DELETE CASCADE"
    text access_token "opcional"
    text refresh_token "opcional"
    text id_token "opcional"
    integer access_token_expires_at "opcional"
    integer refresh_token_expires_at "opcional"
    text scope "opcional"
    text contrasena "hash scrypt"
    integer created_at "timestamp ms"
    integer updated_at "timestamp ms"
  }
  verificacion {
    text id PK
    text identifier "sin FK: enlace por valor"
    text value "hash del token"
    integer expires_at "timestamp ms"
    integer created_at "timestamp ms"
    integer updated_at "timestamp ms"
  }
```

Notas:
- `usuario` es la tabla `user` de Better Auth; `sesion`, `cuenta` y `verificacion` también son suyas.
- `verificacion` no tiene clave foránea: se relaciona con el usuario por valor (`identifier` con formato `<tipo>:<idusuario>:<correo>`), por eso aparece aislada.
- Borrado lógico: perfil, persona y usuario se inhabilitan con `estado = 0`; el `ON DELETE CASCADE` solo aplica a `sesion` y `cuenta`.

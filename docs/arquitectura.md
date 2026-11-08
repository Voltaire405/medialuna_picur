# Arquitectura · Medialuna MVP (Parcial I)

Alcance: Acceso al sistema, menú y CRUD de **Perfil**, **Usuario** y **Persona** con borrado lógico. El tema (mercado campesino digital con agente en WhatsApp) se refleja en el panel; catálogo, pedidos y agente (RF03–RF13 de la propuesta) quedan para etapas posteriores.

## Estilo: monolito modular en capas (Next.js App Router)

Un solo despliegue. La UI nunca toca la BD: todo pasa por *Server Actions* que validan sesión, permiso y datos. Es la arquitectura mínima adecuada para un MVP de CRUD con autenticación; se separa en capas para poder extraerla luego (p. ej. el agente de WhatsApp como servicio aparte).

```mermaid
flowchart LR
  subgraph Cliente
    UI["Páginas + componentes React<br/>(LoginForm, RegistroForm, GestionForm)"]
  end
  subgraph Servidor["Next.js 16 (servidor)"]
    PX["proxy.ts<br/>filtro por cookie"]
    SA["Server Actions<br/>actions/auth·perfil·usuario·persona"]
    DOM["Dominio en lib/<br/>permisos · validators(zod) · acceso · usuarios · personas"]
    BA["Better Auth<br/>sesión + hash + plugin username"]
    ORM["Drizzle ORM"]
  end
  DB[("Turso / libsql")]
  MAIL["Resend<br/>(correo)"]

  UI --> PX --> SA
  SA --> DOM
  DOM --> BA --> ORM
  DOM --> ORM --> DB
  SA --> MAIL
```

| Capa | Responsabilidad | Ubicación |
|---|---|---|
| Presentación | Formularios, tabla, mensajes; sin lógica de negocio | `src/app`, `src/components` |
| Aplicación | Autoriza (`exigir`), valida, orquesta y traduce errores a mensajes | `src/actions` |
| Dominio | Matriz de permisos, validaciones, reglas de acceso y de usuarios | `src/lib` |
| Infraestructura | Esquema, cliente BD, migraciones, correo | `src/db`, `drizzle/`, `src/lib/mail.ts` |

## Modelo de datos

El modelo del parcial (`perfil`, `usuario`, `persona`) se respeta tal cual. Better Auth exige `sesion`, `cuenta` y `verificacion`; su tabla `user` **es** `usuario` (mapeada por nombre de columna), con `idperfil`, `idpersona` y `estado` como campos adicionales.

```mermaid
erDiagram
  perfil ||--o{ usuario : "tiene"
  persona ||--o| usuario : "corresponde a"
  usuario ||--o{ sesion : "abre"
  usuario ||--o{ cuenta : "credencial"

  perfil {
    int idperfil PK
    text descripc UK
    int estado "1 activo, 0 inhabilitado"
  }
  persona {
    text idpersona PK "documento"
    text nom1
    text nom2
    text apell1
    text apell2
    text direccion
    text tele
    text movil
    text correo UK
    text fecha_nac
    int estado
  }
  usuario {
    text idusuario PK
    text nombreu UK
    int idperfil FK
    text idpersona FK,UK "1 persona = 1 usuario"
    text email "copia de persona.correo"
    int estado
  }
  cuenta {
    text id PK
    text idusuario FK
    text contrasena "hash scrypt"
  }
  sesion {
    text id PK
    text idusuario FK
    text token UK
  }
```

Decisiones de datos:
- **Borrado lógico**: Inhabilitar es `UPDATE estado = 0`; no existe ningún `DELETE` sobre perfil/usuario/persona. Una sesión deja de ser válida si usuario, perfil o persona están inhabilitados (se relee la BD en cada petición).
- **Contraseña**: `usuario.contrasena` del diagrama del parcial se guarda **hasheada** en `cuenta.contrasena` (Better Auth). Nunca en claro.
- **1:1**: `usuario.idpersona` es `UNIQUE`; `crearUsuario` además lo valida con mensaje claro.

## Acceso al sistema

```mermaid
sequenceDiagram
  actor U as Usuario
  participant F as LoginForm
  participant A as actions/auth.ingresar
  participant V as lib/acceso.validarAcceso
  participant B as Better Auth
  participant D as BD

  U->>F: usuario + contraseña
  F->>A: FormData
  A->>V: validar
  V->>D: usuario, perfil, persona
  alt vacío / no existe / inhabilitado
    V-->>F: mensaje específico
  else válido
    A->>B: signInUsername
    alt contraseña incorrecta
      B-->>F: "La contraseña es incorrecta"
    else correcta
      B-->>U: cookie de sesión → redirect al panel (menú según perfil)
    end
  end
```

## Recuperación de usuario y contraseña

El hash no es reversible, por lo que no se puede reenviar la contraseña actual: se envía el **usuario** y una **contraseña temporal** nueva.

```mermaid
sequenceDiagram
  actor U as Usuario
  participant A as actions/auth.recuperar
  participant D as BD
  participant R as Resend

  U->>A: identificación o correo
  A->>D: persona → usuario activo
  alt no existe
    A-->>U: "El usuario no se encuentra registrado"
  else existe
    A->>A: enfriamiento 60 s, genera temporal
    A->>R: correo con usuario + temporal
    A->>D: actualiza hash, cierra sesiones (solo si el correo salió)
    A-->>U: "Su usuario y contraseña fue enviado al correo registrado"
  end
```

Sin `RESEND_API_KEY` el correo se imprime en consola (solo desarrollo).

## Permisos (matriz del parcial)

Se aplican **en servidor** (`exigir` en cada action, `exigirPagina` en cada página); ocultar botones es solo UX.

| Gestión | Crear | Consultar | Modificar | Inhabilitar |
|---|:-:|:-:|:-:|:-:|
| Perfil | Admin | Admin | Admin | Admin |
| Usuario | Admin | Admin | Admin | Admin |
| Persona | Todos | Todos* | Todos* | Admin |

Guardar es el envío de Crear/Modificar y Salir es navegación: no son permisos propios.

\* Un perfil no administrador solo ve y modifica **su propia** persona. Administrador = `idperfil = 1` (sembrado, no modificable ni inhabilitable). El registro público (`/registro`) crea persona + usuario con perfil elegido entre los no administradores.

## Despliegue y configuración

Variables en `.env.example`. Local: `file:local.db` (mismo driver libsql); producción: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Migraciones versionadas en `drizzle/` (`pnpm db:migrate`), datos mínimos con `pnpm db:seed`.

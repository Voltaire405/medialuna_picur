import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

// BD temporal con las migraciones reales; el módulo db lee el entorno al importarse.
process.env.TURSO_DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "medialuna-")), "test.db")}`;
process.env.BETTER_AUTH_SECRET = "x".repeat(32);
process.env.BETTER_AUTH_URL = "http://localhost:3000";

const cargar = async () => ({
  ...(await import("@/db")),
  ...(await import("@/db/schema")),
  ...(await import("@/lib/acceso")),
  ...(await import("@/lib/usuarios")),
  ...(await import("@/lib/personas")),
  auth: (await import("@/lib/auth")).auth,
  acciones: await import("@/actions/auth"),
});
let m: Awaited<ReturnType<typeof cargar>>;

const persona = (id: string) => ({ idpersona: id, nom1: "Ana", nom2: null, apell1: "Ruiz", apell2: null, direccion: null, tele: null, movil: "3001234567", correo: `${id}@mail.com`, fecha_nac: null });

beforeAll(async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  m = await cargar();
  await migrate(m.db, { migrationsFolder: "drizzle" });
  await m.db.insert(m.perfil).values([{ idperfil: 1, descripc: "Administrador" }, { idperfil: 2, descripc: "Productor" }]);
  await m.crearPersona(persona("11111"));
  await m.crearPersona(persona("22222"));
  await m.crearUsuario({ nombreu: "ana", contrasena: "clave1234", idperfil: 2, idpersona: "11111" });
});

describe("acceso al sistema", () => {
  it("campos vacíos", async () => {
    expect(await m.validarAcceso("", "x")).toBe(m.MSG.vacioUsuario);
    expect(await m.validarAcceso("ana", "")).toBe(m.MSG.vacioClave);
  });
  it("usuario no registrado", async () => expect(await m.validarAcceso("nadie", "x")).toBe(m.MSG.noRegistrado));
  it("usuario activo pasa; inhabilitado se rechaza (borrado lógico)", async () => {
    expect(await m.validarAcceso("ana", "clave1234")).toBeNull();
    await m.db.update(m.user).set({ estado: 0 }).where(eq(m.user.username, "ana"));
    expect(await m.validarAcceso("ana", "clave1234")).toBe(m.MSG.inhabilitado);
    expect(await m.db.select().from(m.user).where(eq(m.user.username, "ana"))).toHaveLength(1); // la fila sigue
    await m.db.update(m.user).set({ estado: 1 }).where(eq(m.user.username, "ana"));
  });
  it("perfil inhabilitado bloquea el acceso", async () => {
    await m.db.update(m.perfil).set({ estado: 0 }).where(eq(m.perfil.idperfil, 2));
    expect(await m.validarAcceso("ana", "clave1234")).toBe(m.MSG.inhabilitado);
    await m.db.update(m.perfil).set({ estado: 1 }).where(eq(m.perfil.idperfil, 2));
  });
});

describe("usuarios", () => {
  it("una persona solo puede tener un usuario", async () => {
    await expect(m.crearUsuario({ nombreu: "otra", contrasena: "clave1234", idperfil: 2, idpersona: "11111" })).rejects.toThrow(/ya tiene un usuario/);
  });
  it("nombre de usuario único", async () => {
    await expect(m.crearUsuario({ nombreu: "ana", contrasena: "clave1234", idperfil: 2, idpersona: "22222" })).rejects.toThrow(/en uso/);
  });
  it("persona duplicada por identificación o correo", async () => {
    await expect(m.crearPersona(persona("11111"))).rejects.toThrow(/identificación/);
    await expect(m.crearPersona({ ...persona("33333"), correo: "11111@mail.com" })).rejects.toThrow(/correo/);
  });
  it("cambiar contraseña (recuperación) invalida la anterior", async () => {
    const [u] = await m.db.select().from(m.user).where(eq(m.user.username, "ana"));
    await m.cambiarContrasena(u.id, "temporal-99");
    await expect(m.auth.api.signInUsername({ body: { username: "ana", password: "clave1234" } })).rejects.toThrow();
    const r = await m.auth.api.signInUsername({ body: { username: "ana", password: "temporal-99" } });
    expect(r.user.id).toBe(u.id);
  });
});

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("recuperación de usuario y contraseña", () => {
  it("usuario no registrado", async () => {
    const r = await m.acciones.recuperar(null, fd({ identificador: "99999" }));
    expect(r).toEqual({ ok: false, mensaje: "El usuario no se encuentra registrado" });
  });
  it("campo vacío", async () => {
    expect((await m.acciones.recuperar(null, fd({ identificador: " " }))).ok).toBe(false);
  });
  it("envía usuario y contraseña temporal al correo; la temporal sirve para ingresar; hay enfriamiento", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const r = await m.acciones.recuperar(null, fd({ identificador: "11111@MAIL.com" }));
    expect(r).toEqual({ ok: true, mensaje: "Su usuario y contraseña fue enviado al correo registrado" });
    const correo = String(log.mock.calls.at(-1)?.[0]);
    log.mockRestore();
    expect(correo).toContain("Para: 11111@mail.com");
    const temporal = /Contraseña temporal: (\S+)/.exec(correo)![1];
    const s = await m.auth.api.signInUsername({ body: { username: "ana", password: temporal } });
    expect(s.user.id).toBeTruthy();
    expect((await m.acciones.recuperar(null, fd({ identificador: "11111" }))).ok).toBe(false);
  });
  it("si el correo falla, la contraseña vigente se conserva y se puede reintentar", async () => {
    await m.crearUsuario({ nombreu: "bruno", contrasena: "clave1234", idperfil: 2, idpersona: "22222" });
    process.env.RESEND_API_KEY = "x";
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchFalla = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    const r = await m.acciones.recuperar(null, fd({ identificador: "22222@mail.com" }));
    fetchFalla.mockRestore();
    err.mockRestore();
    delete process.env.RESEND_API_KEY;
    expect(r.ok).toBe(false);
    expect(await m.validarAcceso("bruno", "clave1234")).toBeNull();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect((await m.acciones.recuperar(null, fd({ identificador: "22222@mail.com" }))).ok).toBe(true);
    log.mockRestore();
  });
});

describe("registro público", () => {
  const base = { idpersona: "44444", nom1: "Luis", apell1: "Gil", movil: "3109876543", correo: "luis@mail.com", nombreu: "luis", contrasena: "clave1234", idperfil: "2", autoriza: "on" };
  it("exige autorización de datos", async () => {
    expect((await m.acciones.registrar(null, fd({ ...base, autoriza: "" }))).mensaje).toMatch(/Ley 1581/);
  });
  it("no permite elegir el perfil Administrador", async () => {
    expect((await m.acciones.registrar(null, fd({ ...base, idperfil: "1" }))).ok).toBe(false);
  });
  it("crea persona + usuario y no deja persona huérfana si el usuario es inválido", async () => {
    const mal = await m.acciones.registrar(null, fd({ ...base, nombreu: "ana" })); // usuario ya en uso
    expect(mal.ok).toBe(false);
    expect(await m.db.select().from(m.persona).where(eq(m.persona.idpersona, "44444"))).toHaveLength(0);
    const bien = await m.acciones.registrar(null, fd(base));
    expect(bien.ok).toBe(true);
    expect(await m.validarAcceso("luis", "clave1234")).toBeNull();
  });
});

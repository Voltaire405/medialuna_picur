import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

// DNS determinista: todo dominio recibe correo.
vi.mock("node:dns/promises", () => ({ resolveMx: async (d: string) => [{ exchange: `mx.${d}`, priority: 1 }] }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// La sesión se simula, pero el permiso se decide con la matriz real.
type Actor = { idusuario: string; idpersona: string; idperfil: number; esAdmin: boolean };
const sesion = vi.hoisted(() => ({ actual: null as Actor | null }));
vi.mock("@/lib/session", async () => {
  const { puede } = await import("@/lib/permisos");
  const { ErrorNegocio } = await import("@/lib/errores");
  return {
    getUsuario: async () => sesion.actual,
    exigir: async (gestion: Parameters<typeof puede>[1], accion: Parameters<typeof puede>[2]) => {
      if (!sesion.actual || !puede(sesion.actual.idperfil, gestion, accion)) throw new ErrorNegocio("No tiene permiso para esta acción");
      return sesion.actual;
    },
  };
});

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
  ...(await import("@/lib/productos")),
  ...(await import("@/lib/roles")),
  acciones: {
    ...(await import("@/actions/rol")),
    ...(await import("@/actions/categoria")),
    ...(await import("@/actions/producto")),
    ...(await import("@/actions/persona")),
    ...(await import("@/actions/perfil")),
  },
});
let m: Awaited<ReturnType<typeof cargar>>;

const fd = (o: Record<string, string | File>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const imagen = (bytes: number[] | Uint8Array = PNG, nombre = "foto.png") => new File([new Uint8Array(bytes)], nombre, { type: "image/png" });

const datosRol = (id: string, nombreu: string) => ({
  idpersona: id,
  nom1: "Rosa",
  apell1: "Giraldo",
  movil: "3101234567",
  direccion: "Vereda El Chagualo, Marinilla",
  fecha_nac: "1980-05-20",
  correo: `${nombreu}@mail.com`,
  nombreu,
  contrasena: "clave1234",
});
const huevos = { codigo: "hue-001", nombre: "Huevos criollos", codigotp: "HUE", precio_venta: "18000", empaque_unidades: "30", descuento: "10" };

const como = async (nombreu: string) => {
  const [u] = await m.db.select().from(m.user).where(eq(m.user.username, nombreu));
  sesion.actual = { idusuario: u.id, idpersona: u.idpersona, idperfil: u.idperfil, esAdmin: u.idperfil === 1 };
};
const publicados = async () => (await m.listarProductos({ soloPublicados: true })).map((p) => p.codigo);

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined); // correos simulados
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  m = await cargar();
  await migrate(m.db, { migrationsFolder: "drizzle" });
  await m.db.insert(m.perfil).values([
    { idperfil: 1, descripc: "Administrador" },
    { idperfil: 2, descripc: "Productor" },
    { idperfil: 3, descripc: "Comprador" },
  ]);
  await m.crearPersona({ idpersona: "10000", nom1: "Admin", apell1: "Medialuna", movil: "3000000000", correo: "admin@mail.com" });
  await m.crearUsuario({ nombreu: "admin", contrasena: "clave1234", idperfil: 1, idpersona: "10000" });
  await como("admin");
});

describe("HU-03 categorías", () => {
  it("crea con estado activo y código en mayúscula; no repite código ni descripción", async () => {
    expect((await m.acciones.guardarCategoria("crear", fd({ codigotp: "hue", descripcion: "Huevos" }))).ok).toBe(true);
    const [c] = await m.db.select().from(m.categoria);
    expect(c).toEqual({ codigotp: "HUE", descripcion: "Huevos", estado: 1 });
    expect((await m.acciones.guardarCategoria("crear", fd({ codigotp: "HUE", descripcion: "Otra" }))).errores?.codigotp).toMatch(/ese código/);
    expect((await m.acciones.guardarCategoria("crear", fd({ codigotp: "HU2", descripcion: "huevos" }))).errores?.descripcion).toMatch(/esa descripción/);
  });
  it("campos vacíos: «Campo requerido» en cada uno", async () => {
    const r = await m.acciones.guardarCategoria("crear", fd({ codigotp: "", descripcion: "" }));
    expect(r.errores).toEqual({ codigotp: "Campo requerido", descripcion: "Campo requerido" });
  });
  it("consulta por código o por parte de la descripción", async () => {
    expect((await m.acciones.consultarCategoria("hue")).filas).toHaveLength(1);
    expect((await m.acciones.consultarCategoria("uev")).filas?.[0].codigotp).toBe("HUE");
    expect((await m.acciones.consultarCategoria("zzz")).ok).toBe(false);
  });
});

describe("HU-01 productores y HU-02 compradores", () => {
  it("el administrador crea al productor: persona + usuario con perfil Productor, activo", async () => {
    const r = await m.acciones.guardarProductor("crear", fd(datosRol("43000111", "rosa")));
    expect(r.ok).toBe(true);
    const [u] = await m.db.select().from(m.user).where(eq(m.user.username, "rosa"));
    expect(u).toMatchObject({ idperfil: 2, idpersona: "43000111", estado: 1 });
    expect(await m.listarRol("productor")).toMatchObject([{ idpersona: "43000111", productos: 0, estado: 1 }]);
  });
  it("no repite documento ni correo, y exige mayoría de edad", async () => {
    expect((await m.acciones.guardarProductor("crear", fd(datosRol("43000111", "rosa2")))).errores?.idpersona).toMatch(/identificación/);
    expect((await m.acciones.guardarProductor("crear", fd({ ...datosRol("43000222", "rosa3"), correo: "rosa@mail.com" }))).errores?.correo).toMatch(/correo/);
    const menor = await m.acciones.guardarProductor("crear", fd({ ...datosRol("43000333", "rosa4"), fecha_nac: new Date().toISOString().slice(0, 10) }));
    expect(menor.errores?.fecha_nac).toMatch(/mayor de 18/);
    expect(await m.db.select().from(m.persona).where(eq(m.persona.idpersona, "43000333"))).toHaveLength(0);
  });
  it("todos los obligatorios vacíos se informan a la vez", async () => {
    const r = await m.acciones.guardarProductor("crear", fd({ nombreu: "", contrasena: "" }));
    expect(Object.keys(r.errores ?? {}).sort()).toEqual(["apell1", "contrasena", "correo", "direccion", "fecha_nac", "idpersona", "movil", "nom1", "nombreu"]);
  });
  it("consulta por documento, nombre o apellido; modifica sin tocar el documento ni el teléfono fijo", async () => {
    expect((await m.acciones.consultarProductor("giral")).filas).toHaveLength(1);
    expect((await m.acciones.consultarProductor("43000111")).filas).toHaveLength(1);
    await m.db.update(m.persona).set({ tele: "6041234" }).where(eq(m.persona.idpersona, "43000111"));
    const r = await m.acciones.guardarProductor("modificar", fd({ ...datosRol("43000111", "rosa"), direccion: "Vereda La Peña" }));
    expect(r.ok).toBe(true);
    const [p] = await m.db.select().from(m.persona).where(eq(m.persona.idpersona, "43000111"));
    expect(p).toMatchObject({ direccion: "Vereda La Peña", tele: "6041234" });
  });
  it("comprador: lo crea el administrador con dirección obligatoria; no aparece entre los productores", async () => {
    expect((await m.acciones.guardarComprador("crear", fd({ ...datosRol("70111222", "carlos"), direccion: "" }))).errores?.direccion).toBe("Campo requerido");
    expect((await m.acciones.guardarComprador("crear", fd(datosRol("70111222", "carlos")))).ok).toBe(true);
    expect(await m.listarRol("comprador")).toHaveLength(1);
    expect(await m.listarRol("productor")).toHaveLength(1);
    expect((await m.acciones.inhabilitarProductor("70111222", 0)).mensaje).toMatch(/No existe un productor/);
  });
  it("un productor no entra a las gestiones del administrador", async () => {
    await como("rosa");
    expect((await m.acciones.guardarProductor("crear", fd(datosRol("43000999", "intruso")))).mensaje).toMatch(/No tiene permiso/);
    expect((await m.acciones.guardarCategoria("crear", fd({ codigotp: "XXX", descripcion: "Intrusa" }))).mensaje).toMatch(/No tiene permiso/);
    await como("admin");
  });
});

describe("HU-04 productos y catálogo", () => {
  it("el productor crea su producto con imagen; queda activo, asociado a su documento y publicado", async () => {
    await como("rosa");
    expect((await m.acciones.guardarProducto("crear", fd({ ...huevos, imagen: imagen() }))).ok).toBe(true);
    const [p] = await m.listarProductos();
    expect(p).toMatchObject({ codigo: "HUE-001", idproductor: "43000111", categoria: "Huevos", descuento: 10, estado: 1, imagen: "/imagen/HUE-001?v=8" });
    expect(p.precio_final.replace(/\D/g, "")).toBe("16200");
    expect(await publicados()).toEqual(["HUE-001"]);
  });
  it("valida imagen, código repetido y categoría", async () => {
    const crear = (cambios: Record<string, string | File>) => m.acciones.guardarProducto("crear", fd({ ...huevos, codigo: "HUE-002", imagen: imagen(), ...cambios }));
    expect((await m.acciones.guardarProducto("crear", fd({ ...huevos, codigo: "HUE-002" }))).errores?.imagen).toBe("Campo requerido");
    expect((await crear({ imagen: imagen([0x25, 0x50, 0x44, 0x46], "factura.png") })).errores?.imagen).toMatch(/JPG o PNG/);
    expect((await crear({ imagen: imagen(new Uint8Array(m.MAX_IMAGEN + 1)) })).errores?.imagen).toMatch(/2 MB/);
    expect((await crear({ codigo: "hue-001" })).errores?.codigo).toMatch(/ese código/);
    expect((await crear({ codigotp: "NOEXISTE" })).errores?.codigotp).toMatch(/categoría/);
    expect(await m.listarProductos()).toHaveLength(1);
  });
  it("modifica sin imagen nueva y conserva la anterior", async () => {
    expect((await m.acciones.guardarProducto("modificar", fd({ ...huevos, descuento: "" }))).ok).toBe(true);
    const [p] = await m.listarProductos();
    expect(p).toMatchObject({ descuento: 0, imagen: "/imagen/HUE-001?v=8" });
  });
  it("solo el dueño modifica o inhabilita; el comprador no gestiona productos", async () => {
    await como("admin");
    await m.acciones.guardarProductor("crear", fd({ ...datosRol("43000444", "pedro"), nom1: "Pedro" }));
    await como("pedro");
    expect((await m.acciones.guardarProducto("modificar", fd({ ...huevos, nombre: "Robado" }))).mensaje).toMatch(/no le pertenece/);
    expect((await m.acciones.inhabilitarProducto("HUE-001", 0)).mensaje).toMatch(/no le pertenece/);
    expect((await m.acciones.consultarProducto("hue")).ok).toBe(false);
    await como("carlos");
    expect((await m.acciones.guardarProducto("crear", fd({ ...huevos, codigo: "HUE-009", imagen: imagen() }))).mensaje).toMatch(/No tiene permiso/);
    expect((await m.listarProductos())[0].nombre).toBe("Huevos criollos");
  });
  it("el catálogo oculta el producto inhabilitado y el del productor inhabilitado, que además no ingresa", async () => {
    await como("admin");
    expect((await m.acciones.guardarProducto("crear", fd({ ...huevos, codigo: "ADM-001", imagen: imagen() }))).mensaje).toMatch(/No tiene permiso/);
    expect((await m.acciones.inhabilitarProducto("HUE-001", 0)).ok).toBe(true);
    expect(await publicados()).toEqual([]);
    expect((await m.acciones.inhabilitarProducto("HUE-001", 1)).ok).toBe(true);

    expect((await m.acciones.inhabilitarProductor("43000111", 0)).ok).toBe(true);
    expect(await publicados()).toEqual([]);
    expect(await m.validarAcceso("rosa", "clave1234")).toBe(m.MSG.inhabilitado);
    expect((await m.acciones.inhabilitarProductor("43000111", 1)).ok).toBe(true);
    expect(await publicados()).toEqual(["HUE-001"]);
  });
});

describe("no se inhabilita lo que tiene información dependiente", () => {
  it("categoría con productos activos", async () => {
    const r = await m.acciones.inhabilitarCategoria("HUE", 0);
    expect(r).toMatchObject({ ok: false, mensaje: "No se puede inhabilitar la categoría: existe información dependiente (1 producto activo)" });
    await m.acciones.inhabilitarProducto("HUE-001", 0);
    expect((await m.acciones.inhabilitarCategoria("HUE", 0)).ok).toBe(true);
    expect((await m.acciones.inhabilitarProducto("HUE-001", 1)).mensaje).toMatch(/categoría del producto está inhabilitada/);
    await m.acciones.inhabilitarCategoria("HUE", 1);
    expect((await m.acciones.inhabilitarProducto("HUE-001", 1)).ok).toBe(true);
  });
  it("persona con usuario activo, y no se rehabilita el usuario de una persona inhabilitada", async () => {
    expect((await m.acciones.inhabilitarPersona("70111222", 0)).mensaje).toMatch(/existe información dependiente \(su usuario «carlos» está activo/);
    expect((await m.acciones.inhabilitarComprador("70111222", 0)).ok).toBe(true);
    expect((await m.acciones.inhabilitarPersona("70111222", 0)).ok).toBe(true);
    expect((await m.acciones.inhabilitarComprador("70111222", 1)).mensaje).toMatch(/su persona está inhabilitada/);
    await m.acciones.inhabilitarPersona("70111222", 1);
    expect((await m.acciones.inhabilitarComprador("70111222", 1)).ok).toBe(true);
  });
  it("perfil con usuarios activos", async () => {
    const [nuevo] = await m.db.insert(m.perfil).values({ descripc: "Asociación" }).returning();
    await m.db.update(m.user).set({ idperfil: nuevo.idperfil }).where(eq(m.user.username, "pedro"));
    expect((await m.acciones.inhabilitarPerfil(String(nuevo.idperfil), 0)).mensaje).toMatch(/existe información dependiente \(1 usuario activo/);
    await m.db.update(m.user).set({ idperfil: 2 }).where(eq(m.user.username, "pedro"));
    expect((await m.acciones.inhabilitarPerfil(String(nuevo.idperfil), 0)).ok).toBe(true);
  });
});

describe("mis datos", () => {
  it("el productor modifica solo su persona aunque el formulario traiga otro documento", async () => {
    await como("rosa");
    const r = await m.acciones.guardarMisDatos("modificar", fd({ ...datosRol("70111222", "rosa"), nom1: "Rosalba" }));
    expect(r.ok).toBe(true);
    const nombres = Object.fromEntries((await m.db.select().from(m.persona)).map((p) => [p.idpersona, p.nom1]));
    expect(nombres).toMatchObject({ "43000111": "Rosalba", "70111222": "Rosa" });
  });
  it("el administrador no tiene «Mis datos»", async () => {
    await como("admin");
    expect((await m.acciones.guardarMisDatos("modificar", fd(datosRol("10000", "admin")))).mensaje).toMatch(/No tiene permiso/);
  });
});

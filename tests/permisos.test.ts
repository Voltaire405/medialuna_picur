import { describe, expect, it } from "vitest";
import { menuDe } from "@/lib/menu";
import { ADMIN_PERFIL, COMPRADOR_PERFIL, esPerfilSistema, PRODUCTOR_PERFIL, puede } from "@/lib/permisos";
import { categoriaSchema, compradorSchema, personaSchema, productorSchema, productoSchema } from "@/lib/validators";

const ACCIONES = ["crear", "consultar", "modificar", "inhabilitar"] as const;
const SOLO_ADMIN = ["perfil", "usuario", "persona", "productor", "comprador", "categoria"] as const;
const PERFIL_NUEVO = 4;

describe("matriz de permisos", () => {
  it("las gestiones administrativas son exclusivas del administrador", () => {
    for (const g of SOLO_ADMIN)
      for (const a of ACCIONES) {
        expect(puede(ADMIN_PERFIL, g, a)).toBe(true);
        for (const otro of [PRODUCTOR_PERFIL, COMPRADOR_PERFIL, PERFIL_NUEVO]) expect(puede(otro, g, a)).toBe(false);
      }
  });
  it("producto: el productor hace todo el CRUD; el administrador solo consulta e inhabilita; el comprador nada", () => {
    for (const a of ACCIONES) {
      expect(puede(PRODUCTOR_PERFIL, "producto", a)).toBe(true);
      expect(puede(COMPRADOR_PERFIL, "producto", a)).toBe(false);
    }
    expect(ACCIONES.filter((a) => puede(ADMIN_PERFIL, "producto", a))).toEqual(["consultar", "inhabilitar"]);
  });
});

describe("menú por perfil", () => {
  const rutas = (idperfil: number) => menuDe({ idperfil, esAdmin: idperfil === ADMIN_PERFIL }).map((o) => o.href);
  it("el administrador carga todas las gestiones", () => {
    expect(rutas(ADMIN_PERFIL)).toEqual(["/perfil", "/usuario", "/persona", "/productor", "/comprador", "/categoria", "/producto", "/catalogo", "/contrasena"]);
  });
  it("el productor ve sus productos; el comprador solo catálogo y sus datos", () => {
    expect(rutas(PRODUCTOR_PERFIL)).toEqual(["/producto", "/catalogo", "/mis-datos", "/contrasena"]);
    expect(rutas(COMPRADOR_PERFIL)).toEqual(["/catalogo", "/mis-datos", "/contrasena"]);
  });
});

describe("perfiles del sistema", () => {
  it("Administrador, Productor y Comprador están protegidos; un perfil nuevo no", () => {
    expect([1, 2, 3].every(esPerfilSistema)).toBe(true);
    expect(esPerfilSistema(PERFIL_NUEVO)).toBe(false);
  });
});

const mensajes = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).reverse().map((i) => [i.path[0], i.message]));

describe("validación de persona", () => {
  const ok = { idpersona: "1037369405", nom1: "Ana", apell1: "Ruiz", movil: "3001234567", correo: "ANA@mail.com" };
  it("acepta datos válidos y normaliza", () => {
    const p = personaSchema.parse({ ...ok, nom2: "", tele: "", fecha_nac: "", direccion: "" });
    expect(p.correo).toBe("ana@mail.com");
    expect(p.nom2).toBeNull();
  });
  it.each([
    [{ movil: "2001234567" }, "movil", /celular/],
    [{ correo: "no-es-correo" }, "correo", /correo/],
    [{ idpersona: "12ab" }, "idpersona", /identificación/],
    [{ nom1: "  " }, "nom1", /Campo requerido/],
    [{ fecha_nac: "2999-01-01" }, "fecha_nac", /fecha/],
  ])("rechaza %j", (cambio, campo, msg) => {
    expect(mensajes(personaSchema.safeParse({ ...ok, ...cambio }))[campo]).toMatch(msg);
  });
  it("cada campo obligatorio vacío responde «Campo requerido»", () => {
    expect(mensajes(personaSchema.safeParse({}))).toMatchObject({
      idpersona: "Campo requerido",
      nom1: "Campo requerido",
      apell1: "Campo requerido",
      movil: "Campo requerido",
      correo: "Campo requerido",
    });
  });
});

describe("validación de productor y comprador", () => {
  const ok = { idpersona: "43000111", nom1: "Rosa", apell1: "Giraldo", movil: "3101234567", correo: "rosa@mail.com", direccion: "Vereda El Chagualo", fecha_nac: "1980-05-20" };
  const hace = (anios: number, dias = 0) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - anios);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  it("dirección, fecha de nacimiento y correo son obligatorios", () => {
    for (const esquema of [productorSchema, compradorSchema])
      expect(mensajes(esquema.safeParse({ ...ok, direccion: "", fecha_nac: "", correo: "" }))).toMatchObject({
        direccion: "Campo requerido",
        fecha_nac: "Campo requerido",
        correo: "Campo requerido",
      });
  });
  it("el productor debe ser mayor de 18 años; el comprador no tiene esa regla", () => {
    expect(productorSchema.safeParse({ ...ok, fecha_nac: hace(18) }).success).toBe(true);
    expect(mensajes(productorSchema.safeParse({ ...ok, fecha_nac: hace(18, 2) })).fecha_nac).toMatch(/mayor de 18/);
    expect(compradorSchema.safeParse({ ...ok, fecha_nac: hace(18, 2) }).success).toBe(true);
  });
  it("no conserva el teléfono fijo: el formulario del rol no debe borrarlo de la persona", () => {
    expect(productorSchema.parse({ ...ok, tele: "6041234" })).not.toHaveProperty("tele");
  });
});

describe("validación de categoría y producto", () => {
  const ok = { codigo: "hue-001", nombre: "Huevos criollos", codigotp: "HUE", precio_venta: "18000", empaque_unidades: "30", descuento: "" };
  it("normaliza códigos a mayúscula y el descuento vacío a 0", () => {
    expect(categoriaSchema.parse({ codigotp: " fru ", descripcion: " Frutas " })).toEqual({ codigotp: "FRU", descripcion: "Frutas" });
    expect(productoSchema.parse(ok)).toMatchObject({ codigo: "HUE-001", precio_venta: 18000, empaque_unidades: 30, descuento: 0 });
  });
  it.each([
    [{ precio_venta: "0" }, "precio_venta", /mayor que cero/],
    [{ precio_venta: "12.5" }, "precio_venta", /números enteros/],
    [{ empaque_unidades: "0" }, "empaque_unidades", /mayor que cero/],
    [{ descuento: "101" }, "descuento", /entre 0 y 100/],
    [{ descuento: "1x" }, "descuento", /números enteros/],
    [{ codigo: "a b" }, "codigo", /3 a 15/],
    [{ nombre: "" }, "nombre", /Campo requerido/],
    [{ codigotp: "" }, "codigotp", /Campo requerido/],
  ])("rechaza %j", (cambio, campo, msg) => {
    expect(mensajes(productoSchema.safeParse({ ...ok, ...cambio }))[campo]).toMatch(msg);
  });
});

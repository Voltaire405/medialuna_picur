import { describe, expect, it } from "vitest";
import { esPerfilSistema, puede } from "@/lib/permisos";
import { personaSchema } from "@/lib/validators";

describe("matriz de permisos", () => {
  it("administrador puede todo", () => {
    for (const g of ["perfil", "usuario", "persona"] as const)
      for (const a of ["crear", "consultar", "modificar", "inhabilitar"] as const)
        expect(puede(true, g, a)).toBe(true);
  });
  it("los perfiles no administradores no gestionan nada, tampoco Persona", () => {
    for (const g of ["perfil", "usuario", "persona"] as const)
      for (const a of ["crear", "consultar", "modificar", "inhabilitar"] as const)
        expect(puede(false, g, a)).toBe(false);
  });
});

describe("perfiles del sistema", () => {
  it("Administrador, Productor y Comprador están protegidos; un perfil nuevo no", () => {
    expect([1, 2, 3].every(esPerfilSistema)).toBe(true);
    expect(esPerfilSistema(4)).toBe(false);
  });
});

describe("validación de persona", () => {
  const ok = { idpersona: "1037369405", nom1: "Ana", apell1: "Ruiz", movil: "3001234567", correo: "ANA@mail.com" };
  it("acepta datos válidos y normaliza", () => {
    const p = personaSchema.parse({ ...ok, nom2: "", tele: "", fecha_nac: "", direccion: "" });
    expect(p.correo).toBe("ana@mail.com");
    expect(p.nom2).toBeNull();
  });
  it.each([
    [{ movil: "2001234567" }, /móvil/],
    [{ correo: "no-es-correo" }, /correo/],
    [{ idpersona: "12ab" }, /identificación/],
    [{ nom1: "  " }, /obligatorio/],
    [{ fecha_nac: "2999-01-01" }, /fecha/],
  ])("rechaza %j", (cambio, msg) => {
    const r = personaSchema.safeParse({ ...ok, ...cambio });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(msg);
  });
});

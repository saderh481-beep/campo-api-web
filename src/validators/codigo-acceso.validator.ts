import type { Rol } from "@/domain/entities/usuario.entity";
import type { ICodigoAccesoService } from "@/domain/interfaces/usuario.interface";
import { createHash, randomInt } from "node:crypto";
import { existsUsuarioByCodigo } from "@/data/repositories/usuario.repository";

export class CodigoAccesoService implements ICodigoAccesoService {
  private readonly LONGITUDES: Record<Exclude<Rol, "tecnico">, number> & { tecnico: number } = {
    admin: 6,
    coordinador: 6,
    tecnico: 5,
  };

  getLongitudPorRol(rol: Rol): number {
    return this.LONGITUDES[rol];
  }

  validar(codigo: string, rol: Rol): boolean {
    const longitud = this.LONGITUDES[rol];
    return /^\d+$/.test(codigo) && codigo.length === longitud;
  }

  hashear(codigo: string): string {
    return createHash("sha512").update(codigo).digest("hex");
  }

  async generar(rol: Rol): Promise<string> {
    const longitud = this.LONGITUDES[rol];
    const min = 10 ** (longitud - 1);
    const max = 10 ** longitud;

    let intentos = 0;
    const maxIntentos = 100;

    while (intentos < maxIntentos) {
      const candidato = randomInt(min, max).toString();
      const existe = await existsUsuarioByCodigo(candidato);
      if (!existe) return candidato;
      intentos++;
    }

    throw new Error(`No se pudo generar un código único para rol ${rol} después de ${maxIntentos} intentos`);
  }
}

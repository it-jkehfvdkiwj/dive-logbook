import { scryptSync } from "node:crypto";

// Deterministischer Hash (fester App-Salt), damit ein Passwort direkt einem Benutzer
// zugeordnet werden kann – Login ohne Benutzernamen. Bewusst einfach gehalten.
const SALT = "divelog-password-v1";

export function hashPassword(password: string): string {
  return scryptSync(password, SALT, 32).toString("hex");
}

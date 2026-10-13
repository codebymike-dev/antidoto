import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";

const scrypt = promisify(scryptCb);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const adminUsername = process.env.SEED_ADMIN_USERNAME;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!url) {
  console.error("Falta TURSO_DATABASE_URL.");
  process.exit(1);
}
if (!adminUsername || !adminPassword) {
  console.error("Falta SEED_ADMIN_USERNAME o SEED_ADMIN_PASSWORD (defínelos en tu archivo .env).");
  process.exit(1);
}
if (adminPassword.length < 12) {
  console.error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const MISSIONS = [
  {
    id: "m1",
    tag: "RETO 01",
    title: "Rescata tu pausa",
    description:
      "Mini misión interactiva. El participante avanza mediante pequeñas pruebas o decisiones de bienestar. Se siente como un juego, no como un examen ni una evaluación.",
  },
  {
    id: "m2",
    tag: "RETO 02",
    title: "Misión Confiablemente",
    description:
      "Recorrido interactivo con pequeñas decisiones, acertijos y desafíos: elección de respuestas, descubrimiento de elementos y selección de herramientas de bienestar.",
  },
];

const POLICY = `AVISO DE PRIVACIDAD Y POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES

Encargado del tratamiento: ANTIDOTO S.A.S., NIT 901.777.384-6, con domicilio en la Av. Calle 116 # 71 A - 25, Bogotá D.C. Correo: antidoto.colombia@outlook.com. Antídoto trata los datos en nombre de la empresa u organización que contrató la actividad, que es la responsable del tratamiento.

Datos que se tratan: tu nombre o apodo, tus respuestas, tu avance y tu puntaje en el ejercicio. Si tu organización lo pide, también tu cargo y el municipio donde trabajas, elegidos de una lista. En las actividades en equipo se guarda además una foto de la obra del equipo, no de las personas.

Finalidad: gestionar tu participación y mostrarle a tu organización el avance y los resultados de la actividad. No se venden ni se comparten con terceros ajenos a la actividad. Para funcionar, la plataforma usa proveedores de alojamiento, base de datos y tiempo real (Vercel, Turso y Ably), que guardan los datos solo para prestar ese servicio.

Derechos del titular (Ley 1581 de 2012): tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, y a revocar esta autorización, escribiendo a antidoto.colombia@outlook.com.

Vigencia: los datos se conservan mientras dure la actividad y hasta 12 meses después para fines de reporte, salvo que pidas eliminarlos antes.`;

const TERMS = `TÉRMINOS Y CONDICIONES DE USO

Esta plataforma es de ANTIDOTO S.A.S., NIT 901.777.384-6.

Al ingresar tu nombre y código de actividad aceptas participar de forma voluntaria en el ejercicio propuesto por tu organización a través de Antídoto.

La actividad tiene fines de bienestar y formación, y no constituye una evaluación de desempeño laboral.

Antídoto no se hace responsable por el uso que la empresa contratante haga de los resultados compartidos con ella.

Dudas o solicitudes: antidoto.colombia@outlook.com.`;

for (const m of MISSIONS) {
  await client.execute({
    sql: `INSERT INTO missions (id, tag, title, description) VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
    args: [m.id, m.tag, m.title, m.description],
  });
}

for (const [key, body] of [
  ["privacidad", POLICY],
  ["terminos", TERMS],
]) {
  await client.execute({
    sql: `INSERT INTO legal_texts (key, body) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`,
    args: [key, body],
  });
}

const existing = await client.execute({
  sql: "SELECT id FROM admin_users WHERE username = ?",
  args: [adminUsername.toLowerCase()],
});

if (existing.rows.length) {
  console.log(`El superadmin ${adminUsername} ya existe, no se toca.`);
} else {
  await client.execute({
    sql: "INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'super')",
    args: [adminUsername.toLowerCase(), await hashPassword(adminPassword)],
  });
  console.log(`Superadmin creado: ${adminUsername}`);
}

console.log("Seed completado: misiones y textos legales listos.");
console.log("Las empresas y códigos se crean desde el portal, en Configuración.");

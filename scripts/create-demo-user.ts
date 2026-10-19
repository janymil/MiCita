/**
 * Creates (or refreshes) a demo business owner with a populated dashboard.
 *
 * Usage: npx tsx scripts/create-demo-user.ts
 * Credentials are printed at the end.
 */
import { and, eq } from "drizzle-orm";
import { db, sql } from "../server/db.js";
import { hashPassword } from "../server/auth/password.js";
import {
  authIdentities,
  appointments,
  businesses,
  businessSettings,
  clients,
  reviews,
  services,
  users,
} from "../shared/schema.js";

const DEMO_EMAIL = "demo@micita.pe";
const DEMO_PASSWORD = "DemoMiCita2026!";
const DEMO_NAME = "Demo Owner";
const DEMO_SLUG = "demo-barberia-micita";

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // --- User (idempotent) -----------------------------------------------------
  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: passwordHash,
      emailVerified: true,
      phone: "+51987654321",
      phoneVerified: false,
      role: "user",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: DEMO_NAME,
        password: passwordHash,
        emailVerified: true,
        isActive: true,
      },
    })
    .returning();

  await db
    .insert(authIdentities)
    .values({ userId: user.id, provider: "password", providerAccountId: DEMO_EMAIL })
    .onConflictDoNothing();

  // --- Business (one per demo user) ------------------------------------------
  let [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.userId, user.id), eq(businesses.slug, DEMO_SLUG)))
    .limit(1);

  if (!business) {
    [business] = await db
      .insert(businesses)
      .values({
        userId: user.id,
        name: "Demo Barbería MiCita",
        slug: DEMO_SLUG,
        description:
          "Barbería de demostración con servicios, clientes y citas de ejemplo para explorar el panel.",
        category: "belleza",
        phone: "+51987654321",
        email: DEMO_EMAIL,
        address: "Av. Larco 123, Miraflores",
        district: "Miraflores",
        city: "Lima",
        country: "Perú",
        latitude: "-12.1219",
        longitude: "-77.0297",
        isActive: true,
        isPremium: true,
        rating: "4.80",
        reviewCount: 3,
        hours: {
          monday: { enabled: true, start: "09:00", end: "19:00" },
          tuesday: { enabled: true, start: "09:00", end: "19:00" },
          wednesday: { enabled: true, start: "09:00", end: "19:00" },
          thursday: { enabled: true, start: "09:00", end: "19:00" },
          friday: { enabled: true, start: "09:00", end: "19:00" },
          saturday: { enabled: true, start: "09:00", end: "17:00" },
          sunday: { enabled: false, start: "09:00", end: "13:00" },
        },
      })
      .returning();
  }

  // --- Settings --------------------------------------------------------------
  const [settings] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.businessId, business.id))
    .limit(1);

  const settingsValues = {
    businessId: business.id,
    customUrl: DEMO_SLUG,
    publicDescription:
      "Cortes clásicos, fades y arreglo de barba en el corazón de Miraflores. Reserva en línea en segundos.",
    publicPhone: "+51987654321",
    publicEmail: DEMO_EMAIL,
    streetAddress: "Av. Larco 123",
    district: "Miraflores",
    region: "Lima",
    country: "Perú",
    primaryColor: "#dc2626",
    enablePublicBooking: true,
    enableGallery: true,
    instagramUrl: "https://instagram.com/micita",
    facebookUrl: "https://facebook.com/micita",
    whatsappNumber: "+51987654321",
    mondayHours: "09:00 - 19:00",
    tuesdayHours: "09:00 - 19:00",
    wednesdayHours: "09:00 - 19:00",
    thursdayHours: "09:00 - 19:00",
    fridayHours: "09:00 - 19:00",
    saturdayHours: "09:00 - 17:00",
    sundayHours: "Cerrado",
    professionalTitle: "Barbero profesional",
  };

  if (settings) {
    await db.update(businessSettings).set(settingsValues).where(eq(businessSettings.id, settings.id));
  } else {
    await db.insert(businessSettings).values(settingsValues);
  }

  // --- Services --------------------------------------------------------------
  const existingServices = await db.select().from(services).where(eq(services.businessId, business.id));
  if (existingServices.length === 0) {
    await db.insert(services).values([
      { businessId: business.id, name: "Corte de cabello", description: "Corte clásico o moderno con lavado.", price: "35.00", duration: 45, isActive: true },
      { businessId: business.id, name: "Corte + barba", description: "Corte completo y perfilado de barba.", price: "50.00", duration: 60, isActive: true },
      { businessId: business.id, name: "Arreglo de barba", description: "Perfilado, recorte y aceite acondicionador.", price: "25.00", duration: 30, isActive: true },
      { businessId: business.id, name: "Afeitado clásico", description: "Afeitado a navaja con toalla caliente.", price: "30.00", duration: 40, isActive: true },
    ]);
  }

  const serviceRows = await db.select().from(services).where(eq(services.businessId, business.id));

  // --- Clients ---------------------------------------------------------------
  const existingClients = await db.select().from(clients).where(eq(clients.businessId, business.id));
  if (existingClients.length === 0) {
    await db.insert(clients).values([
      { businessId: business.id, name: "Carlos Mendoza", email: "carlos@example.com", phone: "+51911111111", notes: "Prefiere turnos por la tarde." },
      { businessId: business.id, name: "Lucía Ramírez", email: "lucia@example.com", phone: "+51922222222", notes: "Cliente frecuente cada 3 semanas." },
      { businessId: business.id, name: "Jorge Salazar", email: "jorge@example.com", phone: "+51933333333", notes: "" },
      { businessId: business.id, name: "Andrea Torres", email: "andrea@example.com", phone: "+51944444444", notes: "Alergia a productos con alcohol." },
      { businessId: business.id, name: "Miguel Paredes", email: "miguel@example.com", phone: "+51955555555", notes: "" },
    ]);
  }

  const clientRows = await db.select().from(clients).where(eq(clients.businessId, business.id));

  // --- Appointments ----------------------------------------------------------
  const existingAppointments = await db.select().from(appointments).where(eq(appointments.businessId, business.id));
  if (existingAppointments.length === 0 && clientRows.length > 0 && serviceRows.length > 0) {
    const statuses = ["confirmed", "pending", "completed", "confirmed", "cancelled", "completed", "pending", "confirmed"];
    const times = ["09:00", "10:00", "11:30", "13:00", "15:00", "16:30", "17:30", "18:00"];
    const rows = Array.from({ length: 10 }).map((_, i) => {
      const service = serviceRows[i % serviceRows.length];
      const client = clientRows[i % clientRows.length];
      return {
        businessId: business.id,
        clientId: client.id,
        serviceId: service.id,
        date: isoDate(i - 3),
        time: times[i % times.length],
        duration: service.duration ?? 45,
        status: statuses[i % statuses.length],
        notes: i % 3 === 0 ? "Confirmado por WhatsApp." : null,
        price: service.price ?? "35.00",
      };
    });
    await db.insert(appointments).values(rows);
  }

  // --- Reviews ---------------------------------------------------------------
  const existingReviews = await db.select().from(reviews).where(eq(reviews.businessId, business.id));
  if (existingReviews.length === 0) {
    await db.insert(reviews).values([
      { businessId: business.id, clientName: "Carlos Mendoza", rating: 5, comment: "Excelente atención y un fade impecable. Volveré." },
      { businessId: business.id, clientName: "Lucía Ramírez", rating: 5, comment: "Muy puntuales y el local impecable." },
      { businessId: business.id, clientName: "Jorge Salazar", rating: 4, comment: "Buen corte, aunque tuve que esperar unos minutos." },
    ]);
  }

  const [counts] = await sql`
    select
      (select count(*)::int from services where business_id = ${business.id}) as services,
      (select count(*)::int from clients where business_id = ${business.id}) as clients,
      (select count(*)::int from appointments where business_id = ${business.id}) as appointments,
      (select count(*)::int from reviews where business_id = ${business.id}) as reviews
  `;

  console.log("\n=== DEMO USER READY ===");
  console.log("URL:      /login");
  console.log("Email:   ", DEMO_EMAIL);
  console.log("Password:", DEMO_PASSWORD);
  console.log("User id: ", user.id);
  console.log("Business:", business.name, "(id " + business.id + ", /" + DEMO_SLUG + ")");
  console.log("Data:    ", counts);
}

main()
  .then(() => sql.end())
  .catch(async (error) => {
    console.error("Failed to create demo user:", error);
    await sql.end();
    process.exit(1);
  });

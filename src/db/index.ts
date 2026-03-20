import postgres from "postgres";

const url =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL!
    : (process.env.DATABASE_URL ?? process.env.DATABASE_DIRECT_URL!);

export const sql = postgres(url, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

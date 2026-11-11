import { dbConnect } from "@/lib/mongodb"

export async function GET() {
  try {
    const connection = await dbConnect()
    const database = connection.connection.db
    if (!database) throw new Error("MongoDB connected without a database handle.")
    await database.admin().ping()
    return Response.json({ status: "ok" })
  } catch (error) {
    console.error("Health check failed", error)
    return Response.json({ status: "unhealthy" }, { status: 503 })
  }
}

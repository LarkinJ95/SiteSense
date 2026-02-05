require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

(async () => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT version()`;
    console.log(result?.[0]?.version || result);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();

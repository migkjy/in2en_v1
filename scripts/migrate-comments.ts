
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting comments table migration...");
  
  try {
    // Check if columns already exist
    const checkColumnsSql = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name IN ('image_url', 'parent_id')
    `;
    
    const existingColumns = await db.execute(checkColumnsSql);
    const columnNames = existingColumns.rows.map(row => row.column_name);
    
    if (!columnNames.includes('image_url')) {
      console.log("Adding image_url column to comments table");
      await db.execute(sql`ALTER TABLE comments ADD COLUMN image_url TEXT`);
    } else {
      console.log("image_url column already exists");
    }
    
    if (!columnNames.includes('parent_id')) {
      console.log("Adding parent_id column to comments table");
      await db.execute(sql`
        ALTER TABLE comments 
        ADD COLUMN parent_id INTEGER REFERENCES comments(id)
      `);
    } else {
      console.log("parent_id column already exists");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrate();

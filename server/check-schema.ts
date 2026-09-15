import { getDb, initDb } from './services/db';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const pool = await initDb();
  
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const tables = await pool.query(query);
  console.log('--- TABLES ---');
  console.log(tables.rows.map(r => r.table_name).join(', '));
  
  const fksQuery = `
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `;
  const fks = await pool.query(fksQuery);
  console.log('--- FOREIGN KEYS ---');
  fks.rows.forEach(fk => {
    console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
  });

  const indexesQuery = `
    SELECT
      tablename,
      indexname,
      indexdef
    FROM
      pg_indexes
    WHERE
      schemaname = 'public'
    ORDER BY
      tablename,
      indexname;
  `;
  const indexes = await pool.query(indexesQuery);
  console.log('--- INDEXES ---');
  indexes.rows.forEach(idx => {
    console.log(`${idx.tablename}: ${idx.indexname}`);
  });
  
  // Phase 6: Persistence check
  console.log('--- PERSISTENCE CHECK ---');
  const txCount = await pool.query('SELECT count(*) as count FROM transactions');
  console.log(`Transactions in DB: ${txCount.rows[0].count}`);
  
  process.exit(0);
}

checkSchema().catch(console.error);

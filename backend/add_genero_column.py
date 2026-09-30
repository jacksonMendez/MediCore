import sqlite3

conn = sqlite3.connect('medicore.db')
c = conn.cursor()

# Check if column exists
cols = [col[1] for col in c.execute('PRAGMA table_info(medicos)').fetchall()]
if 'genero' not in cols:
    c.execute("ALTER TABLE medicos ADD COLUMN genero VARCHAR(10) DEFAULT 'M'")
    print("Added column genero to medicos table.")

c.execute("UPDATE medicos SET genero = 'F' WHERE usuario_id IN (SELECT id FROM usuarios WHERE correo LIKE '%elena%')")
conn.commit()

print("Columns:", [col[1] for col in c.execute('PRAGMA table_info(medicos)').fetchall()])
print("Data:", c.execute('SELECT id, genero FROM medicos').fetchall())
conn.close()

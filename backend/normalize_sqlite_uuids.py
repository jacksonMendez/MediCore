"""
Script to normalize legacy 36-character hyphenated UUIDs to Django standard 32-character hex UUIDs
in SQLite, ensuring complete relational integrity and eliminating SQLite FK constraint failures.
"""
import sqlite3

def normalize_uuids():
    conn = sqlite3.connect('medicore.db')
    cursor = conn.cursor()

    cursor.execute("PRAGMA foreign_keys = OFF;")

    updates = [
        ('usuarios', ['id']),
        ('pacientes', ['id', 'usuario_id']),
        ('especialidades', ['id']),
        ('sedes', ['id']),
        ('medicos', ['id', 'usuario_id', 'especialidad_id', 'sede_id']),
        ('horarios_medico', ['id', 'medico_id']),
        ('citas', ['id', 'paciente_id', 'medico_id', 'sede_id']),
        ('consultas_notas', ['id', 'cita_id']),
        ('pqr_solicitudes', ['id', 'cita_id', 'paciente_id']),
        ('pagos', ['id', 'cita_id']),
        ('sesiones_chat', ['id', 'usuario_id']),
        ('mensajes_chat', ['id', 'sesion_id']),
        ('roles_permisos', ['id']),
        ('django_admin_log', ['user_id']),
        ('auditoria_registros', ['id', 'usuario_id']),
    ]

    for table, columns in updates:
        for col in columns:
            cursor.execute(f"UPDATE {table} SET {col} = REPLACE({col}, '-', '') WHERE {col} IS NOT NULL AND {col} LIKE '%-%';")
            print(f"Normalized {table}.{col}: {cursor.rowcount} rows updated.")

    conn.commit()

    # Re-enable foreign keys and verify integrity
    cursor.execute("PRAGMA foreign_keys = ON;")
    fk_errors = cursor.execute("PRAGMA foreign_key_check;").fetchall()
    
    if fk_errors:
        print("ERROR: Foreign key violations detected after normalization:", fk_errors)
    else:
        print("SUCCESS: PRAGMA foreign_key_check passed with 0 violations!")

    conn.close()

if __name__ == '__main__':
    normalize_uuids()

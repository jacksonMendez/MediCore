# MediCore OS — frontend visual

## Alcance
- Crear un selector de portal en `/` para Paciente, Médico y Administrador.
- Crear dashboards separados en `/paciente`, `/medico` y `/admin`.
- Usar únicamente datos de ejemplo y estado local; sin autenticación, base de datos ni backend.

## Diseño
- Aplicar la paleta oscura clínica indicada con teal como único acento de marca y colores de estado reservados.
- Definir tipografía, espaciado, superficies, bordes y estados mediante tokens reutilizables.
- Mantener una jerarquía clara: una acción protagonista por pantalla, tarjetas secundarias discretas y tablas/listas ligeras.
- Adaptar todas las vistas a escritorio y móvil sin superposiciones.

## Componentes y pantallas
- Crear piezas reutilizables para navegación lateral, encabezados, tarjetas de estado, tablas, filas de citas, controles y paneles.
- Paciente: historial lateral, bienvenida, acción principal para agendar, filtro médico, próxima cita, especialidades, chat médico y citas/pagos.
- Médico: resumen de agenda, tabla de citas del día y copiloto de IA flotante.
- Administrador: navegación por Médicos, Sedes y Especialidades con tablas y acciones visuales.
- Usar componentes AI Elements solo como código fuente React visual instalado dentro del proyecto; sin SDK de IA, servicios, claves ni llamadas externas.
- Mantener mensajes y respuestas simuladas exclusivamente con estado local, dejando interfaces claras para conectar Groq después.

## Interacciones visuales
- Permitir cambiar de portal y navegar entre vistas.
- Hacer funcionales los tabs, búsqueda/filtros básicos, sugerencias rápidas, envío de mensajes simulados y apertura/cierre del copiloto.
- Añadir estados de cita con borde lateral de color, sin badges llamativos.

## Validación
- Verificar metadatos propios por vista.
- Comprobar compilación y revisar visualmente escritorio y móvil.

from django.contrib import admin
from .models import RegistroAuditoria


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'accion', 'origen', 'usuario', 'entidad_tipo', 'entidad_id')
    list_filter = ('accion', 'origen', 'entidad_tipo', 'timestamp')
    search_fields = ('usuario__correo', 'usuario__nombre_completo', 'entidad_id')
    readonly_fields = [f.name for f in RegistroAuditoria._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

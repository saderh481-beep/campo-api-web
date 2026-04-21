"""
Generador de PDF Bitácora de Campo - Gobierno del Estado de Hidalgo
Sistema usando ReportLab para crear el formulario oficial de visitas técnicas agropecuarias
"""

import os
from datetime import datetime
from io import BytesIO
from typing import Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


class BitacoraCampoGenerator:
    """Generador de PDF Bitácora de Campo para el Gobierno de Hidalgo"""
    
    def __init__(self):
        self.width, self.height = A4
        self.margen_superior = 2 * cm
        self.margen_inferior = 2 * cm
        self.margen_lateral = 2.5 * cm
        self.ancho_util = self.width - (self.margen_lateral * 2)
        
        # Colores
        self.color_texto = colors.black
        self.color_linea = colors.Color(0.2, 0.2, 0.2)  # Gris oscuro #333333
        self.color_fondo = colors.Color(0.91, 0.91, 0.91)  # #E8E8E8
        self.color_blanco = colors.white
        
    def _draw_header(self, c: canvas.Canvas):
        """Encabezado del documento"""
        y_pos = self.height - 2 * cm
        
        # Rectángulo izquierdo - Logotipo HIDALGO
        c.setFillColor(self.color_texto)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(self.margen_lateral, y_pos, "HIDALGO")
        c.setFont("Helvetica", 8)
        c.drawString(self.margen_lateral, y_pos - 12, "PRIMERO EL PUEBLO")
        
        # Icono de hoja (simplificado como rectángulo)
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(0.5)
        c.rect(self.margen_lateral + 5, y_pos - 5, 15, 18, stroke=True, fill=False)
        
        # Línea divisora vertical
        c.setLineWidth(0.5)
        c.line(self.width / 2, self.margen_superior + 1 * cm, self.width / 2, y_pos + 30)
        
        # Texto derecho - CAMPO
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(self.width - self.margen_lateral, y_pos, "CAMPO")
        c.setFont("Helvetica", 8)
        c.drawRightString(self.width - self.margen_lateral, y_pos - 12, "SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL")
        
        # Título principal centrado
        c.setFont("Helvetica-Bold", 12)
        title_y = y_pos - 40
        c.drawCentredString(self.width / 2, title_y, "BITÁCORA DE CAMPO")
        
        return title_y - 25
    
    def _draw_datos_generales(self, c: canvas.Canvas, y_start: float, data: dict) -> float:
        """Sección 1: Datos Generales"""
        y = y_start
        
        # Título de sección
        c.setFillColor(self.color_fondo)
        c.rect(self.margen_lateral, y - 5, self.ancho_util, 15, fill=True, stroke=False)
        c.setFillColor(self.color_texto)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margen_lateral + 5, y, "Datos Generales")
        
        y -= 25
        
        # === COLUMNA IZQUIERDA (60%) ===
        col_left_x = self.margen_lateral
        col_right_x = self.margen_lateral + (self.ancho_util * 0.60) + 10
        
        # PSTyP
        c.setFont("Helvetica", 9)
        c.drawString(col_left_x, y, "PSTyP:")
        c.setLineWidth(0.5)
        c.line(col_left_x + 40, y - 2, col_right_x, y - 2)
        if data.get("pstyp"):
            c.drawString(col_left_x + 45, y - 2, data["pstyp"][:50])
        
        y -= 18
        
        # Beneficiario directo
        c.drawString(col_left_x, y, "Beneficiario directo:")
        c.line(col_left_x + 100, y - 2, col_right_x, y - 2)
        if data.get("beneficiario"):
            c.drawString(col_left_x + 105, y - 2, data["beneficiario"][:45])
        
        y -= 18
        
        # Dirección - 3 líneas
        c.drawString(col_left_x, y, "Dirección:")
        y_direccion = y - 15
        c.line(col_left_x + 60, y_direccion - 2, col_right_x, y_direccion - 2)
        if data.get("calle"):
            c.drawString(col_left_x + 65, y_direccion - 2, data["calle"][:45])
        
        y_direccion -= 15
        c.line(col_left_x + 60, y_direccion - 2, col_right_x, y_direccion - 2)
        if data.get("localidad"):
            c.drawString(col_left_x + 65, y_direccion - 2, data["localidad"][:45])
        
        y_direccion -= 15
        c.line(col_left_x + 60, y_direccion - 2, col_right_x, y_direccion - 2)
        if data.get("cp"):
            c.drawString(col_left_x + 65, y_direccion - 2, f"{data.get('localidad', '')}, C.P. {data.get('cp', '')}"[:45])
        
        y -= 65
        
        # Teléfono principal
        c.drawString(col_left_x, y, "Teléfono principal:")
        c.line(col_left_x + 95, y - 2, col_right_x, y - 2)
        if data.get("telefono"):
            c.drawString(col_left_x + 100, y - 2, data["telefono"])
        
        y -= 18
        
        # Beneficiarios indirectos - 2 líneas
        c.drawString(col_left_x, y, "Beneficiarios indirectos:")
        y_benef = y - 15
        c.line(col_left_x + 105, y_benef - 2, col_right_x, y_benef - 2)
        if data.get("beneficiarios_indirectos"):
            c.drawString(col_left_x + 110, y_benef - 2, data["beneficiarios_indirectos"][0][:45] if data["beneficiarios_indirectos"] else "")
        
        y_benef -= 15
        c.line(col_left_x + 105, y_benef - 2, col_right_x, y_benef - 2)
        if data.get("beneficiarios_indirectos") and len(data["beneficiarios_indirectos"]) > 1:
            c.drawString(col_left_x + 110, y_benef - 2, data["beneficiarios_indirectos"][1][:45] if len(data["beneficiarios_indirectos"]) > 1 else "")
        
        # === COLUMNA DERECHA (40%) ===
        col2_x = self.margen_lateral + (self.ancho_util * 0.60) + 20
        
        # Municipio
        c.setFont("Helvetica", 9)
        c.drawString(col2_x, y_start - 50, "Municipio:")
        c.line(col2_x + 60, y_start - 52, self.width - self.margen_lateral, y_start - 52)
        if data.get("municipio"):
            c.drawString(col2_x + 65, y_start - 52, data["municipio"])
        
        # Coordenadas geográficas
        y_coord = y_start - 70
        c.drawString(col2_x, y_coord, "Coordenadas geográficas:")
        
        c.setFont("Helvetica", 8)
        c.drawString(col2_x, y_coord - 15, "Lat:")
        c.line(col2_x + 20, y_coord - 17, col2_x + 70, y_coord - 17)
        if data.get("lat"):
            c.drawString(col2_x + 25, y_coord - 17, str(data["lat"]))
        
        c.drawString(col2_x + 75, y_coord - 15, "Long:")
        c.line(col2_x + 95, y_coord - 17, col2_x + 145, y_coord - 17)
        if data.get("long"):
            c.drawString(col2_x + 100, y_coord - 17, str(data["long"]))
        
        # Teléfono secundario
        y_coord -= 25
        c.setFont("Helvetica", 9)
        c.drawString(col2_x, y_coord, "Teléfono secundario:")
        c.line(col2_x + 100, y_coord - 2, self.width - self.margen_lateral, y_coord - 2)
        if data.get("telefono_secundario"):
            c.drawString(col2_x + 105, y_coord - 2, data["telefono_secundario"])
        
        # Círculo para sello institucional
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(1)
        sello_x = col2_x + 60
        sello_y = y_coord - 55
        c.circle(sello_x, sello_y, 1.5 * cm, stroke=True, fill=False)
        c.setFont("Helvetica", 6)
        c.drawCentredString(sello_x, sello_y, "SELLO")
        c.drawCentredString(sello_x, sello_y - 10, "INSTITUCIONAL")
        
        # === FILA INFERIOR ===
        y -= 40
        
        # Fecha
        c.setFont("Helvetica", 9)
        c.drawString(self.margen_lateral, y, "Fecha:")
        c.line(self.margen_lateral + 40, y - 2, self.margen_lateral + 120, y - 2)
        if data.get("fecha"):
            c.drawString(self.margen_lateral + 45, y - 2, data["fecha"])
        else:
            c.drawString(self.margen_lateral + 45, y - 2, datetime.now().strftime("%d/%m/%Y"))
        
        # Horario
        c.drawString(self.width - self.margen_lateral - 120, y, "Horario de atención:")
        c.line(self.width - self.margen_lateral - 30, y - 2, self.width - self.margen_lateral, y - 2)
        if data.get("horario"):
            c.drawString(self.width - self.margen_lateral - 115, y - 2, data["horario"])
        
        return y - 30
    
    def _draw_actividades(self, c: canvas.Canvas, y_start: float, data: dict) -> float:
        """Sección 2: Actividades Realizadas"""
        y = y_start
        
        # Título
        c.setFillColor(self.color_fondo)
        c.rect(self.margen_lateral, y - 5, self.ancho_util, 15, fill=True, stroke=False)
        c.setFillColor(self.color_texto)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margen_lateral + 5, y, "Actividades Realizadas (Introducción, Desarrollo y Conclusiones)")
        
        y -= 15
        
        # Recuadro de texto
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(0.5)
        box_height = 6 * cm
        c.rect(self.margen_lateral, y - box_height, self.ancho_util, box_height, stroke=True, fill=False)
        
        # Texto de actividades
        c.setFont("Helvetica", 10)
        if data.get("actividades"):
            text = data["actividades"]
            # Wrapping simple
            words = text.split()
            line = ""
            y_text = y - 15
            for word in words:
                test_line = line + word + " "
                if c.stringWidth(test_line, "Helvetica", 10) < self.ancho_util - 10:
                    line = test_line
                else:
                    c.drawString(self.margen_lateral + 10, y_text, line)
                    line = word + " "
                    y_text -= 15
                    if y_text < y - box_height + 15:
                        break
            c.drawString(self.margen_lateral + 10, y_text, line)
        
        return y - box_height - 15
    
    def _draw_evidencias(self, c: canvas.Canvas, y_start: float, data: dict) -> float:
        """Sección 3: Evidencias Fotográficas"""
        y = y_start
        
        # Título
        c.setFillColor(self.color_fondo)
        c.rect(self.margen_lateral, y - 5, self.ancho_util, 15, fill=True, stroke=False)
        c.setFillColor(self.color_texto)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margen_lateral + 5, y, "Evidencias Fotográficas")
        
        y -= 20
        
        # Ancho de cada columna
        col_width = (self.ancho_util - 20) / 2
        
        # === COLUMNA IZQUIERDA: Foto del rostro ===
        # Etiqueta
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(self.margen_lateral + col_width / 2, y, "FOTO DEL ROSTRO DEL BENEFICIARIO")
        
        # Recuadro foto
        box_height = 7 * cm
        box_width = 6 * cm
        box_x = self.margen_lateral + (col_width - box_width) / 2
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(1.5)
        c.rect(box_x, y - box_height, box_width, box_height, stroke=True, fill=False)
        
        # Imagen si existe
        if data.get("foto_rostro"):
            try:
                c.drawImage(data["foto_rostro"], box_x + 5, y - box_height + 5, 
                          width=box_width - 10, height=box_height - 10, preserveAspectRatio=True)
            except Exception:
                pass
        
        # Líneas debajo
        y_line = y - box_height - 15
        c.setLineWidth(0.5)
        c.drawString(box_x, y_line, "Nombre completo:")
        c.line(box_x + 75, y_line - 2, box_x + box_width, y_line - 2)
        if data.get("beneficiario"):
            c.drawString(box_x + 80, y_line - 2, data["beneficiario"][:30])
        
        y_line -= 15
        c.drawString(box_x, y_line, "CURP:")
        c.line(box_x + 30, y_line - 2, box_x + box_width, y_line - 2)
        if data.get("curp"):
            c.drawString(box_x + 35, y_line - 2, data["curp"])
        
        # === COLUMNA DERECHA: Firma ===
        col2_x = self.margen_lateral + col_width + 10
        
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(col2_x + col_width / 2, y, "FIRMA DEL BENEFICIARIO")
        
        # Recuadro firma
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(1.5)
        c.rect(col2_x, y - box_height, box_width, box_height, stroke=True, fill=False)
        
        # Imagen si existe
        if data.get("firma"):
            try:
                c.drawImage(data["firma"], col2_x + 5, y - box_height + 5,
                          width=box_width - 10, height=box_height - 10, preserveAspectRatio=True)
            except Exception:
                pass
        
        # Líneas debajo
        y_line = y - box_height - 15
        c.setLineWidth(0.5)
        c.drawString(col2_x, y_line, "Fecha de firma:")
        c.line(col2_x + 65, y_line - 2, col2_x + box_width, y_line - 2)
        if data.get("fecha_firma"):
            c.drawString(col2_x + 70, y_line - 2, data["fecha_firma"])
        
        y_line -= 15
        c.drawString(col2_x, y_line, "Lugar:")
        c.line(col2_x + 30, y_line - 2, col2_x + box_width, y_line - 2)
        if data.get("lugar"):
            c.drawString(col2_x + 35, y_line - 2, data["lugar"])
        
        return y - box_height - 45
    
    def _draw_responsables(self, c: canvas.Canvas, y_start: float, data: dict) -> float:
        """Sección 4: Responsables y Validación"""
        y = y_start
        
        # Título
        c.setFillColor(self.color_fondo)
        c.rect(self.margen_lateral, y - 5, self.ancho_util, 15, fill=True, stroke=False)
        c.setFillColor(self.color_texto)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(self.margen_lateral + 5, y, "Responsables de la Visita")
        
        y -= 25
        
        col_width = (self.ancho_util - 20) / 2
        
        # === COLUMNA IZQUIERDA: Técnico ===
        c.setFont("Helvetica", 9)
        c.drawString(self.margen_lateral, y, "Nombre del técnico (PSTyP):")
        c.setLineWidth(0.5)
        c.line(self.margen_lateral + 125, y - 2, self.margen_lateral + col_width, y - 2)
        if data.get("pstyp"):
            c.drawString(self.margen_lateral + 130, y - 2, data["pstyp"][:40])
        
        y -= 20
        
        c.drawString(self.margen_lateral, y, "Firma del técnico:")
        
        # Recuadro para firma
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(1)
        c.rect(self.margen_lateral + 70, y - 35, 5 * cm, 3 * cm, stroke=True, fill=False)
        
        y -= 45
        
        c.drawString(self.margen_lateral, y, "Fecha:")
        c.line(self.margen_lateral + 40, y - 2, self.margen_lateral + 100, y - 2)
        if data.get("fecha"):
            c.drawString(self.margen_lateral + 45, y - 2, data["fecha"])
        
        # === COLUMNA DERECHA: Supervisor ===
        col2_x = self.margen_lateral + col_width + 10
        
        c.setFont("Helvetica", 9)
        c.drawString(col2_x, y_start - 50, "Vo. Bo.:")
        c.setLineWidth(0.5)
        c.line(col2_x + 30, y_start - 52, col2_x + col_width, y_start - 52)
        if data.get("vo_bo"):
            c.drawString(col2_x + 35, y_start - 52, data["vo_bo"][:35])
        
        # Sello institucional
        c.setStrokeColor(self.color_linea)
        c.setLineWidth(1)
        sello_x = col2_x + col_width / 2
        sello_y = y_start - 95
        c.circle(sello_x, sello_y, 1.5 * cm, stroke=True, fill=False)
        c.setFont("Helvetica", 6)
        c.drawCentredString(sello_x, sello_y, "SELLO")
        c.drawCentredString(sello_x, sello_y - 10, "INSTITUCIONAL")
        
        y -= 50
        
        c.setFont("Helvetica", 9)
        c.drawString(col2_x, y, "Fecha de validación:")
        c.line(col2_x + 90, y - 2, col2_x + col_width, y - 2)
        if data.get("fecha_validacion"):
            c.drawString(col2_x + 95, y - 2, data["fecha_validacion"])
        
        return y - 30
    
    def _draw_footer(self, c: canvas.Canvas, page_num: int, total_pages: int):
        """Pie de página"""
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(self.color_texto)
        c.drawRightString(self.width - self.margen_lateral, self.margen_inferior / 2, 
                       f"Página {page_num} de {total_pages}")
    
    def generate(self, data: dict, output_path: Optional[str] = None) -> bytes:
        """
        Genera el PDF de la bitácora de campo
        
        Args:
            data: Diccionario con los datos del formulario
            output_path: Ruta donde guardar el PDF (opcional)
            
        Returns:
            Bytes del PDF generado
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Primera página
        y_pos = self._draw_header(c)
        y_pos = self._draw_datos_generales(c, y_pos, data)
        y_pos = self._draw_actividades(c, y_pos, data)
        y_pos = self._draw_evidencias(c, y_pos, data)
        y_pos = self._draw_responsables(c, y_pos, data)
        
        self._draw_footer(c, 1, 1)
        
        c.save()
        
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        
        if output_path:
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
        
        return pdf_bytes
    
    def generate_bytes(self, data: dict) -> bytes:
        """Genera el PDF y возвращает bytes"""
        return self.generate(data)


def create_bitacora_hidalgo(data: dict) -> bytes:
    """
    Función de conveniencia para crear una bitácora de campo
    
    Args:
        data: Diccionario con los datos del formulario
        
    Returns:
        Bytes del PDF generado
    """
    generator = BitacoraCampoGenerator()
    return generator.generate_bytes(data)


# ============================================
# EJEMPLO DE USO
# ============================================

if __name__ == "__main__":
    # Datos de ejemplo
    datos_ejemplo = {
        "pstyp": "Dra. Marisol Gutiérrez Lozano",
        "beneficiario": "Patricia Gutiérrez Pérez",
        "municipio": "Tolcayuca",
        "calle": "Calle Independencia 13",
        "localidad": "Santiago Tlajomulco, Tolcayuca",
        "cp": "43860",
        "telefono": "5522813345",
        "telefono_secundario": "711220251",
        "beneficiarios_indirectos": ["Agustino Gutiérrez Pérez", "Martha Gutiérrez Pérez"],
        "lat": "19.990275",
        "long": "-98.906856",
        "fecha": "01/11/2025",
        "horario": "7:00 am",
        "actividades": "A la comunidad de Santiago Tlajomulco, del municipio de Tolcayuca, se acudió a una visita con la productora Patricia Gutiérrez Pérez, para el seguimiento del cultivo de avena forrajera. Se realizó la revisión del estado phenológico de las plantas, encontrando las mismas en etapa de floración. Se tomaron muestras de suelo para análisis de nutrientes. La producteur muestra buen uso de las técnicas aprendidas en capacitaciones anteriores. Se recomienda continuar con el plan de manejo integrado de plagas.",
        "curp": "GUPP950101MHGRTR01",
        "fecha_firma": "01/11/2025",
        "lugar": "Santiago Tlajomulco, Tolcayuca",
        "vo_bo": "Ing. Roberto Hernández Sánchez",
        # Rutas de imágenes (opcionales)
        # "foto_rostro": "/ruta/a/foto.jpg",
        # "firma": "/ruta/a/firma.png",
    }
    
    # Generar PDF
    pdf = create_bitacora_hidalgo(datos_ejemplo)
    
    # Guardar
    output_file = "bitacora_campo_ejemplo.pdf"
    with open(output_file, "wb") as f:
        f.write(pdf)
    
    print(f"PDF generado: {output_file}")
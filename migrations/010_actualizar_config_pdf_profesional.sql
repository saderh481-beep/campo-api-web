-- Actualizar configuración del PDF con diseño profesional para la Secretaría de Desarrollo Agropecuario

UPDATE configuraciones 
SET valor = '{
  "institucion": "SECRETARÍA DE DESARROLLO AGROPECUARIO",
  "dependencia": "Gobierno del Estado de Hidalgo",
  "logo_url": "https://servicios.hidalgo.gob.mx/archivos/1/logo-sedea-hidalgo.png",
  "pie_pagina": "Sistema de Gestión de Visitras - Secretaría de Desarrollo Agropecuario | Primero el Pueblo"
}'::jsonb,
    descripcion = 'Configuración profesional de PDFs con logo de SEDEA Hidalgo',
    updated_at = NOW()
WHERE clave = 'pdf_encabezado';

-- Si no existe, insertar la configuración
INSERT INTO configuraciones (clave, valor, descripcion, updated_at)
SELECT 
  'pdf_encabezado',
  '{
    "institucion": "SECRETARÍA DE DESARROLLO AGROPECUARIO",
    "dependencia": "Gobierno del Estado de Hidalgo",
    "logo_url": "https://servicios.hidalgo.gob.mx/archivos/1/logo-sedea-hidalgo.png",
    "pie_pagina": "Sistema de Gestión de Visitas - Secretaría de Desarrollo Agropecuario | Primero el Pueblo"
  }'::jsonb,
  'Configuración profesional de PDFs con logo de SEDEA Hidalgo',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM configuraciones WHERE clave = 'pdf_encabezado');
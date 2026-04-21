-- Tabla de documentación
CREATE TABLE IF NOT EXISTS documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(100),
  idioma VARCHAR(10) DEFAULT 'es',
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documento_key ON documento(key);
CREATE INDEX IF NOT EXISTS idx_documento_categoria ON documento(categoria);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documento_updated_at ON documento;
CREATE TRIGGER trigger_documento_updated_at
  BEFORE UPDATE ON documento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
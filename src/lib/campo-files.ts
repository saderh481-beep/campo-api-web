const CAMPO_FILES_API = process.env.CAMPO_FILES_API_URL ?? "https://campo-api-files-campo-saas.up.railway.app";
const API_KEY_WEB = process.env.CAMPO_FILES_API_KEY_WEB;
const API_KEY_APP = process.env.CAMPO_FILES_API_KEY_APP;

async function request<T>(
  endpoint: string,
  options: {
    method: string;
    apiKey: string;
    body?: FormData;
  }
): Promise<T> {
  const url = `${CAMPO_FILES_API}${endpoint}`;
  const headers: Record<string, string> = {
    "X-API-Key": options.apiKey,
  };

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function subirFotosCampo(
  bitacoraId: string,
  tecnicoId: string,
  files: Array<{ buffer: Buffer; name: string }>,
  tipoCliente: "web" | "app" = "web"
): Promise<Array<{ url: string; public_id: string; thumbnail: string }>> {
  const formData = new FormData();
  formData.append("bitacora_id", bitacoraId);
  formData.append("tecnico_id", tecnicoId);

  for (const file of files) {
    const blob = new Blob([Buffer.from(file.buffer) as unknown as BlobPart]);
    formData.append("files", blob, file.name);
  }

  const apiKey = tipoCliente === "web" ? API_KEY_WEB! : API_KEY_APP!;
  const result = await request<{
    success: boolean;
    fotos: Array<{ url: string; public_id: string; thumbnail: string }>;
  }>("/upload/fotos-campo", {
    method: "POST",
    apiKey,
    body: formData,
  });

  return result.fotos;
}

export async function subirFotoRostro(
  bitacoraId: string,
  buffer: Buffer,
  filename: string
): Promise<{ url: string; public_id: string; thumbnail: string }> {
  const formData = new FormData();
  formData.append("bitacora_id", bitacoraId);
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append("files", blob, filename);

  const result = await request<{
    success: boolean;
    url: string;
    public_id: string;
    thumbnail: string;
  }>("/upload/foto-rostro", {
    method: "POST",
    apiKey: API_KEY_APP!,
    body: formData,
  });

  return {
    url: result.url,
    public_id: result.public_id,
    thumbnail: result.thumbnail,
  };
}

export async function subirFirma(
  bitacoraId: string,
  buffer: Buffer,
  filename: string
): Promise<{ url: string; public_id: string }> {
  const formData = new FormData();
  formData.append("bitacora_id", bitacoraId);
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append("files", blob, filename);

  const result = await request<{
    success: boolean;
    url: string;
    public_id: string;
  }>("/upload/firma", {
    method: "POST",
    apiKey: API_KEY_APP!,
    body: formData,
  });

  return {
    url: result.url,
    public_id: result.public_id,
  };
}

export async function subirDocumentos(
  beneficiarioId: string,
  files: Array<{ buffer: Buffer; name: string }>
): Promise<Array<{ url: string; public_id: string }>> {
  const formData = new FormData();
  formData.append("beneficiario_id", beneficiarioId);

  for (const file of files) {
    const blob = new Blob([new Uint8Array(file.buffer)]);
    formData.append("files", blob, file.name);
  }

  const result = await request<{
    success: boolean;
    documentos: Array<{ url: string; public_id: string }>;
  }>("/upload/documentos", {
    method: "POST",
    apiKey: API_KEY_WEB!,
    body: formData,
  });

  return result.documentos;
}

export async function subirPDF(
  bitacoraId: string,
  buffer: Buffer,
  filename: string
): Promise<{ url: string; public_id: string }> {
  const formData = new FormData();
  formData.append("beneficiario_id", bitacoraId);
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  formData.append("files", blob, filename);

  const result = await request<{
    success: boolean;
    documentos: Array<{ url: string; public_id: string }>;
  }>("/upload/documentos", {
    method: "POST",
    apiKey: API_KEY_WEB!,
    body: formData,
  });

  return {
    url: result.documentos[0].url,
    public_id: result.documentos[0].public_id,
  };
}

export async function obtenerFotosBitacora(bitacoraId: string): Promise<
  Array<{ url: string; public_id: string; thumbnail: string; created_at: string; bytes: number }>
> {
  const result = await request<{
    success: boolean;
    bitacora_id: string;
    fotos: Array<{ url: string; public_id: string; thumbnail: string; created_at: string; bytes: number }>;
  }>(`/upload/bitacora/${bitacoraId}/fotos`, {
    method: "GET",
    apiKey: API_KEY_WEB!,
  });

  return result.fotos;
}

export async function eliminarArchivo(publicId: string): Promise<void> {
  await request<{ success: boolean; message: string }>(`/upload/${publicId}`, {
    method: "DELETE",
    apiKey: API_KEY_WEB!,
  });
}

export async function transformarImagen(
  publicId: string,
  options: { width?: number; height?: number; crop?: string }
): Promise<string> {
  const params = new URLSearchParams();
  if (options.width) params.append("width", options.width.toString());
  if (options.height) params.append("height", options.height.toString());
  if (options.crop) params.append("crop", options.crop);

  const result = await request<{
    success: boolean;
    url: string;
    public_id: string;
  }>(`/upload/transform/${publicId}?${params.toString()}`, {
    method: "GET",
    apiKey: API_KEY_WEB!,
  });

  return result.url;
}

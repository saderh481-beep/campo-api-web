const FILES_API_URL = process.env.FILES_API_URL ?? "https://campo-api-files-campo-saas.up.railway.app";
const FILES_API_KEY = process.env.FILES_API_KEY ?? "";

async function uploadToFiles(endpoint: string, formData: FormData) {
  const response = await fetch(`${FILES_API_URL}${endpoint}`, {
    method: "POST",
    headers: { "X-API-Key": FILES_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error uploading file" }));
    throw new Error(error.error ?? `Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function uploadBitacoraFotos(bitacoraId: string, tecnicoId: string, files: File[]) {
  const form = new FormData();
  form.append("bitacora_id", bitacoraId);
  form.append("tecnico_id", tecnicoId);
  for (const file of files) {
    form.append("files", file);
  }
  return uploadToFiles("/upload/fotos-campo", form);
}

export async function uploadBeneficiarioDocumentos(beneficiarioId: string, files: File[]) {
  const form = new FormData();
  form.append("beneficiario_id", beneficiarioId);
  for (const file of files) {
    form.append("files", file);
  }
  return uploadToFiles("/upload/documentos", form);
}

export async function deleteFile(publicId: string) {
  const response = await fetch(`${FILES_API_URL}/upload/${publicId}`, {
    method: "DELETE",
    headers: { "X-API-Key": FILES_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }

  return response.json();
}

export async function getBitacoraFotos(bitacoraId: string) {
  const response = await fetch(`${FILES_API_URL}/upload/bitacora/${bitacoraId}/fotos`, {
    headers: { "X-API-Key": FILES_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Get photos failed: ${response.status}`);
  }

  return response.json();
}

export async function transformImage(publicId: string, options: { width?: number; height?: number; crop?: string } = {}) {
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.crop) params.set("crop", options.crop);

  const response = await fetch(`${FILES_API_URL}/upload/transform/${publicId}?${params}`, {
    headers: { "X-API-Key": FILES_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Transform failed: ${response.status}`);
  }

  return response.json();
}
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function upload(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options as any, (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      })
      .end(buffer);
  });
}

export async function subirImagen(
  buffer: Buffer,
  folder: string,
  publicId: string
) {
  return upload(buffer, {
    upload_preset: process.env.CLOUDINARY_PRESET_IMAGENES,
    folder,
    public_id: publicId,
    resource_type: "image",
  });
}

export async function subirPDF(
  buffer: Buffer,
  folder: string,
  publicId: string
) {
  return upload(buffer, {
    upload_preset: process.env.CLOUDINARY_PRESET_DOCS,
    folder,
    public_id: publicId,
    resource_type: "raw",
  });
}

export async function subirDocumento(
  buffer: Buffer,
  folder: string,
  publicId: string
) {
  return upload(buffer, {
    upload_preset: process.env.CLOUDINARY_PRESET_DOCS,
    folder,
    public_id: publicId,
    resource_type: "raw",
  });
}

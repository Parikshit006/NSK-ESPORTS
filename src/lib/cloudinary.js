const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Upload a file to Cloudinary using unsigned upload preset.
 * Used for tournament banner images only.
 * Payment screenshots go to Supabase Storage (private).
 *
 * @param {File} file - Image file to upload
 * @param {string} folder - Cloudinary folder name e.g. "nsk-banners"
 * @returns {Promise<string>} - Secure URL of uploaded image
 */
export async function uploadToCloudinary(file, folder = 'nsk-banners') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Missing Cloudinary environment variables')
  }

  // Client-side compression before upload
  const compressed = await compressImage(file, 1200, 0.8)

  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url
}

/**
 * Compress image on client side before upload.
 * Reduces 5MB photos to ~200KB for faster uploads.
 */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      )
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

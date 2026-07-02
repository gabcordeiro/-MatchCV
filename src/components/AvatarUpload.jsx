import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner from './Spinner.jsx'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export default function AvatarUpload() {
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const inputRef = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const avatarUrl = profile?.avatar_url
  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reenviar o mesmo arquivo depois
    if (!file) return

    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('A imagem deve ter no máximo 2 MB.')
      return
    }

    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      // Caminho dentro da pasta do usuário — exigido pela política de RLS do Storage.
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: saveError } = await updateProfile({ avatar_url: publicUrl })
      if (saveError) throw new Error(saveError)
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar a foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
            {initial}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70 text-brand-600">
            <Spinner className="h-5 w-5" />
          </span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm"
        >
          {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        <p className="mt-1 text-xs text-slate-400">JPG ou PNG, até 2 MB.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}

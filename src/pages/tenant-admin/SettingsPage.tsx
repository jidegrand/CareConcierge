import { useState, useEffect } from 'react'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useTenantSettings } from '@/hooks/tenant/useTenantSettings'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

type FormData = {
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  defaultLanguage: string
  enablePatientFeedback: boolean
  enableResidentProfiles: boolean
}

type FormErrors = Partial<Record<keyof FormData, string>>

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ht', name: 'Haitian Creole' },
]

export default function SettingsPage() {
  const { tenant } = useTenantContext()
  const { settings, loading, error: settingsError, saving, update } = useTenantSettings(tenant?.id || '')

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    logoUrl: null,
    primaryColor: '#2E75B6',
    secondaryColor: '#1F4788',
    defaultLanguage: 'en',
    enablePatientFeedback: true,
    enableResidentProfiles: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null)

  // Initialize form with tenant and settings data
  useEffect(() => {
    if (tenant && settings) {
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        logoUrl: settings.logo_url || null,
        primaryColor: settings.primary_color || '#2E75B6',
        secondaryColor: settings.secondary_color || '#1F4788',
        defaultLanguage: settings.default_language || 'en',
        enablePatientFeedback: settings.patient_feedback_enabled !== false,
        enableResidentProfiles: settings.resident_profiles_enabled === true,
      })
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url)
      }
    }
  }, [tenant, settings])

  // Revoke any object-URL preview when replaced or on unmount
  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    }
  }, [logoObjectUrl])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Organization slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
    }

    if (!formData.primaryColor.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.primaryColor = 'Invalid color format'
    }

    if (!formData.secondaryColor.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.secondaryColor = 'Invalid color format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logoUrl: 'Please select an image file' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logoUrl: 'File size must be less than 5MB' }))
      return
    }

    // Create a local preview without storing the file as base64
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    const objectUrl = URL.createObjectURL(file)
    setLogoObjectUrl(objectUrl)
    setLogoPreview(objectUrl)
    setLogoFile(file)

    setErrors(prev => ({ ...prev, logoUrl: undefined }))
  }

  const handleAutoSlug = () => {
    const newSlug = slugify(formData.name)
    setFormData(prev => ({ ...prev, slug: newSlug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!tenant?.id) return

    try {
      setSuccess(false)

      let logoUrl = formData.logoUrl
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'png'
        const path = `${tenant.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('tenant-logos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (uploadError) {
          setErrors(prev => ({ ...prev, logoUrl: 'Failed to upload logo. Please try again.' }))
          return
        }

        const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path)
        logoUrl = data.publicUrl
      }

      const result = await update({
        tenant_id: tenant.id,
        logo_url: logoUrl,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor,
        default_language: formData.defaultLanguage,
        patient_feedback_enabled: formData.enablePatientFeedback,
        resident_profiles_enabled: formData.enableResidentProfiles,
      })

      if (result.success) {
        setFormData(prev => ({ ...prev, logoUrl }))
        setLogoFile(null)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Error saving settings:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Organization Settings</h1>
        <p className="text-[var(--text-secondary)]">Customize your organization's appearance and preferences</p>
      </div>

      {settingsError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{settingsError}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">✓ Settings saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Basics */}
        <section className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Organization Info</h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--clinical-blue)]'
                }`}
                placeholder="e.g., Acme Hospital"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Organization Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.slug ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--clinical-blue)]'
                  }`}
                  placeholder="e.g., acme-hospital"
                />
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="px-3 py-2 bg-[var(--clinical-blue)] text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
                >
                  Auto-Generate
                </button>
              </div>
              {errors.slug && <p className="text-red-600 text-xs mt-1">{errors.slug}</p>}
              <p className="text-xs text-[var(--text-secondary)] mt-1">Used for subdomain: {formData.slug}.app.example.com</p>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Branding</h2>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Organization Logo
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center hover:border-[var(--clinical-blue)] transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {logoPreview ? (
                      <div>
                        <img src={logoPreview} alt="Logo preview" className="h-12 mx-auto mb-2 object-contain" />
                        <p className="text-xs text-[var(--text-secondary)]">Click to change logo</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl mb-2">📸</p>
                        <p className="text-sm text-[var(--text-primary)] font-medium">Upload logo</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">PNG, JPG, or GIF (max 5MB)</p>
                      </div>
                    )}
                  </div>
                  {errors.logoUrl && <p className="text-red-600 text-xs mt-1">{errors.logoUrl}</p>}
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-10 border border-[var(--border)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)] font-mono text-sm"
                    placeholder="#2E75B6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-12 h-10 border border-[var(--border)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)] font-mono text-sm"
                    placeholder="#1F4788"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Preferences</h2>

          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Default Language
              </label>
              <select
                value={formData.defaultLanguage}
                onChange={e => setFormData({ ...formData, defaultLanguage: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Used for patient-facing interface</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Features</h2>

          <div className="space-y-3">
            {/* Patient Feedback Toggle */}
            <ToggleSwitch
              label="Patient Feedback"
              description="Allow patients to rate their request experience after resolution"
              checked={formData.enablePatientFeedback}
              onChange={checked => setFormData({ ...formData, enablePatientFeedback: checked })}
            />

            {/* Resident Profiles Toggle */}
            <ToggleSwitch
              label="Resident Profiles"
              description="Let staff assign residents to rooms and link them to requests on the Bay Map"
              checked={formData.enableResidentProfiles}
              onChange={checked => setFormData({ ...formData, enableResidentProfiles: checked })}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--hover-bg)] transition">
      <div>
        <p className="font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-[var(--clinical-blue)]' : 'bg-[var(--border)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

const IMAGE_ICON_PATTERN = /^(data:image\/|blob:|https?:\/\/|\/)/i

export function isImageIcon(icon: string | null | undefined) {
  return Boolean(icon && IMAGE_ICON_PATTERN.test(icon.trim()))
}

interface Props {
  icon: string | null | undefined
  label?: string
  className?: string
  imageClassName?: string
  fallback?: string
}

export default function RequestTypeIcon({
  icon,
  label = 'Request',
  className,
  imageClassName,
  fallback = '❔',
}: Props) {
  const value = icon?.trim() ?? ''
  if (!value) return <span className={className}>{fallback}</span>

  if (isImageIcon(value)) {
    return (
      <img
        src={value}
        alt={`${label} icon`}
        className={imageClassName ?? className}
      />
    )
  }

  return <span className={className}>{value}</span>
}

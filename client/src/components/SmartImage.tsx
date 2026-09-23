import type { ImgHTMLAttributes } from "react"
import { webpSrc } from "../lib/webp"

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  [dataAttr: `data-${string}`]: string | undefined
}

/**
 * <img> that always renders WebP: serves the converted source via <picture>
 * with the original as a graceful fallback for clients without WebP support.
 * All props (classNames, data-parallax, loading, etc.) are forwarded to the
 * underlying <img>.
 */
export function SmartImage({ src, alt = "", ...rest }: SmartImageProps) {
  const webp = webpSrc(src)
  if (webp === src) {
    return <img src={src} alt={alt} {...rest} />
  }
  return (
    <picture>
      <source type="image/webp" srcSet={webp} />
      <img src={src} alt={alt} {...rest} />
    </picture>
  )
}
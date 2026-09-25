import type { ImgHTMLAttributes } from "react"
import { webpSrc } from "../lib/webp"

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  [dataAttr: `data-${string}`]: string | undefined
}

/**
 * <img> that always renders WebP: serves the converted source via <picture>
 * with the original as a graceful fallback for clients without WebP support.
 * All props (classNames, data-parallax, etc.) are forwarded to the underlying
 * <img>.
 *
 * Defaults to `loading="lazy"` + `decoding="async"` so off-screen images never
 * compete with above-the-fold content. Above-the-fold / LCP images must opt out
 * explicitly with `loading="eager" fetchPriority="high"`.
 */
export function SmartImage({
  src,
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImageProps) {
  const webp = webpSrc(src)
  if (webp === src) {
    return <img src={src} alt={alt} loading={loading} decoding={decoding} {...rest} />
  }
  return (
    <picture>
      <source type="image/webp" srcSet={webp} />
      <img src={src} alt={alt} loading={loading} decoding={decoding} {...rest} />
    </picture>
  )
}
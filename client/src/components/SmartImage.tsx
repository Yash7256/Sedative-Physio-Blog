import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react"
import { webpSrc } from "../lib/webp"

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  [dataAttr: `data-${string}`]: string | undefined
}

/**
 * <img> that serves WebP through <picture> with the original as fallback.
 *
 * A failed <source> does not make the browser retry the <img> automatically,
 * so the image's error event drops the source once and reloads the original
 * raster. All props (classNames, data-parallax, etc.) are forwarded.
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
  onError,
  ...rest
}: SmartImageProps) {
  const webp = webpSrc(src)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const webpFailed = failedSrc === src

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (!webpFailed && webp !== src) setFailedSrc(src)
    onError?.(event)
  }

  const img = <img src={src} alt={alt} loading={loading} decoding={decoding} onError={handleError} {...rest} />

  if (webp === src || webpFailed) return img
  return (
    <picture>
      <source type="image/webp" srcSet={webp} />
      {img}
    </picture>
  )
}

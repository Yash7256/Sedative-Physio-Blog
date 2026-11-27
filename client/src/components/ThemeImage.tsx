import { useEffect, useState, type ImgHTMLAttributes } from "react"

import { SmartImage } from "./SmartImage"

interface ThemeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string
  darkSrc?: string
  [dataAttr: `data-${string}`]: string | undefined
}

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
}

/**
 * Renders only the image variant for the current theme. The two <SmartImage>s
 * this replaces were both mounted, so browsers downloaded both files even
 * though CSS hid one of them.
 */
export function ThemeImage({ src, darkSrc, ...rest }: ThemeImageProps) {
  const [dark, setDark] = useState(isDark)

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return <SmartImage src={dark && darkSrc ? darkSrc : src} {...rest} />
}

import Image from "next/image"

interface AppLogoProps {
  size?: number
  variant?: "dark" | "light"  // dark = black logo on light bg, light = white logo on dark bg
}

export function AppLogo({ size = 40, variant = "dark" }: AppLogoProps) {
  return (
    <Image
      src={variant === "light" ? "/logo-white.png" : "/logo-black.png"}
      alt="املاک‌بین"
      width={size}
      height={size}
      className="rounded-2xl"
      priority
    />
  )
}

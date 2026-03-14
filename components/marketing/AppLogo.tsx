import Image from "next/image"

interface AppLogoProps {
  size?: number
}

export function AppLogo({ size = 40 }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="املاک‌بین"
      width={size}
      height={size}
      className="rounded-2xl"
      priority
    />
  )
}

// src/components/ui/avatar.tsx
import * as React from "react"
import Image from "next/image"
import { cn } from "../utils/cn"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt = "Avatar", src, width, height, ...props }, ref) => {
    // Só renderiza a imagem se houver um src válido (string não vazia)
    if (!src || typeof src !== 'string' || src.trim() === '') {
      return null;
    }

    return (
      <Image
        ref={ref}
        className={cn("aspect-square h-full w-full object-cover", className)}
        src={src}
        alt={alt}
        width={typeof width === 'number' ? width : 40}
        height={typeof height === 'number' ? height : 40}
        {...props}
      />
    );
  }
)
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }

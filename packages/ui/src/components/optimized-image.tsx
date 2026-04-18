import Image from 'next/image';

// Exemplo de componente com imagens otimizadas usando Next.js Image
export function OptimizedImageExample() {
  return (
    <div className="space-y-6">
      {/* Logo principal - otimizado */}
      <div className="flex justify-center">
        <Image
          src="/images/LOGO_300.png"
          alt="GladPros Logo"
          width={300}
          height={300}
          priority // Carrega imediatamente (para logos principais)
          className="w-32 h-32 object-contain"
        />
      </div>

      {/* Ícone otimizado */}
      <div className="flex items-center space-x-3">
        <Image
          src="/icon.ico"
          alt="GladPros Icon"
          width={32}
          height={32}
          className="w-8 h-8"
        />
        <span>Sistema GladPros</span>
      </div>

      {/* Imagem responsiva */}
      <div className="relative w-full h-64">
        <Image
          src="/images/LOGO_200.png"
          alt="Logo secundário"
          fill // Preenche o container pai
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
}

// Hook personalizado para otimização de imagens
export function useOptimizedImage(src: string, alt: string, options?: {
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return {
    src,
    alt,
    width: options?.width || 300,
    height: options?.height || 300,
    priority: options?.priority || false,
    className: options?.className || '',
  };
}

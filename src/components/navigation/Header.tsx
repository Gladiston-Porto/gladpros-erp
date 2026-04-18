import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '../ThemeToggle';

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e título */}
          <Link href="/dashboard" className="flex items-center space-x-3">
            <Image
              src="/images/LOGO_200.png"
              alt="GladPros Logo"
              width={40}
              height={40}
              priority // Carrega imediatamente
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                GladPros
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sistema de Gestão
              </span>
            </div>
          </Link>

          {/* Navegação */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/clientes"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Clientes
            </Link>
            <Link
              href="/propostas"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Propostas
            </Link>
          </nav>

          {/* Ações do usuário */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {/* Avatar do usuário */}
            <div className="flex items-center space-x-2">
              <Image
                src="/images/LOGO_ICONE.png"
                alt="Avatar do usuário"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
              />
              <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">
                Usuário
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

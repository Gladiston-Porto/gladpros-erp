import Image from 'next/image';
import { memo } from 'react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Camera, Edit, Mail, Phone, MapPin } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  location?: string;
  joinDate: string;
  lastLogin: string;
}

interface UserProfileCardProps {
  user: UserProfile;
  onEdit?: () => void;
  onChangeAvatar?: () => void;
}

// Componente memoizado para evitar re-renders desnecessários
export const UserProfileCard = memo(function UserProfileCard({
  user,
  onEdit,
  onChangeAvatar
}: UserProfileCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="relative mx-auto w-24 h-24 mb-4">
          <Image
            src={user.avatar || '/images/LOGO_ICONE.png'}
            alt={`Foto de ${user.name}`}
            fill
            className="rounded-full object-cover border-4 border-white shadow-lg"
            sizes="96px"
            priority={false}
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
            onClick={onChangeAvatar}
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>

        <CardTitle className="text-xl">{user.name}</CardTitle>
        <Badge variant="outline" className="mt-2">
          {user.role}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <Mail className="w-4 h-4" />
          <span>{user.email}</span>
        </div>

        {user.phone && (
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            <span>{user.phone}</span>
          </div>
        )}

        {user.location && (
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{user.location}</span>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Membro desde: {user.joinDate}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Último acesso: {user.lastLogin}</span>
          </div>
        </div>

        <Button
          onClick={onEdit}
          className="w-full"
          variant="outline"
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar Perfil
        </Button>
      </CardContent>
    </Card>
  );
});

// Hook para otimizar imagens de perfil
export function useProfileImage(src?: string, size: number = 96) {
  return {
    src: src || '/images/LOGO_ICONE.png',
    alt: 'Foto do perfil',
    width: size,
    height: size,
    className: 'rounded-full object-cover',
    sizes: `${size}px`,
  };
}
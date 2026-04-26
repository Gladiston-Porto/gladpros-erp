// src/components/profile/AvatarUpload.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';

import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";


interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (file: File) => Promise<void>;
  userInitials: string;
  isLoading?: boolean;
}

export function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  userInitials,
  isLoading = false
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.style.setProperty('--pos-x', `${posX}%`);
      imgRef.current.style.setProperty('--pos-y', `${posY}%`);
    }
  }, [posX, posY]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Formato não suportado. Use PNG, JPG, GIF ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Arquivo muito grande. O limite é 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setPosX(50);
      setPosY(50);
    };
    reader.readAsDataURL(file);
    setPendingFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  };

  const clearPreview = () => {
    setPreview(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!pendingFile) return;
    setIsSaving(true);
    try {
      await onAvatarChange(pendingFile);
      clearPreview();
    } finally {
      setIsSaving(false);
    }
  };

  const displaySrc = preview || currentAvatar || undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Foto do Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preview circular */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`relative h-32 w-32 overflow-hidden rounded-full border-4 border-border bg-muted flex items-center justify-center select-none ${!preview ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={!preview ? () => fileInputRef.current?.click() : undefined}
            title={!preview ? 'Clique para escolher uma foto' : undefined}
          >
            {displaySrc ? (
              <img
                ref={imgRef}
                src={displaySrc}
                alt="Foto do perfil"
                className="absolute inset-0 h-full w-full object-cover pointer-events-none object-[var(--pos-x,50%)_var(--pos-y,50%)]"
                draggable={false}
              />
            ) : (
              <span className="text-3xl font-bold text-muted-foreground select-none">
                {userInitials}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Esta foto aparecerá no seu perfil e no cabeçalho do sistema.
          </p>
        </div>

        {/* Controles de posicionamento (somente quando há preview) */}
        {preview && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground text-center">
              Ajuste a posição da imagem no círculo
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">← Horizontal →</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={posX}
                  onChange={e => setPosX(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                  aria-label="Posição horizontal da foto"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">↑ Vertical ↓</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={posY}
                  onChange={e => setPosY(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                  aria-label="Posição vertical da foto"
                />
              </div>
            </div>
          </div>
        )}

        {/* Área de upload (drag & drop) */}
        {!preview && (
          <>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-brand-primary bg-brand-primary/5'
                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/20'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Selecionar foto de perfil"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              Arraste uma imagem aqui ou <span className="text-brand-primary underline">selecione um arquivo</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF ou WebP até 5MB</p>
          </div>
          {errorMsg && (
            <p className="text-xs text-destructive text-center px-1" role="alert">{errorMsg}</p>
          )}
          </>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2">
          {preview ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearPreview}
                disabled={isLoading || isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading || isSaving}
                className="flex-1"
              >
                {isSaving ? 'Salvando...' : 'Salvar Foto'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Escolher Foto
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

}

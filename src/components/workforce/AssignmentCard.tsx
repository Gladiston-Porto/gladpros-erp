'use client';

/**
 * AssignmentCard Component
 * 
 * Displays a single assignment (worker linked to a job/project)
 * with rate info and quick actions.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, User, DollarSign, Clock, Trash2 } from 'lucide-react';

interface AssignmentCardProps {
    assignment: {
        id: number;
        status: string;
        payType: 'HOURLY' | 'FIXED';
        costRateHourly?: number | null;
        fixedCostAmount?: number | null;
        role?: string | null;
        effectiveFrom: string;
        worker: {
            id: number;
            name: string;
            email?: string | null;
        };
    };
    onRemove?: (id: number) => void;
    onEdit?: (id: number) => void;
    readonly?: boolean;
}

export function AssignmentCard({
    assignment,
    onRemove,
    onEdit,
    readonly = false
}: AssignmentCardProps) {
    const [loading, setLoading] = useState(false);

    const handleRemove = async () => {
        if (!onRemove) return;
        setLoading(true);
        try {
            await onRemove(assignment.id);
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-800',
        COMPLETED: 'bg-blue-100 text-blue-800',
        CANCELLED: 'bg-gray-100 text-gray-800'
    };

    const payTypeLabels = {
        HOURLY: 'Por Hora',
        FIXED: 'Fixo'
    };

    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {assignment.worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">
                                {assignment.worker.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                                {assignment.role || 'Worker'}
                            </p>
                            {assignment.worker.email && (
                                <p className="text-xs text-gray-400">
                                    {assignment.worker.email}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge className={statusColors[assignment.status] || 'bg-gray-100'}>
                            {assignment.status}
                        </Badge>

                        {!readonly && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={loading}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {onEdit && (
                                        <DropdownMenuItem onClick={() => onEdit(assignment.id)}>
                                            <User className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                    )}
                                    {onRemove && (
                                        <DropdownMenuItem
                                            onClick={handleRemove}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Remover
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>
                            {assignment.payType === 'HOURLY'
                                ? `${formatCurrency(assignment.costRateHourly)}/hr`
                                : formatCurrency(assignment.fixedCostAmount)
                            }
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{payTypeLabels[assignment.payType]}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

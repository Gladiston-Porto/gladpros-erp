export type JobStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface SchedulerJob {
    id: number;
    ticketNumber: string;
    title: string;
    priority: JobPriority;
    status: JobStatus;
    description?: string;
    addressStreet?: string;
    addressCity?: string;
    clienteId: number;
    Cliente: {
        nomeCompleto: string;
        nomeFantasia?: string | null;
    };
    appointments?: SchedulerAppointment[];
}

export interface SchedulerAppointment {
    id: number;
    technicianId?: number;
    scheduledStart: string; // ISO
    scheduledEnd: string; // ISO
    Technician?: {
        nomeCompleto: string;
    }
}

// For frontend drag items
export interface DraggableJobItem {
    id: number; // Database ID
    title: string;
    client: string;
    duration: number; // estimated hours
    status: JobStatus;
    techId?: string; // "tech-1"
    startTime?: number;
}

/**
 * Serviços do módulo Projetos
 * Barrel export para facilitar importação
 */

export { ProjectNumberService } from "./ProjectNumberService";
export { ProjectService, ProjectServiceError } from "./ProjectService";
export { ProjectStageService, ProjectStageServiceError } from "./ProjectStageService";
export { ProjectMaterialService, ProjectMaterialServiceError } from "./ProjectMaterialService";
export { ProjectMaterialMetricsService } from "./ProjectMaterialMetricsService";
export { ProjectTaskService, ProjectTaskServiceError } from "./ProjectTaskService";
export { ProjectAttachmentService, ProjectAttachmentServiceError } from "./ProjectAttachmentService";
export { ProjectHistoryService, type RegistrarHistoricoDTO } from "./ProjectHistoryService";
export { ProjectProposalConversionService, ProjectProposalConversionServiceError } from "./ProjectProposalConversionService";
// NOTE: Phantom exports removed (22/03/2026) — files do not exist yet.
// When F1-F4 services are implemented, re-add:
// export { ProjectPermitInspectionService } from "./ProjectPermitInspectionService";
// export { ProjectPunchListService } from "./ProjectPunchListService";
// export { CloseoutTemplateService } from "./CloseoutTemplateService";
// export { ChecklistTemplateService } from "./ChecklistTemplateService";
// export { ChecklistApplyService } from "./ChecklistApplyService";
// export { WarrantyTicketService } from "./WarrantyTicketService";
// export { WarrantyAnalyticsService } from "./WarrantyAnalyticsService";
// export { ClientFeedbackService } from "./ClientFeedbackService";
export { ProjectCloseoutService, ProjectCloseoutServiceError } from "./ProjectCloseoutService";
export { PortalTokenService, PortalTokenServiceError } from "./PortalTokenService";

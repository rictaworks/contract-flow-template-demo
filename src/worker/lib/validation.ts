import {
  isCertainty,
  isContractType,
  isDeliverableState,
  isMaintenanceRecordState,
  isMaintenanceStage,
  isRole,
  isScale,
  isWorkType,
} from "../master/enums";
import type {
  Certainty,
  ContractType,
  DeliverableState,
  MaintenanceRecordState,
  MaintenanceStage,
  Role,
  Scale,
  WorkType,
} from "../master/enums";
import type { ProjectProfile } from "../domain/types";

export class ValidationError extends Error {}

export function assertProfile(body: unknown): ProjectProfile {
  if (typeof body !== "object" || body === null) throw new ValidationError("invalid body");
  const b = body as Record<string, unknown>;
  if (!isContractType(b.contractType)) throw new ValidationError("invalid contractType");
  if (!isWorkType(b.workType)) throw new ValidationError("invalid workType");
  if (!isScale(b.scale)) throw new ValidationError("invalid scale");
  if (!isCertainty(b.requirementCertainty)) throw new ValidationError("invalid requirementCertainty");
  return {
    contractType: b.contractType as ContractType,
    workType: b.workType as WorkType,
    scale: b.scale as Scale,
    requirementCertainty: b.requirementCertainty as Certainty,
  };
}

export function assertDeliverableState(value: unknown): DeliverableState {
  if (!isDeliverableState(value)) throw new ValidationError("invalid deliverable state");
  return value;
}

export function assertRole(value: unknown): Role {
  if (!isRole(value)) throw new ValidationError("invalid role");
  return value;
}

export function assertMaintenanceStage(value: unknown): MaintenanceStage {
  if (!isMaintenanceStage(value)) throw new ValidationError("invalid maintenance stage");
  return value;
}

export function assertMaintenanceRecordState(value: unknown): MaintenanceRecordState {
  if (!isMaintenanceRecordState(value)) throw new ValidationError("invalid maintenance record state");
  return value;
}

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value;
}

export function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be boolean`);
  return value;
}

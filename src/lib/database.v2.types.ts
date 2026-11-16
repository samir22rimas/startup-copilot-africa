/**
 * Row types for the Anza 2.0 tables
 * (supabase/migrations/20261115000100_anza_v2_platform.sql).
 */
import type { Json } from "./database.types"

/** A table whose inserts need `Required` keys and may set anything else. */
type Table<Row, Required extends keyof Row, Immutable extends keyof Row = never> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Omit<Row, Immutable>>
  Relationships: []
}

export type ArtifactModule =
  | "validation"
  | "research"
  | "model"
  | "plan"
  | "finance"
  | "marketing"
  | "report"
  | "onboarding"

export type IdeaStatus = "saved" | "archived" | "converted"
export type AssumptionCategory = "problem" | "customer" | "solution" | "price" | "channel" | "market" | "other"
export type AssumptionStatus = "untested" | "testing" | "validated" | "invalidated"
export type EvidenceKind = "interview" | "survey" | "feedback" | "competitor" | "experiment"
export type EvidenceStance = "supports" | "contradicts" | "neutral"
export type MilestoneStatus = "planned" | "in_progress" | "done" | "cancelled"
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
export type TaskSource = "manual" | "ai" | "copilot" | "legacy"
export type MemoryKind = "fact" | "decision" | "goal" | "preference" | "risk"
export type OpportunityType =
  | "competition"
  | "incubator"
  | "accelerator"
  | "grant"
  | "scholarship"
  | "funding_program"
  | "mentorship"
  | "event"
  | "challenge"
export type FundingType = "grant" | "equity" | "debt" | "prize" | "non_financial" | "mixed"
export type OpportunityStatus = "draft" | "published" | "archived"
export type ApplicationStatus = "none" | "preparing" | "submitted" | "accepted" | "rejected"
export type SubscriptionPlan = "free" | "pro" | "team"

type Stamped = { created_at: string; updated_at: string }

export type BusinessIdeaRow = Stamped & {
  id: string
  user_id: string
  title: string
  summary: string
  country_code: string | null
  industry: string | null
  inputs: Json
  analysis: Json
  criteria: Json
  score: number | null
  status: IdeaStatus
  startup_id: string | null
}

export type ArtifactRow = Stamped & {
  id: string
  startup_id: string
  project_id: string | null
  module: ArtifactModule
  kind: string
  title: string
  content: Json
  meta: Json
  current_version: number
  created_by: string | null
  updated_by: string | null
  archived_at: string | null
}

export type ArtifactVersionRow = {
  id: string
  artifact_id: string
  startup_id: string
  version: number
  title: string
  content: Json
  note: string | null
  created_by: string | null
  created_at: string
}

export type SharedLinkRow = {
  id: string
  token: string
  artifact_id: string
  startup_id: string
  created_by: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export type AssumptionRow = Stamped & {
  id: string
  startup_id: string
  statement: string
  category: AssumptionCategory
  status: AssumptionStatus
  importance: number
  created_by: string | null
}

export type EvidenceRow = Stamped & {
  id: string
  startup_id: string
  assumption_id: string | null
  kind: EvidenceKind
  title: string
  notes: string
  details: Json
  stance: EvidenceStance
  occurred_on: string | null
  created_by: string | null
}

export type MilestoneRow = Stamped & {
  id: string
  startup_id: string
  project_id: string
  title: string
  description: string
  due_date: string | null
  status: MilestoneStatus
  position: number
  created_by: string | null
}

export type TaskRow = Stamped & {
  id: string
  startup_id: string
  project_id: string
  milestone_id: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  tag: string | null
  assignee_id: string | null
  due_date: string | null
  blocked_reason: string | null
  position: number
  source: TaskSource
  completed_at: string | null
  created_by: string | null
}

export type TaskCommentRow = {
  id: string
  task_id: string
  startup_id: string
  author_id: string | null
  body: string
  created_at: string
}

export type MemoryRow = Stamped & {
  id: string
  startup_id: string
  kind: MemoryKind
  content: string
  rationale: string | null
  source: "user" | "copilot"
  pinned: boolean
  created_by: string | null
  archived_at: string | null
}

export type OpportunityRow = Stamped & {
  id: string
  title: string
  organization: string
  type: OpportunityType
  description: string
  countries: string[]
  industries: string[]
  stages: string[]
  funding_type: FundingType
  amount_text: string | null
  eligibility: string
  deadline: string | null
  is_rolling: boolean
  source_url: string
  source_name: string | null
  last_verified_at: string
  verified_by: string | null
  status: OpportunityStatus
}

export type OpportunityTrackingRow = Stamped & {
  id: string
  startup_id: string
  opportunity_id: string
  bookmarked: boolean
  application_status: ApplicationStatus
  notes: string
  updated_by: string | null
}

export type ActivityRow = {
  id: number
  startup_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  created_at: string
}

export type AiUsageRow = {
  id: number
  user_id: string | null
  startup_id: string | null
  feature: string
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  tokens_reported: boolean
  success: boolean
  error: string | null
  duration_ms: number | null
  created_at: string
}

export type SubscriptionRow = Stamped & {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: "active" | "trialing" | "past_due" | "canceled"
  provider: string | null
  provider_customer_ref: string | null
  provider_subscription_ref: string | null
  current_period_end: string | null
}

export type FeatureFlagRow = {
  key: string
  description: string
  enabled: boolean
  updated_by: string | null
  updated_at: string
}

export type AuditLogRow = {
  id: number
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Json
  created_at: string
}

export type TeamReactionKey = "thumbs_up" | "heart" | "party" | "laugh" | "thanks" | "eyes" | "check" | "fire"

export type TeamMessageReactionRow = {
  message_id: string
  startup_id: string
  user_id: string
  reaction: TeamReactionKey
  created_at: string
}

export type TeamChannelReadRow = {
  startup_id: string
  user_id: string
  channel_key: string
  last_read_at: string
}

export type V2Tables = {
  business_ideas: Table<BusinessIdeaRow, "user_id" | "title", "id" | "user_id" | "created_at">
  artifacts: Table<ArtifactRow, "startup_id" | "module" | "kind" | "title", "id" | "startup_id" | "created_at">
  artifact_versions: Table<ArtifactVersionRow, "artifact_id" | "startup_id" | "version" | "title" | "content">
  shared_links: Table<SharedLinkRow, "token" | "artifact_id" | "startup_id">
  validation_assumptions: Table<AssumptionRow, "startup_id" | "statement", "id" | "startup_id" | "created_at">
  validation_evidence: Table<EvidenceRow, "startup_id" | "kind" | "title", "id" | "startup_id" | "created_at">
  milestones: Table<MilestoneRow, "startup_id" | "project_id" | "title", "id" | "startup_id" | "project_id" | "created_at">
  tasks: Table<TaskRow, "startup_id" | "project_id" | "title", "id" | "startup_id" | "created_at">
  task_comments: Table<TaskCommentRow, "task_id" | "startup_id" | "body">
  business_memory: Table<MemoryRow, "startup_id" | "kind" | "content", "id" | "startup_id" | "created_at">
  opportunities: Table<
    OpportunityRow,
    "title" | "organization" | "type" | "source_url" | "last_verified_at",
    "id" | "created_at"
  >
  opportunity_tracking: Table<
    OpportunityTrackingRow,
    "startup_id" | "opportunity_id",
    "id" | "startup_id" | "opportunity_id" | "created_at"
  >
  activity_log: Table<ActivityRow, "startup_id" | "action" | "entity_type" | "summary">
  ai_usage: Table<AiUsageRow, "feature" | "provider" | "model">
  subscriptions: Table<SubscriptionRow, "user_id", "id" | "user_id" | "created_at">
  feature_flags: Table<FeatureFlagRow, "key">
  audit_logs: Table<AuditLogRow, "action">
  team_message_reactions: Table<TeamMessageReactionRow, "message_id" | "startup_id" | "user_id" | "reaction">
  team_channel_reads: Table<TeamChannelReadRow, "startup_id" | "user_id" | "channel_key">
}

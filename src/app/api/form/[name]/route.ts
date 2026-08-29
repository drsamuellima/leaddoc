import { NextResponse } from "next/server";
import { clientIp } from "@/lib/config";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  addKnowledgeAction,
  addKnowledgePackAction,
  addOptionAction,
  adminAddSupportNoteAction,
  adminChargeAction,
  adminCreateChatbotCore,
  adminCreateClinicAction,
  adminCreateStripeSubAction,
  adminInviteStaffAction,
  adminLinkStripeAction,
  adminSaveBrandingAction,
  adminSavePlanAction,
  adminToggleWidgetExceptionAction,
  adminSetSubscriptionAction,
  adminDeleteClinicAction,
  adminResetUserPasswordAction,
  createChatbotCore,
  deleteChatbotAction,
  adminDeleteChatbotAction,
  deleteKnowledgeAction,
  deleteOptionAction,
  updateKnowledgeAction,
  inviteStaffAction,
  logoutAction,
  markNotificationsReadAction,
  saveBrandingAction,
  saveChatbotAction,
  signupAction,
  startBillingPortalAction,
  startCheckoutAction,
  requestPasswordResetAction,
  resetPasswordAction,
  updateLeadAction,
  createLeadTaskAction,
  completeLeadTaskAction,
  deleteLeadsAction,
  patchLeadInlineAction,
  createPipelineAction,
  updatePipelineAction,
  addPipelineStageAction,
  updatePipelineStageAction,
  deletePipelineStageAction,
  deletePipelineAction,
  addLeadNoteAction,
  addLeadRecallAction,
  completeLeadRecallAction,
  updateOptionAction,
} from "@/lib/actions";
import { originFromRequest } from "@/lib/integrations";
import { enterClinicAt, enterClinicResponse, exitClinicResponse } from "@/lib/impersonate";

export const maxDuration = 30;

const handlers: Record<string, (formData: FormData) => Promise<void>> = {
  signup: signupAction,
  logout: () => logoutAction(),
  checkout: () => startCheckoutAction(),
  billingPortal: () => startBillingPortalAction(),
  requestPasswordReset: requestPasswordResetAction,
  resetPassword: resetPasswordAction,
  saveChatbot: saveChatbotAction,
  deleteChatbot: deleteChatbotAction,
  addOption: addOptionAction,
  updateOption: updateOptionAction,
  deleteOption: deleteOptionAction,
  addKnowledge: addKnowledgeAction,
  addKnowledgePack: addKnowledgePackAction,
  updateKnowledge: updateKnowledgeAction,
  deleteKnowledge: deleteKnowledgeAction,
  saveBranding: saveBrandingAction,
  inviteStaff: inviteStaffAction,
  updateLead: updateLeadAction,
  createLeadTask: createLeadTaskAction,
  completeLeadTask: completeLeadTaskAction,
  deleteLeads: deleteLeadsAction,
  patchLeadInline: patchLeadInlineAction,
  createPipeline: createPipelineAction,
  updatePipeline: updatePipelineAction,
  addPipelineStage: addPipelineStageAction,
  updatePipelineStage: updatePipelineStageAction,
  deletePipelineStage: deletePipelineStageAction,
  deletePipeline: deletePipelineAction,
  addLeadNote: addLeadNoteAction,
  addLeadRecall: addLeadRecallAction,
  completeLeadRecall: completeLeadRecallAction,
  markNotificationsRead: () => markNotificationsReadAction(),
  adminCreateClinic: adminCreateClinicAction,
  adminLinkStripe: adminLinkStripeAction,
  adminCreateStripeSub: adminCreateStripeSubAction,
  adminCharge: adminChargeAction,
  adminSavePlan: adminSavePlanAction,
  adminAddSupportNote: adminAddSupportNoteAction,
  adminToggleWidgetException: adminToggleWidgetExceptionAction,
  adminDeleteChatbot: adminDeleteChatbotAction,
  adminSetSubscription: adminSetSubscriptionAction,
  adminSaveBranding: adminSaveBrandingAction,
  adminInviteStaff: adminInviteStaffAction,
  adminDeleteClinic: adminDeleteClinicAction,
  adminResetUserPassword: adminResetUserPasswordAction,
};

export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (
    (name === "signup" || name === "requestPasswordReset" || name === "resetPassword") &&
    !rateLimit(`form:${name}:${clientIp(request)}`, 8, 15 * 60 * 1000)
  ) {
    return NextResponse.json(rateLimitResponse(), { status: 429 });
  }
  const formData = await request.formData().catch(() => new FormData());
  if (name === "impersonate") return enterClinicResponse(request, formData);
  if (name === "exitImpersonate") return exitClinicResponse(request);
  if (name === "createChatbot") {
    const created = await createChatbotCore();
    return formRedirect(request, created.path);
  }
  if (name === "adminCreateChatbot") {
    const created = await adminCreateChatbotCore(formData);
    return enterClinicAt(request, created.organizationId, created.path);
  }
  const handler = handlers[name];
  if (!handler) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404 });
  }
  try {
    await handler(formData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const redirected = formRedirectFromError(request, error);
    if (redirected) return redirected;
    throw error;
  }
}

function formRedirect(request: Request, path: string) {
  const target = path.startsWith("http://") || path.startsWith("https://") ? path : new URL(path, originFromRequest(request)).toString();
  return NextResponse.redirect(target, 303);
}

function formRedirectFromError(request: Request, error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return null;
  const digest = String((error as { digest?: unknown }).digest || "");
  if (!digest.startsWith("NEXT_REDIRECT;")) return null;
  const path = digest.split(";")[2] || "/app";
  return formRedirect(request, path);
}

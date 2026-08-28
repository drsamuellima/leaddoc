import { NextResponse } from "next/server";
import { clientIp } from "@/lib/config";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  addKnowledgeAction,
  addKnowledgePackAction,
  addOptionAction,
  adminAddSupportNoteAction,
  adminChargeAction,
  adminCreateChatbotAction,
  adminCreateClinicAction,
  adminCreateStripeSubAction,
  adminLinkStripeAction,
  adminSavePlanAction,
  adminToggleWidgetExceptionAction,
  adminSetSubscriptionAction,
  adminDeleteClinicAction,
  adminResetUserPasswordAction,
  createChatbotAction,
  deleteChatbotAction,
  adminDeleteChatbotAction,
  deleteKnowledgeAction,
  deleteOptionAction,
  updateKnowledgeAction,
  exitImpersonateAction,
  impersonateAction,
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

const handlers: Record<string, (formData: FormData) => Promise<void>> = {
  signup: signupAction,
  logout: () => logoutAction(),
  checkout: () => startCheckoutAction(),
  billingPortal: () => startBillingPortalAction(),
  requestPasswordReset: requestPasswordResetAction,
  resetPassword: resetPasswordAction,
  saveChatbot: saveChatbotAction,
  createChatbot: createChatbotAction,
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
  impersonate: impersonateAction,
  exitImpersonate: () => exitImpersonateAction(),
  adminLinkStripe: adminLinkStripeAction,
  adminCreateStripeSub: adminCreateStripeSubAction,
  adminCharge: adminChargeAction,
  adminSavePlan: adminSavePlanAction,
  adminAddSupportNote: adminAddSupportNoteAction,
  adminToggleWidgetException: adminToggleWidgetExceptionAction,
  adminCreateChatbot: adminCreateChatbotAction,
  adminDeleteChatbot: adminDeleteChatbotAction,
  adminSetSubscription: adminSetSubscriptionAction,
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
  const formData = await request.formData();
  const handler = handlers[name];
  if (!handler) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404 });
  }
  await handler(formData);
  return NextResponse.json({ ok: true });
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardProjects } from "@/components/dashboard-projects";
import { DashboardWeekStrip } from "@/components/dashboard-week-strip";
import { RecentQuotesReal } from "@/components/recent-quotes-real";
import {
  CreateAppointmentDialog,
  type CreateAppointmentClient,
} from "@/components/create-appointment-dialog";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneForDisplay } from "@/lib/utils";
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber";
import { CalendarPlus2, FilePlus2, FileText, UserPlus } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.actions");
  const tPhone = useTranslations("dashboard.contractorOpsNumber");
  const tQuote = useTranslations("dashboard.quoteRequest");
  const locale = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const { number: twilioNumber, loading: phoneLoading } = useContractorOpsNumber();

  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false);
  const [clients, setClients] = useState<CreateAppointmentClient[]>([]);
  const [profile, setProfile] = useState<{
    time_zone?: string;
    calendar_link?: string;
  } | null>(null);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const contractorUuid = user?.contractor_profile?.uuid;
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const quoteRequestUrl = contractorUuid
    ? `${frontendUrl}/quote-request/${contractorUuid}`
    : "";

  const handleCopyPhone = async () => {
    if (!twilioNumber) return;
    try {
      await navigator.clipboard.writeText(twilioNumber);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    if (!quoteRequestUrl) return;
    try {
      await navigator.clipboard.writeText(quoteRequestUrl);
      setLinkCopied(true);
      toast({ title: tQuote("linkCopied"), description: tQuote("linkCopiedDesc") });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: tQuote("copyFailed"), description: tQuote("copyFailedDesc"), variant: "destructive" });
    }
  };

  const refetchClients = useCallback(() => {
    api
      .getClients(0, 500)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : [];
        setClients(
          list.map((c: any) => ({
            id: c.id,
            name: c.name || c.full_name || "",
            email: c.email || "",
            address:
              c.address_data?.formatted_address?.trim() ||
              c.address?.trim() ||
              undefined,
          }))
        );
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    api
      .getMyProfile()
      .then((p: any) => {
        setProfile({ time_zone: p?.time_zone, calendar_link: p?.calendar_link });
      })
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (!createAppointmentOpen) return;
    refetchClients();
  }, [createAppointmentOpen, refetchClients]);

  const cardBase =
    "rounded-xl border bg-white/60 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-sky-50/40 pb-24 md:pb-6">
      <main className="container mx-auto px-4 pt-3 pb-6">
        <div className="space-y-6">
          {/* Unified 6-card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">

            {/* AI Phone Line */}
            <Card
              className={`${cardBase} border-sky-100 bg-sky-50/60 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5`}
              onClick={handleCopyPhone}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              {phoneLoading ? (
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-sm font-semibold leading-tight truncate">
                  {twilioNumber ? formatPhoneForDisplay(twilioNumber) : tPhone("notSet")}
                  {phoneCopied && <span className="ml-1 text-green-600 text-xs">✓</span>}
                </p>
              )}
            </Card>

            {/* Quote Request */}
            <Card
              className={`${cardBase} border-sky-100 bg-sky-50/40 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5`}
              onClick={handleCopyLink}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-sky-700 leading-tight">
                Quote Request
                {linkCopied && <span className="ml-1 text-green-600 text-xs">✓</span>}
              </p>
            </Card>

            {/* Create Quote */}
            <Card
              className={`${cardBase} border-sky-200 bg-sky-50 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5 hover:bg-sky-100`}
              onClick={() => router.push(`/${locale}/quotes/new`)}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <FilePlus2 className="h-3.5 w-3.5 text-sky-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {t("createQuote") || "Create Quote"}
              </p>
            </Card>

            {/* Create Proposal */}
            <Card
              className={`${cardBase} border-indigo-200 bg-indigo-50 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5 hover:bg-indigo-100`}
              onClick={() => router.push(`/${locale}/proposals/new`)}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <FileText className="h-3.5 w-3.5 text-indigo-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {t("createProposal") || "Create Proposal"}
              </p>
            </Card>

            {/* Schedule */}
            <Card
              className={`${cardBase} border-emerald-200 bg-emerald-50 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5 hover:bg-emerald-100`}
              onClick={() => setCreateAppointmentOpen(true)}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CalendarPlus2 className="h-3.5 w-3.5 text-emerald-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                Schedule
              </p>
            </Card>

            {/* Add Client */}
            <Card
              className={`${cardBase} border-amber-200 bg-amber-50 px-2.5 py-2 cursor-pointer flex flex-col gap-1.5 hover:bg-amber-100`}
              onClick={() => router.push(`/${locale}/clients/new`)}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <UserPlus className="h-3.5 w-3.5 text-amber-700" />
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {tActions("addClient") || "Add Client"}
              </p>
            </Card>
          </div>

          <DashboardWeekStrip />

          {/* Projects and recent quotes */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <DashboardProjects />
            </div>
            <div className="min-w-0">
              <RecentQuotesReal />
            </div>
          </div>
        </div>

        <CreateAppointmentDialog
          open={createAppointmentOpen}
          onOpenChange={setCreateAppointmentOpen}
          clients={clients}
          profile={profile}
          onClientCreated={refetchClients}
        />
      </main>
    </div>
  );
}

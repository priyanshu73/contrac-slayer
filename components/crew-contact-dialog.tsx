"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Mail, MessageSquare, Phone } from "lucide-react";

import { ClientSendSmsDialog } from "@/components/client-send-sms-dialog";
import { ContactSendEmailDialog } from "@/components/contact-send-email-dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

type CrewContact = {
  id: number;
  uuid?: string | null;
  name: string;
  email?: string | null;
  phone_number?: string | null;
};

type CrewContactBaseProps = {
  crew: CrewContact;
  spId?: number | null;
};

/** Opens the same direct-SMS composer used on the client page. */
export function CrewSmsTrigger({
  children,
  crew,
  spId,
}: CrewContactBaseProps & {
  children: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      {crew.phone_number && (
        <ClientSendSmsDialog
          open={open}
          onOpenChange={setOpen}
          spId={spId ?? 0}
          clientName={crew.name}
          clientPhone={crew.phone_number}
          title="Send SMS"
          description="Send a message from your ContractorOps number."
          showPresets={false}
          referenceType="subcontractor"
          referenceId={crew.id}
        />
      )}
    </>
  );
}

/** Keeps call, SMS, and email together behind one anchored Contact action. */
export function CrewContactPopover({
  children,
  crew,
  spId,
}: CrewContactBaseProps & {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);

  const openComposer = (nextChannel: "email" | "sms") => {
    setOpen(false);
    window.setTimeout(() => setChannel(nextChannel), 120);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold">Contact {crew.name}</p>
          </div>
          <div className="grid gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.phone_number}
              asChild={Boolean(crew.phone_number)}
            >
              {crew.phone_number ? (
                <a href={`tel:${crew.phone_number}`} onClick={() => setOpen(false)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              ) : (
                <span>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.phone_number || !spId}
              onClick={() => openComposer("sms")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send SMS
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.email}
              onClick={() => openComposer("email")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send email
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {crew.email && (
        <ContactSendEmailDialog
          open={channel === "email"}
          onOpenChange={(nextOpen) => !nextOpen && setChannel(null)}
          to={crew.email}
          recipientName={crew.name}
        />
      )}

      {crew.phone_number && (
        <ClientSendSmsDialog
          open={channel === "sms"}
          onOpenChange={(nextOpen) => !nextOpen && setChannel(null)}
          spId={spId ?? 0}
          clientName={crew.name}
          clientPhone={crew.phone_number}
          title="Send SMS"
          description="Send a message from your ContractorOps number."
          showPresets={false}
          referenceType="subcontractor"
          referenceId={crew.id}
        />
      )}
    </>
  );
}

/** Anchored availability menu with copy, email, and SMS actions. */
export function CrewAvailabilityPopover({
  children,
  crew,
  locale,
  spId,
}: CrewContactBaseProps & {
  locale: string;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);
  const [availabilityUrl, setAvailabilityUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const initialBody = `Hi ${crew.name || "there"}, please update your availability here:\n${availabilityUrl}`;

  const getAvailabilityUrl = () =>
    crew.uuid
      ? `${window.location.origin}/${locale}/availability/${crew.uuid}`
      : "";

  const copyAvailabilityLink = async () => {
    const url = getAvailabilityUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Availability link copied to clipboard.",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const openComposer = (nextChannel: "email" | "sms") => {
    setAvailabilityUrl(getAvailabilityUrl());
    setOpen(false);
    window.setTimeout(() => setChannel(nextChannel), 120);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold">Request availability</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Copy the private link or send it directly.
            </p>
          </div>
          <div className="grid gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.uuid}
              onClick={copyAvailabilityLink}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.email || !crew.uuid}
              onClick={() => openComposer("email")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send by email
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-start"
              disabled={!crew.phone_number || !spId || !crew.uuid}
              onClick={() => openComposer("sms")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send by SMS
            </Button>
          </div>
          {!spId && crew.phone_number && (
            <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground">
              Set up your ContractorOps number to send SMS.
            </p>
          )}
        </PopoverContent>
      </Popover>

      {crew.email && (
        <ContactSendEmailDialog
          open={channel === "email"}
          onOpenChange={(nextOpen) => !nextOpen && setChannel(null)}
          to={crew.email}
          recipientName={crew.name}
          initialSubject="Availability request"
          initialBody={initialBody}
        />
      )}

      {crew.phone_number && (
        <ClientSendSmsDialog
          open={channel === "sms"}
          onOpenChange={(nextOpen) => !nextOpen && setChannel(null)}
          spId={spId ?? 0}
          clientName={crew.name}
          clientPhone={crew.phone_number}
          presetMessage={initialBody}
          title="Request availability via SMS"
          description="Review the request, then send it from your ContractorOps number."
          showPresets={false}
          referenceType="subcontractor"
          referenceId={crew.id}
        />
      )}
    </>
  );
}

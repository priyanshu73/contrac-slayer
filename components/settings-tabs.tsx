"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="business" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      {/* Business Settings */}
      <TabsContent value="business" className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Business Information</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input id="business-name" placeholder="Smith Landscaping" defaultValue="Smith Landscaping" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-email">Business Email</Label>
                <Input
                  id="business-email"
                  type="email"
                  placeholder="contact@smithlandscaping.com"
                  defaultValue="contact@smithlandscaping.com"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-phone">Phone Number</Label>
                <Input id="business-phone" placeholder="(555) 123-4567" defaultValue="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-website">Website</Label>
                <Input
                  id="business-website"
                  placeholder="www.smithlandscaping.com"
                  defaultValue="www.smithlandscaping.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-address">Business Address</Label>
              <Input
                id="business-address"
                placeholder="123 Main Street, Springfield, IL 62701"
                defaultValue="123 Main Street, Springfield, IL 62701"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-description">Business Description</Label>
              <Textarea
                id="business-description"
                placeholder="Tell clients about your business..."
                className="min-h-[100px]"
                defaultValue="Professional landscaping services for residential and commercial properties. Specializing in lawn maintenance, garden design, and outdoor improvements."
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Invoice Settings</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
                <Input id="invoice-prefix" placeholder="INV-" defaultValue="INV-" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Default Payment Terms</Label>
                <Input id="payment-terms" placeholder="Net 30" defaultValue="Net 30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input id="tax-rate" type="number" step="0.01" placeholder="8.00" defaultValue="8.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-notes">Default Invoice Notes</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Add default notes that appear on all invoices..."
                className="min-h-[80px]"
                defaultValue="Payment due within terms specified. Thank you for your business!"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </Card>
      </TabsContent>

      {/* Integrations */}
      <TabsContent value="integrations" className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Connected Integrations</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Manage your connected services and integrations to enhance your workflow.
          </p>

          <div className="space-y-4">
            {/* Stripe Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Stripe</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Accept payments and manage invoices</p>
                  </div>
                  <span className="rounded-full bg-[var(--status-active)]/10 px-2.5 py-1 text-xs font-medium text-[var(--status-active)]">
                    Connected
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">
                    Configure
                  </Button>
                  <Button size="sm" variant="outline">
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>

            {/* Email Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Email Service</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Send invoices and notifications via email</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Google Calendar</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Sync your jobs with Google Calendar</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>

            {/* SMS Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">SMS Notifications</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Send text message reminders to clients</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">AI-Powered Features</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your AI Pricing Assistant is active and analyzing market rates to help you create competitive quotes.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">
                  View AI Settings
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications" className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Email Notifications</h2>
          <p className="mb-6 text-sm text-muted-foreground">Choose which email notifications you want to receive.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-new-leads">New Leads</Label>
                <p className="text-sm text-muted-foreground">Get notified when you receive a new lead</p>
              </div>
              <Switch id="notify-new-leads" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-job-reminders">Job Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders for upcoming jobs</p>
              </div>
              <Switch id="notify-job-reminders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-invoice-paid">Invoice Payments</Label>
                <p className="text-sm text-muted-foreground">Get notified when an invoice is paid</p>
              </div>
              <Switch id="notify-invoice-paid" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-overdue">Overdue Invoices</Label>
                <p className="text-sm text-muted-foreground">Alerts for overdue invoices</p>
              </div>
              <Switch id="notify-overdue" defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Push Notifications</h2>
          <p className="mb-6 text-sm text-muted-foreground">Manage your mobile push notification preferences.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications on your mobile device</p>
              </div>
              <Switch id="push-enabled" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-job-updates">Job Updates</Label>
                <p className="text-sm text-muted-foreground">Updates about scheduled jobs</p>
              </div>
              <Switch id="push-job-updates" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-messages">Client Messages</Label>
                <p className="text-sm text-muted-foreground">New messages from clients</p>
              </div>
              <Switch id="push-messages" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Reminder Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-reminder-time">Job Reminder Time</Label>
              <Input id="job-reminder-time" type="number" placeholder="24" defaultValue="24" />
              <p className="text-sm text-muted-foreground">Hours before job to send reminder</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-reminder-days">Invoice Reminder Days</Label>
              <Input id="invoice-reminder-days" type="number" placeholder="7" defaultValue="7" />
              <p className="text-sm text-muted-foreground">Days before due date to send reminder</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

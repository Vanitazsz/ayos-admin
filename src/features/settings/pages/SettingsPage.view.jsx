import { CheckCircle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
} from '../../../components/ui/form/Form';
import { FormItemLayout } from '../../../components/ui/form/FormItemLayout';
import { FormActions } from '../../../components/ui/form/FormActions';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card';
import { WEIGHT_KEYS, titleCase } from '../logic/SettingsPageLogic';

const TAB_DESCRIPTIONS = {
  general: 'General information and platform defaults',
  booking: 'Defaults applied when new bookings are created',
  ai: 'Configure AI assistant behavior',
  security: 'Admin authentication and session policies',
  payments: 'Platform fees, matching weights, and payout rules',
  notifications: 'Choose which notification channels are active',
  integrations: 'Connect third-party services',
};

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'PHP', label: 'PHP (₱)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Manila', label: 'UTC+08:00 Asia/Manila' },
  { value: 'UTC-08:00', label: 'UTC-08:00 Pacific Time' },
  { value: 'UTC-05:00', label: 'UTC-05:00 Eastern Time' },
  { value: 'UTC+00:00', label: 'UTC+00:00 GMT' },
];

const AUTO_CANCEL_OPTIONS = ['1 Hour', '12 Hours', '24 Hours'];
const ADVANCE_BOOKING_OPTIONS = ['Up to 7 days', 'Up to 30 days', 'Up to 3 months'];
const SESSION_TIMEOUT_OPTIONS = ['15 Minutes', '30 Minutes', '1 Hour', 'Never'];
const PAYOUT_SCHEDULE_OPTIONS = ['Daily', 'Weekly (Every Monday)', 'Bi-weekly', 'Manual Only'];

export function SettingsView({ model }) {
  const {
    activeTab,
    setActiveTab,
    form,
    isSubmitting,
    saveSuccess,
    handleSave,
    handleCancel,
    tabs,
  } = model;

  const matchingWeights = form.watch('matchingWeights');
  const weightsTotal = Object.values(matchingWeights || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  const tabLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-foreground-lighter mt-1">Configure global application settings and integrations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-surface-200'
                }`}
              >
                <span
                  className={`mr-3 ${activeTab === tab.id ? 'text-primary' : 'text-foreground-muted'}`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{tabLabel} Configuration</CardTitle>
                <CardDescription>{TAB_DESCRIPTIONS[activeTab]}</CardDescription>
              </div>
              {saveSuccess && (
                <span className="shrink-0 text-sm text-success flex items-center font-medium">
                  <CheckCircle size={16} className="mr-1" /> Settings saved successfully
                </span>
              )}
            </CardHeader>
            <Form {...form}>
              <form onSubmit={handleSave} noValidate>
                <CardContent className="space-y-6">
                  {activeTab === 'general' && (
                    <>
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="siteName"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Platform Name"
                              description="Name shown across the A-yos platform"
                            >
                              <FormControl>
                                <Input {...field} placeholder="A-yos Platform" />
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="supportEmail"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Support Email"
                              description="Address used for support and system emails"
                            >
                              <FormControl>
                                <Input {...field} type="email" placeholder="support@ayos.example" />
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                      </div>

                      <div className="pt-6 border-t border-border space-y-6">
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Default Currency"
                              description="Currency used for all monetary values"
                            >
                              <FormControl>
                                <Select {...field}>
                                  {CURRENCY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Select>
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="System Timezone"
                              description="Timezone used for bookings and scheduling"
                            >
                              <FormControl>
                                <Select {...field}>
                                  {TIMEZONE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Select>
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                      </div>

                      <div className="pt-6 border-t border-border">
                        <FormField
                          control={form.control}
                          name="maintenanceMode"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Enable Maintenance Mode"
                              description="Disables customer and worker apps for updates"
                            >
                              <FormControl className="flex justify-end">
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'booking' && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="autoCancel"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Auto-cancel unassigned bookings after"
                            description="Bookings without a worker are cancelled after this window"
                          >
                            <FormControl>
                              <Select {...field}>
                                {AUTO_CANCEL_OPTIONS.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </Select>
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="advanceBooking"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Advance Booking Limit"
                            description="How far in the future bookings can be placed"
                          >
                            <FormControl>
                              <Select {...field}>
                                {ADVANCE_BOOKING_OPTIONS.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </Select>
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="aiEnabled"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Enable AI Request Analysis"
                            description="Analyze consented requests; deterministic matching remains authoritative"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="aiCostEstimationEnabled"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="AI Cost Estimation"
                            description="Display AI-generated estimated cost for user requests"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="require2fa"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Require Two-Factor Auth (2FA)"
                            description="Force all admins to use 2FA via authenticator app"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sessionTimeout"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Session Timeout"
                            description="Automatically logout inactive admins"
                          >
                            <FormControl>
                              <Select {...field}>
                                {SESSION_TIMEOUT_OPTIONS.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </Select>
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-6">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="commissionRate"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Global Commission Rate (%)"
                              description="Percentage deducted from worker payouts"
                            >
                              <FormControl>
                                <Input {...field} type="number" min={0} max={50} step={0.1} />
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="homeownerCharge"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Homeowner Service Charge (₱)"
                              description="Flat charge added to the homeowner total"
                            >
                              <FormControl>
                                <Input {...field} type="number" min={0} step={0.01} />
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                      </div>

                      <div className="pt-6 border-t border-border">
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Worker Matching Weights"
                          description="Relative weights used to rank worker matches. Must total 100%"
                        >
                          <FormControl>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {WEIGHT_KEYS.map((key) => (
                                <FormField
                                  key={key}
                                  control={form.control}
                                  name={`matchingWeights.${key}`}
                                  render={({ field }) => (
                                    <FormItemLayout layout="vertical" label={titleCase(key)}>
                                      <FormControl>
                                        <Input {...field} type="number" min={0} max={100} step={1} />
                                      </FormControl>
                                    </FormItemLayout>
                                  )}
                                />
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-foreground-lighter">
                              Total: {Math.round(weightsTotal)}%
                            </p>
                            {form.formState.errors.matchingWeights && (
                              <FormMessage>
                                {form.formState.errors.matchingWeights.message}
                              </FormMessage>
                            )}
                          </FormControl>
                        </FormItemLayout>
                      </div>

                      <div className="pt-6 border-t border-border">
                        <FormField
                          control={form.control}
                          name="payoutSchedule"
                          render={({ field }) => (
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Payout Schedule"
                              description="How often worker payouts are processed"
                            >
                              <FormControl>
                                <Select {...field}>
                                  {PAYOUT_SCHEDULE_OPTIONS.map((option) => (
                                    <option key={option}>{option}</option>
                                  ))}
                                </Select>
                              </FormControl>
                            </FormItemLayout>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="pushEnabled"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Push Notifications"
                            description="Send push notifications to mobile devices"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Email Notifications"
                            description="Send transactional and marketing emails"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="smsEnabled"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="SMS Notifications"
                            description="Send SMS alerts for critical updates"
                          >
                            <FormControl className="flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </div>
                  )}

                  {activeTab === 'integrations' && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="integrationApiKey"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="API Key"
                            description="Used for third-party service authentication"
                          >
                            <FormControl>
                              <Input {...field} placeholder="Enter your API key" />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="webhookUrl"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Webhook URL"
                            description="Receive real-time event payloads at this endpoint"
                          >
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://hooks.example.com/events"
                              />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-end">
                  <FormActions
                    isDirty={form.formState.isDirty}
                    isSubmitting={isSubmitting}
                    onCancel={handleCancel}
                    withDivider={false}
                  />
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}

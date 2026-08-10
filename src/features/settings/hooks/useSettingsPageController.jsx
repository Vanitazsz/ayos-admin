import { loadSettings, saveSetting, subscribe, WEIGHT_KEYS } from '../logic/SettingsPageLogic';
import { useEffect, useState } from 'react';
import { Globe, Shield, CreditCard, Bell, Database, Calendar, Bot } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';

const matchingWeightsSchema = z.object(
  Object.fromEntries(
    WEIGHT_KEYS.map((key) => [key, z.coerce.number().gte(0, 'Must be at least 0').lte(100, 'Must be at most 100')]),
  ),
);

const settingsFormSchema = z
  .object({
    siteName: z.string().min(1, 'Platform name is required'),
    supportEmail: z.email('Enter a valid email address'),
    currency: z.string().min(1, 'Currency is required'),
    timezone: z.string().min(1, 'Timezone is required'),
    maintenanceMode: z.boolean(),
    aiEnabled: z.boolean(),
    aiCostEstimationEnabled: z.boolean(),
    autoCancel: z.string().min(1, 'Select an auto-cancel window'),
    advanceBooking: z.string().min(1, 'Select an advance booking limit'),
    require2fa: z.boolean(),
    sessionTimeout: z.string().min(1, 'Select a session timeout'),
    commissionRate: z.coerce.number().gte(0, 'Must be at least 0').lte(50, 'Must not exceed 50'),
    homeownerCharge: z.coerce.number().gte(0, 'Cannot be negative'),
    payoutSchedule: z.string().min(1, 'Select a payout schedule'),
    matchingWeights: matchingWeightsSchema,
    pushEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    integrationApiKey: z.string(),
    webhookUrl: z.union([z.literal(''), z.url('Enter a valid URL')]),
  })
  .superRefine((data, ctx) => {
    const total = Object.values(data.matchingWeights).reduce(
      (sum, value) => sum + Number(value),
      0,
    );
    if (Math.abs(total - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['matchingWeights'],
        message: `Matching weights must total 100% (currently ${Math.round(total)}%)`,
      });
    }
  });

const DEFAULT_VALUES = {
  siteName: 'A-yos Platform',
  supportEmail: '',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  maintenanceMode: false,
  aiEnabled: false,
  aiCostEstimationEnabled: false,
  autoCancel: '1 Hour',
  advanceBooking: 'Up to 7 days',
  require2fa: true,
  sessionTimeout: '30 Minutes',
  commissionRate: 10,
  homeownerCharge: 0,
  payoutSchedule: 'Daily',
  matchingWeights: {
    distance: 30,
    availability: 20,
    rating: 20,
    completedJobs: 10,
    responseHistory: 10,
    cancellationHistory: 5,
    recommendationPriority: 5,
  },
  pushEnabled: false,
  emailEnabled: false,
  smsEnabled: false,
  integrationApiKey: '',
  webhookUrl: '',
};

const toPercent = (value, fallback) => Math.round(Number(value ?? fallback) * 100);

export function useSettingsPageController() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const form = useForm({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    const refresh = async () => {
      const value = await loadSettings();
      const weights = value['matching.weights'];
      form.reset({
        siteName: value['general.site_name'] ?? DEFAULT_VALUES.siteName,
        supportEmail: value['general.support_email'] ?? DEFAULT_VALUES.supportEmail,
        currency: value['general.currency'] ?? DEFAULT_VALUES.currency,
        timezone: value['general.timezone'] ?? DEFAULT_VALUES.timezone,
        maintenanceMode: Boolean(value['general.maintenance_mode'] ?? DEFAULT_VALUES.maintenanceMode),
        aiEnabled: Boolean(value['ai.enabled'] ?? DEFAULT_VALUES.aiEnabled),
        aiCostEstimationEnabled: Boolean(
          value['ai.cost_estimation_enabled'] ?? DEFAULT_VALUES.aiCostEstimationEnabled,
        ),
        autoCancel: String(value['booking.auto_cancel'] ?? DEFAULT_VALUES.autoCancel),
        advanceBooking: String(value['booking.advance_limit'] ?? DEFAULT_VALUES.advanceBooking),
        require2fa: Boolean(value['security.require_2fa'] ?? DEFAULT_VALUES.require2fa),
        sessionTimeout: String(value['security.session_timeout'] ?? DEFAULT_VALUES.sessionTimeout),
        commissionRate: Number(value['platform_settings.commission_rate'] ?? DEFAULT_VALUES.commissionRate),
        homeownerCharge: Number(value['platform_settings.homeowner_charge'] ?? DEFAULT_VALUES.homeownerCharge),
        payoutSchedule: String(value['platform_settings.payout_schedule'] ?? DEFAULT_VALUES.payoutSchedule),
        matchingWeights: weights
          ? {
              distance: toPercent(weights.distance, 0.3),
              availability: toPercent(weights.availability, 0.2),
              rating: toPercent(weights.rating, 0.2),
              completedJobs: toPercent(weights.completedJobs ?? weights.completed_jobs, 0.1),
              responseHistory: toPercent(
                weights.responseHistory ?? weights.response_history,
                0.1,
              ),
              cancellationHistory: toPercent(
                weights.cancellationHistory ?? weights.cancellation_history,
                0.05,
              ),
              recommendationPriority: toPercent(
                weights.recommendationPriority ?? weights.priority,
                0.05,
              ),
            }
          : DEFAULT_VALUES.matchingWeights,
        pushEnabled: Boolean(value['notifications.push_enabled'] ?? DEFAULT_VALUES.pushEnabled),
        emailEnabled: Boolean(value['notifications.email_enabled'] ?? DEFAULT_VALUES.emailEnabled),
        smsEnabled: Boolean(value['notifications.sms_enabled'] ?? DEFAULT_VALUES.smsEnabled),
        integrationApiKey: String(value['integrations.api_key'] ?? DEFAULT_VALUES.integrationApiKey),
        webhookUrl: String(value['integrations.webhook_url'] ?? DEFAULT_VALUES.webhookUrl),
      });
    };
    void refresh().catch((error) => toast.error('Failed to load settings', error.message));
    return subscribe('system_settings', refresh);
  }, [form, toast]);

  const onSubmit = async (values) => {
    setSaveSuccess(false);
    const weights = Object.fromEntries(
      Object.entries(values.matchingWeights).map(([key, value]) => [key, Number(value) / 100]),
    );
    try {
      await Promise.all([
        saveSetting('general.site_name', values.siteName),
        saveSetting('general.support_email', values.supportEmail),
        saveSetting('general.currency', values.currency),
        saveSetting('general.timezone', values.timezone),
        saveSetting('general.maintenance_mode', values.maintenanceMode),
        saveSetting('ai.enabled', values.aiEnabled),
        saveSetting('ai.cost_estimation_enabled', values.aiCostEstimationEnabled),
        saveSetting('platform_settings.commission_rate', values.commissionRate),
        saveSetting('platform_settings.homeowner_charge', values.homeownerCharge),
        saveSetting('platform_settings.payout_schedule', values.payoutSchedule),
        saveSetting('matching.weights', weights),
        saveSetting('booking.auto_cancel', values.autoCancel),
        saveSetting('booking.advance_limit', values.advanceBooking),
        saveSetting('security.require_2fa', values.require2fa),
        saveSetting('security.session_timeout', values.sessionTimeout),
        saveSetting('notifications.push_enabled', values.pushEnabled),
        saveSetting('notifications.email_enabled', values.emailEnabled),
        saveSetting('notifications.sms_enabled', values.smsEnabled),
        saveSetting('integrations.api_key', values.integrationApiKey),
        saveSetting('integrations.webhook_url', values.webhookUrl),
      ]);
      setSaveSuccess(true);
    } catch (error) {
      toast.error('Save failed', error.message);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Globe size={18} /> },
    { id: 'booking', label: 'Booking Rules', icon: <Calendar size={18} /> },
    { id: 'ai', label: 'AI Assistant', icon: <Bot size={18} /> },
    { id: 'security', label: 'Security & Auth', icon: <Shield size={18} /> },
    { id: 'payments', label: 'Payments & Fees', icon: <CreditCard size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Database size={18} /> },
  ];

  return {
    activeTab,
    setActiveTab,
    form,
    isSubmitting,
    saveSuccess,
    handleSave: form.handleSubmit(onSubmit),
    handleCancel: () => form.reset(),
    tabs,
  };
}

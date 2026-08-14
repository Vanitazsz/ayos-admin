import { useState, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Calculator,
  Save,
  RotateCcw,
  Users,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Switch from '../../../components/ui/Switch';
import { Label } from '../../../components/ui/Label';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../../components/ui/Card';
import { money } from '../../../services/adminShared';

function FeeTypePills({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-200 p-1" role="group">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-ring-btn ${
            value === key
              ? 'bg-foreground text-foreground-contrast'
              : 'text-foreground-lighter hover:text-foreground'
          }`}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SimStat({ label, value, sub, valueClass = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-100 p-3.5 shadow-sm">
      <h4 className="heading-meta truncate">{label}</h4>
      <p className={`mt-1 text-xl font-normal leading-tight ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-foreground-lighter">{sub}</p>
    </div>
  );
}

export function CommissionFeeSettings({
  feeSettings,
  onChangeFeeSettings,
  onSaveFeeSettings,
  isSaving,
  onResetDefaults,
}) {
  const [sampleAmount, setSampleAmount] = useState(1000);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateSetting = (key, value) => {
    onChangeFeeSettings({
      ...feeSettings,
      [key]: value,
    });
  };

  // Live Simulator Calculations
  const simulation = useMemo(() => {
    const amount = Number(sampleAmount) || 0;

    // Worker Commission
    let workerCommission = 0;
    if (feeSettings.workerFeeEnabled) {
      if (feeSettings.workerFeeType === 'percentage') {
        workerCommission = (amount * (Number(feeSettings.workerCommissionRate) || 0)) / 100;
      } else {
        workerCommission = Number(feeSettings.workerFixedFee) || 0;
      }
      const minFee = Number(feeSettings.workerMinFee) || 0;
      if (workerCommission < minFee) {
        workerCommission = minFee;
      }
    }

    // User Fee
    let userFee = 0;
    if (feeSettings.userFeeEnabled) {
      if (feeSettings.userFeeType === 'percentage') {
        userFee = (amount * (Number(feeSettings.userFeeRate) || 0)) / 100;
      } else {
        userFee = Number(feeSettings.userFixedFee) || 0;
      }
      const minFee = Number(feeSettings.userMinFee) || 0;
      if (userFee < minFee) {
        userFee = minFee;
      }
    }

    const vatAmount = feeSettings.includeVat ? (userFee + workerCommission) * 0.12 : 0;
    const customerTotal = amount + userFee;
    const platformRevenue = userFee + workerCommission;
    const workerNet = Math.max(0, amount - workerCommission);

    const workerPct = customerTotal > 0 ? Math.round((workerNet / customerTotal) * 100) : 0;
    const platformPct = customerTotal > 0 ? Math.round((platformRevenue / customerTotal) * 100) : 0;

    return {
      amount,
      workerCommission,
      userFee,
      vatAmount,
      customerTotal,
      platformRevenue,
      workerNet,
      workerPct,
      platformPct,
    };
  }, [sampleAmount, feeSettings]);

  const handleApplyPreset = (presetKey) => {
    if (presetKey === 'standard') {
      onChangeFeeSettings({
        ...feeSettings,
        workerFeeEnabled: true,
        workerFeeType: 'percentage',
        workerCommissionRate: 10,
        workerFixedFee: 50,
        workerMinFee: 0,
        userFeeEnabled: false,
        userFeeType: 'fixed',
        userFeeRate: 0,
        userFixedFee: 0,
        userMinFee: 0,
      });
    } else if (presetKey === 'shared') {
      onChangeFeeSettings({
        ...feeSettings,
        workerFeeEnabled: true,
        workerFeeType: 'percentage',
        workerCommissionRate: 5,
        workerFixedFee: 25,
        workerMinFee: 0,
        userFeeEnabled: true,
        userFeeType: 'percentage',
        userFeeRate: 5,
        userFixedFee: 25,
        userMinFee: 0,
      });
    } else if (presetKey === 'flat_user') {
      onChangeFeeSettings({
        ...feeSettings,
        workerFeeEnabled: false,
        workerFeeType: 'percentage',
        workerCommissionRate: 0,
        workerFixedFee: 0,
        workerMinFee: 0,
        userFeeEnabled: true,
        userFeeType: 'fixed',
        userFeeRate: 0,
        userFixedFee: 30,
        userMinFee: 0,
      });
    } else if (presetKey === 'promo_zero') {
      onChangeFeeSettings({
        ...feeSettings,
        workerFeeEnabled: false,
        workerFeeType: 'percentage',
        workerCommissionRate: 0,
        workerFixedFee: 0,
        workerMinFee: 0,
        userFeeEnabled: false,
        userFeeType: 'percentage',
        userFeeRate: 0,
        userFixedFee: 0,
        userMinFee: 0,
      });
    }
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    await onSaveFeeSettings();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Presets */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Commission & Fee Configuration</CardTitle>
            <CardDescription>
              Configure fee structures for both service providers (workers) and customers (users).
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onResetDefaults}>
              <RotateCcw size={14} />
              Reset Defaults
            </Button>
            <Button
              type="button"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              loadingText="Saving Changes…"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-success-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Fee Settings
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-3">
            <span className="heading-meta">Quick Fee Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset('standard')}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors focus-ring-btn hover:border-border-strong hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Standard Model</span>
                <Badge variant="primary">10% Worker</Badge>
              </div>
              <p className="mt-1 text-xs text-foreground-lighter">
                10% Worker commission, ₱0 User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('shared')}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors focus-ring-btn hover:border-border-strong hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Shared Fee Model</span>
                <Badge variant="info">5% / 5%</Badge>
              </div>
              <p className="mt-1 text-xs text-foreground-lighter">
                5% Worker commission + 5% User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('flat_user')}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors focus-ring-btn hover:border-border-strong hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Flat Customer Fee</span>
                <Badge variant="success">₱30 Flat</Badge>
              </div>
              <p className="mt-1 text-xs text-foreground-lighter">
                ₱0 Worker commission, ₱30 Customer booking fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('promo_zero')}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors focus-ring-btn hover:border-border-strong hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Zero Fee Promo</span>
                <Badge variant="warning">0% Promo</Badge>
              </div>
              <p className="mt-1 text-xs text-foreground-lighter">
                0% Worker commission, ₱0 User fee
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: User Fee Config & Worker Fee Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Commission Settings */}
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
              <div>
                <CardTitle>Worker Commission Fee</CardTitle>
                <CardDescription>Fee deducted from the worker's earnings per completed job</CardDescription>
              </div>
            </div>
            <Switch
              checked={feeSettings.workerFeeEnabled}
              onCheckedChange={(checked) => updateSetting('workerFeeEnabled', checked)}
              aria-label="Enable worker commission fee"
            />
          </CardHeader>

          <CardContent className="flex-1">
            {feeSettings.workerFeeEnabled ? (
              <div className="space-y-4">
                {/* Fee Type Selection */}
                <div>
                  <Label>Commission Fee Structure</Label>
                  <div className="mt-1.5">
                    <FeeTypePills
                      value={feeSettings.workerFeeType}
                      onChange={(value) => updateSetting('workerFeeType', value)}
                      options={[
                        { key: 'percentage', label: 'Percentage (%)', icon: Percent },
                        { key: 'fixed', label: 'Fixed Fee (₱)', icon: DollarSign },
                      ]}
                    />
                  </div>
                </div>

                {/* Rate / Fee Input */}
                {feeSettings.workerFeeType === 'percentage' ? (
                  <div>
                    <Label htmlFor="worker-rate">Commission Percentage Rate (%)</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="worker-rate"
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={feeSettings.workerCommissionRate}
                        onChange={(e) =>
                          updateSetting('workerCommissionRate', Math.max(0, Number(e.target.value)))
                        }
                        inputClassName="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                        %
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-foreground-lighter">
                      Standard industry range: 5% – 20%
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="worker-fixed">Fixed Commission Amount per Job (₱)</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                        ₱
                      </span>
                      <Input
                        id="worker-fixed"
                        type="number"
                        min="0"
                        step="5"
                        value={feeSettings.workerFixedFee}
                        onChange={(e) =>
                          updateSetting('workerFixedFee', Math.max(0, Number(e.target.value)))
                        }
                        inputClassName="pl-7"
                      />
                    </div>
                  </div>
                )}

                {/* Minimum Floor Fee */}
                <div>
                  <Label htmlFor="worker-min">Minimum Fee Floor (₱)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                      ₱
                    </span>
                    <Input
                      id="worker-min"
                      type="number"
                      min="0"
                      step="5"
                      value={feeSettings.workerMinFee}
                      onChange={(e) =>
                        updateSetting('workerMinFee', Math.max(0, Number(e.target.value)))
                      }
                      inputClassName="pl-7"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground-lighter">
                    Guarantees minimum platform earnings even on low-cost jobs.
                  </p>
                </div>

                {/* Auto Deduct Toggle */}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Auto-deduct from Payout
                    </span>
                    <p className="text-xs text-foreground-lighter">
                      Automatically deduct commission when releasing worker payouts
                    </p>
                  </div>
                  <Switch
                    checked={feeSettings.workerAutoDeduct}
                    onCheckedChange={(checked) => updateSetting('workerAutoDeduct', checked)}
                    aria-label="Auto-deduct commission from payout"
                  />
                </div>
              </div>
            ) : (
              <Alert variant="info">
                Worker commission is currently{' '}
                <strong className="font-semibold text-foreground">Disabled</strong>. Workers will
                receive 100% of their job payout amount.
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Alert variant="info" className="w-full">
              Worker commission is deducted from the service provider when the booking reaches
              Completed status.
            </Alert>
          </CardFooter>
        </Card>

        {/* User / Customer Fee Settings */}
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
              <div>
                <CardTitle>User Service / Convenience Fee</CardTitle>
                <CardDescription>Fee added to the customer's total invoice at checkout</CardDescription>
              </div>
            </div>
            <Switch
              checked={feeSettings.userFeeEnabled}
              onCheckedChange={(checked) => updateSetting('userFeeEnabled', checked)}
              aria-label="Enable user service fee"
            />
          </CardHeader>

          <CardContent className="flex-1">
            {feeSettings.userFeeEnabled ? (
              <div className="space-y-4">
                {/* Fee Type Selection */}
                <div>
                  <Label>User Fee Structure</Label>
                  <div className="mt-1.5">
                    <FeeTypePills
                      value={feeSettings.userFeeType}
                      onChange={(value) => updateSetting('userFeeType', value)}
                      options={[
                        { key: 'percentage', label: 'Percentage (%)', icon: Percent },
                        { key: 'fixed', label: 'Fixed Fee (₱)', icon: DollarSign },
                      ]}
                    />
                  </div>
                </div>

                {/* Rate / Fee Input */}
                {feeSettings.userFeeType === 'percentage' ? (
                  <div>
                    <Label htmlFor="user-rate">User Service Fee Percentage (%)</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="user-rate"
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={feeSettings.userFeeRate}
                        onChange={(e) =>
                          updateSetting('userFeeRate', Math.max(0, Number(e.target.value)))
                        }
                        inputClassName="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                        %
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="user-fixed">Fixed Booking Service Fee (₱)</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                        ₱
                      </span>
                      <Input
                        id="user-fixed"
                        type="number"
                        min="0"
                        step="5"
                        value={feeSettings.userFixedFee}
                        onChange={(e) =>
                          updateSetting('userFixedFee', Math.max(0, Number(e.target.value)))
                        }
                        inputClassName="pl-7"
                      />
                    </div>
                  </div>
                )}

                {/* Minimum User Fee */}
                <div>
                  <Label htmlFor="user-min">Minimum Customer Fee (₱)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                      ₱
                    </span>
                    <Input
                      id="user-min"
                      type="number"
                      min="0"
                      step="5"
                      value={feeSettings.userMinFee}
                      onChange={(e) =>
                        updateSetting('userMinFee', Math.max(0, Number(e.target.value)))
                      }
                      inputClassName="pl-7"
                    />
                  </div>
                </div>

                {/* Fee Display Label */}
                <div>
                  <Label htmlFor="user-label">Customer Invoice Label</Label>
                  <div className="mt-1.5">
                    <Input
                      id="user-label"
                      type="text"
                      value={feeSettings.userFeeLabel}
                      onChange={(e) => updateSetting('userFeeLabel', e.target.value)}
                      placeholder="e.g. Platform Service Fee"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground-lighter">
                    This text will be shown on customer receipt line items.
                  </p>
                </div>
              </div>
            ) : (
              <Alert variant="info">
                User service fee is currently{' '}
                <strong className="font-semibold text-foreground">Disabled (Free)</strong>.
                Customers pay exact service booking cost with zero surcharge.
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Alert variant="info" className="w-full">
              User service fee is added directly to the total booking charge during checkout.
            </Alert>
          </CardFooter>
        </Card>
      </div>

      {/* Live Revenue & Fee Breakdown Simulator */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Calculator className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
            <div>
              <CardTitle>Live Fee & Revenue Simulator</CardTitle>
              <CardDescription>
                Test how your current fee rules affect a sample booking transaction
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground-light">Sample Job Subtotal:</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">
                ₱
              </span>
              <Input
                id="sample-amount"
                type="number"
                min="50"
                step="50"
                value={sampleAmount}
                onChange={(e) => setSampleAmount(Math.max(1, Number(e.target.value)))}
                inputClassName="pl-6 pr-2 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SimStat
              label="Job Base Price"
              value={money(simulation.amount)}
              sub="Agreed service price"
            />

            <SimStat
              label="Customer Total Charge"
              value={money(simulation.customerTotal)}
              sub={`Subtotal + ${money(simulation.userFee)} Customer Fee`}
              valueClass="text-info"
            />

            <SimStat
              label="Total Platform Earnings"
              value={money(simulation.platformRevenue)}
              sub={`${money(simulation.userFee)} User Fee + ${money(simulation.workerCommission)} Worker Cut`}
              valueClass="text-brand-600"
            />

            <SimStat
              label="Net Worker Payout"
              value={money(simulation.workerNet)}
              sub={`Subtotal - ${money(simulation.workerCommission)} Commission`}
              valueClass="text-success"
            />
          </div>

          {/* Visual Share Bar */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="heading-meta">Payment Distribution Breakdown</span>
              <span className="text-xs text-foreground-lighter">
                Worker Payout:{' '}
                <strong className="font-semibold text-success">{simulation.workerPct}%</strong>
                <span className="mx-1.5 text-foreground-muted">|</span>
                Platform Revenue:{' '}
                <strong className="font-semibold text-brand-600">{simulation.platformPct}%</strong>
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-200">
              <div
                className="bg-success-500 h-full transition-all duration-300"
                style={{ width: `${simulation.workerPct}%` }}
                title={`Worker Net: ${money(simulation.workerNet)}`}
              />
              <div
                className="bg-brand-500 h-full transition-all duration-300"
                style={{ width: `${simulation.platformPct}%` }}
                title={`Platform Revenue: ${money(simulation.platformRevenue)}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

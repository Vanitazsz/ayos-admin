import { useState, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Switch from '../../../components/ui/Switch';
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
            <CardTitle className="text-lg font-bold text-foreground">
              Commission & Fee Configuration
            </CardTitle>
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
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-warning-500" />
            <span className="text-xs font-semibold text-foreground-light uppercase tracking-wider">
              Quick Fee Presets
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset('standard')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group focus-ring-btn"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Standard Model
                <Badge variant="primary">10% Worker</Badge>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                10% Worker commission, ₱0 User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('shared')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group focus-ring-btn"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Shared Fee Model
                <Badge variant="info">5% / 5%</Badge>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                5% Worker commission + 5% User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('flat_user')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group focus-ring-btn"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Flat Customer Fee
                <Badge variant="success">₱30 Flat</Badge>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                ₱0 Worker commission, ₱30 Customer booking fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('promo_zero')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group focus-ring-btn"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Zero Fee Promo
                <Badge variant="warning">0% Promo</Badge>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-600">
                <Briefcase size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Worker Commission Fee
                </CardTitle>
                <CardDescription className="text-xs">
                  Fee deducted from the worker's earnings per completed job
                </CardDescription>
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
                  <label className="block text-xs font-semibold text-foreground-light mb-1.5">
                    Commission Fee Structure
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={feeSettings.workerFeeType === 'percentage'}
                      onClick={() => updateSetting('workerFeeType', 'percentage')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors focus-ring-btn ${
                        feeSettings.workerFeeType === 'percentage'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-700 font-semibold'
                          : 'border-border-strong text-foreground-lighter hover:bg-surface-200'
                      }`}
                    >
                      <Percent size={14} />
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      aria-pressed={feeSettings.workerFeeType === 'fixed'}
                      onClick={() => updateSetting('workerFeeType', 'fixed')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors focus-ring-btn ${
                        feeSettings.workerFeeType === 'fixed'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-700 font-semibold'
                          : 'border-border-strong text-foreground-lighter hover:bg-surface-200'
                      }`}
                    >
                      <DollarSign size={14} />
                      Fixed Fee (₱)
                    </button>
                  </div>
                </div>

                {/* Rate / Fee Input */}
                {feeSettings.workerFeeType === 'percentage' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground-light mb-1">
                      Commission Percentage Rate (%)
                    </label>
                    <div className="relative">
                      <Input
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-lighter mt-1">
                      Standard industry range: 5% – 20%
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground-light mb-1">
                      Fixed Commission Amount per Job (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                        ₱
                      </span>
                      <Input
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
                  <label className="block text-xs font-semibold text-foreground-light mb-1">
                    Minimum Fee Floor (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                      ₱
                    </span>
                    <Input
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
                  <p className="text-[11px] text-foreground-lighter mt-1">
                    Guarantees minimum platform earnings even on low-cost jobs.
                  </p>
                </div>

                {/* Auto Deduct Toggle */}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground">
                      Auto-deduct from Payout
                    </span>
                    <p className="text-[11px] text-foreground-lighter">
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
              <div className="p-4 rounded-lg bg-surface-200 text-center text-xs text-foreground-lighter">
                Worker commission is currently <span className="font-bold text-destructive">Disabled</span>. Workers will receive 100% of their job payout amount.
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Alert className="w-full border-brand-500/20 bg-brand-500/5">
              <span className="text-foreground-light">
                Worker commission is deducted from the service provider when the booking reaches Completed status.
              </span>
            </Alert>
          </CardFooter>
        </Card>

        {/* User / Customer Fee Settings */}
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-info/10 rounded-lg flex items-center justify-center text-info">
                <Users size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  User Service / Convenience Fee
                </CardTitle>
                <CardDescription className="text-xs">
                  Fee added to the customer's total invoice at checkout
                </CardDescription>
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
                  <label className="block text-xs font-semibold text-foreground-light mb-1.5">
                    User Fee Structure
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={feeSettings.userFeeType === 'percentage'}
                      onClick={() => updateSetting('userFeeType', 'percentage')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors focus-ring-btn ${
                        feeSettings.userFeeType === 'percentage'
                          ? 'border-info bg-info/10 text-info font-semibold'
                          : 'border-border-strong text-foreground-lighter hover:bg-surface-200'
                      }`}
                    >
                      <Percent size={14} />
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      aria-pressed={feeSettings.userFeeType === 'fixed'}
                      onClick={() => updateSetting('userFeeType', 'fixed')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors focus-ring-btn ${
                        feeSettings.userFeeType === 'fixed'
                          ? 'border-info bg-info/10 text-info font-semibold'
                          : 'border-border-strong text-foreground-lighter hover:bg-surface-200'
                      }`}
                    >
                      <DollarSign size={14} />
                      Fixed Fee (₱)
                    </button>
                  </div>
                </div>

                {/* Rate / Fee Input */}
                {feeSettings.userFeeType === 'percentage' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground-light mb-1">
                      User Service Fee Percentage (%)
                    </label>
                    <div className="relative">
                      <Input
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                        %
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground-light mb-1">
                      Fixed Booking Service Fee (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                        ₱
                      </span>
                      <Input
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
                  <label className="block text-xs font-semibold text-foreground-light mb-1">
                    Minimum Customer Fee (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                      ₱
                    </span>
                    <Input
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
                  <label className="block text-xs font-semibold text-foreground-light mb-1">
                    Customer Invoice Label
                  </label>
                  <Input
                    type="text"
                    value={feeSettings.userFeeLabel}
                    onChange={(e) => updateSetting('userFeeLabel', e.target.value)}
                    placeholder="e.g. Platform Service Fee"
                  />
                  <p className="text-[11px] text-foreground-lighter mt-1">
                    This text will be shown on customer receipt line items.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface-200 text-center text-xs text-foreground-lighter">
                User service fee is currently <span className="font-bold text-foreground">Disabled (Free)</span>. Customers pay exact service booking cost with zero surcharge.
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Alert variant="info" className="w-full">
              <span className="text-foreground-light">
                User service fee is added directly to the total booking charge during checkout.
              </span>
            </Alert>
          </CardFooter>
        </Card>
      </div>

      {/* Live Revenue & Fee Breakdown Simulator */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-warning-500/10 rounded-lg flex items-center justify-center text-warning-500 font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Live Fee & Revenue Simulator
              </CardTitle>
              <CardDescription className="text-xs">
                Test how your current fee rules affect a sample booking transaction
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground-light">Sample Job Subtotal:</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-lighter font-bold">
                ₱
              </span>
              <Input
                type="number"
                min="50"
                step="50"
                value={sampleAmount}
                onChange={(e) => setSampleAmount(Math.max(1, Number(e.target.value)))}
                inputClassName="pl-6 pr-2 text-xs font-bold"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Job Subtotal */}
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <span className="text-xs text-foreground-lighter font-medium">Job Base Price</span>
            <p className="text-2xl font-bold text-foreground mt-1">
              {money(simulation.amount)}
            </p>
            <span className="text-[11px] text-foreground-lighter block mt-1">
              Agreed service price
            </span>
          </div>

          {/* Card 2: Customer Pays */}
          <div className="p-4 rounded-xl bg-info/10 border border-info/30">
            <span className="text-xs text-info font-semibold">Customer Total Charge</span>
            <p className="text-2xl font-bold text-info mt-1">
              {money(simulation.customerTotal)}
            </p>
            <span className="text-[11px] text-foreground-lighter block mt-1">
              Subtotal + {money(simulation.userFee)} Customer Fee
            </span>
          </div>

          {/* Card 3: Platform Earns */}
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <span className="text-xs text-brand-700 font-semibold">Total Platform Earnings</span>
            <p className="text-2xl font-bold text-brand-600 mt-1">
              {money(simulation.platformRevenue)}
            </p>
            <span className="text-[11px] text-foreground-lighter block mt-1">
              {money(simulation.userFee)} User Fee + {money(simulation.workerCommission)} Worker Cut
            </span>
          </div>

          {/* Card 4: Worker Receives */}
          <div className="p-4 rounded-xl bg-success/10 border border-success/30">
            <span className="text-xs text-success-600 dark:text-success-400 font-semibold">Net Worker Payout</span>
            <p className="text-2xl font-bold text-success mt-1">
              {money(simulation.workerNet)}
            </p>
            <span className="text-[11px] text-foreground-lighter block mt-1">
              Subtotal - {money(simulation.workerCommission)} Commission
            </span>
          </div>
        </div>

        {/* Visual Share Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-foreground mb-2">
            <span>Payment Distribution Breakdown</span>
            <span>
              Worker Payout: <strong className="text-success">{simulation.workerPct}%</strong> | Platform Revenue: <strong className="text-brand-600">{simulation.platformPct}%</strong>
            </span>
          </div>
          <div className="h-4 w-full bg-surface-200 rounded-full overflow-hidden flex">
            <div
              className="bg-success-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold"
              style={{ width: `${simulation.workerPct}%` }}
              title={`Worker Net: ${money(simulation.workerNet)}`}
            >
              {simulation.workerPct > 15 && `${simulation.workerPct}%`}
            </div>
            <div
              className="bg-brand-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold"
              style={{ width: `${simulation.platformPct}%` }}
              title={`Platform Revenue: ${money(simulation.platformRevenue)}`}
            >
              {simulation.platformPct > 10 && `${simulation.platformPct}%`}
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Sliders,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  Briefcase,
  Info,
  CheckCircle2,
} from 'lucide-react';
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
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sliders className="text-brand-600" size={22} />
              Commission & Fee Configuration
            </h2>
            <p className="text-sm text-foreground-lighter mt-1">
              Configure fee structures for both service providers (workers) and customers (users).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border-strong rounded-lg text-xs font-medium text-foreground-light hover:bg-surface-200 transition-colors"
            >
              <RotateCcw size={14} />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? (
                <>Saving Changes…</>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Fee Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Presets Selection */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-xs font-semibold text-foreground-light uppercase tracking-wider">
              Quick Fee Presets
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset('standard')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Standard Model
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-700 font-bold">
                  10% Worker
                </span>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                10% Worker commission, ₱0 User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('shared')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Shared Fee Model
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info font-bold">
                  5% / 5%
                </span>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                5% Worker commission + 5% User fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('flat_user')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Flat Customer Fee
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                  ₱30 Flat
                </span>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                ₱0 Worker commission, ₱30 Customer booking fee
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('promo_zero')}
              className="p-3 text-left rounded-lg border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-foreground group-hover:text-brand-600 flex items-center justify-between">
                Zero Fee Promo
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                  0% Promo
                </span>
              </div>
              <p className="text-foreground-lighter mt-1 text-[11px]">
                0% Worker commission, ₱0 User fee
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: User Fee Config & Worker Fee Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Commission Settings */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-600">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Worker Commission Fee</h3>
                  <p className="text-xs text-foreground-lighter">
                    Fee deducted from the worker's earnings per completed job
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={feeSettings.workerFeeEnabled}
                  onChange={(e) => updateSetting('workerFeeEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

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
                      onClick={() => updateSetting('workerFeeType', 'percentage')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
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
                      onClick={() => updateSetting('workerFeeType', 'fixed')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
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
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={feeSettings.workerCommissionRate}
                        onChange={(e) =>
                          updateSetting('workerCommissionRate', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full pl-3 pr-10 py-2 border border-border-strong rounded-lg text-sm font-semibold focus:ring-ring focus:border-brand-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-foreground-lighter font-bold">
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
                      <span className="absolute left-3 top-2.5 text-xs text-foreground-lighter font-bold">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={feeSettings.workerFixedFee}
                        onChange={(e) =>
                          updateSetting('workerFixedFee', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full pl-7 pr-3 py-2 border border-border-strong rounded-lg text-sm font-semibold focus:ring-ring focus:border-brand-500"
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
                    <span className="absolute left-3 top-2.5 text-xs text-foreground-lighter font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={feeSettings.workerMinFee}
                      onChange={(e) =>
                        updateSetting('workerMinFee', Math.max(0, Number(e.target.value)))
                      }
                      className="w-full pl-7 pr-3 py-2 border border-border-strong rounded-lg text-sm focus:ring-ring focus:border-brand-500"
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
                  <input
                    type="checkbox"
                    checked={feeSettings.workerAutoDeduct}
                    onChange={(e) => updateSetting('workerAutoDeduct', e.target.checked)}
                    className="rounded border-border-strong text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface-200 text-center text-xs text-foreground-lighter my-4">
                Worker commission is currently <span className="font-bold text-destructive">Disabled</span>. Workers will receive 100% of their job payout amount.
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-brand-500/5 border border-brand-500/20 text-xs flex items-start gap-2">
            <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
            <span className="text-foreground-light">
              Worker commission is deducted from the service provider when the booking reaches Completed status.
            </span>
          </div>
        </div>

        {/* User / Customer Fee Settings */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-info/10 rounded-lg flex items-center justify-center text-info">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">User Service / Convenience Fee</h3>
                  <p className="text-xs text-foreground-lighter">
                    Fee added to the customer's total invoice at checkout
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={feeSettings.userFeeEnabled}
                  onChange={(e) => updateSetting('userFeeEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-info"></div>
              </label>
            </div>

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
                      onClick={() => updateSetting('userFeeType', 'percentage')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
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
                      onClick={() => updateSetting('userFeeType', 'fixed')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
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
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={feeSettings.userFeeRate}
                        onChange={(e) =>
                          updateSetting('userFeeRate', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full pl-3 pr-10 py-2 border border-border-strong rounded-lg text-sm font-semibold focus:ring-ring focus:border-brand-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-foreground-lighter font-bold">
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
                      <span className="absolute left-3 top-2.5 text-xs text-foreground-lighter font-bold">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={feeSettings.userFixedFee}
                        onChange={(e) =>
                          updateSetting('userFixedFee', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full pl-7 pr-3 py-2 border border-border-strong rounded-lg text-sm font-semibold focus:ring-ring focus:border-brand-500"
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
                    <span className="absolute left-3 top-2.5 text-xs text-foreground-lighter font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={feeSettings.userMinFee}
                      onChange={(e) =>
                        updateSetting('userMinFee', Math.max(0, Number(e.target.value)))
                      }
                      className="w-full pl-7 pr-3 py-2 border border-border-strong rounded-lg text-sm focus:ring-ring focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Fee Display Label */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-light mb-1">
                    Customer Invoice Label
                  </label>
                  <input
                    type="text"
                    value={feeSettings.userFeeLabel}
                    onChange={(e) => updateSetting('userFeeLabel', e.target.value)}
                    placeholder="e.g. Platform Service Fee"
                    className="w-full px-3 py-2 border border-border-strong rounded-lg text-sm focus:ring-ring focus:border-brand-500"
                  />
                  <p className="text-[11px] text-foreground-lighter mt-1">
                    This text will be shown on customer receipt line items.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface-200 text-center text-xs text-foreground-lighter my-4">
                User service fee is currently <span className="font-bold text-foreground">Disabled (Free)</span>. Customers pay exact service booking cost with zero surcharge.
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-info/5 border border-info/20 text-xs flex items-start gap-2">
            <Info size={16} className="text-info shrink-0 mt-0.5" />
            <span className="text-foreground-light">
              User service fee is added directly to the total booking charge during checkout.
            </span>
          </div>
        </div>
      </div>

      {/* Live Revenue & Fee Breakdown Simulator */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Live Fee & Revenue Simulator</h3>
              <p className="text-xs text-foreground-lighter">
                Test how your current fee rules affect a sample booking transaction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground-light">Sample Job Subtotal:</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1.5 text-xs text-foreground-lighter font-bold">
                ₱
              </span>
              <input
                type="number"
                min="50"
                step="50"
                value={sampleAmount}
                onChange={(e) => setSampleAmount(Math.max(1, Number(e.target.value)))}
                className="w-full pl-6 pr-2 py-1.5 border border-border-strong rounded-lg text-xs font-bold text-foreground focus:ring-ring focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Simulator Content Cards */}
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
              className="bg-emerald-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold"
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
      </div>
    </div>
  );
}

import { Crown, Plus } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { moneyFromMinor, formatDate } from '../../../services/adminShared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import TableSkeleton from '../../../components/ui/TableSkeleton';
const blankPlan = { id: '', name: '', price: 0, duration_days: 30, is_active: true };
export function SubscriptionsView({ model }) {
  const {
    isLoading,
    error,
    unavailable,
    data,
    plan,
    setPlan,
    activation,
    setActivation,
    confirm,
    closeConfirm,
    extendModal,
    setExtendModal,
    extendDays,
    setExtendDays,
    savePlan,
    activate,
    doExtend,
    cancel,
  } = model;
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recommendation Subscriptions</h1>
          <p className="text-foreground-lighter">
            Manage priority recommendation plans and worker subscriptions.
          </p>
        </div>
        <div className="flex gap-2">
          {!unavailable && data && (
            <>
              <button
                onClick={() =>
                  setActivation({
                    workerId: '',
                    planId: data.plans.find((item) => item.is_active)?.id ?? '',
                  })
                }
                className="rounded-lg border px-4 py-2 font-medium"
              >
                Activate subscription
              </button>
              <button
                onClick={() => setPlan({ ...blankPlan })}
                className="flex items-center rounded-lg bg-brand-600 px-4 py-2 font-medium text-white"
              >
                <Plus size={17} className="mr-2" />
                New plan
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {unavailable ? (
        <section className="rounded-xl border border-warning/40 bg-warning/10 p-6 text-center">
          <p className="text-2xl">⚠️</p>
          <h2 className="mt-2 font-semibold text-foreground">
            This page does not work yet
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-foreground-lighter">
            {error}. The required database tables have not been created in this
            project, so subscription management is unavailable. Once the backend is
            set up, this page will start working automatically.
          </p>
        </section>
      ) : null}
      {!unavailable && (data || isLoading) && (<>
        <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Plans</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {data && data.plans.map((item) => (
            <button
              key={item.id}
              onClick={() => setPlan({ ...item, price: Number(item.amount) / 100 })}
              className="rounded-xl border border-border p-4 text-left transition-colors hover:border-brand-500"
            >
              <Crown className="mb-2 text-warning" />
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-foreground-lighter">
                {moneyFromMinor(item.amount)} · {item.duration_days} days
              </p>
              <p className="mt-2 text-xs">{item.is_active ? 'Active' : 'Inactive'}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Subscriptions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {['Worker', 'Plan', 'Start', 'Expiry', 'Status', 'Actions'].map((label) => (
                <TableHead key={label} scope="col">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} columns={[{}, {}, {}, {}, {}, { className: 'text-right' }]} />
            ) : data.subscriptions.length > 0 ? (
              data.subscriptions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.worker_profiles?.display_name ?? row.worker_id}
                  </TableCell>
                  <TableCell>{row.plan_name}</TableCell>
                  <TableCell>{formatDate(row.starts_at)}</TableCell>
                  <TableCell>{formatDate(row.expires_at)}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setExtendDays('30');
                          setExtendModal({ isOpen: true, row });
                        }}
                        className="text-brand-600"
                      >
                        Extend
                      </button>
                      {row.status === 'active' && (
                        <button onClick={() => void cancel(row)} className="text-destructive">
                          Cancel
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="6" className="text-center text-foreground-lighter">
                  No subscriptions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
      </>)}
      <Modal
        isOpen={Boolean(plan)}
        onClose={() => setPlan(null)}
        title={plan?.id ? 'Edit Plan' : 'Create Plan'}
      >
        {plan && (
          <div className="space-y-4">
            <label className="block text-sm">
              Name
              <input
                value={plan.name}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Price (₱)
              <input
                type="number"
                min="0"
                step="0.01"
                value={plan.price}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, price: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Duration (days)
              <input
                type="number"
                min="1"
                value={plan.duration_days}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, duration_days: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_active}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, is_active: event.target.checked }))
                }
              />
              Active
            </label>
            <button
              onClick={() => void savePlan()}
              className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white"
            >
              Save plan
            </button>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={Boolean(activation)}
        onClose={() => setActivation(null)}
        title="Activate Subscription"
      >
        {activation && (
          <div className="space-y-4">
            <select
              value={activation.workerId}
              onChange={(event) =>
                setActivation((current) => ({ ...current, workerId: event.target.value }))
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="">Select worker</option>
              {data.workers.map((worker) => (
                <option key={worker.account_id} value={worker.account_id}>
                  {worker.display_name}
                </option>
              ))}
            </select>
            <select
              value={activation.planId}
              onChange={(event) =>
                setActivation((current) => ({ ...current, planId: event.target.value }))
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="">Select plan</option>
              {data.plans
                .filter((item) => item.is_active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => void activate()}
              className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white"
            >
              Activate
            </button>
          </div>
        )}
      </Modal>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
        variant="primary"
      />
      <Modal
        isOpen={extendModal.isOpen}
        onClose={() => setExtendModal((s) => ({ ...s, isOpen: false }))}
        title="Extend Subscription"
      >
        <div className="space-y-4">
          <p className="text-foreground-light">Number of days to extend:</p>
          <input
            type="number"
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            min="1"
            className="w-full rounded-lg border p-2"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setExtendModal((s) => ({ ...s, isOpen: false }))}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void doExtend()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"
            >
              Extend
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

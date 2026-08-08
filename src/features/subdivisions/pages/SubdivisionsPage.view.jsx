import { Edit, MapPin, Plus, Power } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Modal from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import SubdivisionMapPicker from '../../../components/SubdivisionMapPicker';
export function SubdivisionsView({ model }) {
  const {
    rows,
    isLoading,
    error,
    form,
    setForm,
    open,
    setOpen,
    saving,
    formError,
    confirm,
    closeConfirm,
    edit,
    submit,
    toggle,
  } = model;
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subdivisions</h1>
          <p className="mt-1 text-foreground-lighter">
            Manage the service areas used for customer and worker matching.
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus className="mr-2 h-4 w-4" /> Add Subdivision
        </Button>
      </div>
      {isLoading && (
        <div className="flex justify-center py-8 text-foreground-lighter">
          <div className="animate-spin h-6 w-6 border-2 border-border-strong border-t-brand-600 rounded-full mr-2" />{' '}
          Loading...
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {['Name', 'Center', 'Radius', 'Status', 'Actions'].map((label) => (
                <TableHead key={label} scope="col">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                <TableCell className="text-foreground-light">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  {Number(row.center_lat).toFixed(6)}, {Number(row.center_lng).toFixed(6)}
                </TableCell>
                <TableCell className="text-foreground-light">
                  {Number(row.radius_meters).toLocaleString()} m
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${row.is_active ? 'bg-success/10 text-success-600 dark:text-success-400' : 'bg-surface-200 text-foreground-light'}`}
                  >
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => edit(row)}
                      className="rounded-lg p-2 text-brand-600 hover:bg-brand-500/10"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Edit size={17} />
                    </button>
                    <button
                      onClick={() => void toggle(row)}
                      className="rounded-lg p-2 text-foreground-light hover:bg-surface-200"
                      aria-label={`${row.is_active ? 'Deactivate' : 'Activate'} ${row.name}`}
                    >
                      <Power size={17} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow hover={false}>
                <TableCell colSpan="5" className="text-center text-foreground-lighter">
                  No subdivisions configured.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Subdivision' : 'Create Subdivision'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-border-strong px-3 py-2"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.center_lat}
                onChange={(event) => setForm({ ...form, center_lat: event.target.value })}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.center_lng}
                onChange={(event) => setForm({ ...form, center_lng: event.target.value })}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Radius (meters)</label>
              <input
                type="number"
                min="100"
                max="50000"
                value={form.radius_meters}
                onChange={(event) => setForm({ ...form, radius_meters: event.target.value })}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
                required
              />
            </div>
          </div>
          <SubdivisionMapPicker
            latitude={form.center_lat}
            longitude={form.center_lng}
            onChange={({ latitude, longitude }) =>
              setForm((current) => ({ ...current, center_lat: latitude, center_lng: longitude }))
            }
          />
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Subdivision'}
            </Button>
          </div>
        </form>
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
    </div>
  );
}

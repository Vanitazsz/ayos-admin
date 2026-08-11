import Modal from './Modal';
import Input from './Input';
import Button from './Button';

export function DateRangeModal({ model }) {
  const { isRangeOpen, setIsRangeOpen, customRange, setCustomRange, handleApplyRange, clear } =
    model;
  return (
    <Modal isOpen={isRangeOpen} onClose={() => setIsRangeOpen(false)} title="Custom Date Range">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label="From"
            value={customRange.from}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
          />
          <Input
            type="date"
            label="To"
            value={customRange.to}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button size="sm" onClick={() => handleApplyRange(customRange.from, customRange.to)}>
          Apply
        </Button>
      </div>
    </Modal>
  );
}

export default DateRangeModal;

import { useState } from 'react';

const CATEGORIES = ['Bat', 'Ball', 'Pads', 'Gloves', 'Helmet', 'Shoes', 'Kit bag', 'Apparel', 'Other'];

export default function ItemForm({ initial, onCancel, onSave, saving }) {
  const [form, setForm] = useState(
    initial || { name: '', category: 'Bat', status: 'have', quantity: 1, price: '', notes: '' }
  );
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Item name is required.');
      return;
    }
    try {
      await onSave({
        ...form,
        quantity: Number(form.quantity) || 1,
        price: form.price === '' ? null : Number(form.price),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22, 36, 28, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <form
        className="card"
        style={{ width: 420, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 style={{ marginBottom: '1rem' }}>{initial ? 'Edit item' : 'Add item'}</h3>
        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus required />
        </div>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="category">Category</label>
            <select id="category" value={form.category} onChange={(e) => update('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="status">Status</label>
            <select id="status" value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="have">Have</option>
              <option value="had">Had (past)</option>
              <option value="want_to_buy">Want to buy</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="price">Price (optional)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ''}
              onChange={(e) => update('price', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save item'}
          </button>
        </div>
      </form>
    </div>
  );
}

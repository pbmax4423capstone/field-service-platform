export const styles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* ── Floating action button ── */
  .fp-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #2563EB;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 14px 22px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
    transition: background 0.15s, transform 0.15s;
    line-height: 1;
  }
  .fp-fab:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
  }
  .fp-fab:active {
    transform: translateY(0);
  }

  /* ── Overlay ── */
  .fp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 2147483646;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: fp-fade-in 0.15s ease;
  }

  @keyframes fp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @media (min-width: 520px) {
    .fp-overlay {
      align-items: center;
    }
  }

  /* ── Modal ── */
  .fp-modal {
    background: #fff;
    border-radius: 16px 16px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fp-slide-up 0.2s ease;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }

  @media (min-width: 520px) {
    .fp-modal {
      border-radius: 16px;
    }
  }

  @keyframes fp-slide-up {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* ── Header ── */
  .fp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    background: #2563EB;
    color: #fff;
    flex-shrink: 0;
  }
  .fp-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
  }
  .fp-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fp-close:hover {
    background: rgba(255,255,255,0.35);
  }

  /* ── Step indicator ── */
  .fp-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 14px 20px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
    position: relative;
  }
  .fp-step-line {
    position: absolute;
    top: 50%;
    left: 20%;
    right: 20%;
    height: 2px;
    background: #e2e8f0;
    z-index: 0;
  }
  .fp-step {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    background: #e2e8f0;
    color: #94a3b8;
    position: relative;
    z-index: 1;
    transition: background 0.2s, color 0.2s;
    margin: 0 24px;
  }
  .fp-step.active {
    background: #2563EB;
    color: #fff;
  }
  .fp-step.done {
    background: #10b981;
    color: #fff;
  }

  /* ── Scrollable body ── */
  .fp-body {
    overflow-y: auto;
    flex: 1;
    padding: 0;
  }

  .fp-step-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .fp-step-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }

  /* ── Form fields ── */
  .fp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fp-label {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
  .fp-input,
  .fp-select,
  .fp-textarea {
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    transition: border-color 0.15s;
    font-family: inherit;
    width: 100%;
  }
  .fp-input:focus,
  .fp-select:focus,
  .fp-textarea:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
  }
  .fp-textarea {
    resize: vertical;
    min-height: 72px;
  }
  .fp-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }

  /* ── Radio cards ── */
  .fp-radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fp-radio-card,
  .fp-time-card {
    display: flex;
    flex-direction: column;
    padding: 10px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .fp-radio-card input,
  .fp-time-card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .fp-radio-card:hover,
  .fp-time-card:hover {
    border-color: #93c5fd;
    background: #eff6ff;
  }
  .fp-radio-card.selected,
  .fp-time-card.selected {
    border-color: #2563EB;
    background: #eff6ff;
  }
  .fp-radio-label {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }
  .fp-radio-sub {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
  }

  .fp-time-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* ── Buttons ── */
  .fp-btn {
    padding: 11px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    border: none;
    font-family: inherit;
  }
  .fp-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .fp-btn-primary {
    background: #2563EB;
    color: #fff;
  }
  .fp-btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .fp-btn-ghost {
    background: #f1f5f9;
    color: #374151;
  }
  .fp-btn-ghost:hover:not(:disabled) {
    background: #e2e8f0;
  }
  .fp-btn-row {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .fp-btn-row .fp-btn-primary {
    flex: 1;
  }

  /* ── Result screens ── */
  .fp-result {
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .fp-result-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
  }
  .fp-result-icon-success {
    background: #dcfce7;
    color: #16a34a;
  }
  .fp-result-icon-error {
    background: #fee2e2;
    color: #dc2626;
  }
  .fp-result-title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
  }
  .fp-result-body {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
    max-width: 320px;
  }
`

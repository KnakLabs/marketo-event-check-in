import { useRef, useState } from "react";

export default function WalkInModal({ onClose, onSubmit, onLookupEmail }) {
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", company: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const lastLookedUpRef = useRef("");
  // Which fields currently hold a value this component filled in, as
  // opposed to something staff typed themselves — so switching to a
  // different email clears the previous match's leftovers instead of
  // stacking them under the new one, while a field staff actually edited
  // is never touched again regardless of what the next lookup finds.
  const autoFilledRef = useRef(new Set());

  function update(field) {
    return (e) => {
      autoFilledRef.current.delete(field);
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  // Fires once staff leaves the email field, not on every keystroke, so a
  // half-typed address never triggers a lookup. Skips a blank field and a
  // value already looked up (blurring twice without changing it).
  async function handleEmailBlur() {
    const email = form.email.trim();
    if (!email || email === lastLookedUpRef.current) return;
    lastLookedUpRef.current = email;

    // Clear out whatever the previous email's lookup filled in before
    // running the new one — otherwise a match's details linger on screen
    // after switching to an email that doesn't match anyone. Snapshotted
    // into a local array first: setForm's updater doesn't actually run
    // until React's next render, so clearing the ref right away (rather
    // than after) would empty it before the updater ever reads it.
    const toClear = [...autoFilledRef.current];
    autoFilledRef.current.clear();
    if (toClear.length) {
      setForm((f) => {
        const next = { ...f };
        for (const field of toClear) next[field] = "";
        return next;
      });
    }

    setLooking(true);
    try {
      const result = await onLookupEmail(email);
      if (result?.found) {
        // Only fills fields still blank — email-first is the normal order,
        // so this is nearly always everything, but it won't overwrite a
        // name staff already typed in before checking the email.
        setForm((f) => {
          const next = { ...f };
          for (const field of ["firstName", "lastName", "company"]) {
            if (!next[field] && result[field]) {
              next[field] = result[field];
              autoFilledRef.current.add(field);
            }
          }
          return next;
        });
      }
    } finally {
      setLooking(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Check in a walk-in</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email *{looking && " — checking Marketo…"}</label>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              onBlur={handleEmailBlur}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>First name</label>
            <input value={form.firstName} onChange={update("firstName")} />
          </div>
          <div className="field">
            <label>Last name</label>
            <input value={form.lastName} onChange={update("lastName")} />
          </div>
          <div className="field">
            <label>Company</label>
            <input value={form.company} onChange={update("company")} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Checking in…" : "Check In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

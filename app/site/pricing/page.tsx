'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { hasSession, isSessionIdle } from '@/lib/api';
import { getSiteSettings, listPlans, savePlan, saveSiteSettings, type SitePlan, type SiteSettings } from '@/lib/site';

function dollars(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

export default function PricingAdmin() {
  const router = useRouter();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [plans, setPlans] = useState<SitePlan[]>([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession() || isSessionIdle()) {
      router.replace('/login');
      return;
    }
    void Promise.all([getSiteSettings(), listPlans()])
      .then(([settings, billing]) => {
        setSite(settings);
        setPlans(billing.plans);
        setStripeConfigured(billing.stripeConfigured);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load pricing.'));
  }, [router]);

  const saveSwitch = async (event: FormEvent) => {
    event.preventDefault();
    if (!site) return;
    setSaving('site');
    setError(null);
    try {
      const saved = await saveSiteSettings(site);
      setSite(saved);
      setNote(saved.paymentsEnabled ? 'Payments are on. Pricing buttons open Stripe Checkout.' : 'Payments are off. Buttons still say Join early access.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(null);
    }
  };

  const saveOne = async (plan: SitePlan) => {
    setSaving(plan.id);
    setError(null);
    setNote(null);
    try {
      const saved = await savePlan(plan.id, plan);
      setPlans((items) => items.map((item) => (item.id === plan.id ? { ...item, ...saved } : item)));
      setNote('Plan saved. New customers get this price. People already subscribed keep the price they started on.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminShell>
      <h1>Pricing</h1>
      <p className="muted">
        These prices appear on the site. When Stripe is connected and Payments is on, checkout charges the same amounts.
        {stripeConfigured ? ' Stripe is connected.' : ' Add STRIPE_SECRET_KEY on the server to connect billing.'}
      </p>
      {error ? <p className="error">{error}</p> : null}
      {note ? <p className="ok">{note}</p> : null}
      {site ? (
        <form className="editor-card" onSubmit={(event) => void saveSwitch(event)}>
          <h2>Payments</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={site.paymentsEnabled}
              onChange={(event) => setSite({ ...site, paymentsEnabled: event.target.checked })}
            />
            Accept payments on the pricing page
          </label>
          <div className="field">
            <label>Free trial days</label>
            <input
              type="number"
              min={0}
              max={60}
              value={site.trialDays}
              onChange={(event) => setSite({ ...site, trialDays: Number(event.target.value) })}
            />
          </div>
          <button className="btn btn-inline" type="submit" disabled={saving === 'site'}>
            {saving === 'site' ? 'Saving…' : 'Save payments'}
          </button>
        </form>
      ) : null}
      {plans.map((plan) => (
        <form
          className="editor-card"
          key={plan.id}
          onSubmit={(event) => {
            event.preventDefault();
            void saveOne(plan);
          }}
        >
          <h2>{plan.name}</h2>
          <div className="grid-2">
            <div className="field">
              <label>Name</label>
              <input value={plan.name} onChange={(event) => setPlans(replace(plans, plan.id, { name: event.target.value }))} />
            </div>
            <div className="field">
              <label>Tag</label>
              <input value={plan.tag} onChange={(event) => setPlans(replace(plans, plan.id, { tag: event.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Short description</label>
            <input value={plan.subtitle} onChange={(event) => setPlans(replace(plans, plan.id, { subtitle: event.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Monthly price (USD)</label>
              <input
                value={dollars(plan.monthlyCents)}
                onChange={(event) => setPlans(replace(plans, plan.id, { monthlyCents: toCents(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Annual price (USD, billed once a year)</label>
              <input
                value={dollars(plan.annualCents)}
                onChange={(event) => setPlans(replace(plans, plan.id, { annualCents: toCents(event.target.value) }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Features, one per line</label>
            <textarea
              rows={6}
              value={plan.features.join('\n')}
              onChange={(event) => setPlans(replace(plans, plan.id, { features: event.target.value.split('\n').filter(Boolean) }))}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={plan.highlighted}
              onChange={(event) => setPlans(replace(plans, plan.id, { highlighted: event.target.checked }))}
            />
            Highlight this plan
          </label>
          <p className="muted">{plan.stripeReady ? 'Synced to Stripe.' : 'Not synced to Stripe yet.'}</p>
          <button className="btn btn-inline" type="submit" disabled={saving === plan.id}>
            {saving === plan.id ? 'Saving…' : 'Save plan'}
          </button>
        </form>
      ))}
    </AdminShell>
  );
}

function replace(plans: SitePlan[], id: string, patch: Partial<SitePlan>) {
  return plans.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan));
}

function toCents(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

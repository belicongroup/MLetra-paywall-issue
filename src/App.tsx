import { useEffect, useMemo, useState } from "react";
import {
  subscriptionService,
  SUBSCRIPTION_PRODUCT_ID_MONTHLY,
  SUBSCRIPTION_PRODUCT_ID_YEARLY,
} from "../../src/services/subscriptionService";
import { getPlatform, isCapacitorEnvironment } from "../../src/lib/capacitor";

type SubscriptionStatus = Awaited<ReturnType<typeof subscriptionService.checkSubscriptionStatus>>;

export default function App() {
  const [selectedProduct, setSelectedProduct] = useState<string>(SUBSCRIPTION_PRODUCT_ID_MONTHLY);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isPro, setIsPro] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("...");
  const [yearlyPrice, setYearlyPrice] = useState("...");
  const [pricesLoading, setPricesLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState<string>("");

  const env = useMemo(() => {
    return {
      inCapacitor: isCapacitorEnvironment(),
      platform: getPlatform(),
    };
  }, []);

  const MOCK_FLAG_KEY = "mletras_payment_test";
  const MOCK_ACTIVE_KEY = "mletras_mock_subscription_active";
  const MOCK_PRODUCT_KEY = "mletras_mock_subscription_productId";
  const MOCK_TX_KEY = "mletras_mock_subscription_transactionId";
  const MOCK_PURCHASED_AT_KEY = "mletras_mock_subscription_purchased_at";

  const writeResult = (title: string, data: unknown) => {
    const pretty = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    setRawOutput(`${title}\n\n${pretty}`);
    console.log(`[PaymentTest] ${title}`, data);
  };

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setStatus(label);
    try {
      const result = await fn();
      writeResult(`${label} - success`, result);
      setStatus(`${label} done`);
      return result;
    } catch (error) {
      writeResult(`${label} - error`, error);
      setStatus(`${label} failed`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const loadProStatus = async () => {
    const st: SubscriptionStatus = await subscriptionService.checkSubscriptionStatus();
    setIsPro(!!st.isActive);
    if (st.isActive) setStatus(`Pro active (${st.productId ?? "unknown"})`);
    else setStatus("Ready (Free)");
    return st;
  };

  const loadPrices = async () => {
    setPricesLoading(true);
    await runAction("Load Products", async () => {
      const monthly = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_MONTHLY);
      const yearly = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_YEARLY);
      setMonthlyPrice(monthly?.price ?? "N/A");
      setYearlyPrice(yearly?.price ?? "N/A");
      return { monthly, yearly };
    });
    setPricesLoading(false);
  };

  useEffect(() => {
    // Enable web "payment test mode" (see production subscriptionService).
    // This makes the paywall flow work in a normal browser without store purchases.
    try {
      localStorage.setItem(MOCK_FLAG_KEY, "true");
      setMockMode(true);
    } catch {
      // ignore
    }
    loadPrices();
    loadProStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onFocus = () => {
      loadPrices();
      loadProStatus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProduct = async () => {
    await runAction("Get Product", () => subscriptionService.getProductInfo(selectedProduct));
  };

  const purchase = async () => {
    const result = await runAction("Purchase", async () => {
      const purchaseResult = await subscriptionService.purchaseSubscription(selectedProduct);

      // Match UpgradeModal's behavior: keep checking until status becomes active.
      let verified = false;
      let attempts = 0;
      const maxAttempts = 5;
      let lastStatus: SubscriptionStatus | null = null;

      while (!verified && attempts < maxAttempts) {
        if (attempts > 0) await new Promise((r) => setTimeout(r, 500));
        lastStatus = await subscriptionService.checkSubscriptionStatus();
        verified = !!lastStatus?.isActive;
        attempts++;
      }

      return { purchaseResult, verified, lastStatus };
    });

    if (result && typeof result === "object" && "verified" in result) {
      const verified = (result as any).verified as boolean;
      setIsPro(verified);
      setStatus(verified ? "Pro active (after purchase)" : "Purchase succeeded, but Pro not active yet");
    }
  };

  const restore = async () => {
    setRestoring(true);
    const result = await runAction("Restore Purchases", async () => {
      const restoreResult = await subscriptionService.restorePurchases();
      const st = await subscriptionService.checkSubscriptionStatus();
      return { restoreResult, st };
    });
    if (result && typeof result === "object" && "st" in result) {
      setIsPro(!!(result as any).st?.isActive);
      setStatus((result as any).st?.isActive ? "Pro active (after restore)" : "No active subscription found");
    }
    setRestoring(false);
  };

  const clearMockSubscription = () => {
    try {
      localStorage.removeItem(MOCK_ACTIVE_KEY);
      localStorage.removeItem(MOCK_PRODUCT_KEY);
      localStorage.removeItem(MOCK_TX_KEY);
      localStorage.removeItem(MOCK_PURCHASED_AT_KEY);
    } catch {
      // ignore
    }
    setIsPro(false);
    setStatus("Ready (Free)");
  };

  const selectMonthly = () => setSelectedProduct(SUBSCRIPTION_PRODUCT_ID_MONTHLY);
  const selectYearly = () => setSelectedProduct(SUBSCRIPTION_PRODUCT_ID_YEARLY);

  return (
    <main className="wrap">
      <div className="paywall">
        <div className="hero">
          <h1>Unlock MLetras Pro</h1>
          <p>Unlimited notes, unlimited folders, premium lyrics flow.</p>
        </div>

        <section className="features">
          <div>Unlimited notes and folders</div>
          <div>Full lyrics experience</div>
          <div>Priority support</div>
          <div>Premium updates</div>
        </section>

        <section className="plans">
          <button
            className={`plan ${selectedProduct === SUBSCRIPTION_PRODUCT_ID_MONTHLY ? "selected" : ""}`}
            onClick={selectMonthly}
            disabled={busy || pricesLoading}
          >
            <div className="planTitle">Monthly</div>
            <div className="planPrice">{monthlyPrice}</div>
          </button>

          <button
            className={`plan ${selectedProduct === SUBSCRIPTION_PRODUCT_ID_YEARLY ? "selected" : ""}`}
            onClick={selectYearly}
            disabled={busy || pricesLoading}
          >
            <div className="badge">Best Value</div>
            <div className="planTitle">Yearly</div>
            <div className="planPrice">{yearlyPrice}</div>
          </button>
        </section>

        <section className="actions">
          <button className="primary" onClick={purchase} disabled={busy || restoring}>
            {busy ? "Processing..." : "Start Subscription"}
          </button>
          <button className="secondary" onClick={restore} disabled={busy || restoring}>
            {restoring ? "Restoring..." : "Restore Purchases"}
          </button>
          <button className="ghost" onClick={loadPrices} disabled={busy || pricesLoading}>
            {pricesLoading ? "Loading..." : "Refresh Prices"}
          </button>
          <button className="ghost" onClick={loadProduct} disabled={busy}>
            Get Selected Product Raw
          </button>
        </section>

        <section className="card">
          <div><strong>Status:</strong> {status}</div>
          <div><strong>Pro:</strong> {String(isPro)} | <strong>Mock mode:</strong> {String(mockMode)}</div>
          <div><strong>Capacitor:</strong> {String(env.inCapacitor)} | <strong>Platform:</strong> {env.platform}</div>
        </section>

        <section className="card">
          <div><strong>Raw Output</strong></div>
          <pre>{rawOutput || "No output yet."}</pre>
        </section>

        <section className="actions">
          <button className="ghost" onClick={clearMockSubscription} disabled={busy}>
            Clear Mock Subscription
          </button>
        </section>
      </div>
    </main>
  );
}

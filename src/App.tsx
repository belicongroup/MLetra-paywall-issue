import { useEffect, useMemo, useState } from "react";
import { CapacitorInAppPurchase } from "@adplorg/capacitor-in-app-purchase";
import {
  subscriptionService,
  SUBSCRIPTION_PRODUCT_ID_MONTHLY,
  SUBSCRIPTION_PRODUCT_ID_YEARLY,
} from "../../src/services/subscriptionService";
import { useProStatus } from "../../src/contexts/ProStatusContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { getPlatform, isCapacitorEnvironment } from "../../src/lib/capacitor";
import appPackage from "../package.json";

type SubscriptionStatus = Awaited<ReturnType<typeof subscriptionService.checkSubscriptionStatus>>;

const MOCK_FLAG_KEY = "mletras_payment_test";
const MOCK_ACTIVE_KEY = "mletras_mock_subscription_active";
const MOCK_PRODUCT_KEY = "mletras_mock_subscription_productId";
const MOCK_TX_KEY = "mletras_mock_subscription_transactionId";
const MOCK_PURCHASED_AT_KEY = "mletras_mock_subscription_purchased_at";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const { isPro, isLoading: proLoading, subscriptionStatus, refreshProStatus } = useProStatus();
  const [selectedProduct, setSelectedProduct] = useState<string>(SUBSCRIPTION_PRODUCT_ID_YEARLY);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusText, setStatusText] = useState("Checking subscription status...");
  const [mockMode, setMockMode] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("...");
  const [yearlyPrice, setYearlyPrice] = useState("...");
  const [pricesLoading, setPricesLoading] = useState(false);
  const [copiedSupport, setCopiedSupport] = useState(false);

  const env = useMemo(
    () => ({
      inCapacitor: isCapacitorEnvironment(),
      platform: getPlatform(),
    }),
    []
  );

  const setWebMockMode = (enabled: boolean) => {
    if (env.inCapacitor) return;
    try {
      if (enabled) localStorage.setItem(MOCK_FLAG_KEY, "true");
      else localStorage.removeItem(MOCK_FLAG_KEY);
      setMockMode(enabled);
    } catch {
      setStatusText("Could not update web mock mode");
    }
  };

  const clearMockSubscription = () => {
    try {
      localStorage.removeItem(MOCK_ACTIVE_KEY);
      localStorage.removeItem(MOCK_PRODUCT_KEY);
      localStorage.removeItem(MOCK_TX_KEY);
      localStorage.removeItem(MOCK_PURCHASED_AT_KEY);
      setStatusText("Mock subscription state cleared");
    } catch {
      setStatusText("Could not clear mock subscription state");
    }
  };

  const loadPrices = async () => {
    setPricesLoading(true);
    try {
      const monthly = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_MONTHLY);
      const yearly = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_YEARLY);
      setMonthlyPrice(monthly?.price ?? "N/A");
      setYearlyPrice(yearly?.price ?? "N/A");
    } catch (error) {
      setStatusText(`Price load failed: ${toErrorMessage(error)}`);
    } finally {
      setPricesLoading(false);
    }
  };

  const refreshStatus = async (force = false) => {
    try {
      await refreshProStatus(force);
      setStatusText("Subscription status refreshed");
    } catch (error) {
      setStatusText(`Refresh failed: ${toErrorMessage(error)}`);
    }
  };

  useEffect(() => {
    if (!env.inCapacitor) {
      try {
        const current = localStorage.getItem(MOCK_FLAG_KEY);
        const enabled = current === null ? true : current === "true";
        if (current === null) localStorage.setItem(MOCK_FLAG_KEY, "true");
        setMockMode(enabled);
      } catch {
        setMockMode(false);
      }
    }
    loadPrices();
    refreshStatus(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (proLoading) {
      setStatusText("Checking your subscription...");
      return;
    }
    if (isPro) {
      setStatusText(`Pro active${subscriptionStatus?.productId ? ` (${subscriptionStatus.productId})` : ""}`);
    } else {
      setStatusText("Pro not active");
    }
  }, [isPro, proLoading, subscriptionStatus?.productId]);

  const purchase = async () => {
    setBusy(true);
    setStatusText("Processing purchase...");
    try {
      const result = await subscriptionService.purchaseSubscription(selectedProduct);
      if (!result.success) {
        setStatusText("Purchase did not complete");
        return;
      }
      await new Promise((r) => setTimeout(r, 700));
      await refreshProStatus(true);
      setStatusText("Purchase complete. Subscription rechecked.");
    } catch (error) {
      setStatusText(`Purchase failed: ${toErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setRestoring(true);
    setStatusText("Restoring purchases...");
    try {
      await subscriptionService.restorePurchases();
      await refreshProStatus(true);
      setStatusText("Restore completed. Subscription rechecked.");
    } catch (error) {
      setStatusText(`Restore failed: ${toErrorMessage(error)}`);
    } finally {
      setRestoring(false);
    }
  };

  const copyDiagnosticsForSupport = async () => {
    setCopiedSupport(false);
    try {
      const directStatus = await subscriptionService.checkSubscriptionStatus();
      const details = await subscriptionService.getSubscriptionDetails();
      const rawActiveSubscriptions = env.inCapacitor
        ? await CapacitorInAppPurchase.getActiveSubscriptions()
        : { skipped: true, reason: "Not running in Capacitor native runtime" };

      const diagnostics = {
        app: {
          name: appPackage.name,
          version: appPackage.version,
        },
        timestamp: new Date().toISOString(),
        env: {
          mode: import.meta.env.MODE,
          nodeEnv: process.env.NODE_ENV,
          inCapacitor: env.inCapacitor,
          platform: env.platform,
        },
        auth: {
          isAuthenticated,
          userId: user?.id ?? null,
          backendSubscriptionType: user?.subscription_type ?? null,
          sessionTokenPresent: Boolean(localStorage.getItem("sessionToken")),
        },
        expectedProducts: {
          monthly: SUBSCRIPTION_PRODUCT_ID_MONTHLY,
          yearly: SUBSCRIPTION_PRODUCT_ID_YEARLY,
        },
        proStatusContext: {
          isPro,
          isLoading: proLoading,
          subscriptionStatus,
        },
        subscriptionService: {
          checkSubscriptionStatus: directStatus,
          getSubscriptionDetails: details,
          rawActiveSubscriptions,
        },
        supportFlags: {
          verifyEndpointTokenConfigured: Boolean(import.meta.env?.VITE_VERIFY_ENDPOINT_TOKEN),
          webMockFlag: localStorage.getItem(MOCK_FLAG_KEY),
          cachedProStatus: localStorage.getItem("cached_pro_status"),
          mockSubscriptionActive: localStorage.getItem(MOCK_ACTIVE_KEY),
          mockSubscriptionProductId: localStorage.getItem(MOCK_PRODUCT_KEY),
          mockSubscriptionTransactionIdPresent: Boolean(localStorage.getItem(MOCK_TX_KEY)),
          mockSubscriptionPurchasedAt: localStorage.getItem(MOCK_PURCHASED_AT_KEY),
        },
      };

      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setCopiedSupport(true);
      setStatusText("Diagnostics copied for support");
    } catch (error) {
      setStatusText(`Could not copy diagnostics: ${toErrorMessage(error)}`);
    }
  };

  return (
    <main className="screen">
      <div className="paywall">
        <header className="hero">
          <p className="heroLabel">M Letras Payment Test</p>
          <h1>Unlock MLetras Pro</h1>
          <p className="heroText">Unlimited notes, unlimited folders, premium lyrics flow.</p>
        </header>

        <section className="statusCard">
          <div className="statusRow">
            <span className={`statusDot ${isPro ? "active" : ""}`} />
            <div>
              <p className="statusTitle">{isPro ? "Pro active" : proLoading ? "Checking status..." : "Free plan active"}</p>
              <p className="statusSub">{statusText}</p>
            </div>
          </div>
        </section>

        <section className="features">
          <div>Unlimited notes and folders</div>
          <div>Full lyrics experience</div>
          <div>Priority support</div>
          <div>Premium updates</div>
        </section>

        <section className="plans">
          <button
            className={`plan ${selectedProduct === SUBSCRIPTION_PRODUCT_ID_MONTHLY ? "selected" : ""}`}
            onClick={() => setSelectedProduct(SUBSCRIPTION_PRODUCT_ID_MONTHLY)}
            disabled={busy || restoring || pricesLoading}
          >
            <div className="planTitle">Monthly</div>
            <div className="planPrice">{monthlyPrice}</div>
          </button>
          <button
            className={`plan ${selectedProduct === SUBSCRIPTION_PRODUCT_ID_YEARLY ? "selected" : ""}`}
            onClick={() => setSelectedProduct(SUBSCRIPTION_PRODUCT_ID_YEARLY)}
            disabled={busy || restoring || pricesLoading}
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
        </section>

        <section className="utility">
          <button className="ghost" onClick={() => loadPrices()} disabled={busy || restoring || pricesLoading}>
            {pricesLoading ? "Loading prices..." : "Refresh Prices"}
          </button>
          <button className="ghost" onClick={() => refreshStatus(true)} disabled={busy || restoring}>
            Refresh Subscription Status
          </button>
          {!env.inCapacitor && (
            <button className="ghost" onClick={() => setWebMockMode(!mockMode)} disabled={busy || restoring}>
              Web Mock Billing: {mockMode ? "On" : "Off"}
            </button>
          )}
          {!env.inCapacitor && (
            <button className="ghost" onClick={clearMockSubscription} disabled={busy || restoring}>
              Clear Mock Subscription
            </button>
          )}
        </section>

        <footer className="footer">
          <p className="metaLine">
            Platform: {env.platform} {env.inCapacitor ? "native" : "web"} {isAuthenticated ? " | Logged in" : " | Guest"}
          </p>
          <button className="linkButton" onClick={copyDiagnosticsForSupport} disabled={busy || restoring}>
            Copy diagnostics for support
          </button>
          {copiedSupport && <p className="copied">Copied. Paste this to your developer/support thread.</p>}
        </footer>
      </div>
    </main>
  );
}

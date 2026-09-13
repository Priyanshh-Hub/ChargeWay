import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/api';
import { GlassCard, Btn, EmptyState, Modal, InputField, Alert } from '../ui/index';
import Icon from '../ui/Icon';

const QUICK_AMOUNTS = [100, 250, 500, 1000];

// Loads the official Razorpay checkout script on demand (only when someone
// actually tries to pay), not on every page load.
let razorpayScriptPromise = null;
const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
};

const WalletPage = ({ user, onUserUpdate }) => {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState("500");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    const res = await api.get("/payments/transactions");
    if (res.ok) setTransactions(res.data.transactions || []);
    setTxLoading(false);
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleTopUp = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) { setError("Enter at least ₹10"); return; }
    setPaying(true); setError("");

    // 1. Ask our backend to create a Razorpay order
    const orderRes = await api.post("/payments/create-order", { amount: amt });
    if (!orderRes.ok) {
      setPaying(false);
      if (orderRes.data?.code === "PAYMENTS_NOT_CONFIGURED" || orderRes.error?.includes("configured")) {
        setError("Payments aren't set up yet — the site owner needs to add Razorpay test keys to the backend.");
      } else {
        setError(orderRes.error || "Couldn't start payment. Please try again.");
      }
      return;
    }

    // 2. Load the Razorpay checkout script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPaying(false);
      setError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }

    // 3. Open Razorpay's checkout modal
    const { orderId, amount: orderAmount, currency, keyId } = orderRes.data;
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount: orderAmount,
      currency,
      name: "ChargeWay",
      description: "Wallet top-up",
      theme: { color: "#FF8A3D" },
      prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      handler: async (response) => {
        // 4. Verify the payment signature server-side
        const verifyRes = await api.post("/payments/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount: amt,
        });
        if (verifyRes.ok) {
          onUserUpdate(verifyRes.data.user);
          toast.success(`₹${amt} added to your wallet`);
          setTopUpOpen(false);
          loadTransactions();
        } else {
          toast.error(verifyRes.error || "Payment verification failed");
        }
        setPaying(false);
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    });
    rzp.on("payment.failed", () => {
      toast.error("Payment failed. No amount was added to your wallet.");
      setPaying(false);
    });
    rzp.open();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-page text-white mb-6">Wallet</h1>

      <GlassCard className="p-6 sm:p-8 mb-6" style={{ background: "linear-gradient(135deg, rgba(91,71,224,0.12), rgba(255,138,61,0.06))" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-black text-white">₹{(user?.walletBalance ?? 0).toFixed(2)}</p>
          </div>
          <Btn onClick={() => { setTopUpOpen(true); setError(""); }}>+ Add Money</Btn>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-card text-white mb-4">Transaction History</h2>
        {txLoading ? (
          <p className="text-slate-500 text-sm text-center py-6">Loading...</p>
        ) : transactions.length === 0 ? (
          <EmptyState icon="wallet" title="No transactions yet"
            subtitle="Top-ups will show up here once you add money to your wallet." />
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map(tx => (
              <div key={tx._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: tx.type === "wallet_topup" ? "rgba(34,197,94,0.12)" : "rgba(255,138,61,0.12)" }}>
                    <Icon name={tx.type === "wallet_topup" ? "wallet" : "stations"}
                      className="w-4 h-4" style={{ color: tx.type === "wallet_topup" ? "#22c55e" : "#FF8A3D" }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {tx.type === "wallet_topup" ? "Wallet top-up" : `Booking payment${tx.bookingId?.stationName ? ` · ${tx.bookingId.stationName}` : ""}`}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(tx.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${tx.status === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.type === "wallet_topup" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Modal open={topUpOpen} onClose={() => !paying && setTopUpOpen(false)} title="Add Money to Wallet">
        <Alert message={error} />
        <div className="mt-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} onClick={() => setAmount(String(a))}
                className="py-2 rounded-lg text-sm font-semibold border transition-all"
                style={{ background: amount === String(a) ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)", borderColor: amount === String(a) ? "rgba(255,138,61,0.5)" : "rgba(255,255,255,0.1)", color: amount === String(a) ? "#FF8A3D" : "#94a3b8" }}>
                ₹{a}
              </button>
            ))}
          </div>
          <InputField type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Custom amount" />
        </div>
        <Btn onClick={handleTopUp} loading={paying} className="w-full mt-5">
          <Icon name="wallet" className="w-4 h-4 inline mr-1.5" /> Continue to Payment
        </Btn>
        <p className="text-xs text-slate-500 text-center mt-3">Secured by Razorpay · Test mode</p>
      </Modal>
    </div>
  );
};

export default WalletPage;

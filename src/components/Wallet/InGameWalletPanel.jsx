import { SUPPORTED_CURRENCIES } from '../../config/currencies';
import { Loader2, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function InGameWalletPanel({
  balanceState = {}, // ✅ Default empty object
  bufferedWinnings = {}, // ✅ Default empty object
  onDeposit,
  onWithdraw,
  handleBufferedWithdraw,
  selectedCurrency,
  setSelectedCurrency,
  CONFIG,
  loading,
  showWalletModal,
  setShowWalletModal,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  getCurrentWalletBalance,
  getCurrentInGameBalance,
  handleDeposit,
  handleWithdraw,
  loadAllCurrencyBalances
}) {
  const [balanceVerificationStatus, setBalanceVerificationStatus] = useState('pending');
  const [lastVerification, setLastVerification] = useState(0);

  const getDisplayCurrencies = () => {
    return SUPPORTED_CURRENCIES.map(currency => {
      if (currency.symbol === 'CORE') {
        if (CONFIG.CHAIN_ID === 1116) {
          return { ...currency, displaySymbol: 'tCORE', displayName: 'Test Core' };
        } else {
          return { ...currency, displaySymbol: 'CORE', displayName: 'Core' };
        }
      }
      return { ...currency, displaySymbol: currency.symbol, displayName: currency.name };
    });
  };

  const displayCurrencies = getDisplayCurrencies();

  // ✅ Safe balance lookups
  const tokenAddr = selectedCurrency?.address || null;
  const currentInGameBalance = parseFloat(balanceState?.inGame?.[tokenAddr] ?? '0');
  const currentWalletBalance = parseFloat(balanceState?.wallet?.[tokenAddr] ?? '0');

  // ✅ Prefer unified state if exists, fallback to prop
  const currentBufferedWinnings = parseFloat(
    balanceState?.buffered?.[tokenAddr] ?? bufferedWinnings?.[tokenAddr] ?? '0'
  );

  useEffect(() => {
    const verifyBalances = () => {
      const now = Date.now();
      if ((balanceState?.lastUpdated ?? 0) && now - balanceState.lastUpdated < 30000) {
        setBalanceVerificationStatus('verified');
      } else {
        setBalanceVerificationStatus('stale');
      }
      setLastVerification(now);
    };

    verifyBalances();
    const interval = setInterval(verifyBalances, 10000);
    return () => clearInterval(interval);
  }, [balanceState?.lastUpdated]);

  const handleSecureWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }
    const requestedAmount = parseFloat(withdrawAmount);

    if (balanceVerificationStatus === 'stale') {
      const shouldProceed = window.confirm(
        `Warning: Balance data is outdated (last updated ${Math.floor(
          (Date.now() - (balanceState?.lastUpdated ?? 0)) / 1000
        )} seconds ago). We recommend refreshing balances first. Proceed anyway?`
      );
      if (!shouldProceed) {
        if (loadAllCurrencyBalances) {
          await loadAllCurrencyBalances();
        }
        return;
      }
    }

    if (requestedAmount > currentInGameBalance) {
      alert(
        `Insufficient balance. You have ${currentInGameBalance.toFixed(4)} ${
          selectedCurrency?.symbol || ''
        } available, but requested ${requestedAmount.toFixed(4)}.`
      );
      return;
    }

    await handleWithdraw();
  };

  const renderWalletModal = () => {
    if (!showWalletModal) return null;
    const mode = showWalletModal;
    const isDeposit = mode === 'deposit';
    const [value, setValue] = isDeposit
      ? [depositAmount, setDepositAmount]
      : [withdrawAmount, setWithdrawAmount];

    const maxAmount = isDeposit ? getCurrentWalletBalance?.() ?? 0 : getCurrentInGameBalance?.() ?? 0;
    const requestedAmount = parseFloat(value) || 0;
    const isValidAmount = requestedAmount > 0 && requestedAmount <= parseFloat(maxAmount);

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {isDeposit ? 'Deposit' : 'Withdraw'} {selectedCurrency?.symbol || 'Token'}
            </h2>
            <button
              onClick={() => setShowWalletModal(null)}
              className="text-gray-500 hover:text-black text-2xl font-bold"
            >
              &times;
            </button>
          </div>

          {balanceVerificationStatus === 'stale' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
              <AlertTriangle size={16} className="text-yellow-600" />
              <div className="text-sm text-yellow-800">
                Balance data is outdated. Consider refreshing first.
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">
                Available: {parseFloat(maxAmount).toFixed(4)} {selectedCurrency?.symbol || 'Token'}
              </div>
              {loadAllCurrencyBalances && (
                <button
                  onClick={loadAllCurrencyBalances}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  disabled={balanceState?.isLoading}
                >
                  <RefreshCw size={12} className={balanceState?.isLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            <input
              type="number"
              step="0.0001"
              placeholder={`Amount in ${selectedCurrency?.symbol || 'Token'}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              max={maxAmount}
              className={`w-full border rounded-full p-3 text-lg ${
                !isValidAmount && value ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />

            {!isValidAmount && value && (
              <div className="text-xs text-red-600 mt-1">
                {requestedAmount <= 0
                  ? 'Amount must be greater than 0'
                  : `Amount exceeds available balance (${parseFloat(maxAmount).toFixed(4)})`}
              </div>
            )}

            <button
              onClick={() => setValue(maxAmount)}
              className="text-xs underline text-blue-600 mt-1 hover:text-blue-800"
            >
              Use Max ({parseFloat(maxAmount).toFixed(4)} {selectedCurrency?.symbol || 'Token'})
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={isDeposit ? handleDeposit : handleSecureWithdraw}
              disabled={loading || !isValidAmount}
              className={`flex-1 py-3 rounded-full text-lg font-semibold transition-all shadow-inner ${
                isDeposit
                  ? 'bg-gradient-to-b from-green-500 to-green-600 text-white hover:scale-105'
                  : 'bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:scale-105'
              } disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : `Confirm ${isDeposit ? 'Deposit' : 'Withdrawal'}`}
            </button>
            <button
              onClick={() => setShowWalletModal(null)}
              className="flex-1 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 text-lg font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceWithStatus = (balance, label, isBuffered = false) => {
    const balanceValue = parseFloat(balance || '0');
    const statusColor =
      balanceVerificationStatus === 'verified'
        ? 'text-green-600'
        : balanceVerificationStatus === 'stale'
        ? 'text-yellow-600'
        : 'text-gray-600';

    return (
      <div className={`rounded-2xl p-4 mb-4 ${isBuffered ? 'bg-yellow-500/20' : 'bg-white/10'}`}>
        <div className="flex justify-between items-center mb-1">
          <div className={`text-sm ${isBuffered ? 'text-yellow-300' : 'text-gray-300'}`}>{label}</div>
          <div className="flex items-center space-x-1">
            <Shield size={12} className={statusColor} />
            <span className={`text-xs ${statusColor}`}>
              {balanceVerificationStatus === 'verified'
                ? 'Verified'
                : balanceVerificationStatus === 'stale'
                ? 'Stale'
                : 'Pending'}
            </span>
          </div>
        </div>
        <div className={`text-xl font-bold ${isBuffered ? 'text-yellow-200' : 'text-white'}`}>
          {balanceValue.toFixed(6)} {selectedCurrency?.symbol || 'N/A'}
        </div>
        {balanceVerificationStatus === 'stale' && (
          <div className="text-xs text-yellow-400 mt-1">
            Last updated: {Math.floor((Date.now() - (balanceState?.lastUpdated ?? 0)) / 1000)}s ago
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="w-full max-w-md p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">In-Game Wallet</h2>
          {loadAllCurrencyBalances && (
            <button
              onClick={loadAllCurrencyBalances}
              disabled={balanceState?.isLoading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh all balances"
            >
              <RefreshCw size={16} className={`text-gray-400 ${balanceState?.isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Currency Selector */}
        <div className="mb-6">
          <label className="text-sm font-semibold">Select Currency:</label>
          <select
            value={selectedCurrency?.symbol || ''}
            onChange={(e) => setSelectedCurrency(displayCurrencies.find(c => c.symbol === e.target.value))}
            className="mt-2 w-full bg-white text-black rounded-full p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {displayCurrencies.map((currency) => (
              <option key={currency.symbol} value={currency.symbol}>
                {currency.displayName} ({currency.displaySymbol})
              </option>
            ))}
          </select>
        </div>

        {renderBalanceWithStatus(currentInGameBalance, 'In-Game Balance')}
        {renderBalanceWithStatus(currentBufferedWinnings, 'Buffered Winnings', true)}

        <div className="bg-blue-500/20 rounded-2xl p-4 mb-6">
          <div className="text-sm text-blue-300 mb-1">Wallet Balance</div>
          <div className="text-lg font-bold text-blue-200">
            {currentWalletBalance.toFixed(6)} {selectedCurrency?.symbol || 'N/A'}
          </div>
        </div>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setShowWalletModal('deposit')}
            disabled={currentWalletBalance === 0}
            className={`flex-1 px-6 py-3 rounded-full text-lg font-semibold shadow-inner transition-all ${
              currentWalletBalance === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-green-600 to-green-700 text-white hover:scale-105'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setShowWalletModal('withdraw')}
            disabled={currentInGameBalance === 0}
            className={`flex-1 px-6 py-3 rounded-full text-lg font-semibold shadow-inner transition-all ${
              currentInGameBalance === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:scale-105'
            }`}
          >
            Withdraw
          </button>
        </div>

        <button
          onClick={handleBufferedWithdraw}
          disabled={currentBufferedWinnings === 0 || loading || balanceVerificationStatus === 'pending'}
          className={`w-full px-6 py-3 rounded-full text-lg font-semibold shadow-inner transition-all flex items-center justify-center space-x-2 ${
            currentBufferedWinnings === 0 || loading || balanceVerificationStatus === 'pending'
              ? 'bg-purple-500/40 text-white cursor-not-allowed'
              : 'bg-gradient-to-b from-purple-600 to-purple-700 text-white hover:scale-105'
          }`}
        >
          <Shield size={16} />
          <span>{loading ? 'Processing...' : 'Withdraw Buffered Winnings'}</span>
          {currentBufferedWinnings > 0 && (
            <span className="text-sm">({currentBufferedWinnings.toFixed(4)})</span>
          )}
        </button>

        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Balance Status:</span>
              <span
                className={
                  balanceVerificationStatus === 'verified'
                    ? 'text-green-400'
                    : balanceVerificationStatus === 'stale'
                    ? 'text-yellow-400'
                    : 'text-gray-400'
                }
              >
                {balanceVerificationStatus.charAt(0).toUpperCase() + balanceVerificationStatus.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>
                {balanceState?.lastUpdated ? new Date(balanceState.lastUpdated).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span>{CONFIG?.NETWORK_NAME || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {renderWalletModal()}
    </>
  );
}

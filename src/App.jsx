import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Header, UIControls } from './components/SpinWheel/index';
import CrFloatingWidget from './components/SpinWheel/CrFloatingWidget';
import { CrService } from './services/CoreCreditsService';
//import Leaderboard from './Leaderboard'; // 
import CoreDaoLogo from './assets/coredao-logo.svg';
import { useBufferedWallet } from './hooks/useBufferedWallet'; // 
import CoreCreditsDashboard from './components/CoreCreditsDashboard';
import { SUPPORTED_CURRENCIES } from './config/currencies';
import InGameWalletPanel from './components/Wallet/InGameWalletPanel';
import SpinWheelABI from './abis/SpinWheel.json';
import { MultiCurrencySpinWheelService } from './services/MultiCurrencySpinWheelService';

import {
  AlertCircle,CheckCircle,ArrowLeft,Loader2,Trophy,Users,Timer,DollarSign,ChevronRight,Gift,Zap,Star,Activity,Eye,Target,TrendingUp,Flame,History,Crown,PartyPopper,ExternalLink,
  RefreshCw,Bell,X,Calendar,TrendingDown,Wallet,Coins,RotateCcw,Volume2,VolumeX} from 'lucide-react';

/*********************************************************************
 *  CONFIG
 *********************************************************************/
const CONFIG = {
  CORE_RPC_URL: 'https://rpc.test2.btcs.network',
  SPIN_WHEEL_CONTRACT_ADDRESS: '0xD6312e6e9b3D6E0D13c17d3391B010D2FbD6191D',
  CORE_TOKEN_ADDRESS: '0x6576E38AaeCEB7986Da94129d7563cd1AFF692fe',
  EXPLORER_URL: 'https://scan.test2.btcs.network',
  CHAIN_ID: 1114,
  NETWORK_NAME: 'Core Testnet 2',
  CURRENCY: 'tCORE',
  PLATFORM_FEES: {
    ENTRY_FEE: 0.015,
    WINNINGS_FEE: 0.0255
  }
};

// Filter out invalid currencies and ensure proper token addresses
const filteredCurrencies = SUPPORTED_CURRENCIES.filter(currency => {
  const isValidNetwork = CONFIG.CHAIN_ID === 1114 ? currency.isTestnet : !currency.isTestnet;
  const hasValidAddress = currency.address && currency.address !== '0x0000000000000000000000000000000000000000';
  return isValidNetwork && hasValidAddress;
});

/*********************************************************************
 *  WEB3 BLOCKCHAIN INTEGRATION SERVICE
 *********************************************************************/
class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.isConnected = false;
    this.chainId = null;
  }

  async initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const Web3 = (await import('web3')).default;
        this.web3 = new Web3(window.ethereum);
        
        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];
        this.chainId = await this.web3.eth.getChainId();
        
        if (this.chainId !== CONFIG.CHAIN_ID) {
          await this.switchNetwork();
        }
        
        await this.initializeContract();
        this.isConnected = true;
        this.setupEventListeners();
        
        return { success: true, account: this.account };
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'MetaMask not found' };
    }
  }

  async switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CONFIG.CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
            chainName: CONFIG.NETWORK_NAME,
            nativeCurrency: { name: CONFIG.CURRENCY, symbol: CONFIG.CURRENCY, decimals: 18 },
            rpcUrls: [CONFIG.CORE_RPC_URL],
            blockExplorerUrls: [CONFIG.EXPLORER_URL]
          }]
        });
      }
    }
  }

  async initializeContract() {
    if (!this.web3) return;
    this.contract = new this.web3.eth.Contract(SpinWheelABI, CONFIG.SPIN_WHEEL_CONTRACT_ADDRESS);
  }

  setupEventListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      this.account = accounts[0] || null;
      window.location.reload();
    });

    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = parseInt(chainId, 16);
      if (this.chainId !== CONFIG.CHAIN_ID) {
        this.switchNetwork();
      }
    });
  }

  async placeSpin(tierId, betAmount) {
    if (!this.contract || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const amountWei = this.web3.utils.toWei(betAmount.toString(), 'ether');
      const gasEstimate = await this.contract.methods
        .spin(tierId, amountWei)
        .estimateGas({ from: this.account, value: amountWei });

      const tx = await this.contract.methods
        .spin(tierId, amountWei)
        .send({
          from: this.account,
          value: amountWei,
          gas: Math.floor(Number(gasEstimate) * 1.2)
        });

      const multiplier = tx.events?.SpinResult?.returnValues?.multiplier || 0;
      return { success: true, txHash: tx.transactionHash, multiplier: Number(multiplier) };

    } catch (error) {
      console.error('Spin failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getBalance() {
    if (!this.web3 || !this.account) return 0;

    try {
      const balance = await this.web3.eth.getBalance(this.account);
      return Number(this.web3.utils.fromWei(balance, 'ether'));
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  disconnect() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.isConnected = false;
    this.chainId = null;
  }
}

/*********************************************************************
 *  SPIN WHEEL CONFIGURATION
 *********************************************************************/
const WHEEL_SEGMENTS = [
  { id: 1, multiplier: 0, probability: 20, color: '#EF4444', label: '0x', angle: 72 },
  { id: 2, multiplier: 1, probability: 35, color: '#F59E0B', label: '1x', angle: 126 },
  { id: 3, multiplier: 2, probability: 20, color: '#10B981', label: '2x', angle: 72 },
  { id: 4, multiplier: 3, probability: 15, color: '#3B82F6', label: '3x', angle: 54 },
  { id: 5, multiplier: 5, probability: 10, color: '#8B5CF6', label: '5x', angle: 36 }
];

const getOutcomeFromRotation = (finalRotation) => {
  const normalizedAngle = (360 - (finalRotation % 360)) % 360;
  let cumulativeAngle = 0;

  for (const segment of WHEEL_SEGMENTS) {
    cumulativeAngle += segment.angle;
    if (normalizedAngle <= cumulativeAngle) {
      return segment;
    }
  }
  return WHEEL_SEGMENTS[0];
};

/*********************************************************************
 *  TIERS CONFIGURATION
 *********************************************************************/
const tiers = [
  {
    id: 1,
    name: 'Bronze',
    amount: 0,
    gradient: 'from-orange-600 via-orange-500 to-orange-400',
    bgGradient: 'from-orange-500/10 to-orange-600/5',
    borderColor: 'border-orange-500/30',
    icon: '🥉',
    color: 'orange'
  },
  {
    id: 2,
    name: 'Silver',
    amount: 10,
    gradient: 'from-gray-400 via-gray-300 to-gray-200',
    bgGradient: 'from-gray-400/10 to-gray-500/5',
    borderColor: 'border-gray-400/30',
    icon: '🥈',
    color: 'gray'
  },
  {
    id: 3,
    name: 'Gold',
    amount: 20,
    gradient: 'from-yellow-500 via-yellow-400 to-yellow-300',
    bgGradient: 'from-yellow-400/10 to-yellow-500/5',
    borderColor: 'border-yellow-500/30',
    icon: '🥇',
    color: 'yellow'
  },
  {
    id: 4,
    name: 'Platinum',
    amount: 50,
    gradient: 'from-purple-600 via-purple-500 to-purple-400',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    borderColor: 'border-purple-500/30',
    icon: '💎',
    color: 'purple'
  },
];

/*********************************************************************
 *  GAME STATE MANAGEMENT
 *********************************************************************/
class SpinWheelGameState {
  constructor() {
    this.gameHistory = [];
    this.playerStats = {
      totalSpins: 0,
      totalWagered: 0,
      totalWon: 0,
      biggestWin: 0,
      currentStreak: 0,
      bestStreak: 0
    };
    this.recentSpins = [];
  }

  calculateOutcome() {
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      cumulativeProbability += WHEEL_SEGMENTS[i].probability;
      if (random <= cumulativeProbability) {
        return { ...WHEEL_SEGMENTS[i], index: i };
      }
    }
    return { ...WHEEL_SEGMENTS[0], index: 0 };
  }

  processSpin(tierId, betAmount, outcome) {
    const tier = tiers.find(t => t.id === tierId);
    const entryFee = betAmount * CONFIG.PLATFORM_FEES.ENTRY_FEE;
    const netBetAmount = betAmount - entryFee;
    const grossWinnings = netBetAmount * outcome.multiplier;
    const winningsFee = grossWinnings * CONFIG.PLATFORM_FEES.WINNINGS_FEE;
    const netWinnings = grossWinnings - winningsFee;
    
    const spinResult = {
      id: Date.now(),
      tierId,
      tierName: tier.name,
      betAmount,
      entryFee,
      netBetAmount,
      outcome,
      grossWinnings,
      winningsFee,
      netWinnings,
      timestamp: new Date(),
      isWin: outcome.multiplier > 0
    };

    this.playerStats.totalSpins++;
    this.playerStats.totalWagered += betAmount;
    this.playerStats.totalWon += netWinnings;
    
    if (netWinnings > this.playerStats.biggestWin) {
      this.playerStats.biggestWin = netWinnings;
    }

    if (spinResult.isWin) {
      this.playerStats.currentStreak++;
      if (this.playerStats.currentStreak > this.playerStats.bestStreak) {
        this.playerStats.bestStreak = this.playerStats.currentStreak;
      }
    } else {
      this.playerStats.currentStreak = 0;
    }

    this.gameHistory.unshift(spinResult);
    this.recentSpins.unshift(outcome);
    
    if (this.gameHistory.length > 50) {
      this.gameHistory = this.gameHistory.slice(0, 50);
    }
    if (this.recentSpins.length > 10) {
      this.recentSpins = this.recentSpins.slice(0, 10);
    }

    return spinResult;
  }

  getRecentStats() {
    const recent = this.gameHistory.slice(0, 10);
    const wins = recent.filter(spin => spin.isWin).length;
    const totalWagered = recent.reduce((sum, spin) => sum + spin.betAmount, 0);
    const totalWon = recent.reduce((sum, spin) => sum + spin.netWinnings, 0);
    
    return {
      spins: recent.length,
      wins,
      winRate: recent.length > 0 ? (wins / recent.length * 100).toFixed(1) : 0,
      totalWagered,
      totalWon,
      netResult: totalWon - totalWagered
    };
  }
}

/*********************************************************************
 *  MAIN COMPONENT - FIXED SYNCHRONIZATION ISSUES
 *********************************************************************/
const SpinWheelGame = ({ onBack }) => {
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [blockchainService] = useState(() => new BlockchainService());
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [gameState] = useState(() => new SpinWheelGameState());
  const [selectedTier, setSelectedTier] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const clearError = () => setError(null);
  const [currentView, setCurrentView] = useState('lobby');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [pendingWinnings, setPendingWinnings] = useState('0');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [lastSpinResult, setLastSpinResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  /* ---------- FIXED: UNIFIED BALANCE STATE MANAGEMENT ---------- */
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(null);
  const [totalDeposited, setTotalDeposited] = useState('0');
  const wheelRef = useRef(null);
  const [showCrPanel, setShowCrPanel] = useState(false);
  const [multiCurrencyService, setMultiCurrencyService] = useState(null);
  const [bufferedWinnings, setBufferedWinnings] = useState({});
  const spinLoopAudio = useRef(new Audio('/sounds/spin_loop.mp3'));
  const winAudio = useRef(new Audio('/sounds/win_chime.mp3'));
  const loseAudio = useRef(new Audio('/sounds/lose_boop.mp3'));
  const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]);


  
  
  
  // FIXED: Unified balance management - single source of truth
const [balanceState, setBalanceState] = useState(() => {
  try {
    const raw = localStorage.getItem('balanceState_v2'); // v2 for new structure
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate structure and ensure all required fields
      if (parsed && typeof parsed === 'object') {
        return {
          wallet: parsed.wallet || {},
          inGame: parsed.inGame || {},
          buffered: parsed.buffered || {},
          isLoading: false, // Reset loading state on refresh
          lastUpdated: parsed.lastUpdated || 0,
          verificationStatus: 'pending', // Always re-verify on refresh
          syncErrors: []
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved balanceState:', e);
    localStorage.removeItem('balanceState_v2'); // Clear corrupted data
  }
  return { 
    wallet: {}, 
    inGame: {}, 
    buffered: {}, 
    isLoading: false, 
    lastUpdated: 0, 
    verificationStatus: 'pending',
    syncErrors: []
  };
});

// --- Helper: normalize token address keys to lowercase
const normalizeAddr = (addr) => (typeof addr === 'string' ? addr.toLowerCase() : null);

// --- Helper: Write a normalized balance object (ensures lowercase keys)
const normalizeBalances = (balances = {}) => {
  const out = {};
  Object.entries(balances).forEach(([k, v]) => {
    if (!k) return;
    out[normalizeAddr(k)] = String(v);
  });
  return out;
};


  //const [selectedCurrency, setSelectedCurrency] = useState(
  //  filteredCurrencies.find(c => c.symbol === 'tCORE') || filteredCurrencies[0]
  //);

  // FIXED: Consistent balance access methods
  const getCurrentWalletBalance = useCallback(() => {
    if (!selectedCurrency) return '0';
    return balanceState.wallet[selectedCurrency.address] || '0';
  }, [selectedCurrency, balanceState.wallet]);

  const getCurrentInGameBalance = useCallback(() => {
    if (!selectedCurrency) return '0';
    return balanceState.inGame[selectedCurrency.address] || '0';
  }, [selectedCurrency, balanceState.inGame]);

  const getCurrentBalanceNumber = useCallback(() => {
    return parseFloat(getCurrentInGameBalance());
  }, [getCurrentInGameBalance]);

  const {
    bufferedBalance,
    spinProofs,
    logSpin,
    resetBuffer,
    setBufferedBalance,
  } = useBufferedWallet();

  /*********************************************************************
   *  WALLET CONNECTION - FIXED
   *********************************************************************/
  const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      addNotification('Wallet Error', 'MetaMask or another Web3 wallet is required.', 'error');
      return;
    }

    // Clear any previous state
    setBalanceState({
      wallet: {},
      inGame: {},
      buffered: {},
      isLoading: false,
      lastUpdated: 0,
      verificationStatus: 'pending',
      syncErrors: []
    });

    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    
    console.log('🌐 Connected to network:', network.name, network.chainId);
    
    if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
      console.log('🔄 Switching to correct network...');
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CONFIG.CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Network not added, add it
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${CONFIG.CHAIN_ID.toString(16)}`,
              chainName: CONFIG.NETWORK_NAME,
              nativeCurrency: { name: CONFIG.CURRENCY, symbol: CONFIG.CURRENCY, decimals: 18 },
              rpcUrls: [CONFIG.CORE_RPC_URL],
              blockExplorerUrls: [CONFIG.EXPLORER_URL]
            }]
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // Get fresh provider after potential network switch
    const newProvider = new ethers.BrowserProvider(window.ethereum);
    const signerInstance = await newProvider.getSigner();
    const addressInstance = await signerInstance.getAddress();
    
    setSigner(signerInstance);
    setAddress(addressInstance);

    console.log('✅ Wallet connected:', addressInstance);

    // CRITICAL FIX: Enhanced contract verification
    try {
      const contractOk = await verifyContract(signerInstance);
      if (contractOk) {
        console.log('✅ Smart contract verified');
        // Load contract stats in background
        loadContractStats().catch(error => {
          console.warn('Contract stats loading failed:', error.message);
        });
      } else {
        console.warn('⚠️ Smart contract verification failed');
        addNotification('Contract Warning', 'Smart contract verification failed. Some features may be limited.', 'warning');
      }
    } catch (contractError) {
      console.error('Contract verification error:', contractError);
      addNotification('Contract Error', 'Smart contract interaction may be limited.', 'warning');
    }
    
    addNotification(
      'Wallet Connected', 
      `Connected to ${addressInstance.slice(0, 6)}...${addressInstance.slice(-4)} on ${CONFIG.NETWORK_NAME}`, 
      'success'
    );
    
  } catch (err) {
    console.error('❌ Wallet connection failed:', err);
    addNotification('Connection Failed', getErrorMessage(err), 'error');
    
    // Clean up on connection failure
    setSigner(null);
    setAddress(null);
    setMultiCurrencyService(null);
  }
};

// FIXED: Enhanced disconnect with complete cleanup
const disconnectWallet = () => {
  console.log('🔌 Disconnecting wallet...');
  
  // Clear all blockchain-related state
  blockchainService?.disconnect();
  setSigner(null);
  setAddress(null);
  setMultiCurrencyService(null);
  
  // Clear balance state
  setBalanceState({
    wallet: {},
    inGame: {},
    buffered: {},
    isLoading: false,
    lastUpdated: 0,
    verificationStatus: 'pending',
    syncErrors: []
  });
  
  // Clear any persisted data
  try {
    localStorage.removeItem('balanceState_v2');
    // Clear any proof data too
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('spinProofs_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('Failed to clear stored data:', e);
  }
  
  addNotification('Wallet Disconnected', 'Wallet disconnected and data cleared', 'info');
};

const recoverFromBalanceError = async (tokenAddress, operation = 'unknown') => {
  console.log(`🔧 Attempting recovery from ${operation} error for ${tokenAddress}`);
  
  try {
    if (!multiCurrencyService) {
      throw new Error('Service not available for recovery');
    }
    
    // Clear cache first
    multiCurrencyService.clearBalanceCache(tokenAddress);
    
    // Wait a moment for any pending transactions
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get fresh balances
    const walletBalance = await multiCurrencyService.getWalletBalance(tokenAddress, true);
    const inGameBalance = await multiCurrencyService.getInGameBalance(tokenAddress, true);
    
    const tokenAddr = normalizeAddr(tokenAddress);
    
    setBalanceState(prev => ({
      ...prev,
      wallet: { ...prev.wallet, [tokenAddr]: walletBalance },
      inGame: { ...prev.inGame, [tokenAddr]: inGameBalance },
      lastUpdated: Date.now(),
      verificationStatus: 'recovered',
      syncErrors: []
    }));
    
    console.log('✅ Balance recovery successful:', { wallet: walletBalance, inGame: inGameBalance });
    addNotification('Recovery Successful', 'Balance data has been recovered and updated.', 'success');
    
    return { wallet: walletBalance, inGame: inGameBalance };
    
  } catch (recoveryError) {
    console.error('❌ Balance recovery failed:', recoveryError);
    addNotification('Recovery Failed', 'Unable to recover balance data. Please refresh the page.', 'error');
    return null;
  }
};

  /*********************************************************************
   *  NOTIFICATION SYSTEM
   *********************************************************************/
  const addNotification = useCallback((title, message, type = 'info', txHash = null) => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date(),
      txHash,
      read: false
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /*********************************************************************
   *  FIXED: ERROR HANDLING WITH PROPER CONTRACT METHOD NAMES
   *********************************************************************/
  const handleContractError = (error, operation) => {
    console.error(`${operation} failed:`, error);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return `Insufficient funds for ${operation.toLowerCase()}`;
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return `Transaction may fail. Please check your balance and try again.`;
    } else if (error.message?.includes('user rejected')) {
      return 'Transaction was rejected by user';
    } else if (error.message?.includes('Token not supported')) {
      return `${selectedCurrency?.symbol} is not supported for this operation`;
    } else if (error.code === 'CALL_EXCEPTION') {
      return `Smart contract call failed. The contract might not be deployed or method doesn't exist.`;
    } else {
      return `${operation} failed: ${error.message}`;
    }
  };

  const getErrorMessage = (err) => {
    // First try the contract-specific error handler
    if (err.code || err.message?.includes('Token')) {
      return handleContractError(err, 'Operation');
    }
    
    // Fallback to existing logic
    if (err.message?.includes('insufficient funds')) {
      return `Insufficient funds. Please check your ${selectedCurrency?.symbol} balance.`;
    }
    if (err.message?.includes('user rejected')) {
      return 'Transaction was rejected by user.';
    }
    return err.message || 'An unexpected error occurred. Please try again.';
  };

  /*********************************************************************
   *  CONTRACT VERIFICATION UTILITY - FIXED METHOD NAMES
   *********************************************************************/
  const verifyContract = async (signer) => {
    try {
      console.log('🔍 Verifying contract deployment...');
      const spinWheelContract = createSpinWheelContract(signer);
      
      // FIXED: Try multiple contract methods for verification
      try {
        // Try getUserTokenBalance first (from MultiCurrencyService)
        await spinWheelContract.getUserTokenBalance(await signer.getAddress(), ethers.ZeroAddress);
        console.log('✅ Contract verified with getUserTokenBalance!');
        return true;
      } catch (methodError) {
        console.log('⚠️ getUserTokenBalance failed, trying getUserBalance:', methodError.message);
        try {
          // Fallback to getUserBalance
          await spinWheelContract.getUserBalance(await signer.getAddress());
          console.log('✅ Contract verified with getUserBalance!');
          return true;
        } catch (fallbackError) {
          console.log('⚠️ getUserBalance also failed:', fallbackError.message);
          // Final fallback - check if contract code exists
          const code = await signer.provider.getCode(CONFIG.SPIN_WHEEL_CONTRACT_ADDRESS);
          if (code !== '0x') {
            console.log('✅ Contract exists (code found)');
            return true;
          } else {
            console.log('❌ No contract code found at address');
            return false;
          }
        }
      }
    } catch (err) {
      console.error('❌ Contract verification failed:', err);
      return false;
    }
  };

  /*********************************************************************
   *  BLOCKCHAIN INTERACTIONS - FIXED
   *********************************************************************/
  const createTokenContract = (tokenAddress, signer) => {
    return new ethers.Contract(
      tokenAddress,
      [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address,address) view returns (uint256)',
        'function approve(address,uint256) returns (bool)',
        'function transfer(address,uint256) returns (bool)'
      ],
      signer
    );
  };

  const createSpinWheelContract = (signerOrProvider) => {
    return new ethers.Contract(CONFIG.SPIN_WHEEL_CONTRACT_ADDRESS, SpinWheelABI, signerOrProvider);
  };

  /*********************************************************************
   *  FIXED: UNIFIED BALANCE LOADING SYSTEM
   *********************************************************************/
  const loadAllCurrencyBalances = useCallback(async () => {
  if (!multiCurrencyService || !address) {
    console.log('⚠️ Service or address not ready');
    setBalanceState(prev => ({
      ...prev,
      wallet: {},
      inGame: {},
      isLoading: false,
      verificationStatus: 'failed',
      syncErrors: ['Service not initialized']
    }));
    return;
  }

  try {
    setBalanceState(prev => ({ 
      ...prev, 
      isLoading: true, 
      verificationStatus: 'loading',
      syncErrors: []
    }));
    
    console.log('🔄 Loading and cross-verifying all balances...');

    const result = await multiCurrencyService.getAllBalances();
    
    // CRITICAL FIX: Handle verification results and errors
    const { wallet, inGame, verificationResults, errors } = result;
    
    // Log verification status for debugging
    Object.entries(verificationResults || {}).forEach(([addr, result]) => {
      if (!result.verified) {
        console.warn(`⚠️ Balance verification failed for ${addr}:`, result);
      }
    });

    setBalanceState(prev => ({
      ...prev,
      wallet,
      inGame,
      // CRITICAL: Don't reset buffered - preserve existing buffered state
      buffered: prev.buffered, 
      isLoading: false,
      lastUpdated: Date.now(),
      verificationStatus: errors && errors.length > 0 ? 'partial' : 'verified',
      syncErrors: errors || []
    }));

    console.log('✅ Balance state updated with verification:', { wallet, inGame });

    // Alert on significant errors
    if (errors && errors.length > 0) {
      const criticalErrors = errors.filter(e => e.includes('Critical'));
      if (criticalErrors.length > 0) {
        addNotification(
          'Balance Sync Issues', 
          `${criticalErrors.length} critical errors detected. Some balances may be inaccurate.`, 
          'warning'
        );
      }
    }

  } catch (error) {
    console.error('❌ Critical: Balance loading completely failed:', error);
    
    setBalanceState(prev => ({
      ...prev,
      isLoading: false,
      verificationStatus: 'failed',
      syncErrors: [`Critical failure: ${error.message}`]
    }));
    
    addNotification('Balance Error', 'Failed to load balances. Please refresh page.', 'error');
  }
}, [multiCurrencyService, address, addNotification]);

  /*********************************************************************
   *  FIXED: SINGLE BALANCE REFRESH METHOD
   *********************************************************************/
  const refreshCurrentBalance = useCallback(async () => {
    if (!multiCurrencyService || !selectedCurrency) return;

    try {
      const inGameBalance = await multiCurrencyService.getInGameBalance(selectedCurrency.address);
      const walletBalance = await multiCurrencyService.getWalletBalance(selectedCurrency.address);
      
      setBalanceState(prev => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          [selectedCurrency.address]: walletBalance
        },
        inGame: {
          ...prev.inGame,
          [selectedCurrency.address]: inGameBalance
        },
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error(`Failed to refresh ${selectedCurrency.symbol} balance:`, error);
      // Set to 0 on error instead of crashing
      setBalanceState(prev => ({
        ...prev,
        inGame: {
          ...prev.inGame,
          [selectedCurrency.address]: '0'
        },
        wallet: {
          ...prev.wallet,
          [selectedCurrency.address]: '0'
        }
      }));
    }
  }, [multiCurrencyService, selectedCurrency]);

  /*********************************************************************
   *  TOTAL DEPOSITED REFRESH
   *********************************************************************/
  const refreshTotalDeposited = useCallback(async () => {
    if (!signer) return;
    try {
      const spinWheel = createSpinWheelContract(signer);
      const total = await signer.provider.getBalance(CONFIG.SPIN_WHEEL_CONTRACT_ADDRESS);
      setTotalDeposited(ethers.formatEther(total));
    } catch (e) {
      console.error('Failed to refresh Total Deposited:', e);
    }
  }, [signer]);

  /*********************************************************************
   *  FIXED: DEPOSIT WITH UNIFIED STATE UPDATE
   *********************************************************************/
  const handleDeposit = async () => {
  if (!multiCurrencyService || !selectedCurrency || !depositAmount) {
    addNotification('Invalid Request', 'Please select currency and enter amount.', 'warning');
    return;
  }

  const amount = parseFloat(depositAmount);
  if (Number.isNaN(amount) || amount <= 0) {
    addNotification('Invalid Amount', 'Please enter a valid deposit amount.', 'warning');
    return;
  }

  const tokenAddrRaw = selectedCurrency.address;
  const tokenAddr = normalizeAddr(tokenAddrRaw);
  
  // CRITICAL FIX: Get fresh wallet balance before deposit
  try {
    const freshWalletBalance = await multiCurrencyService.getWalletBalance(tokenAddrRaw, true);
    const walletBalance = parseFloat(freshWalletBalance);
    
    if (walletBalance < amount) {
      addNotification('Insufficient Balance', 
        `You need ${amount} ${selectedCurrency.symbol} in your wallet. Current: ${walletBalance.toFixed(4)}`, 
        'error');
      
      // Update local state with fresh balance
      setBalanceState(prev => ({
        ...prev,
        wallet: { ...prev.wallet, [tokenAddr]: freshWalletBalance },
        lastUpdated: Date.now()
      }));
      return;
    }

    setLoading(true);
    addNotification('Processing Deposit', `Depositing ${amount} ${selectedCurrency.symbol}...`, 'info');

    // Execute deposit
    const tx = await multiCurrencyService.depositToken(tokenAddrRaw, amount);
    if (tx && typeof tx.wait === 'function') await tx.wait();

    // CRITICAL FIX: Verify deposit succeeded by checking contract balance
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for blockchain settlement
    
    const newInGameBalance = await multiCurrencyService.getInGameBalance(tokenAddrRaw, true);
    const newWalletBalance = await multiCurrencyService.getWalletBalance(tokenAddrRaw, true);
    
    setBalanceState(prev => ({
      ...prev,
      wallet: { ...prev.wallet, [tokenAddr]: newWalletBalance },
      inGame: { ...prev.inGame, [tokenAddr]: newInGameBalance },
      lastUpdated: Date.now(),
      verificationStatus: 'verified'
    }));

    addNotification('Deposit Successful! 🎉', 
      `${amount} ${selectedCurrency.symbol} deposited. New in-game balance: ${parseFloat(newInGameBalance).toFixed(4)}`, 
      'success');

    setDepositAmount('');
    setShowWalletModal(false);
    
  } catch (error) {
    console.error('Deposit failed:', error);
    addNotification('Deposit Failed', getErrorMessage(error), 'error');
    
    // Refresh balances on error to ensure accuracy
    setTimeout(() => loadAllCurrencyBalances(), 1000);
  } finally {
    setLoading(false);
  }
};

  /*********************************************************************
   *  FIXED: WITHDRAW WITH UNIFIED STATE UPDATE
   *********************************************************************/
  const handleWithdraw = async () => {
  if (!multiCurrencyService || !selectedCurrency || !withdrawAmount) {
    addNotification('Invalid Request', 'Please select currency and enter amount.', 'warning');
    return;
  }

  const amount = parseFloat(withdrawAmount);
  if (Number.isNaN(amount) || amount <= 0) {
    addNotification('Invalid Amount', 'Please enter a valid withdrawal amount.', 'warning');
    return;
  }

  const tokenAddrRaw = selectedCurrency.address;
  const tokenAddr = normalizeAddr(tokenAddrRaw);

  try {
    setLoading(true);
    
    // CRITICAL FIX: Always verify on-chain balance before withdrawal
    const contractInGameBalance = await multiCurrencyService.getInGameBalance(tokenAddrRaw, true);
    const actualBalance = parseFloat(contractInGameBalance);
    
    console.log(`🔍 Pre-withdrawal verification:`, {
      requested: amount,
      contractBalance: actualBalance,
      localBalance: parseFloat(balanceState.inGame[tokenAddr] || '0')
    });

    if (actualBalance < amount) {
      addNotification('Insufficient Contract Balance',
        `On-chain balance: ${actualBalance.toFixed(4)} ${selectedCurrency.symbol}. Cannot withdraw ${amount}.`,
        'error');

      // Sync local state with contract reality
      setBalanceState(prev => ({
        ...prev,
        inGame: { ...prev.inGame, [tokenAddr]: actualBalance.toFixed(6) },
        lastUpdated: Date.now(),
        verificationStatus: 'corrected'
      }));
      return;
    }

    addNotification('Processing Withdrawal', `Withdrawing ${amount} ${selectedCurrency.symbol}...`, 'info');

    const tx = await multiCurrencyService.withdrawToken(tokenAddrRaw, amount);
    if (tx && typeof tx.wait === 'function') await tx.wait();

    // CRITICAL FIX: Verify withdrawal succeeded
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for blockchain settlement
    
    const newInGameBalance = await multiCurrencyService.getInGameBalance(tokenAddrRaw, true);
    const newWalletBalance = await multiCurrencyService.getWalletBalance(tokenAddrRaw, true);
    
    setBalanceState(prev => ({
      ...prev,
      wallet: { ...prev.wallet, [tokenAddr]: newWalletBalance },
      inGame: { ...prev.inGame, [tokenAddr]: newInGameBalance },
      lastUpdated: Date.now(),
      verificationStatus: 'verified'
    }));

    addNotification('Withdrawal Successful! 🎉', 
      `${amount} ${selectedCurrency.symbol} withdrawn. Remaining in-game: ${parseFloat(newInGameBalance).toFixed(4)}`, 
      'success');

    setWithdrawAmount('');
    setShowWalletModal(false);

  } catch (error) {
    console.error('Withdrawal failed:', error);
    addNotification('Withdrawal Failed', getErrorMessage(error), 'error');
    
    // Force refresh on withdrawal error
    setTimeout(() => loadAllCurrencyBalances(), 1000);
  } finally {
    setLoading(false);
  }
};




  /*********************************************************************
   *  FIXED: SPIN WHEEL MECHANICS WITH PROPER STATE SYNCHRONIZATION
   *********************************************************************/
 const handleSpin = async () => {
  if (cooldown || isSpinning || loading || !selectedCurrency) {
    addNotification('Wait', 'Please wait before spinning again or select a currency.', 'warning');
    return;
  }

  const tokenAddress = selectedCurrency.address;
  const tokenAddr = normalizeAddr(tokenAddress);
  const tierData = tiers[selectedTier];
  const betAmount = tierData.amount;

  try {
    // CRITICAL FIX: Always verify real-time balance before spin
    console.log('🎰 Pre-spin balance verification...');
    const contractBalance = await multiCurrencyService.getInGameBalance(tokenAddress, true);
    const contractBalanceNum = parseFloat(contractBalance);
    
    // Cross-check with local state
    const localBalance = parseFloat(balanceState.inGame?.[tokenAddr] || '0');
    const balanceDifference = Math.abs(contractBalanceNum - localBalance);
    
    if (balanceDifference > 0.001) {
      console.warn('⚠️ Balance mismatch detected:', {
        contract: contractBalanceNum,
        local: localBalance,
        difference: balanceDifference
      });
      
      // Update local state to match contract
      setBalanceState(prev => ({
        ...prev,
        inGame: { ...prev.inGame, [tokenAddr]: contractBalance },
        lastUpdated: Date.now(),
        verificationStatus: 'corrected'
      }));
      
      addNotification('Balance Updated', 
        `Balance corrected to ${contractBalanceNum.toFixed(4)} ${selectedCurrency.symbol}`, 
        'info');
    }

    // Use the authoritative contract balance
    if (contractBalanceNum < betAmount) {
      addNotification(
        'Insufficient Balance',
        `You need ${betAmount} ${selectedCurrency.symbol}. Contract balance: ${contractBalanceNum.toFixed(4)}`,
        'error'
      );
      return;
    }

    setIsSpinning(true);
    setLoading(true);
    setError(null);
    setShowResult(false);

    // CRITICAL FIX: Optimistic balance update with revert capability
    const originalBalance = contractBalance;
    const optimisticBalance = Math.max(0, contractBalanceNum - betAmount);
    
    setBalanceState(prev => ({
      ...prev,
      inGame: { ...prev.inGame, [tokenAddr]: optimisticBalance.toFixed(6) },
      lastUpdated: Date.now(),
      verificationStatus: 'optimistic'
    }));

    console.log(`🎰 Spinning with ${betAmount} ${selectedCurrency.symbol}, remaining: ${optimisticBalance}`);

    // Spin animation
    const baseSpins = 5 * 8;
    const randomOffset = Math.random() * 2 * 360;
    const spinAngle = (360 * baseSpins) + randomOffset;
    setWheelRotation(prev => prev + spinAngle);

    if (soundEnabled) playSpinSound();
    addNotification('Spinning...', `Bet placed: ${betAmount} ${selectedCurrency.symbol}`, 'info');

    // Wait for spin animation
    await new Promise(resolve => setTimeout(resolve, 4500));

    // Calculate result
    const finalRotation = (wheelRotation + spinAngle) % 360;
    const landedSegment = getOutcomeFromRotation(finalRotation);
    const spinResult = gameState.processSpin(tierData.id, betAmount, landedSegment);

    // CRITICAL FIX: Verify post-spin balance and update accordingly
    try {
      const postSpinBalance = await multiCurrencyService.getInGameBalance(tokenAddress, true);
      const postSpinBalanceNum = parseFloat(postSpinBalance);
      
      console.log('📊 Post-spin verification:', {
        expected: optimisticBalance,
        actual: postSpinBalanceNum,
        spinWon: spinResult.isWin,
        netWinnings: spinResult.netWinnings
      });

      let finalBalance = postSpinBalanceNum;

      // Handle winnings
      if (spinResult.isWin && spinResult.netWinnings > 0) {
        // CRITICAL FIX: Add winnings to buffered state instead of balance
        setBalanceState(prev => {
          const currentBuffered = parseFloat(prev.buffered?.[tokenAddr] || '0');
          const newBuffered = currentBuffered + spinResult.netWinnings;
          
          return {
            ...prev,
            inGame: { ...prev.inGame, [tokenAddr]: finalBalance.toFixed(6) },
            buffered: { ...prev.buffered, [tokenAddr]: newBuffered.toFixed(6) },
            lastUpdated: Date.now(),
            verificationStatus: 'verified'
          };
        });

        // Create cryptographic proof for winnings
        try {
          const spinProof = {
            spinId: spinResult.id,
            tokenAddress,
            amount: spinResult.netWinnings,
            timestamp: Date.now(),
            userAddress: address,
            signature: await createSpinProof(spinResult, tokenAddress)
          };

          logSpin({ ...spinResult, proof: spinProof });

          // Persist proof to localStorage as backup
          const existingProofs = JSON.parse(localStorage.getItem(`spinProofs_${tokenAddr}`) || '[]');
          existingProofs.push(spinProof);
          localStorage.setItem(`spinProofs_${tokenAddr}`, JSON.stringify(existingProofs));

        } catch (proofError) {
          console.error('Failed to create spin proof:', proofError);
          addNotification('Proof Warning', 'Winnings recorded but proof creation failed', 'warning');
        }

        addNotification(
          '🎉 You Won!',
          `+${spinResult.netWinnings.toFixed(4)} ${selectedCurrency.symbol} added to buffered winnings!`,
          'success'
        );

        if (soundEnabled) playWinSound();
      } else {
        // No win - just update balance
        setBalanceState(prev => ({
          ...prev,
          inGame: { ...prev.inGame, [tokenAddr]: finalBalance.toFixed(6) },
          lastUpdated: Date.now(),
          verificationStatus: 'verified'
        }));

        addNotification('Better Luck Next Time!', 'Spin again and try your luck!', 'info');
      }

    } catch (balanceVerifyError) {
      console.error('Post-spin balance verification failed:', balanceVerifyError);
      
      // Revert optimistic update on verification failure
      setBalanceState(prev => ({
        ...prev,
        inGame: { ...prev.inGame, [tokenAddr]: originalBalance },
        lastUpdated: Date.now(),
        verificationStatus: 'error'
      }));
      
      addNotification('Balance Sync Error', 'Spin may have succeeded but balance sync failed. Please refresh.', 'error');
    }

    // Set spin result for UI display
    setLastSpinResult({
      ...spinResult,
      actualWinAmount: spinResult.netWinnings.toFixed(4),
      isBlockchain: false
    });

    setShowResult(true);

    // Credits and milestones (existing logic)
    CrService.trackMilestone('spins');
    const milestones = CrService.getMilestones();

    if (milestones.spins === 10) {
      CrService.addCredits(50, '10 Spins Milestone Bonus');
      addNotification('Milestone!', 'You earned 50 Cr for spinning 10 times!', 'success');
    }

    if (milestones.spins === 50) {
      CrService.addCredits(300, '50 Spins Milestone Bonus');
      addNotification('Milestone!', 'You earned 300 Cr for 50 Spins!', 'success');
    }

    const storedRef = localStorage.getItem('pendingReferral');
    const alreadyClaimed = localStorage.getItem('referralClaimed');

    if (storedRef && !alreadyClaimed && storedRef.toLowerCase() !== address.toLowerCase()) {
      CrService.addCredits(100, 'Referral Spin Bonus');
      localStorage.setItem('referralClaimed', 'true');
      addNotification('Referral Bonus', '100 Cr awarded for spinning via referral link!', 'success');
    }

    CrService.addCredits(10, 'Spin Participation');
    if (spinResult.isWin) {
      CrService.addCredits(25, 'Winning Spin Bonus');
    }

  } catch (error) {
    console.error('Spin execution failed:', error);
    
    // CRITICAL FIX: Revert all optimistic updates on error
    try {
      const currentBalance = await multiCurrencyService.getInGameBalance(tokenAddress, true);
      setBalanceState(prev => ({
        ...prev,
        inGame: { ...prev.inGame, [tokenAddr]: currentBalance },
        lastUpdated: Date.now(),
        verificationStatus: 'error'
      }));
    } catch (revertError) {
      console.error('Failed to revert balance:', revertError);
    }

    addNotification('Spin Failed', getErrorMessage(error), 'error');
  } finally {
    // Cooldown timer
    setCooldown(true);
    setCooldownLeft(3);

    const cooldownInterval = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(cooldownInterval);
          setCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setIsSpinning(false);
    setLoading(false);
  }
};



  const playSpinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {}
  };

  const playWinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch {}
  };

  const claimWinnings = async () => {
    if (!signer || !address) {
      addNotification('Error', 'Wallet not connected', 'error');
      return;
    }
    try {
      setLoading(true);
      const spinWheelContract = createSpinWheelContract(signer);
      
      // FIXED: Try both method names for backward compatibility
      let pendingWinnings;
      try {
        pendingWinnings = await spinWheelContract.getUserTokenBalance(address, ethers.ZeroAddress);
      } catch (error) {
        pendingWinnings = await spinWheelContract.getUserBalance(address);
      }
      
      const pendingAmount = parseFloat(ethers.formatEther(pendingWinnings));
      if (pendingAmount === 0) {
        addNotification('No Winnings', 'You have no winnings to claim', 'info');
        return;
      }
      addNotification('Claiming Winnings', 'Processing claim transaction...', 'info');
      const claimTx = await spinWheelContract.claimWinnings();
      const receipt = await claimTx.wait();
      addNotification('Winnings Claimed! 🎉', `Successfully claimed ${pendingAmount.toFixed(4)} CORE!`, 'success', receipt.hash);
      await loadAllCurrencyBalances();
    } catch (err) {
      console.error('Error claiming winnings:', err);
      addNotification('Claim Failed', getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadContractStats = useCallback(async () => {
    if (!signer || !address) return;
    try {
      const spinWheelContract = createSpinWheelContract(signer);
      
      // FIXED: Try to load user stats with fallback methods
      try {
        const userStats = await spinWheelContract.getUserStats(address);
        gameState.playerStats = {
          totalSpins: Number(userStats.totalSpins),
          totalWagered: parseFloat(ethers.formatEther(userStats.totalWagered)),
          totalWon: parseFloat(ethers.formatEther(userStats.totalWon)),
          biggestWin: parseFloat(ethers.formatEther(userStats.biggestWin)),
          currentStreak: Number(userStats.currentStreak),
          bestStreak: Number(userStats.bestStreak)
        };
      } catch (statsError) {
        console.log('⚠️ Failed to load user stats:', statsError.message);
      }

      // FIXED: Try to load user spins with error handling
      try {
        const userSpins = await spinWheelContract.getUserSpins(address);
        gameState.gameHistory = userSpins.slice(0, 50).map(spin => ({
          id: Number(spin.spinId),
          tierId: spin.tierId,
          tierName: tiers.find(t => t.id === spin.tierId)?.name || 'Unknown',
          betAmount: parseFloat(ethers.formatEther(spin.betAmount)),
          entryFee: parseFloat(ethers.formatEther(spin.entryFee)),
          netBetAmount: parseFloat(ethers.formatEther(spin.netBetAmount)),
          outcome: WHEEL_SEGMENTS.find(s => s.id === spin.segmentId) || WHEEL_SEGMENTS[0],
          grossWinnings: parseFloat(ethers.formatEther(spin.grossWinnings)),
          winningsFee: parseFloat(ethers.formatEther(spin.winningsFee)),
          netWinnings: parseFloat(ethers.formatEther(spin.netWinnings)),
          timestamp: new Date(Number(spin.timestamp) * 1000),
          isWin: spin.isWin
        }));
        gameState.recentSpins = gameState.gameHistory.slice(0, 10).map(spin => spin.outcome);
      } catch (historyError) {
        console.log('⚠️ Failed to load spin history:', historyError.message);
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error loading contract stats:', err);
    }
  }, [signer, address]);


  const handleBufferedWithdraw = async () => {
  const tokenAddrRaw = selectedCurrency?.address;
  const tokenAddr = normalizeAddr(tokenAddrRaw);
  const bufferedAmount = parseFloat(balanceState.buffered?.[tokenAddr] || '0');

  if (!tokenAddr) {
    addNotification('Error', 'No currency selected', 'error');
    return;
  }
  if (bufferedAmount <= 0) {
    addNotification('No Buffered Winnings', 'You have no winnings to withdraw.', 'warning');
    return;
  }
  if (!signer) {
    addNotification('Wallet Error', 'Connect your wallet to withdraw buffered winnings.', 'error');
    return;
  }

  try {
    setLoading(true);
    addNotification('Verifying Winnings', 'Verifying buffered winnings with cryptographic proofs...', 'info');

    // CRITICAL FIX: Enhanced proof verification with persistence
    let proofsForToken = spinProofs[tokenAddr] || [];
    
    // Fallback to localStorage if hook proofs are empty
    if ((!proofsForToken || proofsForToken.length === 0) && typeof window !== 'undefined') {
      try {
        const storedProofs = localStorage.getItem(`spinProofs_${tokenAddr}`);
        proofsForToken = storedProofs ? JSON.parse(storedProofs) : [];
        console.log(`📄 Loaded ${proofsForToken.length} proofs from storage for ${tokenAddr}`);
      } catch (e) {
        console.warn('Failed to load stored proofs:', e);
        proofsForToken = [];
      }
    }

    if (!proofsForToken || proofsForToken.length === 0) {
      addNotification('No Valid Proofs', 'No proofs found. Winnings may have been claimed or expired.', 'error');
      
      // Clear invalid buffered amount
      setBalanceState(prev => ({
        ...prev,
        buffered: { ...prev.buffered, [tokenAddr]: '0' },
        lastUpdated: Date.now()
      }));
      return;
    }

    // Verify proof integrity and amounts
    const proofSum = Number(proofsForToken.reduce((s, p) => s + (Number(p.amount) || 0), 0).toFixed(6));
    const bufferedNormalized = Number(bufferedAmount.toFixed(6));

    if (Math.abs(proofSum - bufferedNormalized) > 0.001) {
      console.warn('Proof amount mismatch:', { proofSum, bufferedNormalized });
      addNotification('Amount Mismatch',
        `Proof total (${proofSum}) differs from displayed amount (${bufferedNormalized}). Using proof total.`,
        'warning');

      setBalanceState(prev => ({
        ...prev,
        buffered: { ...prev.buffered, [tokenAddr]: proofSum.toFixed(6) },
        lastUpdated: Date.now()
      }));
      
      if (proofSum <= 0) return;
    }

    // Validate each proof cryptographically
    const validProofs = [];
    for (const proof of proofsForToken) {
      try {
        if (await validateSpinProof(proof)) {
          validProofs.push(proof);
        } else {
          console.warn('Invalid proof detected:', proof.spinId);
        }
      } catch (e) {
        console.warn('Proof validation error:', e);
      }
    }

    if (validProofs.length === 0) {
      addNotification('Invalid Proofs', 'All proofs failed validation. Cannot proceed.', 'error');
      return;
    }

    console.log(`✅ ${validProofs.length}/${proofsForToken.length} proofs validated`);

    // Submit to smart contract
    const spinWheelContract = createSpinWheelContract(signer);
    
    // CRITICAL FIX: Check if contract supports buffered withdrawals
    if (typeof spinWheelContract.verifyAndWithdraw !== 'function') {
      // Fallback to manual claim if contract doesn't support proof verification
      console.warn('Contract does not support verifyAndWithdraw, using claimWinnings');
      
      try {
        const pendingWinnings = await spinWheelContract.getUserTokenBalance(address, tokenAddrRaw);
        const pendingAmount = parseFloat(ethers.formatUnits(pendingWinnings, selectedCurrency.decimals || 18));
        
        if (pendingAmount >= bufferedAmount * 0.95) { // Allow 5% tolerance
          const claimTx = await spinWheelContract.claimWinnings();
          await claimTx.wait();
          
          // Clear buffered winnings after successful claim
          setBalanceState(prev => ({
            ...prev,
            buffered: { ...prev.buffered, [tokenAddr]: '0' },
            lastUpdated: Date.now()
          }));
          
          // Clear proofs
          localStorage.removeItem(`spinProofs_${tokenAddr}`);
          if (resetBuffer) resetBuffer(tokenAddr);
          
          addNotification('Winnings Claimed! 🎉',
            `${bufferedAmount.toFixed(4)} ${selectedCurrency.symbol} claimed successfully.`,
            'success');
            
          setTimeout(() => loadAllCurrencyBalances(), 1500);
          return;
        }
      } catch (claimError) {
        console.error('Fallback claim failed:', claimError);
      }
    }

    addNotification('Submitting Withdrawal', 'Submitting verified proofs to contract...', 'info');
    
    const tx = await spinWheelContract.verifyAndWithdraw(validProofs, { gasLimit: 500000 });
    const receipt = await tx.wait();

    if (receipt && receipt.status === 1) {
      // Clear buffered state and proofs
      setBalanceState(prev => ({
        ...prev,
        buffered: { ...prev.buffered, [tokenAddr]: '0' },
        lastUpdated: Date.now(),
        verificationStatus: 'verified'
      }));

      // Clear persistent proofs
      try {
        localStorage.removeItem(`spinProofs_${tokenAddr}`);
        if (resetBuffer) resetBuffer(tokenAddr);
      } catch (e) {
        console.warn('Failed to clear proofs:', e);
      }

      addNotification('Withdrawal Successful! 🎉',
        `${bufferedAmount.toFixed(4)} ${selectedCurrency.symbol} withdrawn from buffered winnings.`,
        'success',
        receipt.transactionHash || receipt.hash);

      // Refresh all balances after successful withdrawal
      setTimeout(() => loadAllCurrencyBalances(), 1500);
    } else {
      throw new Error('Transaction failed on blockchain');
    }

  } catch (error) {
    console.error('Buffered withdrawal error:', error);
    const msg = getErrorMessage(error) || 'Buffered withdrawal failed. Please try again.';
    addNotification('Withdrawal Failed', msg, 'error');
    
    // Refresh balances to get accurate state
    setTimeout(() => loadAllCurrencyBalances(), 1000);
  } finally {
    setLoading(false);
  }
};



const createSpinProof = async (spinResult, tokenAddress) => {
  try {
    const message = `spin:${spinResult.id}:${tokenAddress}:${spinResult.netWinnings}:${spinResult.timestamp}:${address}`;
    
    // In a real implementation, this would be signed by the server
    // For demo purposes, create a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Failed to create spin proof:', error);
    return null;
  }
};

const validateSpinProof = async (proof) => {
  try {
    // Validate required fields
    const requiredFields = ['spinId', 'tokenAddress', 'amount', 'timestamp', 'userAddress', 'signature'];
    for (const field of requiredFields) {
      if (!proof[field]) {
        console.warn(`Proof missing field: ${field}`, proof);
        return false;
      }
    }

    // Validate timestamp (not too old, not in future)
    const now = Date.now();
    const proofAge = now - proof.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const tolerance = 5 * 60 * 1000; // 5 minutes tolerance for future dates
    
    if (proofAge > maxAge) {
      console.warn('Proof too old:', { proofAge: proofAge / 1000 / 60, maxAgeMinutes: maxAge / 1000 / 60 });
      return false;
    }
    
    if (proofAge < -tolerance) {
      console.warn('Proof timestamp in future:', { proofAge: proofAge / 1000, toleranceSeconds: tolerance / 1000 });
      return false;
    }

    // Validate user address
    if (!address || proof.userAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn('Proof user address mismatch:', { expected: address, got: proof.userAddress });
      return false;
    }

    // Validate amount
    const amount = parseFloat(proof.amount);
    if (isNaN(amount) || amount <= 0) {
      console.warn('Invalid proof amount:', proof.amount);
      return false;
    }

    // Validate signature (recreate and compare)
    const expectedSignature = await createSpinProof({
      id: proof.spinId,
      netWinnings: proof.amount,
      timestamp: proof.timestamp
    }, proof.tokenAddress);

    if (!expectedSignature || expectedSignature !== proof.signature) {
      console.warn('Proof signature validation failed:', { expected: expectedSignature, got: proof.signature });
      return false;
    }

    console.log('✅ Proof validation successful:', proof.spinId);
    return true;
  } catch (error) {
    console.error('Proof validation error:', error);
    return false;
  }
};

  /*********************************************************************
   *  FIXED: EFFECTS WITH PROPER ASYNC HANDLING
   *********************************************************************/

 useEffect(() => {
  const persistBalanceState = async () => {
    try {
      // Only persist if we have valid data
      if (balanceState && typeof balanceState === 'object') {
        const dataToStore = {
          ...balanceState,
          // Don't persist loading state or pending status
          isLoading: false,
          verificationStatus: balanceState.verificationStatus === 'verified' ? 'stale' : balanceState.verificationStatus
        };
        
        // Validate data integrity before storing
        if (dataToStore.wallet && dataToStore.inGame) {
          localStorage.setItem('balanceState_v2', JSON.stringify(dataToStore));
          console.log('💾 Balance state persisted successfully');
        }
      }
    } catch (e) {
      console.warn('Could not persist balanceState:', e);
      // Try to clear corrupted data
      try {
        localStorage.removeItem('balanceState_v2');
      } catch (clearError) {
        console.warn('Could not clear corrupted balance state:', clearError);
      }
    }
  };

  // Debounce persistence to avoid excessive writes
  const timeoutId = setTimeout(persistBalanceState, 500);
  return () => clearTimeout(timeoutId);
}, [balanceState]);

// FIXED: Enhanced initialization with recovery mechanisms
useEffect(() => {
  const initializeService = async () => {
    if (signer && SpinWheelABI) {
      try {
        console.log('🚀 Initializing multi-currency service...');
        
        const service = new MultiCurrencySpinWheelService(
          signer,
          CONFIG.SPIN_WHEEL_CONTRACT_ADDRESS,
          SpinWheelABI
        );

        const userAddress = await service.initialize();
        console.log('✅ Service initialized for address:', userAddress);

        // Add supported currencies with error handling
        const addCurrencyPromises = filteredCurrencies.map(async (currency) => {
          try {
            await service.addSupportedToken(currency);
            console.log(`✅ Added currency: ${currency.symbol}`);
          } catch (error) {
            console.warn(`⚠️ Failed to add currency ${currency.symbol}:`, error.message);
            // Don't fail completely - just skip this currency
            return null;
          }
        });

        await Promise.allSettled(addCurrencyPromises);
        
        setMultiCurrencyService(service);
        console.log('✅ Multi-currency service fully initialized');

        // CRITICAL FIX: Trigger balance load after service is ready
        setTimeout(() => {
          if (address) {
            loadAllCurrencyBalances().catch(error => {
              console.warn('Initial balance load failed, will retry:', error.message);
              // Retry after 3 seconds
              setTimeout(() => {
                loadAllCurrencyBalances().catch(retryError => {
                  console.error('Balance load retry also failed:', retryError.message);
                });
              }, 3000);
            });
          }
        }, 1000);

      } catch (error) {
        console.error('❌ Failed to initialize multi-currency service:', error);
        addNotification('Service Error', 'Multi-currency service failed to initialize. Some features may not work.', 'error');
        setMultiCurrencyService(null);
      }
    } else {
      console.log('⏳ Waiting for signer and ABI...');
      setMultiCurrencyService(null);
    }
  };

  initializeService();
}, [signer, address, addNotification]);

// FIXED: Enhanced balance loading with retry mechanism
useEffect(() => {
  const loadBalancesWithRetry = async (retryCount = 0) => {
    if (!multiCurrencyService || !address) {
      console.log('⏳ Service or address not ready for balance loading');
      return;
    }

    try {
      await loadAllCurrencyBalances();
      console.log('✅ Balances loaded successfully');
    } catch (error) {
      console.error(`❌ Balance loading failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < 2) { // Max 3 attempts
        const delay = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
        console.log(`🔄 Retrying balance load in ${delay}ms...`);
        
        setTimeout(() => {
          loadBalancesWithRetry(retryCount + 1);
        }, delay);
      } else {
        console.error('💀 All balance loading attempts failed');
        addNotification(
          'Balance Load Failed', 
          'Unable to load balances after multiple attempts. Please refresh the page.', 
          'error'
        );
      }
    }
  };

  if (multiCurrencyService && address) {
    loadBalancesWithRetry();
  }
}, [multiCurrencyService, address]);

// FIXED: Enhanced currency change handling with state cleanup
useEffect(() => {
  if (multiCurrencyService && selectedCurrency) {
    console.log(`🔄 Currency changed to ${selectedCurrency.symbol}, refreshing balance...`);
    
    // Clear any verification errors for the previous currency
    setBalanceState(prev => ({
      ...prev,
      verificationStatus: 'loading',
      syncErrors: []
    }));
    
    refreshCurrentBalance().catch(error => {
      console.warn(`⚠️ Currency balance refresh failed for ${selectedCurrency.symbol}:`, error.message);
      
      // Set error status but don't crash
      setBalanceState(prev => ({
        ...prev,
        verificationStatus: 'error',
        syncErrors: [`Currency refresh failed: ${error.message}`]
      }));
    });
  }
}, [selectedCurrency, refreshCurrentBalance]);

// FIXED: Periodic balance verification with smart intervals
useEffect(() => {
  if (!multiCurrencyService || !address || !selectedCurrency) return;

  const startPeriodicVerification = () => {
    const verifyBalance = async () => {
      try {
        const now = Date.now();
        const lastUpdate = balanceState.lastUpdated || 0;
        const timeSinceUpdate = now - lastUpdate;
        
        // Only verify if data is getting stale (>30 seconds)
        if (timeSinceUpdate > 30000) {
          console.log('🔍 Performing periodic balance verification...');
          
          const tokenAddr = normalizeAddr(selectedCurrency.address);
          const contractBalance = await multiCurrencyService.getInGameBalance(selectedCurrency.address, true);
          const localBalance = balanceState.inGame?.[tokenAddr] || '0';
          
          const difference = Math.abs(parseFloat(contractBalance) - parseFloat(localBalance));
          
          if (difference > 0.001) {
            console.warn('⚠️ Periodic verification found balance drift:', {
              contract: contractBalance,
              local: localBalance,
              difference
            });
            
            // Update to contract balance
            setBalanceState(prev => ({
              ...prev,
              inGame: { ...prev.inGame, [tokenAddr]: contractBalance },
              lastUpdated: now,
              verificationStatus: 'corrected'
            }));
            
            addNotification(
              'Balance Corrected',
              `${selectedCurrency.symbol} balance updated: ${parseFloat(contractBalance).toFixed(4)}`,
              'info'
            );
          }
        }
      } catch (error) {
        console.warn('Periodic verification failed:', error.message);
      }
    };

    // Initial verification after 5 seconds
    const initialTimeout = setTimeout(verifyBalance, 5000);
    
    // Then every 60 seconds
    const interval = setInterval(verifyBalance, 60000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  };

  const cleanup = startPeriodicVerification();
  return cleanup;
}, [multiCurrencyService, address, selectedCurrency, balanceState.lastUpdated, balanceState.inGame, addNotification]);

// FIXED: Enhanced refresh trigger with debouncing
useEffect(() => {
  if (refreshTrigger > 0) {
    console.log(`🔄 Manual refresh triggered (${refreshTrigger})`);
    
    // Debounce rapid refresh requests
    const timeoutId = setTimeout(() => {
      loadAllCurrencyBalances().catch(error => {
        console.error('⚠️ Triggered balance refresh failed:', error.message);
        addNotification('Refresh Failed', 'Manual balance refresh failed. Please try again.', 'warning');
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }
}, [refreshTrigger, loadAllCurrencyBalances, addNotification]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      // Note: Using memory storage instead of localStorage
      console.log('Referral code detected:', refCode);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (address) {
      if (multiCurrencyService) {
        loadAllCurrencyBalances().catch(error => {
          console.log('⚠️ Address change balance loading failed:', error.message);
        });
      }
    }
  }, [address, multiCurrencyService, loadAllCurrencyBalances]);

  useEffect(() => {
    setPendingWinnings(bufferedBalance.toFixed(4));
  }, [bufferedBalance]);

  useEffect(() => {
  spinLoopAudio.current.loop = true;
  spinLoopAudio.current.volume = 0.4; // smooth background
  winAudio.current.volume = 0.7;
  loseAudio.current.volume = 0.5;
}, []);

  /*********************************************************************
   *  RENDER COMPONENTS
   *********************************************************************/
  const renderNotifications = () => (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg border backdrop-blur-sm ${
            notification.type === 'success'
              ? 'bg-green-50/90 border-green-200 text-green-800'
              : notification.type === 'error'
              ? 'bg-red-50/90 border-red-200 text-red-800'
              : notification.type === 'warning'
              ? 'bg-yellow-50/90 border-yellow-200 text-yellow-800'
              : 'bg-blue-50/90 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Bell size={16} />
                <h4 className="font-semibold text-sm">{notification.title}</h4>
              </div>
              <p className="text-xs">{notification.message}</p>
              {notification.txHash && (
                <a
                  href={`${CONFIG.EXPLORER_URL}/tx/${notification.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs underline mt-1 hover:opacity-80"
                >
                  <span>View Transaction</span>
                  <div className="w-2 h-2">🔗</div>
                </a>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 opacity-50 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSpinWheel = () => {
    const wheelSize = 500;
    const labelRadius = wheelSize / 2 - 50;

    const conic = WHEEL_SEGMENTS
      .map((s, i) => {
        const start = WHEEL_SEGMENTS.slice(0, i).reduce((a, seg) => a + seg.angle, 0);
        return `${s.color} ${start}deg ${start + s.angle}deg`;
      })
      .join(', ');

    return (
      <div className="relative flex items-center justify-center">
        <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
          {/* Triangle Pointer */}
          <div className="absolute top-[-15px] left-1/2 transform -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-black"></div>
          </div>

          {/* Spin Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-[8px] border-white shadow-[inset_0_0_40px_rgba(255,255,255,0.15),0_0_30px_rgba(0,0,0,0.5)] transition-transform duration-[4s] ease-out"
            style={{
              backgroundColor: 'black',
              transform: `rotate(${wheelRotation}deg)`,
            }}
          >
            <div
              className="w-full h-full rounded-full absolute top-0 left-0"
              style={{
                background: `conic-gradient(${conic})`,
                clipPath: 'circle(50% at 50% 50%)'
              }}
            ></div>

            {/* Segment Labels */}
            {WHEEL_SEGMENTS.map((segment, index) => {
              const startAngle = WHEEL_SEGMENTS.slice(0, index).reduce((a, s) => a + s.angle, 0);
              const midAngle = startAngle + segment.angle / 2;
              const radian = (midAngle - 90) * (Math.PI / 180);
              const x = Math.cos(radian) * labelRadius + wheelSize / 2;
              const y = Math.sin(radian) * labelRadius + wheelSize / 2;

              return (
                <div
                  key={segment.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xl drop-shadow-lg"
                  style={{
                    left: x,
                    top: y,
                    transform: `translate(-50%, -50%) rotate(${midAngle}deg)`
                  }}
                >
                  {segment.label}
                </div>
              );
            })}
          </div>

          {/* Spin Button */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full border-4 border-white shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-105 transition-transform"
            onClick={handleSpin}
          >
            <img src={CoreDaoLogo} alt="Spin" className="w-20 h-20" />
          </div>
        </div>
      </div>
    );
  };

  const renderTierSelection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {tiers.map((tier, index) => {
      const betAmount = tier.amount;
      const tokenAddress = selectedCurrency?.address;
      const tokenAddr = normalizeAddr(tokenAddress);
      
      // CRITICAL FIX: Use verified balance state with fallback
      const currentInGameBalance = parseFloat(balanceState.inGame?.[tokenAddr] || '0');
      const symbol = selectedCurrency?.symbol || 'CORE';
      const hasBalance = currentInGameBalance >= betAmount;
      
      // Show warning if balance verification failed
      const hasBalanceWarning = balanceState.verificationStatus === 'error' || 
                               balanceState.verificationStatus === 'stale';

      return (
        <button
          key={tier.id}
          onClick={() => setSelectedTier(index)}
          disabled={loading || isSpinning || !hasBalance || balanceState.isLoading}
          className={`relative p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedTier === index
              ? `${tier.borderColor} bg-gradient-to-br ${tier.bgGradient} shadow-lg ring-2 ring-offset-2 ring-${tier.color}-500/50`
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">{tier.icon}</div>
            <h3 className={`font-bold text-lg mb-2 ${selectedTier === index ? 'text-gray-800' : 'text-gray-700'}`}>
              {tier.name}
            </h3>
            <div className={`text-2xl font-bold mb-1 ${selectedTier === index ? 'text-gray-900' : 'text-gray-800'}`}>
              {betAmount} {symbol}
            </div>
            <div className="text-xs text-gray-500">
              Entry Fee: {(betAmount * CONFIG.PLATFORM_FEES.ENTRY_FEE).toFixed(3)} {symbol}
            </div>
            
            {/* CRITICAL FIX: Enhanced balance status display */}
            {!hasBalance && (
              <div className="text-xs text-red-500 mt-1">
                Insufficient balance
                <br />
                ({currentInGameBalance.toFixed(4)} available)
              </div>
            )}
            
            {hasBalanceWarning && hasBalance && (
              <div className="text-xs text-yellow-600 mt-1 flex items-center justify-center space-x-1">
                <span>⚠️</span>
                <span>Balance unverified</span>
              </div>
            )}
          </div>
          
          {selectedTier === index && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle size={16} className="text-white" />
            </div>
          )}
        </button>
      );
    })}
  </div>
);

  const renderWalletInfo = () => {
    const walletBalance = getCurrentWalletBalance();
    const inGameBalance = getCurrentInGameBalance();

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Wallet size={20} />
            <span>Wallet Information</span>
          </h3>
          <div className="flex items-center space-x-2">
            {/* FIXED: Currency Selector */}
            <select
              value={selectedCurrency?.address || ''}
              onChange={(e) => {
                const currency = filteredCurrencies.find(c => c.address === e.target.value);
                setSelectedCurrency(currency);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              disabled={filteredCurrencies.length === 0}
            >
              {filteredCurrencies.length === 0 ? (
                <option value="">No currencies available</option>
              ) : (
                filteredCurrencies.map(currency => (
                  <option key={currency.address} value={currency.address}>
                    {currency.symbol}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={loadAllCurrencyBalances}
              disabled={balanceState.isLoading}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Balances"
            >
              <RefreshCw size={16} className={`text-gray-600 ${balanceState.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Address</div>
            <div className="font-mono text-sm text-gray-800">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
            </div>
          </div>

          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Wallet Balance</div>
            <div className="font-bold text-lg text-gray-800">
              {parseFloat(walletBalance).toFixed(4)} {selectedCurrency?.symbol || 'N/A'}
            </div>
          </div>

    <div className="bg-white/50 rounded-lg p-4">
  <div className="text-sm text-gray-600 mb-1">Buffered Winnings</div>
  <div className="font-bold text-lg text-purple-600">
    {parseFloat(balanceState.buffered?.[selectedCurrency?.address] || '0').toFixed(4)} {selectedCurrency?.symbol || 'N/A'}
  </div>
</div>



          <div className="bg-white/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Network</div>
            <div className="text-sm text-gray-800">{CONFIG.NETWORK_NAME}</div>
          </div>
        </div>
      </div>
    );
  };
 
const renderWalletModal = () => {
    if (!showWalletModal) return null;
    const mode = showWalletModal;
    const isDeposit = mode === 'deposit';
    const [value, setValue] = isDeposit
      ? [depositAmount, setDepositAmount]
      : [withdrawAmount, setWithdrawAmount];

    const maxAmount = isDeposit 
      ? getCurrentWalletBalance() 
      : getCurrentInGameBalance();

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {isDeposit ? 'Deposit' : 'Withdraw'} {selectedCurrency?.symbol || 'Token'}
            </h2>
            <button 
              onClick={() => setShowWalletModal(null)} 
              className="text-gray-500 hover:text-black text-2xl font-bold"
            >
              &times;
            </button>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Available: {parseFloat(maxAmount).toFixed(4)} {selectedCurrency?.symbol || 'Token'}
            </div>
            <input
              type="number"
              step="0.0001"
              placeholder={`Amount in ${selectedCurrency?.symbol || 'Token'}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border rounded-lg p-3"
              max={maxAmount}
            />
            <button
              onClick={() => setValue(maxAmount)}
              className="text-xs underline text-blue-600 mt-1"
            >
              Use Max ({parseFloat(maxAmount).toFixed(4)} {selectedCurrency?.symbol || 'Token'})
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={isDeposit ? handleDeposit : handleWithdraw}
              disabled={loading || !value || parseFloat(value) <= 0 || parseFloat(value) > parseFloat(maxAmount)}
              className={`flex-1 py-3 rounded-lg shadow-md text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                isDeposit
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                `Confirm ${isDeposit ? 'Deposit' : 'Withdrawal'}`
              )}
            </button>
            <button
              onClick={() => setShowWalletModal(null)}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGameStats = () => {
    const stats = gameState.getRecentStats();
    const playerStats = gameState.playerStats;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={16} className="text-blue-500" />
            <span className="text-sm text-gray-600">Total Spins</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{playerStats.totalSpins}</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp size={16} className="text-green-500" />
            <span className="text-sm text-gray-600">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats.winRate}%</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-600">Biggest Win</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{playerStats.biggestWin.toFixed(2)}</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Flame size={16} className="text-red-500" />
            <span className="text-sm text-gray-600">Current Streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{playerStats.currentStreak}</div>
        </div>
      </div>
    );
  };

 

  const renderRecentWins = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2 mb-4">
        <History size={28} className="text-blue-600" />
        <span>Recent Wins</span>
      </h3>

      {gameState.recentSpins.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>No spins yet. Place your first bet to get started!</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {gameState.recentSpins.map((spin, index) => (
            <div
              key={index}
              className="w-14 h-14 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-base"
              style={{ backgroundColor: spin.color }}
            >
              {spin.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSpinResult = () => {
    if (!showResult || !lastSpinResult) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            {lastSpinResult.isWin ? (
              <div className="text-6xl mb-4">🎉</div>
            ) : (
              <div className="text-6xl mb-4">😔</div>
            )}
            
            <h2 className={`text-2xl font-bold mb-2 ${lastSpinResult.isWin ? 'text-green-600' : 'text-red-600'}`}>
              {lastSpinResult.isWin ? 'Congratulations!' : 'Better Luck Next Time!'}
            </h2>
            
            <div className="text-lg text-gray-600 mb-4">
              You landed on <span className="font-bold" style={{ color: lastSpinResult.outcome.color }}>
                {lastSpinResult.outcome.label}
              </span>
            </div>

            {/* FIXED: Show blockchain/demo mode indicator */}
            {lastSpinResult.isBlockchain !== undefined && (
              <div className={`text-sm px-3 py-1 rounded-full mb-4 ${
                lastSpinResult.isBlockchain 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {lastSpinResult.isBlockchain ? '🔗 Blockchain Mode' : '🎮 Demo Mode'}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Bet Amount:</span>
              <span className="font-semibold">{lastSpinResult.betAmount} {selectedCurrency?.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Entry Fee:</span>
              <span className="text-red-500">-{lastSpinResult.entryFee.toFixed(3)} {selectedCurrency?.symbol}</span>
            </div>
            {lastSpinResult.isWin && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Gross Winnings:</span>
                  <span className="text-green-500">+{lastSpinResult.grossWinnings.toFixed(3)} {selectedCurrency?.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Platform Fee:</span>
                  <span className="text-red-500">-{lastSpinResult.winningsFee.toFixed(3)} {selectedCurrency?.symbol}</span>
                </div>
              </>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Net Result:</span>
              <span className={lastSpinResult.netWinnings > 0 ? 'text-green-600' : 'text-red-600'}>
                {lastSpinResult.netWinnings > 0 ? '+' : ''}{lastSpinResult.actualWinAmount} {selectedCurrency?.symbol}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowResult(false)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Continue Playing
          </button>
        </div>
      </div>
    );
  };

  const renderGameHistory = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
        <Calendar size={20} />
        <span>Game History</span>
      </h3>
      
      {gameState.gameHistory.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <History size={48} className="mx-auto mb-4 opacity-50" />
          <p>No game history yet. Start playing to see your results!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {gameState.gameHistory.slice(0, 10).map((spin) => (
            <div key={spin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: spin.outcome.color }}
                >
                  {spin.outcome.label}
                </div>
                <div>
                  <div className="font-semibold text-sm">{spin.tierName} Tier</div>
                  <div className="text-xs text-gray-500">
                    {spin.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`font-bold text-sm ${spin.isWin ? 'text-green-600' : 'text-red-600'}`}>
                  {spin.isWin ? '+' : ''}{spin.netWinnings.toFixed(3)} {selectedCurrency?.symbol}
                </div>
                <div className="text-xs text-gray-500">
                  Bet: {spin.betAmount} {selectedCurrency?.symbol}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span>Spin Wheel</span>
          </h1>
          <p className="text-gray-600">Test your luck with the spinning wheel!</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        
        {address ? (
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );

  /*********************************************************************
   *  MAIN RENDER
   *********************************************************************/
  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Header />
          <div className="flex justify-end mb-4">
            <UIControls
              autoClaimEnabled={autoClaimEnabled}
              setAutoClaimEnabled={setAutoClaimEnabled}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          </div>
          {renderNotifications()}
          {renderGameHistory()}

          <div className="flex justify-center mt-8">
            <button
              onClick={() => setCurrentView('lobby')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
            >
              Back to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 
  bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 
  dark:from-gray-900 dark:via-gray-950 dark:to-black 
  text-black dark:text-white"
>
      <div className="max-w-6xl mx-auto">
        <Header />
        <div className="flex justify-end mb-4">
          <UIControls
            autoClaimEnabled={autoClaimEnabled}
            setAutoClaimEnabled={setAutoClaimEnabled}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </div>

        <button
          onClick={() => setShowCrPanel(true)}
          className="fixed bottom-6 left-6 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform z-50"
        >
          Open Cr Dashboard
        </button>

        {/* Conditional Panel Render */}
       

        {renderNotifications()}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        {!address ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Connect your Web3 wallet to start playing the Spin Wheel game. Make sure you're on the Core Testnet.
            </p>
            <button
              onClick={connectWallet}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>

           {showCrPanel && (
          <CoreCreditsDashboard onClose={() => setShowCrPanel(false)} />
        )}
            {renderWalletInfo()}
            {renderWalletModal()}
            {renderGameStats()}
            {renderTierSelection()}
           

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Spin the Wheel!</h2>
                  <p className="text-gray-600">
                    {tiers[selectedTier] ? `Selected: ${tiers[selectedTier].name} (${tiers[selectedTier].amount} ${selectedCurrency?.symbol})` : 'Select a tier to play'}
                  </p>
                </div>

                {renderSpinWheel()}

                <div className="text-center mt-8">
                  <div className="mt-6 flex justify-center">
                    <button
  onClick={handleSpin}
  disabled={
    !tiers[selectedTier] ||
    loading ||
    isSpinning ||
    cooldown ||
    (parseFloat(balanceState.inGame?.[selectedCurrency?.address] || '0') < tiers[selectedTier]?.amount)
  }
  className={`px-12 py-4 rounded-full font-semibold text-lg shadow-inner transition-all duration-300 flex items-center justify-center space-x-3
    ${isSpinning || cooldown
      ? 'bg-gradient-to-b from-gray-800 to-gray-900 text-gray-400'
      : 'bg-gradient-to-b from-black to-gray-900 text-white hover:scale-105 hover:shadow-2xl'}
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
>
  {loading || isSpinning ? (
    <>
      <Loader2 size={20} className="animate-spin" />
      <span>{isSpinning ? 'Spinning...' : 'Processing...'}</span>
    </>
  ) : cooldown ? (
    <>
      <Timer size={20} />
      <span>Cooldown: {cooldownLeft}s</span>
    </>
  ) : (
    <>
      <Target size={20} />
      <span>SPIN NOW</span>
    </>
  )}
</button>

                  </div>

                  {tiers[selectedTier] && (
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Entry Fee: {(tiers[selectedTier].amount * CONFIG.PLATFORM_FEES.ENTRY_FEE).toFixed(3)} {selectedCurrency?.symbol}</p>
                      <p>Platform Fee on Winnings: {(CONFIG.PLATFORM_FEES.WINNINGS_FEE * 100).toFixed(2)}%</p>
                    </div>
                  )}
                </div>
              </div>
                  
              <div>
                
          <InGameWalletPanel
  balanceState={balanceState} // ✅ unified balance state
  onDeposit={() => setShowWalletModal('deposit')}
  onWithdraw={() => setShowWalletModal('withdraw')}
  handleBufferedWithdraw={handleBufferedWithdraw}
  selectedCurrency={selectedCurrency}
  setSelectedCurrency={setSelectedCurrency}
  CONFIG={CONFIG}
  loading={loading}
  showWalletModal={showWalletModal} // ✅ pass if panel needs to control modals
  setShowWalletModal={setShowWalletModal}
  depositAmount={depositAmount} // ✅ pass for modal inputs
  setDepositAmount={setDepositAmount}
  withdrawAmount={withdrawAmount}
  setWithdrawAmount={setWithdrawAmount}
  getCurrentWalletBalance={getCurrentWalletBalance}
  getCurrentInGameBalance={getCurrentInGameBalance}
  handleDeposit={handleDeposit}
  handleWithdraw={handleWithdraw}
  loadAllCurrencyBalances={loadAllCurrencyBalances}
/>

                {renderRecentWins()}

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <Eye size={20} />
                    <span>Winning Chances</span>
                  </h3>

                  <div className="space-y-3">
                    {WHEEL_SEGMENTS.map((segment) => (
                      <div key={segment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: segment.color }}
                          ></div>
                          <span className="font-semibold">{segment.label}</span>
                        </div>
                        <span className="text-sm text-gray-600">{segment.probability}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentView('history')}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center space-x-2"
              >
                <History size={20} />
                <span>View History</span>
              </button>
            </div>
          </>
        )}
        <CrFloatingWidget />
        {renderSpinResult()}
      </div>
    </div>
  );
};

export default SpinWheelGame;


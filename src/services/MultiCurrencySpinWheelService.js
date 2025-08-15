// services/MultiCurrencySpinWheelService.js - IMPROVED VERSION
import { ethers } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function transfer(address,uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

const normalizeAddr = (addr) =>
  typeof addr === 'string' ? addr.toLowerCase() : null;

const normalizeBalances = (balances = {}) => {
  const out = {};
  Object.entries(balances).forEach(([k, v]) => {
    if (!k) return;
    const n = normalizeAddr(k);
    if (!n) return;
    out[n] = String(v);
  });
  return out;
};

export class MultiCurrencySpinWheelService {
  constructor(signer, contractAddress, contractAbi) {
    this.contract = new ethers.Contract(contractAddress, contractAbi, signer);
    this.signer = signer;
    this.supportedTokens = new Map();
    this.userAddress = null;
    this.balanceCache = new Map();
    this.CACHE_DURATION = 10000; // Reduced to 10s for better sync
    this.pendingOperations = new Set();
    this.lastBalanceUpdate = new Map();
    
    // Track contract state
    this.contractState = {
      paused: false,
      emergencyMode: false,
      lastChecked: 0
    };
  }

  async initialize() {
    if (this.userAddress) return this.userAddress;
    this.userAddress = await this.signer.getAddress();
    await this.checkContractStatus();
    return this.userAddress;
  }

  _cacheKey(keyBase, tokenAddress) {
    const addr = normalizeAddr(tokenAddress) || 'native';
    return `${keyBase}_${addr}`;
  }

  clearBalanceCache(tokenAddress = null) {
    if (tokenAddress) {
      const k1 = this._cacheKey('wallet', tokenAddress);
      const k2 = this._cacheKey('ingame', tokenAddress);
      this.balanceCache.delete(k1);
      this.balanceCache.delete(k2);
      this.lastBalanceUpdate.delete(normalizeAddr(tokenAddress));
    } else {
      this.balanceCache.clear();
      this.lastBalanceUpdate.clear();
    }
  }

  getCachedBalance(key) {
    const cached = this.balanceCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.value;
    }
    return null;
  }

  setCachedBalance(key, value) {
    this.balanceCache.set(key, { 
      value: String(value), 
      timestamp: Date.now() 
    });
  }

  async addSupportedToken(tokenConfig) {
    const isNative = 
      tokenConfig.address === ethers.ZeroAddress ||
      tokenConfig.address === '0x0000000000000000000000000000000000000000' ||
      !tokenConfig.address;

    let tokenContract = null;
    let finalConfig = { ...tokenConfig };

    if (!isNative && tokenConfig.address) {
      try {
        tokenContract = new ethers.Contract(
          tokenConfig.address,
          ERC20_ABI,
          this.signer
        );
        
        // Fetch token details with timeout
        const [decimals, symbol, name] = await Promise.allSettled([
          Promise.race([
            tokenContract.decimals(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]),
          Promise.race([
            tokenContract.symbol(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]),
          Promise.race([
            tokenContract.name(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ])
        ]);

        finalConfig.decimals = decimals.status === 'fulfilled' 
          ? decimals.value 
          : (tokenConfig.decimals ?? 18);
        finalConfig.symbol = symbol.status === 'fulfilled' 
          ? symbol.value 
          : (tokenConfig.symbol ?? 'UNKNOWN');
        finalConfig.name = name.status === 'fulfilled' 
          ? name.value 
          : (tokenConfig.name ?? finalConfig.symbol);
      } catch (err) {
        console.warn(`Token details fetch failed for ${tokenConfig.address}:`, err.message);
        finalConfig.decimals = tokenConfig.decimals ?? 18;
        finalConfig.symbol = tokenConfig.symbol ?? 'UNKNOWN';
        finalConfig.name = tokenConfig.name ?? finalConfig.symbol;
      }
    } else {
      // Native token configuration
      finalConfig.decimals = 18;
      finalConfig.symbol = tokenConfig.symbol ?? 'CORE';
      finalConfig.name = tokenConfig.name ?? 'Core';
      finalConfig.address = ethers.ZeroAddress;
    }

    this.supportedTokens.set(finalConfig.address, {
      ...finalConfig,
      contract: tokenContract,
      isNative,
      lastUpdated: Date.now()
    });
  }

  async getWalletBalance(tokenAddress, forceRefresh = false) {
    const info = this.supportedTokens.get(tokenAddress);
    if (!info) throw new Error(`Unsupported token: ${tokenAddress}`);

    const key = this._cacheKey('wallet', tokenAddress);
    
    if (!forceRefresh) {
      const cached = this.getCachedBalance(key);
      if (cached !== null) return cached;
    }

    try {
      let balance;
      if (info.isNative) {
        balance = await this.signer.provider.getBalance(this.userAddress);
        const formatted = ethers.formatEther(balance);
        this.setCachedBalance(key, formatted);
        return formatted;
      } else {
        balance = await info.contract.balanceOf(this.userAddress);
        const formatted = ethers.formatUnits(balance, info.decimals);
        this.setCachedBalance(key, formatted);
        return formatted;
      }
    } catch (error) {
      console.error(`Wallet balance error for ${tokenAddress}:`, error.message);
      // Return cached value if available, otherwise '0'
      const cached = this.balanceCache.get(key);
      return cached ? cached.value : '0';
    }
  }

  async getInGameBalance(tokenAddress, forceRefresh = false) {
    const info = this.supportedTokens.get(tokenAddress);
    if (!info) throw new Error(`Unsupported token: ${tokenAddress}`);

    const key = this._cacheKey('ingame', tokenAddress);
    
    if (!forceRefresh) {
      const cached = this.getCachedBalance(key);
      if (cached !== null) return cached;
    }

    // Try multiple contract methods for compatibility
    const methods = [
      // Primary method - matches contract exactly
      () => this.contract.getUserTokenBalance(this.userAddress, tokenAddress),
      // Fallback methods for backwards compatibility
      () => tokenAddress === ethers.ZeroAddress 
        ? this.contract.getUserBalance(this.userAddress)
        : this.contract.getUserTokenBalance(this.userAddress, tokenAddress),
      () => this.contract.getBalance(this.userAddress),
      () => this.contract.balanceOf(this.userAddress)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const balance = await methods[i]();
        const formatted = ethers.formatUnits(balance, info.decimals);
        this.setCachedBalance(key, formatted);
        this.lastBalanceUpdate.set(normalizeAddr(tokenAddress), Date.now());
        return formatted;
      } catch (error) {
        console.warn(`In-game balance method ${i + 1} failed:`, error.message);
        if (i === methods.length - 1) {
          // All methods failed, return cached or '0'
          const cached = this.balanceCache.get(key);
          return cached ? cached.value : '0';
        }
      }
    }
  }

  async checkContractStatus() {
    try {
      // Check if contract is paused
      try {
        const paused = await this.contract.paused();
        this.contractState.paused = paused;
      } catch {
        this.contractState.paused = false;
      }

      // Check if in emergency mode
      try {
        const emergencyMode = await this.contract.emergencyMode();
        this.contractState.emergencyMode = emergencyMode;
      } catch {
        this.contractState.emergencyMode = false;
      }

      // Verify contract deployment
      const code = await this.signer.provider.getCode(this.contract.target);
      if (code === '0x') {
        throw new Error('Contract not deployed at specified address');
      }

      this.contractState.lastChecked = Date.now();

      // Throw errors for blocking states
      if (this.contractState.paused) {
        throw new Error('Contract is paused');
      }
      if (this.contractState.emergencyMode) {
        throw new Error('Contract is in emergency mode');
      }

    } catch (error) {
      console.error('Contract status check failed:', error.message);
      throw error;
    }
  }

  async depositToken(tokenAddress, amount) {
    if (this.pendingOperations.has('deposit_' + normalizeAddr(tokenAddress))) {
      throw new Error('Deposit already in progress for this token');
    }

    const info = this.supportedTokens.get(tokenAddress);
    if (!info) throw new Error(`Unsupported token: ${tokenAddress}`);

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Invalid deposit amount');
    }

    await this.checkContractStatus();

    // Verify wallet balance
    const walletBalance = parseFloat(await this.getWalletBalance(tokenAddress, true));
    if (walletBalance < amt) {
      throw new Error(`Insufficient wallet balance: ${walletBalance} < ${amt}`);
    }

    const operationKey = 'deposit_' + normalizeAddr(tokenAddress);
    this.pendingOperations.add(operationKey);

    try {
      const wei = ethers.parseUnits(String(amt), info.decimals);

      if (info.isNative) {
        // Native token deposit
        const gasEstimate = await this.contract.depositNative.estimateGas({
          value: wei
        });
        
        const tx = await this.contract.depositNative({
          value: wei,
          gasLimit: gasEstimate * 120n / 100n // 20% buffer
        });
        
        const receipt = await tx.wait();
        this.clearBalanceCache(tokenAddress);
        return tx;
      } else {
        // ERC20 token deposit
        // Check allowance first
        const allowance = await info.contract.allowance(
          this.userAddress,
          this.contract.target
        );

        if (allowance < wei) {
          // Need approval
          if (allowance > 0n) {
            // Reset allowance to 0 first (some tokens require this)
            const resetTx = await info.contract.approve(
              this.contract.target,
              0n
            );
            await resetTx.wait();
          }

          // Approve maximum amount for future transactions
          const approveTx = await info.contract.approve(
            this.contract.target,
            ethers.MaxUint256
          );
          await approveTx.wait();
        }

        // Perform deposit
        const gasEstimate = await this.contract.depositToken.estimateGas(
          tokenAddress,
          wei
        );

        const tx = await this.contract.depositToken(tokenAddress, wei, {
          gasLimit: gasEstimate * 120n / 100n
        });

        const receipt = await tx.wait();
        this.clearBalanceCache(tokenAddress);
        return tx;
      }
    } catch (error) {
      console.error('Deposit failed:', error.message);
      this.clearBalanceCache(tokenAddress);
      throw error;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  async withdrawToken(tokenAddress, amount) {
    if (this.pendingOperations.has('withdraw_' + normalizeAddr(tokenAddress))) {
      throw new Error('Withdrawal already in progress for this token');
    }

    const info = this.supportedTokens.get(tokenAddress);
    if (!info) throw new Error(`Unsupported token: ${tokenAddress}`);

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Invalid withdrawal amount');
    }

    await this.checkContractStatus();

    // Verify in-game balance
    const inGameBalance = parseFloat(await this.getInGameBalance(tokenAddress, true));
    if (inGameBalance < amt) {
      throw new Error(`Insufficient in-game balance: ${inGameBalance} < ${amt}`);
    }

    const operationKey = 'withdraw_' + normalizeAddr(tokenAddress);
    this.pendingOperations.add(operationKey);

    try {
      const wei = ethers.parseUnits(String(amt), info.decimals);

      // Check contract liquidity
      let contractBalance;
      if (info.isNative) {
        contractBalance = await this.signer.provider.getBalance(this.contract.target);
      } else {
        contractBalance = await info.contract.balanceOf(this.contract.target);
      }

      if (contractBalance < wei) {
        throw new Error('Contract has insufficient liquidity');
      }

      // Estimate gas
      const gasEstimate = await this.contract.withdrawToken.estimateGas(
        tokenAddress,
        wei
      );

      // Execute withdrawal
      const tx = await this.contract.withdrawToken(tokenAddress, wei, {
        gasLimit: gasEstimate * 120n / 100n
      });

      const receipt = await tx.wait();
      this.clearBalanceCache(tokenAddress);
      return tx;
    } catch (error) {
      console.error('Withdrawal failed:', error.message);
      this.clearBalanceCache(tokenAddress);
      throw error;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  async spinWithToken(tierId, tokenAddress, betAmount) {
    if (this.pendingOperations.has('spin_' + normalizeAddr(tokenAddress))) {
      throw new Error('Spin already in progress for this token');
    }

    const info = this.supportedTokens.get(tokenAddress);
    if (!info) throw new Error(`Unsupported token: ${tokenAddress}`);

    await this.checkContractStatus();

    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Invalid bet amount');
    }

    // Verify in-game balance
    const balance = parseFloat(await this.getInGameBalance(tokenAddress, true));
    if (balance < amt) {
      throw new Error(`Insufficient in-game balance: ${balance} < ${amt}`);
    }

    const operationKey = 'spin_' + normalizeAddr(tokenAddress);
    this.pendingOperations.add(operationKey);

    try {
      const wei = ethers.parseUnits(String(amt), info.decimals);

      // Estimate gas with retries
      let gasEstimate;
      let attempts = 0;
      while (attempts < 3) {
        try {
          gasEstimate = await this.contract.spinWithToken.estimateGas(
            tierId,
            tokenAddress,
            wei
          );
          break;
        } catch (error) {
          attempts++;
          if (attempts === 3) throw error;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Execute spin
      const tx = await this.contract.spinWithToken(tierId, tokenAddress, wei, {
        gasLimit: gasEstimate * 150n / 100n // Extra buffer for randomization
      });

      const receipt = await tx.wait();
      
      // Clear cache to get fresh balance
      this.clearBalanceCache(tokenAddress);
      
      // Parse result from transaction receipt
      const result = this.parseSpinResult(receipt);
      
      return result;
    } catch (error) {
      console.error('Spin failed:', error.message);
      this.clearBalanceCache(tokenAddress);
      throw error;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  parseSpinResult(receipt) {
    // Look for SpinCompleted event
    const eventNames = [
      'SpinCompleted',
      'SpinResult', 
      'GameResult',
      'WheelSpinResult'
    ];

    let spinLog = null;
    for (const eventName of eventNames) {
      spinLog = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === eventName;
        } catch {
          return false;
        }
      });
      if (spinLog) break;
    }

    if (!spinLog) {
      console.warn('Spin event not found in receipt');
      return {
        success: false,
        error: 'Spin event not found',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      };
    }

    try {
      const parsed = this.contract.interface.parseLog(spinLog);
      
      // Extract values based on SpinCompleted event structure
      const multiplier = Number(parsed.args.multiplier || 0);
      const segmentId = Number(parsed.args.segmentId || 1);
      const winAmount = parsed.args.winAmount 
        ? ethers.formatEther(parsed.args.winAmount) 
        : '0';
      const netWinnings = parsed.args.netWinnings
        ? ethers.formatEther(parsed.args.netWinnings)
        : '0';

      return {
        success: true,
        multiplier,
        segmentId,
        winAmount,
        netWinnings,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        requestId: parsed.args.requestId || null
      };
    } catch (error) {
      console.error('Failed to parse spin result:', error.message);
      return {
        success: false,
        error: 'Failed to parse result',
        txHash: receipt.hash
      };
    }
  }

  async getAllBalances() {
    const results = { wallet: {}, inGame: {} };
    const errors = [];
    const verificationResults = {};

    // Process all supported tokens concurrently
    const balancePromises = Array.from(this.supportedTokens.entries()).map(
      async ([tokenAddress, info]) => {
        const normalizedAddr = normalizeAddr(tokenAddress);
        
        try {
          // Get balances with timeout protection
          const [walletResult, inGameResult] = await Promise.allSettled([
            Promise.race([
              this.getWalletBalance(tokenAddress, true),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Wallet balance timeout')), 10000)
              )
            ]),
            Promise.race([
              this.getInGameBalance(tokenAddress, true),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('In-game balance timeout')), 10000)
              )
            ])
          ]);

          const walletBalance = walletResult.status === 'fulfilled' 
            ? walletResult.value 
            : '0';
          const inGameBalance = inGameResult.status === 'fulfilled' 
            ? inGameResult.value 
            : '0';

          // Verification check with direct contract call
          try {
            const directBalance = await this.contract.getUserTokenBalance(
              this.userAddress,
              tokenAddress
            );
            const directFormatted = ethers.formatUnits(directBalance, info.decimals);
            
            const diff = Math.abs(parseFloat(inGameBalance) - parseFloat(directFormatted));
            const isVerified = diff < 0.000001; // Very small tolerance
            
            verificationResults[normalizedAddr] = {
              verified: isVerified,
              cached: inGameBalance,
              authoritative: directFormatted,
              difference: diff.toFixed(8)
            };

            // Use authoritative value if significant difference
            results.inGame[normalizedAddr] = isVerified ? inGameBalance : directFormatted;
          } catch (verifyError) {
            results.inGame[normalizedAddr] = inGameBalance;
            verificationResults[normalizedAddr] = {
              verified: false,
              error: verifyError.message
            };
          }

          results.wallet[normalizedAddr] = walletBalance;

          // Log any errors
          if (walletResult.status === 'rejected') {
            errors.push(`Wallet ${info.symbol}: ${walletResult.reason.message}`);
          }
          if (inGameResult.status === 'rejected') {
            errors.push(`In-game ${info.symbol}: ${inGameResult.reason.message}`);
          }

        } catch (error) {
          // Fallback values
          results.wallet[normalizedAddr] = '0';
          results.inGame[normalizedAddr] = '0';
          errors.push(`${info.symbol}: ${error.message}`);
          
          verificationResults[normalizedAddr] = {
            verified: false,
            error: error.message
          };
        }
      }
    );

    // Wait for all balance checks to complete
    await Promise.allSettled(balancePromises);

    return {
      wallet: normalizeBalances(results.wallet),
      inGame: normalizeBalances(results.inGame),
      verificationResults,
      errors,
      timestamp: Date.now()
    };
  }

  async verifyBalance(tokenAddress, expectedAmount, type = 'inGame') {
    try {
      const actual = parseFloat(
        type === 'inGame' 
          ? await this.getInGameBalance(tokenAddress, true)
          : await this.getWalletBalance(tokenAddress, true)
      );
      const expected = parseFloat(expectedAmount);
      const difference = Math.abs(actual - expected);
      const tolerance = 0.000001;

      return {
        verified: difference < tolerance,
        expected: expected.toFixed(8),
        actual: actual.toFixed(8),
        difference: difference.toFixed(8),
        tolerance: tolerance.toFixed(8),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        verified: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  // Utility methods
  isPending(operation, tokenAddress = null) {
    if (tokenAddress) {
      return this.pendingOperations.has(operation + '_' + normalizeAddr(tokenAddress));
    }
    return Array.from(this.pendingOperations).some(op => op.startsWith(operation + '_'));
  }

  getContractState() {
    return { ...this.contractState };
  }

  getSupportedTokens() {
    return Array.from(this.supportedTokens.entries()).map(([address, info]) => ({
      address,
      symbol: info.symbol,
      decimals: info.decimals,
      name: info.name,
      isNative: info.isNative,
      isActive: info.isActive !== false
    }));
  }

  // Emergency functions
  async emergencyStopOperations() {
    this.pendingOperations.clear();
    this.clearBalanceCache();
  }

  destroy() {
    this.pendingOperations.clear();
    this.clearBalanceCache();
    this.supportedTokens.clear();
  }
}